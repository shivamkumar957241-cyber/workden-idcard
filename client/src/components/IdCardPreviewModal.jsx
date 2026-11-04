import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileText,
  QrCode
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import IdCardRenderer from './IdCardRenderer';
import { formatDateIST } from '../utils/date';

export default function IdCardPreviewModal({
  card,
  settings,
  isOpen,
  onClose,
  onSimulateScan,
  onStatusChange,
  onRenew,
  onReplace
}) {
  const [activeSide, setActiveSide] = useState('front'); // 'front' or 'back' or 'both'
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const exportFrontRef = useRef(null);
  const exportBackRef = useRef(null);

  if (!isOpen || !card) return null;

  const isStaff = (card.profile_type || 'USER') === 'STAFF';

  // Print Card function - Uses high-res PNG render with exact color retention for CR80 printers
  const handlePrint = async () => {
    try {
      const frontEl = exportFrontRef.current || frontRef.current;
      const backEl = exportBackRef.current || backRef.current;
      if (!frontEl) return;

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

      const imgFront = await toPng(frontEl, renderOptions);
      const imgBack = backEl ? await toPng(backEl, renderOptions) : null;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>WorkDen ID Card - ${card.entity_code || 'Card'}</title>
            <style>
              @page {
                size: 85.6mm 53.98mm landscape;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                background-color: #000000;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .page {
                width: 85.6mm;
                height: 53.98mm;
                page-break-after: always;
                page-break-inside: avoid;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                width: 85.6mm;
                height: 53.98mm;
                display: block;
                object-fit: contain;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body>
            <div class="page"><img src="${imgFront}" /></div>
            ${imgBack ? `<div class="page"><img src="${imgBack}" /></div>` : ''}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Print error:', err);
      window.print();
    }
  };

  // Download PDF using html-to-image & jsPDF (Tailwind v4 / oklch compatible)
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 53.98] // CR80 standard dimensions
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

      // Render front
      const imgDataFront = await toPng(frontEl, renderOptions);
      pdf.addImage(imgDataFront, 'PNG', 0, 0, 85.6, 53.98);

      // Render back on second page
      if (backEl) {
        pdf.addPage([85.6, 53.98], 'landscape');
        const imgDataBack = await toPng(backEl, renderOptions);
        pdf.addImage(imgDataBack, 'PNG', 0, 0, 85.6, 53.98);
      }

      const fileName = `WorkDen_ID_${card.entity_code || card.id_number || 'Card'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#121212] rounded-2xl sm:rounded-3xl shadow-2xl border border-[#353535] max-w-4xl w-full max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[#353535] flex items-center justify-between gap-2 bg-[#0E0E0E] text-white">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shadow-lg shadow-[#F5C542]/10 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#F5C542]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-lg text-white truncate">
                  Official ID Card Preview
                </h3>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                  card.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : card.status === 'PENDING'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {card.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#B5B5B5] font-mono mt-0.5 truncate">
                {card.entity_code || card.staff_id || card.user_id_code} • Official Credential
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {onSimulateScan && card.qr_token && (
              <button
                onClick={() => onSimulateScan(card.qr_token)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-[#F5C542]/15 hover:bg-[#F5C542]/25 text-[#F5C542] border border-[#F5C542]/40 text-[11px] sm:text-xs font-semibold shadow transition cursor-pointer"
                title="Simulate scanning this QR code with Google Lens / Camera"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulate QR Scan</span>
                <span className="sm:hidden">Scan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-[#B5B5B5] hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 bg-[#0B0B0B]">
          
          {/* Card Presentation Area (Left / Center) */}
          <div className="w-full lg:col-span-7 flex flex-col items-center p-3 sm:p-5 bg-[#171717] rounded-2xl border border-[#353535] shadow-inner shrink-0">
            {/* View Controls */}
            <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 bg-[#111111] p-1 sm:p-1.5 rounded-xl border border-[#353535] max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveSide('front')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeSide === 'front'
                    ? 'bg-[#F5C542] text-black font-bold shadow-md shadow-[#F5C542]/20'
                    : 'text-[#B5B5B5] hover:text-white'
                }`}
              >
                Front Side
              </button>
              <button
                onClick={() => setActiveSide('back')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeSide === 'back'
                    ? 'bg-[#F5C542] text-black font-bold shadow-md shadow-[#F5C542]/20'
                    : 'text-[#B5B5B5] hover:text-white'
                }`}
              >
                Back Side
              </button>
              <button
                onClick={() => setActiveSide('both')}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  activeSide === 'both'
                    ? 'bg-[#F5C542] text-black font-bold shadow-md shadow-[#F5C542]/20'
                    : 'text-[#B5B5B5] hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Side-by-Side (Print Layout)</span>
                <span className="sm:hidden">Both Sides</span>
              </button>
            </div>

            {/* The Cards Rendering Container - Responsive Scaling */}
            <div className="print-card-area w-full max-w-full flex flex-col items-center justify-center gap-5 sm:gap-6 py-2 shrink-0">
              {(activeSide === 'front' || activeSide === 'both') && (
                <div className="flex flex-col items-center justify-center transition-all duration-300 w-full">
                  <div className="w-[340px] max-w-full flex justify-center">
                    <div className="scale-[0.80] min-[390px]:scale-[0.90] min-[440px]:scale-100 origin-top h-[180px] min-[390px]:h-[200px] min-[440px]:h-[220px] transition-transform">
                      <IdCardRenderer
                        card={card}
                        settings={settings}
                        side="front"
                        cardRef={frontRef}
                      />
                    </div>
                  </div>
                  <div className="text-center mt-3 text-xs font-semibold text-slate-400">
                    Front Side (Standard CR80)
                  </div>
                </div>
              )}

              {(activeSide === 'back' || activeSide === 'both') && (
                <div className="flex flex-col items-center justify-center transition-all duration-300 w-full">
                  <div className="w-[340px] max-w-full flex justify-center">
                    <div className="scale-[0.80] min-[390px]:scale-[0.90] min-[440px]:scale-100 origin-top h-[180px] min-[390px]:h-[200px] min-[440px]:h-[220px] transition-transform">
                      <IdCardRenderer
                        card={card}
                        settings={settings}
                        side="back"
                        cardRef={backRef}
                      />
                    </div>
                  </div>
                  <div className="text-center mt-3 text-xs font-semibold text-slate-400">
                    Back Side (Terms & Address)
                  </div>
                </div>
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
              <IdCardRenderer card={card} settings={settings} side="front" cardRef={exportFrontRef} />
              <div style={{ height: '30px' }} />
              <IdCardRenderer card={card} settings={settings} side="back" cardRef={exportBackRef} />
            </div>
          </div>

          {/* Card Management Sidebar (Right) */}
          <div className="w-full lg:col-span-5 flex flex-col space-y-4 shrink-0">
            
            {/* Quick Actions Panel */}
            <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] shadow-xl space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F5C542]" />
                Actions & Export
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C542] to-[#FFD84D] hover:from-[#FFD84D] hover:to-[#F5C542] text-black text-xs font-bold shadow-lg shadow-[#F5C542]/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] text-white text-xs font-semibold border border-[#353535] transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-[#F5C542]" />
                  <span>Print Card</span>
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                {card.status === 'PENDING' && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(card, 'ACTIVE')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Activate ID</span>
                  </button>
                )}

                {card.status === 'ACTIVE' && onStatusChange && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onStatusChange(card, 'SUSPENDED')}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      Suspend Card
                    </button>
                    <button
                      onClick={() => onStatusChange(card, 'REVOKED')}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      Revoke Card
                    </button>
                  </div>
                )}

                {(card.status === 'SUSPENDED' || card.status === 'REVOKED') && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(card, 'ACTIVE')}
                    className="w-full px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition cursor-pointer"
                  >
                    Reactivate ID Card
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {onRenew && (
                    <button
                      onClick={() => onRenew(card)}
                      className="px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Renew</span>
                    </button>
                  )}
                  {onReplace && (
                    <button
                      onClick={() => onReplace(card)}
                      className="px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Replace</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profile & Security Details */}
            <div className="bg-white/4 p-5 rounded-2xl border border-white/10 shadow-xl space-y-2.5 text-xs text-slate-300">
              <h4 className="font-bold text-sm text-white border-b border-white/10 pb-2">
                Card Specifications
              </h4>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Cardholder Name</span>
                <span className="font-semibold text-white">{card.full_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">ID Number</span>
                <span className="font-mono font-bold text-[#F5C542]">{card.entity_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Type</span>
                <span className="font-medium text-slate-200">{isStaff ? 'Staff Identity' : 'Member Identity'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">{isStaff ? 'Department' : 'Active Plan'}</span>
                <span className="font-medium text-[#FFD84D]">{isStaff ? card.department : (card.current_plan || '₹499 Plan')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Issue Date</span>
                <span className="text-slate-200">{card.issue_date ? formatDateIST(card.issue_date) : 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Expiry Date</span>
                <span className="font-bold text-emerald-400">{card.expiry_date ? formatDateIST(card.expiry_date) : 'Permanent'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">QR Token</span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[170px]" title={card.qr_token}>
                  {card.qr_token || 'N/A'}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-[#F5C542] text-[10px] font-bold block uppercase tracking-wider mb-1">
                  Lost Card Instructions
                </span>
                <p className="text-stone-300 text-[11px] leading-relaxed">
                  {settings?.lost_card_instructions || 'If found, please immediately return to WorkDen Security or email support@workden.online / Call +91 9262725686'}
                </p>
              </div>
            </div>

            {/* Note on Google Lens */}
            <div className="bg-[#F5C542]/10 p-3 rounded-xl border border-[#F5C542]/30 text-[11px] text-[#FFD84D] flex items-start gap-2">
              <QrCode className="w-4 h-4 text-[#F5C542] shrink-0 mt-0.5" />
              <div>
                <strong>Google Lens Ready:</strong> When scanned on any smartphone camera, this QR code automatically opens live status verification on <span className="font-mono text-[#FFD84D]">workden.online</span> without login.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
