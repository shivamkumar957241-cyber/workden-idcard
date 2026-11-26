import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Users, Briefcase, Shield } from 'lucide-react';
import API_BASE from '../api';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function LoginPage({ onLogin, fixedType = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginType, setLoginType] = useState(fixedType || 'member'); // 'member' | 'staff' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Check URL param or fixedType for login type
  useEffect(() => {
    if (fixedType) {
      setLoginType(fixedType);
      return;
    }
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'staff') setLoginType('staff');
    else if (type === 'admin') setLoginType('admin');
    else setLoginType('member');
  }, [location.search, fixedType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 1,
      opacity: Math.random() * 0.4 + 0.1
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p, i) => {
        pts.slice(i + 1).forEach(q => {
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(245, 197, 66, ${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        });
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 197, 66, ${p.opacity * 0.7})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', handleResize); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const json = await res.json();
      if (json.success) {
        onLogin(json.token, json.user);
      } else {
        setError(json.error || 'Login failed. Please check your credentials.');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError('Unable to reach server. Please check your connection.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const TYPE_CONFIG = {
    member: {
      badge: 'Member Portal',
      label: 'Member Sign In',
      icon: Users,
      accent: '#F5C542',
      reg: '/member/register',
      regText: 'Register as Member'
    },
    staff: {
      badge: 'Staff Portal',
      label: 'Staff Sign In',
      icon: Briefcase,
      accent: '#10b981',
      reg: '/staff/register',
      regText: 'Register as Staff'
    },
    admin: {
      badge: 'Admin Portal',
      label: 'Administrator Sign In',
      icon: Shield,
      accent: '#F5C542',
      reg: null,
      regText: null
    }
  };
  const cfg = TYPE_CONFIG[loginType];
  const IconComp = cfg.icon;

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans" style={{ backgroundColor: '#0B0B0B' }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ background: `radial-gradient(circle, ${cfg.accent} 0%, transparent 70%)`, zIndex: 0 }} />

      <div className={`relative z-10 w-full max-w-md mx-4 ${shake ? 'animate-shake' : ''}`}>
        <div className="rounded-3xl shadow-2xl overflow-hidden border backdrop-blur-xl"
          style={{ backgroundColor: '#171717', borderColor: '#353535', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,197,66,0.08)' }}>
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)` }} />

          <div className="p-7 sm:p-8">
            {/* Logo & Dedicated Portal Title */}
            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-xl overflow-hidden border"
                style={{ backgroundColor: '#121212', borderColor: cfg.accent }}>
                <img src={WORKDEN_LOGO_BASE64} alt="WORKDEN" className="w-full h-full object-cover" />
              </div>
              <div className="mt-1 mb-2">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border"
                  style={{ backgroundColor: `${cfg.accent}15`, borderColor: `${cfg.accent}40`, color: cfg.accent }}
                >
                  <IconComp className="w-3 h-3" />
                  {cfg.badge}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">{cfg.label}</h1>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#B5B5B5' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" autoComplete="email" required
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-neutral-600 text-sm border focus:outline-none transition-all"
                  style={{ backgroundColor: '#222222', borderColor: '#353535' }}
                  onFocus={e => { e.currentTarget.style.borderColor = cfg.accent; e.currentTarget.style.backgroundColor = '#262626'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#353535'; e.currentTarget.style.backgroundColor = '#222222'; }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#B5B5B5' }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" required
                    className="w-full rounded-xl px-4 py-3 pr-12 text-white placeholder-neutral-600 text-sm border focus:outline-none transition-all"
                    style={{ backgroundColor: '#222222', borderColor: '#353535' }}
                    onFocus={e => { e.currentTarget.style.borderColor = cfg.accent; e.currentTarget.style.backgroundColor = '#262626'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#353535'; e.currentTarget.style.backgroundColor = '#222222'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 px-6 font-black rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: cfg.accent, color: '#0B0B0B' }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin text-black" /><span>Signing in...</span></> : cfg.label}
              </button>
            </form>

            {cfg.reg && (
              <p className="text-center text-[#888] text-xs mt-5">
                Don't have an account?{' '}
                <button onClick={() => navigate(cfg.reg)} className="hover:underline font-bold cursor-pointer" style={{ color: cfg.accent }}>
                  {cfg.regText} →
                </button>
              </p>
            )}

            <p className="text-center text-[#666] text-xs mt-3">
              <button onClick={() => navigate('/')} className="hover:text-[#aaa] transition-colors cursor-pointer">← Back to Home</button>
            </p>
          </div>

          <div className="border-t px-7 py-3 text-center" style={{ backgroundColor: '#131313', borderColor: '#2a2a2a' }}>
            <p className="text-[11px]" style={{ color: '#737373' }}>workden.online · Official Identity Portal</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
