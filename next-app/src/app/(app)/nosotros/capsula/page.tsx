'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { fechaCorta } from '@/lib/helpers';
import { crearNovedad } from '@/lib/social';
import { rotarPreguntaSiToca, NIVELES_CONEXION, CATEGORIAS_PREGUNTA, type Nivel } from '@/lib/capsula';
import { hoyEnMexico } from '@/lib/fechas';
import type { Profile } from '@/lib/types';

interface Question {
  id: string;
  categoria: string | null;
  texto: string;
  semana: string | null;
  usada: boolean | null;
  es_actual: boolean | null;
  abierta: boolean | null;
}
interface Answer {
  id: string;
  question_id: string;
  autor: string;
  texto: string;
  tarde: boolean | null;
}
interface ArchivoItem {
  q: Question;
  answers: { autor: string; texto: string; tarde: boolean | null }[];
}

interface NivelInfo {
  completas: number;
  emoji: string;
  nombre: string;
  pct: number;
  subTexto: string;
  countTxt: string;
}

/**
 * Cápsula emocional — pregunta de la semana con respuestas, gating de revelado,
 * nivel de conexión y archivo. Porta 1:1 cargarCapsula / renderNivelConexion /
 * renderPreguntaActual / guardarRespuesta / nuevaPreguntaExtra / activarPregunta /
 * savePregunta / renderArchivo. La rotación reutiliza la función compartida.
 *
 * GATING (mejora de seguridad vs HTML): la respuesta del otro NO se trae al cliente
 * hasta que AMBOS respondieron — no solo se oculta en UI, no se consulta.
 */
