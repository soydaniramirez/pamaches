/** Helpers y constantes de "tareas de la casa" (tareas / menú / súper). Portados 1:1. */

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Lunes (00:00 local) de la semana actual. (porta inicioSemana) */
export function inicioSemana(): Date {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

/**
 * Lunes (ISO YYYY-MM-DD) de la semana con offset (0 = esta, +1 = próxima…).
 * NOTA (parqueado, 1:1): usa toISOString() => formato UTC, mismo patrón que
 * el semáforo de raros / la rotación de la cápsula.
 */
export function lunesISO(offset = 0): string {
  const l = inicioSemana();
  l.setDate(l.getDate() + offset * 7);
  return l.toISOString().slice(0, 10);
}

/** Etiqueta de la semana del menú (ej. "25 — 31 may"). (porta etiquetaSemanaMenu) */
export function etiquetaSemana(offset: number): string {
  const lunes = inicioSemana();
  lunes.setDate(lunes.getDate() + offset * 7);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  const dl = lunes.getDate();
  const dd = domingo.getDate();
  const ml = MESES_CORTOS[lunes.getMonth()];
  const md = MESES_CORTOS[domingo.getMonth()];
  return ml === md ? `${dl} — ${dd} ${md}` : `${dl} ${ml} — ${dd} ${md}`;
}

/** Sugerencias de tareas por grupo. VERBATIM del index.html. */
export const SUGERENCIAS_TAREAS: Record<string, string[]> = {
  cocina: ['lavar los trastes', 'sacar la basura', 'limpiar la estufa', 'ordenar la alacena', 'sacar el reciclaje'],
  limpieza: ['trapear', 'barrer', 'sacudir', 'limpiar el baño', 'cambiar las sábanas', 'aspirar'],
  ropa: ['lavar ropa', 'doblar ropa', 'tender la cama', 'llevar a la tintorería', 'recoger de la tintorería'],
  compras: ['hacer súper', 'comprar despensa', 'comprar cosas del baño', 'pagar servicios', 'recoger paquetes'],
  'mascotas y plantas': ['regar las plantas', 'dar de comer a la mascota', 'pasear a la mascota', 'limpiar el arenero'],
  casa: ['sacar dinero del cajero', 'llevar el coche a lavar', 'cargar gasolina', 'revisar pendientes del depa'],
};

export interface MenuBloque {
  id: string;
  nombre: string;
  icon: string;
}

/** Bloques de preparación del menú. VERBATIM del index.html (íconos incluidos). */
export const MENU_BLOQUES: MenuBloque[] = [
  {
    id: 'desayuno',
    nombre: 'desayunos de la semana',
    icon: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="22" r="11"/><path d="M 20 14 Q 17 10 20 6 Q 23 10 20 14"/><path d="M 14 22 Q 20 27 26 22"/></g></svg>`,
  },
  {
    id: 'comida',
    nombre: 'comidas de la semana',
    icon: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 11 8 L 11 20 Q 11 23 14 23 L 14 32 M 11 14 L 17 14 M 14 8 L 14 20"/><path d="M 27 8 Q 23 12 23 18 Q 23 22 27 22 L 27 32"/></g></svg>`,
  },
  {
    id: 'aditamento',
    nombre: 'aditamentos',
    icon: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 8 18 Q 20 8 32 18 Q 20 14 8 18 Z"/><path d="M 8 18 Q 20 30 32 18"/></g></svg>`,
  },
  {
    id: 'tentempie',
    nombre: 'tentempié',
    icon: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 14 10 L 26 10 L 30 16 L 20 32 L 10 16 Z"/><path d="M 10 16 L 30 16 M 17 10 L 14 16 M 23 10 L 26 16"/></g></svg>`,
  },
  {
    id: 'cena',
    nombre: 'cenas de la semana',
    icon: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 12 28 Q 12 16 20 16 Q 28 16 28 28 Z"/><path d="M 8 28 L 32 28"/><path d="M 20 16 L 20 11 M 17 8 Q 20 6 23 8"/></g></svg>`,
  },
];
