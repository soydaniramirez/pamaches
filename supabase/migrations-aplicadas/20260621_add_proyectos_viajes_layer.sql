-- ============================================================
-- PASADA 2 (Gastos) — capa aditiva de viajes / proyectos
-- Estado: APLICADA a producción el 2026-06-21
--   migración: 20260621_add_proyectos_viajes_layer
-- 100% aditivo: tabla nueva + columna NULLABLE en expenses. No pierde datos.
-- ============================================================

-- 1) Tabla nueva proyectos (mismas convenciones que las tablas existentes)
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  nombre text not null,
  tipo text not null default 'proyecto' check (tipo in ('viaje','proyecto')),
  presupuesto numeric,
  fecha_inicio date,
  fecha_fin date,
  archivado boolean not null default false,
  creado timestamptz default now()
);

-- 2) RLS: misma forma que las 26 tablas couple-scoped (FOR ALL TO authenticated)
alter table public.proyectos enable row level security;

drop policy if exists proyectos_couple_rw on public.proyectos;
create policy proyectos_couple_rw on public.proyectos
  for all to authenticated
  using (couple_id = public.my_couple_id())
  with check (couple_id = public.my_couple_id());

grant all on table public.proyectos to authenticated;

-- 3) Columna nueva en expenses: etiqueta opcional de proyecto.
--    Borrar un proyecto NO borra gastos, solo los despega (SET NULL).
alter table public.expenses
  add column if not exists proyecto_id uuid references public.proyectos(id) on delete set null;

create index if not exists expenses_proyecto_id_idx on public.expenses (proyecto_id);
