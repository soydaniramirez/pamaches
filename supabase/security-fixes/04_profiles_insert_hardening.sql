-- ============================================================
-- FIX H4 — Endurecer INSERT de profiles (Opción A, APLICADA)
-- Un usuario solo puede crear su PROPIA pareja nueva: insertar su
-- perfil sobre un couple_id "fresco" (sin miembros). Nunca puede
-- auto-adjuntarse a un couple_id que ya tiene miembros.
-- ============================================================
--
-- Por qué una función helper SECURITY DEFINER y no una subconsulta:
-- una subconsulta directa a public.profiles dentro de la política de
-- INSERT quedaría sujeta al RLS de profiles. Durante el alta el usuario
-- todavía no tiene perfil, así que my_couple_id() = NULL y el SELECT de
-- profiles devolvería 0 filas => el "not exists" sería siempre verdadero
-- y el check no protegería nada. La función SECURITY DEFINER se ejecuta
-- como su dueño y ve TODAS las filas (igual que my_couple_id()).

-- 1) Helper: ¿el couple_id ya tiene algún miembro?
create or replace function public.couple_has_members(cid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (select 1 from public.profiles where couple_id = cid);
$$;

-- No exponer por RPC ni a anon; solo authenticated la necesita (la usa la política).
revoke execute on function public.couple_has_members(uuid) from public;
revoke execute on function public.couple_has_members(uuid) from anon;
grant execute on function public.couple_has_members(uuid) to authenticated;

-- 2) Política de INSERT endurecida
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (
    id = (select auth.uid())
    and couple_id is not null
    and not public.couple_has_members(couple_id)
  );

-- Verificación:
--   select policyname, roles, cmd, with_check
--   from pg_policies
--   where schemaname='public' and tablename='profiles' and cmd='INSERT';
