import React from 'react';
import {
  Search,
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { formatDateIST } from '../utils/date';

export default function UserTable({
  userList = [],
  loading = false,
  pagination = {},
  filters = {},
  onFilterChange,
  onOpenRegister,
  onPreviewCard,
  onApproveCard,
  onOpenStatusModal,
  onExportCsv,
  onDeleteCard
}) {
  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>User & Member ID Cards</span>
            <span className="text-xs bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/30 font-bold px-2.5 py-0.5 rounded-full">
              {pagination.total || userList.length} Total
            </span>
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            WorkDen registered client & member official identity credentials
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#353535] bg-[#171717] hover:border-[#F5C542] text-[#B5B5B5] hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black text-xs font-black shadow-lg shadow-[#F5C542]/15 transition cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Create New User ID</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, WorkDen ID, User ID, phone..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition"
          />
        </div>

        {/* Plan Filter */}
        <div>
          <select
            value={filters.plan || 'ALL'}
            onChange={(e) => onFilterChange('plan', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white focus:outline-none focus:border-[#F5C542] font-medium cursor-pointer"
          >
            <option value="ALL">All Active Plans</option>
            <option value="₹249 – Basic Access">₹249 – Basic Access</option>
            <option value="₹499 – Full Access">₹499 – Full Access</option>
            <option value="₹699 – Priority Access">₹699 – Priority Access</option>
            <option value="₹999 – Professional Access">₹999 – Professional Access</option>
            <option value="₹1499 – Master Access">₹1499 – Master Access</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white focus:outline-none focus:border-[#F5C542] font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active & Valid</option>
            <option value="PENDING">Pending Approval</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REVOKED">Revoked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#171717] rounded-2xl border border-[#353535] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B5B5B5]">
            <thead className="bg-[#121212] text-[#888] font-bold uppercase text-[10px] tracking-wider border-b border-[#353535]">
              <tr>
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">User ID Code</th>
                <th className="py-3.5 px-4">Portal ID</th>
                <th className="py-3.5 px-4">Active Plan</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-[#888]">
                    Loading user records...
                  </td>
                </tr>
              ) : userList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#888]">
                    <AlertCircle className="w-8 h-8 text-[#666] mx-auto mb-2" />
                    <p className="font-semibold text-white">No user ID cards found</p>
                    <p className="text-xs text-[#888] mt-1">Click "Create New User ID" to issue a member card</p>
                  </td>
                </tr>
              ) : (
                userList.map((u) => (
                  <tr key={u.id} className="hover:bg-[#222222]/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photo_url || '/logo.png'}
                          alt={u.full_name}
                          className="w-9 h-9 rounded-xl object-cover border border-[#353535] shadow-sm bg-black"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="font-bold text-white">{u.full_name}</div>
                          <div className="text-[10px] text-[#888]">{u.email} • {u.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#F5C542]">
                      {u.user_id_code}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#888]">
                      {u.workden_user_id || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#FFD84D] bg-[#F5C542]/10 border border-[#F5C542]/30 px-2.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                        {u.current_plan || '₹499 – Full Access'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {u.user_category || 'WorkDen Member'}
                    </td>
                    <td className="py-3 px-4 text-[#888]">
                      {u.expiry_date ? formatDateIST(u.expiry_date) : 'Permanent'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        u.card_status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : u.card_status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : u.card_status === 'EXPIRED'
                          ? 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.card_status === 'ACTIVE' ? 'bg-emerald-400' :
                          u.card_status === 'PENDING' ? 'bg-amber-400' :
                          u.card_status === 'EXPIRED' ? 'bg-stone-400' : 'bg-red-400'
                        }`}></span>
                        {u.card_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onPreviewCard({ ...u, profile_type: 'USER', entity_code: u.user_id_code })}
                          className="p-1.5 rounded-lg text-[#888] hover:text-[#F5C542] hover:bg-[#222222] transition cursor-pointer"
                          title="Preview ID Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {u.card_status === 'PENDING' && (
                          <button
                            onClick={() => onApproveCard(u.id)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                            title="Approve & Activate"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onOpenStatusModal({ ...u, profile_type: 'USER', entity_code: u.user_id_code })}
                          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#222222] transition cursor-pointer"
                          title="Manage Status"
                        >
                          <span className="text-xs font-bold leading-none">•••</span>
                        </button>

                        {onDeleteCard && (
                          <button
                            onClick={() => onDeleteCard({ ...u, id: u.card_id || u.id, entity_code: u.user_id_code })}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Permanently Delete ID Card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
