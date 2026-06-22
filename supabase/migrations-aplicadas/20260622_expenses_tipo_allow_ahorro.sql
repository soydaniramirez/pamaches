-- ============================================================
-- Habilitar tipo 'ahorro' en expenses
-- Estado: APLICADA a producción el 2026-06-22
--   migración: expenses_tipo_allow_ahorro
-- Aditivo: solo amplía el set permitido del CHECK. No pierde datos
-- (0 filas existentes lo violaban; los 4 valores previos se preservan tal cual).
-- ============================================================

-- ANTES:
-- CHECK ((tipo = ANY (ARRAY['aporte'::text, 'compartido'::text, 'invitacion'::text, 'personal'::text])))

alter table public.expenses drop constraint expenses_tipo_check;
alter table public.expenses add constraint expenses_tipo_check
  check (tipo = any (array['aporte'::text, 'compartido'::text, 'invitacion'::text, 'personal'::text, 'ahorro'::text]));

-- DESPUÉS:
-- CHECK ((tipo = ANY (ARRAY['aporte'::text, 'compartido'::text, 'invitacion'::text, 'personal'::text, 'ahorro'::text])))
