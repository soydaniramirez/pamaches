'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { REACCIONES, reaccionById, crearNovedad } from '@/lib/social';
import type { Notita, NotitaReaccion } from '@/lib/types';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaLarga(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Vista completa de notitas (porta screen-notitas: cargarTodasNotitas,
 * renderNotitaArchivo, archivarNotita, borrarNotita, reacciones).
 */
export default function NotitasPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [notitas, setNotitas] = useState<Notita[] | null>(null);
  const [reacciones, setReacciones] = useState<NotitaReaccion[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data: r } = await supabase.from('notita_reacciones').select('*');
    setReacciones((r as unknown as NotitaReaccion[]) ?? []);
    const { data } = await supabase.from('notitas').select('*').order('creado', { ascending: false });
    setNotitas((data as unknown as Notita[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('notitas-full')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notitas' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notita_reacciones' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const otroId = (): string | null =>
    Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  async function saveNotita() {
    const t = texto.trim();
    if (!t || !me) {
      setModalOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('notitas').insert({ couple_id: me.couple_id, autor: me.id, texto: t });
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setModalOpen(false);
    setTexto('');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'notita',
      texto: `${me.nombre} te dejó una notita`,
      destino: 'notitas',
    });
    await cargar();
    toast('notita dejada');
  }

  async function reaccionar(notitaId: string, tipo: string) {
    setPickerFor(null);
    if (!me) return;
    const existente = reacciones.find((r) => r.notita_id === notitaId && r.autor === me.id);
    let error;
    if (existente) {
      if (existente.tipo === tipo) {
        ({ error } = await supabase.from('notita_reacciones').delete().eq('id', existente.id));
      } else {
        ({ error } = await supabase.from('notita_reacciones').update({ tipo }).eq('id', existente.id));
      }
    } else {
      ({ error } = await supabase.from('notita_reacciones').insert({
        couple_id: me.couple_id,
        notita_id: notitaId,
        autor: me.id,
        tipo,
      }));
    }
    if (error) {
      toast('no se pudo');
      return;
    }
    await cargar();
  }

  async function archivar(id: string, archivar: boolean) {
    const { error } = await supabase.from('notitas').update({ archivada: archivar }).eq('id', id);
    if (error) {
      toast('no se pudo');
      return;
    }
    toast(archivar ? 'notita archivada' : 'notita de vuelta en el buzón');
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar esta notita? esto sí la elimina para siempre')) return;
    const { error } = await supabase.from('notitas').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('notita borrada');
    await cargar();
  }

  function NotitaCard({ n, archivada }: { n: Notita; archivada: boolean }) {
    const autor = profiles[n.autor];
    const reacs = reacciones.filter((r) => r.notita_id === n.id);
    return (
      <div className={`notita-archivo ${archivada ? 'archivada' : ''}`}>
        <div className="notita-from">{autor ? autor.nombre : 'alguien'} &rarr;</div>
        <div className="notita-text">{n.texto}</div>
        <div className="notita-when">{fechaLarga(n.creado)}</div>
        <div className="reaccion-bar">
          {reacs.map((r) => {
            const def = reaccionById(r.tipo);
            if (!def) return null;
            const esMia = r.autor === me?.id;
            return (
              <span
                key={r.id}
                className={`reaccion-chip${esMia ? ' mia' : ''}`}
                title={`${profiles[r.autor]?.nombre ?? 'alguien'}: ${def.label}`}
                onClick={esMia ? () => reaccionar(n.id, r.tipo) : undefined}
                dangerouslySetInnerHTML={{ __html: def.svg }}
              />
            );
          })}
          <button className="reaccion-add" onClick={() => setPickerFor(pickerFor === n.id ? null : n.id)} title="reaccionar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A4048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M 8 13 Q 12 17 16 13" />
              <circle cx="9" cy="10" r="0.8" fill="#5A4048" />
              <circle cx="15" cy="10" r="0.8" fill="#5A4048" />
            </svg>
          </button>
          {pickerFor === n.id && (
            <div className="reaccion-picker" style={{ position: 'static', display: 'inline-flex' }}>
              {REACCIONES.map((r) => (
                <button
                  key={r.id}
                  className="reaccion-opt"
                  title={r.label}
                  onClick={() => reaccionar(n.id, r.id)}
                  dangerouslySetInnerHTML={{ __html: r.svg }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="notita-actions">
          {archivada ? (
            <button className="notita-action-btn" onClick={() => archivar(n.id, false)}>
              regresar al buzón
            </button>
          ) : (
            <button className="notita-action-btn" onClick={() => archivar(n.id, true)}>
              archivar
            </button>
          )}
          <button className="notita-action-btn borrar" onClick={() => borrar(n.id)}>
            borrar
          </button>
        </div>
      </div>
    );
  }

  const activas = (notitas ?? []).filter((n) => !n.archivada);
  const archivadas = (notitas ?? []).filter((n) => n.archivada);

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/" className="back-btn">
          ‹ inicio
        </Link>
        <div className="section-header">
          <div className="section-title">todas las notitas</div>
          <div className="section-sub">nuestro buzón completo</div>
        </div>

        <div>
          <div className="notitas-grupo-label">en el buzón</div>
          {notitas === null ? (
            <div className="center-msg">cargando...</div>
          ) : activas.length === 0 ? (
            <div className="center-msg">no hay notitas en el buzón</div>
          ) : (
            activas.map((n) => <NotitaCard key={n.id} n={n} archivada={false} />)
          )}
        </div>

        {archivadas.length > 0 && (
          <div>
            <div className="notitas-grupo-label">archivadas</div>
            {archivadas.map((n) => (
              <NotitaCard key={n.id} n={n} archivada />
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => setModalOpen(true)}>
        +
      </button>

      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">dejar una notita</div>
            <div className="modal-sub">algo bonito para encontrar después</div>
            <textarea
              placeholder="escribe aquí, pamache..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={saveNotita} disabled={saving}>
                {saving ? <span className="spinner" /> : 'dejarla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
