import React, { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { User, Phone, MessageSquare, Briefcase, ShieldAlert, Key, Save, Upload, Shield } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    whatsapp_number: user?.whatsapp_number || '',
    department: user?.department || '',
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error('All fields are required');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient('/api/auth/change-password/', {
        method: 'POST',
        body: {
          old_password: passwordData.old_password,
          new_password: passwordData.new_password,
        },
      });
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      toast.success('Password updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password. Double check your old password.');
    } finally {
      setIsChangingPassword(false);
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
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500">Manage your account details, photo, and security password.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Summary & Avatar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col items-center text-center space-y-4 h-fit">
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold text-3xl transition-transform hover:scale-105 duration-200">
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
            <h2 className="text-lg font-bold text-gray-900">{user?.full_name || 'User Profile'}</h2>
            <p className="text-sm text-gray-500 font-mono">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-primary border border-indigo-100 capitalize">
                {user?.role}
              </span>
              {user?.department && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                  {user.department}
                </span>
              )}
            </div>
          </div>

          <div className="w-full border-t border-gray-100 pt-4 text-left space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <Briefcase size={16} className="text-gray-400 mr-2 shrink-0" />
              <span className="truncate">Department: <strong className="text-gray-900">{user?.department || '—'}</strong></span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Shield size={16} className="text-gray-400 mr-2 shrink-0" />
              <span>Custom Permissions: <strong className="text-gray-900">{user?.custom_permissions?.length || 0} active</strong></span>
            </div>
          </div>
          
          {user?.custom_permissions && user.custom_permissions.length > 0 && (
            <div className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Overridden Module Access</span>
              <div className="flex flex-wrap gap-1">
                {user.custom_permissions.map((perm) => (
                  <span key={perm} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-3xs font-mono font-bold text-indigo-700 capitalize">
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <User size={18} className="text-indigo-500" />
              General Details
            </h3>
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email Address (Read Only)</label>
                  <input 
                    type="email" 
                    readOnly 
                    value={user?.email || ''} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg cursor-not-allowed text-gray-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <Phone size={12} /> Contact Phone
                  </label>
                  <input 
                    type="text" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <MessageSquare size={12} /> WhatsApp Number
                  </label>
                  <input 
                    type="text" 
                    value={formData.whatsapp_number} 
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} 
                    placeholder="919876543210"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Department</label>
                  <input 
                    type="text" 
                    value={formData.department} 
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Base Role (Elevate via Admin)</label>
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.role || ''} 
                    className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded-lg cursor-not-allowed text-gray-500 capitalize" 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-3 mb-4 flex items-center gap-2">
              <Key size={18} className="text-amber-500" />
              Security Password
            </h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Current Password</label>
                <input 
                  type="password" 
                  required 
                  value={passwordData.old_password} 
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })} 
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">New Password</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordData.new_password} 
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Confirm New Password</label>
                  <input 
                    type="password" 
                    required 
                    value={passwordData.confirm_password} 
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })} 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none" 
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Key size={16} />
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
