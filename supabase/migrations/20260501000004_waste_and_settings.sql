-- ─────────────────────────────────────────────────────────────────────
-- waste_logs
-- Records every material written off (spoiled, dropped, prep error).
-- Deduction from current_stock is done in the API route, not here,
-- so we can cap at 0 rather than hitting the CHECK constraint.
-- ─────────────────────────────────────────────────────────────────────
create table waste_logs (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete restrict,
  quantity    numeric not null check (quantity > 0),
  reason      text not null default 'other'
                check (reason in ('spoiled', 'dropped', 'prep_error', 'other')),
  note        text,
  logged_at   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index waste_logs_material_idx on waste_logs(material_id);
create index waste_logs_date_idx     on waste_logs(logged_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- shop_settings  (key-value store for runtime-editable config)
-- ─────────────────────────────────────────────────────────────────────
create table shop_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into shop_settings (key, value) values
  ('shop_name',       'Craft Smoothie'),
  ('admin_pin',       '1234'),
  ('promptpay_qr_url', '')
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────
-- get_daily_close_stats(p_date)
-- All day-end numbers in one RPC call.
-- COGS = BOM ingredients + add-on ingredients (by cost_per_unit).
-- ─────────────────────────────────────────────────────────────────────
create or replace function get_daily_close_stats(p_date date default current_date)
returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_revenue     numeric;
  v_cups        int;
  v_orders      int;
  v_cogs        numeric;
  v_waste_cost  numeric;
  v_waste_qty   json;
  v_top_items   json;
begin
  -- Revenue & volume (exclude Pending)
  select
    coalesce(sum(o.total_price), 0),
    coalesce(sum(oi.quantity),   0),
    count(distinct o.id)
  into v_revenue, v_cups, v_orders
  from orders o
  join order_items oi on oi.order_id = o.id
  where o.created_at::date = p_date
    and o.status != 'Pending';

  -- COGS from BOM
  select coalesce(sum(oi.quantity * b.quantity_required * mat.cost_per_unit), 0)
  into v_cogs
  from order_items oi
  join orders  o   on o.id  = oi.order_id
  join bom     b   on b.menu_id = oi.menu_id
  join materials mat on mat.id = b.material_id
  where o.created_at::date = p_date
    and o.status != 'Pending';

  -- COGS from add-ons (material-linked only)
  v_cogs := v_cogs + coalesce((
    select sum(oia.quantity * ad.quantity_per_serving * mat.cost_per_unit)
    from order_item_addons oia
    join order_items  oi  on oi.id   = oia.order_item_id
    join orders       o   on o.id    = oi.order_id
    join addons       ad  on ad.id   = oia.addon_id
    join materials    mat on mat.id  = ad.material_id
    where o.created_at::date = p_date
      and o.status != 'Pending'
      and ad.material_id is not null
  ), 0);

  -- Waste today: cost + per-material summary
  select
    coalesce(sum(wl.quantity * mat.cost_per_unit), 0),
    coalesce(
      json_agg(json_build_object(
        'name', mat.name, 'unit', mat.unit,
        'quantity', wl.quantity, 'reason', wl.reason
      ) order by wl.created_at),
      '[]'::json
    )
  into v_waste_cost, v_waste_qty
  from waste_logs wl
  join materials mat on mat.id = wl.material_id
  where wl.logged_at = p_date;

  -- Top items today
  select coalesce(json_agg(t order by t.cups desc), '[]'::json)
  into v_top_items
  from (
    select men.name, sum(oi.quantity) as cups
    from order_items oi
    join menus   men on men.id = oi.menu_id
    join orders  o   on o.id  = oi.order_id
    where o.created_at::date = p_date
      and o.status != 'Pending'
    group by men.id, men.name
    order by cups desc
    limit 5
  ) t;

  return json_build_object(
    'date',        p_date,
    'revenue',     v_revenue,
    'cups',        v_cups,
    'orders',      v_orders,
    'cogs',        v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'waste_cost',  coalesce(v_waste_cost, 0),
    'waste_items', coalesce(v_waste_qty, '[]'::json),
    'top_items',   coalesce(v_top_items, '[]'::json)
  );
end;
$$;
