-- ============================================================
-- FIX H2 — Reducir exposición de funciones SECURITY DEFINER vía RPC
-- Estado: PROPUESTO. NO aplicado a producción.
-- Seguridad: SEGURO.
-- ============================================================
--
-- Contexto:
--  - public.rls_auto_enable() es una función de EVENT TRIGGER. No tiene
--    sentido exponerla por /rest/v1/rpc. Los event triggers se ejecutan
--    por el motor con privilegios de su dueño, así que revocar EXECUTE
--    NO rompe el trigger. La revocamos de public/anon/authenticated.
--
--  - public.my_couple_id() SÍ necesita EXECUTE para 'authenticated',
--    porque las políticas RLS la invocan en el contexto del usuario que
--    consulta. Por eso NO se revoca a 'authenticated'. Devuelve solo el
--    couple_id del propio usuario (NULL para anon), así que el riesgo de
--    su exposición por RPC es muy bajo (riesgo aceptado).
--    Opcionalmente se puede revocar a 'anon' (ver bloque comentado),
--    pero ten en cuenta que podría convertir una consulta de 'anon' en
--    error de permiso en lugar de "0 filas". El resultado para el atacante
--    es el mismo (sin datos), pero cambia el mensaje. Déjalo comentado si
--    prefieres no alterar ese comportamiento.

-- rls_auto_enable: quitar del API expuesto
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon;
revoke execute on function public.rls_auto_enable() from authenticated;

-- my_couple_id: (opcional) quitar solo a anon. Descomenta si lo quieres.
-- revoke execute on function public.my_couple_id() from anon;

-- Verificación:
--   select proname, proacl from pg_proc
--   where proname in ('my_couple_id','rls_auto_enable');
