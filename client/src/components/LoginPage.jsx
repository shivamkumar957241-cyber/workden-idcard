import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Users, Briefcase, Shield } from 'lucide-react';
import API_BASE from '../api';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginType, setLoginType] = useState('member'); // 'member' | 'staff' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Check URL param for login type hint
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'staff') setLoginType('staff');
    else if (type === 'admin') setLoginType('admin');
    else setLoginType('member');
  }, [location.search]);

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
    member: { label: 'Member Login', icon: Users, color: '#F5C542', desc: 'WorkDen Members', reg: '/register?type=member' },
    staff: { label: 'Staff Login', icon: Briefcase, color: '#F5C542', desc: 'WorkDen Staff', reg: '/register?type=staff' },
    admin: { label: 'Admin Login', icon: Shield, color: '#F5C542', desc: 'Administrators Only', reg: null },
  };
  const cfg = TYPE_CONFIG[loginType];

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans" style={{ backgroundColor: '#0B0B0B' }}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ background: 'radial-gradient(circle, #F5C542 0%, transparent 70%)', zIndex: 0 }} />

      <div className={`relative z-10 w-full max-w-md mx-4 ${shake ? 'animate-shake' : ''}`}>
        <div className="rounded-3xl shadow-2xl overflow-hidden border backdrop-blur-xl"
          style={{ backgroundColor: '#171717', borderColor: '#353535', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,197,66,0.1)' }}>
          <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #F5C542, #FFD84D, transparent)' }} />

          <div className="p-7">
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-xl overflow-hidden border"
                style={{ backgroundColor: '#121212', borderColor: '#F5C542', boxShadow: '0 4px 18px rgba(245,197,66,0.2)' }}>
                <img src={WORKDEN_LOGO_BASE64} alt="WORKDEN" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-black tracking-[0.2em]" style={{ color: '#F5C542' }}>WORKDEN</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] mt-1" style={{ color: '#B5B5B5' }}>
                Official ID Card & Verification Portal
              </p>
            </div>

            {/* Login Type Switcher */}
            <div className="flex gap-1 p-1 rounded-xl bg-[#111111] border border-[#2a2a2a] mb-6">
              {Object.entries(TYPE_CONFIG).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => setLoginType(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    loginType === key ? 'bg-[#F5C542] text-black shadow-md' : 'text-[#888] hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{key === 'admin' ? 'Admin' : key === 'staff' ? 'Staff' : 'Member'}</span>
                </button>
              ))}
            </div>

            {/* Type description */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5C542]/5 border border-[#F5C542]/20 mb-5">
              <cfg.icon className="w-4 h-4 flex-shrink-0" style={{ color: '#F5C542' }} />
              <span className="text-xs font-semibold text-[#aaa]">{cfg.desc}</span>
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
                  onFocus={e => { e.currentTarget.style.borderColor = '#F5C542'; e.currentTarget.style.backgroundColor = '#262626'; }}
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
                    onFocus={e => { e.currentTarget.style.borderColor = '#F5C542'; e.currentTarget.style.backgroundColor = '#262626'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#353535'; e.currentTarget.style.backgroundColor = '#222222'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 px-6 font-black rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: '#F5C542', color: '#0B0B0B', boxShadow: '0 4px 18px rgba(245,197,66,0.25)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FFD84D'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F5C542'; }}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin text-black" /><span>Signing in...</span></> : cfg.label}
              </button>
            </form>

            {cfg.reg && (
              <p className="text-center text-[#888] text-xs mt-5">
                Don't have an account?{' '}
                <button onClick={() => navigate(cfg.reg)} className="text-[#F5C542] hover:underline font-bold">
                  Register {loginType === 'staff' ? 'as Staff' : 'as Member'}
                </button>
              </p>
            )}

            <p className="text-center text-[#555] text-xs mt-3">
              <button onClick={() => navigate('/')} className="hover:text-[#888] transition-colors">← Back to Home</button>
            </p>
          </div>

          <div className="border-t px-7 py-3.5 text-center" style={{ backgroundColor: '#131313', borderColor: '#353535' }}>
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#F5C542' }}>WORKDEN · IDENTITY PORTAL</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#737373' }}>workden.online · Secure Credential Access</p>
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
