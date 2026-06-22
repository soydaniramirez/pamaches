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
| capsula | `/nosotros/capsula` | ✅ Portada (pregunta de la semana, gating, nivel de conexión, archivo) |
| raros | `/nosotros/raros` | ✅ Portada (semáforo diario + biblioteca de ejercicios + timer) |
| futuro | `/nosotros/futuro` | ✅ Portada (timeline de hitos, metas, abonos, historial mixto) |
| nonego | `/nosotros/nonego` | ✅ Portada (3 tabs por autor, crear/borrar) |
| capsulatiempo | `/nosotros/capsulatiempo` | ✅ Portada (sellar/abrir con gating, borrar) |
| mas | `/mas` | ✅ Hub (4 tarjetas) |
| tareas | `/tareas` | ✅ Portada (tareas + menú + súper, recurrentes) |
| agenda | `/agenda` | ✅ Portada (eventos, próximos/pasados, CRUD) |
| spicy | `/spicy` | ✅ Hub (4 tarjetas) |
| spicy-ruleta | `/spicy/ruleta` | ✅ Portada (lista compartida + giro al azar) |
| spicy-deseos | `/spicy/deseos` | ✅ Portada (gating a ciegas, seguro) |
| spicy-termometro | `/spicy/termometro` | ✅ Portada (ventana 12h + aviso) |
| spicy-cartas | `/spicy/cartas` | ✅ Portada (molde de notitas) |

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
| **Metas/futuro** | `future`, `meta_abonos` (+ lee `expenses` ahorro) | cargarFuturo ✅, ahorradoDe ✅, saveFuturo ✅, saveAbono ✅, historial mixto ✅ |
| **Planes/citas** | `plans` (los "moods" son const, no tabla) | cargarPlanes ✅, generarIdea ✅, guardarIdeaComoPlan ✅, savePlan ✅, togglePlan ✅ |
| **Cápsula (preguntas)** | `questions`, `answers` | cargarCapsula ✅, rotarPreguntaSiToca ✅ (compartida home+cápsula), guardarRespuesta ✅, gating ✅, nivel ✅, archivo ✅ |
| **Raros (semáforo)** | `moods` (+ ejercicios estáticos) | cargarRaros ✅, ponerSemaforo ✅ (siempre insert), biblioteca + timer ✅ |
| **No-negociables** | `nonnegotiables` | cargarNonego ✅, saveNn ✅, borrarNn ✅ (autor es text: los_dos/dani/alfredo; `tipo` sin usar) |
| **Cápsula del tiempo** | `timecapsule` | cargarCapsulaTiempo ✅, saveCt ✅, abrirCapsula ✅ (gating fecha/evento), borrarCapsula ✅ |
| **Tareas/hogar** | `tasks`, `meals`, `super` | cargarTareas ✅, recurrentes ✅, renderMenu ✅, renderSuper ✅ |
| **Fechas importantes** | `fechas` | cargarFechas ✅, renderAvisoFecha ✅ (fechas + eventos) |
| **Agenda** | `agenda` | cargarAgenda ✅, CRUD ✅, cargarEventosProximos (aviso del home) ✅ |
| **Spicy** | `spicy_cartas`, `spicy_retos`, `spicy_termometro`, `spicy_deseos` | cartas ✅, ruleta ✅, termómetro ✅, deseos ✅ (gating seguro) |

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
- ✅ **Nosotros — Grupo 4 (cápsula de preguntas) → BLOQUE NOSOTROS COMPLETO**:
  pregunta de la semana con rotación semanal (función `rotarPreguntaSiToca`
  compartida en `lib/capsula.ts`, reutilizada por home y cápsula — una sola copia);
  responder con **gating** (la respuesta del otro NO se trae al cliente hasta que
  ambos respondieron — verificado a nivel de query); nueva pregunta al azar; crear
  pregunta propia + activarla; archivo con ambas respuestas; nivel de conexión
  (`NIVELES_CONEXION` verbatim). anon = 0; autenticado solo su pareja.
