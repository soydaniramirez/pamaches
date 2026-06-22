import type { SupabaseClient } from '@supabase/supabase-js';

export interface Nivel {
  min: number;
  emoji: string;
  nombre: string;
}

/** Niveles de conexión (gamificación). Umbrales y textos VERBATIM del index.html. */
export const NIVELES_CONEXION: Nivel[] = [
  { min: 0, emoji: '🌱', nombre: 'apenas nos conocemos' },
  { min: 6, emoji: '🌿', nombre: 'nos vamos abriendo' },
  { min: 16, emoji: '🌷', nombre: 'cada vez más cerca' },
  { min: 31, emoji: '🌳', nombre: 'nos conocemos hondo' },
  { min: 51, emoji: '✨', nombre: 'almas en sintonía' },
];

/** Categorías para crear una pregunta propia. VERBATIM del index.html. */
export const CATEGORIAS_PREGUNTA = [
  'amor',
  'miedos',
  'futuro',
  'familia',
  'dinero',
  'sueños',
  'intimidad',
  'el día a día',
] as const;

/**
 * Rotación semanal de la pregunta de la cápsula. ÚNICA fuente de verdad —
 * portada 1:1 de index.html `rotarPreguntaSiToca`. La usan tanto el home como
 * la pantalla de cápsula (no duplicar esta lógica en otro lado).
 *
 * Si la pregunta `es_actual` ya es del lunes de esta semana, no hace nada.
 * Si no, baja la actual y sube una nueva al azar de las `usada=false`
 * (marcándola es_actual=true, usada=true, semana=lunes). Devuelve true si rotó.
 *
 * NOTA (parqueado, NO se cambia — es parte del 1:1): `lunesStr` se calcula con
 * `toISOString()` => formato UTC, igual patrón que el semáforo de "raros".
 */
export async function rotarPreguntaSiToca(supabase: SupabaseClient): Promise<boolean> {
  // lunes de esta semana
  const hoy = new Date();
  const diaSem = hoy.getDay();
  const diff = diaSem === 0 ? -6 : 1 - diaSem;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  const lunesStr = lunes.toISOString().slice(0, 10);

  const { data: actual } = await supabase
    .from('questions')
    .select('*')
    .eq('es_actual', true)
    .maybeSingle();
  // si la actual ya es de este lunes, no hacer nada
  if (actual && (actual as { semana?: string }).semana === lunesStr) return false;

  // buscar una nueva pregunta no usada
  const { data: disponibles } = await supabase.from('questions').select('id').eq('usada', false);
  if (!disponibles || disponibles.length === 0) {
    // si ya se usaron todas, no hacer nada — siguen con la actual
    return false;
  }
  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)] as { id: string };

  // bajar la actual y subir la nueva
  if (actual) {
    await supabase.from('questions').update({ es_actual: false }).eq('id', (actual as { id: string }).id);
  }
  await supabase
    .from('questions')
    .update({ es_actual: true, usada: true, semana: lunesStr })
    .eq('id', elegida.id);
  return true;
}
