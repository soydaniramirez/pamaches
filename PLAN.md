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
| gastos | `/gastos` | ✅ Completo (pasada 1 paridad + pasada 2 viajes/proyectos) |
| planes | `/planes` | ✅ Portada (próximo plan, generador de ideas por mood, citas/hechas, CRUD) |
| perfil | `/perfil` | ✅ Portada (categorías, subcategorías, fechas, cupo) |
| notitas | `/notitas` | ✅ Portada (buzón + archivadas, reacciones, archivar/borrar, campanita de novedades) |
| nosotros | `/nosotros` | ✅ Hub (5 tarjetas) |
| capsula | `/nosotros/capsula` | ⬜ Stub (pendiente — Grupo 4) |
| raros | `/nosotros/raros` | ✅ Portada (semáforo diario + biblioteca de ejercicios + timer) |
| futuro | `/nosotros/futuro` | ⬜ Placeholder (pendiente — Grupo 2) |
| nonego | `/nosotros/nonego` | ✅ Portada (3 tabs por autor, crear/borrar) |
| capsulatiempo | `/nosotros/capsulatiempo` | ✅ Portada (sellar/abrir con gating, borrar) |
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
| **Perfil/pareja** | `profiles`, `couples`, `aporte_config` | cargarPerfil ✅, renderPerfil ✅, saveCupo ✅, fechas/categorías/subcategorías CRUD ✅ |
| **Notitas** | `notitas`, `notita_reacciones` | cargarNotitas ✅, cargarTodasNotitas ✅, reaccionar ✅, archivarNotita ✅, borrarNotita ✅ |
| **Novedades** | `novedades` | crearNovedad ✅, revisarNovedades ✅, openNovedades ✅, limpiarNovedades ✅, setAppBadge ✅ |
| **Gastos** | `expenses`, `categorias`, `subcategorias`, `settlements`, `aporte_config` | cargarGastos ✅, calcularYrenderGastos ✅, cargarSettlements ✅, saveSaldar ✅, saveGasto ✅, resumen ✅ |
| **Mensualidades** | `compras_meses` (+ cuotas en `expenses`) | cargarComprasMeses ✅, renderMeses ✅, calcularFechaCuota ✅ |
| **Viajes/proyectos** (pasada 2, nuevo) | `proyectos` (+ `expenses.proyecto_id`) | CRUD proyectos ✅, total por proyecto ✅, selector en modal ✅ |
| **Metas/futuro** | `future`, `meta_abonos` | cargarFuturo, saveAbono, ahorradoDe (meta chips de ahorro ya consumidas en Gastos ✅) |
| **Planes/citas** | `plans` (los "moods" son const, no tabla) | cargarPlanes ✅, generarIdea ✅, guardarIdeaComoPlan ✅, savePlan ✅, togglePlan ✅ |
| **Cápsula (preguntas)** | `questions`, `answers` | cargarCapsula, rotarPreguntaSiToca, guardarRespuesta |
| **Raros (semáforo)** | `moods` (+ ejercicios estáticos) | cargarRaros ✅, ponerSemaforo ✅ (siempre insert), biblioteca + timer ✅ |
| **No-negociables** | `nonnegotiables` | cargarNonego ✅, saveNn ✅, borrarNn ✅ (autor es text: los_dos/dani/alfredo; `tipo` sin usar) |
| **Cápsula del tiempo** | `timecapsule` | cargarCapsulaTiempo ✅, saveCt ✅, abrirCapsula ✅ (gating fecha/evento), borrarCapsula ✅ |
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
- ✅ **Gastos — completo (pasadas 1 y 2)**:
  - Pasada 1 (paridad 1:1): pestañas compartidas / personales / a meses / resumen;
    barra de aporte (cupo vs aportado), balance compartido y settlements ("ya
    quedamos a mano" + historial), modal de registrar gasto (incluye compra a
    meses → `compras_meses` + N cuotas en `expenses`).
  - Pasada 2 (aditiva): capa de **viajes/proyectos** (`proyectos` + columna
    `expenses.proyecto_id`). Pestaña "viajes" con CRUD, total gastado y barra de
    presupuesto, detalle por proyecto; selector opcional de proyecto en el modal
    (no en "a meses"). RLS de `proyectos` couple-scoped (FOR ALL TO authenticated).
  - Verificado: anon = 0 filas, autenticado solo ve su pareja; paridad intacta
    (proyecto_id null en todos los gastos → totales/balance/meses sin cambios).
  - ✅ Fix del *quirk* de settlements: el balance pasó a **acumulado** (toda la
    historia de compartidos − todos los settlements), mostrado igual en cualquier
    mes; el selector de mes solo filtra la lista de movimientos. Adiós saldo fantasma.
