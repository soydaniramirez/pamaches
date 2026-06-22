export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda: {
        Row: {
          autor: string
          boleto_info: string | null
          categoria: string
          costo: number | null
          couple_id: string
          creado: string | null
          fecha: string
          hora: string | null
          id: string
          lugar: string | null
          nota: string | null
          titulo: string
        }
        Insert: {
          autor: string
          boleto_info?: string | null
          categoria: string
          costo?: number | null
          couple_id: string
          creado?: string | null
          fecha: string
          hora?: string | null
          id?: string
          lugar?: string | null
          nota?: string | null
          titulo: string
        }
        Update: {
          autor?: string
          boleto_info?: string | null
          categoria?: string
          costo?: number | null
          couple_id?: string
          creado?: string | null
          fecha?: string
          hora?: string | null
          id?: string
          lugar?: string | null
          nota?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          id: string
          question_id: string
          tarde: boolean
          texto: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
          question_id: string
          tarde?: boolean
          texto: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
          question_id?: string
          tarde?: boolean
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      aporte_config: {
        Row: {
          couple_id: string
          creado: string | null
          cupo: number | null
          id: string
        }
        Insert: {
          couple_id: string
          creado?: string | null
          cupo?: number | null
          id?: string
        }
        Update: {
          couple_id?: string
          creado?: string | null
          cupo?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aporte_config_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          couple_id: string
          creado: string | null
          id: string
          nombre: string
          orden: number | null
        }
        Insert: {
          couple_id: string
          creado?: string | null
          id?: string
          nombre: string
          orden?: number | null
        }
        Update: {
          couple_id?: string
          creado?: string | null
          id?: string
          nombre?: string
          orden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_meses: {
        Row: {
          autor: string
          categoria: string | null
          concepto: string
          couple_id: string
          creado: string | null
          dia_corte: number
          fecha_compra: string
          id: string
          monto_cuota: number
          monto_total: number
          num_cuotas: number
          split: string
          subcategoria_id: string | null
          tipo: string
        }
        Insert: {
          autor: string
          categoria?: string | null
          concepto: string
          couple_id: string
          creado?: string | null
          dia_corte: number
          fecha_compra: string
          id?: string
          monto_cuota: number
          monto_total: number
          num_cuotas: number
          split: string
          subcategoria_id?: string | null
          tipo: string
        }
        Update: {
          autor?: string
          categoria?: string | null
          concepto?: string
          couple_id?: string
          creado?: string | null
          dia_corte?: number
          fecha_compra?: string
          id?: string
          monto_cuota?: number
          monto_total?: number
          num_cuotas?: number
          split?: string
          subcategoria_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_meses_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_meses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_meses_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          aniversario: string | null
          creado: string | null
          id: string
          nombre: string | null
        }
        Insert: {
          aniversario?: string | null
          creado?: string | null
          id?: string
          nombre?: string | null
        }
        Update: {
          aniversario?: string | null
          creado?: string | null
          id?: string
          nombre?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          autor: string
          categoria: string | null
          compra_meses_id: string | null
          concepto: string
          couple_id: string
          creado: string | null
          cuota_numero: number | null
          cuota_total: number | null
          fecha: string | null
          id: string
          meta_id: string | null
          monto: number
          proyecto_id: string | null
          split: string | null
          subcategoria_id: string | null
          tipo: string | null
        }
        Insert: {
          autor: string
          categoria?: string | null
          compra_meses_id?: string | null
          concepto: string
          couple_id: string
          creado?: string | null
          cuota_numero?: number | null
          cuota_total?: number | null
          fecha?: string | null
          id?: string
          meta_id?: string | null
          monto: number
          proyecto_id?: string | null
          split?: string | null
          subcategoria_id?: string | null
          tipo?: string | null
        }
        Update: {
          autor?: string
          categoria?: string | null
          compra_meses_id?: string | null
          concepto?: string
          couple_id?: string
          creado?: string | null
          cuota_numero?: number | null
          cuota_total?: number | null
          fecha?: string | null
          id?: string
          meta_id?: string | null
          monto?: number
          proyecto_id?: string | null
          split?: string | null
          subcategoria_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_compra_meses_id_fkey"
            columns: ["compra_meses_id"]
            isOneToOne: false
            referencedRelation: "compras_meses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "future"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_subcategoria_id_fkey"
            columns: ["subcategoria_id"]
            isOneToOne: false
            referencedRelation: "subcategorias"
            referencedColumns: ["id"]
          },
        ]
      }
      fechas: {
        Row: {
          couple_id: string
          creado: string | null
          fecha: string
          fija: boolean | null
          id: string
          se_repite: boolean | null
          titulo: string
        }
        Insert: {
          couple_id: string
          creado?: string | null
          fecha: string
          fija?: boolean | null
          id?: string
          se_repite?: boolean | null
          titulo: string
        }
        Update: {
          couple_id?: string
          creado?: string | null
          fecha?: string
          fija?: boolean | null
          id?: string
          se_repite?: boolean | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fechas_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      future: {
        Row: {
          couple_id: string
          creado: string | null
          cuando: string | null
          id: string
          logrado: boolean | null
          meta_monto: number | null
          nota: string | null
          orden: number | null
          tiene_meta: boolean | null
          titulo: string
        }
        Insert: {
          couple_id: string
          creado?: string | null
          cuando?: string | null
          id?: string
          logrado?: boolean | null
          meta_monto?: number | null
          nota?: string | null
          orden?: number | null
          tiene_meta?: boolean | null
          titulo: string
        }
        Update: {
          couple_id?: string
          creado?: string | null
          cuando?: string | null
          id?: string
          logrado?: boolean | null
          meta_monto?: number | null
          nota?: string | null
          orden?: number | null
          tiene_meta?: boolean | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "future_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          bloque: string | null
          couple_id: string
          creado: string | null
          dia: string | null
          id: string
          platillo: string
          propuesto_por: string | null
          semana: string | null
          tipo: string | null
        }
        Insert: {
          bloque?: string | null
          couple_id: string
          creado?: string | null
          dia?: string | null
          id?: string
          platillo: string
          propuesto_por?: string | null
          semana?: string | null
          tipo?: string | null
        }
        Update: {
          bloque?: string | null
          couple_id?: string
          creado?: string | null
          dia?: string | null
          id?: string
          platillo?: string
          propuesto_por?: string | null
          semana?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meals_propuesto_por_fkey"
            columns: ["propuesto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_abonos: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          future_id: string
          id: string
          monto: number
          nota: string | null
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          future_id: string
          id?: string
          monto: number
          nota?: string | null
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          future_id?: string
          id?: string
          monto?: number
          nota?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_abonos_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_abonos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_abonos_future_id_fkey"
            columns: ["future_id"]
            isOneToOne: false
            referencedRelation: "future"
            referencedColumns: ["id"]
          },
        ]
      }
      moods: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          estado: string | null
          id: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          estado?: string | null
          id?: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          estado?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moods_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moods_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      nonnegotiables: {
        Row: {
          autor: string | null
          couple_id: string
          creado: string | null
          id: string
          texto: string
          tipo: string | null
        }
        Insert: {
          autor?: string | null
          couple_id: string
          creado?: string | null
          id?: string
          texto: string
          tipo?: string | null
        }
        Update: {
          autor?: string | null
          couple_id?: string
          creado?: string | null
          id?: string
          texto?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nonnegotiables_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      notita_reacciones: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          id: string
          notita_id: string
          tipo: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
          notita_id: string
          tipo: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
          notita_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notita_reacciones_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notita_reacciones_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notita_reacciones_notita_id_fkey"
            columns: ["notita_id"]
            isOneToOne: false
            referencedRelation: "notitas"
            referencedColumns: ["id"]
          },
        ]
      }
      notitas: {
        Row: {
          archivada: boolean | null
          autor: string
          couple_id: string
          creado: string | null
          id: string
          leida: boolean | null
          texto: string
        }
        Insert: {
          archivada?: boolean | null
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
          leida?: boolean | null
          texto: string
        }
        Update: {
          archivada?: boolean | null
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
          leida?: boolean | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "notitas_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notitas_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      novedades: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          destino: string | null
          id: string
          para: string
          texto: string
          tipo: string
          vista: boolean | null
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          destino?: string | null
          id?: string
          para: string
          texto: string
          tipo: string
          vista?: boolean | null
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          destino?: string | null
          id?: string
          para?: string
          texto?: string
          tipo?: string
          vista?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "novedades_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novedades_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "novedades_para_fkey"
            columns: ["para"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          couple_id: string
          creado: string | null
          fecha: string | null
          hecho: boolean | null
          id: string
          mood: string | null
          nota: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          couple_id: string
          creado?: string | null
          fecha?: string | null
          hecho?: boolean | null
          id?: string
          mood?: string | null
          nota?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          couple_id?: string
          creado?: string | null
          fecha?: string | null
          hecho?: boolean | null
          id?: string
          mood?: string | null
          nota?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string | null
          couple_id: string | null
          creado: string | null
          cumple: string | null
          id: string
          nombre: string
          rol: string | null
        }
        Insert: {
          color?: string | null
          couple_id?: string | null
          creado?: string | null
          cumple?: string | null
          id: string
          nombre: string
          rol?: string | null
        }
        Update: {
          color?: string | null
          couple_id?: string | null
          creado?: string | null
          cumple?: string | null
          id?: string
          nombre?: string
          rol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          archivado: boolean
          color: string | null
          couple_id: string
          creado: string | null
          emoji: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          presupuesto: number | null
          tipo: string
        }
        Insert: {
          archivado?: boolean
          color?: string | null
          couple_id: string
          creado?: string | null
          emoji?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          presupuesto?: number | null
          tipo?: string
        }
        Update: {
          archivado?: boolean
          color?: string | null
          couple_id?: string
          creado?: string | null
          emoji?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          presupuesto?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          abierta: boolean
          categoria: string | null
          couple_id: string
          creado: string | null
          es_actual: boolean | null
          id: string
          origen: string | null
          semana: string | null
          texto: string
          usada: boolean | null
        }
        Insert: {
          abierta?: boolean
          categoria?: string | null
          couple_id: string
          creado?: string | null
          es_actual?: boolean | null
          id?: string
          origen?: string | null
          semana?: string | null
          texto: string
          usada?: boolean | null
        }
        Update: {
          abierta?: boolean
          categoria?: string | null
          couple_id?: string
          creado?: string | null
          es_actual?: boolean | null
          id?: string
          origen?: string | null
          semana?: string | null
          texto?: string
          usada?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          id: string
          monto: number | null
          nota: string | null
          quien_pago: string | null
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
          monto?: number | null
          nota?: string | null
          quien_pago?: string | null
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
          monto?: number | null
          nota?: string | null
          quien_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      spicy_cartas: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          id: string
          texto: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
          texto: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "spicy_cartas_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spicy_cartas_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      spicy_deseos: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          cumplido: boolean | null
          id: string
          texto: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          cumplido?: boolean | null
          id?: string
          texto: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          cumplido?: boolean | null
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "spicy_deseos_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spicy_deseos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      spicy_retos: {
        Row: {
          couple_id: string
          creado: string | null
          id: string
          origen: string | null
          texto: string
        }
        Insert: {
          couple_id: string
          creado?: string | null
          id?: string
          origen?: string | null
          texto: string
        }
        Update: {
          couple_id?: string
          creado?: string | null
          id?: string
          origen?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "spicy_retos_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      spicy_termometro: {
        Row: {
          autor: string
          couple_id: string
          creado: string | null
          id: string
        }
        Insert: {
          autor: string
          couple_id: string
          creado?: string | null
          id?: string
        }
        Update: {
          autor?: string
          couple_id?: string
          creado?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spicy_termometro_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spicy_termometro_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategorias: {
        Row: {
          categoria_id: string
          couple_id: string
          creado: string | null
          id: string
          nombre: string
        }
        Insert: {
          categoria_id: string
          couple_id: string
          creado?: string | null
          id?: string
          nombre: string
        }
        Update: {
          categoria_id?: string
          couple_id?: string
          creado?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategorias_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      super: {
        Row: {
          autor: string
          comprado: boolean | null
          couple_id: string
          creado: string | null
          id: string
          texto: string
        }
        Insert: {
          autor: string
          comprado?: boolean | null
          couple_id: string
          creado?: string | null
          id?: string
          texto: string
        }
        Update: {
          autor?: string
          comprado?: boolean | null
          couple_id?: string
          creado?: string | null
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          asignado: string | null
          couple_id: string
          creado: string | null
          hecha: boolean | null
          id: string
          recurrente: boolean | null
          rota: boolean | null
          semana: string | null
          titulo: string
          ultimo_turno: string | null
        }
        Insert: {
          asignado?: string | null
          couple_id: string
          creado?: string | null
          hecha?: boolean | null
          id?: string
          recurrente?: boolean | null
          rota?: boolean | null
          semana?: string | null
          titulo: string
          ultimo_turno?: string | null
        }
        Update: {
          asignado?: string | null
          couple_id?: string
          creado?: string | null
          hecha?: boolean | null
          id?: string
          recurrente?: boolean | null
          rota?: boolean | null
          semana?: string | null
          titulo?: string
          ultimo_turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_asignado_fkey"
            columns: ["asignado"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ultimo_turno_fkey"
            columns: ["ultimo_turno"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timecapsule: {
        Row: {
          abre_en: string | null
          autor: string
          contenido: string | null
          couple_id: string
          creado: string | null
          evento: string | null
          id: string
          sellada: boolean | null
          tipo_apertura: string | null
          titulo: string
        }
        Insert: {
          abre_en?: string | null
          autor: string
          contenido?: string | null
          couple_id: string
          creado?: string | null
          evento?: string | null
          id?: string
          sellada?: boolean | null
          tipo_apertura?: string | null
          titulo: string
        }
        Update: {
          abre_en?: string | null
          autor?: string
          contenido?: string | null
          couple_id?: string
          creado?: string | null
          evento?: string | null
          id?: string
          sellada?: boolean | null
          tipo_apertura?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "timecapsule_autor_fkey"
            columns: ["autor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timecapsule_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      couple_has_members: { Args: { cid: string }; Returns: boolean }
      my_couple_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
