import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface Provider {
  businesses: { id: number; name: string; meta_business_id: string; is_default: boolean }[];
  integrations: {
    id: number;
    business_name: string;
    display_phone_number: string;
    waba_id: string;
    platform_label: string;
    is_on_biz_app: boolean;
    quality_rating: string;
    sync_status: string;
    last_webhook_at: string | null;
    last_sync_at: string | null;
  }[];
}

export default function WhatsAppProvider() {
  const { data, error } = useQuery<Provider>({
    queryKey: ['whatsapp-provider'],
    queryFn: () => apiClient('/api/whatsapp/provider/'),
    retry: false,
  });
  if (error) {
    return <p className="text-sm text-[#F15C6D]">Admin only. Tokens are never shown here.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-sub">Independent Tech Provider view. Access tokens are stored server-side only.</p>
      <div className="bg-bg-card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-text-sub">
            <tr>
              <th className="text-left p-3">Business</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">WABA</th>
              <th className="text-left p-3">Platform</th>
              <th className="text-left p-3">Quality</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.integrations || []).map((row) => (
              <tr key={row.id} className="border-t border-border-card">
                <td className="p-3">{row.business_name}</td>
                <td className="p-3">{row.display_phone_number}</td>
                <td className="p-3 font-mono text-xs">{row.waba_id}</td>
                <td className="p-3">{row.is_on_biz_app ? '📱 + ☁️' : row.platform_label}</td>
                <td className="p-3">{row.quality_rating || '—'}</td>
                <td className="p-3">{row.sync_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
