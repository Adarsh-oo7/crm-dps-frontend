import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface SyncPayload {
  account: { display_phone_number: string; sync_status: string; last_webhook_at: string | null } | null;
  sync_logs: { id: number; kind: string; status: string; detail: string; started_at: string }[];
  recent_webhooks: { id: number; field: string; processed_at: string | null; error: string; created_at: string }[];
}

export default function WhatsAppSync() {
  const { data } = useQuery<SyncPayload>({
    queryKey: ['whatsapp-sync'],
    queryFn: () => apiClient('/api/whatsapp/sync-status/'),
  });
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-bg-card rounded-2xl p-4 space-y-2">
        <h2 className="font-semibold">Connection</h2>
        <p>{data?.account?.display_phone_number || 'No number'} · {data?.account?.sync_status || 'n/a'}</p>
        <p className="text-sm text-text-sub">Last webhook {data?.account?.last_webhook_at ? new Date(data.account.last_webhook_at).toLocaleString() : 'none yet'}</p>
        <h3 className="font-medium pt-2">Sync logs</h3>
        {(data?.sync_logs || []).map((row) => (
          <p key={row.id} className="text-sm">{row.kind} · {row.status} · {row.detail}</p>
        ))}
      </div>
      <div className="bg-bg-card rounded-2xl p-4 space-y-2">
        <h2 className="font-semibold">Webhook events</h2>
        {(data?.recent_webhooks || []).map((row) => (
          <p key={row.id} className="text-sm">
            {row.field || 'payload'} · {row.processed_at ? 'processed' : 'queued'} {row.error ? `· ${row.error}` : ''}
          </p>
        ))}
      </div>
    </div>
  );
}
