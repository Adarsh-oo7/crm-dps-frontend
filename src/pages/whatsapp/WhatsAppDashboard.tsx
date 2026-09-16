import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';

interface Account {
  id: number;
  business_name: string;
  display_phone_number: string;
  verified_name: string;
  platform_label: string;
  is_on_biz_app: boolean;
  quality_rating: string;
  messaging_limit_tier: string;
  sync_status: string;
  waba_id: string;
  last_webhook_at: string | null;
  last_sync_at: string | null;
  webhook_subscribed: boolean;
  is_active: boolean;
}

interface Dashboard {
  connected: boolean;
  account: Account | null;
  accounts: Account[];
  inbound_count: number;
  unread_count: number;
  webhook_healthy: boolean;
  business_count: number;
}

function badge(status: string) {
  if (status === 'connected') return '🟢 Connected';
  if (status === 'syncing') return '🟡 Synchronizing';
  if (status === 'disconnected') return '⚪ Disconnected';
  return '🔴 Connection error';
}

export default function WhatsAppDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<Dashboard>({
    queryKey: ['whatsapp-dashboard'],
    queryFn: () => apiClient('/api/whatsapp/dashboard/'),
  });
  const health = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/health/', { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-dashboard'] }),
  });

  const account = data?.account;
  return (
    <div className="space-y-4">
      {isLoading && <p className="text-text-sub">Loading WhatsApp status…</p>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card label="Status" value={account ? badge(account.sync_status) : 'Not connected'} />
        <Card label="Platform" value={account?.platform_label || '—'} />
        <Card label="Phone" value={account?.display_phone_number || '—'} />
        <Card label="WABA" value={account?.waba_id || '—'} />
        <Card label="Quality" value={account?.quality_rating || '—'} />
        <Card label="Messaging limit" value={account?.messaging_limit_tier || '—'} />
        <Card label="Last webhook" value={account?.last_webhook_at ? new Date(account.last_webhook_at).toLocaleString() : '—'} />
        <Card label="Webhook" value={data?.webhook_healthy ? 'Healthy' : 'Waiting'} />
      </div>
      <div className="flex gap-2">
        <Link to="/whatsapp/connect" className="px-4 py-2 rounded-lg bg-[#1877F2] text-white text-sm font-semibold">Connect WhatsApp</Link>
        <Link to="/whatsapp" className="px-4 py-2 rounded-lg bg-[#00A884] text-[#111B21] text-sm font-semibold">Open inbox</Link>
        <button type="button" onClick={() => health.mutate()} className="px-4 py-2 rounded-lg bg-bg-card text-sm">Refresh health</button>
      </div>
      <div className="bg-bg-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-text-sub">
            <tr>
              <th className="text-left p-3">Business</th>
              <th className="text-left p-3">Number</th>
              <th className="text-left p-3">Platform</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.accounts || []).map((row) => (
              <tr key={row.id} className="border-t border-border-card">
                <td className="p-3">{row.business_name || row.verified_name}</td>
                <td className="p-3">{row.display_phone_number}</td>
                <td className="p-3">{row.is_on_biz_app ? '📱 Business App + ☁️ Cloud API' : '☁️ Cloud API'}</td>
                <td className="p-3">{badge(row.sync_status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card rounded-2xl p-4">
      <p className="text-xs text-text-sub">{label}</p>
      <p className="mt-1 font-medium break-all">{value}</p>
    </div>
  );
}
