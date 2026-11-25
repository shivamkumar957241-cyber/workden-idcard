import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase, Clock, CheckCircle2, XCircle, AlertCircle,
  Download, QrCode, LogOut, User, Send, Upload, Eye,
  Shield, Calendar, Phone, Mail, Building2, Loader2, RefreshCw, Check,
  FileText, ExternalLink, Printer, Bell, ArrowRight, Lock, Unlock,
  HelpCircle, Sparkles, FileCheck, Layers
} from 'lucide-react';
import { authFetch } from '../api';
import { formatIST, formatDateIST } from '../utils/date';
import IdCardRenderer from './IdCardRenderer';
import IdCardPreviewModal from './IdCardPreviewModal';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function StaffDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | apply | card | notifications | profile
  const [application, setApplication] = useState(null);
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showIdPreviewModal, setShowIdPreviewModal] = useState(false);
  const [dashboardCardSide, setDashboardCardSide] = useState('front');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Staff Form
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    mobile: '',
    email: user?.email || '',
    photo_url: '',
    father_name: '',
    dob: '',
    gender: 'Male',
    city: '',
    residential_address: '',
    qualification: '',
    aadhar_number: '',
    aadhar_front: '',
    aadhar_back: '',
    department: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'Full-time',
    work_location: 'Headquarters - Noida',
    remarks: ''
  });

  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadharFront, setUploadingAadharFront] = useState(false);
  const [uploadingAadharBack, setUploadingAadharBack] = useState(false);

  const fileInputRef = useRef(null);
  const aadharFrontInputRef = useRef(null);
  const aadharBackInputRef = useRef(null);

  // Fetch Staff Application, Settings, Departments, Designations & Notifications
  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, settingsRes, notifRes] = await Promise.all([
        authFetch('/api/applications/my'),
        authFetch('/api/settings'),
        authFetch('/api/payments/notifications').catch(() => null)
      ]);

      const appJson = await appRes.json();
      const settingsJson = await settingsRes.json();

      if (appJson.success && appJson.data && appJson.data.length > 0) {
        // Find staff application
        const staffApp = appJson.data.find(a => a.application_type === 'STAFF') || appJson.data[0];
        setApplication(staffApp);
      } else {
        setApplication(null);
      }

      if (settingsJson.success) {
        setSettings(settingsJson.data?.settings);
        setDepartments(settingsJson.data?.departments || []);
        setDesignations(settingsJson.data?.designations || []);
      }

      if (notifRes && notifRes.ok) {
        const notifJson = await notifRes.json();
        if (notifJson.success) {
          setNotifications(notifJson.data || []);
          setUnreadNotifCount((notifJson.data || []).filter(n => !n.is_read).length);
        }
      }
    } catch (err) {
      console.error('Staff dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Photo Upload
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB.');
      return;
    }
    setUploadingPhoto(true);
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
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Photo upload failed.');
      setUploadingPhoto(false);
    }
  };

  // Handle Aadhar Document Upload (Front or Back)
  const handleAadharUpload = async (file, side) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Aadhar document must be under 10MB.');
      return;
    }
    const isFront = side === 'front';
    if (isFront) setUploadingAadharFront(true);
    else setUploadingAadharBack(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result;
        const ext = file.name.split('.').pop().toLowerCase();
        const res = await authFetch('/api/upload/base64', {
          method: 'POST',
          body: JSON.stringify({ base64, extension: ext, originalName: file.name })
        });
        const json = await res.json();
        if (json.success) {
          if (isFront) {
            setForm(prev => ({ ...prev, aadhar_front: json.fileUrl }));
          } else {
            setForm(prev => ({ ...prev, aadhar_back: json.fileUrl }));
          }
        } else {
          setError('Aadhar upload failed: ' + (json.error || 'Unknown error'));
        }
        if (isFront) setUploadingAadharFront(false);
        else setUploadingAadharBack(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Aadhar upload failed. Please try again.');
      if (isFront) setUploadingAadharFront(false);
      else setUploadingAadharBack(false);
    }
  };

  // Submit Free Staff ID Application
  const handleSubmitStaffApplication = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.mobile) { setError('Mobile number is required.'); return; }
    if (!form.city) { setError('City is required.'); return; }
    if (!form.department) { setError('Department is required for Staff ID.'); return; }
    if (!form.designation) { setError('Designation is required for Staff ID.'); return; }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          application_type: 'STAFF'
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Staff ID card application submitted successfully! It is now under review by Admin.');
        fetchData();
        setActiveTab('overview');
      } else {
        setError(json.error || 'Failed to submit application.');
      }
    } catch (err) {
      setError('Server error while submitting application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkNotifsRead = async () => {
    try {
      await authFetch('/api/payments/notifications/read-all', { method: 'POST' });
      setUnreadNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const isApproved = application?.status === 'APPROVED';
  const isPending = application?.status === 'PENDING';
  const isRejected = application?.status === 'REJECTED';

  // Card Data for IdCardRenderer (Staff)
  const cardData = application && isApproved ? {
    id: application.card_id,
    card_number: `CRD-STF-${application.id_number || 'WD-EMP'}`,
    entity_code: application.id_number || 'WD-EMP',
    profile_type: 'STAFF',
    full_name: application.full_name,
    photo_url: application.photo_url,
    designation: application.designation,
    department: application.department,
    mobile: application.mobile,
    email: application.email,
    issue_date: application.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: application.expiry_date || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    qr_token: application.qr_token,
    status: application.card_status || 'ACTIVE'
  } : null;

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#353535] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black border border-[#F5C542]/40 p-1 flex items-center justify-center shadow-lg">
            <img src={WORKDEN_LOGO_BASE64} alt="WorkDen" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide text-white">WORKDEN</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40">
                STAFF PORTAL
              </span>
            </div>
            <p className="text-[11px] text-[#888] hidden sm:block">Employee & Operations Management</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('notifications'); handleMarkNotifsRead(); }}
            className="relative p-2 rounded-xl bg-[#1c1c1c] hover:bg-[#252525] border border-[#353535] text-[#aaa] hover:text-white transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F5C542] text-black font-black text-[10px] flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#353535]">
            <div className="w-6 h-6 rounded-lg bg-[#F5C542]/20 text-[#F5C542] font-black text-xs flex items-center justify-center">
              {user?.full_name?.[0] || 'S'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold leading-tight">{user?.full_name}</p>
              <p className="text-[10px] text-[#777] leading-tight">WorkDen Staff</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="bg-[#141414] border-b border-[#2a2a2a] px-4 sm:px-8 overflow-x-auto">
        <div className="flex items-center gap-2 py-2.5 min-w-max">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
            { id: 'apply', label: application ? 'My Staff Application' : 'Apply for Staff ID (Free)', icon: FileText },
            ...(isApproved ? [{ id: 'card', label: 'Download Staff ID Card', icon: Download, badge: 'Free' }] : []),
            { id: 'notifications', label: `Notifications ${unreadNotifCount > 0 ? `(${unreadNotifCount})` : ''}`, icon: Bell },
            { id: 'profile', label: 'Staff Profile', icon: User }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#F5C542] text-black shadow-lg shadow-[#F5C542]/20'
                    : 'text-[#aaa] hover:text-white hover:bg-[#1f1f1f]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#777]'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black text-[#F5C542]' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Toast Messages */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-white font-bold">✕</button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-white font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-[#F5C542] animate-spin mb-3" />
            <p className="text-xs text-[#888]">Loading Staff Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* TAB 1: OVERVIEW */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1c] via-[#161616] to-[#0f0f0f] border border-[#353535] rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Staff System — 100% Free Application & ID Card</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Welcome, {user?.full_name || 'Staff Member'}
                      </h1>
                      <p className="text-[#888] text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
                        WorkDen Official Staff Identity Portal. Submit your employment and Aadhar verification details.
                        Once Admin approves your application, your Staff ID Card is immediately available for download at zero cost.
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {!application && (
                        <button
                          onClick={() => setActiveTab('apply')}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs sm:text-sm shadow-xl shadow-[#F5C542]/20 transition transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <Briefcase className="w-4 h-4" />
                          <span>Apply for Staff ID Card →</span>
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => setActiveTab('card')}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download Staff ID Card →</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workflow Cards */}
                <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6">
                  <h3 className="text-white font-extrabold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F5C542]" /> Staff ID Card Workflow
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-2xl border transition ${
                      application ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 1</span>
                        {application ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-[#555]" />}
                      </div>
                      <p className="font-bold text-xs">Staff Application</p>
                      <p className="text-[11px] text-[#777] mt-1">Submit employee, city, qualification, & Aadhar documents</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {application ? 'Submitted' : 'Pending'}
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border transition ${
                      isApproved ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : isPending ? 'bg-[#1f1f1f] border-amber-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 2</span>
                        {isApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : isPending ? <Clock className="w-4 h-4 text-amber-400" /> : <div className="w-2 h-2 rounded-full bg-[#555]" />}
                      </div>
                      <p className="font-bold text-xs">Admin Verification</p>
                      <p className="text-[11px] text-[#777] mt-1">HR & Admin review employment and Aadhar documents</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-400' : isPending ? 'bg-amber-500/10 text-amber-300' : 'bg-[#222] text-[#666]'
                      }`}>
                        {isApproved ? 'Approved' : isPending ? 'In Review' : 'Waiting'}
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border transition ${
                      isApproved ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 3</span>
                        {isApproved ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-[#555]" />}
                      </div>
                      <p className="font-bold text-xs">Direct Free Download</p>
                      <p className="text-[11px] text-[#777] mt-1">Staff ID card is immediately active without any payment</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#222] text-[#666]'
                      }`}>
                        {isApproved ? 'Free Download Ready' : 'Locked'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Box */}
                {application && (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#2a2a2a]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-extrabold text-base">Staff Application Status</h3>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            isApproved ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                            isPending ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                            'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}>
                            {isApproved ? 'APPROVED' : isPending ? 'UNDER REVIEW' : 'REJECTED'}
                          </span>
                        </div>
                        <p className="text-[#888] text-xs mt-1">
                          Applied on {formatDateIST(application.created_at)} • Application #{application.id}
                        </p>
                      </div>

                      {isApproved && (
                        <button
                          onClick={() => setActiveTab('card')}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Staff Card</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Employee Name</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.full_name}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Department</p>
                        <p className="text-[#F5C542] font-bold text-xs mt-0.5 truncate">{application.department || 'Operations'}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Designation</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.designation || 'Staff'}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">City / Location</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.city || 'Noida'}</p>
                      </div>
                    </div>

                    {isRejected && (
                      <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                        <p className="font-bold flex items-center gap-1.5 mb-1">
                          <XCircle className="w-4 h-4" /> Application Rejected
                        </p>
                        <p className="text-[#aaa]">
                          Reason: {application.rejection_reason || 'Information could not be verified.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: APPLY FOR STAFF ID (FREE) */}
            {/* ======================================================== */}
            {activeTab === 'apply' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Official Staff Registration — 100% Free</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">Staff ID Card Application</h2>
                  <p className="text-[#888] text-xs mt-1.5 max-w-md mx-auto">
                    Submit your employee identity details, qualification, city, and Aadhar documents below.
                  </p>
                </div>

                <form onSubmit={handleSubmitStaffApplication} className="space-y-6">
                  {/* Photo Upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-[#121212] border border-[#2e2e2e]">
                    <div className="w-24 h-28 rounded-2xl bg-black border-2 border-dashed border-[#F5C542]/40 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                      {photoPreview || form.photo_url ? (
                        <img
                          src={photoPreview || form.photo_url}
                          alt="Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <User className="w-8 h-8 text-[#555] mx-auto mb-1" />
                          <span className="text-[10px] text-[#777]">Staff Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-white font-bold text-xs mb-1">Staff Profile Photograph</p>
                      <p className="text-[#777] text-[11px] mb-3">
                        Professional headshot on neutral background. Max 5MB.
                      </p>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={e => handlePhotoUpload(e.target.files[0])}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="px-4 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#F5C542]/40 text-[#F5C542] rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer mx-auto sm:mx-0 disabled:opacity-50"
                      >
                        {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{uploadingPhoto ? 'Uploading...' : 'Choose Staff Photo'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal & Work Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="e.g. Aman Singh"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={form.mobile}
                        onChange={e => setForm({ ...form, mobile: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Work Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. aman@workden.online"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">City *</label>
                      <input
                        type="text"
                        required
                        value={form.city}
                        onChange={e => setForm({ ...form, city: e.target.value })}
                        placeholder="e.g. Noida / Bangalore"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Qualification</label>
                      <input
                        type="text"
                        value={form.qualification}
                        onChange={e => setForm({ ...form, qualification: e.target.value })}
                        placeholder="e.g. B.Tech / MBA / Graduate"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Aadhar Number</label>
                      <input
                        type="text"
                        value={form.aadhar_number}
                        onChange={e => setForm({ ...form, aadhar_number: e.target.value })}
                        placeholder="12-digit Aadhar Number"
                        maxLength={14}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Department *</label>
                      <select
                        required
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Designation *</label>
                      <input
                        type="text"
                        required
                        value={form.designation}
                        onChange={e => setForm({ ...form, designation: e.target.value })}
                        placeholder="e.g. Operations Manager"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Date of Joining</label>
                      <input
                        type="date"
                        value={form.joining_date}
                        onChange={e => setForm({ ...form, joining_date: e.target.value })}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Work Location</label>
                      <input
                        type="text"
                        value={form.work_location}
                        onChange={e => setForm({ ...form, work_location: e.target.value })}
                        placeholder="e.g. Headquarters - Noida"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Aadhar Upload Section */}
                  <div className="bg-[#121212] border border-[#2e2e2e] rounded-2xl p-5 space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-xs flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#F5C542]" /> Upload Aadhar Card (Both Sides)
                      </h4>
                      <p className="text-[#777] text-[11px] mt-0.5">
                        Upload front and back side of your Aadhar Card (Image JPG/PNG or PDF up to 10MB each).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Front Side */}
                      <div className="p-4 rounded-xl bg-[#171717] border border-[#353535] text-center">
                        <p className="text-white font-bold text-xs mb-2">Aadhar Card - Front Side</p>
                        <input
                          type="file"
                          ref={aadharFrontInputRef}
                          accept="image/*,application/pdf"
                          onChange={e => handleAadharUpload(e.target.files[0], 'front')}
                          className="hidden"
                        />
                        {form.aadhar_front ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Front Side Uploaded</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => aadharFrontInputRef.current?.click()}
                              className="text-[10px] text-[#888] hover:text-white underline"
                            >
                              Replace file
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aadharFrontInputRef.current?.click()}
                            disabled={uploadingAadharFront}
                            className="px-3.5 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#F5C542]/40 text-[#F5C542] rounded-xl text-xs font-semibold transition flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                          >
                            {uploadingAadharFront ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            <span>{uploadingAadharFront ? 'Uploading...' : 'Upload Front Side'}</span>
                          </button>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className="p-4 rounded-xl bg-[#171717] border border-[#353535] text-center">
                        <p className="text-white font-bold text-xs mb-2">Aadhar Card - Back Side</p>
                        <input
                          type="file"
                          ref={aadharBackInputRef}
                          accept="image/*,application/pdf"
                          onChange={e => handleAadharUpload(e.target.files[0], 'back')}
                          className="hidden"
                        />
                        {form.aadhar_back ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Back Side Uploaded</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => aadharBackInputRef.current?.click()}
                              className="text-[10px] text-[#888] hover:text-white underline"
                            >
                              Replace file
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => aadharBackInputRef.current?.click()}
                            disabled={uploadingAadharBack}
                            className="px-3.5 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#F5C542]/40 text-[#F5C542] rounded-xl text-xs font-semibold transition flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                          >
                            {uploadingAadharBack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            <span>{uploadingAadharBack ? 'Uploading...' : 'Upload Back Side'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Residential Address</label>
                    <textarea
                      rows={2}
                      value={form.residential_address}
                      onChange={e => setForm({ ...form, residential_address: e.target.value })}
                      placeholder="Full residential address"
                      className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-sm rounded-2xl shadow-xl shadow-[#F5C542]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{submitting ? 'Submitting Staff Application...' : 'Submit Staff Application (Free) →'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: DOWNLOAD STAFF ID CARD (COMPLETELY FREE) */}
            {/* ======================================================== */}
            {activeTab === 'card' && (
              <div className="space-y-6">
                {!isApproved ? (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-12 text-center max-w-md mx-auto">
                    <Clock className="w-12 h-12 text-[#F5C542] mx-auto mb-4" />
                    <h3 className="text-white font-extrabold text-lg">Staff Application Pending</h3>
                    <p className="text-[#888] text-xs mt-2 leading-relaxed">
                      Your Staff ID application is currently being verified by the Admin team. Once approved,
                      your official Staff ID Card will be available for direct free download.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#2a2a2a]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-white font-extrabold text-lg">Official Staff ID Card</h2>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            Active & Verified (Free)
                          </span>
                        </div>
                        <p className="text-[#888] text-xs mt-0.5">
                          Staff ID {application.id_number} • Direct high-resolution download with zero payment required.
                        </p>
                      </div>

                      <button
                        onClick={() => setShowIdPreviewModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Preview & Download PDF</span>
                      </button>
                    </div>

                    {/* Interactive Preview */}
                    <div className="flex flex-col items-center">
                      <div className="flex gap-2 mb-4 bg-[#121212] p-1 rounded-xl border border-[#353535]">
                        <button
                          onClick={() => setDashboardCardSide('front')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            dashboardCardSide === 'front' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                          }`}
                        >
                          Front Side
                        </button>
                        <button
                          onClick={() => setDashboardCardSide('back')}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            dashboardCardSide === 'back' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                          }`}
                        >
                          Back Side
                        </button>
                      </div>

                      <div className="relative w-full max-w-[340px] aspect-[54/85.6] rounded-2xl overflow-hidden shadow-2xl border border-[#353535]">
                        {cardData && (
                          <IdCardRenderer
                            card={cardData}
                            settings={settings}
                            side={dashboardCardSide}
                          />
                        )}
                      </div>

                      <p className="text-[11px] text-[#777] mt-4 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#F5C542]" />
                        Official WorkDen Staff Identification • Cryptographically signed QR code.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: NOTIFICATIONS */}
            {/* ======================================================== */}
            {activeTab === 'notifications' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2a2a]">
                  <div>
                    <h2 className="text-white font-extrabold text-lg flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#F5C542]" /> Staff Notifications
                    </h2>
                    <p className="text-[#888] text-xs mt-0.5">Status updates on your application</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkNotifsRead}
                      className="text-xs text-[#F5C542] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-[#666] text-xs">
                    <Bell className="w-10 h-10 mx-auto mb-2 text-[#444]" />
                    No notifications yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-2xl border transition ${
                          n.is_read ? 'bg-[#121212] border-[#252525]' : 'bg-[#1a1a1a] border-[#F5C542]/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-white font-bold text-xs">{n.title}</p>
                            <p className="text-[#aaa] text-xs mt-1 leading-relaxed">{n.message}</p>
                          </div>
                          <span className="text-[10px] text-[#666] flex-shrink-0">
                            {formatDateIST(n.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: STAFF PROFILE */}
            {/* ======================================================== */}
            {activeTab === 'profile' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#2a2a2a]">
                  <div className="w-16 h-16 rounded-2xl bg-black border-2 border-[#F5C542]/40 overflow-hidden flex items-center justify-center text-[#F5C542] font-black text-2xl">
                    {application?.photo_url ? (
                      <img src={application.photo_url} alt="Staff Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.full_name?.[0] || 'S'
                    )}
                  </div>
                  <div>
                    <h2 className="text-white font-black text-xl">{user?.full_name}</h2>
                    <p className="text-[#888] text-xs">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/30">
                      WorkDen Staff Account
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Account Role</span>
                    <span className="text-white font-bold">STAFF</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Department</span>
                    <span className="text-[#F5C542] font-bold">{application?.department || 'Not Assigned'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Designation</span>
                    <span className="text-white font-bold">{application?.designation || 'Staff'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">City</span>
                    <span className="text-white font-bold">{application?.city || 'Not Specified'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Staff ID Card</span>
                    <span className="text-emerald-400 font-bold">
                      {isApproved ? 'Approved & Issued (Free)' : 'Pending Application'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Staff ID Card Preview & Download Modal */}
      {cardData && (
        <IdCardPreviewModal
          card={cardData}
          settings={settings}
          isOpen={showIdPreviewModal}
          onClose={() => setShowIdPreviewModal(false)}
        />
      )}
    </div>
  );
}
