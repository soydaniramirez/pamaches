# pamaches — Next.js + Supabase

App para parejas refactorizada desde el `index.html` original a **Next.js
(App Router, TypeScript)** con **Supabase** como backend.

Consulta [`../PLAN.md`](../PLAN.md) para el plan de migración completo, el mapeo
de pantallas/tablas y el checklist de seguridad.

## Requisitos

- Node.js 18.18+ (recomendado 20+)
- Una cuenta/proyecto de Supabase

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea tu archivo de entorno a partir de la plantilla:

   ```bash
   cp .env.example .env.local
   ```

   y rellena los valores:

   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
   # opcional, solo servidor:
   SUPABASE_SERVICE_ROLE_KEY=""
   ```

   > 🔒 `.env.local` está en `.gitignore` y **no debe subirse** al repositorio.
   > La `anon key` es pública por diseño; la seguridad real depende de las
   > políticas **RLS** en Supabase.

3. Arranca en desarrollo:

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>. Sin sesión, el middleware te manda a `/login`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | Lint con Next |
| `npm run typecheck` | Chequeo de tipos (`tsc --noEmit`) |

## Estado

Portado: login, home (notitas + reacciones + realtime), gastos (referencia).
El resto de pantallas están como stubs navegables — ver `PLAN.md`.
