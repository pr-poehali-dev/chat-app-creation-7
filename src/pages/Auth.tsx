import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const AUTH_URL = 'https://functions.poehali.dev/fbaf0cb4-405e-438f-a810-cd1c0beb5f72';

type Step = 'choose' | 'input' | 'otp' | 'name';
type LoginType = 'email' | 'phone';

interface AuthUser {
  id: number;
  login: string;
  display_name: string;
  login_type: string;
}

interface AuthPageProps {
  onAuth: (user: AuthUser, token: string) => void;
}

function formatPhone(digits: string): string {
  if (!digits) return '';
  const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits;
  let r = '+' + (d[0] || '');
  if (d.length > 1) r += ' (' + d.slice(1, 4);
  if (d.length >= 4) r += ')';
  if (d.length > 4) r += ' ' + d.slice(4, 7);
  if (d.length > 7) r += '-' + d.slice(7, 9);
  if (d.length > 9) r += '-' + d.slice(9, 11);
  return r;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [step, setStep] = useState<Step>('choose');
  const [loginType, setLoginType] = useState<LoginType>('email');
  const [login, setLogin] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    timerRef.current = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendTimer]);

  const api = async (action: string, body: object) => {
    try {
      const res = await fetch(`${AUTH_URL}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return data;
    } catch {
      return { error: 'Ошибка сети. Проверьте соединение.' };
    }
  };

  const getCleanLogin = () =>
    loginType === 'phone' ? login.replace(/\D/g, '') : login.trim().toLowerCase();

  const sendOtp = async () => {
    const clean = getCleanLogin();
    if (!clean) {
      setError('Введите ' + (loginType === 'email' ? 'email' : 'номер телефона'));
      return;
    }
    if (loginType === 'email' && !clean.includes('@')) {
      setError('Введите корректный email');
      return;
    }
    if (loginType === 'phone' && clean.length < 10) {
      setError('Введите полный номер телефона');
      return;
    }
    setLoading(true);
    setError('');
    const data = await api('send-otp', { login: clean, login_type: loginType });
    setLoading(false);
    if (data.success) {
      setDemoCode(data.demo_code || '');
      setOtp(['', '', '', '', '', '']);
      setStep('otp');
      setResendTimer(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } else {
      setError(data.error || 'Не удалось отправить код');
    }
  };

  const finishAuth = useCallback((data: { token: string; user: AuthUser }) => {
    localStorage.setItem('nexus_token', data.token);
    localStorage.setItem('nexus_user', JSON.stringify(data.user));
    const clean = getCleanLogin();
    const isNew = !data.user.display_name || data.user.display_name === clean;
    if (isNew) {
      setStep('name');
    } else {
      onAuth(data.user, data.token);
    }
  }, [onAuth]);

  const verifyCode = useCallback(async (digits: string[]) => {
    if (verifyingRef.current) return;
    const code = digits.join('');
    if (code.length < 6) { setError('Введите все 6 цифр'); return; }
    verifyingRef.current = true;
    setLoading(true);
    setError('');
    const clean = getCleanLogin();
    const data = await api('verify-otp', { login: clean, code, login_type: loginType });
    setLoading(false);
    verifyingRef.current = false;
    if (data.success) {
      finishAuth(data);
    } else {
      setError(data.error || 'Неверный код');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    }
  }, [loginType, finishAuth]);

  const handleOtpInput = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError('');
    if (digit && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    if (digit && idx === 5 && next.every(d => d !== '')) {
      verifyCode(next);
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (otp[idx]) {
        const next = [...otp]; next[idx] = ''; setOtp(next);
      } else if (idx > 0) {
        const next = [...otp]; next[idx - 1] = ''; setOtp(next);
        otpRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      otpRefs.current[5]?.focus();
      verifyCode(digits);
    }
  };

  const saveName = () => {
    const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
    const token = localStorage.getItem('nexus_token') || '';
    const name = displayName.trim() || user.login;
    const updatedUser = { ...user, display_name: name };
    localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
    onAuth(updatedUser, token);
  };

  return (
    <div className="min-h-screen w-full mesh-bg flex items-center justify-center font-golos overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(157,111,255,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="flex flex-col items-center mb-10 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl glow-violet flex items-center justify-center mb-4 animate-float" style={{ background: 'linear-gradient(135deg, #9d6fff, #22d3ee)' }}>
            <span className="text-white text-4xl font-caveat font-bold">N</span>
          </div>
          <h1 className="text-3xl font-bold font-caveat text-glow-violet" style={{ color: 'var(--neon-violet)' }}>Nexus</h1>
          <p className="text-sm text-muted-foreground mt-1">Защищённый мессенджер</p>
        </div>

        <div className="rounded-3xl p-8 animate-scale-in" style={{ background: 'var(--bg-card)', border: '1px solid rgba(157,111,255,0.2)' }}>

          {/* CHOOSE */}
          {step === 'choose' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-2 text-center">Добро пожаловать</h2>
              <p className="text-sm text-muted-foreground text-center mb-8">Войдите или зарегистрируйтесь</p>
              <div className="flex gap-3 mb-8">
                <button
                  onClick={() => { setLoginType('email'); setStep('input'); setLogin(''); setError(''); }}
                  className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(157,111,255,0.08)', border: '1px solid rgba(157,111,255,0.25)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(157,111,255,0.15)' }}>
                    <Icon name="Mail" size={22} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Email</p>
                    <p className="text-xs text-muted-foreground mt-0.5">По почте</p>
                  </div>
                </button>
                <button
                  onClick={() => { setLoginType('phone'); setStep('input'); setLogin(''); setError(''); }}
                  className="flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.12)' }}>
                    <Icon name="Smartphone" size={22} style={{ color: 'var(--neon-cyan)' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Телефон</p>
                    <p className="text-xs text-muted-foreground mt-0.5">По номеру</p>
                  </div>
                </button>
              </div>
              <div className="encrypt-badge rounded-xl px-4 py-3 flex items-center gap-3">
                <Icon name="Shield" size={18} />
                <div>
                  <p className="text-xs font-semibold">E2E шифрование</p>
                  <p className="text-[11px] opacity-70">Никто кроме вас не читает сообщения</p>
                </div>
              </div>
            </div>
          )}

          {/* INPUT */}
          {step === 'input' && (
            <div className="animate-fade-in">
              <button onClick={() => { setStep('choose'); setError(''); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
                <Icon name="ArrowLeft" size={16} />
                Назад
              </button>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: loginType === 'email' ? 'rgba(157,111,255,0.15)' : 'rgba(34,211,238,0.12)' }}>
                  <Icon name={loginType === 'email' ? 'Mail' : 'Smartphone'} size={18} className={loginType === 'email' ? 'text-primary' : ''} style={loginType === 'phone' ? { color: 'var(--neon-cyan)' } : {}} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{loginType === 'email' ? 'Введите email' : 'Введите номер'}</h2>
                  <p className="text-xs text-muted-foreground">Отправим код подтверждения</p>
                </div>
              </div>

              <input
                type={loginType === 'email' ? 'email' : 'tel'}
                value={loginType === 'phone' ? formatPhone(login) : login}
                onChange={e => {
                  if (loginType === 'phone') {
                    setLogin(e.target.value.replace(/\D/g, '').slice(0, 11));
                  } else {
                    setLogin(e.target.value);
                  }
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                placeholder={loginType === 'email' ? 'you@example.com' : '+7 (999) 000-00-00'}
                autoFocus
                className="w-full px-4 py-4 rounded-2xl text-sm outline-none transition-all mb-4"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(157,111,255,0.25)'}`,
                  color: 'var(--foreground)',
                }}
              />

              {error && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Icon name="AlertCircle" size={14} className="text-red-400" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:scale-100 glow-violet"
                style={{ background: 'linear-gradient(135deg, #9d6fff, #7c3aed)', color: 'white' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Отправляем...
                  </span>
                ) : 'Получить код →'}
              </button>
            </div>
          )}

          {/* OTP */}
          {step === 'otp' && (
            <div className="animate-fade-in">
              <button onClick={() => { setStep('input'); setError(''); setOtp(['','','','','','']); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
                <Icon name="ArrowLeft" size={16} />
                Назад
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(157,111,255,0.15)' }}>
                  <Icon name="KeyRound" size={26} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold">Введите код</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Отправили на <span className="text-foreground font-medium">{loginType === 'phone' ? formatPhone(login) : login}</span>
                </p>
                {demoCode && (
                  <div className="mt-3 px-3 py-2 rounded-xl inline-flex items-center gap-2" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
                    <Icon name="Eye" size={13} className="text-green-400" />
                    <span className="text-xs text-green-400">Код: <strong className="font-mono text-sm">{demoCode}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    disabled={loading}
                    className="w-11 h-14 text-center text-xl font-bold rounded-2xl outline-none transition-all disabled:opacity-50"
                    style={{
                      background: digit ? 'rgba(157,111,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${error ? 'rgba(239,68,68,0.5)' : digit ? 'rgba(157,111,255,0.5)' : 'rgba(157,111,255,0.2)'}`,
                      color: 'var(--neon-violet)',
                    }}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Icon name="AlertCircle" size={14} className="text-red-400" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                  <Icon name="Loader2" size={16} className="animate-spin text-primary" />
                  Проверяем...
                </div>
              )}

              <button
                onClick={() => verifyCode(otp)}
                disabled={loading || otp.some(d => !d)}
                className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 glow-violet"
                style={{ background: 'linear-gradient(135deg, #9d6fff, #7c3aed)', color: 'white' }}
              >
                Войти
              </button>

              <div className="text-center mt-4">
                {resendTimer > 0 ? (
                  <p className="text-xs text-muted-foreground">Повторно через <span className="text-foreground">{resendTimer}с</span></p>
                ) : (
                  <button onClick={sendOtp} disabled={loading} className="text-xs text-primary hover:underline disabled:opacity-50">
                    Отправить код ещё раз
                  </button>
                )}
              </div>
            </div>
          )}

          {/* NAME */}
          {step === 'name' && (
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(157,111,255,0.2), rgba(34,211,238,0.15))' }}>
                <Icon name="Smile" size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-1">Вы новенький! 👋</h2>
              <p className="text-sm text-muted-foreground mb-6">Как вас называть в Nexus?</p>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                placeholder="Ваше имя"
                autoFocus
                maxLength={50}
                className="w-full px-4 py-4 rounded-2xl text-sm outline-none transition-all mb-4 text-center"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(157,111,255,0.25)',
                  color: 'var(--foreground)',
                  fontSize: '1rem',
                }}
              />
              <button
                onClick={saveName}
                className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] glow-violet"
                style={{ background: 'linear-gradient(135deg, #9d6fff, #7c3aed)', color: 'white' }}
              >
                Войти в Nexus 🚀
              </button>
              <button onClick={saveName} className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Пропустить
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 opacity-50">
          Nexus · Всё зашифровано · Никакой рекламы
        </p>
      </div>
    </div>
  );
}
