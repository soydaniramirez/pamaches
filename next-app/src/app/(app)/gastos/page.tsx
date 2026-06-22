'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { nombreMes, fmtDinero, fechaCorta, calcularFechaCuota } from '@/lib/helpers';
import { num, calcAporte, calcSaldoBase, calcSaldadosTotal, sumaPorCat, totalObj } from '@/lib/gastos';
import {
  PALETA_PROYECTO,
  EMOJIS_VIAJE,
  emojiProyecto,
  colorProyecto,
  esViajeActivo,
  diaXdeY,
} from '@/lib/proyectos';
import GastoModal from '@/components/gastos/GastoModal';
import type {
  CompraMeses,
  Expense,
  FutureMeta,
  Proyecto,
  Settlement,
  Subcategoria,
} from '@/lib/types';

type Tab = 'compartidas' | 'personales' | 'meses' | 'resumen' | 'viajes';

function rangoMes(mes: Date): { desde: string; hasta: string } {
  const y = mes.getFullYear();
  const m = mes.getMonth();
  const ultimo = new Date(y, m + 1, 0).getDate();
  return {
    desde: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    hasta: `${y}-${String(m + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`,
  };
}

export default function GastosPage() {
  return (
    <Suspense fallback={null}>
      <GastosInner />
    </Suspense>
  );
}

function GastosInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { me, profiles, subcategorias, cupo, toast } = useAppData();

  const [mes, setMes] = useState(() => new Date());
  const [tab, setTab] = useState<Tab>('compartidas');
  const [gastos, setGastos] = useState<Expense[]>([]);
  const [gastosPrev, setGastosPrev] = useState<Expense[]>([]);
  // todos los compartidos de la historia (para el balance acumulado, opción A)
  const [compartidosAll, setCompartidosAll] = useState<Expense[]>([]);
  const [comprasMeses, setComprasMeses] = useState<CompraMeses[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [metas, setMetas] = useState<FutureMeta[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [gastosProyecto, setGastosProyecto] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showGasto, setShowGasto] = useState(false);
  const [showSaldar, setShowSaldar] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showCupo, setShowCupo] = useState(false);
  const [showRubros, setShowRubros] = useState(false);
  const [proyectoSel, setProyectoSel] = useState<Proyecto | null>(null);
  const [proyectoModal, setProyectoModal] = useState<{ open: boolean; editing: Proyecto | null }>({
    open: false,
    editing: null,
  });
  const [verArchivados, setVerArchivados] = useState(false);

  const cargar = useCallback(async () => {
    const { desde, hasta } = rangoMes(mes);
    const prev = new Date(mes.getFullYear(), mes.getMonth() - 1, 1);
    const rPrev = rangoMes(prev);

    const [gRes, gPrevRes, cmRes, sRes, fRes, pRes, gpRes, caRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: false })
        .order('creado', { ascending: false }),
      supabase.from('expenses').select('*').gte('fecha', rPrev.desde).lte('fecha', rPrev.hasta),
      supabase.from('compras_meses').select('*').order('fecha_compra', { ascending: false }),
      supabase.from('settlements').select('*').order('creado', { ascending: false }),
      supabase.from('future').select('*').order('orden', { ascending: true }),
      supabase.from('proyectos').select('*').order('creado', { ascending: false }),
      // gastos etiquetados a un proyecto (todos los meses) para totales y detalle
      supabase
        .from('expenses')
        .select('*')
        .not('proyecto_id', 'is', null)
        .order('fecha', { ascending: false }),
      // todos los compartidos de la historia (balance acumulado)
      supabase.from('expenses').select('*').eq('tipo', 'compartido'),
    ]);

    setGastos((gRes.data as unknown as Expense[]) ?? []);
    setGastosPrev((gPrevRes.data as unknown as Expense[]) ?? []);
    setCompartidosAll((caRes.data as unknown as Expense[]) ?? []);
    setComprasMeses((cmRes.data as unknown as CompraMeses[]) ?? []);
    setSettlements((sRes.data as unknown as Settlement[]) ?? []);
    setMetas((fRes.data as unknown as FutureMeta[]) ?? []);
    setProyectos((pRes.data as unknown as Proyecto[]) ?? []);
    setGastosProyecto((gpRes.data as unknown as Expense[]) ?? []);
    setLoading(false);
  }, [supabase, mes]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('gastos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras_meses' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  // deep-link "modo viaje": /gastos?proyecto=<id> abre el detalle de ese proyecto.
  const [paramHandled, setParamHandled] = useState(false);
  useEffect(() => {
    if (paramHandled) return;
    const id = searchParams.get('proyecto');
    if (!id || proyectos.length === 0) return;
    const p = proyectos.find((x) => x.id === id);
    if (p) {
      setTab('viajes');
      setProyectoSel(p);
    }
    setParamHandled(true);
  }, [searchParams, proyectos, paramHandled]);

  const cambiarMes = (delta: number) => {
    const d = new Date(mes);
    d.setMonth(d.getMonth() + delta);
    setMes(d);
  };

  // ---- cálculos ----
  // aporte: del mes visible (sin cambios).
  const aporte = calcAporte(gastos, cupo);
  // balance: ACUMULADO de toda la historia (opción A). El selector de mes NO lo
  // afecta — solo filtra la lista de movimientos de abajo.
  const { saldoNeto, rubros } = calcSaldoBase(compartidosAll);
  const saldados = calcSaldadosTotal(settlements);
  const saldo = saldoNeto - saldados;
  const absSaldo = Math.abs(saldo);

  const subById = (id: string | null): Subcategoria | undefined =>
    id ? subcategorias.find((s) => s.id === id) : undefined;

  const catConSub = (g: Expense): string => {
    let txt = g.categoria || '';
    const sub = subById(g.subcategoria_id);
    if (sub) txt += ' · ' + sub.nombre;
    return txt;
  };

  async function borrarGasto(id: string) {
    if (!confirm('¿borrar este movimiento?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('movimiento borrado');
    await cargar();
  }

  async function borrarCompraMeses(id: string) {
    if (!confirm('¿borrar esta compra a meses? también se borrarán todas sus cuotas (pagadas y pendientes)')) {
      return;
    }
    await supabase.from('expenses').delete().eq('compra_meses_id', id);
    const { error } = await supabase.from('compras_meses').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('compra a meses borrada');
    await cargar();
  }

  // ---- pieza: item de movimiento (porta renderMovItem) ----
  function MovItem({ g }: { g: Expense }) {
    const monto = num(g.monto);
    let tagClass: string;
    let tagText: string;
    let metaText: string;
    const quien = g.split === 'pago-dani' ? 'dani' : 'alfredo';

    if (g.compra_meses_id) {
      tagClass = 'tag-meses';
      tagText = `a meses · ${g.cuota_numero}/${g.cuota_total}`;
      let tipoTxt: string;
      if (g.tipo === 'compartido') tipoTxt = 'compartido';
      else if (g.tipo === 'personal') tipoTxt = 'cosa de ' + quien;
      else if (g.tipo === 'invitacion') tipoTxt = quien + ' invitó';
      else tipoTxt = g.tipo;
      metaText = tipoTxt + ' · paga ' + quien;
    } else if (g.tipo === 'aporte') {
      tagClass = 'tag-aporte';
      tagText = 'aporte';
      metaText = 'cuenta a la renta de alfredo';
    } else if (g.tipo === 'invitacion') {
      tagClass = 'tag-invitacion';
      tagText = 'regalo 💝';
      metaText = quien + ' invitó';
    } else if (g.tipo === 'personal') {
      tagClass = 'tag-personal';
      tagText = 'personal';
      metaText = 'cosa de ' + quien;
    } else if (g.tipo === 'ahorro') {
      tagClass = 'tag-ahorro';
      tagText = 'ahorro 🐷';
      let metaNombre = '';
      if (g.meta_id) {
        const m = metas.find((f) => f.id === g.meta_id);
        if (m) metaNombre = ' → ' + m.titulo;
      }
      metaText = 'ahorró ' + quien + (metaNombre || ' · sin meta');
    } else {
      tagClass = 'tag-compartido';
      tagText = 'compartido';
      metaText = 'pagó ' + quien + ' · 50/50';
    }

    return (
      <div className="mov-item">
        <div className="mov-left">
          <div className="mov-concepto">{g.concepto}</div>
          <div className="mov-meta">
            {catConSub(g)} · {metaText}
          </div>
        </div>
        <div className="mov-right">
          <div className="mov-monto">{fmtDinero(monto)}</div>
          <span className={`mov-tag ${tagClass}`}>{tagText}</span>
        </div>
        <button className="mov-del" onClick={() => borrarGasto(g.id)}>
          ✕
        </button>
      </div>
    );
  }

  // agrupar por fecha (desc) y renderizar
  function listaPorFecha(items: Expense[]) {
    const grupos: Record<string, Expense[]> = {};
    items.forEach((g) => {
      (grupos[g.fecha] ??= []).push(g);
    });
    return Object.keys(grupos)
      .sort()
      .reverse()
      .map((fecha) => (
        <div key={fecha}>
          <div className="mov-day-label">{fechaCorta(fecha)}</div>
          {grupos[fecha].map((g) => (
            <MovItem key={g.id} g={g} />
          ))}
        </div>
      ));
  }

  // ---- saldar / cupo ----
  async function saveSaldar(nota: string) {
    if (!me || absSaldo < 1) return;
    const quien = saldo > 0 ? 'alfredo' : 'dani';
    const { error } = await supabase.from('settlements').insert({
      couple_id: me.couple_id,
      autor: me.id,
      monto: absSaldo,
      quien_pago: quien,
      nota: nota.trim() || null,
    });
    if (error) {
      toast('no se pudo registrar');
      return;
    }
    setShowSaldar(false);
    await cargar();
    toast('quedaron a mano 🤝');
  }

  async function saveCupo(montoStr: string) {
    if (!me) return;
    const monto = parseFloat(montoStr);
    if (!monto || monto <= 0) {
      toast('monto inválido');
      return;
    }
    const { data: cfg } = await supabase
      .from('aporte_config')
      .select('id')
      .eq('couple_id', me.couple_id)
      .limit(1)
      .maybeSingle();
    let error;
    if (cfg) {
      ({ error } = await supabase.from('aporte_config').update({ cupo: monto }).eq('id', cfg.id));
    } else {
      ({ error } = await supabase.from('aporte_config').insert({ couple_id: me.couple_id, cupo: monto }));
    }
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setShowCupo(false);
    // el cupo vive en el contexto global → recargarlo afecta todas las vistas
    toast('cupo actualizado');
    window.location.reload();
  }

  // ---- proyectos (capa aditiva) ----
  async function guardarProyecto(
    values: {
      nombre: string;
      tipo: 'viaje' | 'proyecto';
      presupuesto: number | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
      emoji: string | null;
      color: string | null;
    },
    editingId: string | null,
  ) {
    if (!me) return;
    let error;
    if (editingId) {
      ({ error } = await supabase.from('proyectos').update(values).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('proyectos').insert({ couple_id: me.couple_id, ...values }));
    }
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setProyectoModal({ open: false, editing: null });
    await cargar();
    toast(editingId ? 'proyecto actualizado' : 'proyecto creado');
  }

  async function archivarProyecto(p: Proyecto) {
    const { error } = await supabase
      .from('proyectos')
      .update({ archivado: !p.archivado })
      .eq('id', p.id);
    if (error) {
      toast('no se pudo');
      return;
    }
    await cargar();
    toast(p.archivado ? 'proyecto reactivado' : 'proyecto archivado');
  }

  async function borrarProyecto(p: Proyecto) {
    if (!confirm('¿borrar este proyecto? los gastos NO se borran, solo se despegan del proyecto')) {
      return;
    }
    const { error } = await supabase.from('proyectos').delete().eq('id', p.id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    if (proyectoSel?.id === p.id) setProyectoSel(null);
    await cargar();
    toast('proyecto borrado');
  }

  const totalProyecto = (id: string): number =>
    gastosProyecto.filter((g) => g.proyecto_id === id).reduce((s, g) => s + num(g.monto), 0);

  if (loading) {
    return (
      <div id="loader">
        <Image src="/pamache.png" alt="pamaches" width={120} height={120} priority />
        <div className="loader-text">cargando...</div>
      </div>
    );
  }

  const compartidos = gastos.filter((g) => g.tipo !== 'personal');
  const personales = gastos.filter((g) => g.tipo === 'personal');

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">cuentas claras</div>
          <div className="section-sub">nuestras finanzas</div>
        </div>

        <div className="month-strip">
          <button className="month-arrow" onClick={() => cambiarMes(-1)}>
            ‹
          </button>
          <div className="month-label">{nombreMes(mes)}</div>
          <button className="month-arrow" onClick={() => cambiarMes(1)}>
            ›
          </button>
        </div>

        <div className="sub-tabs">
          {([
            ['compartidas', 'compartidas'],
            ['personales', 'personales'],
            ['meses', 'a meses'],
            ['viajes', 'viajes'],
            ['resumen', 'resumen'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={`sub-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== COMPARTIDAS ===== */}
        {tab === 'compartidas' && (
          <div>
            <div className="aporte-card">
              <div className="aporte-top">
                <div className="aporte-label">aporte de alfredo</div>
                <button className="aporte-edit" onClick={() => setShowCupo(true)}>
                  editar cupo
                </button>
              </div>
              <div className="aporte-numbers">
                <span className="aporte-done">{fmtDinero(aporte.aportado)}</span>
                <span className="aporte-total">de {fmtDinero(cupo)}</span>
              </div>
              <div className="aporte-bar">
                <div className="aporte-bar-fill" style={{ width: `${aporte.pct}%` }} />
              </div>
              <div className={`aporte-status${aporte.completo ? ' completo' : ''}`}>{aporte.statusText}</div>
            </div>

            <div className="balance-card">
              <div className={`balance-main${absSaldo < 1 ? ' amano' : ''}`}>
                {absSaldo < 1
                  ? 'están a mano · sin deudas'
                  : saldo > 0
                    ? `alfredo te debe ${fmtDinero(absSaldo)}`
                    : `le debes ${fmtDinero(absSaldo)} a alfredo`}
              </div>
              {absSaldo >= 1 && (
                <>
                  <div className={`balance-rubros${showRubros ? ' show' : ''}`}>
                    {Object.keys(rubros).filter((k) => Math.abs(rubros[k]) >= 1).length === 0 ? (
                      <div className="center-msg">sin desglose este mes</div>
                    ) : (
                      Object.keys(rubros)
                        .filter((k) => Math.abs(rubros[k]) >= 1)
                        .map((k) => {
                          const v = rubros[k];
                          return (
                            <div className="rubro-row" key={k}>
                              <span className="rubro-name">{k}</span>
                              <span className={`rubro-val ${v > 0 ? 'deuda-suya' : 'deuda-mia'}`}>
                                {v > 0
                                  ? `alfredo te debe ${fmtDinero(Math.abs(v))}`
                                  : `le debes ${fmtDinero(Math.abs(v))}`}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                  <button className="balance-toggle" onClick={() => setShowRubros((s) => !s)}>
                    {showRubros ? 'ocultar desglose ▴' : 'ver desglose por rubro ▾'}
                  </button>
                </>
              )}
              <div className="balance-actions">
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowHistorial(true)}>
                  historial
                </button>
                <button
                  className="btn btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => (absSaldo < 1 ? toast('ya están a mano') : setShowSaldar(true))}
                >
                  ya quedamos a mano
                </button>
              </div>
            </div>

            <div className="mov-list">
              {compartidos.length === 0 ? (
                <div className="mov-empty">
                  <img src="/pamache.png" alt="" />
                  aún no hay movimientos compartidos este mes.
                  <br />
                  toca el + para registrar el primero
                </div>
              ) : (
                listaPorFecha(compartidos)
              )}
            </div>
          </div>
        )}

        {/* ===== PERSONALES ===== */}
        {tab === 'personales' && (
          <div>
            {personales.length === 0 && (
              <div className="mov-empty">
                <img src="/pamache.png" alt="" />
                aún no hay gastos personales este mes.
                <br />
                regístralos con el + eligiendo &quot;personal&quot;
              </div>
            )}
            {Object.values(profiles)
              .sort((a, b) => (a.rol ?? '').localeCompare(b.rol ?? ''))
              .map((p) => {
                const suyos = personales.filter((g) => g.split === 'pago-' + p.rol);
                const total = suyos.reduce((s, g) => s + num(g.monto), 0);
                return (
                  <div className="persona-bloque" key={p.id}>
                    <div className="persona-bloque-head">
                      <div className={`persona-bloque-avatar ${p.rol}`}>
                        {p.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="persona-bloque-nombre">{p.nombre}</div>
                      <div className="persona-bloque-total">{fmtDinero(total)}</div>
                    </div>
                    {suyos.length === 0 ? (
                      <div className="resumen-empty">sin gastos personales este mes</div>
                    ) : (
                      listaPorFecha(suyos)
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* ===== A MESES ===== */}
        {tab === 'meses' && (
          <div>
            {comprasMeses.length === 0 ? (
              <div className="mov-empty">
                <img src="/pamache.png" alt="" />
                aún no hay compras a meses.
                <br />
                regístralas con el + eligiendo &quot;a meses&quot;
              </div>
            ) : (
              comprasMeses.map((cm) => <CompraMesesCard key={cm.id} cm={cm} onDelete={borrarCompraMeses} />)
            )}
          </div>
        )}

        {/* ===== VIAJES Y PROYECTOS (capa aditiva) ===== */}
        {tab === 'viajes' && !proyectoSel && (
          <div>
            <div className="add-inline" style={{ marginBottom: 16 }}>
              <button
                className="btn btn-sm"
                style={{ flex: 1 }}
                onClick={() => setProyectoModal({ open: true, editing: null })}
              >
                + nuevo viaje o proyecto
              </button>
            </div>

            {proyectos.filter((p) => !p.archivado).length === 0 && (
              <div className="mov-empty">
                <img src="/pamache.png" alt="" />
                aún no hay viajes ni proyectos.
                <br />
                crea uno y etiqueta gastos para llevar su cuenta aparte
              </div>
            )}

            {proyectos
              .filter((p) => !p.archivado)
              .map((p) => (
                <ProyectoCard
                  key={p.id}
                  proyecto={p}
                  total={totalProyecto(p.id)}
                  activo={esViajeActivo(p)}
                  onOpen={() => setProyectoSel(p)}
                  onEdit={() => setProyectoModal({ open: true, editing: p })}
                  onArchive={() => archivarProyecto(p)}
                  onDelete={() => borrarProyecto(p)}
                />
              ))}

            {proyectos.some((p) => p.archivado) && (
              <>
                <button
                  className="balance-toggle"
                  style={{ display: 'block' }}
                  onClick={() => setVerArchivados((s) => !s)}
                >
                  {verArchivados ? 'ocultar archivados ▴' : 'ver archivados ▾'}
                </button>
                {verArchivados &&
                  proyectos
                    .filter((p) => p.archivado)
                    .map((p) => (
                      <ProyectoCard
                        key={p.id}
                        proyecto={p}
                        total={totalProyecto(p.id)}
                        activo={false}
                        onOpen={() => setProyectoSel(p)}
                        onEdit={() => setProyectoModal({ open: true, editing: p })}
                        onArchive={() => archivarProyecto(p)}
                        onDelete={() => borrarProyecto(p)}
                      />
                    ))}
              </>
            )}
          </div>
        )}

        {/* detalle de un proyecto: sus gastos (todos los meses). "Modo viaje" =
            realce extra solo cuando el proyecto está activo hoy. */}
        {tab === 'viajes' &&
          proyectoSel &&
          (() => {
            // usa la copia más fresca del proyecto (por si se editó emoji/color/fechas)
            const p = proyectos.find((x) => x.id === proyectoSel.id) ?? proyectoSel;
            const total = totalProyecto(p.id);
            const presup = p.presupuesto != null ? num(p.presupuesto) : 0;
            const activo = esViajeActivo(p);
            const dxy = activo ? diaXdeY(p) : null;
            const restantes = dxy ? dxy.y - dxy.x : 0;
            return (
              <div>
                <button className="back-btn" onClick={() => setProyectoSel(null)}>
                  ‹ proyectos
                </button>
                <div
                  className={`cm-card${activo ? ' activo' : ''}`}
                  style={{ marginTop: 8, ...(p.color ? { background: colorProyecto(p) } : {}) }}
                >
                  <div className="cm-top">
                    <div className="cm-concepto">
                      {emojiProyecto(p)} {p.nombre}
                      {activo && <span className="viaje-activo-chip">modo viaje</span>}
                    </div>
                    <div className="cm-monto">{fmtDinero(total)}</div>
                  </div>
                  {activo && dxy && (
                    <div className="viaje-activo-dia" style={{ marginTop: 4 }}>
                      día {dxy.x} de {dxy.y}
                      {restantes > 0 ? ` · quedan ${restantes} días` : ' · último día'}
                    </div>
                  )}
                  {presup > 0 && (
                    <>
                      <div className="cm-bar">
                        <div
                          className="cm-bar-fill"
                          style={{ width: `${Math.min(100, (total / presup) * 100)}%` }}
                        />
                      </div>
                      <div className="cm-progreso">
                        {fmtDinero(total)} de {fmtDinero(presup)} de presupuesto
                      </div>
                    </>
                  )}
                </div>

                <div className="mov-list">
                  {gastosProyecto.filter((g) => g.proyecto_id === p.id).length === 0 ? (
                    <div className="mov-empty">
                      aún no hay gastos en este proyecto.
                      <br />
                      etiquétalos al registrar un gasto con el +
                    </div>
                  ) : (
                    listaPorFecha(gastosProyecto.filter((g) => g.proyecto_id === p.id))
                  )}
                </div>
              </div>
            );
          })()}

        {/* ===== RESUMEN ===== */}
        {tab === 'resumen' && <Resumen gastos={gastos} gastosPrev={gastosPrev} />}
      </div>

      <button className="fab" onClick={() => setShowGasto(true)}>
        +
      </button>

      {showGasto && (
        <GastoModal
          supabase={supabase}
          metas={metas}
          proyectos={proyectos.filter((p) => !p.archivado)}
          onClose={() => setShowGasto(false)}
          onSaved={(wasMeses) => {
            setShowGasto(false);
            if (wasMeses) setTab('meses');
            void cargar();
          }}
        />
      )}

      {showSaldar && <SaldarModal saldo={saldo} onClose={() => setShowSaldar(false)} onSave={saveSaldar} />}
      {showHistorial && <HistorialModal supabase={supabase} onClose={() => setShowHistorial(false)} />}
      {showCupo && <CupoModal cupo={cupo} onClose={() => setShowCupo(false)} onSave={saveCupo} />}
      {proyectoModal.open && (
        <ProyectoModal
          editing={proyectoModal.editing}
          onClose={() => setProyectoModal({ open: false, editing: null })}
          onSubmit={guardarProyecto}
        />
      )}
    </div>
  );
}

// ---- compra a meses (porta renderMeses) ----
function CompraMesesCard({ cm, onDelete }: { cm: CompraMeses; onDelete: (id: string) => void }) {
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  const fechaCompra = new Date(cm.fecha_compra + 'T00:00:00');
  let cuotasPagadas = 0;
  for (let i = 1; i <= cm.num_cuotas; i++) {
    if (calcularFechaCuota(fechaCompra, cm.dia_corte, i) <= hoy) cuotasPagadas++;
  }
  const totalPagado = cuotasPagadas * num(cm.monto_cuota);
  const falta = num(cm.monto_total) - totalPagado;
  const pct = (cuotasPagadas / cm.num_cuotas) * 100;
  const tipoTexto =
    cm.tipo === 'compartido'
      ? 'compartido 50/50'
      : cm.tipo === 'personal'
        ? 'personal'
        : cm.tipo === 'invitacion'
          ? 'invitación'
          : cm.tipo;
  const pagadorTxt =
    cm.split === 'pago-dani' ? 'paga dani' : cm.split === 'pago-alfredo' ? 'paga alfredo' : '';
  const completa = cuotasPagadas >= cm.num_cuotas;
  const proxima = !completa ? calcularFechaCuota(fechaCompra, cm.dia_corte, cuotasPagadas + 1) : null;
  const proxTxt = proxima ? ' · próxima ' + fechaCorta(proxima.toISOString().slice(0, 10)) : '';

  return (
    <div className="cm-card">
      <button className="cm-del" onClick={() => onDelete(cm.id)}>
        ✕
      </button>
      <div className="cm-top">
        <div className="cm-concepto">{cm.concepto}</div>
        <div className="cm-monto">{fmtDinero(num(cm.monto_total))}</div>
      </div>
      <div className="cm-meta">
        {cm.num_cuotas} cuotas de {fmtDinero(num(cm.monto_cuota))} ·{' '}
        <span className="cm-pill">
          {tipoTexto}
          {pagadorTxt ? ' · ' + pagadorTxt : ''}
        </span>
      </div>
      <div className="cm-bar">
        <div className="cm-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className={`cm-progreso ${completa ? 'completa' : ''}`}>
        {cuotasPagadas}/{cm.num_cuotas} cuotas pagadas ·{' '}
        {completa ? '¡completa! 🎉' : `faltan ${fmtDinero(falta)}${proxTxt}`}
      </div>
    </div>
  );
}

// ---- resumen comparativo (porta renderResumen) ----
function Resumen({ gastos, gastosPrev }: { gastos: Expense[]; gastosPrev: Expense[] }) {
  const compMes = sumaPorCat(gastos, 'compartido');
  const compPrev = sumaPorCat(gastosPrev, 'compartido');
  const persMes = sumaPorCat(gastos, 'personal');
  const persPrev = sumaPorCat(gastosPrev, 'personal');
  const totalCompMes = totalObj(compMes);
  const totalCompPrev = totalObj(compPrev);
  const totalPersMes = totalObj(persMes);
  const totalPersPrev = totalObj(persPrev);
  const ahorroMes = gastos.filter((g) => g.tipo === 'ahorro').reduce((s, g) => s + num(g.monto), 0);
  const ahorroPrev = gastosPrev.filter((g) => g.tipo === 'ahorro').reduce((s, g) => s + num(g.monto), 0);

  const delta = (actual: number, prev: number) => {
    if (prev === 0) return <div className="resumen-total-delta delta-igual">sin mes anterior</div>;
    const diff = actual - prev;
    const pct = Math.round((Math.abs(diff) / prev) * 100);
    if (Math.abs(diff) < 1) return <div className="resumen-total-delta delta-igual">igual que el mes pasado</div>;
    if (diff > 0) return <div className="resumen-total-delta delta-sube">▲ {pct}% más que el mes pasado</div>;
    return <div className="resumen-total-delta delta-baja">▼ {pct}% menos que el mes pasado</div>;
  };

  const tabla = (actual: Record<string, number>, prev: Record<string, number>, clase: string) => {
    const cats = Object.keys(actual).filter((c) => actual[c] > 0);
    if (cats.length === 0) return <div className="resumen-empty">sin gastos en este rubro este mes</div>;
    const maxVal = Math.max(...cats.map((c) => actual[c]));
    cats.sort((a, b) => actual[b] - actual[a]);
    return cats.map((cat) => {
      const val = actual[cat];
      const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
      const valPrev = prev[cat] || 0;
      let prevTxt: string;
      if (valPrev > 0) {
        const diff = val - valPrev;
        if (Math.abs(diff) < 1) prevTxt = 'igual que el mes pasado';
        else if (diff > 0) prevTxt = `${fmtDinero(diff)} más que el mes pasado`;
        else prevTxt = `${fmtDinero(Math.abs(diff))} menos que el mes pasado`;
      } else {
        prevTxt = 'nuevo este mes';
      }
      return (
        <div className="resumen-row" key={cat}>
          <div className="resumen-row-top">
            <span className="resumen-row-cat">{cat}</span>
            <span className="resumen-row-monto">{fmtDinero(val)}</span>
          </div>
          <div className="resumen-barra">
            <div className={`resumen-barra-fill ${clase}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="resumen-row-prev">{prevTxt}</div>
        </div>
      );
    });
  };

  const totalMes = totalCompMes + totalPersMes;
  const totalPrev = totalCompPrev + totalPersPrev;
  let ahorroDelta = '';
  if (ahorroMes > 0) {
    if (ahorroPrev > 0) {
      const diff = ahorroMes - ahorroPrev;
      if (Math.abs(diff) < 1) ahorroDelta = 'igual que el mes pasado';
      else if (diff > 0) ahorroDelta = `${fmtDinero(diff)} más que el mes pasado 💪`;
      else ahorroDelta = `${fmtDinero(Math.abs(diff))} menos que el mes pasado`;
    } else {
      ahorroDelta = 'primer mes ahorrando juntos';
    }
  }

  return (
    <div>
      <div className="resumen-totales">
        <div className="resumen-total-card comp">
          <div className="resumen-total-label">compartido</div>
          <div className="resumen-total-monto">{fmtDinero(totalCompMes)}</div>
          {delta(totalCompMes, totalCompPrev)}
        </div>
        <div className="resumen-total-card">
          <div className="resumen-total-label">personal (los dos)</div>
          <div className="resumen-total-monto">{fmtDinero(totalPersMes)}</div>
          {delta(totalPersMes, totalPersPrev)}
        </div>
      </div>

      <div className="resumen-section-title">gasto compartido por rubro</div>
      {tabla(compMes, compPrev, 'comp')}

      <div className="resumen-section-title">gasto personal por rubro</div>
      {tabla(persMes, persPrev, 'pers')}

      <div className="resumen-section-title">lo que ahorraron este mes 🐷</div>
      {ahorroMes > 0 ? (
        <div className="resumen-ahorro-card">
          <div className="resumen-ahorro-monto">{fmtDinero(ahorroMes)}</div>
          <div className="resumen-ahorro-delta">{ahorroDelta}</div>
        </div>
      ) : (
        <div className="resumen-empty">
          aún no han registrado ahorros este mes · regístralos con el + eligiendo &quot;ahorro&quot;
        </div>
      )}

      {totalPrev > 0 && totalMes > totalPrev ? (
        <div className="resumen-tip">
          este mes gastaron más que el anterior. miren juntos qué rubro creció y decidan dónde aflojar 🦝
        </div>
      ) : totalPrev > 0 && totalMes < totalPrev ? (
        <div className="resumen-tip">¡bajaron el gasto este mes! buen trabajo de equipo 🦝💕</div>
      ) : totalMes > 0 ? (
        <div className="resumen-tip">
          aquí pueden ver mes con mes en qué se va el dinero y armar su estrategia juntos 🦝
        </div>
      ) : null}
    </div>
  );
}

// ---- modales auxiliares ----
function SaldarModal({
  saldo,
  onClose,
  onSave,
}: {
  saldo: number;
  onClose: () => void;
  onSave: (nota: string) => void;
}) {
  const [nota, setNota] = useState('');
  const sub =
    saldo > 0
      ? `alfredo te paga ${fmtDinero(Math.abs(saldo))} y quedan a mano`
      : `le pagas ${fmtDinero(Math.abs(saldo))} a alfredo y quedan a mano`;
  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">quedamos a mano</div>
        <div className="modal-sub">{sub}</div>
        <div className="mfield">
          <div className="mfield-label">nota (opcional)</div>
          <input
            type="text"
            className="input"
            placeholder="ej. te transferí por el banco"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            cancelar
          </button>
          <button className="btn" onClick={() => onSave(nota)}>
            quedamos a mano
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorialModal({
  supabase,
  onClose,
}: {
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Settlement[] | null>(null);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('settlements').select('*').order('creado', { ascending: false });
      setItems((data as unknown as Settlement[]) ?? []);
    })();
  }, [supabase]);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">historial</div>
        <div className="modal-sub">cuando han quedado a mano</div>
        <div>
          {items === null ? (
            <div className="center-msg">cargando...</div>
          ) : items.length === 0 ? (
            <div className="center-msg">todavía no han saldado ninguna cuenta</div>
          ) : (
            items.map((s) => {
              const f = new Date(s.creado);
              const fecha = `${f.getDate()} ${meses[f.getMonth()]} ${f.getFullYear()}`;
              const quien = s.quien_pago === 'alfredo' ? 'alfredo pagó' : 'dani pagó';
              return (
                <div className="mov-item" key={s.id} style={{ boxShadow: 'none' }}>
                  <div className="mov-left">
                    <div className="mov-concepto">
                      {quien} {fmtDinero(num(s.monto))}
                    </div>
                    <div className="mov-meta">
                      {fecha}
                      {s.nota ? ' · ' + s.nota : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- tarjeta de proyecto (reusa el estilo de las tarjetas de "a meses") ----
function ProyectoCard({
  proyecto,
  total,
  activo,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  proyecto: Proyecto;
  total: number;
  activo: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const presup = proyecto.presupuesto != null ? num(proyecto.presupuesto) : 0;
  const pct = presup > 0 ? Math.min(100, (total / presup) * 100) : 0;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const dxy = activo ? diaXdeY(proyecto) : null;
  return (
    <div
      className={`cm-card${activo ? ' activo' : ''}`}
      style={{
        cursor: 'pointer',
        opacity: proyecto.archivado ? 0.6 : 1,
        ...(proyecto.color ? { background: colorProyecto(proyecto) } : {}),
      }}
      onClick={onOpen}
    >
      <div className="cm-top">
        <div className="cm-concepto">
          {emojiProyecto(proyecto)} {proyecto.nombre}
          {activo && <span className="viaje-activo-chip">en curso</span>}
        </div>
        <div className="cm-monto">{fmtDinero(total)}</div>
      </div>
      <div className="cm-meta">
        <span className="cm-pill">{proyecto.tipo === 'viaje' ? 'viaje' : 'proyecto'}</span>
        {activo && dxy ? ` · día ${dxy.x} de ${dxy.y}` : ''}
        {proyecto.archivado ? ' · archivado' : ''}
      </div>
      {presup > 0 && (
        <>
          <div className="cm-bar">
            <div className="cm-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className={`cm-progreso ${total >= presup ? 'completa' : ''}`}>
            {fmtDinero(total)} de {fmtDinero(presup)}
            {total >= presup ? ' · presupuesto alcanzado' : ` · quedan ${fmtDinero(presup - total)}`}
          </div>
        </>
      )}
      <div className="balance-actions" style={{ marginTop: 10 }} onClick={stop}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onEdit}>
          editar
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onArchive}>
          {proyecto.archivado ? 'reactivar' : 'archivar'}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onDelete}>
          borrar
        </button>
      </div>
    </div>
  );
}

function ProyectoModal({
  editing,
  onClose,
  onSubmit,
}: {
  editing: Proyecto | null;
  onClose: () => void;
  onSubmit: (
    values: {
      nombre: string;
      tipo: 'viaje' | 'proyecto';
      presupuesto: number | null;
      fecha_inicio: string | null;
      fecha_fin: string | null;
      emoji: string | null;
      color: string | null;
    },
    editingId: string | null,
  ) => void;
}) {
  const [nombre, setNombre] = useState(editing?.nombre ?? '');
  const [tipo, setTipo] = useState<'viaje' | 'proyecto'>(editing?.tipo ?? 'proyecto');
  const [presupuesto, setPresupuesto] = useState(
    editing?.presupuesto != null ? String(num(editing.presupuesto)) : '',
  );
  const [fechaInicio, setFechaInicio] = useState(editing?.fecha_inicio ?? '');
  const [fechaFin, setFechaFin] = useState(editing?.fecha_fin ?? '');
  const [emoji, setEmoji] = useState(editing?.emoji ?? '');
  const [color, setColor] = useState(editing?.color ?? '');

  function submit() {
    if (!nombre.trim()) return;
    const presNum = parseFloat(presupuesto);
    onSubmit(
      {
        nombre: nombre.trim(),
        tipo,
        presupuesto: presNum > 0 ? presNum : null,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        emoji: emoji.trim() || null,
        color: color || null,
      },
      editing?.id ?? null,
    );
  }

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{editing ? 'editar proyecto' : 'nuevo viaje o proyecto'}</div>
        <div className="modal-sub">para llevar la cuenta de un viaje o proyecto especial</div>
        <div className="mfield">
          <div className="mfield-label">nombre</div>
          <input
            type="text"
            className="input"
            placeholder="ej. Japón 2026"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </div>
        <div className="mfield">
          <div className="mfield-label">¿qué es?</div>
          <div className="chips-row">
            <button
              className={`chip${tipo === 'viaje' ? ' selected' : ''}`}
              onClick={() => setTipo('viaje')}
            >
              ✈️ viaje
            </button>
            <button
              className={`chip${tipo === 'proyecto' ? ' selected' : ''}`}
              onClick={() => setTipo('proyecto')}
            >
              proyecto
            </button>
          </div>
        </div>
        <div className="mfield">
          <div className="mfield-label">emoji (opcional)</div>
          <div className="emoji-grid">
            {EMOJIS_VIAJE.map((em) => (
              <button
                key={em}
                type="button"
                className={`emoji-cell${emoji === em ? ' selected' : ''}`}
                onClick={() => setEmoji((cur) => (cur === em ? '' : em))}
              >
                {em}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input"
            style={{ marginTop: 8 }}
            placeholder="o escribe uno 🦝"
            maxLength={4}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />
        </div>
        <div className="mfield">
          <div className="mfield-label">color (opcional)</div>
          <div className="color-row">
            {PALETA_PROYECTO.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot${color === c ? ' selected' : ''}`}
                style={{ background: c }}
                aria-label={`color ${c}`}
                onClick={() => setColor((cur) => (cur === c ? '' : c))}
              />
            ))}
          </div>
        </div>
        <div className="mfield">
          <div className="mfield-label">presupuesto (opcional)</div>
          <input
            type="number"
            className="input"
            placeholder="0"
            inputMode="decimal"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
          />
        </div>
        <div className="mfield">
          <div className="mfield-label">inicio (opcional)</div>
          <input
            type="date"
            className="input"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="mfield">
          <div className="mfield-label">fin (opcional)</div>
          <input
            type="date"
            className="input"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            cancelar
          </button>
          <button className="btn" onClick={submit}>
            guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function CupoModal({
  cupo,
  onClose,
  onSave,
}: {
  cupo: number;
  onClose: () => void;
  onSave: (monto: string) => void;
}) {
  const [monto, setMonto] = useState(String(cupo));
  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">cupo de aporte</div>
        <div className="modal-sub">cuánto aporta alfredo al mes</div>
        <div className="mfield">
          <div className="mfield-label">monto mensual</div>
          <input
            type="number"
            className="input"
            placeholder="15000"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            cancelar
          </button>
          <button className="btn" onClick={() => onSave(monto)}>
            guardar
          </button>
        </div>
      </div>
    </div>
  );
}
