'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import type { Nonego } from '@/lib/types';

type NnTab = 'los_dos' | 'dani' | 'alfredo';

const AUTOR_TXT: Record<string, string> = {
  los_dos: 'los dos · acordado',
  dani: 'dani escribió',
  alfredo: 'alfredo escribió',
};

/**
 * No-negociables. Porta 1:1 cargarNonego / switchNnTab / renderNonego / saveNn /
 * borrarNn. La columna `tipo` existe en la tabla pero el HTML no la usa → no se cablea.
 */
export default function NonegoPage() {
  const supabase = useRef(createClient()).current;
  const { me, toast } = useAppData();
  const [nonego, setNonego] = useState<Nonego[]>([]);
  const [tab, setTab] = useState<NnTab>('los_dos');
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [autorForm, setAutorForm] = useState<NnTab>('los_dos');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('nonnegotiables').select('*').order('creado', { ascending: false });
    setNonego((data as unknown as Nonego[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('nonego-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nonnegotiables' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  function openModal() {
    setTexto('');
    setAutorForm(tab); // por defecto, el autor es el tab actual
    setModalOpen(true);
  }

  async function save() {
    if (!me) return;
    const t = texto.trim();
    if (!t) {
      toast('escribe el no negociable');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('nonnegotiables')
      .insert({ couple_id: me.couple_id, autor: autorForm, texto: t });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTab(autorForm); // saltar al tab del autor
    toast('guardado');
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar este no negociable?')) return;
    const { error } = await supabase.from('nonnegotiables').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('borrado');
    await cargar();
  }

  const lista = nonego.filter((n) => n.autor === tab);

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/nosotros" className="back-btn">
          ‹ nosotros
        </Link>
        <div className="section-header">
          <div className="section-title">no negociables</div>
          <div className="section-sub">lo que sí y lo que no</div>
        </div>
        <div className="nn-intro">lo que cada quien necesita para estar bien</div>

        <div className="nn-tabs">
          {(['los_dos', 'dani', 'alfredo'] as NnTab[]).map((t) => (
            <button key={t} className={`nn-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'los_dos' ? 'los dos' : t}
            </button>
          ))}
        </div>

        <div>
          {lista.length === 0 ? (
            <div className="mov-empty">
              <img src="/pamache.png" alt="" />
              {tab === 'los_dos' ? 'aún no hay acuerdos de los dos' : 'aún no hay no negociables aquí'}
              <br />
              toca el + para agregar
            </div>
          ) : (
            lista.map((n) => (
              <div className={`nn-card ${n.autor}`} key={n.id}>
                <button className="nn-card-del" onClick={() => borrar(n.id)}>
                  ✕
                </button>
                <div className="nn-card-author">{AUTOR_TXT[n.autor] ?? n.autor}</div>
                <div className="nn-card-text">{n.texto}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="fab" onClick={openModal}>
        +
      </button>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">nuevo no negociable</div>
            <div className="modal-sub">algo importante para la relación</div>
            <div className="mfield">
              <div className="mfield-label">¿de quién es?</div>
              <div className="chips-row">
                {(['los_dos', 'dani', 'alfredo'] as NnTab[]).map((a) => (
                  <button
                    key={a}
                    className={`chip${autorForm === a ? ' selected' : ''}`}
                    onClick={() => setAutorForm(a)}
                  >
                    {a === 'los_dos' ? 'los dos' : a}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">escríbelo</div>
              <textarea
                placeholder="ej. honestidad antes que comodidad..."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
