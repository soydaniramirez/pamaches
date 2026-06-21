/**
 * Helpers puros portados 1:1 del index.html original.
 * Son funciones sin estado, fáciles de testear y reutilizar.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fmtFecha(d: Date): string {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function nombreMes(d: Date): string {
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDinero(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-MX');
}

export function tiempoRelativo(iso: string): string {
  const ahora = new Date();
  const fecha = new Date(iso);
  const diffMin = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return 'justo ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffH < 24) return `hace ${diffH}h`;
  if (diffD === 1) return 'ayer';
  if (diffD < 7) return `hace ${diffD} días`;
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

export function tiempoJuntos(aniversario: string | null): string {
  if (!aniversario) return 'juntos';
  const ini = new Date(aniversario + 'T00:00:00');
  const hoy = new Date();
  let meses = (hoy.getFullYear() - ini.getFullYear()) * 12 + (hoy.getMonth() - ini.getMonth());
  if (hoy.getDate() < ini.getDate()) meses--;
  const anios = Math.floor(meses / 12);
  const m = meses % 12;
  let txt = '';
  if (anios > 0) txt += anios + (anios === 1 ? ' año' : ' años');
  if (anios > 0 && m > 0) txt += ', ';
  if (m > 0) txt += m + (m === 1 ? ' mes' : ' meses');
  if (!txt) txt = 'recién empezando';
  return txt + ' juntos';
}

export function fechaCorta(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

/**
 * Fecha de la cuota n de una compra a meses (porta calcularFechaCuota del HTML).
 * La primera cuota cae en el corte SIGUIENTE a la compra.
 */
export function calcularFechaCuota(fechaCompra: Date, diaCorte: number, n: number): Date {
  let primerMes = fechaCompra.getMonth();
  let primerAnio = fechaCompra.getFullYear();
  if (diaCorte <= fechaCompra.getDate()) {
    primerMes++;
    if (primerMes > 11) {
      primerMes = 0;
      primerAnio++;
    }
  }
  let mesCuota = primerMes + (n - 1);
  const anioCuota = primerAnio + Math.floor(mesCuota / 12);
  mesCuota = ((mesCuota % 12) + 12) % 12;
  const ultimoDia = new Date(anioCuota, mesCuota + 1, 0).getDate();
  const diaAUsar = Math.min(diaCorte, ultimoDia);
  return new Date(anioCuota, mesCuota, diaAUsar);
}

/** Días que faltan para la próxima ocurrencia de una fecha (negativo si ya pasó). */
export function diasParaFecha(f: { fecha: string; se_repite: boolean }): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fch = new Date(f.fecha + 'T00:00:00');
  if (f.se_repite) {
    let prox = new Date(hoy.getFullYear(), fch.getMonth(), fch.getDate());
    if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, fch.getMonth(), fch.getDate());
    return Math.round((prox.getTime() - hoy.getTime()) / 86400000);
  }
  return Math.round((fch.getTime() - hoy.getTime()) / 86400000);
}
