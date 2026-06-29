import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Settings, Shield, Bell, Key, Save } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'integrations'>('profile');

  const [companyForm, setCompanyForm] = useState({
    name: 'Digital Product Solutions (DPS)',
    email: 'contact@digitalprod.com',
    phone: '+1 (555) 019-2834',
    website: 'https://digitalprod.com',
    gstin: '27AAAAA1111A1Z1',
    address: '101 Innovation Way, Tech District, Suite 500'
  });

  const [notifyPrefs, setNotifyPrefs] = useState({
    task_assigned: { email: true, push: true, whatsapp: false },
    followup_reminder: { email: true, push: true, whatsapp: true },
    invoice_paid: { email: true, push: true, whatsapp: false }
  });

  const [integrationsForm, setIntegrationsForm] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: 'dpsops@gmail.com',
    whatsapp_url: 'http://localhost:3000',
    fcm_key: 'AAAA-mock-fcm-server-key-dps-agency-os'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved successfully!');
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-sm text-text-sub">Configure agency profiles, user notifications, and integrations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-4 space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2
              ${activeTab === 'profile' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Settings size={16} />
            Company Profile
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2
              ${activeTab === 'notifications' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Bell size={16} />
            Notification Preferences
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2
              ${activeTab === 'integrations' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Key size={16} />
            SMTP & Integrations
          </button>
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-3 bg-bg-card border border-border-card shadow-lg rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg border-b pb-2">Company Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Company Name *</label>
                    <input type="text" required value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Corporate Email *</label>
                    <input type="email" required value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Corporate Phone</label>
                    <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">GSTIN / TAX Identification</label>
                    <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({...companyForm, gstin: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg font-mono uppercase" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Registered Office Address</label>
                  <textarea rows={3} value={companyForm.address} onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="font-bold text-white text-lg border-b pb-2">User Notifications Channels</h3>
                <div className="space-y-4">
                  {Object.entries(notifyPrefs).map(([event, channels]) => (
                    <div key={event} className="flex flex-col sm:flex-row justify-between border-b pb-3 items-start sm:items-center">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-white capitalize">{event.replace('_', ' ')}</span>
                        <p className="text-xs text-text-sub/70">Trigger alerts when this action happens.</p>
                      </div>
                      <div className="flex space-x-4 mt-2 sm:mt-0">
                        {Object.entries(channels).map(([channel, enabled]) => (
                          <label key={channel} className="flex items-center space-x-1.5 text-xs font-semibold text-text-sub">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => {
                                const newPrefs = { ...notifyPrefs };
                                (newPrefs as any)[event][channel] = e.target.checked;
                                setNotifyPrefs(newPrefs);
                              }}
                              className="rounded text-primary h-4 w-4"
                            />
                            <span className="capitalize">{channel}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg border-b pb-2">SMTP & Integrations Config</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">SMTP Host</label>
                    <input type="text" value={integrationsForm.smtp_host} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_host: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">SMTP Port</label>
                    <input type="text" value={integrationsForm.smtp_port} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_port: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">SMTP User / Gmail SMTP account</label>
                  <input type="email" value={integrationsForm.smtp_user} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_user: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">OpenWA WhatsApp Endpoint URL</label>
                  <input type="url" value={integrationsForm.whatsapp_url} onChange={(e) => setIntegrationsForm({...integrationsForm, whatsapp_url: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg font-mono text-xs" />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-border-card/40">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-all"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
