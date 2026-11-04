import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  Download,
  Printer,
  RotateCw,
  QrCode,
  Calendar,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import IdCardRenderer from './IdCardRenderer';
import { formatDateIST } from '../utils/date';

export default function MyIdCardView({
  currentUser,
  settings,
  onSimulateScan
}) {
  const [activeSide, setActiveSide] = useState('front');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const frontRef = useRef(null);
  const backRef = useRef(null);
  const exportFrontRef = useRef(null);
  const exportBackRef = useRef(null);

  if (!currentUser) return null;

  const isStaff = (currentUser.profile_type || 'STAFF') === 'STAFF';

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98]
      });

      const frontEl = exportFrontRef.current || frontRef.current;
      const backEl = exportBackRef.current || backRef.current;

      if (!frontEl) {
        throw new Error('Card elements are not available for rendering.');
      }

      const renderOptions = {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
        width: 340,
        height: 214,
        backgroundColor: '#0B0B0B',
        style: {
          margin: '0',
          transform: 'none',
          boxShadow: 'none',
          borderRadius: '0'
        }
      };

      const imgDataFront = await toPng(frontEl, renderOptions);
      pdf.addImage(imgDataFront, 'PNG', 0, 0, 85.6, 53.98);

      if (backEl) {
        pdf.addPage([85.6, 53.98], 'landscape');
        const imgDataBack = await toPng(backEl, renderOptions);
        pdf.addImage(imgDataBack, 'PNG', 0, 0, 85.6, 53.98);
      }

      pdf.save(`WorkDen_${currentUser.entity_code || currentUser.id_number || 'IDCard'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendRequest = (e) => {
    e.preventDefault();
    setRequestSubmitted(true);
    setTimeout(() => {
      setShowCorrectionModal(false);
      setShowReplacementModal(false);
      setRequestSubmitted(false);
      setRequestText('');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>My Official Digital & Printable ID Card</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Verified Active
          </span>
        </h2>
        <p className="text-xs text-[#B5B5B5] mt-1">
          Your personal credential for physical WorkDen premises entry, RFID smart-lock access, and digital verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Card Visualizer Column */}
        <div className="md:col-span-7 bg-[#121212] p-6 rounded-3xl border border-[#353535] shadow-xl flex flex-col items-center justify-center">
          
          {/* Flip / Side Switcher */}
          <div className="flex items-center gap-2 mb-6 bg-[#1A1A1A] p-1.5 rounded-xl border border-[#353535]">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSide === 'front'
                  ? 'bg-[#F5C542] text-black shadow-sm'
                  : 'text-[#B5B5B5] hover:text-white'
              }`}
            >
              Front Side
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeSide === 'back'
                  ? 'bg-[#F5C542] text-black shadow-sm'
                  : 'text-[#B5B5B5] hover:text-white'
              }`}
            >
              Back Side
            </button>
          </div>

          {/* Render Active Side */}
          <div className="print-card-area">
            {activeSide === 'front' ? (
              <IdCardRenderer card={currentUser} settings={settings} side="front" cardRef={frontRef} />
            ) : (
              <IdCardRenderer card={currentUser} settings={settings} side="back" cardRef={backRef} />
            )}
          </div>

          {/* Dedicated Offscreen container for high-fidelity PDF capture */}
          <div
            style={{
              position: 'fixed',
              left: '-9999px',
              top: 0,
              pointerEvents: 'none',
              zIndex: -99
            }}
          >
            <IdCardRenderer card={currentUser} settings={settings} side="front" cardRef={exportFrontRef} />
            <div style={{ height: '30px' }} />
            <IdCardRenderer card={currentUser} settings={settings} side="back" cardRef={exportBackRef} />
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C542] to-[#FFD84D] hover:from-[#FFD84D] hover:to-[#F5C542] text-black text-xs font-bold shadow-lg shadow-[#F5C542]/20 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Exporting...' : 'Download Print PDF (CR80)'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#282828] text-white text-xs font-bold border border-[#353535] shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#F5C542]" />
              <span>Print Physical PVC Card</span>
            </button>
          </div>
        </div>

        {/* Status, Validity & Self-Service Column */}
        <div className="md:col-span-5 space-y-4">
          
          {/* Validity & Verification Widget */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Credential Status & Validity
            </h3>

            <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Current Status</span>
                <span className="text-emerald-700 uppercase">{currentUser.card_status || 'ACTIVE'}</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Authorized for building entry, RFID turnstiles, and visitor check-ins.
              </p>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Credential ID</span>
                <span className="font-mono font-bold text-[#F5C542]">{currentUser.entity_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Issue Date</span>
                <span className="font-medium text-slate-800">{currentUser.issue_date ? formatDateIST(currentUser.issue_date) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Expiration Date</span>
                <span className="font-bold text-red-600">{currentUser.expiry_date ? formatDateIST(currentUser.expiry_date) : 'Permanent'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Card Version</span>
                <span className="font-medium text-slate-800">v{currentUser.card_version || 1}.0</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Lifetime Scans</span>
                <span className="font-bold text-slate-900">{currentUser.scan_count || 0} times</span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[#B48200] text-[10px] font-bold block uppercase tracking-wider mb-0.5">
                  Lost Card Instructions
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {settings?.lost_card_instructions || 'If found, please immediately return to WorkDen Security or email support@workden.online / Call +91 9262725686'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onSimulateScan(currentUser.qr_token)}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold text-xs border border-[#F5C542] transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Test Public QR Scanner (Google Lens)</span>
            </button>
          </div>

          {/* Self-Service Assistance */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#F5C542]" />
              ID Card Self-Service
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Need to update a spelling mistake, change your designation, or replace a lost physical PVC card?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer text-center"
              >
                Request Correction
              </button>
              <button
                onClick={() => setShowReplacementModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition cursor-pointer text-center"
              >
                Request Replacement
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Correction / Replacement Modal */}
      {(showCorrectionModal || showReplacementModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {showCorrectionModal ? 'Request ID Information Correction' : 'Request Replacement Card'}
            </h3>
            <p className="text-xs text-slate-500">
              Submit your request directly to WorkDen Administration.
            </p>

            {requestSubmitted ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Request logged successfully with Admin Desk!</span>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Details of Correction or Lost Card Reason
                  </label>
                  <textarea
                    rows={3}
                    value={requestText}
                    onChange={(e) => setRequestText(e.target.value)}
                    required
                    placeholder="Describe what needs to be corrected or how the card was misplaced..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowCorrectionModal(false); setShowReplacementModal(false); }}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#F5C542] hover:bg-[#FFD84D] text-black text-white font-bold rounded-xl"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
