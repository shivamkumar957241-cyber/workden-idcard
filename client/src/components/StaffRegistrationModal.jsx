import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  User,
  Phone,
  Briefcase,
  Calendar,
  Building2,
  Plus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin,
  Mail,
  FileText,
  File
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
    full_name: '',
    mobile: '',
    email: '',
    department: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    work_location: 'Headquarters - Noida',
    residential_address: '',
    city: '',
    qualification: '',
    aadhar_number: '',
    aadhar_front: '',
    aadhar_back: '',
    photo_url: '',
    auto_approve: true
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAadharFront, setIsUploadingAadharFront] = useState(false);
  const [isUploadingAadharBack, setIsUploadingAadharBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDesig, setShowAddDesig] = useState(false);
  const [newDesigName, setNewDesigName] = useState('');
  const fileInputRef = useRef(null);
  const aadharFrontRef = useRef(null);
  const aadharBackRef = useRef(null);

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

  const handleAadharUpload = async (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Aadhar document must be under 10MB.');
      return;
    }

    const isFront = side === 'front';
    try {
      if (isFront) setIsUploadingAadharFront(true);
      else setIsUploadingAadharBack(true);
      setErrorMsg('');

      const uploadData = new FormData();
      uploadData.append('file', file);

      const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: uploadData
      });

      const json = await res.json();
      if (json.success && json.fileUrl) {
        setFormData(prev => ({
          ...prev,
          [isFront ? 'aadhar_front' : 'aadhar_back']: json.fileUrl
        }));
      } else {
        setErrorMsg(json.error || 'Failed to upload Aadhar document');
      }
    } catch (err) {
      setErrorMsg('Error uploading Aadhar: ' + err.message);
    } finally {
      if (isFront) setIsUploadingAadharFront(false);
      else setIsUploadingAadharBack(false);
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim() || !onAddNewDepartment) return;
    const ok = await onAddNewDepartment(newDeptName.trim(), newDeptName.trim().substring(0, 3).toUpperCase());
    if (ok) {
      setFormData(prev => ({ ...prev, department: newDeptName.trim() }));
      setNewDeptName('');
      setShowAddDept(false);
    }
  };

  const handleCreateDesig = async () => {
    if (!newDesigName.trim() || !onAddNewDesignation) return;
    const ok = await onAddNewDesignation(newDesigName.trim(), formData.department);
    if (ok) {
      setFormData(prev => ({ ...prev, designation: newDesigName.trim() }));
      setNewDesigName('');
      setShowAddDesig(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.full_name.trim()) return setErrorMsg('Full Name is required.');
    if (!formData.mobile.trim()) return setErrorMsg('Mobile Number is required.');
    if (!formData.email.trim()) return setErrorMsg('Email Address is required.');
    if (!formData.department) return setErrorMsg('Please select a Department.');
    if (!formData.designation) return setErrorMsg('Please select a Designation.');

    try {
      setIsSubmitting(true);
      const res = await authFetch('/api/staff', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.success) {
        onSuccess(json.message || 'Staff ID Card created successfully!');
        onClose();
      } else {
        setErrorMsg(json.error || 'Failed to register staff');
      }
    } catch (err) {
      setErrorMsg('Server error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDesignations = designations.filter(
    (d) => !formData.department || !d.department_name || d.department_name === formData.department
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121212] rounded-3xl shadow-2xl border border-[#353535] max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#353535] bg-[#171717]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C542]/10 border border-[#F5C542]/30 flex items-center justify-center text-[#F5C542]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">Create New Staff ID</h3>
              <p className="text-xs text-[#888]">Issue an official corporate employee ID card</p>
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

          {/* Photo & Basic Info */}
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
                <p className="text-white text-xs font-bold uppercase tracking-wider">Employee Photograph</p>
                <p className="text-[11px] text-[#888]">Upload clear front-facing official portrait (JPG, PNG max 5MB)</p>
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
                  placeholder="e.g. Aman Singh"
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
                  placeholder="aman@workden.online"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542] transition"
                />
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-[#171717] p-5 rounded-2xl border border-[#353535] space-y-4">
            <h4 className="text-white font-bold text-xs flex items-center gap-2 border-b border-[#2a2a2a] pb-2 uppercase tracking-wider text-[#F5C542]">
              <Building2 className="w-4 h-4" /> Department & Designation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Department */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#B5B5B5] text-xs font-semibold">Department <span className="text-[#F5C542]">*</span></label>
                  {onAddNewDepartment && (
                    <button type="button" onClick={() => setShowAddDept(!showAddDept)} className="text-[10px] text-[#F5C542] hover:underline flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  )}
                </div>
                {showAddDept ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="New Department"
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                      className="flex-1 bg-[#222222] border border-[#F5C542] rounded-xl px-3 py-2 text-white text-xs"
                    />
                    <button type="button" onClick={handleCreateDept} className="px-3 py-2 bg-[#F5C542] text-black font-bold text-xs rounded-xl">Save</button>
                    <button type="button" onClick={() => setShowAddDept(false)} className="px-2 text-[#888] text-xs">✕</button>
                  </div>
                ) : (
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#F5C542] cursor-pointer"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Designation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#B5B5B5] text-xs font-semibold">Designation <span className="text-[#F5C542]">*</span></label>
                  {onAddNewDesignation && (
                    <button type="button" onClick={() => setShowAddDesig(!showAddDesig)} className="text-[10px] text-[#F5C542] hover:underline flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Add New
                    </button>
                  )}
                </div>
                {showAddDesig ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="New Designation"
                      value={newDesigName}
                      onChange={e => setNewDesigName(e.target.value)}
                      className="flex-1 bg-[#222222] border border-[#F5C542] rounded-xl px-3 py-2 text-white text-xs"
                    />
                    <button type="button" onClick={handleCreateDesig} className="px-3 py-2 bg-[#F5C542] text-black font-bold text-xs rounded-xl">Save</button>
                    <button type="button" onClick={() => setShowAddDesig(false)} className="px-2 text-[#888] text-xs">✕</button>
                  </div>
                ) : (
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#F5C542] cursor-pointer"
                  >
                    <option value="">-- Select Designation --</option>
                    {filteredDesignations.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Joining Date */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Joining Date</label>
                <input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#F5C542]"
                />
              </div>

              {/* Work Location */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Work Location</label>
                <input
                  type="text"
                  name="work_location"
                  value={formData.work_location}
                  onChange={handleInputChange}
                  placeholder="e.g. Noida Sector 62, Bangalore"
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">City <span className="text-[#F5C542]">*</span></label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Noida, Delhi, Lucknow"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
                />
              </div>

              {/* Qualification */}
              <div>
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Qualification <span className="text-[#F5C542]">*</span></label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  placeholder="e.g. Graduate / B.Tech / MBA / Diploma"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs focus:outline-none focus:border-[#F5C542]"
                />
              </div>

              {/* Enter Aadhar Number */}
              <div className="sm:col-span-2">
                <label className="block text-[#B5B5B5] text-xs font-semibold mb-1">Enter Aadhar Number <span className="text-[#F5C542]">*</span></label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.aadhar_number}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
                    setFormData(p => ({ ...p, aadhar_number: formatted }));
                  }}
                  placeholder="12-digit Aadhar (e.g. 1234 5678 9012)"
                  required
                  className="w-full bg-[#222222] border border-[#353535] rounded-xl px-3.5 py-2.5 text-white placeholder-[#666] text-xs font-mono focus:outline-none focus:border-[#F5C542]"
                />
              </div>

              {/* Upload Aadhar Card (Front & Back) */}
              <div className="sm:col-span-2 pt-3 border-t border-[#2a2a2a]">
                <label className="block text-[#B5B5B5] text-xs font-bold mb-1 uppercase tracking-wider text-[#F5C542]">
                  Upload Aadhar Card (Front & Back Side)
                </label>
                <p className="text-[#888] text-[11px] mb-3">Upload clear photo or PDF document of both sides of Aadhar card (JPG, PNG or PDF)</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Front Side */}
                  <div className="bg-[#222222] border border-[#353535] rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <input
                      ref={aadharFrontRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => handleAadharUpload(e, 'front')}
                    />
                    <FileText className="w-5 h-5 text-[#F5C542] mb-1.5" />
                    <p className="text-white text-xs font-bold">Aadhar Card Front</p>
                    <p className="text-[#888] text-[10px] mb-2">JPG, PNG or PDF</p>
                    {formData.aadhar_front ? (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-xs font-semibold">✓ Uploaded</span>
                        <a href={formData.aadhar_front} target="_blank" rel="noreferrer" className="text-xs text-[#888] hover:text-white underline">View</a>
                        <button type="button" onClick={() => aadharFrontRef.current?.click()} className="text-xs text-[#F5C542] hover:underline">Change</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aadharFrontRef.current?.click()}
                        disabled={isUploadingAadharFront}
                        className="py-1.5 px-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#353535] text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {isUploadingAadharFront ? 'Uploading...' : 'Upload Front'}
                      </button>
                    )}
                  </div>

                  {/* Back Side */}
                  <div className="bg-[#222222] border border-[#353535] rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <input
                      ref={aadharBackRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={e => handleAadharUpload(e, 'back')}
                    />
                    <FileText className="w-5 h-5 text-[#F5C542] mb-1.5" />
                    <p className="text-white text-xs font-bold">Aadhar Card Back</p>
                    <p className="text-[#888] text-[10px] mb-2">JPG, PNG or PDF</p>
                    {formData.aadhar_back ? (
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-xs font-semibold">✓ Uploaded</span>
                        <a href={formData.aadhar_back} target="_blank" rel="noreferrer" className="text-xs text-[#888] hover:text-white underline">View</a>
                        <button type="button" onClick={() => aadharBackRef.current?.click()} className="text-xs text-[#F5C542] hover:underline">Change</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aadharBackRef.current?.click()}
                        disabled={isUploadingAadharBack}
                        className="py-1.5 px-3 bg-[#171717] hover:bg-[#2a2a2a] border border-[#353535] text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        {isUploadingAadharBack ? 'Uploading...' : 'Upload Back'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Residential Address (Optional) */}
              <div className="sm:col-span-2">
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
              <span>{isSubmitting ? 'Creating ID...' : 'Generate & Activate Staff ID'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
