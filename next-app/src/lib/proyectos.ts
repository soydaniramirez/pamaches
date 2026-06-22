import type { Proyecto } from '@/lib/types';
import { hoyEnMexico, diasEntreFechas } from '@/lib/fechas';

/**
 * Paleta de colores preset para viajes/proyectos — tonos suaves de la identidad
 * de la app (rosa/cielo/crema/coral/menta/lila), legibles con texto tinta.
 * NO es un picker libre: el usuario elige de estos.
 */
export const PALETA_PROYECTO = [
  '#FFD9E8', // rosa-soft
  '#D9E9F2', // cielo-soft
  '#F5E6E6', // crema-deep
  '#FBD8C2', // durazno
  '#D8EFD8', // menta
  '#E8DBF0', // lila
];

/** Rejilla curada de emojis de viaje/proyecto (el modal también permite escribir uno). */
export const EMOJIS_VIAJE = [
  '✈️', '🏖️', '🏔️', '🗺️', '🚗', '🏕️', '🌴', '🗼',
  '🎒', '🚢', '🏝️', '🎡', '🍷', '📸', '🌋', '🎢',
  '🏰', '⛺', '🚆', '🛶', '🎿', '🏟️', '📁', '🎉',
];

/** Emoji a mostrar: el del proyecto, o un default según el tipo. */
export function emojiProyecto(p: Pick<Proyecto, 'emoji' | 'tipo'>): string {
  const e = p.emoji?.trim();
  if (e) return e;
  return p.tipo === 'viaje' ? '✈️' : '📁';
}

/** Color a usar: el del proyecto, o el rosa suave por defecto. */
export function colorProyecto(p: Pick<Proyecto, 'color'>): string {
  return p.color || '#FFD9E8';
}

/**
 * ¿El proyecto está ACTIVO hoy (en hora de México)? Activo = no archivado, con
 * ambas fechas, y hoy entre fecha_inicio y fecha_fin (inclusive). Los proyectos
 * sin fechas NUNCA están activos. Comparación de strings 'YYYY-MM-DD' (ISO →
 * lexicográfica == cronológica), con "hoy" en zona de la pareja, no UTC.
 */
export function esViajeActivo(p: Proyecto, hoy: string = hoyEnMexico()): boolean {
  if (p.archivado || !p.fecha_inicio || !p.fecha_fin) return false;
  return p.fecha_inicio <= hoy && hoy <= p.fecha_fin;
}

/**
 * ¿El viaje debe mostrarse en "modo viaje" (tarjeta en el inicio + realce)?
 * = no archivado Y (destacado manual O activo por fechas). El destacado es un
 * override para que aparezca aunque aún no empiece (gastos de reservas antes).
 */
export function enModoViaje(p: Proyecto, hoy: string = hoyEnMexico()): boolean {
  if (p.archivado) return false;
  return p.destacado || esViajeActivo(p, hoy);
}

/**
 * Estado del viaje según el momento (en hora de México):
 * - 'sinfechas': sin fecha_inicio/fecha_fin → solo nombre + gastado/presupuesto.
 * - 'antes': hoy < fecha_inicio → cuenta regresiva (faltan N días).
 * - 'durante': fecha_inicio ≤ hoy ≤ fecha_fin → día X de Y.
 * - 'despues': hoy > fecha_fin → viaje terminado.
 */
export type EstadoViaje =
  | { fase: 'sinfechas' }
  | { fase: 'antes'; faltan: number }
  | { fase: 'durante'; x: number; y: number }
  | { fase: 'despues' };

export function estadoViaje(p: Proyecto, hoy: string = hoyEnMexico()): EstadoViaje {
  if (!p.fecha_inicio || !p.fecha_fin) return { fase: 'sinfechas' };
  if (hoy < p.fecha_inicio) return { fase: 'antes', faltan: diasEntreFechas(hoy, p.fecha_inicio) };
  if (hoy > p.fecha_fin) return { fase: 'despues' };
  const y = diasEntreFechas(p.fecha_inicio, p.fecha_fin) + 1;
  let x = diasEntreFechas(p.fecha_inicio, hoy) + 1;
  if (x < 1) x = 1;
  if (x > y) x = y;
  return { fase: 'durante', x, y };
}

/**
 * El viaje a mostrar en el inicio si varios califican (destacados o activos).
 * Orden: por fase (durante > antes > sin fechas > después) y dentro de cada fase:
 * durante = el que termina más pronto; antes = el que empieza más pronto; después =
 * el que terminó más reciente; sin fechas = el más nuevo. null si ninguno califica.
 */
export function viajeActivo(proyectos: Proyecto[], hoy: string = hoyEnMexico()): Proyecto | null {
  const candidatos = proyectos.filter((p) => enModoViaje(p, hoy));
  if (candidatos.length === 0) return null;
  const rankFase = (p: Proyecto): number => {
    const e = estadoViaje(p, hoy);
    return e.fase === 'durante' ? 0 : e.fase === 'antes' ? 1 : e.fase === 'sinfechas' ? 2 : 3;
  };
  candidatos.sort((a, b) => {
    const ra = rankFase(a);
    const rb = rankFase(b);
    if (ra !== rb) return ra - rb;
    const ea = estadoViaje(a, hoy);
    if (ea.fase === 'durante') return (a.fecha_fin! < b.fecha_fin! ? -1 : a.fecha_fin! > b.fecha_fin! ? 1 : 0); // termina antes
    if (ea.fase === 'antes') return (a.fecha_inicio! < b.fecha_inicio! ? -1 : a.fecha_inicio! > b.fecha_inicio! ? 1 : 0); // empieza antes
    if (ea.fase === 'despues') return (a.fecha_fin! > b.fecha_fin! ? -1 : a.fecha_fin! < b.fecha_fin! ? 1 : 0); // terminó más reciente
    return (b.creado ?? '') < (a.creado ?? '') ? -1 : 1; // sin fechas: más nuevo
  });
  return candidatos[0];
}

/**
 * "Día X de Y" del viaje (1-indexado, inclusivo). Día 1 = fecha_inicio, día Y =
 * fecha_fin. X se acota a [1, Y]. null si no tiene ambas fechas. Calculado en
 * hora de México (el "hoy" entra ya como string de México).
 */
export function diaXdeY(p: Proyecto, hoy: string = hoyEnMexico()): { x: number; y: number } | null {
  if (!p.fecha_inicio || !p.fecha_fin) return null;
  const y = diasEntreFechas(p.fecha_inicio, p.fecha_fin) + 1;
  let x = diasEntreFechas(p.fecha_inicio, hoy) + 1;
  if (x < 1) x = 1;
  if (x > y) x = y;
  return { x, y };
}
