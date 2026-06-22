-- ============================================================
-- FIX H1 — Endurecer my_couple_id() (search_path fijo)
-- Estado: PROPUESTO. NO aplicado a producción.
-- Seguridad: SEGURO. No cambia el comportamiento; solo fija el
--            search_path y califica los objetos por schema.
-- ============================================================
--
-- Por qué: una función SECURITY DEFINER sin search_path fijo es
-- susceptible a que un objeto malicioso en un schema anterior del
-- search_path "secuestre" una referencia no calificada. Se corrige
-- fijando search_path = '' y calificando public.profiles / auth.uid().
--
-- Sigue siendo SECURITY DEFINER a propósito: lee profiles saltándose
-- su RLS para evitar recursión infinita (el RLS de profiles también
-- llama a esta función).

create or replace function public.my_couple_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select couple_id from public.profiles where id = (select auth.uid());
$$;

-- Verificación posterior (opcional):
--   select proconfig from pg_proc where proname = 'my_couple_id';
--   -> debe incluir 'search_path='
