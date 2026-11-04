import React from 'react';
import {
  Users,
  CreditCard,
  UserPlus,
  Layers,
  Clock,
  QrCode,
  AlertOctagon,
  Ban,
  Settings,
  ShieldCheck,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Shield,
  FileText
} from 'lucide-react';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function Sidebar({
  activeSection,
  onSelectSection,
  counts = {},
  currentRole = 'ADMIN'
}) {
  const adminMenuItems = [
    {
      id: 'staff-cards',
      label: 'Staff ID Cards',
      icon: Users,
      badge: counts.total_staff,
      primary: true
    },
    {
      id: 'user-cards',
      label: 'User ID Cards',
      icon: CreditCard,
      badge: counts.total_users
    },
    {
      id: 'create-staff',
      label: 'Create New Staff ID',
      icon: UserPlus,
      action: true
    },
    {
      id: 'create-user',
      label: 'Create New User ID',
      icon: UserPlus,
      action: true
    },
    {
      id: 'all-issued',
      label: 'All Issued ID Cards',
      icon: Layers,
      badge: counts.total_issued
    },
    {
      id: 'pending-approvals',
      label: 'Pending ID Approvals',
      icon: Clock,
      badge: counts.pending,
      highlight: counts.pending > 0
    },
    {
      id: 'qr-management',
      label: 'QR Verification Mgmt',
      icon: QrCode
    },
    {
      id: 'expired-cards',
      label: 'Expired ID Cards',
      icon: AlertOctagon,
      badge: counts.expired
    },
    {
      id: 'suspended-revoked',
      label: 'Suspended / Revoked',
      icon: Ban,
      badge: counts.revoked
    },
    {
      id: 'design-settings',
      label: 'ID Card Design Settings',
      icon: Settings
    },
    {
      id: 'audit-logs',
      label: 'Security & Audit Logs',
      icon: Shield
    }
  ];

  return (
    <aside className="w-64 bg-[#0E0E0E] border-r border-[#353535] flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#353535]">
          <div className="w-9 h-9 rounded-xl bg-black border border-[#F5C542]/40 flex items-center justify-center p-1 shadow-md">
            <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-wide flex items-center gap-1.5">
              WORKDEN <span className="text-[#F5C542] text-[10px] font-mono border border-[#F5C542]/40 px-1 py-0.2 rounded">PORTAL</span>
            </h1>
            <p className="text-[10px] text-[#B5B5B5] font-mono tracking-wider">
              OFFICIAL SYSTEM
            </p>
          </div>
        </div>

        {/* User Self-Service: My ID Card */}
        <div className="px-3 pt-3 pb-1">
          <span className="px-3 text-[10px] font-bold text-[#888] uppercase tracking-widest block mb-1">
            Personal Credential
          </span>
          <button
            onClick={() => onSelectSection('my-id-card')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeSection === 'my-id-card'
                ? 'bg-[#F5C542] text-black font-extrabold shadow-lg shadow-[#F5C542]/20'
                : 'text-[#B5B5B5] hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${activeSection === 'my-id-card' ? 'text-black' : 'text-emerald-400'}`} />
              <span>My ID Card</span>
            </div>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
              activeSection === 'my-id-card' ? 'bg-black/20 text-black font-bold' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              Live
            </span>
          </button>
        </div>

        {/* ID Card Management Menu */}
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-[10px] font-bold text-[#F5C542] uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#F5C542]" />
              ID Management
            </span>
            <span className="text-[9px] bg-[#222222] border border-[#353535] text-[#F5C542] px-1.5 py-0.2 rounded font-mono font-bold">
              ADMIN
            </span>
          </div>

          <div className="space-y-1">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-[#F5C542] text-black font-extrabold shadow-lg shadow-[#F5C542]/20'
                      : 'text-[#B5B5B5] hover:bg-[#1a1a1a] hover:text-white'
                  } ${item.primary && !isActive ? 'bg-[#171717] text-white border border-[#353535]/60' : ''}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-black' : item.highlight ? 'text-amber-400' : 'text-[#888]'
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-1 shrink-0 ${
                        item.highlight
                          ? 'bg-amber-500 text-black animate-pulse'
                          : isActive
                          ? 'bg-black/20 text-black'
                          : 'bg-[#222222] text-[#B5B5B5] border border-[#353535]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#353535] text-[11px] text-[#888] space-y-1.5 bg-[#0a0a0a]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Server Verification API
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">ONLINE</span>
        </div>
        <p className="text-[10px] text-[#666]">
          WorkDen RFID & CR80 Print System v2.6
        </p>
      </div>
    </aside>
  );
}
