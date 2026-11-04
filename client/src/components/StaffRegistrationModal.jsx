import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Building2,
  Plus,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { authFetch } from '../api';

export default function StaffRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  departments = [],
  designations = [],
  onAddNewDepartment,
  onAddNewDesignation
}) {
  const [formData, setFormData] = useState({
    // Section 1: Personal
    full_name: '',
    father_name: '',
    dob: '',
    gender: 'Male',
    photo_url: '',
    // Section 2: Contact
    mobile: '',
    email: '',
    residential_address: '',
    // Section 3: Employment
    designation: '',
    department: '',
    joining_date: new Date().toISOString().split('T')[0],
    employment_type: 'Full-time',
    reporting_manager: '',
    reporting_manager_id: '',
    work_location: '',
    employment_status: 'Active',
    // Section 4: ID Configuration
    validity_period: '1 Year',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    authorized_by: 'Director - People & Operations',
    remarks: '',
    auto_approve: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDesig, setShowAddDesig] = useState(false);
  const [newDesigName, setNewDesigName] = useState('');

  if (!isOpen) return null;

  // Auto calculate expiry date when validity or issue date changes
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

  // Photo upload handler
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
      // Read as base64 and upload
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
        } catch (err) {
          setErrorMsg('Upload failed. Please try again.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setErrorMsg('Failed to upload image');
      setIsUploading(false);
    }
  };

  // Sample avatar selector for quick testing
  const samplePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    if (!formData.full_name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!formData.photo_url) {
      setErrorMsg('Profile Photograph is required. Upload an image or select a sample photo.');
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
    if (!formData.designation.trim()) {
      setErrorMsg('Designation is required');
      return;
    }
    if (!formData.department.trim()) {
      setErrorMsg('Department is required');
      return;
    }
    if (!formData.joining_date) {
      setErrorMsg('Joining Date is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authFetch('/api/staff', {
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
      console.error('Error registering staff:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    const ok = await onAddNewDepartment(newDeptName.trim());
    if (ok) {
      setFormData((prev) => ({ ...prev, department: newDeptName.trim() }));
      setNewDeptName('');
      setShowAddDept(false);
    }
  };

  const handleCreateDesig = async () => {
    if (!newDesigName.trim()) return;
    const ok = await onAddNewDesignation(newDesigName.trim(), formData.department);
    if (ok) {
      setFormData((prev) => ({ ...prev, designation: newDesigName.trim() }));
      setNewDesigName('');
      setShowAddDesig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C542] flex items-center justify-center shadow-lg">
              <Briefcase className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Staff ID Registration Form
              </h3>
              <p className="text-xs text-slate-400">
                Register employee details & generate official WorkDen Staff ID card
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: PERSONAL INFORMATION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-[#F5C542]" />
              <span>1. Personal Information</span>
            </div>

            {/* Photo Upload & Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center shadow-inner">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                {formData.photo_url && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, photo_url: '' }))}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full shadow hover:bg-rose-700 cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5C542] hover:bg-[#FFD84D] text-black font-extrabold text-xs font-semibold cursor-pointer shadow">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Photograph *'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <span className="text-xs text-slate-500 font-medium">or pick a sample:</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {samplePhotos.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`sample ${idx}`}
                      onClick={() => setFormData((prev) => ({ ...prev, photo_url: url }))}
                      className={`w-7 h-7 rounded-lg object-cover cursor-pointer border-2 transition ${
                        formData.photo_url === url ? 'border-[#F5C542] ring-2 ring-[#F5C542]' : 'border-slate-300 opacity-75 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">
                  CR80 Printable ID standard requires clear front-facing portrait photograph.
                </p>
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
                  placeholder="e.g. Aarav Sharma"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Father's Name
                </label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: CONTACT INFORMATION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <Phone className="w-4 h-4 text-[#F5C542]" />
              <span>2. Contact Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                  Official Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="name@workden.online"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <textarea
                  name="residential_address"
                  value={formData.residential_address}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Street, City, State, PIN code"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] text-xs"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: EMPLOYMENT INFORMATION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-[#F5C542]" />
              <span>3. Employment Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Department */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Department <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDept(!showAddDept)}
                    className="text-[11px] text-[#F5C542] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Custom
                  </button>
                </div>
                {showAddDept ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Department"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-[#F5C542] text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateDept}
                      className="px-2.5 py-1.5 bg-[#F5C542] text-black font-extrabold rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Designation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Designation <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDesig(!showAddDesig)}
                    className="text-[11px] text-[#F5C542] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Custom
                  </button>
                </div>
                {showAddDesig ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Designation"
                      value={newDesigName}
                      onChange={(e) => setNewDesigName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-[#F5C542] text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateDesig}
                      className="px-2.5 py-1.5 bg-[#F5C542] text-black font-extrabold rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                  >
                    <option value="">-- Select Designation --</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Joining Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employment Type
                </label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Remote">Remote</option>
                  <option value="Intern">Intern</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reporting Manager Name
                </label>
                <input
                  type="text"
                  name="reporting_manager"
                  value={formData.reporting_manager}
                  onChange={handleInputChange}
                  placeholder="e.g. Vikramaditya Roy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reporting Manager's Staff ID
                </label>
                <input
                  type="text"
                  name="reporting_manager_id"
                  value={formData.reporting_manager_id}
                  onChange={handleInputChange}
                  placeholder="e.g. WD-EMP-2024-00001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Work Location
                </label>
                <input
                  type="text"
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleInputChange}
                  placeholder="e.g. Noida Sector 62, Delhi, Remote, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employment Status
                </label>
                <select
                  name="employment_status"
                  value={formData.employment_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Probation">Probation</option>
                  <option value="Notice Period">Notice Period</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: ID CONFIGURATION */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              <ShieldCheck className="w-4 h-4 text-[#F5C542]" />
              <span>4. ID Configuration & Issuance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Validity
                </label>
                <select
                  name="validity_period"
                  value={formData.validity_period}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542] bg-white"
                >
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3 Years">3 Years</option>
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
                  Calculated Expiry Date
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authorized By
                </label>
                <input
                  type="text"
                  name="authorized_by"
                  value={formData.authorized_by}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#F5C542] focus:border-[#F5C542]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ID Card Remarks / Internal Notes
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="e.g. Standard New Hire Issue"
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

          {/* Form Actions */}
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
              <span>{isSubmitting ? 'Generating Staff ID...' : 'Generate & Issue Staff ID'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
