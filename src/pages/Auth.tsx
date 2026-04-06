import { useState } from 'react';
import Icon from '@/components/ui/icon';

const AUTH_URL = 'https://functions.poehali.dev/fbaf0cb4-405e-438f-a810-cd1c0beb5f72';

interface AuthUser {
  id: number;
  username: string;
  display_name: string;
}

interface AuthPageProps {
  onAuth: (user: AuthUser, token: string) => void;
}

type Mode = 'login' | 'register';

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const api = async (action: string, body: object) => {
    try {
      const res = await fetch(`${AUTH_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch {
      return { error: 'Ошибка сети. Проверьте соединение.' };
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    setError('');
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    if (!user) { setError('Введите имя пользователя'); return; }
    if (!pass) { setError('Введите пароль'); return; }

    if (mode === 'register') {
      if (pass !== confirmPassword.trim()) { setError('Пароли не совпадают'); return; }
      if (pass.length < 6) { setError('Пароль минимум 6 символов'); return; }
    }

    setLoading(true);
    const data = await api(mode, { username: user, password: pass });
    setLoading(false);

    if (data.success) {
      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_user', JSON.stringify(data.user));
      onAuth(data.user, data.token);
    } else {
      setError(data.error || 'Что-то пошло не так');
    }
  };

  return (
    <div className="min-h-screen w-full mesh-bg flex items-center justify-center font-golos overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(157,111,255,0.13) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 -right-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl glow-violet flex items-center justify-center mb-4 animate-float" style={{ background: 'linear-gradient(135deg, #9d6fff, #22d3ee)' }}>
            <span className="text-white text-4xl font-caveat font-bold">N</span>
          </div>
          <h1 className="text-3xl font-bold font-caveat" style={{ color: 'var(--neon-violet)' }}>Nexus</h1>
          <p className="text-sm text-muted-foreground mt-1">Защищённый мессенджер</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7 animate-scale-in" style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,111,255,0.2)' }}>

          {/* Tabs */}
          <div className="flex gap-1 mb-7 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={mode === m ? {
                  background: 'linear-gradient(135deg, #9d6fff, #7c3aed)',
                  color: 'white',
                  boxShadow: '0 2px 12px rgba(157,111,255,0.35)',
                } : {
                  color: 'var(--muted-foreground)',
                }}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {/* Username */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Icon name="AtSign" size={16} className="text-muted-foreground" />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '')); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="имя_пользователя"
                autoFocus
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(157,111,255,0.2)',
                  color: 'var(--foreground)',
                }}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Icon name="Lock" size={16} className="text-muted-foreground" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && mode === 'login' && handleSubmit()}
                placeholder="Пароль"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-10 py-3.5 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(157,111,255,0.2)',
                  color: 'var(--foreground)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name={showPass ? 'EyeOff' : 'Eye'} size={15} />
              </button>
            </div>

            {/* Confirm password */}
            {mode === 'register' && (
              <div className="relative animate-fade-in">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Icon name="LockKeyhole" size={16} className="text-muted-foreground" />
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Повторите пароль"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.4)' : 'rgba(157,111,255,0.2)'}`,
                    color: 'var(--foreground)',
                  }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl animate-fade-in" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Icon name="AlertCircle" size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:scale-100 mt-1"
              style={{ background: 'linear-gradient(135deg, #9d6fff, #7c3aed)', color: 'white', boxShadow: '0 4px 20px rgba(157,111,255,0.35)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader2" size={15} className="animate-spin" />
                  {mode === 'login' ? 'Входим...' : 'Создаём аккаунт...'}
                </span>
              ) : (
                mode === 'login' ? 'Войти' : 'Создать аккаунт'
              )}
            </button>
          </div>

          {mode === 'register' && (
            <p className="text-center text-[11px] text-muted-foreground mt-4 opacity-60">
              Только буквы латиницы, цифры, _ и .
            </p>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5 opacity-40">
          Nexus · E2E шифрование · Без рекламы
        </p>
      </div>
    </div>
  );
}
