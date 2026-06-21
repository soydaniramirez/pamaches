# Plan de refactorización: pamaches → Next.js + Supabase

> Documento de planeación y guía de migración del `index.html` original (SPA de
> un solo archivo, ~6,571 líneas) a una aplicación **Next.js (App Router, TypeScript)**
> con **Supabase** como backend, conservando las funcionalidades existentes y
> mejorando la seguridad.

---

## 1. Objetivos

1. **Conservar todas las funcionalidades** actuales (20 pantallas, ~225 funciones).
2. **Mejorar la seguridad**: sacar las llaves del código fuente, proteger rutas en
   el servidor y reforzar las políticas de la base de datos (RLS).
3. **Hacer el código mantenible**: separar en componentes, hooks y módulos en vez
   de un único archivo HTML gigante.
4. **No romper la base de datos existente**: la app ya usa Supabase; reutilizamos
   el mismo esquema de 28 tablas.

---

## 2. Estado actual (análisis)

| Aspecto | index.html original |
|---|---|
| Arquitectura | SPA de **un solo archivo** (HTML + CSS + JS inline) |
| Tamaño | 6,571 líneas / 285 KB |
| Backend | Supabase (`@supabase/supabase-js` por CDN) |
| Auth | Email/password (`signInWithPassword`) |
| Pantallas | 20 (`.screen` con display none/active, navegación por `goTo()`) |
| Funciones | ~225 funciones globales |
| Tablas | 28 tablas en `public` |
| Realtime | 1 canal con ~25 suscripciones `postgres_changes` |
| Estado | Variables globales mutables (`ME`, `COUPLE`, `PROFILES`, ...) |

### Problemas de seguridad detectados