- ✅ **Nosotros — Grupo 2 (futuro)**: timeline de hitos (`future`: crear/editar/
  logrado/borrar) + metas con barra `ahorrado/meta` donde `ahorrado = Σ meta_abonos
  + Σ expenses(ahorro, meta_id)` + abonos (insert `meta_abonos`, historial mixto,
  borrar). Solo LEE de Gastos. Verificado: cálculo idéntico al HTML, sin doble
  conteo (fuentes en tablas distintas). anon = 0; autenticado solo su pareja.
  ⚠️ Hallazgo: `expenses_tipo_check` NO permite `tipo='ahorro'` → la fuente
  "ahorros desde gastos" está siempre vacía en esta base (ver tareas pendientes).
- ✅ **Nosotros — Grupo 3 (raros)**: semáforo diario (`moods`: marcar mi estado
  con insert, ver el del otro de hoy, novedad en amarillo/rojo) + biblioteca de
  ejercicios (`EJERCICIOS_CATS` verbatim, acordeón) + timer de 20 min. anon = 0
  filas; autenticado solo su pareja.
- ✅ **Más — tareas + agenda**: hub `/mas` (4 tarjetas); **tareas** (3 sub-tabs:
  tareas con recurrentes/rotación, menú por bloques y semana, súper) y **agenda**
  (eventos próximos/pasados con archivo, CRUD, categorías). Placeholder `/spicy`.
  anon = 0 filas; autenticado solo su pareja.
- ✅ **Spicy COMPLETO**: hub `/spicy` + cartas (molde de notitas) + ruleta de retos
  (lista compartida + giro al azar) + termómetro de ganas (ventana 12h absoluta +
  novedad) + **deseos** (gating a ciegas seguro: los del otro no se consultan hasta
  tener ≥1 propio). anon = 0 filas; autenticado solo su pareja.
- 🎉 **CONTENIDO DE LA APP COMPLETO** — todas las pantallas del index.html portadas.
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
   - ✅ ~~Grupo 2: **futuro**~~ (hecho).
   - ✅ ~~Grupo 4: **cápsula de preguntas**~~ (hecho). **→ BLOQUE NOSOTROS COMPLETO.**
7. ✅ ~~Portar **tareas/agenda** y **spicy** (hub + cartas + ruleta + termómetro +
   deseos)~~ (hecho). **→ CONTENIDO DE LA APP COMPLETO.**
## Cierre técnico (lo único que queda)
8. ✅ ~~Generar tipos reales: `supabase gen types typescript` → `database.types.ts`~~
   (hecho 2026-06-22). Tipos reales del esquema en `src/lib/database.types.ts`,
   `createClient` (browser/server/middleware) tipado con `<Database>`. Para que el
   genérico `Database` se propagara hubo que alinear `@supabase/ssr` (0.5.2 → 0.12.0,
   cuyo peer es `@supabase/supabase-js ^2.108.0`, coincidiendo con el 2.108.2 ya
   instalado); la API de cookies (`getAll`/`setAll`) es idéntica entre 0.5 y 0.12, así
   que **no hubo cambio de comportamiento**. `tsc --noEmit` y `next build` limpios, sin
   `any` / `as any` / `@ts-ignore` / `@ts-expect-error`. No se aplicó ninguna migración
   (solo se leyó el esquema).
9. ✅ ~~Repaso de completitud del **home**~~ (hecho 2026-06-22). Única pieza que
   faltaba: `cargarEventosProximos` + su parte en `renderAvisoFecha` (el aviso del
   home también considera eventos de agenda dentro de 14 días, no solo fechas
   importantes). Portado 1:1: nuevo `lib/agenda.ts` (AGENDA_CATS / agendaCatById /
   diasParaEvento, compartido con la pantalla de agenda), el home carga eventos
   próximos (con el patrón UTC del original — bug parqueado, ver abajo) y los mezcla
   en el aviso (ícono de categoría + click a /agenda cuando gana un evento), con
   realtime de `agenda`. El resto del home (notitas, campanita, pregunta de la
   semana, hero, fecha-aviso de fechas, mini-cards) ya estaba portado; `card-gastos-meta`
   es estático también en el HTML (no se actualiza por JS).
