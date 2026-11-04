import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Trash2,
  Shield,
  Briefcase,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard
} from 'lucide-react';
import { authFetch } from '../api';
import { formatIST } from '../utils/date';

export default function UserAccountsView({ onPreviewCard }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/auth/accounts');
      const json = await res.json();
      if (json.success) {
        setAccounts(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDeleteAccount = async (acc) => {
    if (acc.role === 'ADMIN') {
      alert('Admin accounts cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to PERMANENTLY delete the account for "${acc.full_name}" (${acc.email})?\n\nThis will permanently delete their login account, applications, and any linked ID cards from all database tables.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/auth/accounts/${acc.user_id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert(json.message || 'Account permanently deleted.');
        fetchAccounts();
      } else {
        alert(json.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting account: ' + err.message);
    }
  };

  const filtered = accounts.filter(acc => {
    if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (acc.full_name && acc.full_name.toLowerCase().includes(term)) ||
      (acc.email && acc.email.toLowerCase().includes(term)) ||
      (acc.entity_code && acc.entity_code.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#F5C542]" />
            <span>Registered User Accounts</span>
            <span className="text-xs bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/30 font-bold px-2.5 py-0.5 rounded-full">
              {filtered.length} Users
            </span>
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            Manage all registered portal logins, linked identity credentials, and account access
          </p>
        </div>

        <button
          onClick={fetchAccounts}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#353535] bg-[#171717] hover:border-[#F5C542] text-[#B5B5B5] hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#171717] p-4 rounded-2xl border border-[#353535] shadow-xl flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#888] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or ID number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] transition"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#353535] text-xs bg-[#222222] text-white font-medium focus:outline-none focus:border-[#F5C542] cursor-pointer"
          >
            <option value="ALL">All Account Roles</option>
            <option value="STAFF">Staff Accounts</option>
            <option value="USER">Member / User Accounts</option>
            <option value="ADMIN">Admin Accounts</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-[#171717] rounded-2xl border border-[#353535] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#B5B5B5]">
            <thead className="bg-[#121212] text-[#888] font-bold uppercase text-[10px] tracking-wider border-b border-[#353535]">
              <tr>
                <th className="py-3.5 px-4">Account Holder</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Linked ID Credential</th>
                <th className="py-3.5 px-4">Application Status</th>
                <th className="py-3.5 px-4">Registered Date (IST)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#888]">
                    Loading user accounts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#888]">
                    <AlertCircle className="w-8 h-8 text-[#666] mx-auto mb-2" />
                    <p className="font-semibold text-white">No registered accounts found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => {
                  const isAdmin = acc.role === 'ADMIN';
                  const isStaff = acc.role === 'STAFF';

                  return (
                    <tr key={acc.user_id} className="hover:bg-[#222222]/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#222222] border border-[#353535] flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {acc.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{acc.full_name}</span>
                              {isAdmin && (
                                <span className="text-[9px] bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/40 font-mono px-1.5 py-0.2 rounded font-bold">
                                  MASTER
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#888] font-mono">{acc.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          isAdmin
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : isStaff
                            ? 'bg-[#F5C542]/15 text-[#F5C542] border border-[#F5C542]/30'
                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {acc.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {acc.entity_code ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#F5C542]">{acc.entity_code}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              acc.card_status === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {acc.card_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#666] italic">No Card Issued</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {acc.application_status ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            acc.application_status === 'APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : acc.application_status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              acc.application_status === 'APPROVED' ? 'bg-emerald-400' :
                              acc.application_status === 'PENDING' ? 'bg-amber-400' : 'bg-rose-400'
                            }`} />
                            {acc.application_status}
                          </span>
                        ) : (
                          <span className="text-[#666] text-[10px]">Direct Registration</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#888] font-mono text-[11px]">
                        {acc.created_at ? formatIST(acc.created_at) : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isAdmin && (
                          <button
                            onClick={() => handleDeleteAccount(acc)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Permanently Delete Account & All Data"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
