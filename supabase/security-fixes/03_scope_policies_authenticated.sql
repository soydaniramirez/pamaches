-- ============================================================
-- FIX H3 — Acotar políticas al rol 'authenticated' (no 'public')
-- Estado: PROPUESTO. NO aplicado a producción.
-- Seguridad: SEGURO para usuarios reales (todos son 'authenticated').
--            Bloquea a 'anon' a nivel de política, no solo por la función
--            my_couple_id(). Revisa antes de aplicar: recrea políticas.
-- ============================================================
--
-- Mantiene EXACTAMENTE la misma lógica de scoping por pareja
-- (couple_id = my_couple_id()); lo único que cambia es el rol destino.

-- ---- 1) Las 26 tablas con patrón uniform "FOR ALL por pareja" ----
do $$
declare
  t text;
  pol record;
  tablas text[] := array[
    'agenda','answers','aporte_config','categorias','compras_meses',
    'expenses','fechas','future','meals','meta_abonos','moods',
    'nonnegotiables','notita_reacciones','notitas','novedades','plans',
    'questions','settlements','spicy_cartas','spicy_deseos','spicy_retos',
    'spicy_termometro','subcategorias','super','tasks','timecapsule'
  ];
begin
  foreach t in array tablas loop
    -- borrar todas las políticas existentes de la tabla
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;

    -- recrear una única política couple-scoped, solo para authenticated
    execute format($f$
      create policy %I on public.%I
        for all to authenticated
        using (couple_id = public.my_couple_id())
        with check (couple_id = public.my_couple_id())
    $f$, t || '_couple_rw', t);
  end loop;
end $$;

-- ---- 2) couples (scoping por id, sin INSERT/DELETE para usuarios) ----
drop policy if exists "ver mi pareja" on public.couples;
drop policy if exists "editar mi pareja" on public.couples;

create policy couples_select on public.couples
  for select to authenticated
  using (id = public.my_couple_id());

create policy couples_update on public.couples
  for update to authenticated
  using (id = public.my_couple_id())
  with check (id = public.my_couple_id());

-- ---- 3) profiles (misma lógica; el endurecimiento de INSERT es H4) ----
drop policy if exists "ver perfiles de mi pareja" on public.profiles;
drop policy if exists "crear mi perfil" on public.profiles;
drop policy if exists "editar mi perfil" on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using (couple_id = public.my_couple_id());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));   -- NOTA: H4 endurece esto aparte

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Verificación:
--   select tablename, policyname, roles, cmd from pg_policies
--   where schemaname='public' order by tablename;
--   -> roles debe ser {authenticated} en todas
