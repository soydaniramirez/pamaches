# Inventario de fechas sensibles a zona horaria (bug UTC)

> Estado: **inventario entregado, fix NO aplicado** (esperando revisión).
> Usuario en **México, UTC-6** (sin horario de verano en la mayor parte del país
> desde 2022). Fecha de este inventario: 2026-06-22.

## Regla para clasificar

- **BUG**: el código toma **"ahora" (`new Date()`) y lo convierte a fecha UTC**
  (`.toISOString().slice(0,10)`). En UTC-6, de noche (después de las 18:00) el
  instante ya cayó en el día siguiente en UTC, así que "hoy"/"ahora" salta un día.
- **CORRECTO (ancla a medianoche local)**: el código ancla a la **medianoche local
  de un día fijo** (`setHours(0,0,0,0)`) y *después* hace `toISOString()`. En UTC-6
  esa medianoche local son las 06:00 UTC del **mismo** día, así que el `slice(0,10)`
  da el día correcto. No cruza frontera de día. (Ej.: el "lunes de la semana".)
- **CORRECTO (componentes locales)**: usa `getFullYear/Month/Date` o
  `setHours(0,0,0,0)` locales y compara contra fechas `'YYYY-MM-DD' + 'T00:00:00'`
  (también local). Todo en hora local → correcto.
- **CORRECTO (instante absoluto)**: compara instantes absolutos (`Date.now()`,
  diferencias de tiempo). Independiente de zona horaria.

---

## 🔴 BUGS (calculan "hoy/ahora" en UTC)

| # | Archivo · función | Qué calcula | Por qué es bug | Qué debería pasar |
|---|---|---|---|---|
| 1 | `app/(app)/nosotros/raros/page.tsx:97` · `cargar` (semáforo) | "hoy" para filtrar los moods del día (`creado >= hoy+'T00:00:00'`) | `new Date().toISOString().slice(0,10)` = fecha UTC. De noche en UTC-6 "hoy" es mañana → la ventana del día queda corrida; puede no traer el mood marcado hoy o traer el de mañana. | Interpretar "hoy" en hora de México (UTC-6): la medianoche local de hoy. |
| 2 | `app/(app)/nosotros/capsula/page.tsx:86` · `activar` (activarPregunta) | El valor `semana` que se guarda al activar manualmente una pregunta | `semana: new Date().toISOString().slice(0,10)` = fecha UTC de "ahora" (no anclada a medianoche). De noche guarda la fecha de mañana. Impacto menor (es una etiqueta), pero es el mismo patrón "ahora en UTC". | Guardar la fecha de "hoy" en hora de México (idealmente el lunes de la semana, como hace la rotación). |
| 3 | `app/(app)/page.tsx` · `cargarEventos` (home, recién portado) | Ventana "hoy"…"+15 días" para los eventos próximos del aviso del home | `new Date().toISOString().slice(0,10)` para ambos extremos = fechas UTC. De noche en UTC-6 la ventana se corre un día. | Interpretar "hoy" y "+15 días" en hora de México. **Portado a propósito con el bug** para unificar el fix aquí. |

---

## 🟢 CORRECTOS — ancla a medianoche local de un día fijo (confirmados, NO tocar)

| Archivo · función | Qué calcula | Por qué es correcto en UTC-6 |
|---|---|---|
| `lib/capsula.ts:50` · `rotarPreguntaSiToca` (`lunesStr`) | El lunes de la semana actual para decidir si rotar la pregunta | `lunes.setHours(0,0,0,0)` (medianoche **local** del lunes) → 06:00 UTC del lunes → `slice(0,10)` da el lunes correcto. **No es bug** (corrige el diagnóstico previo que lo listaba como sospechoso). |
| `lib/tareas.ts:21` · `lunesISO` + `inicioSemana` | El lunes (ISO) de la semana con offset, para tareas y menú | Igual que arriba: ancla a medianoche local del lunes. Correcto en UTC-6. (Confirmado lo que sospechábamos.) |
| `app/(app)/tareas/page.tsx:279` · `lunesStrHoy` | Lunes de esta semana para filtrar tareas visibles | `inicioSemana().toISOString().slice(0,10)`; mismo ancla a medianoche local. Correcto. |
| `app/(app)/gastos/page.tsx:707` | Fecha de la próxima cuota a meses para mostrarla | `calcularFechaCuota` devuelve `new Date(anio, mes, dia)` = medianoche **local** de un día fijo → `toISOString().slice(0,10)` da ese día. Correcto. |

---

## 🟢 CORRECTOS — componentes locales o instante absoluto (NO tocar)

