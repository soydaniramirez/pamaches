import type { AgendaEvent } from '@/lib/types';

export interface AgendaCat {
  id: string;
  label: string;
  svg: string;
}

/** Categorías de agenda (íconos VERBATIM del index.html). */
export const AGENDA_CATS: AgendaCat[] = [
  { id: 'concierto', label: 'concierto', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M 16 30 L 16 12 L 26 9 L 26 27"/><ellipse cx="14" cy="30" rx="3" ry="2.5"/><ellipse cx="24" cy="27" rx="3" ry="2.5"/></g></svg>` },
  { id: 'obra', label: 'obra', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M 12 8 Q 13 18 16 26 Q 18 30 20 30 Q 22 30 24 26 Q 27 18 28 8 Z"/><circle cx="17" cy="15" r="1.2" fill="#BB1F31"/><circle cx="23" cy="15" r="1.2" fill="#BB1F31"/><path d="M 17 21 Q 20 24 23 21"/></g></svg>` },
  { id: 'viaje', label: 'viaje', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M 6 22 L 18 18 L 22 10 L 26 10 L 24 18 L 32 16 L 36 18 L 34 22 L 8 28 Z"/></g></svg>` },
  { id: 'deporte', label: 'deporte', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="12"/><path d="M 20 8 L 20 32 M 8 20 L 32 20 M 12 12 L 28 28 M 12 28 L 28 12"/></g></svg>` },
  { id: 'festival', label: 'festival', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M 8 30 L 20 8 L 32 30 Z"/><path d="M 12 24 L 28 24 M 16 18 L 24 18"/><circle cx="20" cy="13" r="1.5" fill="#BB1F31"/></g></svg>` },
  { id: 'familia', label: 'familia', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="14" r="4.5"/><circle cx="26" cy="14" r="4.5"/><path d="M 6 32 C 6 24 10 22 14 22 C 18 22 22 24 22 32"/><path d="M 18 32 C 18 24 22 22 26 22 C 30 22 34 24 34 32"/></g></svg>` },
  { id: 'otro', label: 'otro', svg: `<svg width="22" height="22" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="11" width="24" height="22" rx="2.5"/><path d="M 8 17 L 32 17"/><path d="M 14 7 L 14 13 M 26 7 L 26 13"/><circle cx="14" cy="23" r="1.5" fill="#BB1F31"/><circle cx="20" cy="23" r="1.5" fill="#BB1F31"/><circle cx="26" cy="23" r="1.5" fill="#BB1F31"/></g></svg>` },
];

export const agendaCatById = (id: string | null): AgendaCat =>
  AGENDA_CATS.find((c) => c.id === id) ?? AGENDA_CATS[AGENDA_CATS.length - 1];

/**
 * Días que faltan para un evento de agenda.
 * Usa medianoche LOCAL para "hoy" y la fecha del evento, así que es correcto
 * en UTC-6 (no es el bug de fechas — ver PLAN.md, inventario UTC).
 */
export function diasParaEvento(ev: AgendaEvent): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(ev.fecha + 'T00:00:00');
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}
