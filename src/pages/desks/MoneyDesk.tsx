import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { LogIn, LogOut } from 'lucide-react';
import { apiClient } from '../../api/client';
import { deskFor } from '../../access';
import { useAuthStore } from '../../store/authStore';

interface MoneyInvoice {
  id: number;
  number: string;
  client: string;
  total: number;
  status: string;
  due_date: string | null;
}

interface DeskPayload {
  punch: { checked_in: boolean; checked_out: boolean };
  money: {
    collected_this_month: number;
    open_count: number;
    overdue_count: number;
    pending_expenses: number;
    invoices: MoneyInvoice[];
  } | null;
  tasks: { id: number; title: string; status: string }[];
}

function money(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function MoneyDesk() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const desk = deskFor('finance');

  const { data, isLoading } = useQuery<DeskPayload>({
    queryKey: ['desk'],
    queryFn: () => apiClient('/api/dashboard/desk/'),
    refetchInterval: 60000,
  });

  const punch = useMutation({
    mutationFn: (action: 'in' | 'out') =>
      apiClient(action === 'in' ? '/api/team/attendance/check-in/' : '/api/team/attendance/check-out/', { method: 'POST' }),
    onMutate: () => setBusy(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desk'] });
      toast.success('Attendance updated.');
    },
    onError: (err: Error) => toast.error(err.message || 'Punch failed'),
    onSettled: () => setBusy(false),
  });

  const punchedIn = data?.punch.checked_in && !data?.punch.checked_out;
  const moneyData = data?.money;

  return (
    <div className="space-y-5 max-w-5xl">
      <Toaster position="top-right" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{desk.name}</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">{user?.full_name?.split(' ')[0] || 'Finance'}</h1>
          <p className="text-sm text-text-sub mt-1">{desk.blurb}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => punch.mutate(punchedIn ? 'out' : 'in')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
              punchedIn ? 'bg-amber-500 text-[#111B21]' : 'bg-primary text-[#111B21]'
            }`}
          >
            {punchedIn ? <LogOut size={16} /> : <LogIn size={16} />}
            {punchedIn ? 'Punch out' : 'Punch in'}
          </button>
          <button type="button" onClick={() => navigate('/finance')} className="rounded-xl border border-border-card px-4 py-2.5 text-sm font-bold">
            Open billing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Collected this month', moneyData ? money(moneyData.collected_this_month) : '—'],
          ['Open invoices', moneyData?.open_count ?? '—'],
          ['Overdue', moneyData?.overdue_count ?? '—'],
          ['Expenses to approve', moneyData?.pending_expenses ?? '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border-card bg-bg-card p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-text-sub mt-1">{label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border-card bg-bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Chase these first</h2>
        {isLoading ? (
          <p className="text-sm text-text-sub">Loading invoices…</p>
        ) : (moneyData?.invoices || []).length === 0 ? (
          <p className="text-sm text-text-sub">No open invoices. Collections are clear.</p>
        ) : (
          <ul className="divide-y divide-border-card">
            {moneyData?.invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{invoice.client || 'Client'}</p>
                  <p className="text-xs text-text-sub">{invoice.number} · due {invoice.due_date || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{money(invoice.total)}</p>
                  <p className={`text-[11px] font-bold ${invoice.status === 'Overdue' ? 'text-amber-300' : 'text-text-sub'}`}>{invoice.status}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
