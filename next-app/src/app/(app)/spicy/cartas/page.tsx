'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { tiempoRelativo } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';

interface CartaSpicy {
  id: string;
  autor: string;
  texto: string;
  creado: string;
}

/**
 * Cartas spicy — mismo molde que Notitas (sin reacciones ni archivo).
 * Porta cargarCartasSpicy / saveCartaSpicy / borrarCartaSpicy.
 */
export default function CartasSpicyPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [cartas, setCartas] = useState<CartaSpicy[]>([]);
  const [cargado, setCargado] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('spicy_cartas').select('*').order('creado', { ascending: false });
    setCartas((data as unknown as CartaSpicy[]) ?? []);
    setCargado(true);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('spicy-cartas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spicy_cartas' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const otroId = (): string | null => Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  async function save() {
    if (!me) return;
    const t = texto.trim();
    if (!t) {
      toast('escribe la carta');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('spicy_cartas').insert({ couple_id: me.couple_id, autor: me.id, texto: t });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTexto('');
    toast('carta spicy dejada 😏');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'carta',
      texto: `${me.nombre} te dejó una carta spicy 😏`,
      destino: 'spicy-cartas',
    });
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar esta carta?')) return;
    const { error } = await supabase.from('spicy_cartas').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('carta borrada');
    await cargar();
  }

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/spicy" className="back-btn">
          ‹ spicy
        </Link>
        <div className="section-header">
          <div className="section-title">cartas spicy</div>
          <div className="section-sub">coqueteos para encontrar después</div>
        </div>

        <div id="cartas-spicy-list">
          {!cargado ? null : cartas.length === 0 ? (
            <div className="mov-empty">
              <img src="/pamache.png" alt="" />
              aún no hay cartas spicy.
              <br />
              toca el + para dejar la primera 🌶️
            </div>
          ) : (
            cartas.map((c) => (
              <div className="carta-spicy" key={c.id}>
                <button className="carta-spicy-del" onClick={() => borrar(c.id)}>
                  ✕
                </button>
                <div className="carta-spicy-from">{profiles[c.autor]?.nombre ?? 'alguien'} &rarr;</div>
                <div className="carta-spicy-text">{c.texto}</div>
                <div className="carta-spicy-when">{tiempoRelativo(c.creado)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">nueva carta spicy</div>
            <div className="modal-sub">un coqueteo para que lo encuentre</div>
            <div className="mfield">
              <div className="mfield-label">tu carta</div>
              <textarea
                placeholder="escríbele algo atrevido..."
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
                {saving ? <span className="spinner" /> : 'dejarla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
