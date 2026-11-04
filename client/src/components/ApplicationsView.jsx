import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, CheckCircle2, XCircle, Eye, Check, X,
  AlertCircle, Loader2, Calendar, User, Phone, Mail, Building2, RefreshCw, Trash2,
  ExternalLink, File
} from 'lucide-react';
import { authFetch } from '../api';
import { formatDateIST } from '../utils/date';

const STATUS_BADGE = {
  PENDING:  { label: 'Pending Review', class: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  APPROVED: { label: 'Approved', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  REJECTED: { label: 'Rejected', class: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export default function ApplicationsView({ onApprovalSuccess, initialStatus = 'PENDING' }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [selectedApp, setSelectedApp] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await authFetch(`/api/applications?${params}`);
      const json = await res.json();
      if (json.success) setApplications(json.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApplications(); }, [statusFilter]);

  const handleApprove = async (appId) => {
    setProcessing(true);
    try {
      const res = await authFetch(`/api/applications/${appId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ validity_period: '1 Year' })
      });
      const json = await res.json();
      if (json.success) {
        showMsg(json.message);
        setSelectedApp(null);
        fetchApplications();
        onApprovalSuccess?.();
      } else {
        showMsg(json.error || 'Approval failed', 'error');
      }
    } catch { showMsg('Server error', 'error'); }
    finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/applications/${showRejectModal}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejectionReason || 'Does not meet requirements.' })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('Application rejected.');
        setShowRejectModal(null);
        setRejectionReason('');
        setSelectedApp(null);
        fetchApplications();
      } else {
        showMsg(json.error || 'Failed', 'error');
      }
    } catch { showMsg('Server error', 'error'); }
    finally { setProcessing(false); }
  };

  const handleDeleteApp = async (appId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete the application for "${name}"?\n\nThis action cannot be undone.`)) return;
    setProcessing(true);
    try {
      const res = await authFetch(`/api/applications/${appId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showMsg(json.message || 'Application deleted successfully.');
        setSelectedApp(null);
        fetchApplications();
        onApprovalSuccess?.();
      } else {
        showMsg(json.error || 'Failed to delete application', 'error');
      }
    } catch {
      showMsg('Server error while deleting application', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const pending = applications.filter(a => a.status === 'PENDING');
  const filtered = statusFilter === 'ALL' ? applications : applications.filter(a => a.status === statusFilter);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl border
          ${toast.type === 'success' ? 'bg-[#171717] border-emerald-500/30' : 'bg-[#171717] border-red-500/30'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-extrabold text-lg">ID Card Applications</h2>
          <p className="text-[#888] text-xs mt-0.5">Review and process user-submitted ID card applications</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold">{pending.length} pending</span>
            </div>
          )}
          <button onClick={fetchApplications} className="p-2 text-[#888] hover:text-[#F5C542] hover:bg-[#171717] rounded-lg transition-all border border-[#353535]">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              statusFilter === s
                ? 'bg-[#F5C542] text-black border-[#F5C542] shadow-md shadow-[#F5C542]/10'
                : 'bg-[#171717] text-[#888] border-[#353535] hover:border-[#555] hover:text-white'
            }`}>
            {s === 'ALL' ? `All (${applications.length})` : `${s} (${applications.filter(a => a.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#F5C542] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#171717] border border-[#353535] rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-[#555] mx-auto mb-3" />
          <p className="text-[#888] text-sm">No applications found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(app => {
            const badge = STATUS_BADGE[app.status] || STATUS_BADGE.PENDING;
            return (
              <div key={app.id} className="bg-[#171717] border border-[#353535] hover:border-[#555] rounded-2xl p-5 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="w-12 h-12 rounded-xl bg-black border border-[#353535] overflow-hidden flex-shrink-0">
                      {app.photo_url ? (
                        <img src={app.photo_url.startsWith('/') ? app.photo_url : app.photo_url}
                          alt={app.full_name} className="w-full h-full object-cover"
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-[#555]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-sm">{app.full_name}</h3>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.class}`}>
                          {badge.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          app.application_type === 'STAFF'
                            ? 'bg-[#F5C542]/15 text-[#F5C542] border-[#F5C542]/30'
                            : 'bg-stone-500/20 text-stone-300 border-stone-500/30'
                        }`}>
                          {app.application_type} ID
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[#888] text-xs"><Mail className="w-3 h-3 text-[#F5C542]" />{app.email}</span>
                        <span className="flex items-center gap-1 text-[#888] text-xs"><Phone className="w-3 h-3 text-[#F5C542]" />{app.mobile}</span>
                        {app.designation && <span className="flex items-center gap-1 text-[#888] text-xs"><Building2 className="w-3 h-3 text-[#F5C542]" />{app.designation}</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[#666] text-[11px]">
                        <Calendar className="w-3 h-3" />
                        Applied on {formatDateIST(app.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0 mt-2 sm:mt-0">
                    <button onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                      className="p-2 text-[#888] hover:text-[#F5C542] hover:bg-[#222222] rounded-lg transition-all border border-[#353535]"
                      title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    {app.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(app.id)}
                          disabled={processing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectModal(app.id)}
                          disabled={processing}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteApp(app.id, app.full_name)}
                      disabled={processing}
                      className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all border border-[#353535]"
                      title="Permanently Delete Application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {selectedApp?.id === app.id && (
                  <div className="mt-4 pt-4 border-t border-[#353535] space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { label: 'Department', value: app.department },
                        { label: 'Designation', value: app.designation },
                        { label: 'City', value: app.city },
                        { label: 'Qualification', value: app.qualification },
                        { label: 'Aadhar Number', value: app.aadhar_number },
                        { label: 'Work Location', value: app.work_location },
                        { label: 'Employment Type', value: app.employment_type },
                        ...(app.application_type !== 'STAFF' ? [
                          { label: 'User Category', value: app.user_category },
                          { label: 'Current Plan', value: app.current_plan },
                        ] : []),
                        { label: 'Joining Date', value: formatDateIST(app.joining_date) },
                        { label: 'Date of Birth', value: formatDateIST(app.dob) },
                        { label: 'Gender', value: app.gender },
                        { label: "Father's Name", value: app.father_name },
                        { label: 'Residential Address', value: app.residential_address },
                      ].filter(f => f.value).map(({ label, value }) => (
                        <div key={label} className="bg-[#222222] border border-[#353535] rounded-xl px-3 py-2">
                          <p className="text-[#888] text-[10px] uppercase font-bold tracking-wider mb-0.5">{label}</p>
                          <p className="text-white text-xs font-medium">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Uploaded Aadhar Documents (Front & Back) */}
                    {(app.aadhar_front || app.aadhar_back) && (
                      <div className="bg-[#1c1c1c] border border-[#353535] rounded-xl p-4">
                        <p className="text-[#F5C542] text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Uploaded Aadhar Card Documents
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Aadhar Front */}
                          {app.aadhar_front ? (
                            <div className="bg-[#222222] border border-[#353535] rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-[#F5C542]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white text-xs font-bold truncate">Aadhar Front Side</p>
                                  <p className="text-[#888] text-[10px]">
                                    {app.aadhar_front.endsWith('.pdf') ? 'PDF Document' : 'Image File'}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={app.aadhar_front}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5C542]/15 hover:bg-[#F5C542]/25 text-[#F5C542] border border-[#F5C542]/30 rounded-lg text-xs font-semibold transition shrink-0"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="bg-[#222222]/50 border border-[#353535] rounded-xl p-3 text-[#777] text-xs">
                              Aadhar Front: Not uploaded
                            </div>
                          )}

                          {/* Aadhar Back */}
                          {app.aadhar_back ? (
                            <div className="bg-[#222222] border border-[#353535] rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-[#F5C542]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white text-xs font-bold truncate">Aadhar Back Side</p>
                                  <p className="text-[#888] text-[10px]">
                                    {app.aadhar_back.endsWith('.pdf') ? 'PDF Document' : 'Image File'}
                                  </p>
                                </div>
                              </div>
                              <a
                                href={app.aadhar_back}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5C542]/15 hover:bg-[#F5C542]/25 text-[#F5C542] border border-[#F5C542]/30 rounded-lg text-xs font-semibold transition shrink-0"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <div className="bg-[#222222]/50 border border-[#353535] rounded-xl p-3 text-[#777] text-xs">
                              Aadhar Back: Not uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {app.remarks && (
                      <div className="bg-[#222222] border border-[#353535] rounded-xl px-3 py-2">
                        <p className="text-[#888] text-[10px] uppercase font-bold tracking-wider mb-0.5">Remarks</p>
                        <p className="text-white text-xs">{app.remarks}</p>
                      </div>
                    )}
                    {app.status === 'REJECTED' && app.rejection_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                        <p className="text-red-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Rejection Reason</p>
                        <p className="text-red-300 text-xs">{app.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#171717] border border-[#353535] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-base mb-1">Reject Application</h3>
            <p className="text-[#888] text-xs mb-4">Provide a reason for rejection (optional)</p>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete information, photo not clear..."
              rows={3}
              className="w-full bg-[#222222] border border-[#353535] rounded-xl px-4 py-3 text-white placeholder-[#666] text-sm focus:outline-none focus:border-red-400/50 transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={handleReject} disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirm Reject
              </button>
              <button onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}
                className="flex-1 py-2.5 bg-[#222222] border border-[#353535] text-[#888] hover:text-white rounded-xl transition-all text-xs font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
