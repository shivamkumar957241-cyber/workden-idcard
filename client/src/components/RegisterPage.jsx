import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import API_BASE from '../api';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function RegisterPage({ onLogin }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: form.full_name, email: form.email, password: form.password })
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-[#171717] border border-[#353535] rounded-3xl shadow-2xl overflow-hidden">
          {/* Top golden accent line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#F5C542] via-[#FFD84D] to-[#F5C542]" />

          <div className="p-8 pt-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-black border border-[#F5C542]/40 shadow-xl p-3 mb-4">
                <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-wide">Create WorkDen Account</h1>
              <p className="text-[#B5B5B5] text-xs mt-1">Official ID Card & Member Portal</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
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
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#F5C542] p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#888]" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-1.5 uppercase tracking-wider">Confirm Password</label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={e => set('confirm_password', e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-black rounded-xl transition-all duration-300 shadow-xl shadow-[#F5C542]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase tracking-wider mt-4"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin text-black" /> Creating account...</> : 'Create WorkDen Account'}
              </button>
            </form>

            <p className="text-center text-[#888] text-xs mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-[#F5C542] hover:underline font-bold transition-colors">Sign in here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
