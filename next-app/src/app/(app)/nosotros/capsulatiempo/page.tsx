'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fechaCorta } from '@/lib/helpers';
import type { TimeCapsule } from '@/lib/types';

/** Porta capsulaSePuedeAbrir: las de evento siempre; las de fecha solo si ya llegó. */
function sePuedeAbrir(c: TimeCapsule): boolean {
  if (c.tipo_apertura === 'evento') return true;
  if (!c.abre_en) return true;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return new Date(c.abre_en + 'T00:00:00') <= hoy;
}

const CAP_ICON = (
  <g fill="none" stroke="#BB1F31" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M 12 24 Q 12 10 25 10 Q 38 10 38 24" />
    <ellipse cx="25" cy="30" rx="17" ry="4" />
    <ellipse cx="25" cy="26" rx="17" ry="4" />
  </g>
);

/**
 * Cápsula del tiempo. Porta 1:1 cargarCapsulaTiempo / renderCapsulaTiempo /
 * abrirCapsula / borrarCapsula / saveCt (gating por fecha/evento).
 */
export default function CapsulaTiempoPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [capsulas, setCapsulas] = useState<TimeCapsule[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState<'fecha' | 'evento'>('fecha');
  const [fecha, setFecha] = useState('');
  const [evento, setEvento] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('timecapsule').select('*').order('creado', { ascending: false });
    setCapsulas((data as unknown as TimeCapsule[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('ct-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timecapsule' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  function openModal() {
    setTitulo('');
    setContenido('');
    setTipo('fecha');
    setFecha('');
    setEvento('');
    setModalOpen(true);
  }

  async function save() {
    if (!me) return;
    const t = titulo.trim();
    const c = contenido.trim();
    if (!t) {
      toast('falta el título');
      return;
    }
    if (!c) {
      toast('escribe el mensaje');
      return;
    }
    let abre_en: string | null = null;
    let ev: string | null = null;
    if (tipo === 'fecha') {
      abre_en = fecha || null;
      if (!abre_en) {
        toast('elige una fecha');
        return;
      }
    } else {
      ev = evento.trim();
      if (!ev) {
        toast('escribe el momento');
        return;
      }
    }
    setSaving(true);
    const { error } = await supabase.from('timecapsule').insert({
      couple_id: me.couple_id,
      autor: me.id,
      titulo: t,
      contenido: c,
      tipo_apertura: tipo,
      abre_en,
      evento: ev,
      sellada: true,
    });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    toast('cápsula sellada 💌');
    await cargar();
  }

  async function abrir(id: string) {
    if (!confirm('¿abrir esta cápsula? una vez abierta, se queda abierta')) return;
    const { error } = await supabase.from('timecapsule').update({ sellada: false }).eq('id', id);
    if (error) {
      toast('no se pudo abrir');
      return;
    }
    toast('cápsula abierta 💌');
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar esta cápsula?')) return;
    const { error } = await supabase.from('timecapsule').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('cápsula borrada');
    await cargar();
  }

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/nosotros" className="back-btn">
          ‹ nosotros
        </Link>
        <div className="section-header">
          <div className="section-title">cápsula del tiempo</div>
          <div className="section-sub">cartas para abrirnos después</div>
        </div>
        <div className="ct-intro">cartas, recuerdos y mensajes que se abren en su momento</div>

        <div>
          {capsulas.length === 0 ? (
            <div className="mov-empty">
              <img src="/pamache.png" alt="" />
              aún no hay cápsulas.
              <br />
              toca el + para sellar la primera
            </div>
          ) : (
            capsulas.map((c) => {
              const puede = sePuedeAbrir(c);
              const abierta = !c.sellada;
              const claseCard = abierta ? 'abierta' : puede ? 'lista' : 'sellada';
              const cuandoTxt =
                c.tipo_apertura === 'evento'
                  ? 'se abre: ' + (c.evento || 'en su momento')
                  : 'se abre el ' + (c.abre_en ? fechaCorta(c.abre_en) : 'algún día');
              const autorNombre = profiles[c.autor]?.nombre ?? 'alguien';
              return (
                <div className={`ct-card ${claseCard}`} key={c.id}>
                  <button className="ct-del" onClick={() => borrar(c.id)}>
                    ✕
                  </button>
                  <div className="ct-icon-row">
                    <svg width="20" height="20" viewBox="0 0 50 50">
                      {CAP_ICON}
                    </svg>
                    <span className="ct-cuando">{cuandoTxt}</span>
                  </div>
                  <div className="ct-titulo">{c.titulo}</div>
                  <div className="ct-meta">
                    escrita por {autorNombre}
                    {abierta ? ' · abierta' : ' · sellada'}
                  </div>
                  {abierta ? (
                    <div className="ct-contenido">{c.contenido || ''}</div>
                  ) : puede ? (
                    <button className="ct-abrir-btn" onClick={() => abrir(c.id)}>
                      abrir cápsula
                    </button>
                  ) : (
                    <div className="ct-locked">sellada · todavía no es momento</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="fab" onClick={openModal}>
        +
      </button>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">nueva cápsula</div>
            <div className="modal-sub">un mensaje para abrir después</div>
            <div className="mfield">
              <div className="mfield-label">¿qué es?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. carta para nuestro aniversario"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">el mensaje</div>
              <textarea
                placeholder="escribe aquí lo que quieres guardar..."
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cuándo se abre?</div>
              <div className="radio-row">
                <button
                  className={`radio-opt${tipo === 'fecha' ? ' selected' : ''}`}
                  onClick={() => setTipo('fecha')}
                >
                  en una fecha
                </button>
                <button
                  className={`radio-opt${tipo === 'evento' ? ' selected' : ''}`}
                  onClick={() => setTipo('evento')}
                >
                  en un momento
                </button>
              </div>
            </div>
            {tipo === 'fecha' ? (
              <div className="mfield">
                <div className="mfield-label">fecha de apertura</div>
                <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            ) : (
              <div className="mfield">
                <div className="mfield-label">¿en qué momento?</div>
                <input
                  type="text"
                  className="input"
                  placeholder="ej. cuando compremos casa"
                  value={evento}
                  onChange={(e) => setEvento(e.target.value)}
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={save} disabled={saving}>
                {saving ? <span className="spinner" /> : 'sellar cápsula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
