import Link from 'next/link';

/** Hub spicy. Porta screen-spicy (hub-grid) con sus 4 tarjetas. */
const CARDS = [
  {
    href: '/spicy/ruleta',
    cls: 'c2',
    title: 'ruleta de retos',
    sub: 'saca una idea al azar',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="25" cy="25" r="17" />
        <path d="M 25 8 L 25 25 L 37 33" />
        <circle cx="25" cy="25" r="3" fill="#BB1F31" />
      </g>
    ),
  },
  {
    href: '/spicy/deseos',
    cls: 'c1',
    title: 'lista de deseos',
    sub: 'a ciegas, se revelan juntos',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 25 40 C 25 40 8 28 8 17 C 8 11 12 8 17 8 C 21 8 25 12 25 16 C 25 12 29 8 33 8 C 38 8 42 11 42 17 C 42 28 25 40 25 40 Z" />
      </g>
    ),
  },
  {
    href: '/spicy/termometro',
    cls: 'c2',
    title: 'termómetro de ganas',
    sub: 'avísale sutil al otro',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round">
        <path d="M 21 8 L 21 30 Q 17 33 17 38 Q 17 43 25 43 Q 33 43 33 38 Q 33 33 29 30 L 29 8 Q 29 5 25 5 Q 21 5 21 8 Z" />
        <circle cx="25" cy="38" r="4" fill="#BB1F31" />
      </g>
    ),
  },
  {
    href: '/spicy/cartas',
    cls: 'c1',
    title: 'cartas spicy',
    sub: 'coqueteos guardados',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 8 14 L 42 14 L 42 38 L 8 38 Z" />
        <path d="M 8 14 L 25 28 L 42 14" />
      </g>
    ),
  },
];

export default function SpicyPage() {
  return (
    <div className="screen active">
      <div className="app-content">
        <Link href="/mas" className="back-btn">
          ‹ más
        </Link>
        <div className="section-header">
          <div className="section-title">spicy 🌶️</div>
          <div className="section-sub">un rincón solo para los dos</div>
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
