import Link from 'next/link';

/** Hub del bloque "Más". Porta screen-mas (hub-grid) con sus 4 tarjetas. */
const CARDS = [
  {
    href: '/tareas',
    cls: 'c3',
    title: 'tareas de la casa',
    sub: 'quién hace qué + menú',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 12 40 L 12 22 Q 12 18 16 18 L 34 18 Q 38 18 38 22 L 38 40" />
        <path d="M 8 40 L 42 40" />
        <circle cx="25" cy="11" r="3" />
        <path d="M 25 14 L 25 18" />
      </g>
    ),
  },
  {
    href: '/spicy',
    cls: 'c2',
    title: 'spicy',
    sub: 'solo para los dos 🌶️',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 25 8 Q 21 14 21 22 Q 21 34 25 42 Q 29 34 29 22 Q 29 14 25 8 Z" fill="#BB1F31" />
        <path d="M 25 8 Q 28 5 32 6" />
      </g>
    ),
  },
  {
    href: '/agenda',
    cls: 'c4',
    title: 'agenda',
    sub: 'conciertos, viajes, eventos',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="11" width="32" height="30" rx="3" />
        <path d="M 9 19 L 41 19" />
        <path d="M 17 7 L 17 14 M 33 7 L 33 14" />
        <circle cx="17" cy="27" r="1.8" fill="#BB1F31" />
        <circle cx="25" cy="27" r="1.8" fill="#BB1F31" />
        <circle cx="33" cy="27" r="1.8" fill="#BB1F31" />
        <circle cx="17" cy="34" r="1.8" fill="#BB1F31" />
      </g>
    ),
  },
  {
    href: '/perfil',
    cls: 'c1',
    title: 'nuestro perfil',
    sub: 'datos, fechas, categorías',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="25" cy="18" r="8" />
        <path d="M 10 42 C 10 32 17 28 25 28 C 33 28 40 32 40 42" />
      </g>
    ),
  },
];

export default function MasPage() {
  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <div className="section-title">más</div>
          <div className="section-sub">todo lo demás de pamaches</div>
        </div>
        <div className="hub-grid">
          {CARDS.map((c) => (
            <Link className="hub-card" href={c.href} key={c.href}>
              <div className={`hub-card-icon ${c.cls}`}>
                <svg width="26" height="26" viewBox="0 0 50 50">
                  {c.icon}
                </svg>
              </div>
              <div className="hub-card-text">
                <div className="hub-card-title">{c.title}</div>
                <div className="hub-card-sub">{c.sub}</div>
              </div>
              <div className="hub-card-arrow">›</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
