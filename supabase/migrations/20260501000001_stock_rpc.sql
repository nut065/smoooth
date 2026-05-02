-- ─────────────────────────────────────────────────────────────────────
-- get_materials_with_min_bom
-- Returns all materials with the smallest BOM quantity_required across
-- every menu that uses the material. Used by the admin stock page to
-- highlight materials that can't complete even one cup.
-- ─────────────────────────────────────────────────────────────────────

create or replace function get_materials_with_min_bom()
returns table (
  id            uuid,
  name          text,
  unit          text,
  current_stock numeric,
  cost_per_unit numeric,
  min_per_cup   numeric
)
language sql
stable
as $$
  select
    mat.id,
    mat.name,
    mat.unit,
    mat.current_stock,
    mat.cost_per_unit,
    min(b.quantity_required) as min_per_cup
  from materials mat
  left join bom b on b.material_id = mat.id
  group by mat.id, mat.name, mat.unit, mat.current_stock, mat.cost_per_unit
  order by mat.name;
$$;
