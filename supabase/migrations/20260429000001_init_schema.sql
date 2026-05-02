-- Premium Craft Smoothie — initial schema
-- See PLAN.md §4 for module boundaries and ../../TASKS.md Phase 1 for context.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────
-- Inventory
-- ─────────────────────────────────────────────────────────────────────

create table materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null check (unit in ('g', 'ml')),
  -- CHECK guarantees deductions can never push stock below zero;
  -- approve_order relies on this for atomic rollback.
  current_stock numeric not null default 0 check (current_stock >= 0),
  cost_per_unit numeric not null default 0 check (cost_per_unit >= 0),
  created_at timestamptz not null default now()
);

create table menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_price numeric not null check (base_price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bom (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references menus(id) on delete cascade,
  material_id uuid not null references materials(id) on delete restrict,
  quantity_required numeric not null check (quantity_required > 0),
  unique (menu_id, material_id)
);
create index bom_menu_idx on bom(menu_id);
create index bom_material_idx on bom(material_id);

create table addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null check (price >= 0),
  -- Add-ons can be free-standing (no material) or tied to one material.
  material_id uuid references materials(id) on delete restrict,
  quantity_per_serving numeric check (quantity_per_serving is null or quantity_per_serving > 0),
  is_active boolean not null default true,
  -- Either both nullable fields are set, or both are null.
  check (
    (material_id is null and quantity_per_serving is null)
    or (material_id is not null and quantity_per_serving is not null)
  )
);

-- ─────────────────────────────────────────────────────────────────────
-- Customers
-- ─────────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique not null,
  display_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);
create index profiles_line_user_idx on profiles(line_user_id);

-- ─────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete restrict,
  total_price numeric not null check (total_price >= 0),
  status text not null default 'Pending'
    check (status in ('Pending', 'Blending', 'Ready', 'Completed')),
  payment_slip_url text,
  video_proof_url text,
  review_score int check (review_score is null or review_score between 1 and 5),
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on orders(customer_id);
create index orders_status_idx on orders(status);
-- Used by the cleanup-videos cron to find expired unreviewed videos.
create index orders_cleanup_idx on orders(status, created_at)
  where review_score is null and video_proof_url is not null;

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0)
);
create index order_items_order_idx on order_items(order_id);

create table order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  addon_id uuid not null references addons(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0)
);
create index order_item_addons_item_idx on order_item_addons(order_item_id);

-- updated_at trigger — only on orders for now.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();
