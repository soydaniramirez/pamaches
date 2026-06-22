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
 * El viaje activo "principal": si hay varios activos a la vez, el que termina
 * más pronto (fecha_fin asc; desempate por fecha_inicio asc). null si ninguno.
 */
export function viajeActivo(proyectos: Proyecto[], hoy: string = hoyEnMexico()): Proyecto | null {
  const activos = proyectos.filter((p) => esViajeActivo(p, hoy));
  if (activos.length === 0) return null;
  activos.sort((a, b) => {
    if (a.fecha_fin !== b.fecha_fin) return a.fecha_fin! < b.fecha_fin! ? -1 : 1;
    return (a.fecha_inicio ?? '') < (b.fecha_inicio ?? '') ? -1 : 1;
  });
  return activos[0];
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
