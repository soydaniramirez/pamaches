'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fmtDinero } from '@/lib/helpers';
import { num } from '@/lib/gastos';
import type { FutureMeta, MetaAbono } from '@/lib/types';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaLarga(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** ahorro registrado como gasto y ligado a una meta. */
interface AhorroGasto {
  id: string;
  monto: number | string;
  meta_id: string;
  concepto: string;
  fecha: string;
  autor: string;
  creado: string;
}

interface FuturoModalState {
  open: boolean;
  editingId: string | null;
  titulo: string;
  cuando: string;
  nota: string;
  tieneMeta: boolean;
  metaMonto: string;
}
const FM_CERRADO: FuturoModalState = {
  open: false,
  editingId: null,
  titulo: '',
  cuando: '',
  nota: '',
  tieneMeta: false,
  metaMonto: '',
};

/**
 * Futuro nosotros — timeline de hitos con metas de ahorro.
 * Porta 1:1 cargarFuturo / ahorradoDe / renderFuturo / toggleFuturo / saveFuturo /
 * borrarFuturo + abonos (saveAbono / openAbonosHist / borrarAbono).
 *
 * ahorrado = Σ meta_abonos(future_id) + Σ expenses(tipo='ahorro', meta_id).
 * Solo LEE de Gastos (no modifica nada allí).
 */
export default function FuturoPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [futuro, setFuturo] = useState<FutureMeta[]>([]);
  const [abonos, setAbonos] = useState<MetaAbono[]>([]);
  const [ahorrosGastos, setAhorrosGastos] = useState<AhorroGasto[]>([]);

  const [fm, setFm] = useState<FuturoModalState>(FM_CERRADO);
  const [savingFm, setSavingFm] = useState(false);
  const [abonoModal, setAbonoModal] = useState<{ open: boolean; futureId: string | null }>({
    open: false,
    futureId: null,
  });
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoNota, setAbonoNota] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);
  const [histFor, setHistFor] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [fRes, aRes, gRes] = await Promise.all([
      supabase.from('future').select('*').order('orden', { ascending: true }).order('creado', { ascending: true }),
      supabase.from('meta_abonos').select('*').order('creado', { ascending: false }),
      supabase
        .from('expenses')
        .select('id, monto, meta_id, concepto, fecha, autor, creado')
        .eq('tipo', 'ahorro')
        .not('meta_id', 'is', null),
    ]);
    setFuturo((fRes.data as unknown as FutureMeta[]) ?? []);
    setAbonos((aRes.data as unknown as MetaAbono[]) ?? []);
    setAhorrosGastos((gRes.data as unknown as AhorroGasto[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('futuro-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'future' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meta_abonos' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  // ahorradoDe(): abonos directos + ahorros ligados desde gastos (las dos fuentes son disjuntas)
  const ahorradoDe = (futureId: string): number =>
    abonos.filter((a) => a.future_id === futureId).reduce((s, a) => s + num(a.monto), 0) +
    ahorrosGastos.filter((g) => g.meta_id === futureId).reduce((s, g) => s + num(g.monto), 0);

  async function toggleFuturo(f: FutureMeta) {
    const { error } = await supabase.from('future').update({ logrado: !f.logrado }).eq('id', f.id);
    if (error) {
      toast('no se pudo actualizar');
      return;
    }
    if (!f.logrado) toast('¡hito logrado! 🦝');
    await cargar();
  }

  async function borrarFuturo(id: string) {
    if (!confirm('¿borrar este hito? si tiene meta, sus abonos también se borran')) return;
    const { error } = await supabase.from('future').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('hito borrado');
    await cargar();
  }

  function openFuturoModal(f?: FutureMeta) {
    setFm({
      open: true,
      editingId: f?.id ?? null,
      titulo: f?.titulo ?? '',
      cuando: f?.cuando ?? '',
      nota: f?.nota ?? '',
      tieneMeta: f ? !!f.tiene_meta : false,
      metaMonto: f?.meta_monto != null ? String(num(f.meta_monto)) : '',
    });
  }

  async function saveFuturo() {
    if (!me) return;
    const titulo = fm.titulo.trim();
    if (!titulo) {
      toast('falta el nombre del hito');
      return;
    }
    let metaMonto: number | null = null;
    if (fm.tieneMeta) {
      metaMonto = parseFloat(fm.metaMonto);
      if (!metaMonto || metaMonto <= 0) {
        toast('pon el monto de la meta');
        return;
      }
    }
    setSavingFm(true);
    const cuando = fm.cuando.trim() || null;
    const nota = fm.nota.trim() || null;
    let error;
    if (fm.editingId) {
      ({ error } = await supabase
        .from('future')
        .update({ titulo, cuando, nota, tiene_meta: fm.tieneMeta, meta_monto: metaMonto })
        .eq('id', fm.editingId));
    } else {
      ({ error } = await supabase.from('future').insert({
        couple_id: me.couple_id,
        titulo,
        cuando,
        nota,
        logrado: false,
        orden: futuro.length + 1,
        tiene_meta: fm.tieneMeta,
        meta_monto: metaMonto,
      }));
    }
    setSavingFm(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    const eraNuevo = !fm.editingId;
    setFm(FM_CERRADO);
    toast(eraNuevo ? 'hito agregado' : 'hito actualizado');
    await cargar();
  }

  async function saveAbono() {
    if (!me || !abonoModal.futureId) return;
    const monto = parseFloat(abonoMonto);
    if (!monto || monto <= 0) {
      toast('pon el monto');
      return;
    }
    setSavingAbono(true);
    const { error } = await supabase.from('meta_abonos').insert({
      couple_id: me.couple_id,
      future_id: abonoModal.futureId,
      autor: me.id,
      monto,
      nota: abonoNota.trim() || null,
    });
    setSavingAbono(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    const fid = abonoModal.futureId;
    setAbonoModal({ open: false, futureId: null });
    setAbonoMonto('');
    setAbonoNota('');
    toast('abono registrado 🦝');
    await cargar();
    // ¿se completó la meta? (recalcula incluyendo el abono recién hecho)
    const f = futuro.find((x) => x.id === fid);
    if (f?.meta_monto) {
      const nuevoTotal = ahorradoDe(fid) + monto;
      if (nuevoTotal >= num(f.meta_monto)) setTimeout(() => toast('¡completaron la meta! 🎉'), 1200);
    }
  }

  async function borrarAbono(id: string) {
    if (!confirm('¿borrar este abono?')) return;
    const { error } = await supabase.from('meta_abonos').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    setHistFor(null);
    toast('abono borrado');
    await cargar();
  }

  // historial mixto de una meta: abonos directos + ahorros desde gastos
  function historialDe(futureId: string) {
    const directos = abonos
      .filter((a) => a.future_id === futureId)
      .map((a) => ({ id: a.id, monto: a.monto, autor: a.autor, nota: a.nota, creado: a.creado, origen: 'abono' as const }));
    const deGastos = ahorrosGastos
      .filter((g) => g.meta_id === futureId)
      .map((g) => ({ id: g.id, monto: g.monto, autor: g.autor, nota: g.concepto, creado: g.creado, origen: 'gasto' as const }));
    return [...directos, ...deGastos].sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime());
  }

  const metaHist = histFor ? futuro.find((f) => f.id === histFor) : null;

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/nosotros" className="back-btn">
          ‹ nosotros
        </Link>
        <div className="section-header">
          <div className="section-title">futuro nosotros</div>
          <div className="section-sub">a dónde queremos llegar</div>
        </div>

        <div className="timeline">
          {futuro.length === 0 ? (
            <div className="mov-empty" style={{ paddingLeft: 0 }}>
              <img src="/pamache.png" alt="" />
              aún no hay hitos.
              <br />
              toca el + para soñar el primero
            </div>
          ) : (
            futuro.map((f) => {
              const tieneMeta = f.tiene_meta && f.meta_monto != null;
              const meta = num(f.meta_monto);
              const ahorrado = ahorradoDe(f.id);
              const pct = meta > 0 ? Math.min(100, (ahorrado / meta) * 100) : 0;
              const completa = ahorrado >= meta;
              return (
                <div className="tl-item" key={f.id}>
                  <button className={`tl-dot ${f.logrado ? 'done' : ''}`} onClick={() => toggleFuturo(f)} />
                  <div className="tl-card">
                    <button className="tl-del" onClick={() => borrarFuturo(f.id)}>
                      ✕
                    </button>
                    {f.cuando ? <div className="tl-when">{f.cuando}</div> : null}
                    <div
                      className={`tl-what ${f.logrado ? 'done' : ''}`}
                      onClick={() => openFuturoModal(f)}
                      style={{ cursor: 'pointer' }}
                    >
                      {f.titulo}
                    </div>
                    {f.nota ? <div className="tl-note">{f.nota}</div> : null}
                    {tieneMeta && (
                      <div className="tl-meta">
                        <div className="tl-meta-top">
                          <span className="tl-meta-monto">{fmtDinero(ahorrado)}</span>
                          <span className="tl-meta-objetivo">de {fmtDinero(meta)}</span>
                        </div>
                        <div className="tl-meta-bar">
                          <div className="tl-meta-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        {completa ? (
                          <div className="tl-meta-status">¡meta completa! 🎉</div>
                        ) : (
                          <div className="tl-meta-falta">faltan {fmtDinero(meta - ahorrado)}</div>
                        )}
                        <div className="tl-meta-actions">
                          <button className="tl-meta-btn" onClick={() => setHistFor(f.id)}>
                            ver abonos
                          </button>
                          <button
                            className="tl-meta-btn primary"
                            onClick={() => setAbonoModal({ open: true, futureId: f.id })}
                          >
                            abonar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="fab" onClick={() => openFuturoModal()}>
        +
      </button>

      {/* modal crear/editar hito */}
      {fm.open && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setFm(FM_CERRADO)}>
          <div className="modal">
            <div className="modal-title">{fm.editingId ? 'editar hito' : 'nuevo hito'}</div>
            <div className="modal-sub">algo que quieran lograr juntos</div>
            <div className="mfield">
              <div className="mfield-label">¿qué hito?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. viaje a europa"
                value={fm.titulo}
                onChange={(e) => setFm((m) => ({ ...m, titulo: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cuándo? (texto libre)</div>
              <input
                type="text"
                className="input"
                placeholder="ej. verano 2026, algún día..."
                value={fm.cuando}
                onChange={(e) => setFm((m) => ({ ...m, cuando: e.target.value }))}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">nota (opcional)</div>
              <input
                type="text"
                className="input"
                placeholder="algún detalle..."
                value={fm.nota}
                onChange={(e) => setFm((m) => ({ ...m, nota: e.target.value }))}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿lleva meta de ahorro?</div>
              <div className="radio-row">
                <button
                  className={`radio-opt${!fm.tieneMeta ? ' selected' : ''}`}
                  onClick={() => setFm((m) => ({ ...m, tieneMeta: false }))}
                >
                  no, solo es un hito
                </button>
                <button
                  className={`radio-opt${fm.tieneMeta ? ' selected' : ''}`}
                  onClick={() => setFm((m) => ({ ...m, tieneMeta: true }))}
                >
                  sí, vamos a ahorrar
                </button>
              </div>
            </div>
            {fm.tieneMeta && (
              <div className="mfield">
                <div className="mfield-label">¿cuánto quieren juntar?</div>
                <input
                  type="number"
                  className="input"
                  placeholder="ej. 30000"
                  inputMode="decimal"
                  value={fm.metaMonto}
                  onChange={(e) => setFm((m) => ({ ...m, metaMonto: e.target.value }))}
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setFm(FM_CERRADO)}>
                cancelar
              </button>
              <button className="btn" onClick={saveFuturo} disabled={savingFm}>
                {savingFm ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal abonar */}
      {abonoModal.open && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && setAbonoModal({ open: false, futureId: null })}
        >
          <div className="modal">
            <div className="modal-title">abonar a la meta</div>
            <div className="modal-sub">
              {(() => {
                const f = futuro.find((x) => x.id === abonoModal.futureId);
                return f ? 'meta: ' + f.titulo : 'cuánto le metemos hoy';
              })()}
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cuánto abonan?</div>
              <input
                type="number"
                className="input"
                placeholder="0"
                inputMode="decimal"
                value={abonoMonto}
                onChange={(e) => setAbonoMonto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">nota (opcional)</div>
              <input
                type="text"
                className="input"
                placeholder="ej. de los ahorros del mes"
                value={abonoNota}
                onChange={(e) => setAbonoNota(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAbonoModal({ open: false, futureId: null })}>
                cancelar
              </button>
              <button className="btn" onClick={saveAbono} disabled={savingAbono}>
                {savingAbono ? <span className="spinner" /> : 'abonar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal historial de abonos (mixto) */}
      {histFor && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setHistFor(null)}>
          <div className="modal">
            <div className="modal-title">abonos de la meta</div>
            <div className="modal-sub">{metaHist ? 'meta: ' + metaHist.titulo : 'todo lo que han juntado'}</div>
            <div>
              {historialDe(histFor).length === 0 ? (
                <div className="center-msg">aún no hay abonos</div>
              ) : (
                historialDe(histFor).map((a) => {
                  const quien = profiles[a.autor]?.nombre ?? 'alguien';
                  return (
                    <div className="abono-item" key={a.id}>
                      <div className="abono-info">
                        <div className="abono-monto">{fmtDinero(num(a.monto))}</div>
                        <div className="abono-meta">
                          {quien} · {fechaLarga(a.creado)}
                          {a.nota ? ' · ' + a.nota : ''}
                          {a.origen === 'gasto' ? ' · desde gastos 🐷' : ''}
                        </div>
                      </div>
                      {a.origen === 'abono' && (
                        <button className="abono-del" onClick={() => borrarAbono(a.id)}>
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setHistFor(null)}>
                cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
