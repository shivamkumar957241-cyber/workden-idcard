import React, { useState } from 'react';
import {
  Layers,
  Search,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { formatDateIST } from '../utils/date';

export default function UnifiedCardsTable({
  title = 'All Issued ID Cards',
  subtitle = 'Master centralized registry of both Staff and User ID credentials',
  icon: TitleIcon = Layers,
  cards = [],
  loading = false,
  onPreviewCard,
  onApproveCard,
  onOpenStatusModal,
  onExportCsv,
  onDeleteCard
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = cards.filter((c) => {
    if (typeFilter !== 'ALL' && c.profile_type !== typeFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (c.full_name && c.full_name.toLowerCase().includes(term)) ||
      (c.entity_code && c.entity_code.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.mobile && c.mobile.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TitleIcon className="w-5 h-5 text-[#F5C542]" />
            <span>{title}</span>
            <span className="text-xs bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/30 font-bold px-2.5 py-0.5 rounded-full">
              {filtered.length} Records
            </span>
          </h2>
          <p className="text-xs text-[#888] mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={onExportCsv}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#353535] bg-[#171717] hover:border-[#F5C542] text-[#B5B5B5] hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export Records CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID number, email, or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white font-medium focus:outline-none focus:border-[#F5C542] cursor-pointer"
          >
            <option value="ALL">All Types (Staff & Members)</option>
            <option value="STAFF">Staff IDs Only</option>
            <option value="USER">User IDs Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#171717] rounded-2xl border border-[#353535] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B5B5B5]">
            <thead className="bg-[#121212] text-[#888] font-bold uppercase text-[10px] tracking-wider border-b border-[#353535]">
              <tr>
                <th className="py-3.5 px-4">Credential Holder</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Entity ID</th>
                <th className="py-3.5 px-4">Role / Plan</th>
                <th className="py-3.5 px-4">Department / Category</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-[#888]">
                    Loading records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#888]">
                    <AlertCircle className="w-8 h-8 text-[#666] mx-auto mb-2" />
                    <p className="font-semibold text-white">No matching credentials found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isStaff = c.profile_type === 'STAFF';
                  return (
                    <tr key={c.card_id} className="hover:bg-[#222222]/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.photo_url || '/logo.png'}
                            alt={c.full_name}
                            className="w-9 h-9 rounded-xl object-cover border border-[#353535] shadow-sm bg-black"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <div className="font-bold text-white">{c.full_name}</div>
                            <div className="text-[10px] text-[#888]">{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          isStaff
                            ? 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                            : 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                        }`}>
                          {isStaff ? 'Staff' : 'Member'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#F5C542]">
                        {c.entity_code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {c.designation || c.current_plan || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-[#B5B5B5]">
                        {c.department || c.user_category || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-[#888]">
                        {formatDateIST(c.issue_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={c.status === 'EXPIRED' ? 'text-red-400 font-bold' : 'text-[#888]'}>
                          {c.expiry_date ? formatDateIST(c.expiry_date) : 'Permanent'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : c.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : c.status === 'EXPIRED'
                            ? 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'ACTIVE' ? 'bg-emerald-400' :
                            c.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'
                          }`}></span>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPreviewCard(c)}
                            className="p-1.5 rounded-lg text-[#888] hover:text-[#F5C542] hover:bg-[#222222] transition cursor-pointer"
                            title="Preview ID Card"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {c.status === 'PENDING' && (
                            <button
                              onClick={() => onApproveCard(c.id, c.profile_type)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                              title="Approve ID Card"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onOpenStatusModal(c)}
                            className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#222222] transition cursor-pointer"
                            title="Manage Status & Reissue"
                          >
                            <span className="text-xs font-bold leading-none">•••</span>
                          </button>

                          {onDeleteCard && (
                            <button
                              onClick={() => onDeleteCard(c)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Permanently Delete ID Card"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
