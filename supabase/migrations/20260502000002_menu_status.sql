-- ─────────────────────────────────────────────────────────────────────
-- Replace boolean is_active with a 4-state status enum on menus.
-- ─────────────────────────────────────────────────────────────────────

alter table menus
  add column status text not null default 'active'
  check (status in ('active', 'inactive', 'no_ingredients', 'hidden'));

-- Migrate existing data
update menus set status = case when is_active then 'active' else 'inactive' end;

-- Drop RLS policy that references is_active before dropping the column
drop policy if exists menus_public_read on menus;
alter table menus drop column is_active;

-- Recreate policy using the new status column
create policy menus_public_read on menus for select using (status != 'hidden');

-- ─────────────────────────────────────────────────────────────────────
-- menu_interests — "อยากกินจัง" taps for out-of-season menus.
-- Admin uses daily count to decide whether to restock the next day.
-- ─────────────────────────────────────────────────────────────────────

create table menu_interests (
  id         uuid primary key default gen_random_uuid(),
  menu_id    uuid not null references menus(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index menu_interests_menu_idx on menu_interests(menu_id);
create index menu_interests_date_idx  on menu_interests(created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- get_menus_with_availability  (replaces old version)
--
-- Returns every non-hidden menu by default (p_include_hidden = false).
-- Admin passes true to include hidden menus in the management view.
--
-- cups_remaining:
--   min(floor(current_stock / quantity_required)) across all BOM rows.
--   999 when menu has no BOM rows (no stock constraint → unlimited).
--
-- available:
--   true only when status = 'active' AND every BOM material has
--   enough stock for at least one cup.
-- ─────────────────────────────────────────────────────────────────────

create or replace function get_menus_with_availability(
  p_include_hidden boolean default false
)
returns table (
  id             uuid,
  name           text,
  base_price     numeric,
  image_url      text,
  status         text,
  cups_remaining int,
  available      boolean,
  interest_today bigint
)
language sql stable
as $$
  select
    m.id,
    m.name,
    m.base_price,
    m.image_url,
    m.status,
    coalesce(
      (
        select min(floor(mat.current_stock / nullif(b.quantity_required, 0))::int)
        from bom b
        join materials mat on mat.id = b.material_id
        where b.menu_id = m.id
      ),
      999   -- no BOM = no stock constraint
    ) as cups_remaining,
    m.status = 'active' and not exists (
      select 1
      from bom b
      join materials mat on mat.id = b.material_id
      where b.menu_id = m.id
        and mat.current_stock < b.quantity_required
    ) as available,
    (
      select count(*)
      from menu_interests mi
      where mi.menu_id = m.id
        and mi.created_at::date = current_date
    ) as interest_today
  from menus m
  where p_include_hidden or m.status != 'hidden'
  order by m.name;
$$;
