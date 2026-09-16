import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { crmWhatsAppPath } from '../../utils/whatsapp';
import toast, { Toaster } from 'react-hot-toast';

interface Contact {
  id: number;
  wa_id: string;
  profile_name: string;
  display_phone?: string;
  last_message_preview: string;
  lead: number | null;
  client: number | null;
  notes: string;
}

export default function WhatsAppContactsPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const { data = [] } = useQuery<Contact[]>({
    queryKey: ['whatsapp-contacts', q],
    queryFn: () => apiClient('/api/whatsapp/contacts/', { params: q ? { q } : undefined }),
  });
  const link = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      apiClient(`/api/whatsapp/contacts/${id}/link/`, { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('CRM record updated');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update'),
  });
  const createClient = useMutation({
    mutationFn: async (row: Contact) => {
      const created = await apiClient('/api/clients/', {
        method: 'POST',
        body: {
          company_name: row.profile_name || row.display_phone || row.wa_id,
          client_type: 'Service Client',
          status: 'Active',
          notes: `Created from WhatsApp ${row.display_phone || row.wa_id}`,
        },
      });
      await apiClient(`/api/whatsapp/contacts/${row.id}/link/`, { method: 'POST', body: { client_id: created.id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Client created');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create client'),
  });

  return (
    <div className="space-y-3 h-full overflow-y-auto pr-1">
      <Toaster position="top-right" />
      <p className="text-sm text-text-sub">
        WhatsApp numbers should match a CRM lead or client. This is not a separate customer database.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or phone"
        className="w-full bg-bg-card border border-border-card rounded-lg px-3 py-2 text-sm"
      />
      <div className="bg-bg-card border border-border-card rounded-2xl divide-y divide-border-card">
        {data.length === 0 && <p className="p-6 text-sm text-text-sub">No WhatsApp contacts yet.</p>}
        {data.map((row) => (
          <div key={row.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">{row.profile_name || row.display_phone || row.wa_id}</p>
              <p className="text-xs text-text-sub">{row.display_phone || row.wa_id}</p>
              <p className="text-xs mt-1">
                {row.lead ? (
                  <span className="text-primary">Linked to Lead #{row.lead}</span>
                ) : row.client ? (
                  <span className="text-primary">Linked to Client #{row.client}</span>
                ) : (
                  <span className="text-text-sub">No CRM profile linked</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={crmWhatsAppPath({ contactId: row.id, phone: row.wa_id })} className="px-3 py-1.5 rounded-lg border border-border-card text-sm">
                Open Chat
              </Link>
              {!row.lead && (
                <button type="button" onClick={() => link.mutate({ id: row.id, body: { create_lead: true } })} className="px-3 py-1.5 rounded-lg bg-primary text-[#111B21] text-sm font-semibold">
                  Create Lead
                </button>
              )}
              {!row.client && (
                <button type="button" onClick={() => createClient.mutate(row)} className="px-3 py-1.5 rounded-lg border border-border-card text-sm font-semibold">
                  Create Client
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
