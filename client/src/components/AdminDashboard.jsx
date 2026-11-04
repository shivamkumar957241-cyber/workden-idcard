import React, { useState, useEffect } from 'react';
import {
  Users, CreditCard, Clock, Ban, AlertOctagon, ShieldCheck,
  Layers, Settings, FileText, QrCode, LogOut, Shield,
  TrendingUp, CheckCircle2, Menu, X, Bell
} from 'lucide-react';
import { authFetch } from '../api';
import StaffTable from './StaffTable';
import UserTable from './UserTable';
import UnifiedCardsTable from './UnifiedCardsTable';
import StaffRegistrationModal from './StaffRegistrationModal';
import UserRegistrationModal from './UserRegistrationModal';
import IdCardPreviewModal from './IdCardPreviewModal';
import StatusActionModal from './StatusActionModal';
import SettingsView from './SettingsView';
import QRManagementView from './QRManagementView';
import AuditLogsView from './AuditLogsView';
import ApplicationsView from './ApplicationsView';
import UserAccountsView from './UserAccountsView';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp, group: null },
  { id: 'staff-cards', label: 'Staff ID Cards', icon: Users, group: 'ID Management' },
  { id: 'user-cards', label: 'User ID Cards', icon: CreditCard, group: 'ID Management' },
  { id: 'all-issued', label: 'All Issued Cards', icon: Layers, group: 'ID Management' },
  { id: 'pending-approvals', label: 'Pending ID Approvals', icon: Clock, group: 'Approvals', badge: 'pending' },
  { id: 'user-accounts', label: 'Registered Accounts', icon: Shield, group: 'User Accounts' },
  { id: 'qr-management', label: 'QR Verification', icon: QrCode, group: 'Security' },
  { id: 'expired-cards', label: 'Expired Cards', icon: AlertOctagon, group: 'Security' },
  { id: 'suspended-revoked', label: 'Revoked / Suspended', icon: Ban, group: 'Security' },
  { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, group: 'Security' },
  { id: 'design-settings', label: 'ID Card Settings', icon: Settings, group: 'Config' },
];

