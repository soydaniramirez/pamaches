/**
 * Biblioteca de ejercicios de pareja para "estamos raros".
 * Contenido HARDCODEADO portado VERBATIM del index.html (EJERCICIOS_CATS).
 * No resumir, reescribir ni reordenar.
 *
 * El ejercicio 'timeout' incluye un timer de 20 min: en el HTML eran un
 * `<div id="timer-zone">` + `<button onclick="iniciarTimer()">`. Aquí esa parte
 * interactiva se renderiza con un componente React (flag `timer`), y la prosa
 * (antes y después) se conserva idéntica en `html` y `htmlAfter`.
 */
export interface Ejercicio {
  id: string;
  titulo: string;
  sub: string;
  html: string;
  timer?: boolean;
  htmlAfter?: string;
}

export interface EjercicioCat {
  id: string;
  emoji: string;
  titulo: string;
  cuando: string;
  ejercicios: Ejercicio[];
}

export const EJERCICIOS_CATS: EjercicioCat[] = [
  {
    id: 'calmar',
    emoji: '🫧',
    titulo: 'para calmarnos',
    cuando: 'cuando la conversación se calentó',
    ejercicios: [
      {
        id: 'timeout',
        titulo: 'necesito 20 minutos',
        sub: 'una pausa suave',
        html: `<p>cuando una conversación se calienta, el cuerpo entra en alerta y ya no pensamos claro. una pausa no es huir — es darle tiempo al cuerpo de calmarse para volver a hablar bien.</p>
        <div class="paso">cómo se hace</div>
        <p>1. di "necesito 20 minutos" sin reproches.<br>2. sepárense, hagan algo que calme (caminar, respirar, agua).<br>3. no sigan rumiando el pleito en la cabeza.<br>4. al volver, retomen con calma.</p>`,
        timer: true,
        htmlAfter: `<div class="ejercicio-fuente">basado en la investigación de gottman sobre "flooding" (desbordamiento emocional)</div>`,
      },
      {
        id: 'respirar',
        titulo: 'respiración para bajar la intensidad',
        sub: 'calmar el cuerpo primero',
        html: `<p>antes de seguir hablando, bajen las pulsaciones. el cuerpo calmado piensa distinto al cuerpo en alerta.</p>
        <div class="paso">cómo se hace</div>
        <p>1. siéntense, los dos.<br>2. inhalen contando 4, sostengan contando 4, exhalen contando 6.<br>3. repítanlo 6 veces, sin hablar.<br>4. la exhalación más larga que la inhalación es lo que activa la calma.</p>
        <div class="ejercicio-fuente">la respiración con exhalación larga activa el sistema nervioso parasimpático</div>`,
      },
      {
        id: 'pausa',
        titulo: 'la palabra de pausa',
        sub: 'frenar antes de que escale',
        html: `<p>acuerden, en frío, una palabra clave (ej. "pausa", "trecua", o algo suyo). cuando cualquiera la diga durante una discusión, los dos paran de inmediato — sin pelear por quién la dijo.</p>
        <div class="paso">por qué funciona</div>
        <p>tener la palabra acordada de antemano quita la culpa de "rendirse". no es perder, es algo que ya pactaron como equipo para protegerse.</p>
        <div class="paso">la regla</div>
        <p>quien pide la pausa se compromete a retomar la conversación después — la pausa no es para evitar el tema, es para volver mejor.</p>
        <div class="ejercicio-fuente">técnica de "time-out estructurado" usada en terapia de parejas</div>`,
      },
    ],
  },
  {
    id: 'hablar',
    emoji: '💬',
    titulo: 'para hablar sin herir',
    cuando: 'cuando hay algo que decir',
    ejercicios: [
      {
        id: 'cnv',
        titulo: 'cómo decirlo sin herir',
        sub: 'comunicación no violenta',
        html: `<p>la comunicación no violenta propone hablar desde lo que uno siente, no desde el reproche. en vez de "tú siempre...", se usa una fórmula de 4 pasos:</p>
        <div class="paso">1. observación</div>
        <p>describe el hecho concreto, sin juzgar. "cuando llegaste tarde y no avisaste..."</p>
        <div class="paso">2. sentimiento</div>
        <p>di cómo te hizo sentir. "...me sentí poco importante y preocupada."</p>
        <div class="paso">3. necesidad</div>
        <p>nombra lo que necesitas. "necesito sentir que somos un equipo."</p>
        <div class="paso">4. petición</div>
        <p>pide algo concreto y amable. "¿podrías mandarme un mensaje si vas a llegar tarde?"</p>
        <div class="ejercicio-fuente">comunicación no violenta de marshall rosenberg</div>`,
      },
      {
        id: 'queja',
        titulo: 'quejarse sin culpar',
        sub: 'la queja sana vs. la crítica',
        html: `<p>gottman distingue la <b>queja</b> (sana) de la <b>crítica</b> (dañina). la queja habla de una situación; la crítica ataca a la persona.</p>
        <div class="paso">crítica</div>
        <p>"nunca ayudas, eres un desconsiderado." — ataca el carácter.</p>
        <div class="paso">queja sana</div>
        <p>"me sentí sola lavando todo hoy. me ayudaría que lo hiciéramos juntos." — habla del hecho y de lo que necesitas.</p>
        <div class="paso">la fórmula</div>
        <p>"me siento ___ cuando ___. necesito ___." sin las palabras "siempre" ni "nunca".</p>
        <div class="ejercicio-fuente">basado en el primer "jinete" de gottman: la crítica</div>`,
      },
      {
        id: 'jirafa',
        titulo: 'escucha de jirafa',
        sub: 'escuchar sin defenderte',
        html: `<p>en comunicación no violenta, la "jirafa" es el animal con el corazón más grande: escucha para entender, no para responder. el reto es escuchar al otro sin preparar tu defensa mientras habla.</p>
        <div class="paso">cómo se hace</div>
        <p>1. uno habla, el otro solo escucha — sin interrumpir.<br>2. el que escuchó repite lo que entendió: "lo que oí es que te sentiste ___, ¿es así?"<br>3. el que habló confirma o corrige.<br>4. cambian de turno.</p>
        <div class="paso">la clave</div>
        <p>no tienen que estar de acuerdo. solo tienen que demostrar que de verdad escucharon.</p>
        <div class="ejercicio-fuente">escucha empática, comunicación no violenta de rosenberg</div>`,
      },
    ],
  },
  {
    id: 'entender',
    emoji: '🔍',
    titulo: 'para entender qué pasa de verdad',
    cuando: 'cuando el enojo tapa algo más',
    ejercicios: [
      {
        id: 'emocion',
        titulo: 'encontrar la emoción debajo del enojo',
        sub: 'qué hay realmente',
        html: `<p>el enojo casi nunca es la emoción real — suele ser la que se ve por fuera. debajo casi siempre hay miedo, tristeza, o sentirse poco valorado. la terapia focalizada en emociones llama a esto encontrar la "emoción primaria".</p>
        <div class="paso">cómo se hace</div>
        <p>cada quien, en vez de decir "estoy enojado/a", se pregunta: "si quito el enojo, ¿qué hay debajo? ¿miedo de qué? ¿tristeza por qué?"</p>
        <div class="paso">y luego</div>
        <p>compártanlo así: "por fuera me vi enojada, pero por dentro lo que sentí fue miedo de no importarte." esa frase abre la puerta; el enojo solo la cierra.</p>
        <div class="ejercicio-fuente">terapia focalizada en emociones (EFT) de sue johnson</div>`,
      },
      {
        id: 'jinetes',
        titulo: 'los 4 jinetes',
        sub: 'reconocer lo que daña',
        html: `<p>gottman identificó 4 patrones que predicen el daño en una pareja. reconocerlos en el momento ayuda a frenarlos. cada uno tiene su antídoto:</p>
        <div class="paso">1. crítica</div>
        <p>atacar el carácter. <b>antídoto:</b> hablar de tu sentimiento y necesidad, no del defecto del otro.</p>
        <div class="paso">2. desprecio</div>
        <p>sarcasmo, burla, ojos en blanco. el más dañino. <b>antídoto:</b> construir aprecio y respeto, recordar lo que admiras.</p>
        <div class="paso">3. actitud defensiva</div>
        <p>poner pretextos, contraatacar. <b>antídoto:</b> aceptar aunque sea una parte de responsabilidad.</p>
        <div class="paso">4. evasión</div>
        <p>cerrarse, ignorar, irse. <b>antídoto:</b> pedir una pausa y volver, en lugar de desaparecer.</p>
        <div class="ejercicio-fuente">"los cuatro jinetes del apocalipsis" de john gottman</div>`,
      },
      {
        id: 'influencia',
        titulo: 'aceptar la influencia del otro',
        sub: 'ceder también es fuerza',
        html: `<p>gottman encontró que las relaciones sanas son las donde cada uno deja que el otro lo influya — toma en cuenta su opinión, cede, comparte el poder de decidir.</p>
        <div class="paso">la pregunta honesta</div>
        <p>"en este desacuerdo, ¿estoy buscando ganar, o estoy buscando entendernos?"</p>
        <div class="paso">cómo se practica</div>
        <p>busquen el punto del otro con el que SÍ pueden estar de acuerdo, aunque sea pequeño, y empiecen por ahí: "tienes razón en que ___." ceder en lo pequeño abre el acuerdo en lo grande.</p>
        <div class="ejercicio-fuente">"aceptar la influencia" — principio de gottman</div>`,
      },
    ],
  },
  {
    id: 'reconectar',
    emoji: '💞',
    titulo: 'para reconectar',
    cuando: 'cuando ya quieren volver a estar bien',
    ejercicios: [
      {
        id: 'recordar',
        titulo: 'recordar quiénes somos',
        sub: '3 momentos buenos juntos',
        html: `<p>cuando estamos enojados, el cerebro borra lo bueno y solo ve lo malo. este ejercicio lo contrarresta: túrnense para decir, en voz alta, tres momentos en que el otro los hizo sentir amados.</p>
        <div class="paso">la idea</div>
        <p>no es ganar la discusión — es recordar que están del mismo lado. después de decir los 3 momentos cada quien, casi siempre la conversación se siente distinta.</p>
        <div class="ejercicio-fuente">activar recuerdos positivos para contrarrestar el sesgo negativo</div>`,
      },
      {
        id: 'reparar',
        titulo: 'ejercicio de reparación',
        sub: 'procesar un pleito sin pelear',
        html: `<p>después de un pleito, gottman sugiere "procesar" lo que pasó sin volver a pelear. no se trata de quién tuvo razón, sino de entenderse. túrnense estas frases:</p>
        <div class="paso">1. cómo me sentí</div>
        <p>"yo me sentí ___." (solo el sentimiento, sin culpar)</p>
        <div class="paso">2. mi parte</div>
        <p>"reconozco que mi parte fue ___." (cada quien admite algo suyo)</p>
        <div class="paso">3. lo que necesito</div>
        <p>"la próxima vez me ayudaría que ___."</p>
        <div class="paso">4. cierre</div>
        <p>un gesto de cariño: un abrazo, un "te amo", tomarse de la mano.</p>
        <div class="ejercicio-fuente">"procesar una pelea" del método gottman</div>`,
      },
      {
        id: 'abrazo',
        titulo: 'abrazo de reconexión',
        sub: 'el contacto que calma',
        html: `<p>el contacto físico sostenido libera oxitocina y baja el cortisol — calma el cuerpo de los dos a la vez. sue johnson lo llama reconectar el vínculo a través del cuerpo, no solo de las palabras.</p>
        <div class="paso">cómo se hace</div>
        <p>abrácense de pie, sin prisa, al menos 20 segundos — más de lo que normalmente dura un abrazo. respiren juntos. no hace falta decir nada.</p>
        <div class="paso">por qué tan largo</div>
        <p>los primeros segundos el cuerpo aún está en guardia. al sostenerlo, el sistema nervioso entiende que están a salvo y se suelta.</p>
        <div class="ejercicio-fuente">terapia focalizada en emociones (EFT) — reconexión corporal</div>`,
      },
      {
        id: 'mapas',
        titulo: 'mapas de amor',
        sub: 'reconocerse de nuevo',
        html: `<p>gottman llama "mapas de amor" al conocimiento que tienes del mundo interno del otro. después de un mal momento, reconectar es volver a interesarse de verdad por quién es.</p>
        <div class="paso">cómo se hace</div>
        <p>túrnense para hacerse preguntas que renueven el mapa: "¿qué te tiene preocupado/a últimamente?", "¿qué te haría sentir más apoyado/a esta semana?", "¿con qué estás soñando ahora?"</p>
        <div class="paso">la clave</div>
        <p>escuchen con curiosidad real, como si apenas se conocieran. las personas cambian; el mapa hay que actualizarlo seguido.</p>
        <div class="ejercicio-fuente">"mapas de amor" — primer nivel de la "casa de la relación sólida" de gottman</div>`,
      },
    ],
  },
];
