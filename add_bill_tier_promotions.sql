-- Promo de descuento sobre el total de la cuenta por rangos de monto
-- (ya aplicado vía migraciones bill_tier_promotions, bill_tier_promotions_resync_open_orders,
--  bill_tier_promotions_locked_flag y bill_tier_promotions_lock_on_payment)
--
-- promotions.type = 'bill_tiers', promotions.bill_tiers = [{ "min_amount": 0, "percent": 10 }, { "min_amount": 50000, "percent": 20 }]
-- Se aplica el % del rango alcanzado (mayor min_amount <= subtotal) a toda la cuenta.
--
-- orders:
--   subtotal_amount   → suma de ítems enviados (con promos de producto ya aplicadas)
--   discount_percent  → % del rango alcanzado
--   discount_amount   → subtotal × % (redondeado a 2 decimales)
--   total_amount      → subtotal − descuento (lo que usan admin, división y Mercado Pago)
--   bill_promotion_id → promo asignada a la mesa (se mantiene aunque salga de horario; si la desactivan deja de aplicar)
--   discount_locked   → ya hubo un pago: el % queda fijo y lo que se pida después se cobra con el mismo descuento

alter table public.promotions add column if not exists bill_tiers jsonb;

alter table public.promotions drop constraint if exists promotions_type_check;
alter table public.promotions add constraint promotions_type_check
  check (type in ('nxm', 'percent', 'fixed_price', 'amount_off', 'second_unit', 'bill_tiers'));

alter table public.promotions drop constraint if exists promotions_params_check;
alter table public.promotions add constraint promotions_params_check check (
  (type = 'nxm' and buy_qty >= 2 and pay_qty >= 1 and pay_qty < buy_qty)
  or (type in ('percent', 'second_unit') and percent > 0 and percent <= 100)
  or (type = 'fixed_price' and fixed_price >= 0)
  or (type = 'amount_off' and amount > 0)
  or (type = 'bill_tiers' and jsonb_typeof(bill_tiers) = 'array' and jsonb_array_length(bill_tiers) >= 1)
);

alter table public.orders
  add column if not exists subtotal_amount numeric,
  add column if not exists discount_percent numeric(5,2) not null default 0,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists discount_locked boolean not null default false,
  add column if not exists bill_promotion_id uuid references public.promotions(id) on delete set null;

update public.orders set subtotal_amount = total_amount where subtotal_amount is null;

create or replace function public.bill_tier_percent(p_tiers jsonb, p_subtotal numeric)
returns numeric
language sql
immutable
set search_path = public
as $$
  select coalesce((
    select (t->>'percent')::numeric
    from jsonb_array_elements(coalesce(p_tiers, '[]'::jsonb)) t
    where coalesce((t->>'min_amount')::numeric, 0) <= p_subtotal
    order by coalesce((t->>'min_amount')::numeric, 0) desc
    limit 1
  ), 0);
$$;

create or replace function public.sync_order_total_amount(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order orders%rowtype;
  v_subtotal numeric;
  v_promo promotions%rowtype;
  v_percent numeric := 0;
  v_discount numeric := 0;
  v_locked boolean;
begin
  select * into v_order from orders where id = p_order_id;
  if not found then
    return;
  end if;

  select coalesce(sum(oi.unit_price * coalesce(oi.quantity, 1)), 0)
  into v_subtotal
  from order_items oi
  inner join order_batches ob on ob.id = oi.batch_id and ob.order_id = p_order_id
  where ob.status != 'CREADO';

  -- Con el primer pago el % queda fijo: los envíos posteriores se cobran con el mismo descuento
  v_locked := exists (select 1 from order_guest_charges where order_id = p_order_id and status = 'paid')
    or exists (select 1 from order_guests where order_id = p_order_id and paid = true);

  if v_locked then
    v_percent := coalesce(v_order.discount_percent, 0);
  else
    -- La promo ya asignada a la mesa se mantiene aunque salga de su horario, salvo que la desactiven
    if v_order.bill_promotion_id is not null then
      select * into v_promo from promotions
      where id = v_order.bill_promotion_id and type = 'bill_tiers' and active;
    end if;
    if v_promo.id is null then
      select p.* into v_promo
      from promotions p
      where p.restaurant_id = v_order.restaurant_id
        and p.type = 'bill_tiers'
        and promotion_is_live(p)
      order by p.created_at desc
      limit 1;
    end if;
    if v_promo.id is not null then
      v_percent := bill_tier_percent(v_promo.bill_tiers, v_subtotal);
    end if;
  end if;

  v_discount := round(v_subtotal * v_percent / 100, 2);

  update orders
  set subtotal_amount = v_subtotal,
      discount_percent = v_percent,
      discount_amount = v_discount,
      discount_locked = v_locked,
      bill_promotion_id = case when v_locked then bill_promotion_id else v_promo.id end,
      total_amount = v_subtotal - v_discount
  where id = p_order_id;
end;
$function$;

update public.orders set discount_locked = true
where exists (select 1 from public.order_guest_charges c where c.order_id = orders.id and c.status = 'paid')
   or exists (select 1 from public.order_guests g where g.order_id = orders.id and g.paid = true);

-- Al registrarse el primer pago, marca el % como fijo (para que los comensales dejen de ver el aviso de próximo rango)
create or replace function public.lock_order_bill_discount()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  update orders set discount_locked = true
  where id = new.order_id and not discount_locked;
  return new;
end;
$function$;

drop trigger if exists trg_charges_lock_bill_discount on public.order_guest_charges;
create trigger trg_charges_lock_bill_discount
  after insert or update of status on public.order_guest_charges
  for each row when (new.status = 'paid')
  execute function public.lock_order_bill_discount();

drop trigger if exists trg_guests_lock_bill_discount on public.order_guests;
create trigger trg_guests_lock_bill_discount
  after insert or update of paid on public.order_guests
  for each row when (new.paid = true)
  execute function public.lock_order_bill_discount();

-- Al crear/editar/borrar una promo de cuenta, recalcula las mesas abiertas del local
create or replace function public.trg_promotions_resync_open_orders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid;
  o record;
begin
  if tg_op = 'DELETE' then
    if old.type <> 'bill_tiers' then return null; end if;
    v_restaurant := old.restaurant_id;
  else
    if new.type <> 'bill_tiers' and (tg_op = 'INSERT' or old.type <> 'bill_tiers') then return null; end if;
    v_restaurant := new.restaurant_id;
  end if;

  for o in
    select id from orders
    where restaurant_id = v_restaurant
      and coalesce(status, '') not in ('CERRADO', 'Pagado')
  loop
    perform sync_order_total_amount(o.id);
  end loop;
  return null;
end;
$$;

drop trigger if exists trg_promotions_resync_open_orders on public.promotions;
create trigger trg_promotions_resync_open_orders
  after insert or update or delete on public.promotions
  for each row execute function public.trg_promotions_resync_open_orders();
