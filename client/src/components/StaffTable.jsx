import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Trash2,
  FileText,
  ExternalLink,
  X,
  Building2,
  MapPin,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { formatDateIST } from '../utils/date';

export default function StaffTable({
  staffList = [],
  departments = [],
  designations = [],
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
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [selectedDetailStaff, setSelectedDetailStaff] = useState(null);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStaffIds(staffList.map((s) => s.id));
    } else {
      setSelectedStaffIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Staff ID Cards</span>
            <span className="text-xs bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/30 font-bold px-2.5 py-0.5 rounded-full">
              {pagination.total || staffList.length} Total
            </span>
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            Official employee corporate credential records with sequential numbering & QR authentication
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
            <span>Create New Staff ID</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or Staff ID..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition"
          />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={filters.department || 'ALL'}
            onChange={(e) => onFilterChange('department', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white focus:outline-none focus:border-[#F5C542] font-medium cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Designation Filter */}
        <div>
          <select
            value={filters.designation || 'ALL'}
            onChange={(e) => onFilterChange('designation', e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white focus:outline-none focus:border-[#F5C542] font-medium cursor-pointer"
          >
            <option value="ALL">All Designations</option>
            {designations.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
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
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={staffList.length > 0 && selectedStaffIds.length === staffList.length}
                    className="rounded border-[#353535] bg-[#222222] text-[#F5C542] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Staff ID</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Department</th>
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
                    Loading staff records...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[#888]">
                    <AlertCircle className="w-8 h-8 text-[#666] mx-auto mb-2" />
                    <p className="font-semibold text-white">No staff ID cards found</p>
                    <p className="text-xs text-[#888] mt-1">Try adjusting your filters or click "Create New Staff ID"</p>
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-[#222222]/60 transition">
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(s.id)}
                        onChange={() => handleToggleSelect(s.id)}
                        className="rounded border-[#353535] bg-[#222222] text-[#F5C542] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.photo_url || '/logo.png'}
                          alt={s.full_name}
                          className="w-9 h-9 rounded-xl object-cover border border-[#353535] shadow-sm bg-black"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="font-bold text-white">{s.full_name}</div>
                          <div className="text-[10px] text-[#888]">{s.email} • {s.mobile}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#F5C542]">
                      {s.staff_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {s.designation}
                    </td>
                    <td className="py-3 px-4 text-[#B5B5B5]">
                      {s.department}
                    </td>
                    <td className="py-3 px-4 text-[#888]">
                      {s.issue_date ? formatDateIST(s.issue_date) : (s.joining_date ? formatDateIST(s.joining_date) : 'N/A')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={s.card_status === 'EXPIRED' ? 'text-red-400 font-bold' : 'text-[#888]'}>
                        {s.expiry_date ? formatDateIST(s.expiry_date) : 'Permanent'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        s.card_status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : s.card_status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : s.card_status === 'EXPIRED'
                          ? 'bg-stone-500/20 text-stone-300 border border-stone-500/30'
                          : s.card_status === 'SUSPENDED'
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.card_status === 'ACTIVE' ? 'bg-emerald-400' :
                          s.card_status === 'PENDING' ? 'bg-amber-400' : 'bg-red-400'
                        }`}></span>
                        {s.card_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDetailStaff(s)}
                          className="p-1.5 rounded-lg text-[#888] hover:text-[#F5C542] hover:bg-[#222222] transition cursor-pointer"
                          title="View Profile & Aadhar Card"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPreviewCard(s)}
                          className="p-1.5 rounded-lg text-[#888] hover:text-[#F5C542] hover:bg-[#222222] transition cursor-pointer"
                          title="Preview ID Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {s.card_status === 'PENDING' && (
                          <button
                            onClick={() => onApproveCard(s.id)}
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                            title="Approve & Activate ID Card"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenStatusModal(s)}
                          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#222222] transition cursor-pointer"
                          title="Manage Status & Reissue"
                        >
                          <span className="text-xs font-bold leading-none">•••</span>
                        </button>
                        {onDeleteCard && (
                          <button
                            onClick={() => onDeleteCard({ ...s, id: s.card_id || s.id, entity_code: s.staff_id })}
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

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-[#353535] flex items-center justify-between text-xs text-[#888]">
            <div>
              Showing page <span className="font-bold text-white">{pagination.page}</span> of{' '}
              <span className="font-bold text-white">{pagination.pages}</span> ({pagination.total} records)
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => onFilterChange('page', pagination.page - 1)}
                className="p-1.5 rounded-lg border border-[#353535] bg-[#222222] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => onFilterChange('page', pagination.page + 1)}
                className="p-1.5 rounded-lg border border-[#353535] bg-[#222222] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Staff Profile & Documents Detail Modal */}
      {selectedDetailStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#171717] rounded-3xl border border-[#353535] max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#353535] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDetailStaff.photo_url || '/logo.png'}
                  alt={selectedDetailStaff.full_name}
                  className="w-14 h-14 rounded-2xl object-cover border border-[#353535] shadow bg-black"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg">{selectedDetailStaff.full_name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedDetailStaff.card_status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedDetailStaff.card_status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-[#F5C542] mt-0.5">{selectedDetailStaff.staff_id} • {selectedDetailStaff.designation}</p>
                  <p className="text-[11px] text-[#888]">{selectedDetailStaff.department} • {selectedDetailStaff.work_location || 'Headquarters'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailStaff(null)}
                className="p-2 text-[#888] hover:text-white rounded-xl hover:bg-[#222222] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Mobile Number', value: selectedDetailStaff.mobile },
                { label: 'Email Address', value: selectedDetailStaff.email },
                { label: 'City', value: selectedDetailStaff.city || 'Not specified' },
                { label: 'Qualification', value: selectedDetailStaff.qualification || 'Not specified' },
                { label: 'Aadhar Number', value: selectedDetailStaff.aadhar_number || 'Not specified' },
                { label: 'Joining Date', value: formatDateIST(selectedDetailStaff.joining_date) },
                { label: 'Card Expiry', value: selectedDetailStaff.expiry_date ? formatDateIST(selectedDetailStaff.expiry_date) : '1 Year' },
                { label: 'Residential Address', value: selectedDetailStaff.residential_address || 'Not specified' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#222222] border border-[#353535] rounded-xl p-3">
                  <p className="text-[#888] text-[10px] uppercase font-bold tracking-wider mb-0.5">{label}</p>
                  <p className="text-white text-xs font-semibold break-words">{value}</p>
                </div>
              ))}
            </div>

            {/* Aadhar Documents Section */}
            <div className="bg-[#121212] border border-[#353535] rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-[#F5C542] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> Aadhar Card Documents
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Front */}
                <div className="bg-[#1c1c1c] border border-[#353535] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#F5C542]" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">Aadhar Front</p>
                      <p className="text-[#888] text-[10px]">
                        {selectedDetailStaff.aadhar_front ? (selectedDetailStaff.aadhar_front.endsWith('.pdf') ? 'PDF Document' : 'Image File') : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  {selectedDetailStaff.aadhar_front ? (
                    <a
                      href={selectedDetailStaff.aadhar_front}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#F5C542]/15 hover:bg-[#F5C542]/25 text-[#F5C542] border border-[#F5C542]/30 rounded-lg text-xs font-semibold transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[#666] text-xs">No file</span>
                  )}
                </div>

                {/* Back */}
                <div className="bg-[#1c1c1c] border border-[#353535] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#F5C542]" />
                    </div>
                    <div>
                      <p className="text-white text-xs font-bold">Aadhar Back</p>
                      <p className="text-[#888] text-[10px]">
                        {selectedDetailStaff.aadhar_back ? (selectedDetailStaff.aadhar_back.endsWith('.pdf') ? 'PDF Document' : 'Image File') : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  {selectedDetailStaff.aadhar_back ? (
                    <a
                      href={selectedDetailStaff.aadhar_back}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#F5C542]/15 hover:bg-[#F5C542]/25 text-[#F5C542] border border-[#F5C542]/30 rounded-lg text-xs font-semibold transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[#666] text-xs">No file</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const s = selectedDetailStaff;
                  setSelectedDetailStaff(null);
                  onPreviewCard(s);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#F5C542] text-black font-extrabold rounded-xl text-xs shadow-md shadow-[#F5C542]/20 hover:bg-[#FFD84D] transition cursor-pointer"
              >
                <Eye className="w-4 h-4" /> Preview ID Card
              </button>
              <button
                type="button"
                onClick={() => setSelectedDetailStaff(null)}
                className="px-4 py-2.5 bg-[#222222] hover:bg-[#2a2a2a] text-[#B5B5B5] hover:text-white border border-[#353535] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
