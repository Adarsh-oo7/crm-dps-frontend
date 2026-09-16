import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useState } from 'react';

interface Business {
  id: number;
  name: string;
  slug: string;
  meta_business_id: string;
  is_default: boolean;
  account_count: number;
  accounts: { id: number; display_phone_number: string; sync_status: string; platform_label: string }[];
}

export default function WhatsAppBusinesses() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const { data = [] } = useQuery<Business[]>({
    queryKey: ['whatsapp-businesses'],
    queryFn: () => apiClient('/api/whatsapp/businesses/'),
  });
  const create = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/businesses/', { method: 'POST', body: { name } }),
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-businesses'] });
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New CRM business name" className="flex-1 bg-bg-card rounded-lg px-3 py-2" />
        <button className="px-4 py-2 rounded-lg bg-[#00A884] text-[#111B21] font-semibold" type="submit">Add</button>
      </form>
      {data.map((biz) => (
        <div key={biz.id} className="bg-bg-card rounded-2xl p-4 space-y-2">
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-semibold">{biz.name}</p>
              <p className="text-xs text-text-sub">Portfolio {biz.meta_business_id || '—'} {biz.is_default ? '· default' : ''}</p>
            </div>
            <p className="text-sm text-text-sub">{biz.account_count} number(s)</p>
          </div>
          {biz.accounts.map((acc) => (
            <p key={acc.id} className="text-sm">{acc.display_phone_number} · {acc.platform_label} · {acc.sync_status}</p>
          ))}
        </div>
      ))}
    </div>
  );
}
