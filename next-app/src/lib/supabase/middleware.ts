import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

/**
 * Refresca la sesión de Supabase en cada petición y protege las rutas
 * privadas. Si no hay usuario y la ruta no es pública, redirige a /login.
 *
 * Esto reemplaza la lógica de `arranque()` del index.html original
 * (que comprobaba la sesión en el cliente) por una protección a nivel de
 * servidor, que es más segura: el contenido protegido no se sirve sin sesión.
 */
const PUBLIC_PATHS = ['/login'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
          headers: Record<string, string> = {},
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // @supabase/ssr 0.12 pasa cabeceras anti-caché (Cache-Control: private,
          // no-store, …) que DEBEN escribirse en la respuesta que lleva el
          // Set-Cookie de sesión, para que un CDN/proxy no cachee la respuesta de
          // un usuario y se la sirva a otro. Las aplicamos al mismo response.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // IMPORTANTE: no introducir lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Si ya hay sesión y va al login, mándalo al home.
  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