| Archivo · función | Qué calcula | Por qué es correcto |
|---|---|---|
| `lib/helpers.ts:87` · `diasParaFecha` | Días para una fecha importante | `setHours(0,0,0,0)` local + `fecha+'T00:00:00'` local. |
| `lib/agenda.ts:28` · `diasParaEvento` | Días para un evento | `setHours(0,0,0,0)` local + `fecha+'T00:00:00'` local. |
| `lib/helpers.ts:41` · `tiempoJuntos` | Meses/años juntos | `getFullYear/Month/Date` locales. |
| `lib/helpers.ts:25` · `tiempoRelativo` | "hace X min/h/días" | Diferencia de instantes absolutos. |
| `app/(app)/nosotros/capsulatiempo/page.tsx:14` · `isAbierta` | Si una cápsula ya se puede abrir | `setHours(0,0,0,0)` local + `abre_en+'T00:00:00'` local. |
| `app/(app)/planes/page.tsx:53` · próximo plan | Próximo plan con fecha futura | `setHours(0,0,0,0)` local + `fecha+'T00:00:00'` local. |
| `app/(app)/gastos/page.tsx:36` · mes actual | Mes del selector | `new Date()` + `getMonth/getFullYear` locales. |
| `app/(app)/gastos/page.tsx:685` · cuotas pagadas | Cuántas cuotas a meses ya vencieron | `new Date()` + `setHours` local, compara contra fechas locales. |
| `components/gastos/GastoModal.tsx:33` · `hoyISO` | Fecha por defecto de un gasto nuevo | Construye `YYYY-MM-DD` con `getFullYear/Month/Date` **locales** = la forma correcta. |
| `app/(app)/spicy/termometro/page.tsx:27` | Ventana de las últimas 12h | `Date.now() - 12h` = instante absoluto. |

---

## Propuesta de fix (sin aplicar)

### Util compartida
Crear `lib/fechas.ts` con dos helpers que TODO el código que hoy hace
`new Date().toISOString().slice(0,10)` para "hoy/ahora" debería usar:

```ts
// Offset fijo de México (UTC-6). México eliminó el horario de verano en la mayor
// parte del país en 2022, así que un offset fijo es suficiente (ver límites abajo).
const MX_OFFSET_MIN = -6 * 60;

/** "Hoy" en hora de México como 'YYYY-MM-DD'. */
export function hoyEnMexico(): string {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() + (MX_OFFSET_MIN - -ahora.getTimezoneOffset()) * 60000);
  // … equivalente más simple y robusto:
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora); // 'en-CA' produce 'YYYY-MM-DD'
}

/** "Hoy + n días" en hora de México como 'YYYY-MM-DD'. */
export function diaEnMexico(offsetDias: number): string { /* idem, sumando días */ }
```

**Recomendación:** usar `Intl.DateTimeFormat` con `timeZone: 'America/Mexico_City'`
en lugar de un offset numérico fijo. Es la opción **más robusta** (el navegador/Node
ya conoce la zona y su historia), no cuesta más, y nos cubre aunque algún día cambie
la regla o el usuario viaje. Un offset fijo `-6` también funcionaría hoy (México sin
DST), pero `Intl` no tiene desventajas y evita sorpresas.

**Límites del offset fijo (por si se prefiere):** algunas zonas de México sí tienen
DST/otro offset (frontera norte: UTC-7/-6; Quintana Roo: UTC-5; Baja California:
UTC-8/-7). Un `-6` fijo asume centro de México sin DST. Por eso recomiendo `Intl`
con `America/Mexico_City` (o la zona que confirmes del usuario).

### Sitios que tocaría (solo los 3 bugs)
1. `raros/page.tsx` `cargar`: `const hoy = hoyEnMexico();`
2. `capsula/page.tsx` `activar`: `semana: hoyEnMexico()` (o el lunes en hora MX).
3. `page.tsx` (home) `cargarEventos`: `hoy = hoyEnMexico()`, `en15 = diaEnMexico(15)`.

### Sitios que dejaría IGUAL
Todos los de las tablas 🟢 (anclados a medianoche local o a instantes absolutos):
rotación de cápsula, semana de tareas/menú, cuotas de gastos, `diasParaFecha`,
`diasParaEvento`, `isAbierta`, próximo plan, `hoyISO` del modal de gastos, termómetro.

> **Nota sobre `hoyISO` del modal de gastos:** ya hace lo correcto (componentes
> locales). Si se quiere consistencia total, podría reescribirse encima de
> `hoyEnMexico()`, pero NO es un bug y se puede dejar tal cual.
