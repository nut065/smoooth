-- ─────────────────────────────────────────────────────────────────────
-- get_dashboard_stats
-- Single-call admin dashboard aggregation. Returns all metrics as one
-- JSON blob to keep the API route thin and avoid N+1 round trips.
-- "Pending" orders are excluded from revenue — they haven't been approved.
-- ─────────────────────────────────────────────────────────────────────

create or replace function get_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today_revenue  numeric;
  v_today_orders   int;
  v_week_revenue   numeric;
  v_week_orders    int;
  v_daily_chart    json;
  v_top_menus      json;
  v_avg_margin     numeric;
  v_stock_alerts   json;
  v_avg_review     numeric;
  v_pending_count  int;
begin
  -- ── Revenue: today and rolling 7 days (approved orders only) ──────────
  select
    coalesce(sum(total_price) filter (where created_at >= current_date), 0),
    coalesce(count(*)         filter (where created_at >= current_date), 0),
    coalesce(sum(total_price) filter (where created_at >= now() - interval '7 days'), 0),
    coalesce(count(*)         filter (where created_at >= now() - interval '7 days'), 0)
  into v_today_revenue, v_today_orders, v_week_revenue, v_week_orders
  from orders
  where status != 'Pending';

  -- ── Daily chart: last 7 days with zero-fill for missing days ─────────
  select json_agg(d order by d.day)
  into v_daily_chart
  from (
    select
      gs::date                        as day,
      coalesce(o.revenue, 0)          as revenue,
      coalesce(o.orders,  0)          as orders
    from generate_series(
      current_date - interval '6 days',
      current_date,
      '1 day'
    ) gs
    left join (
      select
        created_at::date      as day,
        sum(total_price)      as revenue,
        count(*)              as orders
      from orders
      where status    != 'Pending'
        and created_at >= current_date - interval '6 days'
      group by created_at::date
    ) o on o.day = gs::date
  ) d;

  -- ── Top 5 menus by cups sold (7 days) ────────────────────────────────
  select coalesce(json_agg(t order by t.cups desc), '[]'::json)
  into v_top_menus
  from (
    select
      men.name,
      sum(oi.quantity)                   as cups,
      sum(oi.unit_price * oi.quantity)   as revenue
    from order_items oi
    join menus  men on men.id = oi.menu_id
    join orders o   on o.id   = oi.order_id
    where o.status    != 'Pending'
      and o.created_at >= now() - interval '7 days'
    group by men.id, men.name
    order by cups desc
    limit 5
  ) t;

  -- ── Average gross margin across active menus ──────────────────────────
  select avg(
    case when mc.base_price > 0
      then (mc.base_price - coalesce(mc.cogs, 0)) / mc.base_price * 100
      else 0
    end
  )
  into v_avg_margin
  from (
    select
      men.base_price,
      sum(b.quantity_required * mat.cost_per_unit) as cogs
    from menus men
    left join bom       b   on b.menu_id     = men.id
    left join materials mat on mat.id         = b.material_id
    where men.is_active = true
    group by men.id, men.base_price
  ) mc;

  -- ── Stock alerts: materials below 1-cup threshold ────────────────────
  select coalesce(json_agg(s order by s.pct_remaining), '[]'::json)
  into v_stock_alerts
  from (
    select
      mat.name,
      mat.unit,
      mat.current_stock,
      min(b.quantity_required)                                         as min_per_cup,
      mat.current_stock / nullif(min(b.quantity_required), 0)          as pct_remaining
    from materials mat
    join bom b on b.material_id = mat.id
    group by mat.id, mat.name, mat.unit, mat.current_stock
    having mat.current_stock < min(b.quantity_required)
    order by pct_remaining
  ) s;

  -- ── Average review score (last 30 days) ──────────────────────────────
  select avg(review_score)
  into v_avg_review
  from orders
  where review_score is not null
    and created_at >= now() - interval '30 days';

  -- ── Pending order backlog ─────────────────────────────────────────────
  select count(*) into v_pending_count
  from orders
  where status = 'Pending';

  return json_build_object(
    'today_revenue',  v_today_revenue,
    'today_orders',   v_today_orders,
    'week_revenue',   v_week_revenue,
    'week_orders',    v_week_orders,
    'daily_chart',    coalesce(v_daily_chart,   '[]'::json),
    'top_menus',      coalesce(v_top_menus,     '[]'::json),
    'avg_margin',     coalesce(v_avg_margin,    0),
    'stock_alerts',   coalesce(v_stock_alerts,  '[]'::json),
    'avg_review',     v_avg_review,
    'pending_count',  v_pending_count
  );
end;
$$;
