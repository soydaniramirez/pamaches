'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { tiempoRelativo } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';

interface Ganas {
  id: string;
  autor: string;
  creado: string;
}

/**
 * Termómetro de ganas. Muestra si el OTRO marcó ganas en las últimas 12h.
 * Porta cargarTermometro / marcarGanas. La ventana de 12h es un rango ABSOLUTO
 * (Date.now() − 12h) — correcto, no es el bug de "hoy en UTC".
 */
export default function TermometroPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [recientes, setRecientes] = useState<Ganas[]>([]);

  const cargar = useCallback(async () => {
    const desde = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('spicy_termometro')
      .select('*')
      .gte('creado', desde)
      .order('creado', { ascending: false });
    setRecientes((data as unknown as Ganas[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('spicy-termo-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spicy_termometro' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const otroId = (): string | null => Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;
  const oId = otroId();
  const otroNombre = oId ? profiles[oId]?.nombre ?? 'tu pamache' : 'tu pamache';
  const otroConGanas = oId ? recientes.find((r) => r.autor === oId) : undefined;
  const yoConGanas = me ? recientes.find((r) => r.autor === me.id) : undefined;

  async function marcarGanas() {
    if (!me) return;
    const { error } = await supabase.from('spicy_termometro').insert({ couple_id: me.couple_id, autor: me.id });
    if (error) {
      toast('no se pudo');
      return;
    }
    toast('aviso enviado 😏');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'ganas',
      texto: `${me.nombre} anda con ganas 👀`,
      destino: 'spicy-termometro',
    });
    await cargar();
  }

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/spicy" className="back-btn">
          ‹ spicy
        </Link>
        <div className="section-header">
          <div className="section-title">termómetro de ganas</div>
          <div className="section-sub">avísale al otro sin tener que decirlo</div>
        </div>

        <div id="termometro-zona">
          <div className="termo-card">
            {otroConGanas ? (
              <div className="termo-estado activo">
                {otroNombre} anda con ganas 👀
                <br />
                {tiempoRelativo(otroConGanas.creado)}
              </div>
            ) : (
              <div className="termo-estado">por ahora, todo tranquilo</div>
            )}
            <button className="termo-btn" onClick={marcarGanas}>
              tengo ganas 🌶️
            </button>
            <div className="termo-hint">
              {yoConGanas ? 'ya le avisaste · puedes volver a hacerlo' : 'le llegará un aviso discreto a ' + otroNombre}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
