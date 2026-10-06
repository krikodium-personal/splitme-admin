-- Promociones sobre precio de productos (ya aplicado vía migración promotions)
--
-- Tipos:
--   nxm          → llevá buy_qty, pagá pay_qty (2x1, 3x2). Cuenta unidades de toda la mesa.
--   second_unit  → cada 2 unidades, una sale con percent% off. Cuenta unidades de toda la mesa.
--   percent      → percent% off por unidad.
--   amount_off   → amount menos por unidad.
--   fixed_price  → el precio base del producto pasa a fixed_price (las variantes suman encima).
--
-- Precios en order_items:
--   list_unit_price → precio de lista de la unidad (con variantes), sin promo.
--   unit_price      → precio efectivo con promo. Es el que usan el total de la orden (trigger),
--                     el admin, la división y Mercado Pago.
--   promotion_id    → promo asignada al agregar el ítem (si estaba vigente en ese momento).
--
-- En nxm / second_unit el descuento se reparte parejo entre todas las unidades del grupo
-- (mismo producto, misma promo, mismo precio de lista). Los ítems de envíos anteriores al
-- último pago registrado quedan congelados y no se recalculan.

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('nxm', 'percent', 'fixed_price', 'amount_off', 'second_unit')),
  buy_qty integer,
  pay_qty integer,
  percent numeric(5,2),
  amount numeric(12,2),
  fixed_price numeric(12,2),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week smallint[],
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  constraint promotions_params_check check (
    (type = 'nxm' and buy_qty >= 2 and pay_qty >= 1 and pay_qty < buy_qty)
    or (type in ('percent', 'second_unit') and percent > 0 and percent <= 100)
    or (type = 'fixed_price' and fixed_price >= 0)
    or (type = 'amount_off' and amount > 0)
  )
);

create index if not exists promotions_restaurant_id_idx on public.promotions(restaurant_id);

create table if not exists public.promotion_menu_items (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  primary key (promotion_id, menu_item_id)
);

create index if not exists promotion_menu_items_menu_item_id_idx on public.promotion_menu_items(menu_item_id);

alter table public.order_items
  add column if not exists list_unit_price numeric,
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null;

-- RLS: lectura pública (el menú de comensales la necesita), escritura solo admins del local
alter table public.promotions enable row level security;
alter table public.promotion_menu_items enable row level security;

drop policy if exists promotions_select on public.promotions;
create policy promotions_select on public.promotions for select to anon, authenticated using (true);

drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions for all to authenticated
  using (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and (pr.role = 'super_admin' or pr.restaurant_id = promotions.restaurant_id)
  ))
  with check (exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and (pr.role = 'super_admin' or pr.restaurant_id = promotions.restaurant_id)
  ));

drop policy if exists promotion_menu_items_select on public.promotion_menu_items;
create policy promotion_menu_items_select on public.promotion_menu_items for select to anon, authenticated using (true);

drop policy if exists promotion_menu_items_admin_write on public.promotion_menu_items;
create policy promotion_menu_items_admin_write on public.promotion_menu_items for all to authenticated
  using (exists (
    select 1 from public.promotions p join public.profiles pr on pr.id = auth.uid()
    where p.id = promotion_menu_items.promotion_id and (pr.role = 'super_admin' or pr.restaurant_id = p.restaurant_id)
  ))
  with check (exists (
    select 1 from public.promotions p join public.profiles pr on pr.id = auth.uid()
    where p.id = promotion_menu_items.promotion_id and (pr.role = 'super_admin' or pr.restaurant_id = p.restaurant_id)
  ));

-- Vigencia: activa + rango de fechas + días de la semana (0 = domingo) + franja horaria (hora Argentina)
create or replace function public.promotion_is_live(p public.promotions, at_ts timestamptz default now())
returns boolean
language sql
stable
set search_path = public
as $$
  select p.active
    and (p.starts_at is null or at_ts >= p.starts_at)
    and (p.ends_at is null or at_ts < p.ends_at)
    and (
      p.days_of_week is null or cardinality(p.days_of_week) = 0
      or extract(dow from at_ts at time zone 'America/Argentina/Buenos_Aires')::smallint = any(p.days_of_week)
    )
    and (
      p.start_time is null or p.end_time is null
      or case
        when p.start_time <= p.end_time then
          (at_ts at time zone 'America/Argentina/Buenos_Aires')::time >= p.start_time
          and (at_ts at time zone 'America/Argentina/Buenos_Aires')::time < p.end_time
        else
          (at_ts at time zone 'America/Argentina/Buenos_Aires')::time >= p.start_time
          or (at_ts at time zone 'America/Argentina/Buenos_Aires')::time < p.end_time
      end
    );
$$;

-- Precio por unidad para promos que no dependen de cuántas unidades haya en la mesa
create or replace function public.promo_unit_price(p public.promotions, list_price numeric, base_price numeric)
returns numeric
language sql
immutable
set search_path = public
as $$
  select greatest(0, round(case p.type
    when 'percent' then list_price * (1 - p.percent / 100)
    when 'amount_off' then list_price - p.amount
    when 'fixed_price' then list_price - greatest(0, coalesce(base_price, list_price) - p.fixed_price)
    else list_price
  end, 2));
