-- Banners promocionales dentro de categorías del menú, con CTA "Agregar al pedido"
-- (ya aplicado vía migración category_banners)
--   placement = 'home'     → carrusel de inicio (target_category_id = link al tocar)
--   placement = 'category' → se muestra dentro de display_category_id (categoría o subcategoría)
alter table public.banners
  add column if not exists placement text not null default 'home',
  add column if not exists display_category_id uuid references public.categories(id) on delete cascade,
  add column if not exists cta_menu_item_id uuid references public.menu_items(id) on delete set null,
  add column if not exists cta_label text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'banners_placement_check') then
    alter table public.banners
      add constraint banners_placement_check check (placement in ('home', 'category'));
  end if;
end $$;

-- Los banners de categoría pueden ser solo texto
alter table public.banners alter column image_url drop not null;

create index if not exists banners_display_category_id_idx on public.banners(display_category_id);
