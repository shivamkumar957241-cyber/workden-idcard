import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  Building2,
  Calendar,
  Lock,
  Globe,
  ArrowLeft,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { formatIST, formatDateIST } from '../utils/date';

export default function PublicVerificationView({ token, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVerification = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/verify/${token}`);
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.message || 'Verification token could not be verified.');
        setData({
          verification_status: json.verification_status || 'INVALID ID',
          message: json.message
        });
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Server communication error during verification.');
      setData({ verification_status: 'SERVER ERROR' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVerification();
    }
  }, [token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE & VALID':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700',
          indicator: 'bg-emerald-500',
          icon: CheckCircle2,
          label: 'OFFICIAL ID ACTIVE & VALID',
          desc: 'This identity is authentic, approved, and currently in good standing with WorkDen.'
        };
      case 'EXPIRED':
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-800',
          indicator: 'bg-amber-500',
          icon: Clock,
          label: 'IDENTITY EXPIRED',
          desc: 'This ID card has reached its authorized validity period and has expired.'
        };
      case 'SUSPENDED':
        return {
          bg: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-800',
          indicator: 'bg-yellow-500',
          icon: AlertTriangle,
          label: 'IDENTITY TEMPORARILY SUSPENDED',
          desc: 'This credential is temporarily on administrative hold by WorkDen Security.'
        };
      case 'REVOKED':
        return {
          bg: 'bg-rose-500/20 border-rose-500/50 text-rose-800',
          indicator: 'bg-rose-500',
          icon: Ban,
          label: 'IDENTITY REVOKED & DEACTIVATED',
          desc: 'This ID card has been permanently revoked, terminated, or replaced. Not valid for access.'
        };
      default:
        return {
          bg: 'bg-rose-500/20 border-rose-500/50 text-rose-800',
          indicator: 'bg-rose-600',
          icon: Ban,
          label: 'INVALID / UNRECOGNIZED ID',
          desc: 'Security Alert: This QR code does not belong to any genuine WorkDen credential.'
        };
    }
  };

  const statusConfig = getStatusBadge(data?.verification_status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      
      {/* Top Header */}
      <header className="max-w-2xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5C542] flex items-center justify-center shadow-lg border border-[#F5C542]/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide uppercase text-white">
              WORKDEN OFFICIAL VERIFICATION
            </h1>
            <p className="text-[11px] text-[#F5C542] font-mono tracking-wider">
              workden.online • PUBLIC TRUST & SECURITY GATEWAY
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition border border-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Portal</span>
          </button>
        )}
      </header>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        {loading ? (
          <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-10 border border-slate-700 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-[#F5C542] animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-white">Verifying Security Token with Server...</h3>
            <p className="text-xs text-slate-400 font-mono">Querying WorkDen cryptographic registry</p>
          </div>
        ) : (
          <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Status Announcement Banner */}
            <div className={`p-5 border-b flex items-start gap-3.5 ${statusConfig.bg}`}>
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow">
                <StatusIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusConfig.indicator} animate-ping`}></span>
                  <h2 className="text-sm font-black tracking-wider uppercase">
                    {statusConfig.label}
                  </h2>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {statusConfig.desc}
                </p>
              </div>
            </div>

            {/* Credential Data (Only shown if token matched record) */}
            {data && data.full_name ? (
              <div className="p-6 space-y-6">
                
                {/* Profile Snapshot */}
                <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-700/60 text-center sm:text-left">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-[#F5C542] to-[#FFD84D] shadow-xl">
                      <img
                        src={data.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt={data.full_name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-full">
                      <ShieldCheck className="w-4 h-4 text-[#F5C542]" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-[#F5C542] uppercase tracking-widest block mb-0.5">
                      {data.entity_type}
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-wide">
                      {data.full_name}
                    </h3>
                    <p className="text-sm font-semibold text-slate-300 mt-0.5">
                      {data.role_or_plan}
                    </p>
                    <p className="text-xs text-slate-400">
                      {data.department_or_category} • {data.organization}
                    </p>
                  </div>
                </div>

                {/* Identity Verification Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                      Credential ID
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      {data.id_number}
                    </span>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                      Work Location
                    </span>
                    <span className="font-medium text-slate-200">
                      {data.work_location}
                    </span>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                      Issue Date
                    </span>
                    <span className="text-slate-200">{data.issue_date ? formatDateIST(data.issue_date) : 'N/A'}</span>
                  </div>

                  <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                      Card Expiry
                    </span>
                    <span className="font-bold text-red-400">{data.expiry_date ? formatDateIST(data.expiry_date) : 'Permanent'}</span>
                  </div>
                </div>

                {/* Privacy & Anti-Tamper Notice */}
                <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Lock className="w-3.5 h-3.5 text-[#F5C542]" />
                    <span>Privacy & Verification Guarantee</span>
                  </div>
                  <p className="text-[10.5px] leading-relaxed">
                    This public verification is generated directly from WorkDen's primary database. Sensitive contact details, residential addresses, and private identification numbers are permanently hidden from public inspection in compliance with security & data protection policies.
                  </p>
                  <div className="text-[9.5px] font-mono text-slate-500 pt-1 flex items-center justify-between">
                    <span>Scan Counter: {data.scan_count}</span>
                    <span>Server Verified (IST): {formatIST(data.server_verified_at)}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <Ban className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-white">Record Not Found</h3>
                <p className="text-xs text-slate-400">
                  {error || 'This token could not be verified in the WorkDen credential directory.'}
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-700/60 flex items-center justify-between text-xs">
              <button
                onClick={fetchVerification}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-verify Status</span>
              </button>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>WorkDen Trust Certified</span>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto w-full pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-1.5">
        <p className="text-slate-400 text-xs font-medium">
          Support: <a href="mailto:support@workden.online" className="text-[#F5C542] hover:underline">support@workden.online</a> • Helpline: <a href="tel:+919262725686" className="text-[#F5C542] hover:underline">+91 9262725686</a>
        </p>
        <p>© 2026 WORKDEN. All rights reserved.</p>
        <p className="text-[11px] text-slate-600">
          Official Domain: <span className="font-mono text-slate-400">https://workden.online</span>
        </p>
      </footer>

    </div>
  );
}
