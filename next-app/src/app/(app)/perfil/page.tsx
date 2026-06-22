'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fmtDinero, tiempoJuntos, diasParaFecha } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';
import type { Fecha } from '@/lib/types';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

interface FechaModalState {
  open: boolean;
  editingId: string | null;
  titulo: string;
  fecha: string;
  repite: boolean;
  fija: boolean;
}

const FECHA_MODAL_CERRADO: FechaModalState = {
  open: false,
  editingId: null,
  titulo: '',
  fecha: '',
  repite: true,
  fija: false,
};

/**
 * Pantalla de Perfil / Configuración. Porta 1:1 la pantalla `screen-perfil`
 * del index.html: datos de la pareja, "los dos", fechas importantes (CRUD),
 * categorías y subcategorías de gastos (CRUD) y el cupo de aporte.
 *
 * Seguridad: todas las lecturas/escrituras usan el cliente Supabase
 * autenticado (cookies de sesión) → auth.uid() → my_couple_id() → RLS scopea
 * a la pareja. No se usa service role. Editar perfil/pareja es UPDATE.
 */
export default function PerfilPage() {
  const supabase = createClient();
  const {
    me,
    couple,
    profiles,
    categorias,
    subcategorias,
    fechas,
    cupo,
    loading,
    reload,
    toast,
  } = useAppData();

  const [nuevaCat, setNuevaCat] = useState('');
  const [subFor, setSubFor] = useState<string | null>(null);
  const [subVal, setSubVal] = useState('');
  const [fechaModal, setFechaModal] = useState<FechaModalState>(FECHA_MODAL_CERRADO);
  const [savingFecha, setSavingFecha] = useState(false);
  const [cupoModal, setCupoModal] = useState<{ open: boolean; monto: string }>({
    open: false,
    monto: '',
  });
  const [savingCupo, setSavingCupo] = useState(false);

  // Realtime: refrescar el estado global cuando cambian estas tablas
  // (equivale a las suscripciones del index.html sobre categorias/subcategorias/fechas).
  useEffect(() => {
    const channel = supabase
      .channel('perfil-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subcategorias' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fechas' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aporte_config' }, () => reload())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, reload]);

  if (loading) {
    return (
      <div id="loader">
        <Image src="/pamache.png" alt="pamaches" width={120} height={120} priority />
        <div className="loader-text">cargando...</div>
      </div>
    );
  }

  const otroId = (): string | null =>
    Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  // ---- categorías ----
  async function addCategoria() {
    const nombre = nuevaCat.trim().toLowerCase();
    if (!nombre || !me) return;
    if (categorias.some((c) => c.nombre.toLowerCase() === nombre)) {
      toast('esa categoría ya existe');
      return;
    }
    const orden = categorias.length + 1;
    const { error } = await supabase
      .from('categorias')
      .insert({ couple_id: me.couple_id, nombre, orden });
    if (error) {
      toast('no se pudo agregar');
      return;
    }
    setNuevaCat('');
    await reload();
    toast('categoría agregada');
  }

  async function borrarCategoria(id: string) {
    if (!confirm('¿borrar esta categoría? sus subcategorías también se borran. los gastos ya registrados no se borran')) {
      return;
    }
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    await reload();
    toast('categoría borrada');
  }

  // ---- subcategorías ----
  async function addSubcategoria(catId: string) {
    const nombre = subVal.trim().toLowerCase();
    if (!nombre || !me) return;
    const yaExiste = subcategorias
      .filter((s) => s.categoria_id === catId)
      .some((s) => s.nombre.toLowerCase() === nombre);
    if (yaExiste) {
      toast('esa subcategoría ya existe');
      return;
    }
    const { error } = await supabase
      .from('subcategorias')
      .insert({ couple_id: me.couple_id, categoria_id: catId, nombre });
    if (error) {
      toast('no se pudo agregar');
      return;
    }
    setSubFor(null);
    setSubVal('');
    await reload();
    toast('subcategoría agregada');
  }

  async function borrarSubcategoria(id: string) {
    if (!confirm('¿borrar esta subcategoría?')) return;
    const { error } = await supabase.from('subcategorias').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    await reload();
    toast('subcategoría borrada');
  }

  // ---- fechas ----
  function openFechaModal(f?: Fecha) {
    setFechaModal({
      open: true,
      editingId: f?.id ?? null,
      titulo: f?.titulo ?? '',
      fecha: f?.fecha ?? '',
      repite: f ? f.se_repite : true,
      fija: f?.fija ?? false,
    });
  }

  async function saveFecha() {
    const titulo = fechaModal.titulo.trim();
    const fecha = fechaModal.fecha;
    if (!titulo) {
      toast('falta el nombre');
      return;
    }
    if (!fecha) {
      toast('elige la fecha');
      return;
    }
    if (!me) return;
    setSavingFecha(true);
    let error;
    if (fechaModal.editingId) {
      ({ error } = await supabase
        .from('fechas')
        .update({ titulo, fecha, se_repite: fechaModal.repite })
        .eq('id', fechaModal.editingId));
    } else {
      ({ error } = await supabase
        .from('fechas')
        .insert({ couple_id: me.couple_id, titulo, fecha, se_repite: fechaModal.repite, fija: false }));
    }
    setSavingFecha(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    const eraNueva = !fechaModal.editingId;
    setFechaModal(FECHA_MODAL_CERRADO);
    await reload();
    toast(eraNueva ? 'fecha agregada' : 'fecha actualizada');
    if (eraNueva) {
      await crearNovedad(supabase, {
        coupleId: me.couple_id,
        autor: me.id,
        para: otroId(),
        tipo: 'fecha',
        texto: `${me.nombre} agregó una fecha: ${titulo}`,
        destino: 'perfil',
      });
    }
  }

  async function borrarFecha(id: string) {
    if (!confirm('¿borrar esta fecha?')) return;
    const { error } = await supabase.from('fechas').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    await reload();
    toast('fecha borrada');
  }

  // ---- cupo ----
  async function saveCupo() {
    const monto = parseFloat(cupoModal.monto);
    if (!monto || monto <= 0) {
      toast('monto inválido');
      return;
    }
    if (!me) return;
    setSavingCupo(true);
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
    setSavingCupo(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setCupoModal({ open: false, monto: '' });
    await reload();
    toast('cupo actualizado');
  }

  const personas = Object.values(profiles).sort((a, b) =>
    (a.rol ?? '').localeCompare(b.rol ?? ''),
  );
  const fechasOrdenadas = [...fechas].sort((a, b) => diasParaFecha(a) - diasParaFecha(b));

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">nuestro perfil</div>
          <div className="section-sub">los datos de los pamaches</div>
        </div>

        <div className="profile-hero">
          <Image src="/pamache.png" alt="pamaches" width={120} height={120} />
          <div className="profile-couple-name">{couple?.nombre ?? 'pamaches'}</div>
          <div className="profile-tiempo">{tiempoJuntos(couple?.aniversario ?? null)}</div>
        </div>

        {/* los dos */}
        <div className="profile-card">
          <div className="profile-card-title">los dos</div>
          <div>
            {personas.map((p) => (
              <div className="profile-row" key={p.id}>
                <span className="profile-row-label">
                  <span className="profile-pamache-tag" style={{ background: p.color || '#ccc' }} />
                  {p.nombre}
                </span>
                <span className="profile-row-value">{p.rol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* fechas importantes */}
        <div className="profile-card">
          <div className="profile-card-title">fechas importantes</div>
          <div>
            {fechasOrdenadas.length === 0 ? (
              <div className="center-msg">aún no hay fechas · agrega una abajo</div>
            ) : (
              fechasOrdenadas.map((f) => {
                const d = new Date(f.fecha + 'T00:00:00');
                let cuando = `${d.getDate()} de ${MESES[d.getMonth()]}`;
                if (!f.se_repite) cuando += ` de ${d.getFullYear()}`;
                return (
                  <div className="fecha-row" key={f.id} onClick={() => openFechaModal(f)}>
                    <div className="fecha-row-left">
                      <div className="fecha-row-titulo">
                        {f.titulo}
                        <span className="fecha-badge">{f.se_repite ? 'cada año' : 'una vez'}</span>
                      </div>
                      <div className="fecha-row-cuando">{cuando}</div>
                    </div>
                    <div className="fecha-row-right">
                      <span className="fecha-row-edit">editar</span>
                      {!f.fija && (
                        <button
                          className="fecha-row-del"
                          onClick={(e) => {
                            e.stopPropagation();
                            void borrarFecha(f.id);
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="add-inline" style={{ marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openFechaModal()}>
              + agregar fecha
            </button>
          </div>
        </div>

        {/* categorías de gastos */}
        <div className="profile-card">
          <div className="profile-card-title">categorías de gastos</div>
          <div>
            {categorias.map((c) => {
              const subs = c.id ? subcategorias.filter((s) => s.categoria_id === c.id) : [];
              return (
                <div key={c.id ?? c.nombre}>
                  <div className="edit-list-item">
                    <span className="edit-list-name" style={{ fontWeight: 600 }}>
                      {c.nombre}
                    </span>
                    {c.id && (
                      <button className="edit-list-del" onClick={() => borrarCategoria(c.id as string)}>
                        ✕
                      </button>
                    )}
                  </div>
                  {subs.map((s) => (
                    <div className="edit-list-item" key={s.id} style={{ paddingLeft: 16 }}>
                      <span
                        className="edit-list-name"
                        style={{ fontSize: '0.82rem', color: 'var(--tinta-soft)' }}
                      >
                        ↳ {s.nombre}
                      </span>
                      <button className="edit-list-del" onClick={() => borrarSubcategoria(s.id)}>
                        ✕
                      </button>
                    </div>
                  ))}
                  {c.id && subFor === c.id && (
                    <div className="add-inline" style={{ paddingLeft: 16, paddingTop: 4 }}>
                      <input
                        type="text"
                        placeholder="nueva subcategoría..."
                        value={subVal}
                        autoFocus
                        onChange={(e) => setSubVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void addSubcategoria(c.id as string);
                          if (e.key === 'Escape') {
                            setSubFor(null);
                            setSubVal('');
                          }
                        }}
                      />
                      <button onClick={() => addSubcategoria(c.id as string)}>agregar</button>
                    </div>
                  )}
                  {c.id && subFor !== c.id && (
                    <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                      <button
                        className="edit-list-del"
                        style={{
                          color: 'var(--tinta-soft)',
                          fontFamily: "'Caveat',cursive",
                          fontSize: '0.95rem',
                        }}
                        onClick={() => {
                          setSubFor(c.id as string);
                          setSubVal('');
                        }}
                      >
                        + subcategoría
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="add-inline">
            <input
              type="text"
              placeholder="nueva categoría..."
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addCategoria();
              }}
            />
            <button onClick={addCategoria}>agregar</button>
          </div>
        </div>

        {/* cupo de aporte */}
        <div className="profile-card">
          <div className="profile-card-title">cupo de aporte</div>
          <div className="profile-row">
            <span className="profile-row-label">aporte mensual de alfredo</span>
            <span className="profile-row-value">{fmtDinero(cupo)}</span>
          </div>
          <div className="add-inline" style={{ marginTop: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={() => setCupoModal({ open: true, monto: String(cupo) })}
            >
              cambiar cupo
            </button>
          </div>
        </div>
      </div>

      {/* ---- modal fecha ---- */}
      {fechaModal.open && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && setFechaModal(FECHA_MODAL_CERRADO)}
        >
          <div className="modal">
            <div className="modal-title">{fechaModal.editingId ? 'editar fecha' : 'agregar fecha'}</div>
            <div className="modal-sub">una fecha que les importa</div>
            <div className="mfield">
              <div className="mfield-label">¿qué se celebra?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. el día que nos conocimos"
                value={fechaModal.titulo}
                disabled={fechaModal.fija}
                onChange={(e) => setFechaModal((m) => ({ ...m, titulo: e.target.value }))}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿qué día?</div>
              <input
                type="date"
                className="input"
                value={fechaModal.fecha}
                onChange={(e) => setFechaModal((m) => ({ ...m, fecha: e.target.value }))}
              />
            </div>
            {!fechaModal.fija && (
              <div className="mfield">
                <div className="mfield-label">¿se repite?</div>
                <div className="radio-row">
                  <button
                    className={`radio-opt${fechaModal.repite ? ' selected' : ''}`}
                    onClick={() => setFechaModal((m) => ({ ...m, repite: true }))}
                  >
                    cada año
                  </button>
                  <button
                    className={`radio-opt${!fechaModal.repite ? ' selected' : ''}`}
                    onClick={() => setFechaModal((m) => ({ ...m, repite: false }))}
                  >
                    una sola vez
                  </button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setFechaModal(FECHA_MODAL_CERRADO)}>
                cancelar
              </button>
              <button className="btn" onClick={saveFecha} disabled={savingFecha}>
                {savingFecha ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- modal cupo ---- */}
      {cupoModal.open && (
        <div
          className="modal-overlay active"
          onClick={(e) => e.target === e.currentTarget && setCupoModal({ open: false, monto: '' })}
        >
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
                value={cupoModal.monto}
                onChange={(e) => setCupoModal((m) => ({ ...m, monto: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCupoModal({ open: false, monto: '' })}>
                cancelar
              </button>
              <button className="btn" onClick={saveCupo} disabled={savingCupo}>
                {savingCupo ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
