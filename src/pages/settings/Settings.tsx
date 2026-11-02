import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { 
  Settings, Bell, Key, Save, Mail, Power, AlertTriangle, 
  CheckCircle2, ShieldAlert, Clock, RefreshCw, Send, Check
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface AutomationStatus {
  email_automation_enabled: boolean;
  note: string;
  updated_at: string;
  updated_by: string | null;
  can_toggle: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'automation' | 'notifications' | 'integrations'>('automation');
  const [reasonInput, setReasonInput] = useState('');

  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'manager';

  // Fetch live global email automation status
  const { data: automationStatus, isLoading: loadingStatus } = useQuery<AutomationStatus>({
    queryKey: ['automation-status'],
    queryFn: () => apiClient('/api/notifications/automation-status/')
  });

  // Toggle automation mutation
  const toggleMutation = useMutation({
    mutationFn: (vars: { enabled?: boolean; reason?: string }) =>
      apiClient('/api/notifications/toggle-automation/', { method: 'POST', body: vars }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['automation-status'] });
      toast.success(data.detail || 'Email automation status updated successfully!');
      setReasonInput('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update email automation status.');
    }
  });

  const handleToggleAutomation = (targetState: boolean) => {
    if (!isAdmin) {
      toast.error('Only administrators can turn email automation on or off.');
      return;
    }
    toggleMutation.mutate({
      enabled: targetState,
      reason: reasonInput || (targetState ? '' : 'Turned off by Administrator')
    });
  };

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
    smtp_user: 'digitalproductkerala@gmail.com',
    whatsapp_url: 'http://localhost:3000',
    fcm_key: 'AAAA-mock-fcm-server-key-dps-agency-os'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Configuration saved successfully!');
  };

  const isEmailOff = automationStatus && !automationStatus.email_automation_enabled;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-sm text-text-sub">Configure agency profiles, user notifications, and automated email dispatches.</p>
        </div>
        {automationStatus && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isEmailOff 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isEmailOff ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              {isEmailOff ? 'Automated Emails: OFF' : 'Automated Emails: ACTIVE'}
            </span>
          </div>
        )}
      </div>

      {/* Persistent Note Banner when Email Automation is OFF */}
      {isEmailOff && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-rose-200 shadow-lg">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-rose-300">NOTE: Email Automation is Currently TURNED OFF</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-rose-500/30 text-rose-200">
                  Suspended
                </span>
              </div>
              <p className="text-xs sm:text-sm text-rose-200/90 mt-1">
                All automated reminder emails (morning punch-in, tasks, follow-ups), EOD reports, and digests are paused by the admin. 
                {automationStatus?.note ? ` Reason: "${automationStatus.note}"` : ''}
              </p>
              {automationStatus?.updated_by && (
                <p className="text-[11px] text-rose-300/70 mt-1 flex items-center gap-1">
                  <Clock size={12} /> Changed by {automationStatus.updated_by} on {new Date(automationStatus.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => handleToggleAutomation(true)}
              disabled={toggleMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Power size={16} />
              Turn Back ON
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-4 space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('automation')}
            className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-between gap-2
              ${activeTab === 'automation' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <div className="flex items-center gap-2.5">
              <Mail size={16} />
              <span>Email Automation</span>
            </div>
            {isEmailOff && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                OFF
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5
              ${activeTab === 'profile' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Settings size={16} />
            <span>Company Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5
              ${activeTab === 'notifications' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Bell size={16} />
            <span>Notification Channels</span>
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2.5
              ${activeTab === 'integrations' ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
          >
            <Key size={16} />
            <span>SMTP & Integrations</span>
          </button>
        </div>

        {/* Main Panel */}
        <div className="lg:col-span-3 bg-bg-card border border-border-card shadow-lg rounded-2xl p-6">
          {/* TAB 1: EMAIL AUTOMATION MASTER CONTROL */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-white text-lg">Email Automation Engine</h3>
                <p className="text-xs text-text-sub mt-1">
                  Master switch to pause or resume all scheduled and event-driven automated email notifications across DPS OS.
                </p>
              </div>

              {/* Status and Action Card */}
              <div className={`p-6 rounded-2xl border transition-all ${
                isEmailOff 
                  ? 'bg-rose-950/20 border-rose-500/30 shadow-rose-950/10' 
                  : 'bg-emerald-950/20 border-emerald-500/30 shadow-emerald-950/10'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full ${isEmailOff ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <h4 className="text-xl font-bold text-white">
                        {isEmailOff ? 'Email Automation is Turned OFF' : 'Email Automation is Active'}
                      </h4>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                        isEmailOff 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isEmailOff ? 'PAUSED / OFF' : 'ONLINE / ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-text-sub max-w-xl">
                      {isEmailOff 
                        ? 'Automated email dispatch is suspended. No cron reminders, staff attendance nudges, or report emails are being sent out.' 
                        : 'System is running normally. Scheduled morning/evening reminders, expiry warnings, digests, and notification emails are actively being sent via SMTP.'}
                    </p>
                    {automationStatus?.updated_by && (
                      <p className="text-xs text-text-sub/70 flex items-center gap-1.5 pt-1">
                        <Clock size={13} />
                        Last changed by <strong className="text-text-main">{automationStatus.updated_by}</strong> on {new Date(automationStatus.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Master Toggle Button */}
                  <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                    {isAdmin ? (
                      isEmailOff ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAutomation(true)}
                          disabled={toggleMutation.isPending}
                          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 text-sm"
                        >
                          <Power size={18} />
                          Turn ON Email Automation
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAutomation(false)}
                          disabled={toggleMutation.isPending}
                          className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 text-sm"
                        >
                          <Power size={18} />
                          Turn OFF Email Automation
                        </button>
                      )
                    ) : (
                      <div className="px-4 py-2 rounded-lg bg-bg-main border border-border-card text-xs text-text-sub flex items-center gap-2">
                        <ShieldAlert size={14} className="text-amber-400" />
                        Admin permission required to toggle
                      </div>
                    )}
                    <span className="text-[11px] text-text-sub/70">
                      {isAdmin ? 'Click button to toggle automation state immediately' : 'Read-only view for standard users'}
                    </span>
                  </div>
                </div>

                {/* Optional Note input when turning off */}
                {isAdmin && !isEmailOff && (
                  <div className="mt-6 pt-5 border-t border-border-card/40 flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      placeholder="Optional reason for turning off (e.g., Server maintenance, test mode, holiday)..."
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-lg text-white placeholder-text-sub/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleAutomation(false)}
                      disabled={toggleMutation.isPending}
                      className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      Turn OFF with Note
                    </button>
                  </div>
                )}
              </div>

              {/* Detailed Breakdown of Automated Email Jobs */}
              <div className="space-y-3">
                <h4 className="font-semibold text-white text-sm">Automated Email Workflows Governed by this Switch:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-bg-main border border-border-card flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Clock size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Morning Attendance & Task Reminders</span>
                      <p className="text-text-sub text-[11px] mt-0.5">
                        Daily at 9:15 AM: Punch-in nudges, today's due tasks, pending follow-ups, and overdue invoice collection reminders.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-main border border-border-card flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Send size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Evening Punch-Out & Work Logs</span>
                      <p className="text-text-sub text-[11px] mt-0.5">
                        Daily at 6:45 PM: Reminders for checked-in staff to punch out and submit daily work logs before day end.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-main border border-border-card flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Mail size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Admin EOD & Weekly Digests</span>
                      <p className="text-text-sub text-[11px] mt-0.5">
                        Daily at 7:00 PM: Comprehensive attendance, log, task, and lead summaries sent to administrators.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-main border border-border-card flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">Domain, SSL & Server Alerts</span>
                      <p className="text-text-sub text-[11px] mt-0.5">
                        Daily at 8:00 AM: Proactive 30-day domain, 14-day SSL, and 7-day hosting renewal warnings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-text-sub flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-primary shrink-0" />
                  <span>
                    <strong>Note:</strong> In-app dashboard notifications and real-time chat messages will continue functioning normally even when email automation is turned OFF.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANY PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg border-b pb-2">Company Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Company Name *</label>
                    <input type="text" required value={companyForm.name} onChange={(e) => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Corporate Email *</label>
                    <input type="email" required value={companyForm.email} onChange={(e) => setCompanyForm({...companyForm, email: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Corporate Phone</label>
                    <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">GSTIN / TAX Identification</label>
                    <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({...companyForm, gstin: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg font-mono uppercase bg-bg-main text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Registered Office Address</label>
                  <textarea rows={3} value={companyForm.address} onChange={(e) => setCompanyForm({...companyForm, address: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                </div>
              </div>

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
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSave} className="space-y-6">
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
                          <label key={channel} className="flex items-center space-x-1.5 text-xs font-semibold text-text-sub cursor-pointer">
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
          )}

          {/* TAB 4: SMTP & INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-white text-lg border-b pb-2">SMTP & Integrations Config</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">SMTP Host</label>
                    <input type="text" value={integrationsForm.smtp_host} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_host: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">SMTP Port</label>
                    <input type="text" value={integrationsForm.smtp_port} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_port: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">SMTP User / Gmail SMTP account</label>
                  <input type="email" value={integrationsForm.smtp_user} onChange={(e) => setIntegrationsForm({...integrationsForm, smtp_user: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg bg-bg-main text-white" />
                </div>
                <div className="space-y-1 pt-2">
                  <label className="text-xs font-semibold text-text-sub">WhatsApp</label>
                  <p className="text-sm text-text-sub">Connection and templates live under WhatsApp → Settings. Technical Meta tools are admin-only.</p>
                  <Link to="/whatsapp/settings" className="inline-flex mt-2 px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold">
                    Open WhatsApp settings
                  </Link>
                </div>
              </div>

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
          )}
        </div>
      </div>
    </div>
  );
}