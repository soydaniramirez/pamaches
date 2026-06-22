import type { MetadataRoute } from 'next';

/**
 * Web App Manifest — hace la app instalable (ícono en el home screen, arranque
 * standalone a pantalla completa, nombre y color de tema). Next.js sirve esto en
 * /manifest.webmanifest y enlaza <link rel="manifest"> automáticamente.
 *
 * Colores e identidad tomados del index.html original (--crema #FFF1F1, nombre
 * "pamaches"). NO declara service worker: la instalabilidad no lo requiere y esta
 * app es data en vivo (ver propuesta de SW, Fase B).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'pamaches — nuestro espacio',
    short_name: 'pamaches',
    description: 'nuestro espacio',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFF1F1',
    theme_color: '#FFF1F1',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
