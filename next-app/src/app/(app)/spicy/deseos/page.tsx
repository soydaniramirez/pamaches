'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';

interface Deseo {
  id: string;
  autor: string;
  texto: string;
  cumplido: boolean;
}

/**
 * Lista de deseos spicy — "a ciegas". Porta cargarDeseos / renderDeseos /
 * toggleDeseo / borrarDeseo / saveDeseo.
 *
 * GATING (misma mejora de seguridad que la cápsula de preguntas): los deseos del
 * OTRO solo se CONSULTAN cuando yo ya tengo ≥1 propio. Mientras no tenga, la query
 * de los del otro NO se ejecuta → su texto nunca llega al cliente (a diferencia del
 * HTML, que los traía todos y solo los ocultaba en el DOM).
 */
export default function DeseosPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [mios, setMios] = useState<Deseo[]>([]);
  const [otros, setOtros] = useState<Deseo[]>([]);
  const [cargado, setCargado] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  const otroId = useCallback(
    (): string | null => Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null,
    [profiles, me],
  );

  const cargar = useCallback(async () => {
    if (!me) return;
    // 1) los míos (siempre)
    const { data: mine } = await supabase
      .from('spicy_deseos')
      .select('*')
      .eq('autor', me.id)
      .order('creado', { ascending: false });
    const misDeseos = (mine as unknown as Deseo[]) ?? [];
    setMios(misDeseos);

    // 2) los del otro: SOLO si tengo ≥1 propio (si no, NO se consultan → no llegan al cliente)
    const oId = otroId();
    if (misDeseos.length > 0 && oId) {
      const { data: theirs } = await supabase
        .from('spicy_deseos')
        .select('*')
        .eq('autor', oId)
        .order('creado', { ascending: false });
      setOtros((theirs as unknown as Deseo[]) ?? []);
    } else {
      setOtros([]);
    }
    setCargado(true);
  }, [supabase, me, otroId]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('spicy-deseos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spicy_deseos' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  async function toggleDeseo(d: Deseo) {
    const { error } = await supabase.from('spicy_deseos').update({ cumplido: !d.cumplido }).eq('id', d.id);
    if (error) {
      toast('no se pudo');
      return;
    }
    if (!d.cumplido) toast('deseo cumplido 🌶️');
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar este deseo?')) return;
    const { error } = await supabase.from('spicy_deseos').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('deseo borrado');
    await cargar();
  }

  async function save() {
    if (!me) return;
    const t = texto.trim();
    if (!t) {
      toast('escribe tu deseo');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('spicy_deseos').insert({ couple_id: me.couple_id, autor: me.id, texto: t });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTexto('');
    toast('deseo guardado');
    await cargar();
  }

  const oId = otroId();
  const otroNombre = oId ? profiles[oId]?.nombre ?? 'tu pamache' : 'tu pamache';

  const DeseoItem = ({ d, esMio }: { d: Deseo; esMio: boolean }) => (
    <div className="deseo-item">
      <button className={`deseo-check ${d.cumplido ? 'done' : ''}`} onClick={() => toggleDeseo(d)} />
      <div className="deseo-info">
        <div className={`deseo-text ${d.cumplido ? 'done' : ''}`}>{d.texto}</div>
      </div>
      {esMio && (
        <button className="deseo-del" onClick={() => borrar(d.id)}>
          ✕
        </button>
      )}
    </div>
  );

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/spicy" className="back-btn">
          ‹ spicy
        </Link>
        <div className="section-header">
          <div className="section-title">lista de deseos</div>
          <div className="section-sub">cosas que les gustaría probar</div>
        </div>
        <div className="repair-intro" style={{ background: 'var(--rosa-soft)' }}>
          cada quien escribe los suyos. solo ves los del otro cuando tú también has escrito alguno 👀
        </div>

        <div id="deseos-zona">
          {!cargado ? (
            <div className="center-msg">cargando...</div>
          ) : (
            <>
              <div className="deseo-grupo-label">los míos</div>
              {mios.length === 0 ? (
                <div className="center-msg">aún no has escrito ninguno · toca el +</div>
              ) : (
                mios.map((d) => <DeseoItem key={d.id} d={d} esMio />)
              )}

              <div className="deseo-grupo-label">los de {otroNombre}</div>
              {mios.length === 0 ? (
                <div className="deseo-locked">
                  escribe al menos un deseo tuyo para revelar los de {otroNombre} 👀
                </div>
              ) : otros.length === 0 ? (
                <div className="deseo-locked">{otroNombre} aún no ha escrito ninguno</div>
              ) : (
                otros.map((d) => <DeseoItem key={d.id} d={d} esMio={false} />)
              )}
            </>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">nuevo deseo</div>
            <div className="modal-sub">algo que te gustaría probar</div>
            <div className="mfield">
              <div className="mfield-label">tu deseo</div>
              <textarea
                placeholder="escribe aquí, sin pena..."
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
                {saving ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
