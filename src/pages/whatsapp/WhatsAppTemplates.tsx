import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface Template {
  id: number;
  name: string;
  language: string;
  category: string;
  status: string;
  components: { type?: string; text?: string }[];
}

function previewOf(row: Template) {
  const body = (row.components || []).find((part) => (part.type || '').toUpperCase() === 'BODY');
  return body?.text || 'Approved message template';
}

function prettyName(name: string) {
  return (name || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WhatsAppTemplates() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const { data = [] } = useQuery<Template[]>({
    queryKey: ['whatsapp-templates'],
    queryFn: () => apiClient('/api/whatsapp/templates/catalog/'),
  });
  const sync = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/templates/catalog/', { method: 'POST', body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] }),
  });
  const approved = data.filter((row) => (row.status || '').toUpperCase() === 'APPROVED');

  return (
    <div className="space-y-3 h-full overflow-y-auto pr-1">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <p className="text-sm text-text-sub max-w-xl">
          Use a template when the customer has not messaged recently. After they reply, you can chat normally from the inbox.
        </p>
        {isAdmin && (
          <button type="button" onClick={() => sync.mutate()} className="px-4 py-2 rounded-lg border border-border-card text-sm font-semibold">
            {sync.isPending ? 'Refreshing…' : 'Refresh templates'}
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {approved.map((row) => (
          <div key={row.id} className="bg-bg-card border border-border-card rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <p className="font-semibold text-white">{prettyName(row.name)}</p>
              <p className="text-xs text-text-sub mt-1">{row.language.toUpperCase()} · {row.category || 'Utility'}</p>
            </div>
            <p className="text-sm text-text-sub flex-1 whitespace-pre-wrap">{previewOf(row)}</p>
            <Link
              to={`/whatsapp?template=${encodeURIComponent(row.name)}`}
              className="px-3 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold text-center"
            >
              Use Template
            </Link>
          </div>
        ))}
        {approved.length === 0 && (
          <div className="sm:col-span-2 bg-bg-card border border-border-card rounded-2xl p-6 text-sm text-text-sub">
            No approved templates yet. Ask an admin to refresh templates after Meta approval.
          </div>
        )}
      </div>
    </div>
  );
}
