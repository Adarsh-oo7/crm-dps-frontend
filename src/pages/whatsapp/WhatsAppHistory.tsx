import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface HistoryRow {
  id: number;
  text: string;
  direction: string;
  source: string;
  status: string;
  timestamp: string;
  contact_name: string;
}

export default function WhatsAppHistory() {
  const { data = [] } = useQuery<HistoryRow[]>({
    queryKey: ['whatsapp-history'],
    queryFn: () => apiClient('/api/whatsapp/history/'),
  });
  return (
    <div className="bg-bg-card rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-text-sub">
          <tr>
            <th className="text-left p-3">When</th>
            <th className="text-left p-3">Contact</th>
            <th className="text-left p-3">Source</th>
            <th className="text-left p-3">Message</th>
            <th className="text-left p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-t border-border-card">
              <td className="p-3 whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</td>
              <td className="p-3">{row.contact_name}</td>
              <td className="p-3">{row.source}</td>
              <td className="p-3 max-w-sm truncate">{row.direction === 'out' ? '→ ' : '← '}{row.text}</td>
              <td className="p-3">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
