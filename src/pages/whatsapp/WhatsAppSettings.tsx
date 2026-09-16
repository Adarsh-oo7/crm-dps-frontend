import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast, { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import WhatsAppIntegration from './WhatsAppIntegration';
import WhatsAppProvider from './WhatsAppProvider';

interface Integration {
  connected: boolean;
  display_number: string;
  verified_name: string;
  platform_label?: string;
  is_on_biz_app?: boolean;
  sync_status?: string;
}

export default function WhatsAppSettings() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const [manageOpen, setManageOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery<Integration>({
    queryKey: ['whatsapp-integration'],
    queryFn: () => apiClient('/api/whatsapp/integration/'),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/disconnect/', { method: 'POST', body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-integration'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('WhatsApp disconnected. Chat history was kept.');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not disconnect'),
  });

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">
      <Toaster position="top-right" />

      <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-sub">Connection</p>
              <h2 className="text-lg font-semibold text-white">WhatsApp</h2>
            </div>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full border ${
              data?.connected ? 'text-success border-success/30 bg-success/10' : 'text-text-sub border-border-card'
            }`}
          >
            {data?.connected ? '🟢 Connected' : 'Not connected'}
          </span>
        </div>

        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="bg-bg-main rounded-xl border border-border-card p-3">
            <dt className="text-text-sub text-xs uppercase tracking-wide">Business</dt>
            <dd className="mt-1 font-medium">{data?.verified_name || 'Digital Product Solutions'}</dd>
          </div>
          <div className="bg-bg-main rounded-xl border border-border-card p-3">
            <dt className="text-text-sub text-xs uppercase tracking-wide">Number</dt>
            <dd className="mt-1 font-medium">{data?.display_number || '—'}</dd>
          </div>
          <div className="bg-bg-main rounded-xl border border-border-card p-3">
            <dt className="text-text-sub text-xs uppercase tracking-wide">Platform</dt>
            <dd className="mt-1 font-medium">Cloud API</dd>
          </div>
          <div className="bg-bg-main rounded-xl border border-border-card p-3">
            <dt className="text-text-sub text-xs uppercase tracking-wide">Business App</dt>
            <dd className="mt-1 font-medium">{data?.is_on_biz_app ? 'Connected' : data?.platform_label || 'Cloud API'}</dd>
          </div>
          <div className="bg-bg-main rounded-xl border border-border-card p-3 sm:col-span-2">
            <dt className="text-text-sub text-xs uppercase tracking-wide">Sync</dt>
            <dd className="mt-1 font-medium capitalize">{data?.sync_status || (data?.connected ? 'Completed' : 'Not started')}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setManageOpen((value) => !value)}
            className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold"
          >
            {manageOpen ? 'Hide connection tools' : 'Manage'}
          </button>
          {data?.connected && isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Disconnect WhatsApp? Outbound messaging will stop. CRM chat history is kept.')) {
                  disconnectMutation.mutate();
                }
              }}
              className="px-4 py-2 rounded-lg border border-danger/30 text-danger text-sm font-semibold"
            >
              Disconnect
            </button>
          )}
          <Link to="/whatsapp" className="px-4 py-2 rounded-lg border border-border-card text-sm text-text-sub hover:text-text-main">
            Open inbox
          </Link>
        </div>
      </div>

      {manageOpen && (
        <div className="bg-bg-card border border-border-card rounded-2xl p-5">
          <WhatsAppIntegration embedded />
        </div>
      )}

      {isAdmin && (
        <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-sub">Admin</p>
            <h3 className="text-lg font-semibold text-white">Tech Provider</h3>
            <p className="text-sm text-text-sub">Connected businesses, numbers, and connection health. Hidden from ordinary CRM users.</p>
          </div>
          <WhatsAppProvider />
        </div>
      )}
    </div>
  );
}
