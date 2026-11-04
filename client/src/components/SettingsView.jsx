import React, { useState } from 'react';
import {
  Building2,
  Palette,
  Shield,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SettingsView({
  settings,
  departments,
  designations,
  onUpdateSettings,
  onAddDepartment,
  onDeleteDepartment,
  onAddDesignation,
  onDeleteDesignation
}) {
  const [formData, setFormData] = useState({
    company_name: settings?.company_name || 'WORKDEN',
    company_tagline: settings?.company_tagline || 'OFFICIAL IDENTITY CARD',
    company_website: settings?.company_website || 'https://workden.online',
    official_email: settings?.official_email || 'contact@workden.online',
    office_address: settings?.office_address || 'WorkDen Tower, Plot 14, Sector 62, Noida, UP 201301',
    authorized_signatory: settings?.authorized_signatory || 'Director of Operations',
    signature_image: settings?.signature_image || '/signature.png',
    primary_color: settings?.primary_color || '#0B0B0B',
    secondary_color: settings?.secondary_color || '#171717',
    accent_color: settings?.accent_color || '#F5C542',
    card_usage_rules: settings?.card_usage_rules || '1. This credential is official property of WorkDen.\n2. Must be presented upon request to security personnel.\n3. Non-transferable and must be surrendered upon cessation.\n4. Misuse or tampering is strictly prohibited.',
    lost_card_instructions: settings?.lost_card_instructions || 'If found, please immediately return to WorkDen Security or email contact@workden.online / Call +91 98765 43210'
  });

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDesigName, setNewDesigName] = useState('');
  const [newDesigDept, setNewDesigDept] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const ok = await onUpdateSettings(formData);
      if (ok) {
        setStatusMsg({ type: 'success', text: 'Design & organization settings saved successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to update settings.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    const ok = await onAddDepartment(newDeptName.trim(), newDeptCode.trim());
    if (ok) {
      setNewDeptName('');
      setNewDeptCode('');
    }
  };

  const handleCreateDesig = async (e) => {
    e.preventDefault();
    if (!newDesigName.trim()) return;
    const ok = await onAddDesignation(newDesigName.trim(), newDesigDept);
    if (ok) {
      setNewDesigName('');
      setNewDesigDept('');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          ID Card Design & Organization Settings
        </h2>
        <p className="text-xs text-[#888] mt-0.5">
          Configure branding, official addresses, color palette, authorized signatories, and custom taxonomy.
        </p>
      </div>

      {statusMsg.text && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          statusMsg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Section 1: Branding & Organization */}
        <div className="bg-[#171717] p-6 rounded-2xl border border-[#353535] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#353535] pb-3">
            <Building2 className="w-4 h-4 text-[#F5C542]" />
            <span>Organization & Physical Credential Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="WORKDEN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Card Header Tagline
              </label>
              <input
                type="text"
                name="company_tagline"
                value={formData.company_tagline}
                onChange={handleChange}
                placeholder="OFFICIAL IDENTITY CARD"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Official Website
              </label>
              <input
                type="url"
                name="company_website"
                value={formData.company_website}
                onChange={handleChange}
                placeholder="https://workden.online"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Official Support Email
              </label>
              <input
                type="email"
                name="official_email"
                value={formData.official_email}
                onChange={handleChange}
                placeholder="contact@workden.online"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Official Office Address (Rendered on ID Card Back)
              </label>
              <input
                type="text"
                name="office_address"
                value={formData.office_address}
                onChange={handleChange}
                placeholder="WorkDen Tower, Plot 14, Sector 62, Noida, UP 201301"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Colors & Theme */}
        <div className="bg-[#171717] p-6 rounded-2xl border border-[#353535] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#353535] pb-3">
            <Palette className="w-4 h-4 text-[#F5C542]" />
            <span>CR80 Card Visual Palette & Branding</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Primary Color (Matte Black)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="w-10 h-10 rounded-xl border border-[#353535] bg-[#222222] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="primary_color"
                  value={formData.primary_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white font-mono text-xs uppercase focus:outline-none focus:border-[#F5C542]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Secondary Gradient (Charcoal)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="secondary_color"
                  value={formData.secondary_color}
                  onChange={handleChange}
                  className="w-10 h-10 rounded-xl border border-[#353535] bg-[#222222] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="secondary_color"
                  value={formData.secondary_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white font-mono text-xs uppercase focus:outline-none focus:border-[#F5C542]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Accent Highlight (Golden Yellow)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="accent_color"
                  value={formData.accent_color}
                  onChange={handleChange}
                  className="w-10 h-10 rounded-xl border border-[#353535] bg-[#222222] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  name="accent_color"
                  value={formData.accent_color}
                  onChange={handleChange}
                  className="flex-1 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white font-mono text-xs uppercase focus:outline-none focus:border-[#F5C542]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Legal Disclaimers & Signatory */}
        <div className="bg-[#171717] p-6 rounded-2xl border border-[#353535] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#353535] pb-3">
            <Shield className="w-4 h-4 text-[#F5C542]" />
            <span>Signatory & Reverse Side Disclaimers</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Authorized Signatory Title
              </label>
              <input
                type="text"
                name="authorized_signatory"
                value={formData.authorized_signatory}
                onChange={handleChange}
                placeholder="Director of Operations"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Signature Image Path / URL
              </label>
              <input
                type="text"
                name="signature_image"
                value={formData.signature_image}
                onChange={handleChange}
                placeholder="/signature.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] focus:ring-1 focus:ring-[#F5C542] text-xs transition-all font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Lost Card Instructions
              </label>
              <textarea
                name="lost_card_instructions"
                value={formData.lost_card_instructions}
                onChange={handleChange}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] text-xs transition-all resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#B5B5B5] mb-1.5 uppercase tracking-wider text-[11px]">
                Card Usage Rules (Bullet points)
              </label>
              <textarea
                name="card_usage_rules"
                value={formData.card_usage_rules}
                onChange={handleChange}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] focus:outline-none focus:border-[#F5C542] text-xs transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black text-xs font-black shadow-lg shadow-[#F5C542]/20 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            <Save className="w-4 h-4 text-black" />
            <span>{saving ? 'Saving...' : 'Save Design & Organization Settings'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Custom Departments & Designations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Departments Manager */}
        <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3">
            <h3 className="font-bold text-sm text-white">Custom Departments ({departments.length})</h3>
          </div>

          <form onSubmit={handleCreateDept} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Department Name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
            />
            <input
              type="text"
              placeholder="Code (IT)"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              className="w-24 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs uppercase focus:outline-none focus:border-[#F5C542]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#F5C542] hover:bg-[#FFD84D] text-black rounded-xl font-bold cursor-pointer transition-all"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {departments.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#222222] border border-[#353535] text-xs hover:border-[#555] transition-all"
              >
                <div>
                  <span className="font-semibold text-white">{d.name}</span>
                  {d.code && <span className="ml-2 font-mono text-[10px] text-[#F5C542] bg-[#F5C542]/10 px-1.5 py-0.5 rounded border border-[#F5C542]/30">[{d.code}]</span>}
                </div>
                <button
                  onClick={() => onDeleteDepartment(d.id)}
                  className="text-[#888] hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  title="Delete Department"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Designations Manager */}
        <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#353535] pb-3">
            <h3 className="font-bold text-sm text-white">Custom Designations ({designations.length})</h3>
          </div>

          <form onSubmit={handleCreateDesig} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Designation Title"
              value={newDesigName}
              onChange={(e) => setNewDesigName(e.target.value)}
              required
              className="flex-1 px-3 py-2 rounded-xl border border-[#353535] bg-[#222222] text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#F5C542] hover:bg-[#FFD84D] text-black rounded-xl font-bold cursor-pointer transition-all"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {designations.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#222222] border border-[#353535] text-xs hover:border-[#555] transition-all"
              >
                <div>
                  <span className="font-semibold text-white">{d.name}</span>
                  {d.department_name && <span className="ml-2 text-[10px] text-[#888]">({d.department_name})</span>}
                </div>
                <button
                  onClick={() => onDeleteDesignation(d.id)}
                  className="text-[#888] hover:text-rose-400 p-1 cursor-pointer transition-colors"
                  title="Delete Designation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
