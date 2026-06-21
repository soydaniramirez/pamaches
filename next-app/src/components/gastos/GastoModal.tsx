'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAppData } from '@/context/AppData';
import { fmtDinero, calcularFechaCuota } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';
import type { FutureMeta, Proyecto } from '@/lib/types';

interface GForm {
  categoria_id: string | null;
  categoria_nombre: string | null;
  subcategoria_id: string | null;
  pagador: 'dani' | 'alfredo' | null;
  tipo: string | null;
  meta_id: string | null;
  tipo_meses: string | null;
  proyecto_id: string | null;
}

const G_INICIAL: GForm = {
  categoria_id: null,
  categoria_nombre: null,
  subcategoria_id: null,
  pagador: null,
  tipo: null,
  meta_id: null,
  tipo_meses: null,
  proyecto_id: null,
};

function hoyISO() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

const TIPOS = [
  { val: 'compartido', label: 'compartido 50/50' },
  { val: 'aporte', label: 'cuenta al aporte' },
  { val: 'invitacion', label: 'yo invito 💝' },
  { val: 'personal', label: 'personal' },
  { val: 'ahorro', label: 'ahorro 🐷' },
  { val: 'meses', label: 'a meses 💳' },
];

const TIPOS_MESES = [
  { val: 'compartido', label: 'compartido 50/50' },
  { val: 'personal', label: 'personal' },
  { val: 'invitacion', label: 'yo invito 💝' },
];

/**
 * Modal "registrar gasto". Porta 1:1 openGastoModal/saveGasto del index.html,
 * incluyendo el caso especial de compra a meses (crea la fila padre en
 * compras_meses + N cuotas en expenses).
 */