export default function CapsulaPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();

  const [nivel, setNivel] = useState<NivelInfo | null>(null);
  const [pregunta, setPregunta] = useState<Question | null>(null);
  const [miRespuesta, setMiRespuesta] = useState<string | null>(null);
  const [miTarde, setMiTarde] = useState(false);
  const [otroRespondio, setOtroRespondio] = useState(false);
  const [otroTexto, setOtroTexto] = useState<string | null>(null); // solo si YO ya respondí
  const [otroTarde, setOtroTarde] = useState(false);
  const [archivo, setArchivo] = useState<ArchivoItem[]>([]);
  const [cargado, setCargado] = useState(false);

  const [respInput, setRespInput] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [catForm, setCatForm] = useState<string | null>(null);
  const [preguntaTexto, setPreguntaTexto] = useState('');
  const [savingPregunta, setSavingPregunta] = useState(false);

  const otroId = useCallback(
    (): string | null => Object.values(profiles).find((p) => p.id !== me?.id)?.id ?? null,
    [profiles, me],
  );

  // activar una pregunta concreta (porta activarPregunta; NO recarga)
  const activar = useCallback(
    async (qId: string) => {
      const { data: actual } = await supabase
        .from('questions')
        .select('id')
        .eq('es_actual', true)
        .maybeSingle();
      if (actual) {
        await supabase.from('questions').update({ es_actual: false }).eq('id', (actual as { id: string }).id);
      }
      await supabase
        .from('questions')
        .update({ es_actual: true, usada: true, semana: hoyEnMexico() })
        .eq('id', qId);
    },
    [supabase],
  );

  // activar una pregunta no usada al azar (porta nuevaPreguntaExtra; NO recarga)
  const activarRandomNoUsada = useCallback(
    async (silencioso: boolean): Promise<boolean> => {
      const { data: disp } = await supabase.from('questions').select('id').eq('usada', false);
      if (!disp || disp.length === 0) {
        if (!silencioso) toast('ya usaron todas · escriban una nueva');
        return false;
      }
      const elegida = disp[Math.floor(Math.random() * disp.length)] as { id: string };
      await activar(elegida.id);
      if (!silencioso) toast('nueva pregunta lista');
      return true;
    },
    [supabase, activar, toast],
  );

  const cargar = useCallback(async () => {
    if (!me) return;
    const oId = otroId();

    // ---- nivel de conexión: solo question_id + autor (sin texto) ----
    const { data: allAns } = await supabase.from('answers').select('question_id, autor');
    const porPregunta: Record<string, Set<string>> = {};
    (allAns ?? []).forEach((r) => {
      const row = r as { question_id: string; autor: string };
      (porPregunta[row.question_id] ??= new Set()).add(row.autor);
    });
    let completas = 0;
    Object.values(porPregunta).forEach((aut) => {
      if (aut.size >= 2) completas++;
    });
    let nivelActual = NIVELES_CONEXION[0];
    let nivelSiguiente: Nivel | null = null;
    for (let i = 0; i < NIVELES_CONEXION.length; i++) {
      if (completas >= NIVELES_CONEXION[i].min) {
        nivelActual = NIVELES_CONEXION[i];
        nivelSiguiente = NIVELES_CONEXION[i + 1] ?? null;
      }
    }
    let pct: number;
    let subTexto: string;
    if (nivelSiguiente) {
      const rango = nivelSiguiente.min - nivelActual.min;
      const avance = completas - nivelActual.min;
      pct = Math.min(100, (avance / rango) * 100);
      const faltan = nivelSiguiente.min - completas;
      subTexto = `${faltan} ${faltan === 1 ? 'pregunta' : 'preguntas'} más para "${nivelSiguiente.nombre}"`;
    } else {
      pct = 100;
      subTexto = 'llegaron al nivel más alto 💕';
    }
    setNivel({
      completas,
      emoji: nivelActual.emoji,
      nombre: nivelActual.nombre,
      pct,
      subTexto,
      countTxt: completas === 1 ? '1 pregunta respondida juntos' : `${completas} preguntas respondidas juntos`,
    });

    // ---- rotación (función compartida) ----
    await rotarPreguntaSiToca(supabase);

    // ---- pregunta actual ----
    let { data: actual } = await supabase.from('questions').select('*').eq('es_actual', true).maybeSingle();
    if (!actual) {
      // si no hay ninguna activa, activar una al azar (silencioso) y re-leer
      const activada = await activarRandomNoUsada(true);
      if (activada) {
        ({ data: actual } = await supabase.from('questions').select('*').eq('es_actual', true).maybeSingle());
      }
    }
    const q = (actual as unknown as Question) ?? null;
    setPregunta(q);

    if (q) {
      // mi respuesta (mía, sí la traigo) — con su flag "tarde"
      const { data: mia } = await supabase
        .from('answers')
        .select('texto, tarde')
        .eq('question_id', q.id)
        .eq('autor', me.id)
        .maybeSingle();
      const miTexto = mia ? (mia as { texto: string }).texto : null;
      setMiRespuesta(miTexto);
      setMiTarde(!!mia && (mia as { tarde: boolean | null }).tarde === true);

      // ¿quién respondió? solo autores, SIN texto
      const { data: autores } = await supabase.from('answers').select('autor').eq('question_id', q.id);
      const otroResp = !!oId && (autores ?? []).some((a) => (a as { autor: string }).autor === oId);
      setOtroRespondio(otroResp);

      // texto del otro: SOLO si YO ya respondí (y el otro respondió). El flag
      // `abierta` NO entra aquí: nunca es un atajo para ver el texto del otro.
      // Si no respondí, este fetch no ocurre y su texto jamás llega al cliente.
      if (miTexto && otroResp && oId) {
        const { data: otra } = await supabase
          .from('answers')
          .select('texto, tarde')
          .eq('question_id', q.id)
          .eq('autor', oId)
          .maybeSingle();
        setOtroTexto(otra ? (otra as { texto: string }).texto : null);
        setOtroTarde(!!otra && (otra as { tarde: boolean | null }).tarde === true);
      } else {
        setOtroTexto(null);
        setOtroTarde(false);
      }
    } else {
      setMiRespuesta(null);
      setMiTarde(false);
      setOtroRespondio(false);
      setOtroTexto(null);
      setOtroTarde(false);
    }

    // ---- archivo: preguntas usadas (excluye la actual del fetch de textos) ----
    const { data: respondidas } = await supabase
      .from('questions')
      .select('*')
      .eq('usada', true)
      .order('semana', { ascending: false });
    let archQ = supabase.from('answers').select('*');
    if (q) archQ = archQ.neq('question_id', q.id); // no traer respuestas de la pregunta viva (gating)
    const { data: archAns } = await archQ;
    const respByQ: Record<string, Answer[]> = {};
    (archAns ?? []).forEach((r) => {
      const row = r as unknown as Answer;
      (respByQ[row.question_id] ??= []).push(row);
    });
    const items: ArchivoItem[] = [];
    (respondidas ?? []).forEach((qq) => {
      const quest = qq as unknown as Question;
      if (q && quest.id === q.id) return; // saltar la actual
      const ans = respByQ[quest.id] ?? [];
      if (ans.length === 0) return;
      items.push({ q: quest, answers: ans.map((a) => ({ autor: a.autor, texto: a.texto, tarde: a.tarde })) });
    });
    setArchivo(items);
    setCargado(true);
  }, [supabase, me, otroId, activarRandomNoUsada]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('capsula-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  async function guardarRespuesta() {
    if (!me || !pregunta) return;
    const texto = respInput.trim();
    if (!texto) {
      toast('escribe tu respuesta');
      return;
    }
    setGuardando(true);
    // si la pregunta YA estaba abierta de todos modos, esta respuesta es tardía.
    const { error } = await supabase.from('answers').insert({
      question_id: pregunta.id,
      couple_id: me.couple_id,
      autor: me.id,
      texto,
      tarde: pregunta.abierta === true,
    });
    setGuardando(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setRespInput('');
    toast('respuesta guardada 💕');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'respuesta',
      texto: `${me.nombre} respondió la pregunta de la semana`,
      destino: 'capsula',
    });
    await cargar();
  }

  async function otraPregunta() {
    const ok = await activarRandomNoUsada(false);
    if (ok) await cargar();
  }

  // "abrir de todos modos": solo para quien YA respondió. Marca la pregunta como
  // abierta=true (lo que revela, EN MI vista, que el otro no alcanzó a responder, y
  // etiqueta como "tarde" su respuesta si llega después). NO trae el texto del otro
  // ni cambia nada para quien no ha respondido: su candado sigue cerrado.
  async function abrirDeTodosModos() {
    if (!me || !pregunta || !miRespuesta) return; // guardia: solo quien respondió
    const { error } = await supabase
      .from('questions')
      .update({ abierta: true })
      .eq('id', pregunta.id);
    if (error) {
      toast('no se pudo abrir');
      return;
    }
    toast('pregunta abierta · ya puedes ver el resultado');
    await crearNovedad(supabase, {
      coupleId: me.couple_id,
      autor: me.id,
      para: otroId(),
      tipo: 'respuesta',
      texto: `${me.nombre} abrió la pregunta de la semana · aún puedes responder`,
      destino: 'capsula',
    });
    await cargar();
  }

  async function savePregunta() {
    if (!me) return;
    const texto = preguntaTexto.trim();
    if (!texto) {
      toast('escribe la pregunta');
      return;
    }
    setSavingPregunta(true);
    const { data, error } = await supabase
      .from('questions')
      .insert({ couple_id: me.couple_id, categoria: catForm || 'amor', texto, origen: 'pareja', usada: false })
      .select()
      .single();
    if (error || !data) {
      setSavingPregunta(false);
      toast('no se pudo guardar');
      return;
    }
    await activar((data as { id: string }).id);
    setSavingPregunta(false);
    setModalOpen(false);
    setPreguntaTexto('');
    setCatForm(null);
    toast('pregunta lista 💕');
    await cargar();
  }

  const nombreOtro = (() => {
    const oId = otroId();
    return oId ? profiles[oId]?.nombre ?? 'tu pamache' : 'tu pamache';
  })();

  return (
    <div className="screen active">
      <div className="app-content capsule-screen">
        <Link href="/nosotros" className="back-btn">
          ‹ nosotros
        </Link>
        <div className="section-header">
          <div className="section-title">cápsula emocional</div>
          <div className="section-sub">para hablar de lo que importa</div>
        </div>

        {/* nivel de conexión */}
        {nivel && (
          <div id="nivel-conexion">
            <div className="nivel-card">
              <div className="nivel-top">
                <div className="nivel-nombre">
                  <span className="nivel-emoji">{nivel.emoji}</span>
                  {nivel.nombre}
                </div>
                <div className="nivel-count">{nivel.countTxt}</div>
              </div>
              <div className="nivel-bar">
                <div className="nivel-bar-fill" style={{ width: `${nivel.pct}%` }} />
              </div>
              <div className="nivel-sub">{nivel.subTexto}</div>
            </div>
          </div>
        )}

        {/* pregunta de la semana */}
        <div id="qow-container">
          {!cargado ? (
            <div className="center-msg">cargando...</div>
          ) : !pregunta ? (
            <div className="center-msg">no hay pregunta activa</div>
          ) : (
            <div className="qow-card">
              <span className="qow-tag">pregunta de la semana</span>
              <span className="qow-cat">{pregunta.categoria || ''}</span>
              <div className="qow-text">&quot;{pregunta.texto}&quot;</div>
              <div className="answer-zone">
                {/* mi respuesta */}
                {miRespuesta ? (
                  <div className="answer-block">
                    <div className="answer-author">tú respondiste{miTarde ? ' (tarde)' : ''}:</div>
                    <div className="answer-text">&quot;{miRespuesta}&quot;</div>
                  </div>
                ) : (
                  <div className="answer-block">
                    <div className="answer-author">tu respuesta:</div>
                    <div className="answer-mine-box">
                      <textarea
                        placeholder="escribe lo que sientes, pamache..."
                        value={respInput}
                        onChange={(e) => setRespInput(e.target.value)}
                      />
                      <button
                        className="btn btn-sm"
                        style={{ marginTop: 8, width: '100%' }}
                        onClick={guardarRespuesta}
                        disabled={guardando}
                      >
                        {guardando ? <span className="spinner" /> : 'responder'}
                      </button>
                    </div>
                  </div>
                )}
                {/* respuesta del otro (con gating: el texto SOLO llega si yo respondí) */}
                <div className="answer-block">
                  <div className="answer-author">{nombreOtro}:</div>
                  {otroRespondio ? (
                    miRespuesta ? (
                      <div className="answer-text">
                        &quot;{otroTexto}&quot;
                        {otroTarde && <span className="answer-tarde"> · respondió tarde</span>}
                      </div>
                    ) : pregunta.abierta ? (
                      <div className="answer-hidden">
                        {nombreOtro} ya respondió y abrió la pregunta · responde tú para revelarla
                      </div>
                    ) : (
                      <div className="answer-hidden">{nombreOtro} ya respondió · responde tú para revelar</div>
                    )
                  ) : miRespuesta && pregunta.abierta ? (
                    <div className="answer-hidden">{nombreOtro} no alcanzó a responder</div>
                  ) : (
                    <div className="answer-hidden">{nombreOtro} aún no responde</div>
                  )}
                </div>

                {/* abrir de todos modos: SOLO si yo respondí, el otro no, y no está abierta */}
                {miRespuesta && !otroRespondio && !pregunta.abierta && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 10, width: '100%' }}
                    onClick={abrirDeTodosModos}
                  >
                    abrir de todos modos
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* acciones */}
        <div className="capsule-actions">
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={otraPregunta}>
            otra pregunta
          </button>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => setModalOpen(true)}>
            escribir una
          </button>
        </div>

        {/* archivo */}
        <div className="repair-section-title">nuestro archivo</div>
        <div id="archivo-list">
          {!cargado ? null : archivo.length === 0 ? (
            <div className="center-msg">aún no hay preguntas respondidas en el archivo</div>
          ) : (
            archivo.map((it) => (
              <div className="archivo-item" key={it.q.id}>
                <div className="archivo-q">&quot;{it.q.texto}&quot;</div>
                <div className="archivo-meta">
                  {it.q.categoria || ''}
                  {it.q.semana ? ' · ' + fechaCorta(it.q.semana) : ''}
                </div>
                <div className="archivo-answers">
                  {it.answers.map((a, i) => (
                    <div className="archivo-ans" key={i}>
                      <b>{(profiles as Record<string, Profile>)[a.autor]?.nombre ?? 'alguien'}:</b> &quot;{a.texto}
                      &quot;
                      {a.tarde && <span className="answer-tarde"> · tarde</span>}
                    </div>
                  ))}
                  {/* si se abrió de todos modos y a alguien le faltó responder */}
                  {it.q.abierta &&
                    Object.values(profiles as Record<string, Profile>)
                      .filter((p) => !it.answers.some((a) => a.autor === p.id))
                      .map((p) => (
                        <div className="archivo-ans" key={`falta-${p.id}`}>
                          <b>{p.nombre}:</b> <span className="answer-tarde">no respondió</span>
                        </div>
                      ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* modal escribir pregunta */}
      {modalOpen && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-title">escribir una pregunta</div>
            <div className="modal-sub">algo que quieran preguntarse</div>
            <div className="mfield">
              <div className="mfield-label">categoría</div>
              <div className="chips-row">
                {CATEGORIAS_PREGUNTA.map((c) => (
                  <button
                    key={c}
                    className={`chip${catForm === c ? ' selected' : ''}`}
                    onClick={() => setCatForm(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">la pregunta</div>
              <textarea
                placeholder="¿qué se quieren preguntar?"
                value={preguntaTexto}
                onChange={(e) => setPreguntaTexto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                cancelar
              </button>
              <button className="btn" onClick={savePregunta} disabled={savingPregunta}>
                {savingPregunta ? <span className="spinner" /> : 'usar esta pregunta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
