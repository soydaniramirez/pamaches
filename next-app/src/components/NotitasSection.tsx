'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { tiempoRelativo } from '@/lib/helpers';
import { REACCIONES, reaccionById, crearNovedad } from '@/lib/social';
import type { Notita, NotitaReaccion } from '@/lib/types';

/**
 * Sección de notitas del home. Porta cargarNotitas / saveNotita / reaccionar /
 * quitarReaccion del index.html, incluyendo la suscripción realtime.
 */
export default function NotitasSection() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [notitas, setNotitas] = useState<Notita[]>([]);
  const [reacciones, setReacciones] = useState<NotitaReaccion[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data: r } = await supabase.from('notita_reacciones').select('*');
    setReacciones((r as unknown as NotitaReaccion[]) ?? []);
    const { data } = await supabase
      .from('notitas')
      .select('*')
      .eq('archivada', false)
      .order('creado', { ascending: false })
      .limit(4);
    setNotitas((data as unknown as Notita[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('home-notitas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notitas' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notita_reacciones' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  async function saveNotita() {
    const t = texto.trim();
    if (!t || !me) {
      setModalOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('notitas')
      .insert({ couple_id: me.couple_id, autor: me.id, texto: t });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTexto('');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'notita',
      texto: `${me.nombre} te dejó una notita`,
      destino: 'notitas',
    });
    await cargar();
    toast('notita dejada');
  }

  function otroId(): string | null {
    if (!me) return null;
    const otro = Object.values(profiles).find((p) => p.id !== me.id);
    return otro?.id ?? null;
  }

  async function reaccionar(notitaId: string, tipo: string) {
    setPickerFor(null);
    if (!me) return;
    const existente = reacciones.find((r) => r.notita_id === notitaId && r.autor === me.id);
    let error;
    if (existente) {
      if (existente.tipo === tipo) {
        ({ error } = await supabase.from('notita_reacciones').delete().eq('id', existente.id));
      } else {
        ({ error } = await supabase.from('notita_reacciones').update({ tipo }).eq('id', existente.id));
      }
    } else {
      ({ error } = await supabase.from('notita_reacciones').insert({
        couple_id: me.couple_id,
        notita_id: notitaId,
        autor: me.id,
        tipo,
      }));
    }
    if (error) {
      toast('no se pudo');
      return;
    }
    await cargar();
  }

  return (
    <div className="notitas-section">
      <div className="notitas-header">
        <div className="notitas-title">notitas</div>
        <button className="notitas-add" onClick={() => setModalOpen(true)}>
          +
        </button>
      </div>

      <div id="notitas-list">
        {notitas.length === 0 ? (
          <div className="notitas-empty">aún no hay notitas. deja la primera con el +</div>
        ) : (
          notitas.map((n) => {
            const autor = profiles[n.autor];
            const reacs = reacciones.filter((r) => r.notita_id === n.id);
            return (
              <div className="notita" key={n.id}>
                <div className="notita-from">{autor ? autor.nombre : 'alguien'} &rarr;</div>
                <div className="notita-text">{n.texto}</div>
                <div className="notita-when">{tiempoRelativo(n.creado)}</div>
                <div className="reaccion-bar">
                  {reacs.map((r) => {
                    const def = reaccionById(r.tipo);
                    if (!def) return null;
                    const esMia = r.autor === me?.id;
                    return (
                      <span
                        key={r.id}
                        className={`reaccion-chip${esMia ? ' mia' : ''}`}
                        title={`${profiles[r.autor]?.nombre ?? 'alguien'}: ${def.label}`}
                        onClick={esMia ? () => reaccionar(n.id, r.tipo) : undefined}
                        dangerouslySetInnerHTML={{ __html: def.svg }}
                      />
                    );
                  })}
                  <button
                    className="reaccion-add"
                    onClick={() => setPickerFor(pickerFor === n.id ? null : n.id)}
                    title="reaccionar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A4048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M 8 13 Q 12 17 16 13" />
                      <circle cx="9" cy="10" r="0.8" fill="#5A4048" />
                      <circle cx="15" cy="10" r="0.8" fill="#5A4048" />
                    </svg>
                  </button>
                  {pickerFor === n.id && (
                    <div className="reaccion-picker" style={{ position: 'static', display: 'inline-flex' }}>
                      {REACCIONES.map((r) => (
                        <button
                          key={r.id}
                          className="reaccion-opt"
                          title={r.label}
                          onClick={() => reaccionar(n.id, r.id)}
                          dangerouslySetInnerHTML={{ __html: r.svg }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="modal">
            <div className="modal-title">dejar una notita</div>
            <div className="modal-sub">algo bonito para encontrar después</div>
            <textarea
              placeholder="escribe aquí, pamache..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={saveNotita} disabled={saving}>
                {saving ? <span className="spinner" /> : 'dejarla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
