-- Cápsula "abrir de todos modos". Aditivo, con default (no se pierde nada).
-- Aplicado vía Supabase MCP el 2026-06-22.
-- questions.abierta: true cuando un respondiente abre la pregunta de todos modos.
-- answers.tarde: true cuando la respuesta se guardó con la pregunta ya abierta.
-- NOTA: la privacidad NO depende de estas columnas. El texto del otro solo se
-- consulta desde el cliente si el usuario actual YA respondió; `abierta` nunca es
-- un atajo para verlo.
alter table public.questions add column if not exists abierta boolean not null default false;
alter table public.answers   add column if not exists tarde   boolean not null default false;
