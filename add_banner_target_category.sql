-- Link de banner a categoría o subcategoría del menú (ya aplicado vía migración banners_target_category)
alter table public.banners
  add column if not exists target_category_id uuid references public.categories(id) on delete set null;

create index if not exists banners_target_category_id_idx on public.banners(target_category_id);
