import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CreditCard
} from 'lucide-react';
import { authFetch } from '../api';

const PRICING_PLANS = [
  { price: '₹249', name: 'Basic Access', heading: '₹249 – Basic Access' },
  { price: '₹499', name: 'Full Access', heading: '₹499 – Full Access' },
  { price: '₹699', name: 'Priority Access', heading: '₹699 – Priority Access' },
  { price: '₹999', name: 'Professional Access', heading: '₹999 – Professional Access' },
  { price: '₹1499', name: 'Master Access', heading: '₹1499 – Master Access' },
];

export default function UserRegistrationModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    user_category: 'WorkDen Member',
    current_plan: '₹499 – Full Access',
    residential_address: '',
    photo_url: '',
    auto_approve: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Photo must be under 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMsg('');
      const uploadData = new FormData();
      uploadData.append('photo', file);

      const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: uploadData
      });

      const json = await res.json();
      if (json.success && json.photo_url) {
        setFormData((prev) => ({ ...prev, photo_url: json.photo_url }));
      } else {
        setErrorMsg(json.error || 'Failed to upload photo');
      }
    } catch (err) {
      setErrorMsg('Error uploading photo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.full_name.trim()) return setErrorMsg('Full Name is required.');
    if (!formData.mobile.trim()) return setErrorMsg('Mobile Number is required.');
    if (!formData.email.trim()) return setErrorMsg('Email Address is required.');
    if (!formData.current_plan) return setErrorMsg('Please select a Membership Plan.');

    try {
      setIsSubmitting(true);
      const res = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        onSuccess(json.message || 'Member ID Card created successfully!');
        onClose();
      } else {
        setErrorMsg(json.error || 'Failed to register member');
      }
    } catch (err) {
      setErrorMsg('Server error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121212] rounded-3xl shadow-2xl border border-[#353535] max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#353535] bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center text-[#F5C542]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">Create New User / Member ID</h3>
              <p className="text-xs text-[#888]">Issue an official identity credential for a registered member</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[#888] hover:text-white rounded-xl hover:bg-[#222222] transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 bg-[#0B0B0B]">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Photo & Basic Details */}
          <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl border-2 border-[#F5C542]/40 bg-[#222222] overflow-hidden flex items-center justify-center shadow-lg">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-[#666]" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <p className="text-white text-xs font-bold uppercase tracking-wider">Member Photograph</p>
                <p className="text-[11px] text-[#888]">Upload clear front-facing portrait (JPG, PNG max 5MB)</p>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] border border-[#353535] text-white hover:text-[#F5C542] text-xs font-semibold transition cursor-pointer"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#F5C542]" />}
                  <span>{isUploading ? 'Uploading...' : formData.photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-[#2a2a2a]">
              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Full Name <span className="text-[#F5C542]">*</span></label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Vikramaditya Roy"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] transition"
                />
              </div>

              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Mobile Number <span className="text-[#F5C542]">*</span></label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Email Address <span className="text-[#F5C542]">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="member@example.com"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] transition"
                />
              </div>
            </div>
          </div>

          {/* Membership Plan Selection */}
          <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-2">
              <div>
                <label className="text-white font-bold text-xs uppercase tracking-wider text-[#F5C542]">Active Membership Plan</label>
                <p className="text-[11px] text-[#888]">Choose the official tier assigned to this member</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F5C542]/10 border border-[#F5C542]/30 text-[#F5C542] text-[10px] font-bold">
                WorkDen Member
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PRICING_PLANS.map(plan => {
                const isSelected = formData.current_plan === plan.heading || formData.current_plan === plan.name;
                return (
                  <button
                    key={plan.price}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, current_plan: plan.heading }))}
                    className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                      isSelected
                        ? 'border-[#F5C542] bg-[#F5C542]/15 text-white shadow-md shadow-[#F5C542]/15 ring-1 ring-[#F5C542]'
                        : 'border-[#353535] bg-[#222222] text-[#888] hover:border-[#666] hover:text-white'
                    }`}
                  >
                    <div className="font-extrabold text-sm text-[#F5C542]">{plan.price}</div>
                    <div className="text-[10px] font-medium truncate mt-0.5">{plan.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Residential Address (Optional) */}
            <div className="pt-2">
              <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Residential Address (Optional)</label>
              <input
                type="text"
                name="residential_address"
                value={formData.residential_address}
                onChange={handleInputChange}
                placeholder="City, State, PIN code"
                className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#353535] bg-[#171717] hover:bg-[#222222] text-[#B5B5B5] hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold text-xs shadow-lg shadow-[#F5C542]/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSubmitting ? 'Creating ID...' : 'Generate & Activate Member ID'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
