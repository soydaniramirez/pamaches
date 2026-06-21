import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppDataProvider } from '@/context/AppData';
import BottomNav from '@/components/BottomNav';

/**
 * Layout de las pantallas autenticadas. Verifica la sesión EN EL SERVIDOR
 * (defensa en profundidad, además del middleware) y monta el proveedor de
 * datos + la navegación inferior compartida.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <AppDataProvider>
      {children}
      <BottomNav />
    </AppDataProvider>
  );
}