$$;

-- Recalcula nxm / second_unit de una orden repartiendo el descuento parejo entre las unidades del grupo
create or replace function public.recompute_order_promotions(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_freeze_before timestamptz;
  g record;
  v_discount numeric;
  v_effective numeric;
begin
  if p_order_id is null then
    return;
  end if;

  perform set_config('splitme.promo_recompute', '1', true);

  select max(paid_at) into v_freeze_before
  from order_guest_charges
  where order_id = p_order_id and status = 'paid';

  for g in
    select oi.menu_item_id, oi.promotion_id, oi.list_unit_price,
           sum(oi.quantity)::numeric as units, p.type, p.buy_qty, p.pay_qty, p.percent
    from order_items oi
    join promotions p on p.id = oi.promotion_id
    where oi.order_id = p_order_id
      and p.type in ('nxm', 'second_unit')
      and oi.list_unit_price is not null
      and oi.quantity > 0
      and (
        v_freeze_before is null or oi.batch_id is null
        or exists (
          select 1 from order_batches ob
          where ob.id = oi.batch_id and (upper(ob.status) = 'CREADO' or ob.created_at > v_freeze_before)
        )
      )
    group by oi.menu_item_id, oi.promotion_id, oi.list_unit_price, p.type, p.buy_qty, p.pay_qty, p.percent
  loop
    if g.type = 'nxm' then
      v_discount := floor(g.units / g.buy_qty) * (g.buy_qty - g.pay_qty) * g.list_unit_price;
    else
      v_discount := floor(g.units / 2) * g.list_unit_price * g.percent / 100;
    end if;
    v_effective := round((g.units * g.list_unit_price - v_discount) / g.units, 2);

    update order_items oi
    set unit_price = v_effective
    where oi.order_id = p_order_id
      and oi.menu_item_id = g.menu_item_id
      and oi.promotion_id = g.promotion_id
      and oi.list_unit_price = g.list_unit_price
      and oi.unit_price is distinct from v_effective
      and (
        v_freeze_before is null or oi.batch_id is null
        or exists (
          select 1 from order_batches ob
          where ob.id = oi.batch_id and (upper(ob.status) = 'CREADO' or ob.created_at > v_freeze_before)
        )
      );
  end loop;

  perform set_config('splitme.promo_recompute', '', true);
end;
$$;

-- Al insertar: fija precio de lista, asigna promo vigente y aplica precio por unidad
create or replace function public.trg_order_items_promo_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_promo promotions%rowtype;
begin
  if new.menu_item_id is null then
    return new;
  end if;

  select price into v_base from menu_items where id = new.menu_item_id;
  new.list_unit_price := coalesce(new.unit_price, v_base);

  select p.* into v_promo
  from promotions p
  join promotion_menu_items pmi on pmi.promotion_id = p.id
  where pmi.menu_item_id = new.menu_item_id and promotion_is_live(p)
  order by p.created_at desc
  limit 1;

  if found then
    new.promotion_id := v_promo.id;
    new.unit_price := promo_unit_price(v_promo, new.list_unit_price, v_base);
  else
    new.promotion_id := null;
    new.unit_price := new.list_unit_price;
  end if;

  return new;
end;
$$;

-- Si la app cambia el precio (p. ej. editó variantes), ese valor es el nuevo precio de lista
create or replace function public.trg_order_items_promo_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base numeric;
  v_promo promotions%rowtype;
begin
  if coalesce(current_setting('splitme.promo_recompute', true), '') = '1' then
    return new;
  end if;
  if new.unit_price is not distinct from old.unit_price then
    return new;
  end if;

  new.list_unit_price := new.unit_price;
  if new.promotion_id is not null then
    select * into v_promo from promotions where id = new.promotion_id;
    if found then
      select price into v_base from menu_items where id = new.menu_item_id;
      new.unit_price := promo_unit_price(v_promo, new.list_unit_price, v_base);
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.trg_order_items_promo_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row order_items%rowtype;
begin
  if coalesce(current_setting('splitme.promo_recompute', true), '') = '1' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := old;
  else
    v_row := new;
  end if;

  if v_row.promotion_id is not null and exists (
    select 1 from promotions where id = v_row.promotion_id and type in ('nxm', 'second_unit')
  ) then
    perform recompute_order_promotions(v_row.order_id);
  end if;

  return null;
end;
$$;

drop trigger if exists trg_order_items_promo_before_insert on public.order_items;
create trigger trg_order_items_promo_before_insert
  before insert on public.order_items
  for each row execute function public.trg_order_items_promo_before_insert();

drop trigger if exists trg_order_items_promo_before_update on public.order_items;
create trigger trg_order_items_promo_before_update
  before update of unit_price on public.order_items
  for each row execute function public.trg_order_items_promo_before_update();

drop trigger if exists trg_order_items_promo_after_change on public.order_items;
create trigger trg_order_items_promo_after_change
  after insert or delete or update of quantity, unit_price on public.order_items
  for each row execute function public.trg_order_items_promo_after_change();
