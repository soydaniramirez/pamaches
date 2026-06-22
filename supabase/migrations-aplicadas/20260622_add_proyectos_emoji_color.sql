-- Modo viaje: personalización visual de proyectos.
-- Aditivo y nullable (no se pierde nada). Aplicado vía Supabase MCP el 2026-06-22.
-- emoji/color son SOLO presentación; no afectan ningún cálculo financiero.
alter table public.proyectos
  add column if not exists emoji text,
  add column if not exists color text;