10. PWA:
    - ✅ ~~**manifest + íconos + instalación**~~ (hecho 2026-06-22). `app/manifest.ts`
      (name/short_name/theme #FFF1F1/display standalone/start_url/scope) servido en
      `/manifest.webmanifest` y enlazado automático; íconos 192/512/maskable + apple
      touch 180 generados con `sharp` desde `pamache-icon.png` (en `public/icons/`);
      tags iOS (apple-mobile-web-app-capable + mobile-web-app-capable, title,
      status-bar). Instalable sin service worker. tsc + build OK.
    - 🅿️ **service worker → propuesta entregada, PENDIENTE de OK** (Fase B). Enfoque:
      probablemente NINGÚN SW (la instalación no lo exige y la app es data en vivo de
      Supabase + realtime; un SW cacheando rompería la frescura). Ver propuesta.
11. ✅ ~~Resolver los **bugs UTC**~~ (hecho 2026-06-22, ver más abajo).

### Tareas técnicas pendientes (aparte)
- ✅ ~~**Bugs de fecha en UTC**~~ (resuelto 2026-06-22). Util `lib/fechas.ts`
  (`hoyEnMexico()` / `diaEnMexico(n)`) que interpreta "hoy/ahora" en la zona de la
  **pareja** (`Intl.DateTimeFormat` + `America/Mexico_City`, NO la del dispositivo).
  Aplicado SOLO en los 3 sitios del inventario:
  - 🔴→✅ **raros / semáforo** (`raros/page.tsx` `cargar`): `hoy = hoyEnMexico()`.
  - 🔴→✅ **cápsula / activar** (`capsula/page.tsx` `activar`): `semana = hoyEnMexico()`.
  - 🔴→✅ **home / eventos próximos** (`page.tsx` `cargarEventos`): `hoy = hoyEnMexico()`,
    `+15d = diaEnMexico(15)` (se respetó la inclusividad `.gte`/`.lte`).
  Los sitios 🟢 (rotación de cápsula `lunesStr`, `lunesISO`/`inicioSemana` de tareas,
  `calcularFechaCuota`/cuotas de gastos, `diasParaFecha`/`diasParaEvento`,
  `GastoModal.hoyISO`, termómetro `Date.now()−12h`) se dejaron **idénticos** (anclan a
  medianoche local o usan instante absoluto → ya correctos en UTC-6). Demostrado el
  caso nocturno (23:30 MX = 05:30 UTC → la util da el día de México, no el de UTC) y
  que de día el resultado no cambia. Inventario: `FECHAS_UTC_INVENTARIO.md`.
  tsc + build OK; RLS de `moods`/`agenda`: anon = 0, autenticado solo su pareja.
- ✅ ~~**Fix del quirk de settlements**~~ (hecho): balance acumulado (opción A),
  consistente en cualquier mes.
- ✅ ~~**`expenses_tipo_check` no permite `tipo='ahorro'`**~~ (resuelto 2026-06-22,
  migración `expenses_tipo_allow_ahorro`): se agregó `'ahorro'` al CHECK preservando
  los 4 valores previos. El tipo "ahorro 🐷" del modal de Gastos ya guarda, y la
  fuente "ahorros desde gastos" de las metas (futuro) funciona end-to-end.
  Verificado: insert de ahorro pasa, suma al ahorrado de la meta y al bloque de
  ahorro del resumen; aporte/compartido/saldo SIN cambios; advisor sin warnings nuevos.

> **Siguiente recomendado: #1 Gastos** (es la otra mitad financiera y ya tiene el
> cupo listo desde Perfil), o **#3 Notitas** si prefieres cerrar features sociales.
