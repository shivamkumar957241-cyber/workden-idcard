import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Users, Briefcase, CheckCircle2, ArrowLeft } from 'lucide-react';
import API_BASE from '../api';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function RegisterPage({ onLogin, fixedType = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [regType, setRegType] = useState(fixedType); // null = choose, 'member', 'staff'
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fixedType) {
      setRegType(fixedType);
      return;
    }
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    if (type === 'staff') setRegType('staff');
    else if (type === 'member') setRegType('member');
  }, [location.search, fixedType]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          account_type: regType === 'staff' ? 'STAFF' : 'USER'
        })
      });
      const json = await res.json();
      if (json.success) {
        onLogin(json.token, json.user);
      } else {
        setError(json.error || 'Registration failed.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Type Selection Screen
  if (!regType) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] relative overflow-hidden px-4">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 w-full max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black border border-[#F5C542]/40 p-2 mb-5 shadow-xl">
              <img src={WORKDEN_LOGO_BASE64} alt="WorkDen" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Create Your Account</h1>
            <p className="text-[#888] text-sm">Select how you'd like to register with WorkDen</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Member */}
            <div
              onClick={() => { setRegType('member'); navigate('/register?type=member', { replace: true }); }}
              className="group cursor-pointer bg-[#171717] border border-[#353535] hover:border-[#F5C542]/60 rounded-3xl p-7 text-left transition-all hover:bg-[#1c1c1c]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center mb-5">
                <Users className="w-6 h-6" style={{ color: '#F5C542' }} />
              </div>
              <h2 className="text-white font-black text-lg mb-2">Register as Member</h2>
              <p className="text-[#777] text-sm mb-5 leading-relaxed">Join WorkDen as a member. Apply for your Member ID card for free.</p>
              <div className="space-y-1.5 mb-5">
                {['Free registration', 'Member ID application', 'QR verified digital ID card'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[#aaa] text-xs">{f}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center py-2.5 rounded-xl bg-[#F5C542] text-black text-xs font-black">
                Register as Member →
              </div>
            </div>

            {/* Staff */}
            <div
              onClick={() => { setRegType('staff'); navigate('/register?type=staff', { replace: true }); }}
              className="group cursor-pointer bg-[#171717] border border-[#353535] hover:border-[#F5C542]/60 rounded-3xl p-7 text-left transition-all hover:bg-[#1c1c1c]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center mb-5">
                <Briefcase className="w-6 h-6" style={{ color: '#F5C542' }} />
              </div>
              <h2 className="text-white font-black text-lg mb-2">Register as Staff</h2>
              <p className="text-[#777] text-sm mb-5 leading-relaxed">Join as a WorkDen staff member. Get your official Staff ID card.</p>
              <div className="space-y-1.5 mb-5">
                {['Free staff registration', 'Official Staff ID card', 'QR verified credential'].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-[#aaa] text-xs">{f}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center py-2.5 rounded-xl border border-[#F5C542]/40 text-[#F5C542] text-xs font-black">
                Register as Staff →
              </div>
            </div>
          </div>

          <p className="text-center text-[#888] text-xs mt-7">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-[#F5C542] hover:underline font-bold">Sign in here</button>
          </p>
        </div>
      </div>
    );
  }

  const isStaff = regType === 'staff';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] relative overflow-hidden py-8 px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#171717] border border-[#353535] rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-[#F5C542] via-[#FFD84D] to-[#F5C542]" />
          <div className="p-7 relative">
            <button
              onClick={() => { if (fixedType) { navigate('/'); } else { setRegType(null); navigate('/register', { replace: true }); } }}
              title="Back"
              className="w-9 h-9 rounded-xl bg-[#222] border border-[#353535] hover:border-[#F5C542] text-[#aaa] hover:text-[#F5C542] flex items-center justify-center transition-colors cursor-pointer mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="text-center mb-7">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black border border-[#F5C542]/40 shadow-xl p-2.5 mb-4">
                <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl font-black text-white">
                {isStaff ? 'Staff Registration' : 'Member Registration'}
              </h1>
              <p className="text-[#888] text-xs mt-1">WorkDen {isStaff ? 'Staff' : 'Member'} ID Card Portal</p>
            </div>

            {isStaff && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs leading-relaxed">
                  Your account will be activated after ID application review and admin approval.
                </p>
              </div>
            )}

            {!isStaff && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-300 text-xs">Application is completely FREE. Apply now for your official WorkDen ID card.</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-xs font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Full Name', key: 'full_name', type: 'text', placeholder: 'Your official full name' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'your@email.com' }
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-[#B5B5B5] text-xs font-bold mb-1.5 uppercase tracking-wider">{label}</label>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm" />
                </div>
              ))}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#F5C542] p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-1.5 uppercase tracking-wider">Confirm Password</label>
                <input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 px-6 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-black rounded-xl transition-all duration-300 shadow-xl shadow-[#F5C542]/20 disabled:opacity-60 flex items-center justify-center gap-2 text-sm uppercase tracking-wider mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin text-black" />Creating account...</> : `Create ${isStaff ? 'Staff' : 'Member'} Account`}
              </button>
            </form>

            <p className="text-center text-[#888] text-xs mt-5">
              Already have an account?{' '}
              <button onClick={() => navigate(isStaff ? '/staff/login' : '/member/login')} className="text-[#F5C542] hover:underline font-bold cursor-pointer">Sign in here</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
