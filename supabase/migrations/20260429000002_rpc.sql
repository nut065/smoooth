-- RPCs called from `lib/domain/*` — keep business logic in SQL where it can
-- be atomic and race-free. See PLAN.md §4 for the contract.

-- ─────────────────────────────────────────────────────────────────────
-- get_menus_with_availability
-- A menu is "available" if every BOM row's material has enough stock for
-- at least one cup. Computed live; never cached, never stored.
-- ─────────────────────────────────────────────────────────────────────

create or replace function get_menus_with_availability()
returns table (
  id uuid,
  name text,
  base_price numeric,
  image_url text,
  available boolean
)
language sql
stable
as $$
  select
    m.id,
    m.name,
    m.base_price,
    m.image_url,
    not exists (
      select 1
      from bom b
      join materials mat on mat.id = b.material_id
      where b.menu_id = m.id
        and mat.current_stock < b.quantity_required
    ) as available
  from menus m
  where m.is_active = true
  order by m.name;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- approve_order
-- Atomically deducts every material required by the order's items and
-- their add-ons. Relies on materials.current_stock >= 0 CHECK to
-- automatically rollback if any deduction would underflow.
-- ─────────────────────────────────────────────────────────────────────

create or replace function approve_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  -- Lock the order row so two admins can't both approve it.
  select status into v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_status <> 'Pending' then
    raise exception 'order_not_pending: %', v_status using errcode = 'P0001';
  end if;

  -- Aggregate every material required by the order, from menu BOM and
  -- add-ons combined, in one CTE so we deduct each material once.
  with menu_needs as (
    select b.material_id,
           sum(b.quantity_required * oi.quantity) as qty
    from order_items oi
    join bom b on b.menu_id = oi.menu_id
    where oi.order_id = p_order_id
    group by b.material_id
  ),
  addon_needs as (
    select a.material_id,
           sum(a.quantity_per_serving * oia.quantity * oi.quantity) as qty
    from order_items oi
    join order_item_addons oia on oia.order_item_id = oi.id
    join addons a on a.id = oia.addon_id
    where oi.order_id = p_order_id
      and a.material_id is not null
    group by a.material_id
  ),
  total_needs as (
    select material_id, sum(qty) as qty
    from (
      select * from menu_needs
      union all
      select * from addon_needs
    ) u
    group by material_id
  )
  update materials m
  set current_stock = m.current_stock - tn.qty
  from total_needs tn
  where m.id = tn.material_id;
  -- ↑ If any subtraction would put current_stock below 0, the CHECK
  --   constraint raises and the whole transaction rolls back.

  update orders
  set status = 'Blending'
  where id = p_order_id;
end $$;
