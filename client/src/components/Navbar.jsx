import React from 'react';
import {
  ShieldCheck,
  User,
  QrCode,
  Building,
  Bell
} from 'lucide-react';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function Navbar({
  currentRole,
  onSwitchRole,
  onSimulateSampleScan,
  activeStaffProfile,
  pendingCount = 0
}) {
  return (
    <header
      className="h-16 px-6 flex items-center justify-between gap-4 select-none shrink-0 border-b font-sans"
      style={{
        backgroundColor: '#0E0E0E',
        borderColor: '#353535',
        color: '#FFFFFF'
      }}
    >
      {/* Left Search / Context */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#F5C542]/40 flex items-center justify-center bg-[#171717] shrink-0">
          <img src={WORKDEN_LOGO_BASE64} alt="WorkDen" className="w-full h-full object-cover" />
        </div>
        <span className="text-xs font-black tracking-[0.15em] uppercase flex items-center gap-1.5" style={{ color: '#F5C542' }}>
          WORKDEN
        </span>
        <span className="hidden sm:inline-block text-[#353535]">|</span>
        <span className="hidden sm:inline-block text-xs font-semibold text-[#B5B5B5]">
          ID Card Management & QR Verification Portal
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Quick Google Lens Scanner Simulator */}
        <button
          onClick={onSimulateSampleScan}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-sm"
          style={{
            backgroundColor: 'rgba(245, 197, 66, 0.1)',
            borderColor: 'rgba(245, 197, 66, 0.3)',
            color: '#F5C542'
          }}
          title="Simulate scanning a real WorkDen ID with Google Lens"
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(245, 197, 66, 0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(245, 197, 66, 0.1)'; }}
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>Test QR Scanner</span>
        </button>

        {/* Role Switcher Pill */}
        <div
          className="flex items-center p-1 rounded-xl border text-xs"
          style={{
            backgroundColor: '#171717',
            borderColor: '#353535'
          }}
        >
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#737373]">Role:</span>
          <button
            onClick={() => onSwitchRole('ADMIN')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              currentRole === 'ADMIN'
                ? 'bg-[#F5C542] text-black shadow-sm font-black'
                : 'text-[#B5B5B5] hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onSwitchRole('STAFF')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              currentRole === 'STAFF'
                ? 'bg-[#F5C542] text-black shadow-sm font-black'
                : 'text-[#B5B5B5] hover:text-white'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => onSwitchRole('USER')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              currentRole === 'USER'
                ? 'bg-[#F5C542] text-black shadow-sm font-black'
                : 'text-[#B5B5B5] hover:text-white'
            }`}
          >
            Member
          </button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            className="p-2 text-[#B5B5B5] hover:text-white rounded-xl hover:bg-[#1A1A1A] transition cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F5C542] animate-pulse"></span>
            )}
          </button>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#353535]">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#F5C542]/50 bg-[#171717]">
            <img
              src={activeStaffProfile?.photo_url || WORKDEN_LOGO_BASE64}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-white leading-tight">
              {activeStaffProfile?.full_name || 'Admin User'}
            </p>
            <p className="text-[10px] text-[#F5C542] font-semibold">
              {currentRole === 'ADMIN' ? 'Super Admin' : activeStaffProfile?.designation || 'Staff'}
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}
