import React, { useState } from 'react';
import {
  X,
  Upload,
  User,
  Phone,
  Search,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building,
  CreditCard
} from 'lucide-react';
import { authFetch } from '../api';

export default function UserRegistrationModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const [formData, setFormData] = useState({
    full_name: '',
    photo_url: '',
    mobile: '',
    email: '',
    workden_user_id: '',
    registration_date: new Date().toISOString().split('T')[0],
    current_plan: '₹499 – Full Access',
    user_category: 'WorkDen Member',
    user_status: 'Active',
    validity_period: '1 Year',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    authorized_by: 'Membership Director',
    remarks: '',
    auto_approve: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const calculateExpiry = (issueDate, validity) => {
    if (!issueDate) return '';
    const d = new Date(issueDate);
    const years = validity.includes('2') ? 2 : validity.includes('3') ? 3 : 1;
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    setFormData((prev) => {
      const updated = { ...prev, [name]: val };
      if (name === 'issue_date' || name === 'validity_period') {
        updated.expiry_date = calculateExpiry(
          name === 'issue_date' ? val : prev.issue_date,
          name === 'validity_period' ? val : prev.validity_period
        );
      }
      return updated;
    });
  };

  // Search existing WorkDen users
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      setErrorMsg('');
      const res = await authFetch(`/api/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        setSearchResults(result.data);
      } else {
        setSearchResults([]);
        setErrorMsg('No existing member found with that search term. You can register as a new member.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setErrorMsg('Error searching users');
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-fill from selected search result
  const selectUser = (u) => {
    setFormData((prev) => ({
      ...prev,
      full_name: u.full_name || '',
      photo_url: u.photo_url || '',
      mobile: u.mobile || '',
      email: u.email || '',
      workden_user_id: u.workden_user_id || u.user_id_code || '',
      current_plan: u.current_plan || 'Dedicated Desk',
      user_category: u.user_category || 'Coworking Member',
      user_status: u.user_status || 'Active',
      registration_date: u.registration_date || prev.registration_date
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  // Upload Photo
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrorMsg('Photo must be under 5MB.'); return; }

    try {
      setIsUploading(true);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target.result;
          const res = await authFetch('/api/upload/base64', {
            method: 'POST',
            body: JSON.stringify({ base64, extension: file.name.split('.').pop() })
          });
          const result = await res.json();
          if (result.success) {
            setFormData((prev) => ({ ...prev, photo_url: result.fileUrl }));
          } else {
            setErrorMsg(result.error || 'Failed to upload image');
          }
        } catch (uploadErr) {
          setErrorMsg('Failed to upload image');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg('Failed to read image file');
      setIsUploading(false);
    }
  };

  const samplePhotos = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.full_name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!formData.mobile.trim()) {
      setErrorMsg('Mobile Number is required');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email Address is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const result = await res.json();

      if (result.success) {
        onSuccess(result.data);
        onClose();
      } else {
        setErrorMsg(result.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Error creating user ID:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C542] text-black font-extrabold flex items-center justify-center shadow-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                User ID Card Registration
              </h3>
              <p className="text-xs text-slate-400">
                Issue membership & verification ID for registered WorkDen users & clients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Search Existing Member */}
          <div className="bg-gradient-to-r from-[#1e1e1e] to-[#171717] p-4 rounded-2xl border border-[#353535] shadow-sm space-y-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Search className="w-4 h-4 text-[#F5C542]" />
              Search Existing WorkDen User Records
            </label>
            <p className="text-[11px] text-[#B5B5B5]">
              Type existing WorkDen User ID (e.g. WD-84920), mobile number, or name to auto-populate member details:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. WD-84920 or 98990 or Simran"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchUsers(); } }}
                className="flex-1 px-3 py-2 bg-white rounded-xl border border-[#353535] text-xs focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
              />
              <button
                type="button"
                onClick={handleSearchUsers}
                disabled={isSearching}
                className="px-4 py-2 bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Find User'}
              </button>
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-[#353535] shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="p-3 hover:bg-[#222222] cursor-pointer flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt={u.full_name}
                        className="w-8 h-8 rounded-full object-cover border"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{u.full_name}</div>
                        <div className="text-[10px] text-slate-500">{u.workden_user_id || u.user_id_code} • {u.mobile}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#F5C542] bg-[#F5C542]/10 border border-[#F5C542]/30 px-2 py-0.5 rounded-full">
                      Select User
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Fields */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#F5C542]" />
              <span>User / Member Identity Details</span>
            </div>

            {/* Photo */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center shadow-inner">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold text-xs font-semibold cursor-pointer shadow">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Member Photo'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploading} />
                  </label>
                  <span className="text-xs text-slate-500 font-medium">or pick sample:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {samplePhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`sample ${idx}`}
                      onClick={() => setFormData((prev) => ({ ...prev, photo_url: url }))}
                      className={`w-7 h-7 rounded-lg object-cover cursor-pointer border-2 transition ${
                        formData.photo_url === url ? 'border-[#F5C542] ring-2 ring-[#F5C542]' : 'border-slate-300 opacity-75'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Vikramaditya Roy"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Existing WorkDen User ID (Optional)
                </label>
                <input
                  type="text"
                  name="workden_user_id"
                  value={formData.workden_user_id}
                  onChange={handleInputChange}
                  placeholder="e.g. WD-84920"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="+91 98765 43210"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Active Membership Plan
                </label>
                <select
                  name="current_plan"
                  value={formData.current_plan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                >
                  <option value="₹249 – Basic Access">₹249 – Basic Access</option>
                  <option value="₹499 – Full Access">₹499 – Full Access</option>
                  <option value="₹699 – Priority Access">₹699 – Priority Access</option>
                  <option value="₹999 – Professional Access">₹999 – Professional Access</option>
                  <option value="₹1499 – Master Access">₹1499 – Master Access</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Member Category
                </label>
                <select
                  name="user_category"
                  value={formData.user_category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white text-slate-900"
                >
                  <option value="WorkDen Member">WorkDen Member</option>



                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registration Date
                </label>
                <input
                  type="date"
                  name="registration_date"
                  value={formData.registration_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  name="user_status"
                  value={formData.user_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* ID Validity & Configuration */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#F5C542]" />
              <span>Card Validity & Authorization</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Validity Period
                </label>
                <select
                  name="validity_period"
                  value={formData.validity_period}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="Permanent">Permanent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date || calculateExpiry(formData.issue_date, formData.validity_period)}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>
            </div>

            {/* Approval toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <label className="font-semibold text-slate-900 text-xs block">
                  Admin Approval Workflow
                </label>
                <p className="text-[11px] text-slate-500">
                  {formData.auto_approve
                    ? 'Card will be immediately APPROVED and verified active.'
                    : 'Card will enter "Pending Approvals" until reviewed by Admin.'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="auto_approve"
                  checked={formData.auto_approve}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold text-xs font-bold shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Issuing User ID...' : 'Generate & Issue User ID'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
