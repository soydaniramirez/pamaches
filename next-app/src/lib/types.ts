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
  color?: string | null;
  cumple?: string | null;
  avatar?: string | null;
}

export interface Couple {
  id: string;
  nombre?: string | null;
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

export interface Novedad {
  id: string;
  couple_id: string;
  autor: string;
  para: string;
  tipo: string;
  texto: string;
  destino: string | null;
  vista: boolean;
  creado: string;
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
  monto: number | string;
  categoria: string | null;
  subcategoria_id: string | null;
  tipo: string;
  split: string | null;
  fecha: string;
  meta_id: string | null;
  proyecto_id?: string | null;
  compra_meses_id?: string | null;
  cuota_numero?: number | null;
  cuota_total?: number | null;
}

export interface Proyecto {
  id: string;
  couple_id: string;
  nombre: string;
  tipo: 'viaje' | 'proyecto';
  presupuesto: number | string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  archivado: boolean;
  emoji: string | null;
  color: string | null;
  destacado: boolean;
  creado?: string;
}

export interface CompraMeses {
  id: string;
  couple_id: string;
  autor: string;
  concepto: string;
  monto_total: number | string;
  num_cuotas: number;
  monto_cuota: number | string;
  dia_corte: number;
  categoria: string | null;
  subcategoria_id: string | null;
  tipo: string;
  split: string;
  fecha_compra: string;
  creado?: string;
}

export interface Settlement {
  id: string;
  couple_id: string;
  autor: string;
  monto: number | string;
  quien_pago: string | null;
  nota: string | null;
  creado: string;
}

export interface Task {
  id: string;
  couple_id: string;
  titulo: string;
  asignado: string | null;
  hecha: boolean;
  semana: string | null;
  recurrente: boolean;
  rota: boolean;
  ultimo_turno: string | null;
}

export interface Meal {
  id: string;
  couple_id: string;
  bloque: string | null;
  platillo: string;
  propuesto_por: string | null;
  semana: string | null;
}

export interface SuperItem {
  id: string;
  couple_id: string;
  texto: string;
  comprado: boolean;
  autor: string;
}

export interface AgendaEvent {
  id: string;
  couple_id: string;
  titulo: string;
  categoria: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  boleto_info: string | null;
  costo: number | string | null;
  nota: string | null;
  autor: string;
}

export interface Plan {
  id: string;
  couple_id: string;
  titulo: string;
  tipo: string | null;
  mood: string | null;
  fecha: string | null;
  hecho: boolean;
  nota: string | null;
  creado: string;
}

export interface Nonego {
  id: string;
  couple_id: string;
  autor: 'los_dos' | 'dani' | 'alfredo' | string;
  texto: string;
  creado?: string;
}

export interface TimeCapsule {
  id: string;
  couple_id: string;
  autor: string;
  titulo: string;
  contenido: string | null;
  tipo_apertura: 'fecha' | 'evento' | string | null;
  abre_en: string | null;
  evento: string | null;
  sellada: boolean;
  creado?: string;
}

export interface FutureMeta {
  id: string;
  couple_id: string;
  titulo: string;
  cuando?: string | null;
  nota?: string | null;
  logrado?: boolean;
  orden?: number;
  tiene_meta?: boolean;
  meta_monto?: number | string | null;
}

export interface MetaAbono {
  id: string;
  couple_id: string;
  future_id: string;
  autor: string;
  monto: number | string;
  nota: string | null;
  creado: string;
}

export interface Fecha {
  id: string;
  couple_id: string;
  titulo: string;
  fecha: string;
  se_repite: boolean;
  fija?: boolean;
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
