import type { SupabaseClient } from '@supabase/supabase-js';

/** Reacciones a notitas (iconos ilustrados, portados del original). */
export interface ReaccionDef {
  id: string;
  label: string;
  svg: string;
}

export const REACCIONES: ReaccionDef[] = [
  {
    id: 'carino',
    label: 'cariño',
    svg: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M 20 33 C 20 33 7 24 7 15 C 7 10 11 8 14 8 C 17 8 20 11 20 14 C 20 11 23 8 26 8 C 29 8 33 10 33 15 C 33 24 20 33 20 33 Z" fill="#BB1F31"/></g></svg>`,
  },
  {
    id: 'risa',
    label: 'risa',
    svg: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><path d="M 14 22 Q 20 30 26 22"/><path d="M 14 17 L 18 16 M 26 17 L 22 16"/></g></svg>`,
  },
  {
    id: 'conmovida',
    label: 'me conmovió',
    svg: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><path d="M 14 17 Q 16 14 18 17"/><path d="M 22 17 Q 24 14 26 17"/><path d="M 16 25 Q 20 27 24 25"/><path d="M 14 23 Q 13 28 14 30" fill="#B7D6ED" stroke="#B7D6ED"/></g></svg>`,
  },
  {
    id: 'beso',
    label: 'beso',
    svg: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><path d="M 14 16 L 18 17 M 26 16 L 22 17"/><path d="M 16 25 Q 20 21 24 25 Q 22 28 20 28 Q 18 28 16 25 Z" fill="#BB1F31"/></g></svg>`,
  },
  {
    id: 'pamache',
    label: 'te amo pamache',
    svg: `<svg width="20" height="20" viewBox="0 0 40 40"><g fill="none" stroke="#BB1F31" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M 12 14 L 9 9 L 14 11"/><path d="M 28 14 L 31 9 L 26 11"/><ellipse cx="20" cy="22" rx="11" ry="10"/><path d="M 15 18 Q 17 16 18 18" fill="#BB1F31"/><path d="M 22 18 Q 24 16 25 18" fill="#BB1F31"/><circle cx="20" cy="24" r="1.5" fill="#BB1F31"/><path d="M 18 26 Q 20 28 22 26"/></g></svg>`,
  },
];

export function reaccionById(id: string): ReaccionDef | null {
  return REACCIONES.find((r) => r.id === id) ?? null;
}

/**
 * Crea una "novedad" dirigida al otro miembro de la pareja.
 * Equivalente a crearNovedad() del original.
 */
export async function crearNovedad(
  supabase: SupabaseClient,
  args: {
    coupleId: string;
    autor: string;
    para: string | null;
    tipo: string;
    texto: string;
    destino: string;
  },
): Promise<void> {
  if (!args.para) return;
  await supabase.from('novedades').insert({
    couple_id: args.coupleId,
    autor: args.autor,
    para: args.para,
    tipo: args.tipo,
    texto: args.texto,
    destino: args.destino,
  });
}
