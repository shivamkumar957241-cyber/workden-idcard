import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Clock, CheckCircle2, XCircle, AlertCircle,
  Download, QrCode, LogOut, User, Send, Upload, Eye,
  Shield, Calendar, Phone, Mail, Building2, Loader2, RefreshCw, Check
} from 'lucide-react';
import { authFetch, getToken } from '../api';
import { formatIST, formatDateIST } from '../utils/date';
import IdCardRenderer from './IdCardRenderer';
import IdCardPreviewModal from './IdCardPreviewModal';
import PublicVerifyPage from './PublicVerifyPage';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

const VERIFY_BASE = import.meta.env.VITE_VERIFY_BASE_URL || window.location.origin;

const STATUS_CONFIG = {
  PENDING:  { label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30', icon: Clock, dot: 'bg-amber-400' },
  APPROVED: { label: 'Approved & Active', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle2, dot: 'bg-emerald-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30', icon: XCircle, dot: 'bg-red-400' },
};

export const PRICING_PLANS = [
  { price: '₹249', name: 'Basic Access', heading: '₹249 – Basic Access' },
  { price: '₹499', name: 'Full Access', heading: '₹499 – Full Access' },
  { price: '₹699', name: 'Priority Access', heading: '₹699 – Priority Access' },
  { price: '₹999', name: 'Professional Access', heading: '₹999 – Professional Access' },
  { price: '₹1499', name: 'Master Access', heading: '₹1499 – Master Access' }
];

export default function UserDashboard({ user, onLogout }) {
  const [application, setApplication] = useState(null);
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [dashboardCardSide, setDashboardCardSide] = useState('front');
  const [verifyToken, setVerifyToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    mobile: '',
    email: user.email || '',
    photo_url: '',
    application_type: 'USER',
    user_category: 'WorkDen Member',
    current_plan: '₹499 – Full Access',
    residential_address: '',
    father_name: '',
    dob: '',
    gender: 'Male',
    designation: '',
    department: '',
    work_location: '',
    joining_date: new Date().toISOString().split('T')[0]
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, settingsRes] = await Promise.all([
        authFetch('/api/applications/my'),
        authFetch('/api/settings')
      ]);
      const appJson = await appRes.json();
      const settingsJson = await settingsRes.json();
      if (appJson.success && appJson.data.length > 0) {
        setApplication(appJson.data[0]);
      }
      if (settingsJson.success) {
        setSettings(settingsJson.data?.settings);
        setDepartments(settingsJson.data?.departments || []);
        setDesignations(settingsJson.data?.designations || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        setPhotoPreview(base64);
        const res = await authFetch('/api/upload/base64', {
          method: 'POST',
          body: JSON.stringify({ base64, extension: file.name.split('.').pop() })
        });
        const json = await res.json();
        if (json.success) {
          setForm(prev => ({ ...prev, photo_url: json.fileUrl }));
        } else {
          setError('Photo upload failed: ' + (json.error || 'Unknown error'));
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Photo upload failed. Please try again.');
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.mobile) { setError('Mobile number is required.'); return; }
    if (form.application_type === 'STAFF') {
      if (!form.department) { setError('Department is required for Staff ID.'); return; }
      if (!form.designation) { setError('Designation is required for Staff ID.'); return; }
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        user_category: form.application_type === 'STAFF' ? null : form.user_category,
        current_plan: form.application_type === 'STAFF' ? null : form.current_plan,
      };
      const res = await authFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(json.message);
        setShowForm(false);
        fetchData();
      } else {
        setError(json.error || 'Submission failed.');
      }
    } catch {
      setError('Server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const buildCardData = (app) => ({
    full_name: app.full_name,
    photo_url: app.photo_url,
    designation: app.designation,
    department: app.department,
    entity_code: app.id_number,
    profile_type: app.application_type,
    issue_date: app.issue_date,
    expiry_date: app.expiry_date,
    qr_token: app.qr_token,
    card_status: app.card_status,
    user_category: app.user_category,
    current_plan: app.current_plan,
    mobile: app.mobile,
    phone: app.mobile,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#F5C542] animate-spin mx-auto mb-4" />
          <p className="text-[#B5B5B5] text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  // Public verification overlay
  if (verifyToken) {
    return <PublicVerifyPage token={verifyToken} onBack={() => setVerifyToken(null)} />;
  }

  // Filtered designations based on selected department
  const availableDesignations = form.department
    ? designations.filter(d => !d.department_name || d.department_name === form.department)
    : designations;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="border-b border-[#353535] bg-[#121212] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-[#F5C542]/40 flex items-center justify-center p-1.5 shadow-md">
              <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-wider flex items-center gap-1.5">
                WORKDEN <span className="text-[#F5C542] text-[10px] font-mono border border-[#F5C542]/40 px-1.5 py-0.2 rounded">PORTAL</span>
              </h1>
              <p className="text-[#B5B5B5] text-xs">Official Member ID & Verification Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#171717] border border-[#353535] rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[#B5B5B5] text-xs font-medium">{user.full_name}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-[#B5B5B5] hover:text-[#F5C542] text-xs px-3 py-1.5 rounded-lg border border-[#353535] hover:border-[#F5C542]/50 bg-[#171717] transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Welcome banner */}
        <div className="bg-[#171717] border border-[#353535] rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[#F5C542] text-xs font-bold tracking-widest uppercase">Member ID Services</span>
                <span className="text-[#353535]">·</span>
                <span className="text-[#888] text-xs font-medium">Official Portal</span>
                {application && application.status === 'APPROVED' && (
                  <>
                    <span className="text-[#353535]">·</span>
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Account
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-black text-white mb-1">Welcome back, {user.full_name.split(' ')[0]} 👋</h2>
              <p className="text-[#B5B5B5] text-sm">Apply for your official WorkDen Member ID Card, download your issued ID card, and verify ID card details anytime.</p>
            </div>
            {application && application.status === 'APPROVED' && (
              <button
                onClick={() => setShowIdCard(true)}
                className="px-4 py-2.5 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all self-start sm:self-center shadow-lg shadow-[#F5C542]/10"
              >
                <Eye className="w-4 h-4 text-black" /> View Full ID Card
              </button>
            )}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Application status card */}
        {application ? (
          <div className="space-y-5">
            {/* Status Card */}
            <div className="bg-[#171717] border border-[#353535] rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[11px] font-bold text-[#F5C542] uppercase tracking-wider">Credential Status</span>
                    <h3 className="text-white font-bold text-lg mt-0.5">WorkDen ID Card Application</h3>
                    <p className="text-[#B5B5B5] text-xs mt-0.5">
                      Submitted on {formatDateIST(application.created_at)}
                    </p>
                  </div>
                  {(() => {
                    const cfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </div>
                    );
                  })()}
                </div>

                {/* Timeline */}
                <div className="space-y-3 mt-5">
                  {[
                    { step: 'Application Submitted', done: true, date: application.created_at },
                    { step: 'Under Admin Review', done: application.status !== 'PENDING', active: application.status === 'PENDING' },
                    {
                      step: application.status === 'REJECTED' ? 'Application Rejected' : 'ID Card Issued',
                      done: application.status === 'APPROVED' || application.status === 'REJECTED',
                      rejected: application.status === 'REJECTED',
                      date: application.reviewed_at
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.rejected ? 'bg-red-500/20 border border-red-500/40' :
                        item.done ? 'bg-emerald-500/20 border border-emerald-500/40' :
                        item.active ? 'bg-amber-500/20 border border-amber-500/40 animate-pulse' :
                        'bg-[#222222] border border-[#353535]'
                      }`}>
                        {item.rejected ? <XCircle className="w-3.5 h-3.5 text-red-400" /> :
                         item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                         item.active ? <Clock className="w-3.5 h-3.5 text-amber-400" /> :
                         <div className="w-2 h-2 rounded-full bg-[#555]" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.rejected ? 'text-red-400' : item.done ? 'text-white' : item.active ? 'text-amber-300' : 'text-[#777]'}`}>
                          {item.step}
                        </p>
                        {item.date && (
                          <p className="text-[#888] text-xs">{formatDateIST(item.date)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rejection reason */}
                {application.status === 'REJECTED' && application.rejection_reason && (
                  <div className="mt-5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                    <p className="text-red-400 text-xs font-semibold mb-1">Reason for Rejection</p>
                    <p className="text-red-300 text-sm">{application.rejection_reason}</p>
                    <button
                      onClick={() => { setApplication(null); setShowForm(true); }}
                      className="mt-3 text-xs text-[#F5C542] hover:underline font-semibold transition-colors"
                    >
                      Re-apply for ID Card →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ID Card (approved only) */}
            {application.status === 'APPROVED' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#F5C542]" /> Official WorkDen ID Card
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchData}
                      className="flex items-center gap-1.5 text-[#B5B5B5] hover:text-[#F5C542] text-xs px-3 py-1.5 rounded-lg border border-[#353535] bg-[#171717] transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>
                </div>

                {/* ID Card preview with front/back toggle */}
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-[#121212] rounded-2xl border border-[#353535]">
                  <div className="flex items-center gap-2 mb-4 bg-[#1e1e1e] p-1 rounded-xl border border-[#353535]">
                    <button
                      type="button"
                      onClick={() => setDashboardCardSide('front')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dashboardCardSide === 'front'
                          ? 'bg-[#F5C542] text-black shadow-md shadow-[#F5C542]/20'
                          : 'text-[#888] hover:text-white'
                      }`}
                    >
                      Front Side
                    </button>
                    <button
                      type="button"
                      onClick={() => setDashboardCardSide('back')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        dashboardCardSide === 'back'
                          ? 'bg-[#F5C542] text-black shadow-md shadow-[#F5C542]/20'
                          : 'text-[#888] hover:text-white'
                      }`}
                    >
                      Back Side (Instructions)
                    </button>
                  </div>
                  <div className="relative shrink-0 overflow-x-auto max-w-full">
                    <div className="absolute -inset-4 bg-[#F5C542]/5 rounded-3xl blur-xl" />
                    <IdCardRenderer
                      card={buildCardData(application)}
                      settings={settings}
                      side={dashboardCardSide}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4">
                  <button
                    onClick={() => setShowIdCard(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#222222] border border-[#353535] hover:border-[#F5C542] text-white hover:text-[#F5C542] rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Preview & Print Card
                  </button>
                  {application.qr_token && (
                    <button
                      onClick={() => setVerifyToken(application.qr_token)}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-[#222222] border border-[#353535] hover:border-[#F5C542] text-white hover:text-[#F5C542] rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-[#F5C542]" /> Test QR Page
                    </button>
                  )}
                  <a
                    href={application.qr_token ? `${VERIFY_BASE}/verify/${application.qr_token}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold rounded-xl text-sm transition-all shadow-md shadow-[#F5C542]/10"
                  >
                    <Shield className="w-4 h-4" /> Live Verification ↗
                  </a>
                </div>

                {/* Card details */}
                <div className="bg-[#171717] border border-[#353535] rounded-2xl p-5">
                  <h4 className="text-white font-bold text-sm mb-4 pb-2 border-b border-[#353535] flex items-center justify-between">
                    <span>Card Information & Credentials</span>
                    <span className="text-[11px] font-mono text-[#F5C542]">{application.card_status}</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'ID NUMBER', value: application.id_number },
                      { label: 'CARD TYPE', value: application.application_type === 'STAFF' ? 'Staff ID' : 'Member ID' },
                      application.application_type === 'STAFF'
                        ? { label: 'DEPARTMENT', value: application.department || 'Administration' }
                        : { label: 'CURRENT PLAN', value: application.current_plan || 'Active Member' },
                      { label: 'EXPIRY DATE', value: formatDateIST(application.expiry_date) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#222222] p-3 rounded-xl border border-[#353535]">
                        <p className="text-[#888] text-[10px] font-bold tracking-wider mb-1">{label}</p>
                        <p className="text-white text-xs font-semibold truncate">{value || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* Lost Card Instructions Box */}
                  <div className="mt-4 p-4 rounded-xl bg-[#222222] border border-[#353535] flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-[#F5C542]" />
                    </div>
                    <div>
                      <p className="text-[#F5C542] text-[11px] font-bold uppercase tracking-wider">
                        Lost Card Instructions
                      </p>
                      <p className="text-[#D4D4D4] text-xs mt-1 leading-relaxed">
                        {settings?.lost_card_instructions || 'If found, please immediately return to WorkDen Security or email contact@workden.online / Call +91 98765 43210'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : showForm ? (
          /* Application Form */
          <div className="bg-[#171717] border border-[#353535] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#353535] bg-[#121212] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#F5C542] uppercase tracking-wider">Identity Card Registration</span>
                <h3 className="text-white font-extrabold text-lg mt-0.5">WorkDen Official ID Card Application</h3>
                <p className="text-[#B5B5B5] text-xs mt-1">Complete your registration below. Once submitted, your ID will be approved by the admin team.</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#888] hover:text-white p-2 rounded-xl hover:bg-[#222222] transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Photo upload */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-3 uppercase tracking-wider">Profile Photograph</label>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-2xl bg-[#222222] border-2 border-dashed border-[#444] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-[#666]" />
                    )}
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={e => handlePhotoUpload(e.target.files[0])} />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#222222] border border-[#353535] hover:border-[#F5C542] text-white rounded-xl text-xs font-bold transition-all"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin text-[#F5C542]" /> : <Upload className="w-4 h-4 text-[#F5C542]" />}
                      {uploading ? 'Uploading...' : 'Choose Profile Photo'}
                    </button>
                    <p className="text-[#888] text-[11px] mt-1.5">JPEG, PNG or WebP · High quality portrait photo · Max 5MB</p>
                    {form.photo_url && <p className="text-emerald-400 text-xs font-semibold mt-1">✓ Photo uploaded successfully</p>}
                  </div>
                </div>
              </div>

              {/* Card type */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-bold mb-2 uppercase tracking-wider">Select ID Card Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'USER', label: 'Member ID Card', desc: 'For coworking members, clients & founders' },
                    { value: 'STAFF', label: 'Staff ID Card', desc: 'For official WorkDen team & employees' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, application_type: opt.value }))}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        form.application_type === opt.value
                          ? 'bg-[#222222] border-[#F5C542] text-white shadow-md'
                          : 'bg-[#121212] border-[#353535] text-[#888] hover:border-[#555]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`font-bold text-sm ${form.application_type === opt.value ? 'text-[#F5C542]' : 'text-white'}`}>
                          {opt.label}
                        </p>
                        {form.application_type === opt.value && (
                          <span className="w-2 h-2 rounded-full bg-[#F5C542]"></span>
                        )}
                      </div>
                      <p className="text-xs text-[#B5B5B5] mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-[#121212] p-5 rounded-2xl border border-[#353535] space-y-4">
                <h4 className="text-white font-bold text-sm flex items-center gap-2 border-b border-[#353535] pb-2">
                  <User className="w-4 h-4 text-[#F5C542]" /> Personal Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name *', key: 'full_name', type: 'text', placeholder: 'Full Name as per official ID' },
                    { label: "Father's Name", key: 'father_name', type: 'text', placeholder: 'Optional' },
                    { label: 'Date of Birth', key: 'dob', type: 'date' },
                    { label: 'Gender', key: 'gender', type: 'select', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
                    { label: 'Mobile Number *', key: 'mobile', type: 'tel', placeholder: '+91 98765 43210' },
                    { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'your@email.com' },
                  ].map(({ label, key, type, placeholder, options }) => (
                    <div key={key}>
                      <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5">{label}</label>
                      {type === 'select' ? (
                        <select
                          value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C542] transition-all cursor-pointer"
                        >
                          {options.map(o => <option key={o} value={o} className="bg-[#171717] text-white">{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={type} value={form[key]} placeholder={placeholder}
                          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] text-sm focus:outline-none focus:border-[#F5C542] transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5">Residential Address</label>
                  <textarea
                    value={form.residential_address}
                    onChange={e => setForm(p => ({ ...p, residential_address: e.target.value }))}
                    placeholder="Full residential address (Street, City, PIN code)"
                    rows={2}
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] text-sm focus:outline-none focus:border-[#F5C542] transition-all resize-none"
                  />
                </div>
              </div>

              {/* Staff-specific fields */}
              {form.application_type === 'STAFF' && (
                <div className="bg-[#121212] p-5 rounded-2xl border border-[#353535] space-y-4">
                  <h4 className="text-white font-bold text-sm flex items-center gap-2 border-b border-[#353535] pb-2">
                    <Building2 className="w-4 h-4 text-[#F5C542]" /> Employment Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Department Dropdown */}
                    <div>
                      <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Department <span className="text-[#F5C542]">*</span>
                      </label>
                      <select
                        value={form.department}
                        onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                        className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C542] transition-all cursor-pointer"
                        required
                      >
                        <option value="" className="bg-[#171717] text-[#888]">-- Select Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name} className="bg-[#171717] text-white">
                            {d.name}
                          </option>
                        ))}
                      </select>
                      {departments.length === 0 && (
                        <p className="text-[11px] text-[#888] mt-1">No departments configured yet in settings.</p>
                      )}
                    </div>

                    {/* Designation Dropdown */}
                    <div>
                      <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5 uppercase tracking-wider">
                        Designation <span className="text-[#F5C542]">*</span>
                      </label>
                      <select
                        value={form.designation}
                        onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                        className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C542] transition-all cursor-pointer"
                        required
                      >
                        <option value="" className="bg-[#171717] text-[#888]">-- Select Designation --</option>
                        {availableDesignations.map(d => (
                          <option key={d.id} value={d.name} className="bg-[#171717] text-white">
                            {d.name} {d.department_name && !form.department ? `(${d.department_name})` : ''}
                          </option>
                        ))}
                        {form.designation && !availableDesignations.some(d => d.name === form.designation) && (
                          <option value={form.designation} className="bg-[#171717] text-white">{form.designation}</option>
                        )}
                      </select>
                      {availableDesignations.length === 0 && (
                        <p className="text-[11px] text-[#888] mt-1">Please select a department or check admin settings.</p>
                      )}
                    </div>

                    {/* Joining Date */}
                    <div>
                      <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5">Joining Date</label>
                      <input
                        type="date"
                        value={form.joining_date}
                        onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))}
                        className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#F5C542] transition-all"
                      />
                    </div>

                    {/* Work Location */}
                    <div>
                      <label className="block text-[#B5B5B5] text-xs font-semibold mb-1.5">Work Location</label>
                      <input
                        type="text"
                        value={form.work_location}
                        placeholder="e.g. Noida Sector 62, Delhi, Remote, etc."
                        onChange={e => setForm(p => ({ ...p, work_location: e.target.value }))}
                        className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] text-sm focus:outline-none focus:border-[#F5C542] transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* User-specific fields */}
              {form.application_type === 'USER' && (
                <div className="space-y-4">
                  {/* Member Category */}
                  <div className="bg-[#121212] p-5 rounded-2xl border border-[#353535]">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-[#B5B5B5] text-xs font-bold uppercase tracking-wider">Member Category</label>
                        <p className="text-xs text-[#888] mt-0.5">Official Verified Membership</p>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#222222] border border-[#F5C542]/40 rounded-xl">
                        <span className="w-2 h-2 rounded-full bg-[#F5C542]"></span>
                        <span className="text-white text-xs font-bold tracking-wide">WorkDen Member</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Pricing Plans */}
                  <div className="bg-[#121212] p-5 rounded-2xl border border-[#353535]">
                    <label className="block text-[#B5B5B5] text-xs font-bold mb-3 uppercase tracking-wider">
                      Select Active Membership Plan
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {PRICING_PLANS.map(plan => {
                        const isSelected = form.current_plan === plan.heading || form.current_plan === plan.name || form.current_plan?.startsWith(plan.price);
                        return (
                          <button
                            key={plan.price}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, current_plan: plan.heading }))}
                            className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#1e1e1e] border-[#F5C542] text-white shadow-xl shadow-[#F5C542]/10 ring-1 ring-[#F5C542]'
                                : 'bg-[#171717] border-[#353535] text-[#B5B5B5] hover:border-[#555] hover:bg-[#1c1c1c]'
                            }`}
                          >
                            <div className="text-lg font-black text-[#F5C542]">{plan.price}</div>
                            <div className="text-xs font-bold text-white mt-1">{plan.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex items-center gap-2 px-6 py-3 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold rounded-xl transition-all text-sm disabled:opacity-60 shadow-lg shadow-[#F5C542]/20"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4 text-black" />}
                  {submitting ? 'Submitting Application...' : 'Submit Application'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-[#222222] border border-[#353535] text-[#B5B5B5] hover:text-white rounded-xl hover:bg-[#2a2a2a] transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* No application yet */
          <div className="bg-[#171717] border border-[#353535] rounded-2xl p-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-black border border-[#F5C542]/40 flex items-center justify-center mx-auto mb-5 p-3 shadow-lg">
              <img src={WORKDEN_LOGO_BASE64} alt="WorkDen" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-bold text-[#F5C542] uppercase tracking-widest block mb-1">Official ID Credential</span>
            <h3 className="text-white font-extrabold text-xl mb-2">Apply for Your WorkDen ID Card</h3>
            <p className="text-[#B5B5B5] text-sm mb-6 max-w-md mx-auto">
              Get your official WorkDen ID card with secure QR code verification, CR80 printable card format, and instant access to WorkDen spaces.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-black rounded-xl transition-all shadow-xl shadow-[#F5C542]/20 uppercase tracking-wider text-xs"
            >
              <Send className="w-4 h-4 text-black" />
              Apply for ID Card
            </button>
          </div>
        )}
      </main>

      {/* ID Card full preview modal */}
      {showIdCard && application && (
        <IdCardPreviewModal
          card={buildCardData(application)}
          settings={settings}
          isOpen={showIdCard}
          onClose={() => setShowIdCard(false)}
          onSimulateScan={(token) => {
            setShowIdCard(false);
            setVerifyToken(token);
          }}
        />
      )}
    </div>
  );
}
