-- Modo viaje: override manual "destacado" para mostrar un viaje en grande aunque
-- aún no empiece (gastos de reservas antes de fecha_inicio). Aditivo, default false.
-- Aplicado vía Supabase MCP el 2026-06-22. Solo presentación; no afecta cálculos.
alter table public.proyectos add column if not exists destacado boolean not null default false;
