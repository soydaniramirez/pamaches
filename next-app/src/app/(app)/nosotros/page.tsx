import Link from 'next/link';

/**
 * Hub del bloque "Nosotros". Porta screen-nosotros (hub-grid) con sus 5 tarjetas.
 */
const CARDS = [
  {
    href: '/nosotros/capsula',
    cls: 'c1',
    title: 'cápsula emocional',
    sub: 'para hablar de lo que importa',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 8 14 Q 18 12 25 16 Q 32 12 42 14 L 42 38 Q 32 36 25 40 Q 18 36 8 38 Z" />
        <path d="M 25 16 L 25 40" />
      </g>
    ),
  },
  {
    href: '/nosotros/raros',
    cls: 'c2',
    title: 'estamos raros',
    sub: 'aquí nos ayudamos',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="25" cy="25" r="16" />
        <path d="M 18 22 Q 20 20 22 22" />
        <path d="M 28 22 Q 30 20 32 22" />
        <path d="M 18 32 Q 25 28 32 32" />
      </g>
    ),
  },
  {
    href: '/nosotros/futuro',
    cls: 'c3',
    title: 'futuro nosotros',
    sub: 'a dónde queremos llegar',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 8 35 Q 18 12 28 25 Q 36 35 44 14" />
        <path d="M 40 10 L 42 16 L 48 17 L 43 21 L 44 27 L 40 24 L 36 27 L 37 21 L 32 17 L 38 16 Z" fill="#BB1F31" />
      </g>
    ),
  },
  {
    href: '/nosotros/nonego',
    cls: 'c4',
    title: 'no negociables',
    sub: 'lo que sí y lo que no',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 12 8 L 38 8 L 38 42 L 12 42 Z" />
        <path d="M 18 18 L 32 18 M 18 25 L 32 25 M 18 32 L 26 32" />
      </g>
    ),
  },
  {
    href: '/nosotros/capsulatiempo',
    cls: 'c5',
    title: 'cápsula del tiempo',
    sub: 'cartas para abrirnos después',
    icon: (
      <g fill="none" stroke="#BB1F31" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 12 24 Q 12 10 25 10 Q 38 10 38 24" />
        <ellipse cx="25" cy="30" rx="18" ry="4" />
        <ellipse cx="25" cy="26" rx="18" ry="4" />
        <circle cx="25" cy="7" r="2" />
      </g>
    ),
  },
];

export default function NosotrosPage() {
  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">nosotros</div>
          <div className="section-sub">lo que nos hace pamaches</div>
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
