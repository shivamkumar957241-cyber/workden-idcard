import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, ShieldCheck, QrCode, ArrowRight,
  Sparkles, CheckCircle2, Lock, Download, ExternalLink, Shield
} from 'lucide-react';
import { WORKDEN_LOGO_BASE64 } from '../assets/logoBase64';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col selection:bg-[#F5C542] selection:text-black">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#121212]/90 backdrop-blur-md border-b border-[#2e2e2e] px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black border border-[#F5C542]/40 p-1.5 flex items-center justify-center shadow-lg shadow-[#F5C542]/10">
            <img src={WORKDEN_LOGO_BASE64} alt="WorkDen Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-black text-base tracking-wider text-white">WORKDEN</span>
            <span className="text-[#F5C542] text-[10px] font-bold tracking-widest ml-1.5 uppercase font-mono">PORTAL</span>
            <p className="text-[11px] text-[#777] hidden sm:block">Official Identity Card & Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-xs text-[#888] hover:text-[#F5C542] transition px-3 py-1.5 rounded-lg border border-[#353535] hover:border-[#F5C542]/50 cursor-pointer"
          >
            Admin Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1c1c] border border-[#F5C542]/40 text-[#F5C542] text-xs font-bold mb-6 shadow-xl">
          <Sparkles className="w-3.5 h-3.5" />
          <span>WorkDen Official Identity Portal</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-3xl leading-[1.15]">
          Official WorkDen <span className="text-[#F5C542]">Identity Cards</span>
        </h1>

        <p className="text-[#888] text-sm sm:text-base mt-4 max-w-xl leading-relaxed">
          Select your portal below to apply for your verified WorkDen ID card or sign in to download.
        </p>

        {/* Two Main Cards: Apply as Member vs Apply as Staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-12 text-left">
          {/* Card 1: Member Portal */}
          <div className="group relative bg-gradient-to-b from-[#181818] to-[#121212] border border-[#353535] hover:border-[#F5C542] rounded-3xl p-7 sm:p-8 transition-all hover:shadow-2xl hover:shadow-[#F5C542]/10 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-[#F5C542]" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-black text-white">WorkDen Member</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Free Application
                </span>
              </div>

              <p className="text-[#888] text-xs sm:text-sm mb-6 leading-relaxed">
                For registered WorkDen platform members and digital task contributors.
              </p>

              <div className="space-y-2.5 mb-8">
                {[
                  'Free Application Submission',
                  'Admin Review & Verification',
                  'Instant Digital ID Issuance',
                  'QR Verified Digital ID Card'
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-[#bbb] text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/member/register')}
                className="w-full py-3.5 bg-[#F5C542] hover:bg-[#e0b035] text-black font-black text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Apply as Member (Free)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/member/login')}
                className="w-full py-2.5 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white font-bold text-xs rounded-xl border border-[#353535] transition text-center cursor-pointer"
              >
                Member Sign In
              </button>
            </div>
          </div>

          {/* Card 2: Staff Portal */}
          <div className="group relative bg-gradient-to-b from-[#181818] to-[#121212] border border-[#353535] hover:border-emerald-500 rounded-3xl p-7 sm:p-8 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Briefcase className="w-7 h-7 text-emerald-400" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-black text-white">WorkDen Staff</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  100% Free Always
                </span>
              </div>

              <p className="text-[#888] text-xs sm:text-sm mb-6 leading-relaxed">
                For official WorkDen operations, QA verifiers, and management team.
              </p>

              <div className="space-y-2.5 mb-8">
                {[
                  'Free Staff ID Card Application',
                  'Document & Identity Verification',
                  'Instant Direct Download',
                  'Official Employee Credential'
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-[#bbb] text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/staff/register')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Apply as Staff (Free)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/staff/login')}
                className="w-full py-2.5 bg-[#222] hover:bg-[#2a2a2a] text-[#aaa] hover:text-white font-bold text-xs rounded-xl border border-[#353535] transition text-center cursor-pointer"
              >
                Staff Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl mt-16 text-left">
          {[
            { title: 'Free Application', desc: 'No fee to apply or submit documents', icon: Sparkles },
            { title: 'Verified Identity', desc: 'Authentic WorkDen digital credential', icon: ShieldCheck },
            { title: 'Cryptographic QR', desc: 'Tamper-proof live identity check', icon: QrCode },
            { title: 'Print Ready PDF', desc: 'High-res export with precise dimensions', icon: Download }
          ].map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="p-4 rounded-2xl bg-[#141414] border border-[#2e2e2e]">
                <Icon className="w-5 h-5 text-[#F5C542] mb-2" />
                <p className="text-white font-bold text-xs">{f.title}</p>
                <p className="text-[#777] text-[11px] mt-0.5">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#252525] bg-[#0E0E0E] px-4 sm:px-8 py-6 text-center text-xs text-[#777]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} WorkDen. All rights reserved. • MSME: UDYAM-KR-03-0640514 • GSTIN: 10KEJPM6504N1Z7</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/login')}
              className="text-[#888] hover:text-[#F5C542] transition cursor-pointer"
            >
              Admin Portal
            </button>
            <span>•</span>
            <span className="text-[#666]">support@workden.online</span>
            <span>•</span>
            <span className="text-[#666]">+91 92627 25686</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
