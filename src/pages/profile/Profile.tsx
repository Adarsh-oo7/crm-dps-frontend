import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { User, Phone, MessageSquare, Briefcase, Key, Save, Upload, Shield, ShieldCheck, Mail, Loader2, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile General Details
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    whatsapp_number: user?.whatsapp_number || '',
    department: user?.department || '',
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Password OTP Reset states
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name) {
      toast.error('Full Name is required');
      return;
    }

    setIsSavingProfile(true);
    try {
      const sendData = new FormData();
      sendData.append('full_name', formData.full_name);
      sendData.append('phone', formData.phone);
      sendData.append('whatsapp_number', formData.whatsapp_number);
      if (selectedFile) {
        sendData.append('avatar', selectedFile);
      }

      const updatedUser = await apiClient('/api/auth/me/', {
        method: 'PATCH',
        body: sendData,
      });

      updateProfile(updatedUser);
      setSelectedFile(null);
      toast.success('Profile details updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile details');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // OTP password reset triggers
  const handleRequestOtp = async () => {
    setIsRequestingOtp(true);
    try {
      await apiClient('/api/auth/profile/request-otp/', { method: 'POST' });
      setOtpSent(true);
      toast.success('Verification code sent to your registered email!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code. Please check SMTP settings.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleOtpPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsResettingPassword(true);
    try {
      await apiClient('/api/auth/profile/change-password-otp/', {
        method: 'POST',
        body: {
          otp,
          new_password: newPassword,
        },
      });
      toast.success('Password updated successfully!');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password. Check your verification code.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Build full avatar URL
  const base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const getAvatarUrl = () => {
    if (avatarPreview) return avatarPreview;
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) return user.avatar;
      return `${base_url}${user.avatar}`;
    }
    return '';
  };

  const initials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Toaster position="top-right" />
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-sm text-text-sub">Manage your account details, photo, and security password.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Summary & Avatar */}
        <div className="bg-bg-card border border-border-card rounded-2xl shadow-lg p-6 flex flex-col items-center text-center space-y-4 h-fit">
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10 flex items-center justify-center bg-primary-light text-primary font-bold text-3xl transition-transform hover:scale-105 duration-200">
              {getAvatarUrl() ? (
                <img src={getAvatarUrl()} alt="User Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-xs font-semibold">
              <Upload size={18} className="mr-1" /> Change
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          <div>
            <h2 className="text-lg font-bold text-white">{user?.full_name || 'User Profile'}</h2>
            <p className="text-sm text-text-sub font-mono">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/10 capitalize">
                {user?.role}
              </span>
              {user?.department && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-main text-text-sub border border-border-card">
                  {user.department}
                </span>
              )}
            </div>
          </div>

          <div className="w-full border-t border-border-card/40 pt-4 text-left space-y-3">
            <div className="flex items-center text-sm text-text-sub">
              <Briefcase size={16} className="text-text-sub/70 mr-2 shrink-0" />
              <span className="truncate">Department: <strong className="text-white">{user?.department || '—'}</strong></span>
            </div>
            <div className="flex items-center text-sm text-text-sub">
              <Shield size={16} className="text-text-sub/70 mr-2 shrink-0" />
              <span>Custom Permissions: <strong className="text-white">{user?.custom_permissions?.length || 0} active</strong></span>
            </div>
          </div>
          
          {user?.custom_permissions && user.custom_permissions.length > 0 && (
            <div className="w-full text-left bg-bg-main border border-border-card rounded-lg p-3">
              <span className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider block mb-1">Overridden Module Access</span>
              <div className="flex flex-wrap gap-1">
                {user.custom_permissions.map((perm) => (
                  <span key={perm} className="px-1.5 py-0.5 bg-bg-card border border-border-card rounded text-3xs font-mono font-bold text-primary capitalize">
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Edit details & Security */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Form */}
          <div className="bg-bg-card border border-border-card rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-white text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              General Details
            </h3>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Email Address (Read Only)</label>
                  <input 
                    type="email" 
                    readOnly 
                    value={user?.email || ''} 
                    className="w-full px-3 py-2 text-sm border border-border-card bg-bg-main rounded-lg cursor-not-allowed text-text-sub" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub flex items-center gap-1">
                    <Phone size={12} /> Contact Phone
                  </label>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub flex items-center gap-1">
                    <MessageSquare size={12} /> WhatsApp Number
                  </label>
                  <input 
                    type="text" 
                    value={formData.whatsapp_number} 
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} 
                    placeholder="919876543210"
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Department</label>
                  <input 
                    type="text" 
                    value={formData.department} 
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Base Role (Elevate via Admin)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.role || ''} 
                    className="w-full px-3 py-2 text-sm border border-border-card bg-bg-main rounded-lg cursor-not-allowed text-text-sub capitalize" 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card with OTP */}
          <div className="bg-bg-card border border-border-card rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-white text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <Key size={18} className="text-amber-500" />
              Reset Profile Password
            </h3>
            
            {!otpSent ? (
              <div className="space-y-4">
                <div className="p-4 bg-warning/10 border border-amber-200 rounded-2xl text-sm text-amber-800 space-y-2">
                  <p className="font-semibold">Need to change your profile password?</p>
                  <p className="text-xs text-warning">
                    To secure your account, click the button below to generate a 6-digit access token delivered directly to your registered email <strong className="font-mono text-white">{user?.email}</strong>.
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg transition-colors disabled:opacity-50"
                  >
                    {isRequestingOtp ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Requesting Verification Code...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Password OTP Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOtpPasswordSubmit} className="space-y-4">
                <div className="p-4 bg-primary-light border border-primary/10 rounded-2xl text-sm text-indigo-800 flex items-start gap-3">
                  <ShieldCheck className="text-primary shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="font-semibold">Access Verification Code Sent</p>
                    <p className="text-xs text-primary">
                      Enter the 6-digit verification code sent to your email along with your new password to verify identity and update password.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    placeholder="000000"
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                    className="w-full px-3 py-2 text-center text-lg font-bold tracking-widest border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">New Password</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Confirm New Password</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••••"
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-xs text-text-sub hover:text-white flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-lg transition-colors disabled:opacity-50"
                  >
                    {isResettingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
