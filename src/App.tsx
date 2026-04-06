
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const AUTH_URL = 'https://functions.poehali.dev/fbaf0cb4-405e-438f-a810-cd1c0beb5f72';

interface AuthUser {
  id: number;
  login: string;
  display_name: string;
  login_type: string;
}

function AppInner() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const cached = localStorage.getItem('nexus_user');
    if (!token) { setLoading(false); return; }
    // быстро показываем кэш, потом проверяем токен
    if (cached) { setUser(JSON.parse(cached)); setLoading(false); }
    fetch(`${AUTH_URL}?action=me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('nexus_user', JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_user');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAuth = (u: AuthUser, _token: string) => setUser(u);

  const handleLogout = () => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      fetch(`${AUTH_URL}?action=logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl glow-violet flex items-center justify-center animate-float" style={{ background: 'linear-gradient(135deg, #9d6fff, #22d3ee)' }}>
            <span className="text-white text-3xl font-caveat font-bold">N</span>
          </div>
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="typing-dot w-2 h-2 rounded-full bg-primary" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={handleAuth} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;