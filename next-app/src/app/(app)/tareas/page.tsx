'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAppData } from '@/context/AppData';
import { inicioSemana, lunesISO, etiquetaSemana, SUGERENCIAS_TAREAS, MENU_BLOQUES } from '@/lib/tareas';
import type { Task, Meal, SuperItem, Profile } from '@/lib/types';

type Tab = 'tareas' | 'menu' | 'super';

export default function TareasPage() {
  const supabase = useRef(createClient()).current;
  const { me, profiles, toast } = useAppData();
  const [tab, setTab] = useState<Tab>('tareas');
  const [tareas, setTareas] = useState<Task[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [superList, setSuperList] = useState<SuperItem[]>([]);
  const [menuOffset, setMenuOffset] = useState(0);

  // modales
  const [tareaModal, setTareaModal] = useState(false);
  const [tTitulo, setTTitulo] = useState('');
  const [tAsignado, setTAsignado] = useState<string | null>(null);
  const [tTipo, setTTipo] = useState<'variable' | 'fija'>('variable');
  const [tRota, setTRota] = useState(false);
  const [savingT, setSavingT] = useState(false);
  const [comidaModal, setComidaModal] = useState(false);
  const [cPlatillo, setCPlatillo] = useState('');
  const [cBloque, setCBloque] = useState<string | null>(null);
  const [savingC, setSavingC] = useState(false);
  const [superModal, setSuperModal] = useState(false);
  const [sTexto, setSTexto] = useState('');
  const [savingS, setSavingS] = useState(false);

  const profilesArr = Object.values(profiles) as Profile[];
  const dani = profilesArr.find((p) => p.rol === 'dani') ?? null;
  const alfredo = profilesArr.find((p) => p.rol === 'alfredo') ?? null;
  const avatarClase = (id: string | null) => (id ? profiles[id]?.rol ?? 'nadie' : 'nadie');
  const avatarLetra = (id: string | null) => (id ? profiles[id]?.nombre.charAt(0).toUpperCase() ?? '?' : '?');
  const nombreDe = (id: string | null) => (id ? profiles[id]?.nombre ?? 'nadie' : 'nadie');

  // regenera tareas recurrentes para esta semana si faltan (porta regenerarRecurrentes)
  const regenerarRecurrentes = useCallback(
    async (lista: Task[], lunesStr: string) => {
      if (!me) return;
      const recurrentes = lista.filter((t) => t.recurrente);
      const porTitulo: Record<string, Task[]> = {};
      recurrentes.forEach((t) => {
        (porTitulo[t.titulo] ??= []).push(t);
      });
      for (const titulo of Object.keys(porTitulo)) {
        const versiones = porTitulo[titulo].sort((a, b) => (b.semana || '').localeCompare(a.semana || ''));
        const masReciente = versiones[0];
        if (versiones.some((v) => v.semana === lunesStr)) continue;
        let nuevoAsignado = masReciente.asignado;
        if (masReciente.rota && dani && alfredo) {
          const ultimo = masReciente.ultimo_turno || masReciente.asignado;
          nuevoAsignado = ultimo === dani.id ? alfredo.id : dani.id;
        }
        await supabase.from('tasks').insert({
          couple_id: me.couple_id,
          titulo: masReciente.titulo,
          asignado: nuevoAsignado,
          hecha: false,
          semana: lunesStr,
          recurrente: true,
          rota: masReciente.rota,
          ultimo_turno: nuevoAsignado,
        });
      }
    },
    [supabase, me, dani, alfredo],
  );

  const cargar = useCallback(async () => {
    const lunesStr = lunesISO(0);
    const { data: t1 } = await supabase.from('tasks').select('*').order('creado', { ascending: true });
    await regenerarRecurrentes((t1 as unknown as Task[]) ?? [], lunesStr);
    const { data: t2 } = await supabase.from('tasks').select('*').order('creado', { ascending: true });
    setTareas((t2 as unknown as Task[]) ?? []);
    const { data: m } = await supabase.from('meals').select('*').order('creado', { ascending: true });
    setMeals((m as unknown as Meal[]) ?? []);
    const { data: s } = await supabase.from('super').select('*').order('creado', { ascending: true });
    setSuperList((s as unknown as SuperItem[]) ?? []);
  }, [supabase, regenerarRecurrentes]);

  useEffect(() => {
    void cargar();
    const channel = supabase
      .channel('tareas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'super' }, () => cargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, cargar]);

  // ---- tareas ----
  async function toggleTarea(t: Task) {
    const { error } = await supabase.from('tasks').update({ hecha: !t.hecha }).eq('id', t.id);
    if (error) {
      toast('no se pudo actualizar');
      return;
    }
    if (!t.hecha) toast('tarea hecha 🦝');
    await cargar();
  }
  async function borrarTarea(t: Task) {
    const msg = t.recurrente
      ? '¿borrar esta tarea recurrente? dejará de repetirse cada semana'
      : '¿borrar esta tarea?';
    if (!confirm(msg)) return;
    let error;
    if (t.recurrente && me) {
      ({ error } = await supabase
        .from('tasks')
        .delete()
        .eq('couple_id', me.couple_id)
        .eq('titulo', t.titulo)
        .eq('recurrente', true));
    } else {
      ({ error } = await supabase.from('tasks').delete().eq('id', t.id));
    }
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('tarea borrada');
    await cargar();
  }
  function openTareaModal() {
    setTTitulo('');
    setTAsignado(null);
    setTTipo('variable');
    setTRota(false);
    setTareaModal(true);
  }
  async function saveTarea() {
    if (!me) return;
    const titulo = tTitulo.trim();
    if (!titulo) {
      toast('falta la tarea');
      return;
    }
    if (tTipo === 'fija' && tRota && !(dani && alfredo)) {
      toast('para rotar se necesitan los dos perfiles');
      return;
    }
    setSavingT(true);
    const esRecurrente = tTipo === 'fija';
    let asignado = tAsignado;
    if (esRecurrente && tRota && !asignado && dani) asignado = dani.id;
    const { error } = await supabase.from('tasks').insert({
      couple_id: me.couple_id,
      titulo,
      asignado,
      hecha: false,
      semana: lunesISO(0),
      recurrente: esRecurrente,
      rota: tRota,
      ultimo_turno: asignado,
    });
    setSavingT(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setTareaModal(false);
    toast(esRecurrente ? 'tarea fija agregada' : 'tarea agregada');
    await cargar();
  }

  // ---- comida ----
  async function saveComida() {
    if (!me) return;
    if (!cBloque) {
      toast('elige el bloque');
      return;
    }
    if (!cPlatillo.trim()) {
      toast('falta la preparación');
      return;
    }
    setSavingC(true);
    const { error } = await supabase.from('meals').insert({
      couple_id: me.couple_id,
      bloque: cBloque,
      platillo: cPlatillo.trim(),
      propuesto_por: me.id,
      semana: lunesISO(menuOffset),
    });
    setSavingC(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setComidaModal(false);
    setCPlatillo('');
    setCBloque(null);
    toast('agregado al menú');
    await cargar();
  }
  async function borrarComida(id: string) {
    if (!confirm('¿quitar esta preparación del menú?')) return;
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    toast('quitado del menú');
    await cargar();
  }

  // ---- super ----
  async function saveSuper() {
    if (!me) return;
    if (!sTexto.trim()) {
      toast('escribe qué falta');
      return;
    }
    setSavingS(true);
    const { error } = await supabase
      .from('super')
      .insert({ couple_id: me.couple_id, texto: sTexto.trim(), autor: me.id });
    setSavingS(false);
    if (error) {
      toast('no se pudo guardar');
      return;
    }
    setSuperModal(false);
    setSTexto('');
    toast('agregado a la lista');
    await cargar();
  }
  async function toggleSuper(s: SuperItem) {
    const { error } = await supabase.from('super').update({ comprado: !s.comprado }).eq('id', s.id);
    if (error) {
      toast('no se pudo');
      return;
    }
    await cargar();
  }
  async function borrarSuper(id: string) {
    const { error } = await supabase.from('super').delete().eq('id', id);
    if (error) {
      toast('no se pudo borrar');
      return;
    }
    await cargar();
  }
  async function limpiarComprados() {
    if (!me) return;
    if (!confirm('¿quitar todo lo comprado de la lista?')) return;
    const { error } = await supabase.from('super').delete().eq('couple_id', me.couple_id).eq('comprado', true);
    if (error) {
      toast('no se pudo');
      return;
    }
    toast('lista limpia 🦝');
    await cargar();
  }

  function fab() {
    if (tab === 'tareas') openTareaModal();
    else if (tab === 'menu') {
      setCPlatillo('');
      setCBloque(null);
      setComidaModal(true);
    } else {
      setSTexto('');
      setSuperModal(true);
    }
  }

  // ---- derivados ----
  const lunesStrHoy = inicioSemana().toISOString().slice(0, 10);
  const tareasVisibles = tareas.filter((t) => !t.semana || t.semana === lunesStrHoy);
  const tareasOrden = [...tareasVisibles.filter((t) => !t.hecha), ...tareasVisibles.filter((t) => t.hecha)];
  const mealsSemana = meals.filter((m) => m.semana === lunesISO(menuOffset));
  const superPend = superList.filter((s) => !s.comprado);
  const superComp = superList.filter((s) => s.comprado);

  const SuperRow = ({ s }: { s: SuperItem }) => (
    <div className="super-item">
      <button className={`super-check ${s.comprado ? 'done' : ''}`} onClick={() => toggleSuper(s)} />
      <div className="super-info">
        <div className={`super-text ${s.comprado ? 'done' : ''}`}>{s.texto}</div>
        <div className="super-by">lo agregó {nombreDe(s.autor)}</div>
      </div>
      <button className="super-del" onClick={() => borrarSuper(s.id)}>
        ✕
      </button>
    </div>
  );

  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/mas" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">tareas de la casa</div>
          <div className="section-sub">quién hace qué esta semana</div>
        </div>

        <div className="sub-tabs">
          {([
            ['tareas', 'tareas'],
            ['menu', 'menú'],
            ['super', 'súper'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={`sub-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {/* ===== TAREAS ===== */}
        {tab === 'tareas' && (
          <div>
            {tareasVisibles.length === 0 ? (
              <div className="mov-empty">
                <img src="/pamache.png" alt="" />
                aún no hay tareas esta semana.
                <br />
                toca el + para agregar la primera
              </div>
            ) : (
              tareasOrden.map((t) => (
                <div className="task-row" key={t.id}>
                  <div className={`task-avatar ${avatarClase(t.asignado)}`}>{avatarLetra(t.asignado)}</div>
                  <div className="task-info">
                    <div className={`task-title ${t.hecha ? 'done' : ''}`}>
                      {t.titulo}
                      {t.recurrente && <span className="task-badge">{t.rota ? 'rota' : 'fija'}</span>}
                    </div>
                    <div className="task-who">{t.asignado ? 'le toca a ' + nombreDe(t.asignado) : 'los dos'}</div>
                  </div>
                  <button className={`task-check ${t.hecha ? 'done' : ''}`} onClick={() => toggleTarea(t)} />
                  <button className="task-del" onClick={() => borrarTarea(t)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== MENÚ ===== */}
        {tab === 'menu' && (
          <div>
            <div className="month-strip">
              <button className="month-arrow" onClick={() => setMenuOffset((o) => o - 1)}>
                ‹
              </button>
              <div className="month-label">{etiquetaSemana(menuOffset)}</div>
              <button className="month-arrow" onClick={() => setMenuOffset((o) => o + 1)}>
                ›
              </button>
            </div>
            <div className="super-intro">
              {menuOffset === 0
                ? 'esta semana · organicen su meal prep'
                : menuOffset === 1
                  ? 'la próxima semana · planéenla con calma'
                  : menuOffset > 1
                    ? 'una semana futura'
                    : 'una semana pasada · para inspirarse 🦝'}
            </div>
            {MENU_BLOQUES.map((b) => {
              const items = mealsSemana.filter((m) => m.bloque === b.id);
              return (
                <div className="menu-bloque" key={b.id}>
                  <div className="menu-bloque-head">
                    <div className="menu-bloque-icon" dangerouslySetInnerHTML={{ __html: b.icon }} />
                    <div className="menu-bloque-title">{b.nombre}</div>
                    <div className="menu-bloque-count">{items.length || ''}</div>
                  </div>
                  {items.length === 0 ? (
                    <div className="meal-empty">nada todavía · toca el + para agregar</div>
                  ) : (
                    items.map((m) => (
                      <div className="meal-card" key={m.id}>
                        <div className="meal-info">
                          <div className="meal-platillo">{m.platillo}</div>
                          {m.propuesto_por && (
                            <div className="meal-by">propuesto por {nombreDe(m.propuesto_por)}</div>
                          )}
                        </div>
                        <button className="meal-del" onClick={() => borrarComida(m.id)}>
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== SÚPER ===== */}
        {tab === 'super' && (
          <div>
            <div className="super-intro">lo que falta comprar · cada quien va sumando</div>
            {superList.length === 0 ? (
              <div className="mov-empty">
                <img src="/pamache.png" alt="" />
                la lista está vacía.
                <br />
                toca el + para agregar lo primero
              </div>
            ) : (
              <>
                <div className="super-grupo-label">por comprar</div>
                {superPend.length === 0 ? (
                  <div className="meal-empty">¡todo comprado! 🦝</div>
                ) : (
                  superPend.map((s) => <SuperRow key={s.id} s={s} />)
                )}
                {superComp.length > 0 && (
                  <>
                    <div className="super-grupo-label">ya en el carrito</div>
                    {superComp.map((s) => (
                      <SuperRow key={s.id} s={s} />
                    ))}
                    <button className="super-clear" onClick={limpiarComprados}>
                      quitar los comprados de la lista
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <button className="fab" onClick={fab}>
        +
      </button>

      {/* ===== modal tarea ===== */}
      {tareaModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setTareaModal(false)}>
          <div className="modal">
            <div className="modal-title">nueva tarea</div>
            <div className="modal-sub">elige una sugerencia o escribe la tuya</div>
            <div className="mfield">
              <div className="mfield-label">sugerencias</div>
              <div id="tarea-sugerencias">
                {Object.keys(SUGERENCIAS_TAREAS).map((grupo) => (
                  <div className="sug-grupo" key={grupo}>
                    <div className="sug-grupo-label">{grupo}</div>
                    <div className="sug-chips">
                      {SUGERENCIAS_TAREAS[grupo].map((s) => (
                        <button
                          key={s}
                          className={`sug-chip${tTitulo === s ? ' selected' : ''}`}
                          onClick={() => setTTitulo(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">la tarea</div>
              <input
                type="text"
                className="input"
                placeholder="ej. sacar la basura"
                value={tTitulo}
                onChange={(e) => setTTitulo(e.target.value)}
              />
            </div>
            <div className="mfield">
              <div className="mfield-label">¿a quién le toca?</div>
              <div className="chips-row">
                {dani && (
                  <button
                    className={`chip${tAsignado === dani.id ? ' selected' : ''}`}
                    onClick={() => setTAsignado(dani.id)}
                  >
                    dani
                  </button>
                )}
                {alfredo && (
                  <button
                    className={`chip${tAsignado === alfredo.id ? ' selected' : ''}`}
                    onClick={() => setTAsignado(alfredo.id)}
                  >
                    alfredo
                  </button>
                )}
                <button className={`chip${tAsignado === null ? ' selected' : ''}`} onClick={() => setTAsignado(null)}>
                  los dos
                </button>
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">¿cada cuándo?</div>
              <div className="radio-row">
                <button
                  className={`radio-opt${tTipo === 'variable' ? ' selected' : ''}`}
                  onClick={() => {
                    setTTipo('variable');
                    setTRota(false);
                  }}
                >
                  una sola vez
                </button>
                <button className={`radio-opt${tTipo === 'fija' ? ' selected' : ''}`} onClick={() => setTTipo('fija')}>
                  se repite cada semana
                </button>
              </div>
            </div>
            {tTipo === 'fija' && (
              <div className="mfield">
                <div className="mfield-label">¿quieres que rote?</div>
                <div className="radio-row">
                  <button className={`radio-opt${!tRota ? ' selected' : ''}`} onClick={() => setTRota(false)}>
                    siempre la misma persona
                  </button>
                  <button className={`radio-opt${tRota ? ' selected' : ''}`} onClick={() => setTRota(true)}>
                    que rote entre los dos
                  </button>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setTareaModal(false)}>
                cancelar
              </button>
              <button className="btn" onClick={saveTarea} disabled={savingT}>
                {savingT ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== modal comida ===== */}
      {comidaModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setComidaModal(false)}>
          <div className="modal">
            <div className="modal-title">agregar al menú</div>
            <div className="modal-sub">una preparación para la semana</div>
            <div className="mfield">
              <div className="mfield-label">¿qué bloque?</div>
              <div className="chips-row">
                {MENU_BLOQUES.map((b) => (
                  <button
                    key={b.id}
                    className={`chip${cBloque === b.id ? ' selected' : ''}`}
                    onClick={() => setCBloque(b.id)}
                  >
                    {b.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfield">
              <div className="mfield-label">¿qué preparación?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. pollo al limón con verdes"
                value={cPlatillo}
                onChange={(e) => setCPlatillo(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setComidaModal(false)}>
                cancelar
              </button>
              <button className="btn" onClick={saveComida} disabled={savingC}>
                {savingC ? <span className="spinner" /> : 'guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== modal súper ===== */}
      {superModal && (
        <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && setSuperModal(false)}>
          <div className="modal">
            <div className="modal-title">agregar al súper</div>
            <div className="modal-sub">algo que falta comprar</div>
            <div className="mfield">
              <div className="mfield-label">¿qué falta?</div>
              <input
                type="text"
                className="input"
                placeholder="ej. jitomate, leche, papel..."
                value={sTexto}
                onChange={(e) => setSTexto(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSuperModal(false)}>
                cancelar
              </button>
              <button className="btn" onClick={saveSuper} disabled={savingS}>
                {savingS ? <span className="spinner" /> : 'agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
