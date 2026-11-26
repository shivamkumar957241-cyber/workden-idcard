import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Clock, CheckCircle2, XCircle, AlertCircle,
  Download, QrCode, LogOut, User, Send, Upload, Eye,
  Shield, Calendar, Phone, Mail, Building2, Loader2, RefreshCw, Check,
  FileText, ExternalLink, Printer, Bell, ArrowRight, Lock, Unlock,
  HelpCircle, Sparkles
} from 'lucide-react';
import { authFetch, getToken } from '../api';
import { formatIST, formatDateIST } from '../utils/date';
import IdCardRenderer from './IdCardRenderer';
import IdCardPreviewModal from './IdCardPreviewModal';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export const PRICING_PLANS = [
  { price: '₹249', name: 'Basic Access', heading: '₹249 – Basic Access' },
  { price: '₹499', name: 'Full Access', heading: '₹499 – Full Access' },
  { price: '₹699', name: 'Priority Access', heading: '₹699 – Priority Access' },
  { price: '₹999', name: 'Professional Access', heading: '₹999 – Professional Access' },
  { price: '₹1499', name: 'Master Access', heading: '₹1499 – Master Access' }
];

export default function MemberDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | apply | payment | download | notifications | profile
  const [application, setApplication] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showIdPreviewModal, setShowIdPreviewModal] = useState(false);
  const [dashboardCardSide, setDashboardCardSide] = useState('front');
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Payment Confirmation State
  const [paymentData, setPaymentData] = useState(null); // { order_id, payment_id, amount, date }
  const [confirmationSubmitting, setConfirmationSubmitting] = useState(false);

  // Application Form State
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    mobile: '',
    email: user?.email || '',
    photo_url: '',
    user_category: 'WorkDen Member',
    current_plan: '₹499 – Full Access',
    residential_address: '',
    city: '',
    father_name: '',
    dob: '',
    gender: 'Male',
    remarks: ''
  });
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Member Application, Settings & Notifications
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
        // Find latest member application
        const memberApp = appJson.data.find(a => a.application_type === 'USER') || appJson.data[0];
        setApplication(memberApp);
      } else {
        setApplication(null);
      }

      if (settingsJson.success) {
        setSettings(settingsJson.data?.settings);
      }

      if (notifRes && notifRes.ok) {
        const notifJson = await notifRes.json();
        if (notifJson.success) {
          setNotifications(notifJson.data || []);
          setUnreadNotifCount((notifJson.data || []).filter(n => !n.is_read).length);
        }
      }
    } catch (err) {
      console.error('Member dashboard fetch error:', err);
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

  // Submit Free Application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.mobile) { setError('Mobile number is required.'); return; }
    if (!form.city) { setError('City is required.'); return; }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          application_type: 'USER'
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Application submitted successfully! It is now under review by Admin.');
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

  // Load Razorpay Checkout Script Dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const existing = document.getElementById('razorpay-checkout-script');
      if (existing) {
        existing.onload = () => resolve(true);
        existing.onerror = () => resolve(false);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  // Start Razorpay Payment Flow
  const handlePayNow = async () => {
    if (!application) return;
    setError('');
    setPaying(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || typeof window === 'undefined' || !window.Razorpay) {
        const msg = 'Failed to load Razorpay payment SDK. Please check your internet connection or ad blocker.';
        alert(msg);
        setError(msg);
        setPaying(false);
        return;
      }

      // Step 1: Create Order on Backend
      const orderRes = await authFetch('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ application_id: application.id })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        const msg = orderData.error || 'Could not initiate payment order.';
        alert(msg);
        setError(msg);
        setPaying(false);
        return;
      }

      // Step 2: Open Razorpay Live Checkout
      const options = {
        key: orderData.key_id || 'rzp_live_U4VD9FTceH5P0x',
        amount: orderData.amount || 9900,
        currency: orderData.currency || 'INR',
        name: 'WorkDen',
        description: 'Official WorkDen Member ID Card Download Fee (₹99)',
        image: WORKDEN_LOGO_BASE64,
        prefill: {
          name: user?.full_name || application.full_name || form.full_name || '',
          email: user?.email || application.email || form.email || '',
          contact: application.mobile || form.mobile || ''
        },
        theme: {
          color: '#F5C542'
        },
        modal: {
          backdropclose: true,
          escape: true,
          ondismiss: function () {
            console.log('Razorpay modal dismissed by user');
            setPaying(false);
          }
        },
        handler: async function (response) {
          // Step 3: Verify Payment on Server
          setVerifying(true);
          try {
            const verifyRes = await authFetch('/api/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.order_id || orderData.tracking_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || null,
                application_id: application.id,
                payment_order_db_id: orderData.payment_order_db_id
              })
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              await fetchData();
              setSuccess('Payment successful! Your Official WorkDen ID Card is now unlocked and ready to download.');
              setActiveTab('download');
            } else {
              const vMsg = verifyJson.error || 'Payment signature verification failed.';
              alert(vMsg);
              setError(vMsg);
            }
          } catch (vErr) {
            alert('Payment verification failed on server.');
            setError('Payment verification failed on server.');
          } finally {
            setVerifying(false);
            setPaying(false);
          }
        }
      };

      if (orderData.order_id) {
        options.order_id = orderData.order_id;
      }

      console.log('Launching Razorpay checkout...');
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.error('Razorpay payment failed:', resp);
        const errMsg = resp.error?.description || 'Payment was unsuccessful or cancelled.';
        alert(errMsg);
        setError(errMsg);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      console.error('handlePayNow unexpected error:', err);
      alert('Payment initialization error: ' + err.message);
      setError('Payment initialization error: ' + err.message);
      setPaying(false);
    }
  };

  // Submit Payment Confirmation Form to Admin
  const handleSubmitConfirmation = async (e) => {
    e.preventDefault();
    if (!paymentData) return;
    setError('');
    setConfirmationSubmitting(true);

    try {
      const res = await authFetch('/api/payments/submit-confirmation', {
        method: 'POST',
        body: JSON.stringify({
          application_id: application.id,
          payment_order_id: paymentData.payment_order_id,
          razorpay_payment_id: paymentData.payment_id,
          razorpay_order_id: paymentData.order_id,
          amount: paymentData.amount,
          payment_date: paymentData.date
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Payment confirmation submitted! Admin will verify and unlock your ID card download shortly.');
        setPaymentData(null);
        fetchData();
        setActiveTab('overview');
      } else {
        setError(json.error || 'Failed to submit payment confirmation.');
      }
    } catch (err) {
      setError('Server error submitting confirmation.');
    } finally {
      setConfirmationSubmitting(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotifsRead = async () => {
    try {
      await authFetch('/api/payments/notifications/read-all', { method: 'POST' });
      setUnreadNotifCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  // Status computation
  const isApproved = application?.status === 'APPROVED';
  const isPending = application?.status === 'PENDING';
  const isRejected = application?.status === 'REJECTED';
  const isPaymentPaid = application?.payment_status === 'PAID';
  const isPaymentVerified = application?.payment_status === 'VERIFIED';
  const isDownloadUnlocked = application?.download_unlocked === 1;

  // Render Card Data Object for IdCardRenderer
  const cardData = application && isApproved ? {
    id: application.card_id,
    card_number: `CRD-USR-${application.id_number || 'WD-USER'}`,
    entity_code: application.id_number || 'WD-USER',
    profile_type: 'USER',
    full_name: application.full_name,
    photo_url: application.photo_url,
    current_plan: application.current_plan,
    user_category: application.user_category || 'Coworking Member',
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
              <span className="font-black text-sm tracking-wide text-white">WorkDen</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40">
                Member Portal
              </span>
            </div>
            <p className="text-[11px] text-[#888] hidden sm:block">Official Identity Card & Verification</p>
          </div>
        </div>

        {/* User Badge & Actions */}
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
              {user?.full_name?.[0] || 'M'}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold leading-tight">{user?.full_name}</p>
              <p className="text-[10px] text-[#777] leading-tight">Member</p>
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

      {/* Navigation Tabs Bar */}
      <div className="bg-[#141414] border-b border-[#2a2a2a] px-4 sm:px-8 overflow-x-auto">
        <div className="flex items-center gap-2 py-2.5 min-w-max">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
            { id: 'apply', label: application ? 'My Application' : 'Apply for ID Card', icon: FileText },
            ...(isApproved ? [{ id: 'payment', label: isDownloadUnlocked ? 'Payment Completed' : 'Pay ₹99 & Unlock', icon: CreditCard, highlight: !isDownloadUnlocked }] : []),
            ...(isDownloadUnlocked ? [{ id: 'download', label: 'Download ID Card', icon: Download, badge: 'Active' }] : []),
            { id: 'notifications', label: `Notifications ${unreadNotifCount > 0 ? `(${unreadNotifCount})` : ''}`, icon: Bell },
            { id: 'profile', label: 'Member Profile', icon: User }
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
                    : tab.highlight
                    ? 'bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/40 hover:bg-[#F5C542]/20'
                    : 'text-[#aaa] hover:text-white hover:bg-[#1f1f1f]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : tab.highlight ? 'text-[#F5C542]' : 'text-[#777]'}`} />
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

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Messages */}
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

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-[#F5C542] animate-spin mb-3" />
            <p className="text-xs text-[#888]">Loading Member Dashboard...</p>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* TAB 1: OVERVIEW */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1c1c] via-[#161616] to-[#0f0f0f] border border-[#353535] rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#F5C542]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] text-xs font-bold mb-3">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>WorkDen Official Member Portal</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Welcome, {user?.full_name || 'WorkDen Member'}
                      </h1>
                      <p className="text-[#888] text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
                        {isApproved && !isDownloadUnlocked
                          ? 'Your ID card application is approved! Unlock your card below to download PDF & PNG.'
                          : 'Apply for your official WorkDen Identity Card with live QR verification on workden.online.'}
                      </p>
                    </div>

                    {/* Quick CTA */}
                    <div className="flex-shrink-0">
                      {!application && (
                        <button
                          onClick={() => setActiveTab('apply')}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs sm:text-sm shadow-xl shadow-[#F5C542]/20 transition transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Apply for ID Card →</span>
                        </button>
                      )}

                      {isApproved && !isDownloadUnlocked && (
                        <button
                          onClick={handlePayNow}
                          disabled={paying || verifying}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F5C542] to-amber-400 hover:brightness-110 text-black font-black text-xs sm:text-sm shadow-xl shadow-[#F5C542]/30 transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                        >
                          {paying || verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          <span>{verifying ? 'Verifying...' : paying ? 'Opening Razorpay...' : 'Pay ₹99 & Unlock ID Card →'}</span>
                        </button>
                      )}

                      {isDownloadUnlocked && (
                        <button
                          onClick={() => setActiveTab('download')}
                          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>View & Download ID Card →</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workflow Status Tracker */}
                <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6">
                  <h3 className="text-white font-extrabold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F5C542]" /> Application & Issuance Workflow
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                    {/* Step 1 */}
                    <div className={`p-4 rounded-2xl border transition ${
                      application ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 1</span>
                        {application ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#555]" />
                        )}
                      </div>
                      <p className="font-bold text-xs">Submit Application</p>
                      <p className="text-[11px] text-[#777] mt-1">Fill in your member details online</p>
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {application ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    {/* Step 2 */}
                    <div className={`p-4 rounded-2xl border transition ${
                      isApproved ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : isPending ? 'bg-[#1f1f1f] border-amber-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 2</span>
                        {isApproved ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isPending ? (
                          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#555]" />
                        )}
                      </div>
                      <p className="font-bold text-xs">Admin Approval</p>
                      <p className="text-[11px] text-[#777] mt-1">WorkDen team reviews identity details</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-400' : isPending ? 'bg-amber-500/10 text-amber-300' : 'bg-[#222] text-[#666]'
                      }`}>
                        {isApproved ? 'Approved' : isPending ? 'Under Review' : 'Waiting'}
                      </span>
                    </div>

                    {/* Step 3 */}
                    <div className={`p-4 rounded-2xl border transition ${
                      isPaymentVerified || isDownloadUnlocked ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : isPaymentPaid ? 'bg-[#1f1f1f] border-amber-500/40 text-white' : isApproved ? 'bg-[#1f1f1f] border-[#F5C542]/50 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 3</span>
                        {isPaymentVerified || isDownloadUnlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isPaymentPaid ? (
                          <Clock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-[#F5C542]" />
                        )}
                      </div>
                      <p className="font-bold text-xs">{isApproved ? '₹99 Card Verification' : 'ID Card Issuance'}</p>
                      <p className="text-[11px] text-[#777] mt-1">{isApproved ? 'Unlock high-resolution ID card' : 'Digital card generated after approval'}</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDownloadUnlocked ? 'bg-emerald-500/10 text-emerald-400' : isPaymentPaid ? 'bg-amber-500/10 text-amber-300' : isApproved ? 'bg-[#F5C542]/20 text-[#F5C542]' : 'bg-[#222] text-[#666]'
                      }`}>
                        {isDownloadUnlocked ? 'Verified' : isPaymentPaid ? 'Confirmation Sent' : isApproved ? 'Payment Ready' : 'Waiting'}
                      </span>
                    </div>

                    {/* Step 4 */}
                    <div className={`p-4 rounded-2xl border transition ${
                      isDownloadUnlocked ? 'bg-[#1f1f1f] border-emerald-500/40 text-white' : 'bg-[#121212] border-[#2e2e2e] text-[#666]'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider">Step 4</span>
                        {isDownloadUnlocked ? (
                          <Unlock className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Lock className="w-4 h-4 text-[#555]" />
                        )}
                      </div>
                      <p className="font-bold text-xs">ID Card Download</p>
                      <p className="text-[11px] text-[#777] mt-1">PDF export, Print, & QR Verification</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDownloadUnlocked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#222] text-[#666]'
                      }`}>
                        {isDownloadUnlocked ? 'Unlocked & Active' : 'Locked'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Box or Card Preview */}
                {application && (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#2a2a2a]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-extrabold text-base">Current Member Application</h3>
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

                      {/* Action buttons depending on state */}
                      <div className="flex items-center gap-2">
                        {isApproved && !isDownloadUnlocked && (
                          <button
                            onClick={handlePayNow}
                            disabled={paying || verifying}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {paying || verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                            <span>{verifying ? 'Verifying...' : paying ? 'Opening Razorpay...' : 'Pay ₹99 Now'}</span>
                          </button>
                        )}
                        {isDownloadUnlocked && (
                          <button
                            onClick={() => setActiveTab('download')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Card</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Application Details Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Applicant</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.full_name}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Email</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.email}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">Plan</p>
                        <p className="text-[#F5C542] font-bold text-xs mt-0.5 truncate">{application.current_plan || 'Full Access'}</p>
                      </div>
                      <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-3">
                        <p className="text-[#777] text-[10px] uppercase font-bold">City</p>
                        <p className="text-white font-bold text-xs mt-0.5 truncate">{application.city || 'Bangalore'}</p>
                      </div>
                    </div>

                    {/* Rejection notice if any */}
                    {isRejected && (
                      <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                        <p className="font-bold flex items-center gap-1.5 mb-1">
                          <XCircle className="w-4 h-4" /> Application Rejected
                        </p>
                        <p className="text-[#aaa]">
                          Reason: {application.rejection_reason || 'Does not meet criteria.'}
                        </p>
                      </div>
                    )}

                    {/* Approved ID Card Preview (Locked until ₹99 paid, Unlocked immediately after) */}
                    {isApproved && cardData && (
                      <div className="mt-6 pt-6 border-t border-[#2a2a2a] flex flex-col items-center">
                        <div className="flex items-center justify-between w-full max-w-md mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-white uppercase tracking-wider">ID Card Preview</span>
                            {isDownloadUnlocked ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                Unlocked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#F5C542]/15 border border-[#F5C542]/30 text-[#F5C542] text-[10px] font-bold flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 bg-[#121212] p-1 rounded-lg border border-[#353535]">
                            <button
                              type="button"
                              onClick={() => setDashboardCardSide('front')}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                dashboardCardSide === 'front' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                              }`}
                            >
                              Front
                            </button>
                            <button
                              type="button"
                              onClick={() => setDashboardCardSide('back')}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                dashboardCardSide === 'back' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                              }`}
                            >
                              Back
                            </button>
                          </div>
                        </div>

                        {/* Card Container */}
                        <div
                          onClick={() => {
                            if (!isDownloadUnlocked && !paying && !verifying) handlePayNow();
                          }}
                          className={`relative rounded-2xl overflow-hidden shadow-2xl border ${
                            !isDownloadUnlocked
                              ? 'border-[#F5C542]/40 cursor-pointer group'
                              : 'border-emerald-500/40'
                          }`}
                        >
                          <div className={!isDownloadUnlocked ? 'blur-[2.5px] select-none pointer-events-none transition' : ''}>
                            <IdCardRenderer
                              card={cardData}
                              settings={settings}
                              side={dashboardCardSide}
                            />
                          </div>

                          {/* Locked Overlay */}
                          {!isDownloadUnlocked && (
                            <div className="absolute inset-0 bg-black/55 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center transition group-hover:bg-black/45">
                              <div className="w-12 h-12 rounded-2xl bg-[#F5C542]/20 border border-[#F5C542] flex items-center justify-center mb-2.5 shadow-lg shadow-[#F5C542]/20 group-hover:scale-105 transition">
                                <Lock className="w-6 h-6 text-[#F5C542]" />
                              </div>
                              <p className="text-white font-black text-sm">ID Card Approved & Ready</p>
                              <p className="text-[#ccc] text-[11px] mt-0.5 max-w-[220px]">
                                Pay ₹99 to unlock & download your official ID card
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action Button Below Card */}
                        <div className="mt-5">
                          {!isDownloadUnlocked ? (
                            <button
                              type="button"
                              onClick={handlePayNow}
                              disabled={paying || verifying}
                              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F5C542] to-amber-400 hover:brightness-110 text-black font-black text-xs sm:text-sm shadow-xl shadow-[#F5C542]/25 transition cursor-pointer disabled:opacity-50"
                            >
                              {paying || verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                              <span>{verifying ? 'Verifying Payment...' : paying ? 'Opening Razorpay...' : 'Download ID Card (Pay ₹99 to Unlock)'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowIdPreviewModal(true)}
                              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download ID Card (PDF / PNG)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: APPLY FOR MEMBER ID CARD (FREE) */}
            {/* ======================================================== */}
            {activeTab === 'apply' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-3xl mx-auto shadow-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] text-xs font-bold mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>WorkDen Member Verification</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">Member ID Card Application</h2>
                  <p className="text-[#888] text-xs mt-1.5 max-w-md mx-auto">
                    Fill out your official membership details below. Once approved by Admin, you can download your ID card.
                  </p>
                </div>

                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  {/* Photo Upload Section */}
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
                          <span className="text-[10px] text-[#777]">Passport Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="text-white font-bold text-xs mb-1">Profile Photo (Passport Style)</p>
                      <p className="text-[#777] text-[11px] mb-3">
                        JPG, PNG, or WebP. Clear face photo with plain background (Max 5MB).
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
                        disabled={uploading}
                        className="px-4 py-2 bg-[#222] hover:bg-[#2a2a2a] border border-[#F5C542]/40 text-[#F5C542] rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer mx-auto sm:mx-0 disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{uploading ? 'Uploading...' : 'Choose Profile Photo'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
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
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. rahul@example.com"
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
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Father's Name</label>
                      <input
                        type="text"
                        value={form.father_name}
                        onChange={e => setForm({ ...form, father_name: e.target.value })}
                        placeholder="Optional"
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={form.dob}
                        onChange={e => setForm({ ...form, dob: e.target.value })}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Gender</label>
                      <select
                        value={form.gender}
                        onChange={e => setForm({ ...form, gender: e.target.value })}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Current Plan</label>
                      <select
                        value={form.current_plan}
                        onChange={e => setForm({ ...form, current_plan: e.target.value })}
                        className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                      >
                        {PRICING_PLANS.map(p => (
                          <option key={p.heading} value={p.heading}>{p.heading}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#aaa] text-xs font-semibold mb-1.5">Residential Address</label>
                    <textarea
                      rows={2}
                      value={form.residential_address}
                      onChange={e => setForm({ ...form, residential_address: e.target.value })}
                      placeholder="Full residential address (Street, City, PIN code)"
                      className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl p-3 outline-none transition"
                    />
                  </div>

                  {/* Submission note */}
                  <div className="p-4 rounded-2xl bg-[#141414] border border-[#2e2e2e] flex items-start gap-3">
                    <HelpCircle className="w-4 h-4 text-[#F5C542] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#888] leading-relaxed">
                      By submitting this form, you confirm that the information provided is accurate.
                      Once reviewed and approved by WorkDen Admin, your official ID card will be issued in your portal.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-sm rounded-2xl shadow-xl shadow-[#F5C542]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{submitting ? 'Submitting Application...' : 'Submit Application →'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: PAYMENT & UNLOCK (₹99 RAZORPAY) */}
            {/* ======================================================== */}
            {activeTab === 'payment' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#F5C542]/10 border border-[#F5C542]/40 flex items-center justify-center mx-auto mb-4 text-[#F5C542]">
                      <CreditCard className="w-7 h-7" />
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-2">
                      Application Approved by Admin
                    </span>
                    <h2 className="text-2xl font-black text-white">Unlock Your Member ID Card</h2>
                    <p className="text-[#888] text-xs mt-1.5 max-w-md mx-auto">
                      Complete the one-time ₹99 download verification fee via Razorpay Live to unlock your ID Card.
                    </p>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div className="bg-[#121212] border border-[#2e2e2e] rounded-2xl p-5 mb-6 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#aaa]">Application & QR Verification</span>
                      <span className="text-emerald-400 font-bold">Included</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#aaa]">Official Card Issuance & High-Res PDF Download</span>
                      <span className="text-white font-bold">₹99.00</span>
                    </div>
                    <div className="border-t border-[#2a2a2a] pt-3 flex items-center justify-between">
                      <span className="text-white font-bold text-sm">Total Payable Amount</span>
                      <span className="text-2xl font-black text-[#F5C542]">₹99.00</span>
                    </div>
                  </div>

                  {/* Payment Button */}
                  {isDownloadUnlocked ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-center text-xs font-bold">
                      ✅ Payment already completed & download unlocked!
                    </div>
                  ) : isPaymentPaid ? (
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-center text-xs">
                      <p className="font-bold">Payment Confirmation Submitted</p>
                      <p className="text-[11px] text-[#aaa] mt-1">Admin will verify your payment shortly to unlock download.</p>
                    </div>
                  ) : (
                    <button
                      onClick={handlePayNow}
                      disabled={paying || verifying}
                      className="w-full py-4 bg-gradient-to-r from-[#F5C542] to-amber-400 hover:brightness-110 text-black font-black text-sm rounded-2xl shadow-xl shadow-[#F5C542]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {paying || verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      <span>{verifying ? 'Verifying Payment Signature...' : paying ? 'Opening Razorpay Checkout...' : 'Pay ₹99 via Razorpay →'}</span>
                    </button>
                  )}

                  <div className="mt-4 text-center">
                    <p className="text-[11px] text-[#666] flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      100% Secure 256-Bit Encrypted Payment powered by Razorpay
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* PAYMENT CONFIRMATION FORM VIEW */}
            {/* ======================================================== */}
            {activeTab === 'payment-confirmation' && paymentData && (
              <div className="max-w-xl mx-auto bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-black text-white">Payment Received!</h2>
                  <p className="text-[#888] text-xs mt-1">
                    Please review your verified Razorpay transaction details below and submit confirmation to Admin.
                  </p>
                </div>

                <form onSubmit={handleSubmitConfirmation} className="space-y-4">
                  <div className="bg-[#121212] border border-[#2e2e2e] rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                      <span className="text-[#777]">Member Name</span>
                      <span className="text-white font-bold">{application?.full_name || user?.full_name}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                      <span className="text-[#777]">Application ID</span>
                      <span className="text-white font-mono">#{application?.id}</span>
                    </div>
                    {application?.id_number && (
                      <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                        <span className="text-[#777]">Member ID Code</span>
                        <span className="text-[#F5C542] font-mono font-bold">{application.id_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                      <span className="text-[#777]">Razorpay Payment ID</span>
                      <span className="text-[#F5C542] font-mono font-bold">{paymentData.payment_id}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                      <span className="text-[#777]">Razorpay Order ID</span>
                      <span className="text-[#aaa] font-mono">{paymentData.order_id}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-[#252525]">
                      <span className="text-[#777]">Amount Paid</span>
                      <span className="text-emerald-400 font-black text-sm">₹99.00</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-[#777]">Payment Date & Time</span>
                      <span className="text-[#aaa]">{formatIST(paymentData.date)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#777] leading-relaxed">
                    Once you submit, your payment confirmation will appear in the Admin Panel.
                    Admin will verify the transaction and unlock your high-resolution card download.
                  </p>

                  <button
                    type="submit"
                    disabled={confirmationSubmitting}
                    className="w-full py-3.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-[#F5C542]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {confirmationSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{confirmationSubmitting ? 'Submitting...' : 'Submit Payment Confirmation to Admin →'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: DOWNLOAD ID CARD */}
            {/* ======================================================== */}
            {activeTab === 'download' && (
              <div className="space-y-6">
                {!isApproved ? (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-12 text-center max-w-md mx-auto">
                    <Clock className="w-12 h-12 text-[#F5C542] mx-auto mb-4" />
                    <h3 className="text-white font-extrabold text-lg">Application Under Review</h3>
                    <p className="text-[#888] text-xs mt-2 leading-relaxed">
                      Your ID card will appear here once your application is approved by WorkDen Admin.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#2a2a2a]">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-white font-extrabold text-lg">Official Member ID Card</h2>
                          {isDownloadUnlocked ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                              Unlocked & Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F5C542]/15 border border-[#F5C542]/30 text-[#F5C542] text-[10px] font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked • Pay ₹99
                            </span>
                          )}
                        </div>
                        <p className="text-[#888] text-xs mt-0.5">
                          {isDownloadUnlocked
                            ? 'High-resolution print-ready identity card with QR verification.'
                            : 'Your ID card is approved. Complete the ₹99 payment to unlock download.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDownloadUnlocked ? (
                          <button
                            onClick={() => setShowIdPreviewModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download ID Card (PDF / PNG)</span>
                          </button>
                        ) : (
                          <button
                            onClick={handlePayNow}
                            disabled={paying || verifying}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                          >
                            {paying || verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{verifying ? 'Verifying...' : paying ? 'Opening Razorpay...' : 'Download ID Card (Pay ₹99)'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Interactive Card Preview (Locked or Unlocked) */}
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

                      <div
                        onClick={() => {
                          if (!isDownloadUnlocked && !paying && !verifying) handlePayNow();
                        }}
                        className={`relative rounded-2xl overflow-hidden shadow-2xl border ${
                          !isDownloadUnlocked ? 'border-[#F5C542]/40 cursor-pointer group' : 'border-[#353535]'
                        }`}
                      >
                        <div className={!isDownloadUnlocked ? 'blur-[2.5px] select-none pointer-events-none transition' : ''}>
                          {cardData && (
                            <IdCardRenderer
                              card={cardData}
                              settings={settings}
                              side={dashboardCardSide}
                            />
                          )}
                        </div>

                        {!isDownloadUnlocked && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center transition group-hover:bg-black/45">
                            <div className="w-12 h-12 rounded-2xl bg-[#F5C542]/20 border border-[#F5C542] flex items-center justify-center mb-2.5 shadow-lg shadow-[#F5C542]/20 group-hover:scale-105 transition">
                              <Lock className="w-6 h-6 text-[#F5C542]" />
                            </div>
                            <p className="text-white font-black text-sm">Locked ID Card Preview</p>
                            <p className="text-[#ccc] text-[11px] mt-0.5 max-w-[220px]">
                              Click here to pay ₹99 via Razorpay & unlock instant download
                            </p>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-[#777] mt-4 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-[#F5C542]" />
                        {isDownloadUnlocked
                          ? "Anyone scanning your card's QR code will be redirected to the official verification page."
                          : 'Once ₹99 payment succeeds, your card unlocks automatically for instant download.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: NOTIFICATIONS */}
            {/* ======================================================== */}
            {activeTab === 'notifications' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2a2a]">
                  <div>
                    <h2 className="text-white font-extrabold text-lg flex items-center gap-2">
                      <Bell className="w-5 h-5 text-[#F5C542]" /> Notifications
                    </h2>
                    <p className="text-[#888] text-xs mt-0.5">Application and payment status updates</p>
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
            {/* TAB 6: MEMBER PROFILE */}
            {/* ======================================================== */}
            {activeTab === 'profile' && (
              <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto shadow-2xl">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#2a2a2a]">
                  <div className="w-16 h-16 rounded-2xl bg-black border-2 border-[#F5C542]/40 overflow-hidden flex items-center justify-center text-[#F5C542] font-black text-2xl">
                    {application?.photo_url ? (
                      <img src={application.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.full_name?.[0] || 'M'
                    )}
                  </div>
                  <div>
                    <h2 className="text-white font-black text-xl">{user?.full_name}</h2>
                    <p className="text-[#888] text-xs">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/30">
                      WorkDen Member Account
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Account Role</span>
                    <span className="text-white font-bold">MEMBER (USER)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Registration Date</span>
                    <span className="text-white font-bold">{formatDateIST(user?.created_at || new Date())}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#252525]">
                    <span className="text-[#777]">Application Status</span>
                    <span className="text-white font-bold">
                      {application?.status || 'No Application Submitted'}
                    </span>
                  </div>
                  {application && (
                    <>
                      {isApproved && (
                        <div className="flex justify-between py-2 border-b border-[#252525]">
                          <span className="text-[#777]">Payment Status</span>
                          <span className="text-[#F5C542] font-bold">
                            {application.download_unlocked === 1
                              ? 'Paid & Verified'
                              : application.payment_status === 'PAID'
                              ? 'Confirmation Submitted'
                              : 'Pending Verification (₹99)'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between py-2 border-b border-[#252525]">
                        <span className="text-[#777]">ID Card Download</span>
                        <span className="text-emerald-400 font-bold">
                          {application.download_unlocked === 1 ? 'Unlocked (Active)' : 'Locked'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ID Card Full Preview & Download Modal */}
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
