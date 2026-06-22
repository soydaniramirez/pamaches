/**
 * Fechas en la zona horaria de la PAREJA — fija a 'America/Mexico_City', NO la
 * del dispositivo. Así "hoy" siempre es el día en México aunque la app se abra
 * desde otra zona (p. ej. de viaje).
 *
 * Reemplaza el patrón `new Date().toISOString().slice(0,10)` del index.html, que
 * calculaba "hoy/ahora" en UTC y, de noche en UTC-6, saltaba al día siguiente.
 *
 * Devuelve strings 'YYYY-MM-DD' comparables, iguales en formato a los que ya usa
 * el resto del código (fechas de la BD, etc.).
 */

const ZONA_PAREJA = 'America/Mexico_City';

// 'en-CA' produce el formato ISO 'YYYY-MM-DD'. La zona la conoce el runtime
// (incluida su historia), así que no aplicamos ningún offset numérico a mano.
const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_PAREJA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** El día actual en México como 'YYYY-MM-DD'. */
export function hoyEnMexico(): string {
  return fmt.format(new Date());
}

/**
 * El día en México con un desfase de `offsetDias` respecto a hoy, como
 * 'YYYY-MM-DD'. `diaEnMexico(0)` === `hoyEnMexico()`, `diaEnMexico(15)` = en 15
 * días. Suma los días sobre el "hoy de México" (a mediodía, para no cruzar de
 * día por DST/redondeos) y vuelve a formatear en la misma zona.
 */
export function diaEnMexico(offsetDias: number): string {
  // partimos del día de México (no del instante UTC) para que sumar días no se
  // contamine con la hora local del dispositivo.
  const [y, m, d] = hoyEnMexico().split('-').map(Number);
  // mediodía UTC del día de México: lejos de cualquier frontera de día al sumar.
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + offsetDias);
  return fmt.format(base);
}

/**
 * Días enteros entre dos fechas 'YYYY-MM-DD' (hasta − desde). Es una diferencia
 * de CALENDARIO pura: ambas se anclan a medianoche UTC solo para restar, así que
 * no hay huso ni DST en juego (no es "ahora en UTC"). `diasEntreFechas(d,d)` = 0.
 */
export function diasEntreFechas(desde: string, hasta: string): number {
  const [ay, am, ad] = desde.split('-').map(Number);
  const [by, bm, bd] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
