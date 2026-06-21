import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para componentes de cliente ("use client").
 * Lee las credenciales públicas desde variables de entorno en vez de
 * tenerlas hardcodeadas en el código (como ocurría en el index.html original).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
