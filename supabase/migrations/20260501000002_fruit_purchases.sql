-- ─────────────────────────────────────────────────────────────────────
-- fruit_purchases
-- Records every batch of fruit/ingredient the shop buys.
-- Drives two updates on insert:
--   1. materials.current_stock += weight_g × (yield_pct / 100)
--   2. materials.cost_per_unit  = total_cost / usable_g
-- These are applied in the API route (service-role, single admin, no
-- concurrency risk at 15–20 cups/day).
-- ─────────────────────────────────────────────────────────────────────

create table fruit_purchases (
  id            uuid primary key default gen_random_uuid(),
  material_id   uuid not null references materials(id) on delete restrict,
  purchase_date date not null default current_date,
  weight_g      numeric not null check (weight_g > 0),
  total_cost    numeric not null check (total_cost >= 0),
  -- % of purchased weight that is actually usable after trimming/prep
  yield_pct     numeric not null default 100
                  check (yield_pct > 0 and yield_pct <= 100),
  note          text,
  photo_url     text,
  created_at    timestamptz not null default now()
);

create index fruit_purchases_material_idx on fruit_purchases(material_id);
create index fruit_purchases_date_idx     on fruit_purchases(purchase_date desc);

-- Storage bucket for fruit purchase photos (camera shots at the market)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fruit-photos', 'fruit-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;