export default function GastoModal({
  supabase,
  metas,
  proyectos,
  onClose,
  onSaved,
}: {
  supabase: SupabaseClient;
  metas: FutureMeta[];
  proyectos: Proyecto[];
  onClose: () => void;
  onSaved: (wasMeses: boolean) => void;
}) {
  const { me, profiles, categorias, subcategorias, reload, toast } = useAppData();
  const [g, setG] = useState<GForm>(G_INICIAL);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState(hoyISO);
  const [cuotas, setCuotas] = useState('');
  const [corte, setCorte] = useState('');
  const [saving, setSaving] = useState(false);

  // bloquear scroll del fondo mientras el modal está abierto (como los modales del HTML)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const otroId = (): string | null =>
    Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  const subs = g.categoria_id ? subcategorias.filter((s) => s.categoria_id === g.categoria_id) : [];
  const metasDisponibles = metas.filter((m) => m.tiene_meta && m.meta_monto);

  const montoN = parseFloat(monto);
  const cuotasN = parseInt(cuotas, 10);
  const showHintMeses = g.tipo === 'meses' && montoN > 0 && cuotasN >= 2;

  async function nuevaCategoriaInline() {
    if (!me) return;
    const nombre = (window.prompt('nombre de la nueva categoría:') || '').trim().toLowerCase();
    if (!nombre) return;
    if (categorias.some((c) => c.nombre.toLowerCase() === nombre)) {
      toast('esa categoría ya existe');
      return;
    }
    const { data, error } = await supabase
      .from('categorias')
      .insert({ couple_id: me.couple_id, nombre, orden: categorias.length + 1 })
      .select()
      .single();
    if (error) {
      toast('no se pudo agregar');
      return;
    }
    await reload();
    if (data) {
      setG((prev) => ({
        ...prev,
        categoria_id: (data as { id: string }).id,
        categoria_nombre: (data as { nombre: string }).nombre,
        subcategoria_id: null,
      }));
    }
    toast('categoría agregada');
  }

  async function nuevaSubcategoriaInline() {
    if (!me) return;
    if (!g.categoria_id) {
      toast('elige una categoría primero');
      return;
    }
    const nombre = (window.prompt('nombre de la nueva subcategoría:') || '').trim().toLowerCase();
    if (!nombre) return;
    if (subs.some((s) => s.nombre.toLowerCase() === nombre)) {
      toast('esa subcategoría ya existe');
      return;
    }
    const { data, error } = await supabase
      .from('subcategorias')
      .insert({ couple_id: me.couple_id, categoria_id: g.categoria_id, nombre })
      .select()
      .single();
    if (error) {
      toast('no se pudo agregar');
      return;
    }
    await reload();
    if (data) setG((prev) => ({ ...prev, subcategoria_id: (data as { id: string }).id }));
    toast('subcategoría agregada');
  }

  async function save() {
    if (!me) return;
    if (!concepto.trim()) {
      toast('falta el concepto');
      return;
    }
    if (!montoN || montoN <= 0) {
      toast('falta el monto');
      return;
    }
    if (!g.categoria_id && !g.categoria_nombre) {
      toast('elige una categoría');
      return;
    }
    if (!g.pagador) {
      toast('elige quién pagó');
      return;
    }
    if (!g.tipo) {
      toast('elige cómo cuenta');
      return;
    }

    // ---- compra a meses ----
    if (g.tipo === 'meses') {
      const diaCorte = parseInt(corte, 10);
      if (!cuotasN || cuotasN < 2 || cuotasN > 48) {
        toast('pon entre 2 y 48 mensualidades');
        return;
      }
      if (!diaCorte || diaCorte < 1 || diaCorte > 31) {
        toast('el día de corte va de 1 a 31');
        return;
      }
      if (!g.tipo_meses) {
        toast('elige cómo cuenta cada cuota');
        return;
      }
      const splitMeses = 'pago-' + g.pagador;
      const montoCuota = Math.round((montoN / cuotasN) * 100) / 100;
      setSaving(true);
      const { data: cm, error: e1 } = await supabase
        .from('compras_meses')
        .insert({
          couple_id: me.couple_id,
          autor: me.id,
          concepto: concepto.trim(),
          monto_total: montoN,
          num_cuotas: cuotasN,
          monto_cuota: montoCuota,
          dia_corte: diaCorte,
          categoria: g.categoria_nombre,
          subcategoria_id: g.subcategoria_id,
          tipo: g.tipo_meses,
          split: splitMeses,
          fecha_compra: fecha,
        })
        .select()
        .single();
      if (e1 || !cm) {
        setSaving(false);
        toast('no se pudo guardar la compra');
        return;
      }
      const compraId = (cm as { id: string }).id;
      const fechaCompra = new Date(fecha + 'T00:00:00');
      const cuotasInsertar = [];
      for (let i = 1; i <= cuotasN; i++) {
        const fc = calcularFechaCuota(fechaCompra, diaCorte, i);
        const yyyy = fc.getFullYear();
        const mm = String(fc.getMonth() + 1).padStart(2, '0');
        const dd = String(fc.getDate()).padStart(2, '0');
        cuotasInsertar.push({
          couple_id: me.couple_id,
          autor: me.id,
          concepto: `${concepto.trim()} · cuota ${i}/${cuotasN}`,
          monto: montoCuota,
          categoria: g.categoria_nombre,
          subcategoria_id: g.subcategoria_id,
          tipo: g.tipo_meses,
          split: splitMeses,
          fecha: `${yyyy}-${mm}-${dd}`,
          compra_meses_id: compraId,
          cuota_numero: i,
          cuota_total: cuotasN,
        });
      }
      const { error: e2 } = await supabase.from('expenses').insert(cuotasInsertar);
      setSaving(false);
      if (e2) {
        toast('se creó la compra pero fallaron las cuotas');
        await supabase.from('compras_meses').delete().eq('id', compraId);
        return;
      }
      toast('compra a meses registrada 💳');
      await crearNovedad(supabase, {
        coupleId: me.couple_id,
        autor: me.id,
        para: otroId(),
        tipo: 'gasto',
        texto: `${me.nombre} agregó una compra a ${cuotasN} meses: ${concepto.trim()}`,
        destino: 'gastos',
      });
      onSaved(true);
      return;
    }

    // ---- caso normal ----
    const split = g.tipo === 'aporte' ? 'pago-alfredo' : 'pago-' + g.pagador;
    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      couple_id: me.couple_id,
      autor: me.id,
      concepto: concepto.trim(),
      monto: montoN,
      categoria: g.categoria_nombre,
      subcategoria_id: g.subcategoria_id,
      tipo: g.tipo,
      split,
      fecha,
      meta_id: g.tipo === 'ahorro' ? g.meta_id : null,
      proyecto_id: g.proyecto_id,
    });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    const c = concepto.trim().toLowerCase();
    if (c.includes('pato') || c.includes('pequin')) toast('🦆 pato pequinés registrado');
    else if (g.tipo === 'ahorro') toast('ahorro registrado 🐷');
    else toast('movimiento guardado');
    onSaved(false);
  }

  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">registrar gasto</div>
        <div className="modal-sub">cuéntame qué pagamos</div>

        <div className="mfield">
          <div className="mfield-label">¿qué fue?</div>
          <input
            type="text"
            className="input"
            placeholder="ej. súper de la semana"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mfield">
          <div className="mfield-label">¿cuánto?</div>
          <input
            type="number"
            className="input"
            placeholder="0"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          {showHintMeses && (
            <div
              style={{
                fontFamily: "'Caveat',cursive",
                fontSize: '0.95rem',
                color: 'var(--vino)',
                marginTop: 5,
              }}
            >
              se divide en {cuotasN} cuotas de {fmtDinero(montoN / cuotasN)}
            </div>
          )}
        </div>

        <div className="mfield">
          <div className="mfield-label">categoría</div>
          <div className="chips-row">
            {categorias.map((c) => (
              <button
                key={c.id ?? c.nombre}
                className={`chip${g.categoria_id === c.id ? ' selected' : ''}`}
                onClick={() =>
                  setG((prev) => ({
                    ...prev,
                    categoria_id: c.id,
                    categoria_nombre: c.nombre,
                    subcategoria_id: null,
                  }))
                }
              >
                {c.nombre}
              </button>
            ))}
            <button className="chip" onClick={nuevaCategoriaInline}>
              + nueva
            </button>
          </div>
        </div>

        {g.categoria_id && (
          <div className="mfield">
            <div className="mfield-label">subcategoría</div>
            <div className="chips-row">
              {subs.map((s) => (
                <button
                  key={s.id}
                  className={`chip${g.subcategoria_id === s.id ? ' selected' : ''}`}
                  onClick={() =>
                    setG((prev) => ({
                      ...prev,
                      subcategoria_id: prev.subcategoria_id === s.id ? null : s.id,
                    }))
                  }
                >
                  {s.nombre}
                </button>
              ))}
              <button className="chip" onClick={nuevaSubcategoriaInline}>
                + nueva
              </button>
            </div>
          </div>
        )}

        <div className="mfield">
          <div className="mfield-label">¿quién pagó?</div>
          <div className="chips-row">
            {(['dani', 'alfredo'] as const).map((p) => (
              <button
                key={p}
                className={`chip${g.pagador === p ? ' selected' : ''}`}
                onClick={() => setG((prev) => ({ ...prev, pagador: p }))}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mfield">
          <div className="mfield-label">¿cómo cuenta?</div>
          <div className="chips-row">
            {TIPOS.map((t) => (
              <button
                key={t.val}
                className={`chip${g.tipo === t.val ? ' selected' : ''}`}
                onClick={() =>
                  setG((prev) => ({
                    ...prev,
                    tipo: t.val,
                    meta_id: t.val === 'ahorro' ? prev.meta_id : null,
                    tipo_meses: t.val === 'meses' ? prev.tipo_meses : null,
                  }))
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {g.tipo === 'meses' && (
          <>
            <div className="mfield">
              <div className="mfield-label">¿en cuántas mensualidades?</div>
              <input
                type="number"
                className="input"
                placeholder="3"
                inputMode="decimal"
                min={2}
                max={48}
                value={cuotas}
                onChange={(e) => setCuotas(e.target.value)}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">día de corte de la tarjeta (1-31)</div>
              <input
                type="number"
                className="input"
                placeholder="15"
                inputMode="decimal"
                min={1}
                max={31}
                value={corte}
                onChange={(e) => setCorte(e.target.value)}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cómo cuenta cada cuota?</div>
              <div className="chips-row">
                {TIPOS_MESES.map((t) => (
                  <button
                    key={t.val}
                    className={`chip${g.tipo_meses === t.val ? ' selected' : ''}`}
                    onClick={() => setG((prev) => ({ ...prev, tipo_meses: t.val }))}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {g.tipo === 'ahorro' && (
          <div className="mfield">
            <div className="mfield-label">¿a cuál meta va?</div>
            <div className="chips-row">
              <button
                className={`chip${g.meta_id === null ? ' selected' : ''}`}
                onClick={() => setG((prev) => ({ ...prev, meta_id: null }))}
              >
                sin meta
              </button>
              {metasDisponibles.map((m) => (
                <button
                  key={m.id}
                  className={`chip${g.meta_id === m.id ? ' selected' : ''}`}
                  onClick={() => setG((prev) => ({ ...prev, meta_id: m.id }))}
                >
                  {m.titulo}
                </button>
              ))}
            </div>
          </div>
        )}

        {g.tipo !== 'meses' && proyectos.length > 0 && (
          <div className="mfield">
            <div className="mfield-label">¿es de algún viaje o proyecto? (opcional)</div>
            <div className="chips-row">
              <button
                className={`chip${g.proyecto_id === null ? ' selected' : ''}`}
                onClick={() => setG((prev) => ({ ...prev, proyecto_id: null }))}
              >
                ninguno
              </button>
              {proyectos.map((p) => (
                <button
                  key={p.id}
                  className={`chip${g.proyecto_id === p.id ? ' selected' : ''}`}
                  onClick={() => setG((prev) => ({ ...prev, proyecto_id: p.id }))}
                >
                  {p.tipo === 'viaje' ? '✈️ ' : ''}
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mfield">
          <div className="mfield-label">{g.tipo === 'meses' ? 'fecha de la compra' : 'fecha'}</div>
          <input
            type="date"
            className="input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            cancelar
          </button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
