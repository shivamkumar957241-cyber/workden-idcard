import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck, User,
  Calendar, Building2, CreditCard, ArrowLeft, Loader2, Award, Briefcase
} from 'lucide-react';
import API_BASE from '../api';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';
import { formatDateIST } from '../utils/date';

const STATUS_CONFIG = {
  ACTIVE: {
    label: 'VERIFIED & ACTIVE',
    subLabel: 'This ID card is authentic and currently valid.',
    statusText: 'Active',
    icon: CheckCircle2,
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    dot: 'bg-emerald-400',
    topGlow: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  'ACTIVE & VALID': {
    label: 'VERIFIED & ACTIVE',
    subLabel: 'This ID card is authentic and currently valid.',
    statusText: 'Active',
    icon: CheckCircle2,
    accent: 'emerald',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
    dot: 'bg-emerald-400',
    topGlow: 'from-emerald-500/30 via-emerald-500/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  'PENDING APPROVAL': {
    label: 'PENDING APPROVAL',
    subLabel: 'This card registration is awaiting administrative approval.',
    statusText: 'Pending Approval',
    icon: Clock,
    accent: 'amber',
    badgeBg: 'bg-[#F5C542]/15 border-[#F5C542]/40 text-[#F5C542]',
    dot: 'bg-[#F5C542]',
    topGlow: 'from-[#F5C542]/30 via-[#F5C542]/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  EXPIRED: {
    label: 'EXPIRED',
    subLabel: 'This identity card has passed its validity date.',
    statusText: 'Expired',
    icon: AlertTriangle,
    accent: 'neutral',
    badgeBg: 'bg-neutral-800 border-neutral-700 text-[#B5B5B5]',
    dot: 'bg-[#737373]',
    topGlow: 'from-neutral-700/30 via-neutral-700/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  SUSPENDED: {
    label: 'SUSPENDED',
    subLabel: 'This card has been temporarily suspended by the organization.',
    statusText: 'Suspended',
    icon: AlertTriangle,
    accent: 'amber',
    badgeBg: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
    dot: 'bg-amber-400',
    topGlow: 'from-amber-500/30 via-amber-500/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  REVOKED: {
    label: 'REVOKED',
    subLabel: 'This card has been permanently revoked. Do not accept.',
    statusText: 'Revoked',
    icon: XCircle,
    accent: 'rose',
    badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    dot: 'bg-rose-400',
    topGlow: 'from-rose-500/30 via-rose-500/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
  INVALID: {
    label: 'INVALID ID',
    subLabel: 'This QR code is not recognized in our verification database.',
    statusText: 'Invalid',
    icon: XCircle,
    accent: 'rose',
    badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-400',
    dot: 'bg-rose-400',
    topGlow: 'from-rose-500/30 via-rose-500/10 to-transparent',
    borderColor: 'border-[#353535]',
  },
};

const formatDate = (dateStr) => {
  return formatDateIST(dateStr);
};

export default function PublicVerifyPage({ token: propToken, onBack }) {
  const params = useParams();
  const token = propToken || params?.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Subtle ambient golden particles on matte black canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pts = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.5 + 0.5,
      o: Math.random() * 0.2 + 0.05,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 197, 66, ${p.o * 0.6})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const fetchVerification = async () => {
    if (!token) {
      setError('No verification token provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/verify/${token}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setData({ status: 'INVALID', card_status: 'INVALID' });
      }
    } catch {
      setError('Unable to reach verification server. Please verify your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [token]);

  const rawStatus = data?.verification_status || data?.card_status || data?.status || 'INVALID';
  const cfg = STATUS_CONFIG[rawStatus] || STATUS_CONFIG.INVALID;
  const StatusIcon = cfg.icon;

  const photoSrc = data?.photo_url
    ? data.photo_url.startsWith('data:') || data.photo_url.startsWith('http')
      ? data.photo_url
      : `${API_BASE}${data.photo_url}`
    : null;

  const isStaff = Boolean(data?.designation || data?.staff_joining || data?.entity_type?.includes('Staff'));

  if (loading) {
    return (
      <div
        className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative font-sans"
        style={{ backgroundColor: '#0B0B0B' }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        <div className="relative z-10 text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 flex items-center justify-center shadow-xl"
            style={{
              backgroundColor: '#171717',
              border: '1.5px solid #F5C542',
              boxShadow: '0 4px 20px rgba(245, 197, 66, 0.2)'
            }}
          >
            <img src={WORKDEN_LOGO_BASE64} alt="WORKDEN" className="w-full h-full object-cover" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: '#F5C542' }} />
          <h2 className="text-lg font-black tracking-[0.2em]" style={{ color: '#F5C542' }}>
            WORKDEN
          </h2>
          <p className="text-xs mt-1" style={{ color: '#B5B5B5' }}>
            Verifying identity against secure records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6 relative font-sans selection:bg-[#F5C542] selection:text-black"
      style={{ backgroundColor: '#0B0B0B', color: '#FFFFFF' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Subtle Top Ambient Golden Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 pointer-events-none blur-3xl opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, #F5C542 0%, transparent 70%)' }}
      />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-lg mx-auto w-full my-auto space-y-5">

        {/* Back navigation if modal/embedded */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-all mb-2 cursor-pointer"
            style={{
              backgroundColor: '#171717',
              borderColor: '#353535',
              color: '#B5B5B5'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
              e.currentTarget.style.borderColor = '#F5C542';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#B5B5B5';
              e.currentTarget.style.borderColor = '#353535';
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Back to Portal
          </button>
        )}

        {/* Portal Header */}
        <header className="text-center space-y-1">
          {/* Official WorkDen Logo */}
          <div
            className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-2.5 shadow-lg flex items-center justify-center"
            style={{
              backgroundColor: '#171717',
              border: '1.5px solid #F5C542',
              boxShadow: '0 4px 14px rgba(245, 197, 66, 0.15)'
            }}
          >
            <img src={WORKDEN_LOGO_BASE64} alt="WORKDEN" className="w-full h-full object-cover" />
          </div>

          {/* Secure Identity Verification Tag */}
          <div
            className="inline-flex items-center justify-center gap-2 px-3.5 py-1 rounded-full mb-1"
            style={{
              backgroundColor: 'rgba(245, 197, 66, 0.08)',
              border: '1px solid rgba(245, 197, 66, 0.3)'
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#F5C542' }} />
            <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: '#F5C542' }}>
              Secure Identity Verification
            </span>
          </div>

          {/* WORKDEN Branding in Golden Yellow */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-[0.2em]" style={{ color: '#F5C542' }}>
            WORKDEN
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: '#B5B5B5' }}>
            OFFICIAL ID VERIFICATION PORTAL
          </p>
        </header>

        {error ? (
          <div
            className="rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl border"
            style={{
              backgroundColor: '#171717',
              borderColor: 'rgba(239, 68, 68, 0.4)'
            }}
          >
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-1">Verification Unavailable</h3>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: '#B5B5B5' }}>{error}</p>
            <button
              onClick={fetchVerification}
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer"
              style={{
                backgroundColor: '#F5C542',
                color: '#0B0B0B',
                boxShadow: '0 4px 16px rgba(245, 197, 66, 0.25)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FFD84D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#F5C542'; }}
            >
              Retry Verification
            </button>
          </div>
        ) : (
          /* Unified Official Identity Card - Matte Black & Golden Yellow Theme */
          <div
            className="rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden relative transition-all duration-300 border"
            style={{
              backgroundColor: '#171717',
              borderColor: '#353535',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(245, 197, 66, 0.1)'
            }}
          >
            {/* Top Golden Accent Line */}
            <div
              className="h-[2px] w-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #F5C542, #FFD84D, transparent)'
              }}
            />

            {/* Verification Status Header (ACTIVE & VALID remains GREEN) */}
            <div
              className="pt-6 pb-4 px-6 text-center border-b"
              style={{
                backgroundColor: '#131313',
                borderColor: '#353535'
              }}
            >
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${cfg.badgeBg} font-bold text-xs tracking-wider uppercase mb-2 shadow-sm`}>
                <StatusIcon className="w-4 h-4 shrink-0" />
                <span>{cfg.label}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: '#B5B5B5' }}>
                {cfg.subLabel}
              </p>
            </div>

            {/* Profile Section */}
            {data && rawStatus !== 'INVALID' ? (
              <div className="p-6 sm:p-7 space-y-6">

                {/* Passport Photo & Basic Info */}
                <div className="flex flex-col items-center text-center">
                  {/* Passport-size photograph frame */}
                  <div className="relative mb-4 group">
                    <div
                      className="w-[110px] h-[135px] rounded-xl overflow-hidden shadow-xl flex items-center justify-center relative border"
                      style={{
                        backgroundColor: '#222222',
                        borderColor: '#353535',
                        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.6)'
                      }}
                    >
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt={data.full_name || 'Holder Photograph'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex flex-col items-center justify-center text-neutral-500"
                        style={{ display: photoSrc ? 'none' : 'flex', backgroundColor: '#222222' }}
                      >
                        <User className="w-12 h-12 mb-1" style={{ color: '#737373' }} />
                        <span className="text-[10px] uppercase font-semibold" style={{ color: '#737373' }}>Photo</span>
                      </div>
                    </div>
                    {/* Official Verified Status Badge (Active is Green) */}
                    <div
                      className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg border-2"
                      style={{ borderColor: '#171717' }}
                      title="Officially Verified"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />
                    </div>
                  </div>

                  {/* Holder Name */}
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>
                    {data.full_name || '—'}
                  </h2>

                  {/* Entity Type / Designation */}
                  <p className="text-sm font-medium mt-1" style={{ color: '#B5B5B5' }}>
                    {data.entity_type || (isStaff ? (data.designation || 'WorkDen Official Staff') : 'Registered WorkDen User')}
                  </p>

                  {/* ID Code Badge in Golden Accent */}
                  <div
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border"
                    style={{
                      backgroundColor: '#222222',
                      borderColor: '#353535',
                      color: '#F5C542'
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5" style={{ color: '#F5C542' }} />
                    <span>{data.entity_code || data.id_number || '—'}</span>
                  </div>
                </div>

                {/* Structured Information Table */}
                <div
                  className="rounded-2xl border divide-y text-xs overflow-hidden"
                  style={{
                    backgroundColor: '#111111',
                    borderColor: '#353535',
                    divideColor: '#262626'
                  }}
                >
                  
                  {/* ORGANIZATION */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                    <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                      <Building2 className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Organization
                    </span>
                    <span className="font-bold tracking-wide" style={{ color: '#FFFFFF' }}>
                      {data.organization || 'WORKDEN'}
                    </span>
                  </div>

                  {/* ID STATUS (Keep Green) */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                    <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> ID Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.statusText}
                    </span>
                  </div>

                  {/* STAFF ONLY: DESIGNATION & DEPARTMENT */}
                  {isStaff && data.designation && (
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                      <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                        <Award className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Designation
                      </span>
                      <span className="font-medium text-right max-w-[60%]" style={{ color: '#FFFFFF' }}>
                        {data.designation}
                      </span>
                    </div>
                  )}

                  {isStaff && data.department && (
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                      <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                        <Briefcase className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Department
                      </span>
                      <span className="font-medium text-right" style={{ color: '#FFFFFF' }}>
                        {data.department}
                      </span>
                    </div>
                  )}

                  {/* ISSUE DATE */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                    <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Issue Date
                    </span>
                    <span className="font-medium" style={{ color: '#FFFFFF' }}>
                      {formatDate(data.issue_date)}
                    </span>
                  </div>

                  {/* VALID UNTIL */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottomColor: '#262626' }}>
                    <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Valid Until
                    </span>
                    <span className="font-medium" style={{ color: '#FFFFFF' }}>
                      {formatDate(data.expiry_date)}
                    </span>
                  </div>

                  {/* STAFF ONLY: JOINING DATE (Never for Users) */}
                  {isStaff && data.joining_date && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="uppercase tracking-wider font-semibold text-[11px] flex items-center gap-1.5" style={{ color: '#B5B5B5' }}>
                        <Calendar className="w-3.5 h-3.5" style={{ color: '#F5C542' }} /> Joining Date
                      </span>
                      <span className="font-medium" style={{ color: '#FFFFFF' }}>
                        {formatDate(data.joining_date)}
                      </span>
                    </div>
                  )}

                </div>

                {/* Lost Card Instructions Box */}
                {data.lost_card_instructions && (
                  <div
                    className="mt-4 p-4 rounded-2xl border text-left"
                    style={{
                      backgroundColor: '#181818',
                      borderColor: '#353535'
                    }}
                  >
                    <span className="text-[10px] font-bold block uppercase tracking-wider mb-1" style={{ color: '#F5C542' }}>
                      Lost Card Instructions
                    </span>
                    <p className="text-xs leading-relaxed" style={{ color: '#D4D4D4' }}>
                      {data.lost_card_instructions}
                    </p>
                  </div>
                )}

              </div>
            ) : (
              /* Invalid State details */
              <div className="p-8 text-center space-y-3">
                <p className="text-sm" style={{ color: '#B5B5B5' }}>
                  The verification token scanned does not correspond to an active or registered WorkDen identity record.
                </p>
                <div
                  className="p-3 rounded-xl border text-xs font-mono"
                  style={{
                    backgroundColor: '#111111',
                    borderColor: '#353535',
                    color: '#B5B5B5'
                  }}
                >
                  Token: {token}
                </div>
              </div>
            )}

            {/* Official Verification Seal & Footer */}
            <div
              className="px-6 py-5 border-t text-center space-y-1.5"
              style={{
                backgroundColor: '#131313',
                borderColor: '#353535'
              }}
            >
              <div className="inline-flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Officially Verified by WorkDen</span>
              </div>
              <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: '#F5C542' }}>
                WORKDEN · IDENTITY VERIFICATION
              </p>
              <p className="text-[10px]" style={{ color: '#B5B5B5' }}>
                <a
                  href="https://workden.online"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors underline"
                  style={{ color: '#B5B5B5' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#F5C542'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#B5B5B5'; }}
                >
                  workden.online
                </a>
                {' · '}This verification reflects the latest server record.
              </p>
            </div>

          </div>
        )}

      </div>

      {/* Global Page Footer */}
      <footer className="relative z-10 text-center text-[11px] mt-6 space-y-1" style={{ color: '#737373' }}>
        <p>© 2026 WORKDEN. All rights reserved.</p>
        <p>
          Official Verification Portal ·{' '}
          <a
            href="https://workden.online"
            target="_blank"
            rel="noreferrer"
            className="underline transition-colors"
            style={{ color: '#B5B5B5' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F5C542'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#B5B5B5'; }}
          >
            workden.online
          </a>
        </p>
      </footer>
    </div>
  );
}
