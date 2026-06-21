'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function doLogin() {
    if (!email.trim() || !password) {
      setMsg('falta tu correo o contraseña');
      return;
    }
    setLoading(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setMsg('correo o contraseña incorrectos');
      setLoading(false);
      return;
    }
    // La sesión queda en cookies; el middleware ya permitirá el home.
    router.refresh();
    router.push('/');
  }

  return (
    <div id="screen-login" className="screen active">
      <Image
        src="/pamache.png"
        alt="pamaches"
        width={200}
        height={200}
        className="login-pamache"
        priority
      />
      <div className="login-title">pamaches</div>
      <div className="login-sub">nuestro espacio</div>
      <div className="login-form">
        <div className="field-label">correo</div>
        <input
          type="email"
          className="input"
          placeholder="tu correo"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.currentTarget.nextElementSibling?.nextElementSibling as HTMLInputElement)?.focus();
            }
          }}
        />
        <div className="field-label">contraseña</div>
        <input
          type="password"
          className="input"
          placeholder="tu contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') doLogin();
          }}
        />
        <button className="btn" onClick={doLogin} disabled={loading}>
          {loading ? <span className="spinner" /> : 'entrar'}
        </button>
        {msg && <div className="login-msg error">{msg}</div>}
      </div>
    </div>
  );
}
