'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { nombreMes, fmtDinero, fechaCorta } from '@/lib/helpers';
import type { Expense } from '@/lib/types';

/**
 * Pantalla de gastos — PORT DE REFERENCIA.
 *
 * Implementa lo esencial: navegación por mes, listado de movimientos y total.
 * La lógica completa de balance compartido / aporte / mensualidades /
 * settlements del index.html está documentada en PLAN.md para portarse en los
 * siguientes pasos (funciones calcularYrenderGastos, cargarSettlements, etc.).
 */
export default function GastosPage() {
  const supabase = createClient();
  const { me, profiles } = useAppData();
  const [mes, setMes] = useState(() => new Date());
  const [gastos, setGastos] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const y = mes.getFullYear();
    const m = mes.getMonth();
    const desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const ultimo = new Date(y, m + 1, 0).getDate();
    const hasta = `${y}-${String(m + 1).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`;
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false });
    setGastos((data as unknown as Expense[]) ?? []);
    setLoading(false);
  }, [supabase, mes]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('gastos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const cambiarMes = (delta: number) => {
    const d = new Date(mes);
    d.setMonth(d.getMonth() + delta);
    setMes(d);
  };

  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">cuentas claras</div>
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

        <div className="resumen-card">
          <div className="resumen-label">total del mes</div>
          <div className="resumen-monto">{fmtDinero(total)}</div>
          <div className="resumen-sub">{gastos.length} movimientos</div>
        </div>

        <div id="mov-list">
          {loading ? (
            <div className="mov-empty">cargando...</div>
          ) : gastos.length === 0 ? (
            <div className="mov-empty">no hay movimientos este mes</div>
          ) : (
            gastos.map((g) => (
              <div className="mov-item" key={g.id}>
                <div className="mov-info">
                  <div className="mov-concepto">{g.concepto}</div>
                  <div className="mov-meta">
                    {g.categoria} · {fechaCorta(g.fecha)} ·{' '}
                    {profiles[g.autor]?.nombre ?? 'alguien'}
                  </div>
                </div>
                <div className="mov-monto">{fmtDinero(Number(g.monto))}</div>
              </div>
            ))
          )}
        </div>

        {me && (
          <p className="hint" style={{ marginTop: 24 }}>
            Nota: el balance compartido, aportes, mensualidades y saldos se portan
            en el siguiente paso (ver PLAN.md).
          </p>
        )}
      </div>
    </div>
  );
}
