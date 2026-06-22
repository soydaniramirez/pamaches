'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fmtFechaLarga, fechaCorta } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';
import { MOODS, IDEAS_BASE } from '@/lib/planes';
import type { Plan } from '@/lib/types';

type PlanTab = 'citas' | 'hechas';

/**
 * Pantalla de planes pamaches. Porta 1:1 cargarPlanes / renderProximoPlan /
 * generador de ideas por mood / switchPlanTab / savePlan / togglePlan / borrarPlan.
 *
 * Nota: aquí "mood" = categoría de idea de cita (const MOODS/IDEAS_BASE), NO la
 * tabla `moods` (esa respalda "raros"/semáforo).
 */
export default function PlanesPage() {
  const supabase = useRef(createClient()).current;
  const { me, toast } = useAppData();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [tab, setTab] = useState<PlanTab>('citas');
  const [moodSel, setMoodSel] = useState<string | null>(null);
  const [idea, setIdea] = useState<{ mood: string; texto: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [moodForm, setMoodForm] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('plans').select('*').order('creado', { ascending: false });
    setPlanes((data as unknown as Plan[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('planes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  // próximo plan: con fecha futura, no hecho, el más cercano
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const proximo = planes
    .filter((p) => p.fecha && !p.hecho)
    .map((p) => ({ p, f: new Date(p.fecha + 'T00:00:00') }))
    .filter((x) => x.f >= hoy)
    .sort((a, b) => a.f.getTime() - b.f.getTime())[0];

  function generarIdea(mood: string) {
    setMoodSel(mood);
    const pool = [...(IDEAS_BASE[mood] || [])];
    planes.filter((p) => p.tipo === 'idea' && p.mood === mood).forEach((p) => pool.push(p.titulo));
    if (pool.length === 0) pool.push('inventen algo juntos para este mood');
    setIdea({ mood, texto: pool[Math.floor(Math.random() * pool.length)] });
  }

  async function guardarIdeaComoPlan(texto: string, mood: string) {
    if (!me) return;
    const { error } = await supabase
      .from('plans')
      .insert({ couple_id: me.couple_id, titulo: texto, tipo: 'cita', mood, hecho: false });
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    toast('plan agregado a por hacer');
    setIdea(null);
    await cargar();
  }

  async function togglePlan(p: Plan) {
    const { error } = await supabase.from('plans').update({ hecho: !p.hecho }).eq('id', p.id);
    if (error) {
      toast('no se pudo actualizar');
      return;
    }
    if (!p.hecho) toast('¡plan cumplido! 🦝');
    await cargar();
  }

  async function borrarPlan(id: string) {
    if (!confirm('¿borrar este plan?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('plan borrado');
    await cargar();
  }

  function openModal() {
    setTitulo('');
    setMoodForm(null);
    setFecha('');
    setNota('');
    setModalOpen(true);
  }

  async function savePlan() {
    if (!me) return;
    const t = titulo.trim();
    if (!t) {
      toast('falta el nombre del plan');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('plans').insert({
      couple_id: me.couple_id,
      titulo: t,
      tipo: 'cita',
      mood: moodForm,
      fecha: fecha || null,
      nota: nota.trim() || null,
      hecho: false,
    });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    toast('plan agregado');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: null,
      tipo: 'plan',
      texto: `${me.nombre} agregó un plan: ${t}`,
      destino: 'planes',
    });
    await cargar();
  }

  const lista = planes
    .filter((p) => p.tipo !== 'idea')
    .filter((p) => (tab === 'citas' ? !p.hecho : p.hecho));

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">planes pamaches</div>
          <div className="section-sub">nuestros momentos</div>
        </div>

        {/* próximo plan */}
        <div className="next-plan">
          <div className="next-plan-label">siguiente plan</div>
          {proximo ? (
            <>
              <div className="next-plan-title">{proximo.p.titulo}</div>
              <div className="next-plan-when">
                {fmtFechaLarga(proximo.f)}
                {proximo.p.mood ? ' · ' + proximo.p.mood : ''}
              </div>
            </>
          ) : (
            <>
              <div className="next-plan-title next-plan-empty">aún no hay nada agendado</div>
              <div className="next-plan-when">agrega un plan con fecha abajo</div>
            </>
          )}
        </div>

        {/* generador de ideas */}
        <div className="idea-box">
          <div className="idea-box-title">sorpréndenos con una idea</div>
          <div className="idea-box-sub">elige un mood y les damos una idea</div>
          <div className="chips-row">
            {MOODS.map((m) => (
              <button
                key={m}
                className={`chip ${moodSel === m ? 'selected' : ''}`}
                onClick={() => generarIdea(m)}
              >
                {m}
              </button>
            ))}
          </div>
          {idea && (
            <div className="idea-result">
              <div className="idea-result-text">&quot;{idea.texto}&quot;</div>
              <div className="idea-result-actions">
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => generarIdea(idea.mood)}>
                  otra idea
                </button>
                <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => guardarIdeaComoPlan(idea.texto, idea.mood)}>
                  ¡me late!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* sub-tabs */}
        <div className="sub-tabs">
          <button className={`sub-tab${tab === 'citas' ? ' active' : ''}`} onClick={() => setTab('citas')}>
            por hacer
          </button>
          <button className={`sub-tab${tab === 'hechas' ? ' active' : ''}`} onClick={() => setTab('hechas')}>
            ya hechos
          </button>
        </div>

        <div>
          {lista.length === 0 ? (
            <div className="mov-empty">
              <img src="/pamache.png" alt="" />
              {tab === 'citas' ? (
                <>
                  aún no hay planes por hacer.
                  <br />
                  genera una idea o toca el +
                </>
              ) : (
                'todavía no han marcado ningún plan como hecho'
              )}
            </div>
          ) : (
            lista.map((p) => (
              <div className="plan-item" key={p.id}>
                <button className={`plan-check ${p.hecho ? 'done' : ''}`} onClick={() => togglePlan(p)} />
                <div className="plan-info">
                  <div className={`plan-title-txt ${p.hecho ? 'done' : ''}`}>{p.titulo}</div>
                  <div className="plan-meta">
                    {p.mood ? <span className="plan-mood-pill">{p.mood}</span> : null}{' '}
                    {p.fecha ? fechaCorta(p.fecha) : ''}
                    {p.nota ? ' · ' + p.nota : ''}
                  </div>
                </div>
                <button className="plan-del" onClick={() => borrarPlan(p.id)}>
                  ✕
                </button>
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
            <div className="modal-title">nuevo plan pamache</div>
            <div className="modal-sub">algo que quieran hacer juntos</div>
            <div className="mfield">
              <div className="mfield-label">¿qué plan?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. picnic en chapultepec"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">mood</div>
              <div className="chips-row">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    className={`chip${moodForm === m ? ' selected' : ''}`}
                    onClick={() => setMoodForm(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">fecha (opcional)</div>
              <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="mfield">
              <div className="mfield-label">nota (opcional)</div>
              <input
                type="text"
                className="input"
                placeholder="algo más..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={savePlan} disabled={saving}>
                {saving ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
