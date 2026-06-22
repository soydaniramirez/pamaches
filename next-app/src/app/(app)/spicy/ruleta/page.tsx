'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';

interface Reto {
  id: string;
  texto: string;
}

/**
 * Ruleta de retos. Lista COMPARTIDA por pareja (no por autor). Porta cargarRuleta /
 * girarRuleta (animación: 12 cambios a 90ms y se detiene en uno al azar) / saveReto.
 * No hay borrar ni marcar.
 */
export default function RuletaPage() {
  const supabase = useRef(createClient()).current;
  const { me, toast } = useAppData();
  const [retos, setRetos] = useState<Reto[]>([]);
  const [actual, setActual] = useState<string | null>(null); // texto mostrado
  const [spinning, setSpinning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('spicy_retos').select('*');
    setRetos((data as unknown as Reto[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cargar]);

  function girar() {
    if (retos.length === 0) {
      toast('no hay retos · agrega el primero');
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSpinning(true);
    let vueltas = 0;
    const maxVueltas = 12;
    intervalRef.current = setInterval(() => {
      setActual(retos[Math.floor(Math.random() * retos.length)].texto);
      vueltas++;
      if (vueltas >= maxVueltas) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setActual(retos[Math.floor(Math.random() * retos.length)].texto);
        setSpinning(false);
      }
    }, 90);
  }

  async function save() {
    if (!me) return;
    const t = texto.trim();
    if (!t) {
      toast('escribe el reto');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('spicy_retos').insert({ couple_id: me.couple_id, texto: t, origen: 'pareja' });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTexto('');
    toast('reto agregado 🌶️');
    await cargar();
  }

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/spicy" className="back-btn">
          ‹ spicy
        </Link>
        <div className="section-header">
          <div className="section-title">ruleta de retos</div>
          <div className="section-sub">una idea picante al azar</div>
        </div>

        <div id="ruleta-zona">
          <div className={`ruleta-card${spinning ? ' ruleta-spinning' : ''}`}>
            {actual === null ? (
              <div className="ruleta-card-empty">
                toca &quot;girar la ruleta&quot;
                <br />
                para sacar un reto 🌶️
              </div>
            ) : (
              <div className="ruleta-card-text">&quot;{actual}&quot;</div>
            )}
          </div>
        </div>

        <div className="capsule-actions" style={{ marginTop: 16 }}>
          <button className="btn" style={{ flex: 1 }} onClick={girar}>
            girar la ruleta
          </button>
        </div>
        <div className="capsule-actions">
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setModalOpen(true)}>
            agregar un reto nuestro
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">agregar un reto</div>
            <div className="modal-sub">algo que quieran que salga en la ruleta</div>
            <div className="mfield">
              <div className="mfield-label">el reto</div>
              <textarea
                placeholder="escribe el reto picante..."
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
                {saving ? <span className="spinner" /> : 'agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
