import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { LogIn, LogOut } from 'lucide-react';
import { apiClient } from '../../api/client';
import { deskFor } from '../../access';
import { useAuthStore } from '../../store/authStore';

interface FloorPerson {
  id: number;
  name: string;
  role: string;
  state: 'in' | 'out' | 'missing' | 'leave';
  check_in: string | null;
  logged_work: boolean;
}

interface PendingLeave {
  id: number;
  name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
}

interface DeskPayload {
  desk: { name: string; blurb: string };
  punch: { checked_in: boolean; checked_out: boolean; check_in: string | null; hours: number };
  floor: FloorPerson[];
  floor_counts: { in: number; missing: number; leave: number; out: number } | null;
  pending_leave: PendingLeave[];
  tasks: { id: number; title: string; status: string; priority: string }[];
}

const STATE_LABEL: Record<FloorPerson['state'], string> = {
  in: 'In',
  out: 'Left',
  missing: 'Not in',
  leave: 'Leave',
};

function clock(value: string | null) {
  if (!value) return '';
  const [hour, minute] = value.split(':');
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PeopleDesk() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);
  const desk = deskFor(user?.role);

  const { data, isLoading } = useQuery<DeskPayload>({
    queryKey: ['desk'],
    queryFn: () => apiClient('/api/dashboard/desk/'),
    refetchInterval: 30000,
  });

  const punch = useMutation({
    mutationFn: (action: 'in' | 'out') =>
      apiClient(action === 'in' ? '/api/team/attendance/check-in/' : '/api/team/attendance/check-out/', { method: 'POST' }),
    onMutate: (action) => setBusy(action),
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['desk'] });
      toast.success(action === 'in' ? 'Punched in.' : 'Punched out.');
    },
    onError: (err: Error) => toast.error(err.message || 'Punch failed'),
    onSettled: () => setBusy(null),
  });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      apiClient(`/api/team/leave-requests/${id}/${action}/`, { method: 'PATCH', body: {} }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['desk'] });
      toast.success(vars.action === 'approve' ? 'Leave approved. They get an email.' : 'Leave declined. They get an email.');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update leave'),
  });

  const counts = data?.floor_counts;
  const punchedIn = data?.punch.checked_in && !data?.punch.checked_out;

  return (
    <div className="space-y-5 max-w-5xl">
      <Toaster position="top-right" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">{desk.name}</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">{user?.full_name?.split(' ')[0] || 'People'}</h1>
          <p className="text-sm text-text-sub mt-1">{desk.blurb}</p>
        </div>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => punch.mutate(punchedIn ? 'out' : 'in')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
            punchedIn ? 'bg-amber-500 text-[#111B21]' : 'bg-primary text-[#111B21]'
          }`}
        >
          {punchedIn ? <LogOut size={16} /> : <LogIn size={16} />}
          {busy ? 'Saving…' : punchedIn ? 'Punch out' : 'Punch in'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['In now', counts?.in ?? '—'],
          ['Not punched in', counts?.missing ?? '—'],
          ['On leave', counts?.leave ?? '—'],
          ['Already left', counts?.out ?? '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-border-card bg-bg-card p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-text-sub mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-2xl border border-border-card bg-bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider">Floor</h2>
            <button type="button" onClick={() => navigate('/team')} className="text-xs font-bold text-primary">
              Attendance records
            </button>
          </div>
          {isLoading ? (
            <p className="text-sm text-text-sub py-6">Loading the floor…</p>
          ) : (
            <ul className="divide-y divide-border-card">
              {(data?.floor || []).map((person) => (
                <li key={person.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{person.name}</p>
                    <p className="text-[11px] text-text-sub capitalize">{person.role}{person.check_in ? ` · ${clock(person.check_in)}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    person.state === 'in' ? 'bg-primary/15 text-primary' :
                    person.state === 'missing' ? 'bg-amber-500/15 text-amber-300' :
                    person.state === 'leave' ? 'bg-blue-500/15 text-blue-300' :
                    'text-text-sub'
                  }`}>
                    {STATE_LABEL[person.state]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border-card bg-bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3">Leave waiting</h2>
            {(data?.pending_leave || []).length === 0 ? (
              <p className="text-sm text-text-sub">Nothing waiting on you.</p>
            ) : (
              <ul className="space-y-3">
                {data?.pending_leave.map((leave) => (
                  <li key={leave.id} className="rounded-xl border border-border-card p-3">
                    <p className="text-sm font-semibold">{leave.name}</p>
                    <p className="text-xs text-text-sub mt-1">
                      {leave.leave_type} · {leave.start_date} to {leave.end_date} · {leave.days}d
                    </p>
                    <p className="text-xs text-text-sub mt-1 line-clamp-2">{leave.reason}</p>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => decide.mutate({ id: leave.id, action: 'approve' })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-[#111B21]">
                        Approve
                      </button>
                      <button type="button" onClick={() => decide.mutate({ id: leave.id, action: 'reject' })} className="rounded-lg border border-border-card px-3 py-1.5 text-xs font-bold">
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-border-card bg-bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-2">Your tasks today</h2>
            {(data?.tasks || []).length === 0 ? (
              <p className="text-sm text-text-sub">No tasks due today.</p>
            ) : (
              <ul className="space-y-2">
                {data?.tasks.map((task) => (
                  <li key={task.id} className="text-sm">
                    <button type="button" onClick={() => navigate('/tasks')} className="text-left hover:text-primary">{task.title}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
