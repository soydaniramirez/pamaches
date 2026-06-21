'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Categoria, Couple, Fecha, Profile, Subcategoria } from '@/lib/types';

interface AppDataState {
  me: Profile | null;
  couple: Couple | null;
  profiles: Record<string, Profile>;
  categorias: Categoria[];
  subcategorias: Subcategoria[];
  fechas: Fecha[];
  cupo: number;
  loading: boolean;
  reload: () => Promise<void>;
  logout: () => Promise<void>;
  toast: (msg: string) => void;
}

const AppDataContext = createContext<AppDataState | null>(null);

const FALLBACK_CATS = ['salidas', 'servicios', 'gasolina', 'limpieza', 'compras variadas', 'supermercado'];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [me, setMe] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [fechas, setFechas] = useState<Fecha[]>([]);
  const [cupo, setCupo] = useState(15000);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2500);
  }, []);

  const loadCategorias = useCallback(async () => {
    const { data } = await supabase.from('categorias').select('*').order('orden', { ascending: true });
    let cats: Categoria[] = (data ?? []).map((c) => ({ id: c.id as string, nombre: c.nombre as string }));
    if (cats.length === 0) {
      cats = FALLBACK_CATS.map((n) => ({ id: null, nombre: n }));
    }
    setCategorias(cats);
    const { data: subs } = await supabase.from('subcategorias').select('*').order('nombre', { ascending: true });
    setSubcategorias(
      (subs ?? []).map((s) => ({
        id: s.id as string,
        categoria_id: s.categoria_id as string,
        nombre: s.nombre as string,
      })),
    );
  }, [supabase]);

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: perfil } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!perfil) {
      setLoading(false);
      return;
    }
    const meProfile = perfil as unknown as Profile;
    setMe(meProfile);

    const { data: c } = await supabase.from('couples').select('*').eq('id', meProfile.couple_id).single();
    setCouple((c as unknown as Couple) ?? null);

    const { data: perfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('couple_id', meProfile.couple_id);
    const map: Record<string, Profile> = {};
    (perfiles ?? []).forEach((p) => {
      map[(p as { id: string }).id] = p as unknown as Profile;
    });
    setProfiles(map);

    const { data: cfg } = await supabase
      .from('aporte_config')
      .select('*')
      .eq('couple_id', meProfile.couple_id)
      .limit(1)
      .single();
    if (cfg?.cupo != null) setCupo(parseFloat(String(cfg.cupo)));

    await loadCategorias();

    const { data: f } = await supabase.from('fechas').select('*').order('fecha', { ascending: true });
    setFechas((f as unknown as Fecha[]) ?? []);

    setLoading(false);
  }, [supabase, loadCategorias]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }, [supabase, router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <AppDataContext.Provider
      value={{
        me,
        couple,
        profiles,
        categorias,
        subcategorias,
        fechas,
        cupo,
        loading,
        reload,
        logout,
        toast,
      }}
    >
      {children}
      <div id="toast" className={toastMsg ? 'show' : ''}>
        {toastMsg}
      </div>
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData debe usarse dentro de <AppDataProvider>');
  return ctx;
}
