-- RLS strategy (KISS):
--   Customer-facing reads (menus, addons, get_menus_with_availability)
--   are public. Everything else is locked — server-only access via
--   service-role key from Next.js server actions.
--
--   Customer auth via LIFF will be wired in Phase 2; at that point we
--   add per-customer policies for `orders` SELECT.

-- ─────────────────────────────────────────────────────────────────────

alter table materials          enable row level security;
alter table menus              enable row level security;
alter table bom                enable row level security;
alter table addons             enable row level security;
alter table profiles           enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table order_item_addons  enable row level security;

-- Public reads — only what the customer UI needs to render the menu.
create policy menus_public_read   on menus   for select using (is_active = true);
create policy addons_public_read  on addons  for select using (is_active = true);

-- Everything else has zero policies → effectively deny-all to anon/authenticated.
-- Service-role bypasses RLS, so server-side code keeps working.

-- The availability RPC is defined as STABLE without SECURITY DEFINER and
-- only reads from menus/bom/materials — grant execute publicly so the
-- customer can call it directly without an auth session.
grant execute on function get_menus_with_availability() to anon, authenticated;

-- approve_order must NEVER be callable by clients. Only service-role.
revoke execute on function approve_order(uuid) from public;
revoke execute on function approve_order(uuid) from anon, authenticated;
