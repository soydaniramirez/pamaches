'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fmtFecha, tiempoJuntos, diasParaFecha } from '@/lib/helpers';
import { rotarPreguntaSiToca } from '@/lib/capsula';
import NotitasSection from '@/components/NotitasSection';
import Novedades from '@/components/Novedades';

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const { me, couple, fechas, loading, logout, reload, toast } = useAppData();
  const [pregunta, setPregunta] = useState('cargando...');

  const cargarPregunta = useCallback(async () => {
    // antes de mostrar, revisar si toca rotar (misma función compartida que la cápsula)
    await rotarPreguntaSiToca(supabase);
    const { data } = await supabase
      .from('questions')
      .select('texto')
      .eq('es_actual', true)
      .maybeSingle();
    setPregunta(data?.texto ? `"${data.texto}"` : 'aún no hay pregunta · entra a la cápsula');
  }, [supabase]);

  useEffect(() => {
    void cargarPregunta();
  }, [cargarPregunta]);

  if (loading) {
    return (
      <div id="loader">
        <Image src="/pamache.png" alt="pamaches" width={120} height={120} priority />
        <div className="loader-text">cargando...</div>
      </div>
    );
  }

  // próxima fecha importante dentro de 14 días (porta renderAvisoFecha, parte de fechas)
  const proxima = (() => {
    let best: { titulo: string; dias: number } | null = null;
    fechas.forEach((f) => {
      const d = diasParaFecha(f);
      if (d >= 0 && d <= 14 && (!best || d < best.dias)) {
        best = { titulo: f.titulo, dias: d };
      }
    });
    return best as { titulo: string; dias: number } | null;
  })();

  const cuenta = proxima
    ? proxima.dias === 0
      ? '¡es hoy! 🎉'
      : proxima.dias === 1
        ? 'es mañana'
        : `faltan ${proxima.dias} días`
    : '';

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="home-header">
          <div>
            <div className="home-hello">hola {me?.nombre ?? 'pamaches'}</div>
            <div className="home-date">{fmtFecha(new Date())}</div>
          </div>
          <div className="home-actions">
            <button
              className="profile-btn"
              onClick={() => {
                void reload();
                toast('actualizado 🦝');
              }}
              title="actualizar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A4048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 20 11 A 8 8 0 1 0 18 16" />
                <path d="M 20 5 L 20 11 L 14 11" />
              </svg>
            </button>
            <Novedades />
            <Link className="profile-btn" href="/perfil" title="perfil">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A4048" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M 4 21 C 4 16 8 14 12 14 C 16 14 20 16 20 21" />
              </svg>
            </Link>
            <button
              className="logout-btn"
              onClick={async () => {
                await logout();
                router.refresh();
              }}
            >
              salir
            </button>
          </div>
        </div>

        <div className="hero-pamache">
          <Image src="/pamache.png" alt="pamaches" width={160} height={160} />
          <div className="hero-caption">{tiempoJuntos(couple?.aniversario ?? null)}</div>
        </div>

        {proxima && (
          <div id="fecha-aviso">
            <div className="fecha-aviso-card">
              <div className="fecha-aviso-emoji">💕</div>
              <div className="fecha-aviso-text">
                <div className="fecha-aviso-titulo">{proxima.titulo}</div>
                <div className="fecha-aviso-cuenta">{cuenta}</div>
              </div>
            </div>
          </div>
        )}

        <NotitasSection />

        <div className="cards-grid">
          <Link className="mini-card" href="/gastos">
            <div className="mini-card-icon">
              <svg width="36" height="36" viewBox="0 0 50 50">
                <g fill="none" stroke="#BB1F31" strokeWidth="2" strokeLinecap="round">
                  <ellipse cx="20" cy="28" rx="12" ry="4" />
                  <ellipse cx="20" cy="25" rx="12" ry="4" />
                  <ellipse cx="30" cy="20" rx="10" ry="3.5" />
                  <ellipse cx="30" cy="17" rx="10" ry="3.5" />
                </g>
              </svg>
            </div>
            <div className="mini-card-title">cuentas claras</div>
            <div className="mini-card-meta">cosas de la casa</div>
          </Link>
          <Link className="mini-card" href="/planes">
            <div className="mini-card-icon">
              <svg width="36" height="36" viewBox="0 0 50 50">
                <g fill="none" stroke="#BB1F31" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 8 18 L 30 14 L 33 30 L 11 34 Z" />
                  <path d="M 14 22 L 26 19" />
                  <circle cx="18" cy="14" r="1.5" fill="#BB1F31" />
                </g>
              </svg>
            </div>
            <div className="mini-card-title">planes pamaches</div>
            <div className="mini-card-meta">nuestros momentos</div>
          </Link>
          <Link className="mini-card" href="/nosotros">
            <div className="mini-card-icon">
              <svg width="36" height="36" viewBox="0 0 50 50">
                <g fill="none" stroke="#BB1F31" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 8 14 Q 18 12 25 16 Q 32 12 42 14 L 42 36 Q 32 34 25 38 Q 18 34 8 36 Z" />
                  <path d="M 25 16 L 25 38" />
                </g>
              </svg>
            </div>
            <div className="mini-card-title">cápsula</div>
            <div className="mini-card-meta">lo que importa</div>
          </Link>
          <Link className="mini-card" href="/tareas">
            <div className="mini-card-icon">
              <svg width="36" height="36" viewBox="0 0 50 50">
                <g fill="none" stroke="#BB1F31" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 12 38 L 12 22 Q 12 18 16 18 L 34 18 Q 38 18 38 22 L 38 38" />
                  <path d="M 8 38 L 42 38" />
                  <circle cx="25" cy="10" r="2.5" />
                  <path d="M 25 12 L 25 18" />
                </g>
              </svg>
            </div>
            <div className="mini-card-title">tareas de la casa</div>
            <div className="mini-card-meta">quién hace qué</div>
          </Link>
        </div>

        <Link className="weekly-question" href="/nosotros/capsula" style={{ cursor: 'pointer', display: 'block' }}>
          <div className="weekly-question-label">pregunta de la semana</div>
          <div className="weekly-question-text">{pregunta}</div>
        </Link>
      </div>
    </div>
  );
}
