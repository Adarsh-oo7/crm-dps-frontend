import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface NumberRow {
  id: number;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  messaging_limit_tier: string;
  platform_type: string;
  is_on_biz_app: boolean;
  sync_status: string;
  phone_number_id: string;
}

export default function WhatsAppNumbers() {
  const { data = [] } = useQuery<NumberRow[]>({
    queryKey: ['whatsapp-numbers'],
    queryFn: () => apiClient('/api/whatsapp/numbers/'),
  });
  return (
    <div className="bg-bg-card rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-text-sub">
          <tr>
            <th className="text-left p-3">Number</th>
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">Quality</th>
            <th className="text-left p-3">Limit</th>
            <th className="text-left p-3">Platform</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t border-border-card">
              <td className="p-3">{row.display_phone_number}</td>
              <td className="p-3">{row.verified_name}</td>
              <td className="p-3">{row.quality_rating || '—'}</td>
              <td className="p-3">{row.messaging_limit_tier || '—'}</td>
              <td className="p-3">{row.is_on_biz_app ? '📱 + ☁️' : '☁️ Cloud API'}</td>
              <td className="p-3">{row.sync_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