- ✅ **Auditoría RLS + fixes aplicados** (ver `SECURITY_AUDIT.md`): 28/28 tablas con
  RLS por pareja, funciones endurecidas, políticas a `authenticated`, INSERT de
  profiles endurecido (Opción A).
- ✅ **Perfil / Configuración** portado 1:1: datos de la pareja, "los dos", fechas
  importantes (CRUD + date picker + fija), categorías y subcategorías (CRUD con
  cascade), y cupo de aporte (upsert en `aporte_config`). Verificado: anon = 0
  filas, autenticado solo ve/edita su pareja.
- ✅ **Notitas (#3) + campanita** portado 1:1: vista completa (buzón + archivadas),
  reacciones (5 tipos), crear/archivar/desarchivar/borrar; campanita de novedades
  en el home con punto de no-leídas, feed (marcar vistas al abrir, borrar item,
  limpiar todo, navegar al destino) y badge de app. Verificado: anon = 0 filas,
  autenticado solo su pareja.
- ✅ **Planes** portado 1:1: próximo plan agendado, generador de ideas por mood
  (const MOODS/IDEAS_BASE + ideas guardadas), pestañas por hacer/hechos, crear
  plan (modal), marcar hecho, borrar. (Aclaración: "mood" aquí es categoría de
  idea, NO la tabla `moods` que respalda "raros"). anon = 0 filas; auth solo su pareja.
- ✅ **Nosotros — Grupo 1**: hub `/nosotros` (5 tarjetas) + **no-negociables**
  (3 tabs por autor, crear/borrar) + **cápsula del tiempo** (sellar/abrir con
  gating fecha-o-evento, borrar). Rutas placeholder para raros/futuro/capsula.
  anon = 0 filas; autenticado solo su pareja.
- ✅ **Nosotros — Grupo 3 (raros)**: semáforo diario (`moods`: marcar mi estado
  con insert, ver el del otro de hoy, novedad en amarillo/rojo) + biblioteca de
  ejercicios (`EJERCICIOS_CATS` verbatim, acordeón) + timer de 20 min. anon = 0
  filas; autenticado solo su pareja.
- ✅ Stubs navegables para el resto de pantallas.
- ✅ `npm run build` y `tsc --noEmit` pasan sin errores.

## 8. Próximos pasos sugeridos (orden recomendado)

1. ✅ ~~Auditar y reforzar **RLS**~~ (hecho — `SECURITY_AUDIT.md`).
2. ✅ ~~Portar **perfil** (categorías, subcategorías, fechas, cupo)~~ (hecho).
3. ✅ ~~**#1 Gastos** (pasada 1 paridad + pasada 2 viajes/proyectos)~~ (hecho).
4. ✅ ~~Portar **#3 Notitas** (vista completa + archivo) y **novedades** (campanita)~~ (hecho).
5. ✅ ~~Portar **planes**~~ (hecho).
6. Bloque **Nosotros** restante, en el orden acordado:
   - ✅ ~~Grupo 1: hub + no-negociables + cápsula del tiempo~~ (hecho).
   - ✅ ~~Grupo 3: **raros**~~ (hecho).
   - **Siguiente → Grupo 2: futuro** (`future`, `meta_abonos`; cruza con Gastos, va con cuidado).
   - Luego Grupo 4: **cápsula de preguntas** (`questions`, `answers`; rotación,
     reveal, nivel de conexión, archivo — la más compleja).
7. Portar **tareas/agenda** (`tasks`, `meals`, `super`, `agenda`) y **spicy**.
8. Generar tipos reales: `supabase gen types typescript` → `database.types.ts`.
9. PWA: `manifest`, íconos e instalación (la original era apple-web-app capable).

### Tareas técnicas pendientes (aparte)
- ✅ ~~**Fix del quirk de settlements**~~ (hecho): balance acumulado (opción A),
  consistente en cualquier mes.

> **Siguiente recomendado: #1 Gastos** (es la otra mitad financiera y ya tiene el
> cupo listo desde Perfil), o **#3 Notitas** si prefieres cerrar features sociales.