export default function AdminDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [staffList, setStaffList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [unifiedCards, setUnifiedCards] = useState([]);
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [counts, setCounts] = useState({ total_staff: 0, total_users: 0, total_issued: 0, pending: 0, expired: 0, revoked: 0, active: 0 });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [staffFilters, setStaffFilters] = useState({ search: '', department: 'ALL', designation: 'ALL', status: 'ALL', page: 1, limit: 25 });
  const [staffPagination, setStaffPagination] = useState({});
  const [userFilters, setUserFilters] = useState({ search: '', plan: 'ALL', status: 'ALL', page: 1, limit: 25 });
  const [userPagination, setUserPagination] = useState({});

  const [isStaffRegOpen, setIsStaffRegOpen] = useState(false);
  const [isUserRegOpen, setIsUserRegOpen] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [statusModalConfig, setStatusModalConfig] = useState({ isOpen: false, card: null, actionType: 'STATUS', targetStatus: 'ACTIVE' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = async () => {
    try {
      const res = await authFetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data.settings);
        setDepartments(json.data.departments || []);
        setDesignations(json.data.designations || []);
      }
    } catch (err) { console.error(err); }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(staffFilters);
      const res = await authFetch(`/api/staff?${params}`);
      const json = await res.json();
      if (json.success) {
        setStaffList(json.data || []);
        setStaffPagination(json.pagination || {});
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams(userFilters);
      const res = await authFetch(`/api/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUserList(json.data || []);
        setUserPagination(json.pagination || {});
      }
    } catch (err) { console.error(err); }
  };

  const fetchAllCards = async () => {
    try {
      const [cardsRes, appsRes] = await Promise.all([
        authFetch('/api/cards/all'),
        authFetch('/api/applications?status=PENDING').catch(() => null)
      ]);
      const json = await cardsRes.json();
      let pendingAppsCount = 0;
      if (appsRes && appsRes.ok) {
        const appsJson = await appsRes.json();
        if (appsJson.success) {
          pendingAppsCount = (appsJson.data || []).length;
        }
      }
      if (json.success) {
        const all = json.data || [];
        setUnifiedCards(all);
        const pendingCardsCount = all.filter(c => c.status === 'PENDING').length;
        setCounts({
          total_staff: all.filter(c => c.profile_type === 'STAFF').length,
          total_users: all.filter(c => c.profile_type === 'USER').length,
          total_issued: all.length,
          pending: pendingAppsCount + pendingCardsCount,
          expired: all.filter(c => c.status === 'EXPIRED').length,
          revoked: all.filter(c => c.status === 'SUSPENDED' || c.status === 'REVOKED').length,
          active: all.filter(c => c.status === 'ACTIVE').length,
        });
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSettings(); fetchAllCards(); }, []);
  useEffect(() => { fetchStaff(); }, [staffFilters]);
  useEffect(() => { fetchUsers(); }, [userFilters]);

  const handleApprove = async (profileId, type = 'STAFF') => {
    const endpoint = type === 'STAFF' ? `/api/staff/${profileId}/approve` : `/api/users/${profileId}/approve`;
    const res = await authFetch(endpoint, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(json.message);
      fetchStaff(); fetchUsers(); fetchAllCards();
      if (previewCard) setPreviewCard(null);
    } else {
      showToast(json.error || 'Approval failed', 'error');
    }
  };

  const handleUpdateSettings = async (data) => {
    const res = await authFetch('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
    const json = await res.json();
    if (json.success) { setSettings(data); showToast('Settings updated!'); return true; }
    return false;
  };

  const handleAddDepartment = async (name, code) => {
    const res = await authFetch('/api/settings/departments', { method: 'POST', body: JSON.stringify({ name, code }) });
    const json = await res.json();
    if (json.success) { fetchSettings(); showToast(`Department "${name}" created!`); return true; }
    showToast(json.error || 'Failed', 'error'); return false;
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Delete this department?')) return;
    const res = await authFetch(`/api/settings/departments/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { fetchSettings(); showToast('Department removed.'); }
  };

  const handleAddDesignation = async (name, dept) => {
    const res = await authFetch('/api/settings/designations', { method: 'POST', body: JSON.stringify({ name, department_name: dept }) });
    const json = await res.json();
    if (json.success) { fetchSettings(); showToast(`Designation "${name}" created!`); return true; }
    showToast(json.error || 'Failed', 'error'); return false;
  };

  const handleDeleteDesignation = async (id) => {
    if (!confirm('Delete this designation?')) return;
    const res = await authFetch(`/api/settings/designations/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { fetchSettings(); showToast('Designation removed.'); }
  };

  const handleDeleteCard = async (card) => {
    const cardId = card.card_id || card.id;
    const name = card.full_name || card.entity_code || card.staff_id || card.user_id_code || 'this record';
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete the record for "${name}"?\n\nThis will completely purge this person, ID card, QR verification token, and application from all database tables.`)) {
      return;
    }

    try {
      let endpoint = `/api/cards/${cardId}`;
      if (card.staff_id || card.profile_type === 'STAFF') {
        endpoint = `/api/staff/${card.id || card.profile_id || cardId}`;
      } else if (card.user_id_code || card.profile_type === 'USER') {
        endpoint = `/api/users/${card.id || card.profile_id || cardId}`;
      }

      const res = await authFetch(endpoint, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Record permanently deleted.');
        fetchAllCards();
        fetchStaff();
        fetchUsers();
        fetchCounts();
      } else {
        showToast(json.error || 'Failed to delete record', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting record', 'error');
    }
  };

  const navGroups = [...new Set(NAV_SECTIONS.map(s => s.group))];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection counts={counts} onNavigate={setActiveSection} />;
      case 'staff-cards':
        return <StaffTable staffList={staffList} departments={departments} designations={designations}
          loading={loading} pagination={staffPagination} filters={staffFilters}
          onFilterChange={(k, v) => setStaffFilters(p => ({ ...p, [k]: v, page: 1 }))}
          onOpenRegister={() => setIsStaffRegOpen(true)}
          onPreviewCard={c => setPreviewCard({ ...c, profile_type: 'STAFF', entity_code: c.staff_id, mobile: c.mobile, phone: c.mobile })}
          onApproveCard={id => handleApprove(id, 'STAFF')}
          onOpenStatusModal={c => setStatusModalConfig({ isOpen: true, card: c, actionType: 'STATUS', targetStatus: 'SUSPENDED' })}
          onExportCsv={() => window.open('/api/cards/export')}
          onDeleteCard={handleDeleteCard} />;
      case 'user-cards':
        return <UserTable userList={userList} loading={loading} pagination={userPagination} filters={userFilters}
          onFilterChange={(k, v) => setUserFilters(p => ({ ...p, [k]: v, page: 1 }))}
          onOpenRegister={() => setIsUserRegOpen(true)}
          onPreviewCard={c => setPreviewCard({ ...c, profile_type: 'USER', entity_code: c.user_id_code, mobile: c.mobile, phone: c.mobile })}
          onApproveCard={id => handleApprove(id, 'USER')}
          onOpenStatusModal={c => setStatusModalConfig({ isOpen: true, card: c, actionType: 'STATUS', targetStatus: 'SUSPENDED' })}
          onExportCsv={() => window.open('/api/cards/export')}
          onDeleteCard={handleDeleteCard} />;
      case 'all-issued':
        return <UnifiedCardsTable title="All Issued ID Cards" subtitle="Complete directory of all identity cards" icon={Layers}
          cards={unifiedCards} onPreviewCard={c => setPreviewCard({ ...c, mobile: c.mobile, phone: c.mobile })}
          onApproveCard={(id, t) => handleApprove(id, t)}
          onOpenStatusModal={c => setStatusModalConfig({ isOpen: true, card: c, actionType: 'STATUS', targetStatus: 'SUSPENDED' })}
          onExportCsv={() => window.open('/api/cards/export')}
          onDeleteCard={handleDeleteCard} />;
      case 'applications':
      case 'pending-approvals':
        return <ApplicationsView initialStatus="PENDING" onApprovalSuccess={() => { fetchAllCards(); fetchStaff(); fetchUsers(); fetchCounts(); showToast('Application processed successfully!'); }} />;
      case 'user-accounts':
        return <UserAccountsView onPreviewCard={c => setPreviewCard(c)} />;
      case 'qr-management':
        return <QRManagementView />;
      case 'expired-cards':
        return <UnifiedCardsTable title="Expired ID Cards" subtitle="Cards past their validity date" icon={AlertOctagon}
          cards={unifiedCards.filter(c => c.status === 'EXPIRED')}
          onPreviewCard={c => setPreviewCard(c)}
          onApproveCard={(id, t) => handleApprove(id, t)}
          onOpenStatusModal={c => setStatusModalConfig({ isOpen: true, card: c, actionType: 'RENEW', targetStatus: 'ACTIVE' })}
          onExportCsv={() => window.open('/api/cards/export')}
          onDeleteCard={handleDeleteCard} />;
      case 'suspended-revoked':
        return <UnifiedCardsTable title="Revoked / Suspended Cards" subtitle="Cards that are disabled or permanently revoked" icon={Ban}
          cards={unifiedCards.filter(c => c.status === 'SUSPENDED' || c.status === 'REVOKED')}
          onPreviewCard={c => setPreviewCard(c)}
          onApproveCard={(id, t) => handleApprove(id, t)}
          onOpenStatusModal={c => setStatusModalConfig({ isOpen: true, card: c, actionType: 'STATUS', targetStatus: 'ACTIVE' })}
          onExportCsv={() => window.open('/api/cards/export')}
          onDeleteCard={handleDeleteCard} />;
      case 'design-settings':
        return <SettingsView settings={settings} departments={departments} designations={designations}
          onUpdateSettings={handleUpdateSettings} onAddDepartment={handleAddDepartment}
          onDeleteDepartment={handleDeleteDepartment} onAddDesignation={handleAddDesignation}
          onDeleteDesignation={handleDeleteDesignation} />;
      case 'audit-logs': return <AuditLogsView />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B0B0B] overflow-hidden text-white">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#0E0E0E] border-r border-[#353535] flex flex-col transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-[#353535]">
          <div className="w-9 h-9 rounded-xl bg-black border border-[#F5C542]/40 flex items-center justify-center p-1 shadow-md">
            <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight tracking-wider flex items-center gap-1.5">
              WORKDEN <span className="text-[#F5C542] text-[9px] font-mono border border-[#F5C542]/40 px-1 py-0.2 rounded">ADMIN</span>
            </p>
            <p className="text-[#888] text-[10px] font-mono">Control Centre</p>
          </div>
          <button className="ml-auto lg:hidden text-[#888] hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map(group => {
            const items = NAV_SECTIONS.filter(s => s.group === group);
            return (
              <div key={group} className="mb-4">
                {group && <p className="text-[#666] text-[10px] font-bold uppercase tracking-widest px-3 mb-2">{group}</p>}
                {items.map(({ id, label, icon: Icon, badge }) => {
                  const badgeCount = badge === 'pending' ? counts.pending : 0;
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setActiveSection(id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all mb-1 group ${
                        isActive
                          ? 'bg-[#F5C542] text-black font-extrabold shadow-lg shadow-[#F5C542]/20'
                          : 'text-[#B5B5B5] hover:text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-black' : 'text-[#888] group-hover:text-white'}`} />
                      <span className="flex-1 truncate font-medium">{label}</span>
                      {badgeCount > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                          isActive ? 'bg-black text-[#F5C542]' : 'bg-amber-500 text-black animate-pulse'
                        }`}>
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-[#353535]">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#171717] rounded-xl border border-[#353535]">
            <div className="w-7 h-7 rounded-lg bg-[#222222] border border-[#F5C542]/40 flex items-center justify-center text-[#F5C542] text-xs font-bold flex-shrink-0">
              {user.full_name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.full_name}</p>
              <p className="text-[#888] text-[10px] truncate">{user.email}</p>
            </div>
            <button onClick={onLogout} title="Sign Out" className="text-[#888] hover:text-[#F5C542] transition-colors p-1">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-6 py-3.5 border-b border-[#353535] bg-[#121212] flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[#888] hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-white font-bold text-sm tracking-wide">
              {NAV_SECTIONS.find(s => s.id === activeSection)?.label || 'Dashboard'}
            </h2>
          </div>
          {counts.pending > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold">{counts.pending} pending review</span>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0B0B0B]">
          {renderSection()}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-white text-sm font-medium shadow-2xl border transition-all
          ${toast.type === 'success' ? 'bg-slate-900 border-emerald-500/30' : 'bg-slate-900 border-red-500/30'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <X className="w-4 h-4 text-red-400" />}
          {toast.message}
        </div>
      )}

      {/* Modals */}
      <StaffRegistrationModal isOpen={isStaffRegOpen} onClose={() => setIsStaffRegOpen(false)}
        departments={departments} designations={designations}
        onAddNewDepartment={handleAddDepartment} onAddNewDesignation={handleAddDesignation}
        onSuccess={result => { showToast(`Staff ID ${result.staffId} issued!`); fetchStaff(); fetchAllCards(); }} />

      <UserRegistrationModal isOpen={isUserRegOpen} onClose={() => setIsUserRegOpen(false)}
        onSuccess={result => { showToast(`User ID ${result.userIdCode} issued!`); fetchUsers(); fetchAllCards(); }} />

      <IdCardPreviewModal card={previewCard} settings={settings} isOpen={Boolean(previewCard)}
        onClose={() => setPreviewCard(null)}
        onStatusChange={(card, targetStatus) => setStatusModalConfig({ isOpen: true, card, actionType: 'STATUS', targetStatus })}
        onRenew={card => setStatusModalConfig({ isOpen: true, card, actionType: 'RENEW', targetStatus: 'ACTIVE' })}
        onReplace={card => setStatusModalConfig({ isOpen: true, card, actionType: 'REPLACE', targetStatus: 'ACTIVE' })} />

      <StatusActionModal isOpen={statusModalConfig.isOpen} card={statusModalConfig.card}
        actionType={statusModalConfig.actionType} targetStatus={statusModalConfig.targetStatus}
        onClose={() => setStatusModalConfig({ isOpen: false, card: null })}
        onSuccess={res => { showToast(res.message); fetchStaff(); fetchUsers(); fetchAllCards(); if (previewCard) setPreviewCard(null); }} />
    </div>
  );
}

// Overview Section Component
function OverviewSection({ counts, onNavigate }) {
  const stats = [
    { label: 'Active Cards', value: counts.active, color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', icon: CheckCircle2, section: 'all-issued' },
    { label: 'Staff IDs', value: counts.total_staff, color: 'bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/30', icon: Users, section: 'staff-cards' },
    { label: 'User IDs', value: counts.total_users, color: 'bg-[#FFD84D]/20 text-[#FFD84D] border border-[#FFD84D]/30', icon: CreditCard, section: 'user-cards' },
    { label: 'Pending Review', value: counts.pending, color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30', icon: Clock, section: 'pending-approvals' },
    { label: 'Expired', value: counts.expired, color: 'bg-stone-500/20 text-stone-300 border border-stone-500/30', icon: AlertOctagon, section: 'expired-cards' },
    { label: 'Revoked', value: counts.revoked, color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: Ban, section: 'suspended-revoked' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-xl font-bold mb-1">ID Card Management</h2>
        <p className="text-[#888] text-sm">WorkDen Professional Identity System — Admin Control Centre</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ label, value, color, icon: Icon, section }) => (
          <button
            key={label}
            onClick={() => onNavigate(section)}
            className="bg-[#171717] border border-[#353535] hover:border-[#F5C542] rounded-2xl p-4 text-left transition-all hover:bg-[#1c1c1c] group cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3 shadow-md group-hover:scale-105 transition-transform`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-white font-extrabold text-2xl">{value}</p>
            <p className="text-[#888] text-xs mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#171717] border border-[#353535] rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'New Staff ID', section: 'staff-cards', color: 'text-white bg-[#222222] border-[#353535] hover:border-[#F5C542] hover:text-[#F5C542]' },
              { label: 'New User ID', section: 'user-cards', color: 'text-white bg-[#222222] border-[#353535] hover:border-[#F5C542] hover:text-[#F5C542]' },
              { label: 'View Applications', section: 'applications', color: 'text-[#F5C542] bg-[#F5C542]/10 border-[#F5C542]/30 hover:bg-[#F5C542]/20' },
              { label: 'QR Management', section: 'qr-management', color: 'text-white bg-[#222222] border-[#353535] hover:border-[#F5C542] hover:text-[#F5C542]' },
            ].map(({ label, section, color }) => (
              <button key={label} onClick={() => onNavigate(section)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${color}`}>
                {label} →
              </button>
            ))}
          </div>
        </div>
        <div className="bg-[#171717] border border-[#353535] rounded-2xl p-5">
          <h3 className="text-white font-bold text-sm mb-3">System Status</h3>
          <div className="space-y-2">
            {[
              { label: 'ID Card System', status: 'Operational', color: 'bg-emerald-400' },
              { label: 'QR Verification', status: 'Active', color: 'bg-emerald-400' },
              { label: 'Auto-Expiry Check', status: 'Running (hourly)', color: 'bg-[#F5C542]' },
              { label: 'Audit Logging', status: 'Enabled', color: 'bg-emerald-400' },
            ].map(({ label, status, color }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#2a2a2a] last:border-0">
                <span className="text-[#888] text-xs">{label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                  <span className="text-white text-xs font-medium">{status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
