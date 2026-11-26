import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lock, Unlock, Download, QrCode, Loader2, AlertCircle, CheckCircle2, CreditCard
} from 'lucide-react';
import API_BASE from '../api';
import IdCardRenderer from './IdCardRenderer';
import IdCardPreviewModal from './IdCardPreviewModal';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function PublicCardAccessPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [card, setCard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [feeRupees, setFeeRupees] = useState(99);
  const [cardSide, setCardSide] = useState('front');
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const fetchCard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/public-card/${token}`);
      const json = await res.json();
      if (json.success) {
        setCard(json.card);
        setSettings(json.settings);
        setIsUnlocked(!!json.is_unlocked);
        setFeeRupees(json.fee_rupees || 99);
      } else {
        setError(json.error || 'Invalid or expired ID Card link.');
      }
    } catch {
      setError('Unable to load ID card. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchCard();
  }, [token]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    if (!card) return;
    setError('');
    setPaying(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded || typeof window === 'undefined' || !window.Razorpay) {
        const msg = 'Failed to load Razorpay payment gateway. Please check your internet connection.';
        alert(msg);
        setError(msg);
        setPaying(false);
        return;
      }

      const orderRes = await fetch(`${API_BASE}/api/public-card/${token}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        const msg = orderData.error || 'Could not initiate payment.';
        alert(msg);
        setError(msg);
        setPaying(false);
        return;
      }

      const options = {
        key: orderData.key_id || 'rzp_live_U4VD9FTceH5P0x',
        amount: orderData.amount || feeRupees * 100,
        currency: orderData.currency || 'INR',
        name: 'WorkDen',
        description: `Official WorkDen ${card.profile_type === 'STAFF' ? 'Staff' : 'Member'} ID Card (₹${feeRupees})`,
        image: WORKDEN_LOGO_BASE64,
        prefill: {
          name: card.full_name || '',
          email: card.email || '',
          contact: card.mobile || ''
        },
        theme: { color: '#F5C542' },
        modal: {
          backdropclose: true,
          escape: true,
          ondismiss: function () {
            setPaying(false);
          }
        },
        handler: async function (response) {
          setVerifying(true);
          try {
            const verifyRes = await fetch(`${API_BASE}/api/public-card/${token}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.order_id || orderData.tracking_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || null,
                payment_order_db_id: orderData.payment_order_db_id
              })
            });
            const verifyJson = await verifyRes.json();
            if (verifyJson.success) {
              setIsUnlocked(true);
              setSuccess('Payment successful! Your WorkDen ID Card is now unlocked and ready to download.');
            } else {
              const vMsg = verifyJson.error || 'Payment verification failed.';
              alert(vMsg);
              setError(vMsg);
            }
          } catch {
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

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        const errMsg = resp.error?.description || 'Payment failed or cancelled.';
        alert(errMsg);
        setError(errMsg);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      alert('Payment initialization error: ' + err.message);
      setError('Payment initialization error: ' + err.message);
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
      {/* Header */}
      <header className="bg-[#121212] border-b border-[#2e2e2e] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-black border border-[#F5C542]/40 p-1 flex items-center justify-center">
            <img src={WORKDEN_LOGO_BASE64} alt="WorkDen" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black text-sm tracking-wide text-white">WorkDen</span>
            <span className="text-[#F5C542] text-[10px] font-bold ml-1.5 font-mono">Portal</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-xs text-[#888] hover:text-[#F5C542] transition cursor-pointer"
        >
          Portal Home →
        </button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-[#F5C542] animate-spin mb-3" />
            <p className="text-xs text-[#888]">Loading your WorkDen ID Card...</p>
          </div>
        ) : error && !card ? (
          <div className="bg-[#171717] border border-red-500/30 rounded-3xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-white font-bold text-lg">Access Link Invalid</h2>
            <p className="text-[#888] text-xs mt-1.5">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 px-5 py-2.5 bg-[#F5C542] text-black font-black text-xs rounded-xl cursor-pointer"
            >
              Go to WorkDen Portal
            </button>
          </div>
        ) : card && (
          <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 sm:p-8 shadow-2xl">
            {error && (
              <div className="mb-5 flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-2 border bg-[#121212] border-[#F5C542]/40 text-[#F5C542]">
                {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{isUnlocked ? 'Unlocked & Ready to Download' : 'Approved • Locked Preview'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {card.full_name} — Official {card.profile_type === 'STAFF' ? 'Staff' : 'Member'} ID Card
              </h1>
              <p className="text-[#888] text-xs mt-1 font-mono">{card.entity_code}</p>
            </div>

            {/* Front / Back Toggle */}
            <div className="flex flex-col items-center">
              <div className="flex gap-2 mb-4 bg-[#121212] p-1 rounded-xl border border-[#353535]">
                <button
                  onClick={() => setCardSide('front')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cardSide === 'front' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                  }`}
                >
                  Front Side
                </button>
                <button
                  onClick={() => setCardSide('back')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    cardSide === 'back' ? 'bg-[#F5C542] text-black' : 'text-[#888] hover:text-white'
                  }`}
                >
                  Back Side
                </button>
              </div>

              {/* Real Card Preview */}
              <div
                onClick={() => {
                  if (!isUnlocked && !paying && !verifying) handlePayNow();
                }}
                className={`relative rounded-2xl overflow-hidden shadow-2xl border ${
                  !isUnlocked ? 'border-[#F5C542]/40 cursor-pointer group' : 'border-emerald-500/40'
                }`}
              >
                <div className={!isUnlocked ? 'blur-[2.5px] select-none pointer-events-none transition' : ''}>
                  <IdCardRenderer card={card} settings={settings} side={cardSide} />
                </div>

                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center transition group-hover:bg-black/45">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5C542]/20 border border-[#F5C542] flex items-center justify-center mb-2.5 shadow-lg shadow-[#F5C542]/20 group-hover:scale-105 transition">
                      <Lock className="w-6 h-6 text-[#F5C542]" />
                    </div>
                    <p className="text-white font-black text-sm">ID Card Approved &amp; Ready</p>
                    <p className="text-[#ccc] text-[11px] mt-0.5 max-w-[220px]">
                      Pay ₹{feeRupees} via Razorpay to unlock &amp; download
                    </p>
                  </div>
                )}
              </div>

              {/* Action CTA */}
              <div className="mt-6 w-full max-w-sm">
                {!isUnlocked ? (
                  <button
                    onClick={handlePayNow}
                    disabled={paying || verifying}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-[#F5C542] to-amber-400 hover:brightness-110 text-black font-black text-sm rounded-2xl shadow-xl shadow-[#F5C542]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {paying || verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    <span>{verifying ? 'Verifying Payment...' : paying ? 'Opening Razorpay...' : `Pay ₹${feeRupees} & Unlock ID Card`}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ID Card (PDF / PNG)</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-[#777] mt-4 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#F5C542]" />
                {isUnlocked
                  ? 'Your official WorkDen ID Card is unlocked and active.'
                  : 'Instant automatic unlock as soon as payment completes.'}
              </p>
            </div>
          </div>
        )}
      </main>

      {showDownloadModal && card && (
        <IdCardPreviewModal
          isOpen={showDownloadModal}
          card={card}
          settings={settings}
          onClose={() => setShowDownloadModal(false)}
        />
      )}
    </div>
  );
}
