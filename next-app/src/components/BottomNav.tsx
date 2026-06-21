'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navegación inferior. Reemplaza el sistema de `data-screen` + `goTo()` del
 * original por rutas reales de Next.js. La pestaña activa se calcula a partir
 * del pathname, replicando el mapeo de sub-pantallas del index.html:
 *   - /nosotros/* -> "nosotros"
 *   - /mas/*, /perfil, /tareas, /agenda, /spicy/* -> "mas"
 */
const ITEMS = [
  {
    screen: 'home',
    href: '/',
    label: 'casa',
    icon: <path d="M 3 12 L 12 3 L 21 12 M 5 10 L 5 21 L 19 21 L 19 10" />,
  },
  {
    screen: 'gastos',
    href: '/gastos',
    label: 'gastos',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M 12 7 L 12 17 M 9 10 L 15 10 M 9 14 L 15 14" />
      </>
    ),
  },
  {
    screen: 'planes',
    href: '/planes',
    label: 'planes',
    icon: <path d="M 5 8 L 19 8 L 19 20 L 5 20 Z M 8 8 L 8 4 M 16 8 L 16 4 M 5 12 L 19 12" />,
  },
  {
    screen: 'nosotros',
    href: '/nosotros',
    label: 'nosotros',
    icon: (
      <path d="M 12 21 C 12 21 4 14 4 9 C 4 6 6 4 9 4 C 10.5 4 12 5 12 7 C 12 5 13.5 4 15 4 C 18 4 20 6 20 9 C 20 14 12 21 12 21 Z" />
    ),
  },
  {
    screen: 'mas',
    href: '/mas',
    label: 'más',
    icon: (
      <>
        <circle cx="5" cy="12" r="1.5" fill="#5A4048" />
        <circle cx="12" cy="12" r="1.5" fill="#5A4048" />
        <circle cx="19" cy="12" r="1.5" fill="#5A4048" />
      </>
    ),
  },
];

const MAS_PATHS = ['/mas', '/perfil', '/tareas', '/agenda', '/spicy'];

function activeScreen(pathname: string): string {
  if (pathname === '/' || pathname === '/notitas') return 'home';
  if (pathname.startsWith('/nosotros')) return 'nosotros';
  if (MAS_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return 'mas';
  if (pathname.startsWith('/gastos')) return 'gastos';
  if (pathname.startsWith('/planes')) return 'planes';
  return '';
}

export default function BottomNav() {
  const pathname = usePathname();
  const active = activeScreen(pathname);

  return (
    <nav className="bottom-nav" id="bottom-nav" style={{ display: 'flex' }}>
      {ITEMS.map((item) => (
        <Link
          key={item.screen}
          href={item.href}
          className={`nav-item${active === item.screen ? ' active' : ''}`}
        >
          <div className="nav-icon-wrap">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A4048"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {item.icon}
            </svg>
          </div>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
