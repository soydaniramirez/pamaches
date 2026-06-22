'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { tiempoRelativo } from '@/lib/helpers';
import type { Novedad } from '@/lib/types';

const NOVEDAD_EMOJI: Record<string, string> = {
  notita: '💌',
  respuesta: '📖',
  plan: '🦝',
  semaforo: '🟡',
  ganas: '🌶️',
  carta: '😏',
  fecha: '💕',
  deseo: '👀',
  tarea: '🧹',
  reaccion: '💞',
  agenda: '📅',
  gasto: '💸',
};

/** Mapea el `destino` de una novedad a su ruta de Next.js. */
function destinoToRoute(destino: string | null): string {
  switch (destino) {
    case 'notitas':
      return '/notitas';
    case 'gastos':
      return '/gastos';
    case 'perfil':
      return '/perfil';
    case 'tareas':
      return '/tareas';
    case 'agenda':
      return '/agenda';
    case 'capsula':
      return '/nosotros/capsula';
    case 'raros':
      return '/nosotros/raros';
    case 'futuro':
      return '/nosotros/futuro';
    case 'nonego':
      return '/nosotros/nonego';
    case 'capsulatiempo':
      return '/nosotros/capsulatiempo';
    case 'planes':
      return '/planes';
    case 'spicy':
    case 'spicy-termometro':
    case 'spicy-cartas':
    case 'spicy-ruleta':
    case 'spicy-deseos':
      return '/spicy';
    default:
      return '/';
  }
}

async function setAppBadge(n: number) {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if ('setAppBadge' in navigator) {
      if (n > 0) await nav.setAppBadge?.(n);
      else await nav.clearAppBadge?.();
    }
  } catch {
    // navegador sin soporte o sin permiso: se ignora
  }
}

/**
 * Campanita de novedades. Porta revisarNovedades / openNovedades /
 * limpiarNovedades / borrarNovedad / irANovedad del index.html.
 */
export default function Novedades() {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const { me, toast } = useAppData();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Novedad[] | null>(null);

  const revisar = useCallback(async () => {
    if (!me) return;
    const { count: c } = await supabase
      .from('novedades')
      .select('id', { count: 'exact', head: true })
      .eq('para', me.id)
      .eq('vista', false);
    const total = c ?? 0;
    setCount(total);
    void setAppBadge(total);
  }, [supabase, me]);

  useEffect(() => {
    void revisar();
    if (!me) return;
    const channel = supabase
      .channel('novedades-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'novedades' },
        (payload) => {
          if ((payload.new as { para?: string }).para === me.id) void revisar();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, me, revisar]);

  async function abrir() {
    if (!me) return;
    setOpen(true);
    setItems(null);
    const { data } = await supabase
      .from('novedades')
      .select('*')
      .eq('para', me.id)
      .order('creado', { ascending: false })
      .limit(40);
    setItems((data as unknown as Novedad[]) ?? []);
    // marcar todas como vistas
    await supabase.from('novedades').update({ vista: true }).eq('para', me.id).eq('vista', false);
    setCount(0);
    void setAppBadge(0);
  }

  async function borrar(id: string) {
    const { error } = await supabase.from('novedades').delete().eq('id', id);
    if (error) {
      toast('no se pudo');
      return;
    }
    setItems((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
  }

  async function limpiar() {
    if (!me) return;
    if (!confirm('¿quitar todas las novedades?')) return;
    const { error } = await supabase.from('novedades').delete().eq('para', me.id);
    if (error) {
      toast('no se pudo');
      return;
    }
    setItems([]);
    toast('novedades limpias 🦝');
  }

  function ir(destino: string | null) {
    setOpen(false);
    if (destino) router.push(destinoToRoute(destino));
  }

  return (
    <>
      <button className="profile-btn campana-btn" onClick={abrir} title="novedades">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A4048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 6 16 L 6 11 C 6 7 8 5 12 5 C 16 5 18 7 18 11 L 18 16 L 20 18 L 4 18 Z" />
          <path d="M 10 18 Q 12 21 14 18" />
        </svg>
        {count > 0 && <span className="campana-dot">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <div className="modal-title">novedades</div>
            <div className="modal-sub">lo que pasó mientras no estabas</div>
            <div>
              {items === null ? (
                <div className="center-msg">cargando...</div>
              ) : items.length === 0 ? (
                <div className="center-msg">no hay novedades por ahora 🦝</div>
              ) : (
                items.map((n) => (
                  <div className={`novedad-item ${n.vista ? '' : 'no-vista'}`} key={n.id}>
                    <div className="novedad-emoji">{NOVEDAD_EMOJI[n.tipo] || '🔔'}</div>
                    <div className="novedad-info" style={{ cursor: 'pointer' }} onClick={() => ir(n.destino)}>
                      <div className="novedad-texto">{n.texto}</div>
                      <div className="novedad-when">{tiempoRelativo(n.creado)}</div>
                    </div>
                    {!n.vista && <div className="novedad-punto" />}
                    <button className="novedad-del" onClick={() => borrar(n.id)} title="quitar">
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                cerrar
              </button>
              {items && items.length > 0 && (
                <button className="btn" onClick={limpiar}>
                  limpiar todo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
