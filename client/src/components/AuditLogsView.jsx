import React, { useEffect, useState } from 'react';
import { Shield, RefreshCw, Search } from 'lucide-react';
import { authFetch } from '../api';
import { formatIST } from '../utils/date';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/audit-logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (l.action && l.action.toLowerCase().includes(term)) ||
      (l.performed_by && l.performed_by.toLowerCase().includes(term)) ||
      (l.target_id && String(l.target_id).toLowerCase().includes(term)) ||
      (l.details && l.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#F5C542]" />
            <span>ID Card Security & Audit Trail</span>
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            Immutable server-side audit logs of registrations, approvals, renewals, revocations, and scans
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#353535] bg-[#171717] hover:border-[#F5C542] text-[#B5B5B5] hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Trail</span>
        </button>
      </div>

      <div className="bg-[#171717] rounded-2xl border border-[#353535] shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#353535]">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit actions, users, or IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B5B5B5]">
            <thead className="bg-[#121212] text-[#888] font-bold uppercase text-[10px] tracking-wider border-b border-[#353535]">
              <tr>
                <th className="py-3.5 px-4">Timestamp (IST - GMT+5:30)</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">Target ID</th>
                <th className="py-3.5 px-4">Details / Parameters</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#888]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#888]">
                    No matching audit records found
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#222222]/60 transition">
                    <td className="py-3 px-4 font-mono text-[#F5C542] text-[11px] whitespace-nowrap">
                      {formatIST(l.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#FFD84D] bg-[#F5C542]/10 border border-[#F5C542]/30 px-2 py-0.5 rounded text-[11px]">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {l.performed_by}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#F5C542]">
                      {l.target_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#888] max-w-md truncate" title={l.details}>
                      {l.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
