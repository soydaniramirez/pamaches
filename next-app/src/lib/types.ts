/**
 * Tipos de dominio de pamaches.
 *
 * Estos tipos modelan las tablas principales de Supabase que ya existen en la
 * app original. Para regenerar tipos exactos desde la base de datos puedes usar:
 *
 *   supabase gen types typescript --project-id <ref> > src/lib/types.ts
 *
 * Mientras tanto, definimos aquí los modelos que la app usa hoy.
 */

export type Rol = 'dani' | 'alfredo';

export interface Profile {
  id: string;
  couple_id: string;
  nombre: string;
  rol: Rol | null;
  avatar?: string | null;
}

export interface Couple {
  id: string;
  aniversario: string | null;
}

export interface Notita {
  id: string;
  couple_id: string;
  autor: string;
  texto: string;
  creado: string;
  archivada: boolean;
}

export interface NotitaReaccion {
  id: string;
  notita_id: string;
  autor: string;
  tipo: string;
}

export interface Categoria {
  id: string | null;
  nombre: string;
  orden?: number;
}

export interface Subcategoria {
  id: string;
  categoria_id: string;
  nombre: string;
}

export interface Expense {
  id: string;
  couple_id: string;
  autor: string;
  concepto: string;
  monto: number;
  categoria: string;
  subcategoria_id: string | null;
  tipo: string;
  split: number | null;
  fecha: string;
  meta_id: string | null;
}

export interface Fecha {
  id: string;
  couple_id: string;
  titulo: string;
  fecha: string;
  se_repite: boolean;
}

export interface Question {
  id: string;
  texto: string;
  es_actual: boolean;
  usada: boolean;
  semana: string | null;
}

export interface AporteConfig {
  couple_id: string;
  cupo: number | string;
}

/**
 * Nota sobre tipado de Supabase:
 * Los clientes (lib/supabase/*) se crean sin un tipo `Database` generado, por lo
 * que las queries devuelven filas sin tipar. En cada uso casteamos al modelo de
 * dominio correspondiente (ej. `as unknown as Notita[]`). Cuando se quiera
 * type-safety completa, generar el esquema real con:
 *
 *   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * y pasar ese tipo como genérico a createBrowserClient/createServerClient.
 */
