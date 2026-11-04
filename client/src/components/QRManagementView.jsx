import React, { useEffect, useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  Ban,
  Eye,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { authFetch } from '../api';

export default function QRManagementView({ onSimulateScan }) {
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState({ total_tokens: 0, active_tokens: 0, revoked_tokens: 0, total_scans: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/cards/qr-management');
      const json = await res.json();
      if (json.success) {
        setTokens(json.data || []);
        setStats(json.stats || {});
      }
    } catch (err) {
      console.error('Error fetching QR tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleToggleToken = async (tokenId) => {
    try {
      const res = await authFetch(`/api/cards/toggle-token/${tokenId}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTokens((prev) =>
          prev.map((t) => (t.token_id === tokenId ? { ...t, is_active: json.is_active } : t))
        );
      }
    } catch (err) {
      console.error('Error toggling token:', err);
    }
  };

  const filtered = tokens.filter((t) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (t.holder_name && t.holder_name.toLowerCase().includes(term)) ||
      (t.entity_code && t.entity_code.toLowerCase().includes(term)) ||
      (t.token && t.token.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            QR Verification & Cryptographic Token Registry
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            Monitor real-time scan metrics, cryptographic tokens, and live status verification.
          </p>
        </div>
        <button
          onClick={fetchTokens}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#353535] bg-[#171717] hover:border-[#F5C542] text-[#B5B5B5] hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#888] font-medium block">Total Tokens</span>
            <span className="text-lg font-black text-white">{stats.total_tokens || 0}</span>
          </div>
        </div>

        <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#888] font-medium block">Active Tokens</span>
            <span className="text-lg font-black text-white">{stats.active_tokens || 0}</span>
          </div>
        </div>

        <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#888] font-medium block">Revoked Tokens</span>
            <span className="text-lg font-black text-white">{stats.revoked_tokens || 0}</span>
          </div>
        </div>

        <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD84D]/15 text-[#FFD84D] border border-[#FFD84D]/30 flex items-center justify-center font-bold">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-[#888] font-medium block">Total Live Scans</span>
            <span className="text-lg font-black text-white">{stats.total_scans || 0}</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by holder name, ID code, or verification token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#171717] rounded-2xl border border-[#353535] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B5B5B5]">
            <thead className="bg-[#121212] text-[#888] font-bold uppercase text-[10px] tracking-wider border-b border-[#353535]">
              <tr>
                <th className="py-3.5 px-4">Credential Holder</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4">Verification Token (Cryptographic)</th>
                <th className="py-3.5 px-4 text-center">Scan Count</th>
                <th className="py-3.5 px-4">Last Scanned</th>
                <th className="py-3.5 px-4 text-center">Token Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#888]">
                    Loading cryptographic tokens...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#888]">
                    No QR tokens found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.token_id} className="hover:bg-[#222222]/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{t.holder_name}</div>
                      <div className="text-[10px] text-[#888]">{t.profile_type === 'STAFF' ? 'Staff' : 'Member'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#F5C542]">
                      {t.entity_code}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#888]">
                      <span className="truncate block max-w-xs font-mono" title={t.token}>
                        {t.token}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] font-bold text-xs">
                        {t.scan_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#888]">
                      {t.last_scanned_at ? new Date(t.last_scanned_at).toLocaleString('en-IN') : 'Never Scanned'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.is_active === 1
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        {t.is_active === 1 ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleToken(t.token_id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            t.is_active === 1
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {t.is_active === 1 ? 'Revoke Token' : 'Reactivate'}
                        </button>
                      </div>
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
