import React, { useState, useEffect } from 'react';
import {
  CreditCard, CheckCircle2, XCircle, Clock, Search,
  RefreshCw, AlertCircle, Loader2, Check, X, ExternalLink,
  ShieldCheck, Filter, Calendar, User, Mail, DollarSign
} from 'lucide-react';
import { authFetch } from '../api';
import { formatDateIST, formatIST } from '../utils/date';

export default function PaymentsView({ initialStatus = 'ALL', initialType = 'ALL', onPaymentApproved }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setTypeFilter(initialType);
  }, [initialType]);

  const showMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await authFetch(`/api/payments/all?${params}`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.data || []);
      }
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const res = await authFetch(`/api/payments/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showMsg('Payment verified & Member ID Card download unlocked!');
        fetchPayments();
        onPaymentApproved?.();
      } else {
        showMsg(json.error || 'Approval failed', 'error');
      }
    } catch {
      showMsg('Server error while approving payment', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    setProcessingId(rejectModalId);
    try {
      const res = await authFetch(`/api/payments/${rejectModalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_remarks: rejectReason || 'Payment verification rejected by admin.' })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('Payment confirmation rejected.', 'error');
        setRejectModalId(null);
        setRejectReason('');
        fetchPayments();
      } else {
        showMsg(json.error || 'Rejection failed', 'error');
      }
    } catch {
      showMsg('Server error while rejecting payment', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const submittedCount = payments.filter(p => p.status === 'SUBMITTED').length;
  const approvedCount = payments.filter(p => p.status === 'APPROVED').length;
  const rejectedCount = payments.filter(p => p.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl border ${
          toast.type === 'success' ? 'bg-[#171717] border-emerald-500/40 text-emerald-300' : 'bg-[#171717] border-red-500/40 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-extrabold text-xl flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#F5C542]" />
            {typeFilter === 'STAFF'
              ? 'Staff ID Card Payments (₹249)'
              : typeFilter === 'USER'
              ? 'Member ID Card Payments (₹99)'
              : 'All ID Card Payments (Member ₹99 & Staff ₹249)'}
          </h2>
          <p className="text-[#888] text-xs mt-1">
            Review Razorpay live payment records for both Members and Staff ID card downloads.
          </p>
        </div>
        <button
          onClick={fetchPayments}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#171717] hover:bg-[#222] border border-[#353535] hover:border-[#F5C542] rounded-xl text-xs text-[#aaa] hover:text-white transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`cursor-pointer bg-[#171717] border rounded-2xl p-4 transition ${
            statusFilter === 'SUBMITTED' ? 'border-[#F5C542] shadow-lg shadow-[#F5C542]/10' : 'border-[#353535] hover:border-[#555]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[#888] text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2">{submittedCount}</p>
          <p className="text-[11px] text-[#777] mt-0.5">Need admin verification to unlock card</p>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer bg-[#171717] border rounded-2xl p-4 transition ${
            statusFilter === 'APPROVED' ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-[#353535] hover:border-[#555]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[#888] text-xs font-semibold uppercase tracking-wider">Approved & Unlocked</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{approvedCount}</p>
          <p className="text-[11px] text-[#777] mt-0.5">
            ₹{payments.filter(p => p.status === 'APPROVED').reduce((s, p) => s + Math.round((p.amount || 9900) / 100), 0).toLocaleString()} collected
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`cursor-pointer bg-[#171717] border rounded-2xl p-4 transition ${
            statusFilter === 'REJECTED' ? 'border-red-500 shadow-lg shadow-red-500/10' : 'border-[#353535] hover:border-[#555]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[#888] text-xs font-semibold uppercase tracking-wider">Rejected Confirmations</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">{rejectedCount}</p>
          <p className="text-[11px] text-[#777] mt-0.5">Failed verification</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#171717] border border-[#353535] rounded-2xl p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Type Filter */}
          <div className="flex items-center gap-1 bg-[#111] p-1 rounded-xl border border-[#2a2a2a]">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'USER', label: 'Member (₹99)' },
              { id: 'STAFF', label: 'Staff (₹249)' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-emerald-500 text-black shadow-sm'
                    : 'text-[#888] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === s
                    ? 'bg-[#F5C542] text-black shadow-md shadow-[#F5C542]/20'
                    : 'bg-[#222] text-[#888] hover:text-white hover:bg-[#2a2a2a]'
                }`}
              >
                {s === 'ALL' ? 'All Status' : s === 'SUBMITTED' ? 'Pending Review' : s}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-[#666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Member, Payment ID, Email..."
            className="w-full bg-[#121212] border border-[#353535] focus:border-[#F5C542] text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none transition"
          />
        </form>
      </div>

      {/* Payment Records Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#F5C542] animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-[#171717] border border-[#353535] rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-[#444] mx-auto mb-3" />
          <h3 className="text-white font-bold text-sm">No payment confirmations found</h3>
          <p className="text-[#777] text-xs mt-1">
            {statusFilter === 'SUBMITTED'
              ? 'There are no pending payment confirmations awaiting review.'
              : 'No payment records match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#171717] border border-[#353535] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#aaa]">
              <thead className="bg-[#121212] border-b border-[#353535] text-[#888] uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Member Info</th>
                  <th className="py-3 px-4">Razorpay Payment ID</th>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4 text-center">Amount</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a2a]">
                {payments.map(p => {
                  const isSubmitted = p.status === 'SUBMITTED';
                  const isApproved = p.status === 'APPROVED';
                  const isRejected = p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-[#1f1f1f] transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#222] border border-[#F5C542]/30 flex items-center justify-center text-[#F5C542] font-black text-xs">
                            {p.member_name?.[0] || 'M'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-white font-bold">{p.member_name || p.applicant_name}</p>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                p.application_type === 'STAFF'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                              }`}>
                                {p.application_type === 'STAFF' ? 'STAFF' : 'MEMBER'}
                              </span>
                            </div>
                            <p className="text-[#777] text-[11px]">{p.user_email || p.app_email}</p>
                            {p.member_id && (
                              <span className="inline-block mt-0.5 text-[10px] font-mono text-[#F5C542]">
                                {p.member_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#F5C542] text-[11px]">
                        {p.razorpay_payment_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#aaa] text-[11px]">
                        {p.razorpay_order_id}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black">
                          ₹{Math.round((p.amount || 9900) / 100)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#888] text-[11px]">
                        {formatDateIST(p.payment_date || p.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isSubmitted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            <Clock className="w-3 h-3" /> Submitted
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Approved & Unlocked
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isSubmitted ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={processingId === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              title="Approve Payment & Unlock ID Card"
                            >
                              {processingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectModalId(p.id)}
                              disabled={processingId === p.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              title="Reject Payment"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[#666] text-[11px]">
                            {isApproved ? 'Approved by ' + (p.reviewed_by || 'Admin') : 'Rejected: ' + (p.admin_remarks || 'Invalid')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#171717] border border-[#353535] rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-white font-extrabold text-base mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Reject Payment Confirmation
            </h3>
            <p className="text-[#888] text-xs mb-4">
              Enter the reason for rejecting this payment confirmation. The Member will be notified to retry.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Transaction could not be found on Razorpay dashboard or amount mismatch."
              className="w-full bg-[#121212] border border-[#353535] focus:border-red-500 text-white text-xs rounded-xl p-3 outline-none transition mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setRejectModalId(null); setRejectReason(''); }}
                className="px-4 py-2 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectModalId}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {processingId === rejectModalId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
