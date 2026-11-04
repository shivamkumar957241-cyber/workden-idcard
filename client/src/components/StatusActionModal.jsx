import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  RotateCw,
  Calendar,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { authFetch } from '../api';

export default function StatusActionModal({
  isOpen,
  onClose,
  card,
  actionType, // 'STATUS' (SUSPEND/REVOKE/ACTIVE), 'RENEW', 'REPLACE'
  targetStatus, // 'ACTIVE', 'SUSPENDED', 'REVOKED'
  onSuccess
}) {
  const [reason, setReason] = useState('');
  const [years, setYears] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !card) return null;

  const isStaff = (card.profile_type || 'STAFF') === 'STAFF';
  const apiEndpointBase = isStaff ? '/api/staff' : '/api/users';
  const entityId = card.profile_id || card.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let res;
      if (actionType === 'RENEW') {
        res = await authFetch(`${apiEndpointBase}/${entityId}/renew`, {
          method: 'POST',
          body: JSON.stringify({ years, remarks: reason })
        });
      } else if (actionType === 'REPLACE') {
        res = await authFetch(`${apiEndpointBase}/${entityId}/replace`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason || 'Card Lost / Damaged / Reissued' })
        });
      } else {
        // Status change: ACTIVE / SUSPENDED / REVOKED
        res = await authFetch(`${apiEndpointBase}/${entityId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: targetStatus, reason })
        });
      }

      const result = await res.json();
      if (result.success) {
        onSuccess(result);
        onClose();
      } else {
        setErrorMsg(result.error || 'Operation failed');
      }
    } catch (err) {
      console.error('Action error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              targetStatus === 'REVOKED'
                ? 'bg-rose-600'
                : targetStatus === 'SUSPENDED'
                ? 'bg-amber-600'
                : actionType === 'RENEW'
                ? 'bg-[#F5C542] text-black font-extrabold'
                : 'bg-[#F5C542] text-black font-extrabold'
            }`}>
              {targetStatus === 'REVOKED' && <Ban className="w-5 h-5 text-white" />}
              {targetStatus === 'SUSPENDED' && <AlertTriangle className="w-5 h-5 text-white" />}
              {targetStatus === 'ACTIVE' && <CheckCircle2 className="w-5 h-5 text-white" />}
              {actionType === 'RENEW' && <Calendar className="w-5 h-5 text-white" />}
              {actionType === 'REPLACE' && <RotateCw className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {actionType === 'RENEW' && 'Renew Card Validity'}
                {actionType === 'REPLACE' && 'Issue Replacement Card'}
                {actionType === 'STATUS' && `Update ID Status: ${targetStatus}`}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {card.entity_code} • {card.full_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {actionType === 'RENEW' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Extend Validity By
              </label>
              <select
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
              >
                <option value={1}>+ 1 Year Extension</option>
                <option value={2}>+ 2 Years Extension</option>
                <option value={3}>+ 3 Years Extension</option>
              </select>
            </div>
          )}

          {actionType === 'REPLACE' && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Security Impact:</strong> The current QR token will be permanently deactivated. Any scan of the old physical card will fail or show Invalid. A new secure QR token and card version will be created.
              </div>
            </div>
          )}

          {targetStatus === 'REVOKED' && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-300 text-rose-900 text-xs flex items-start gap-2">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Immediate Revocation:</strong> The QR verification token will immediately show <strong className="text-rose-700">REVOKED</strong> to anyone scanning the card via Google Lens or mobile camera.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Admin Notes <span className="text-slate-400 font-normal">(Recorded in Audit Trail)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide justification or reference for this action..."
              rows={3}
              required={targetStatus === 'REVOKED' || actionType === 'REPLACE'}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 ${
                targetStatus === 'REVOKED'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : targetStatus === 'SUSPENDED'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold'
              }`}
            >
              {isSubmitting ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
