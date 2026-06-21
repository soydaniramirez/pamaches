'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { crearNovedad } from '@/lib/social';
import { EJERCICIOS_CATS } from '@/lib/raros';

type Estado = 'verde' | 'amarillo' | 'rojo';

interface Mood {
  id: string;
  autor: string;
  estado: Estado | string | null;
  creado: string;
}

const OTRO_TXT: Record<string, string> = {
  verde: 'está bien hoy',
  amarillo: 'está medio raro hoy',
  rojo: 'no está bien hoy',
};
const MSG: Record<string, string> = {
  verde: 'me alegra que estés bien',
  amarillo: 'gracias por avisar',
  rojo: 'aquí estamos para ti',
};

/** Timer de 20 min (porta iniciarTimer). El botón/zone vivían dentro del ejercicio 'timeout'. */
function Timer() {
  const { toast } = useAppData();
  const [restante, setRestante] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  function iniciar() {
    if (ref.current) {
      clearInterval(ref.current);
      ref.current = null;
    }
    setDone(false);
    setRestante(20 * 60);
    ref.current = setInterval(() => {
      setRestante((prev) => {
        const next = (prev ?? 0) - 1;
        if (next < 0) {
          if (ref.current) clearInterval(ref.current);
          ref.current = null;
          setDone(true);
          toast('los 20 minutos terminaron');
          return null;
        }
        return next;
      });
    }, 1000);
    toast('timer iniciado · respiren');
  }

  return (
    <>
      {done ? (
        <>
          <div className="timer-display">listo 💕</div>
          <p style={{ textAlign: 'center', fontFamily: 'Caveat,cursive' }}>
            ya pueden volver a hablar con calma
          </p>
        </>
      ) : (
        restante !== null && (
          <div className="timer-display">
            {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}
          </div>
        )
      )}
      <button className="btn btn-sm" onClick={iniciar} style={{ marginTop: 6 }}>
        iniciar los 20 min
      </button>
    </>
  );
}

export default function RarosPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [moods, setMoods] = useState<Mood[]>([]);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [openEj, setOpenEj] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('moods')
      .select('*')
      .gte('creado', hoy + 'T00:00:00')
      .order('creado', { ascending: false });
    setMoods((data as unknown as Mood[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('raros-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moods' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const otroId = (): string | null =>
    Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  const miMood = me ? moods.find((m) => m.autor === me.id) : undefined;
  const oId = otroId();
  const otroMood = oId ? moods.find((m) => m.autor === oId) : undefined;
  const otroNombre = oId ? profiles[oId]?.nombre ?? 'tu pamache' : 'tu pamache';

  async function ponerSemaforo(estado: Estado) {
    if (!me) return;
    // insert (igual que el HTML: siempre inserta; la fila más reciente es "la de hoy")
    const { error } = await supabase.from('moods').insert({
      couple_id: me.couple_id,
      autor: me.id,
      estado,
    });
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    toast(MSG[estado]);
    if (estado === 'amarillo') {
      await crearNovedad(supabase, {
        coupleId: me.couple_id,
        autor: me.id,
        para: otroId(),
        tipo: 'semaforo',
        texto: `${me.nombre} está medio raro · pásate a verlo`,
        destino: 'raros',
      });
    } else if (estado === 'rojo') {
      await crearNovedad(supabase, {
        coupleId: me.couple_id,
        autor: me.id,
        para: otroId(),
        tipo: 'semaforo',
        texto: `${me.nombre} no está bien · pásate a verlo`,
        destino: 'raros',
      });
    }
    await cargar();
  }

  function clickCat(catId: string) {
    setOpenEj(null);
    setOpenCat((prev) => (prev === catId ? null : catId));
  }
  function clickEj(ejId: string) {
    setOpenEj((prev) => (prev === ejId ? null : ejId));
  }

  return (
    <div className="screen active">
      <div className="app-content repair-screen">
        <Link href="/nosotros" className="back-btn">
          ‹ nosotros
        </Link>
        <div className="section-header">
          <div className="section-title">estamos raros</div>
          <div className="section-sub">aquí nos ayudamos</div>
        </div>

        <div className="repair-intro">
          &quot;todas las parejas se desencuentran. lo que nos define es cómo volvemos a
          encontrarnos.&quot;
        </div>

        <div className="semaforo-title">¿cómo estás ahora?</div>
        <div className="semaforo">
          {(['verde', 'amarillo', 'rojo'] as Estado[]).map((c) => (
            <button
              key={c}
              className={`semaforo-light ${c}${miMood?.estado === c ? ' selected' : ''}`}
              onClick={() => ponerSemaforo(c)}
            >
              <span>{c === 'verde' ? 'bien' : c === 'amarillo' ? 'raro' : 'mal'}</span>
            </button>
          ))}
        </div>
        <div className="semaforo-estado">
          {otroMood
            ? `${otroNombre} ${OTRO_TXT[otroMood.estado as string] ?? ''}`
            : `${otroNombre} aún no marca cómo está hoy`}
        </div>

        <div className="repair-section-title">cuando lo necesiten</div>
        <div className="repair-cat-intro">elige según lo que está pasando ahora</div>

        <div>
          {EJERCICIOS_CATS.map((cat) => (
            <div className={`repair-cat${openCat === cat.id ? ' abierta' : ''}`} key={cat.id}>
              <div className="repair-cat-head" onClick={() => clickCat(cat.id)}>
                <div className="repair-cat-emoji">{cat.emoji}</div>
                <div className="repair-cat-info">
                  <div className="repair-cat-title">{cat.titulo}</div>
                  <div className="repair-cat-when">{cat.cuando}</div>
                </div>
                <div className="repair-cat-chevron">›</div>
              </div>
              <div className="repair-cat-body">
                {cat.ejercicios.map((ej) => (
                  <div key={ej.id}>
                    <button className="repair-btn" onClick={() => clickEj(ej.id)}>
                      <div className="repair-btn-text">
                        <div className="repair-btn-title">{ej.titulo}</div>
                        <div className="repair-btn-sub">{ej.sub}</div>
                      </div>
                    </button>
                    <div className={`ejercicio-contenido${openEj === ej.id ? ' show' : ''}`}>
                      <div dangerouslySetInnerHTML={{ __html: ej.html }} />
                      {ej.timer && <Timer />}
                      {ej.htmlAfter && <div dangerouslySetInnerHTML={{ __html: ej.htmlAfter }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