1. 🔴 **Llaves hardcodeadas** en el HTML (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
   y versionadas en git. → **Movidas a variables de entorno.**
2. 🟠 **Auth solo en cliente**: `arranque()` revisaba la sesión en el navegador;
   el contenido se cargaba sin verificación de servidor. → **Middleware + check en
   layout de servidor.**
3. 🟠 **La seguridad real depende de RLS**: la anon key es pública por diseño, así
   que **toda** la protección de datos vive en las políticas de la base. Hay que
   auditarlas (ver §6).
4. 🟡 **`confirm()`/`alert()` nativos** y render con `innerHTML` (riesgo de XSS si
   el contenido no se escapa). React escapa por defecto → menos superficie.

> ⚠️ **Acción recomendada**: rota la `anon key` en el panel de Supabase, ya que
> estuvo expuesta públicamente en el historial de git.

---

## 3. Arquitectura objetivo

- **Next.js 15 (App Router) + React 19 + TypeScript**.
- **`@supabase/ssr`** para manejar la sesión vía cookies (cliente, servidor y
  middleware).
- **Estilos**: se conserva el CSS original tal cual (`globals.css`), más unas
  pocas clases auxiliares al final del archivo.
- **Estado de la app**: un `AppDataProvider` (Context) carga el equivalente a
  `cargarPerfil()` (ME, COUPLE, PROFILES, CATEGORIAS, FECHAS, CUPO) y expone
  `toast`, `reload`, `logout`.
- **Realtime**: cada pantalla se suscribe a sus propias tablas con
  `supabase.channel(...)` dentro de un `useEffect` (se limpia al desmontar).

### Estructura de carpetas

```
next-app/
├── .env.example            # plantilla de variables (se versiona)
├── .env.local              # valores reales (NO se versiona — .gitignore)
├── middleware.ts           # refresco de sesión + protección de rutas
├── next.config.mjs
├── tsconfig.json
├── src/
│   ├── app/
│   │   ├── layout.tsx              # layout raíz (fuentes, #app, ruido)
│   │   ├── globals.css             # CSS original portado
│   │   ├── login/page.tsx          # pantalla de login (pública)
│   │   └── (app)/                  # grupo de rutas autenticadas
│   │       ├── layout.tsx          # check de sesión (servidor) + provider + nav
│   │       ├── page.tsx            # HOME  ✅
│   │       ├── gastos/page.tsx     # GASTOS (port de referencia) ✅
│   │       ├── planes/page.tsx     # stub
│   │       ├── nosotros/page.tsx   # stub  (+ /nosotros/capsula stub)
│   │       ├── perfil/page.tsx     # stub
│   │       ├── notitas/page.tsx    # stub
│   │       ├── tareas/page.tsx     # stub
│   │       ├── agenda/page.tsx     # stub
│   │       └── mas/page.tsx        # stub
│   ├── components/
│   │   ├── BottomNav.tsx           # navegación inferior (rutas reales) ✅
│   │   ├── NotitasSection.tsx      # notitas + reacciones + realtime ✅
│   │   └── Stub.tsx                # placeholder de pantallas pendientes
│   ├── context/
│   │   └── AppData.tsx             # estado global + toast (≈ cargarPerfil) ✅
│   └── lib/
│       ├── helpers.ts              # fmtFecha, fmtDinero, tiempoJuntos... ✅
│       ├── social.ts               # reacciones + crearNovedad ✅
│       ├── types.ts                # modelos de dominio
│       └── supabase/
│           ├── client.ts           # cliente de navegador ✅
│           ├── server.ts           # cliente de servidor ✅
│           └── middleware.ts       # updateSession ✅
```

---

## 4. Mapeo de pantallas → rutas

| Pantalla original (`screen-*`) | Ruta Next.js | Estado |
|---|---|---|
| login | `/login` | ✅ Portada |
| home | `/` | ✅ Portada |
| gastos | `/gastos` | ✅ Referencia (lista + total; falta balance/aportes) |
| planes | `/planes` | ⬜ Stub |
| perfil | `/perfil` | ⬜ Stub |
| notitas | `/notitas` | ⬜ Stub |
| nosotros | `/nosotros` | ⬜ Stub |
| capsula | `/nosotros/capsula` | ⬜ Stub |
| raros | `/nosotros/raros` | ⬜ Pendiente |
| futuro | `/nosotros/futuro` | ⬜ Pendiente |
| nonego | `/nosotros/nonego` | ⬜ Pendiente |
| capsulatiempo | `/nosotros/capsulatiempo` | ⬜ Pendiente |
| mas | `/mas` | ⬜ Stub |
| tareas | `/tareas` | ⬜ Stub |
| agenda | `/agenda` | ⬜ Stub |
| spicy | `/spicy` | ⬜ Pendiente |
| spicy-ruleta | `/spicy/ruleta` | ⬜ Pendiente |
| spicy-deseos | `/spicy/deseos` | ⬜ Pendiente |
| spicy-termometro | `/spicy/termometro` | ⬜ Pendiente |
| spicy-cartas | `/spicy/cartas` | ⬜ Pendiente |

---

## 5. Mapeo de tablas → módulos

Las 28 tablas de Supabase se agrupan por feature. Cada feature será un
módulo (`lib/<feature>.ts` con queries + tipos) y su(s) pantalla(s).

| Feature | Tablas | Funciones clave a portar |
|---|---|---|
| **Perfil/pareja** | `profiles`, `couples`, `aporte_config` | cargarPerfil, renderPerfil, saveCupo |
| **Notitas** | `notitas`, `notita_reacciones` | cargarNotitas ✅, reaccionar ✅, archivarNotita, borrarNotita |
| **Novedades** | `novedades` | crearNovedad ✅, revisarNovedades, openNovedades |
| **Gastos** | `expenses`, `categorias`, `subcategorias`, `settlements` | cargarGastos (parcial ✅), calcularYrenderGastos, cargarSettlements, saveSaldar |
| **Mensualidades** | `compras_meses` | cargarComprasMeses, renderMeses, calcularFechaCuota |
| **Metas/futuro** | `future`, `meta_abonos` | cargarFuturo, saveAbono, ahorradoDe |
| **Planes/citas** | `plans`, `moods` | cargarPlanes, generarIdea, guardarIdeaComoPlan |
| **Cápsula (preguntas)** | `questions`, `answers` | cargarCapsula, rotarPreguntaSiToca, guardarRespuesta |
| **Raros (semáforo)** | `moods` | cargarRaros, ponerSemaforo |
| **No-negociables** | `nonnegotiables` | cargarNonego, saveNn |
| **Cápsula del tiempo** | `timecapsule` | cargarCapsulaTiempo, abrirCapsula |
| **Tareas/hogar** | `tasks`, `meals`, `super` | cargarTareas, renderMenu, renderSuper |
| **Fechas importantes** | `fechas` | cargarFechas ✅, renderAvisoFecha (parcial ✅) |
| **Agenda** | `agenda` | cargarAgenda, cargarEventosProximos |
| **Spicy** | `spicy_deseos`, `spicy_cartas`, `spicy_termometro`, `spicy_retos` | cargarDeseos, cargarCartasSpicy, cargarTermometro |

---

## 6. Mejoras de seguridad (checklist)

- [x] Mover `SUPABASE_URL` / `ANON_KEY` a variables de entorno (`.env.local`).
- [x] `.env*` en `.gitignore`; plantilla en `.env.example`.
- [x] Protección de rutas en **middleware** (servidor), no solo en cliente.
- [x] Doble verificación de sesión en el `layout` del grupo `(app)`.
- [x] Render con React (escapa por defecto) en vez de `innerHTML` con strings.
- [ ] **Rotar la anon key** expuesta en git (acción manual en Supabase).
- [ ] **Auditar políticas RLS** de las 28 tablas: cada `select/insert/update/delete`
      debe limitarse a filas del `couple_id` del usuario autenticado. Ejecutar
      `get_advisors` (security) en Supabase y corregir tablas sin RLS.
- [ ] Mover operaciones sensibles/agregadas a **Route Handlers o Server Actions**
      (usando el cliente de servidor) cuando convenga.
- [ ] La `SERVICE_ROLE_KEY` (si se usa) solo en servidor, **nunca** con prefijo
      `NEXT_PUBLIC_`.
- [ ] Sustituir `confirm()`/`alert()` por modales accesibles de la app.

---

## 7. Lo realizado en esta sesión

- ✅ Scaffold completo de Next.js (App Router + TS): `package.json`, `tsconfig`,
  `next.config`, `.gitignore`.
- ✅ Capa de Supabase: cliente de navegador, de servidor y middleware de sesión.
- ✅ `.env.example` + `.env.local` (llaves fuera del código).
- ✅ Auth: `/login` funcional + protección de rutas.
- ✅ CSS original portado a `globals.css`.
- ✅ Shell de la app: layout, `AppDataProvider`, `BottomNav`, toasts.
- ✅ **Home** portado (header, hero, aviso de fecha, notitas con reacciones y
  realtime, tarjetas, pregunta de la semana).
- ✅ **Gastos** como port de referencia (navegación de mes, lista, total, realtime).
- ✅ Stubs navegables para el resto de pantallas.
- ✅ `npm run build` y `tsc --noEmit` pasan sin errores.

## 8. Próximos pasos sugeridos (orden recomendado)

1. Generar tipos reales: `supabase gen types typescript` → `database.types.ts`.
2. Auditar y reforzar **RLS** (lo más importante de seguridad).
3. Portar **perfil** (base de configuración: categorías, fechas, cupo).
4. Completar **gastos** (balance, aportes, settlements, mensualidades).
5. Portar **notitas** (vista completa + archivo) y **novedades** (campanita).
6. Portar **planes**, **cápsula**, **tareas/agenda** y el resto.
7. Centro de novedades + badges (`setAppBadge`) y realtime global.
8. PWA: `manifest`, íconos e instalación (la original era apple-web-app capable).
