'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fmtDinero } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';
import type { AgendaEvent } from '@/lib/types';
import { AGENDA_CATS, agendaCatById as catById, diasParaEvento } from '@/lib/agenda';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function fmtFechaAgenda(ev: AgendaEvent): string {
  const d = new Date(ev.fecha + 'T00:00:00');
  let txt = `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  if (d.getFullYear() !== new Date().getFullYear()) txt += ' ' + d.getFullYear();
  if (ev.hora) {
    const partes = ev.hora.split(':');
    const h = parseInt(partes[0], 10);
    const m = partes[1];
    const hh = h % 12 || 12;
    const ampm = h >= 12 ? 'pm' : 'am';
    txt += ` · ${hh}:${m} ${ampm}`;
  }
  return txt;
}
function cuentaRegresiva(ev: AgendaEvent): string {
  const dias = diasParaEvento(ev);
  if (dias === 0) return '¡es hoy!';
  if (dias === 1) return 'es mañana';
  if (dias === -1) return 'fue ayer';
  if (dias > 0) return 'faltan ' + dias + ' días';
  return 'hace ' + Math.abs(dias) + ' días';
}

interface ModalState {
  open: boolean;
  editingId: string | null;
  titulo: string;
  cat: string | null;
  fecha: string;
  hora: string;
  lugar: string;
  boleto: string;
  costo: string;
  nota: string;
}
const MODAL_CERRADO: ModalState = {
  open: false,
  editingId: null,
  titulo: '',
  cat: null,
  fecha: '',
  hora: '',
  lugar: '',
  boleto: '',
  costo: '',
  nota: '',
};

/**
 * Agenda — eventos con fecha (conciertos, viajes…). Porta 1:1 cargarAgenda /
 * renderAgenda / renderEventoCard / saveAgenda / borrarAgenda.
 */
export default function AgendaPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [archivoAbierto, setArchivoAbierto] = useState(false);
  const [m, setM] = useState<ModalState>(MODAL_CERRADO);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from('agenda')
      .select('*')
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
    setAgenda((data as unknown as AgendaEvent[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('agenda-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  const otroId = (): string | null => Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null;

  function openModal(ev?: AgendaEvent) {
    setM({
      open: true,
      editingId: ev?.id ?? null,
      titulo: ev?.titulo ?? '',
      cat: ev?.categoria ?? null,
      fecha: ev?.fecha ?? '',
      hora: ev?.hora ? ev.hora.slice(0, 5) : '',
      lugar: ev?.lugar ?? '',
      boleto: ev?.boleto_info ?? '',
      costo: ev?.costo != null ? String(ev.costo) : '',
      nota: ev?.nota ?? '',
    });
  }

  async function save() {
    if (!me) return;
    if (!m.titulo.trim()) {
      toast('falta el nombre');
      return;
    }
    if (!m.cat) {
      toast('elige una categoría');
      return;
    }
    if (!m.fecha) {
      toast('elige la fecha');
      return;
    }
    setSaving(true);
    const payload = {
      titulo: m.titulo.trim(),
      categoria: m.cat,
      fecha: m.fecha,
      hora: m.hora || null,
      lugar: m.lugar.trim() || null,
      boleto_info: m.boleto.trim() || null,
      costo: m.costo ? parseFloat(m.costo) : null,
      nota: m.nota.trim() || null,
    };
    let error;
    if (m.editingId) {
      ({ error } = await supabase.from('agenda').update(payload).eq('id', m.editingId));
    } else {
      ({ error } = await supabase.from('agenda').insert({ couple_id: me.couple_id, autor: me.id, ...payload }));
    }
    setSaving(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    const eraNuevo = !m.editingId;
    const titulo = m.titulo.trim();
    setM(MODAL_CERRADO);
    toast(eraNuevo ? 'evento agregado' : 'evento actualizado');
    if (eraNuevo) {
      await crearNovedad(supabase, {
        coupleId: me.couple_id,
        autor: me.id,
        para: otroId(),
        tipo: 'agenda',
        texto: `${me.nombre} agregó un evento: ${titulo}`,
        destino: 'agenda',
      });
    }
    await cargar();
  }

  async function borrar(id: string) {
    if (!confirm('¿borrar este evento?')) return;
    const { error } = await supabase.from('agenda').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('evento borrado');
    await cargar();
  }

  const proximos = agenda.filter((e) => diasParaEvento(e) >= 0);
  const pasados = agenda.filter((e) => diasParaEvento(e) < 0);

  const EventoCard = ({ e }: { e: AgendaEvent }) => {
    const cat = catById(e.categoria);
    const dias = diasParaEvento(e);
    const claseExtra = dias < 0 ? 'pasado' : dias === 0 ? 'hoy' : dias <= 7 ? 'pronto' : '';
    const detalle: string[] = [];
    if (e.lugar) detalle.push(e.lugar);
    if (e.boleto_info) detalle.push('boleto: ' + e.boleto_info);
    if (e.costo) detalle.push(fmtDinero(Number(e.costo)));
    if (e.nota) detalle.push(e.nota);
    return (
      <div className={`agenda-card ${claseExtra}`}>
        <div className="ag-actions">
          <button className="ag-edit" onClick={() => openModal(e)}>
            editar
          </button>
          <button className="ag-del" onClick={() => borrar(e.id)}>
            ✕
          </button>
        </div>
        <div className="ag-icon-box" dangerouslySetInnerHTML={{ __html: cat.svg }} />
        <div className="ag-body">
          <div className="ag-titulo">{e.titulo}</div>
          <div className="ag-cuenta">{cuentaRegresiva(e)}</div>
          <div className="ag-info">{fmtFechaAgenda(e)}</div>
          {detalle.length > 0 && <div className="ag-detalle">{detalle.join(' · ')}</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/mas" className="back-btn">
          ‹ más
        </Link>
        <div className="section-header">
          <div className="section-title">agenda</div>
          <div className="section-sub">eventos que no se nos pueden olvidar</div>
        </div>

        <div id="agenda-list">
          {agenda.length === 0 ? (
            <div className="mov-empty">
              <img src="/pamache.png" alt="" />
              aún no hay nada en la agenda.
              <br />
              toca el + para agregar el primer evento
            </div>
          ) : (
            <>
              {proximos.length === 0 ? (
                <div className="center-msg">
                  no hay eventos próximos · todos los anteriores quedaron en &quot;ya fuimos&quot;
                </div>
              ) : (
                <>
                  <div className="agenda-seccion">próximos</div>
                  {proximos.map((e) => (
                    <EventoCard key={e.id} e={e} />
                  ))}
                </>
              )}
              {pasados.length > 0 && (
                <>
                  <button className="agenda-archivo-toggle" onClick={() => setArchivoAbierto((s) => !s)}>
                    {archivoAbierto ? 'ocultar' : 'ver'} ya fuimos ({pasados.length}) {archivoAbierto ? '▴' : '▾'}
                  </button>
                  {archivoAbierto && [...pasados].reverse().map((e) => <EventoCard key={e.id} e={e} />)}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => openModal()}>
        +
      </button>

      {m.open && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setM(MODAL_CERRADO)}>
          <div className="modal">
            <div className="modal-title">{m.editingId ? 'editar evento' : 'nuevo evento'}</div>
            <div className="modal-sub">algo que ya compraron o tienen fecha fija</div>
            <div className="mfield">
              <div className="mfield-label">¿qué es?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. concierto de coldplay"
                value={m.titulo}
                onChange={(e) => setM((s) => ({ ...s, titulo: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">categoría</div>
              <div className="chips-row">
                {AGENDA_CATS.map((c) => (
                  <button
                    key={c.id}
                    className={`chip${m.cat === c.id ? ' selected' : ''}`}
                    onClick={() => setM((s) => ({ ...s, cat: c.id }))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">¿qué día?</div>
              <input type="date" className="input" value={m.fecha} onChange={(e) => setM((s) => ({ ...s, fecha: e.target.value }))} />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿a qué hora? (opcional)</div>
              <input type="time" className="input" value={m.hora} onChange={(e) => setM((s) => ({ ...s, hora: e.target.value }))} />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿dónde? (opcional)</div>
              <input type="text" className="input" placeholder="ej. foro sol" value={m.lugar} onChange={(e) => setM((s) => ({ ...s, lugar: e.target.value }))} />
            </div>
            <div className="mfield">
              <div className="mfield-label">info del boleto (opcional)</div>
              <input type="text" className="input" placeholder="número, código, link..." value={m.boleto} onChange={(e) => setM((s) => ({ ...s, boleto: e.target.value }))} />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cuánto costó? (opcional)</div>
              <input type="number" className="input" placeholder="0" inputMode="decimal" value={m.costo} onChange={(e) => setM((s) => ({ ...s, costo: e.target.value }))} />
            </div>
            <div className="mfield">
              <div className="mfield-label">nota (opcional)</div>
              <input type="text" className="input" placeholder="algún detalle..." value={m.nota} onChange={(e) => setM((s) => ({ ...s, nota: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setM(MODAL_CERRADO)}>
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
