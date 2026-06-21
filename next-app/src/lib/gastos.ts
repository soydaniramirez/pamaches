import type { Expense, Settlement } from '@/lib/types';

/** Helper numérico: los numeric de Postgres llegan como string. */
export function num(x: number | string | null | undefined): number {
  const n = typeof x === 'string' ? parseFloat(x) : (x ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** ¿quién pagó? a partir del campo split ('pago-dani' | 'pago-alfredo'). */
export function quienPago(split: string | null): 'dani' | 'alfredo' | null {
  if (split === 'pago-dani') return 'dani';
  if (split === 'pago-alfredo') return 'alfredo';
  return null;
}

/** Aporte de alfredo: suma de gastos tipo 'aporte' vs cupo. (porta calcularYrenderGastos parte 1) */
export function calcAporte(gastos: Expense[], cupo: number) {
  const aportado = gastos
    .filter((g) => g.tipo === 'aporte')
    .reduce((s, g) => s + num(g.monto), 0);
  const pct = cupo > 0 ? Math.min(100, (aportado / cupo) * 100) : 0;
  const completo = aportado >= cupo;
  const extra = aportado - cupo;
  let statusText: string;
  if (completo) {
    statusText =
      extra > 0
        ? `cupo completo · $${Math.round(extra).toLocaleString('es-MX')} de más este mes`
        : 'cupo completo este mes';
  } else {
    statusText = `falta $${Math.round(cupo - aportado).toLocaleString('es-MX')} para completar su renta`;
  }
  return { aportado, pct, completo, statusText };
}

/**
 * Balance compartido desde el punto de vista de dani.
 * + => alfredo le debe a dani; − => dani le debe a alfredo.
 * (porta calcularYrenderGastos parte 2)
 */
export function calcSaldoBase(gastos: Expense[]): {
  saldoNeto: number;
  rubros: Record<string, number>;
} {
  const rubros: Record<string, number> = {};
  let saldoNeto = 0;
  gastos.forEach((g) => {
    if (g.tipo !== 'compartido') return;
    const monto = num(g.monto);
    const cat = g.categoria || 'otros';
    if (!rubros[cat]) rubros[cat] = 0;
    const quien = quienPago(g.split);
    if (quien === 'dani') {
      saldoNeto += monto / 2;
      rubros[cat] += monto / 2;
    } else if (quien === 'alfredo') {
      saldoNeto -= monto / 2;
      rubros[cat] -= monto / 2;
    }
  });
  return { saldoNeto, rubros };
}

/**
 * Ajuste por settlements creados en el mes que se está viendo.
 * (porta aplicarSettlementsYrender)
 */
export function calcSaldados(settlements: Settlement[], mes: Date): number {
  const y = mes.getFullYear();
  const m = mes.getMonth();
  let saldados = 0;
  settlements.forEach((s) => {
    const sd = new Date(s.creado);
    if (sd.getFullYear() === y && sd.getMonth() === m) {
      if (s.quien_pago === 'alfredo') saldados += num(s.monto);
      else if (s.quien_pago === 'dani') saldados -= num(s.monto);
    }
  });
  return saldados;
}

/** Suma por categoría filtrando por tipo. (porta sumaPorCat) */
export function sumaPorCat(lista: Expense[], tipoFiltro: 'compartido' | 'personal'): Record<string, number> {
  const r: Record<string, number> = {};
  lista.forEach((g) => {
    if (g.tipo !== tipoFiltro) return;
    const cat = g.categoria || 'otros';
    r[cat] = (r[cat] || 0) + num(g.monto);
  });
  return r;
}

export function totalObj(obj: Record<string, number>): number {
  return Object.values(obj).reduce((s, v) => s + v, 0);
}
