import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type Intern = {
  id: number;
  full_name: string;
  email: string;
  location: string;
  focus: string;
  phone: string;
};

type Report = {
  id: number;
  title: string;
  area: string;
  detail: string;
  location: string;
  status: string;
  author_name: string;
  created_at: string;
};

export default function Interns() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = ['superadmin', 'admin', 'hr', 'manager'].includes(user?.role || '');
  const { data: people = [] } = useQuery<Intern[]>({
    queryKey: ['interns'],
    queryFn: () => apiClient('/api/interns/'),
  });
  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['intern-reports'],
    queryFn: () => apiClient('/api/interns/reports/'),
  });
  const [login, setLogin] = useState({ full_name: '', email: '', password: '', location: '', focus: 'Tester', phone: '' });
  const [report, setReport] = useState({ title: '', area: '', detail: '', location: '' });

  const addIntern = useMutation({
    mutationFn: () => apiClient('/api/interns/', { method: 'POST', body: login }),
    onSuccess: () => {
      toast.success('Tester login created. They can sign in on the website and the phone app.');
      setLogin({ full_name: '', email: '', password: '', location: '', focus: 'Tester', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['interns'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Login was not created'),
  });

  const fileReport = useMutation({
    mutationFn: () => apiClient('/api/interns/reports/', { method: 'POST', body: report }),
    onSuccess: () => {
      toast.success('Report filed');
      setReport({ title: '', area: '', detail: '', location: '' });
      queryClient.invalidateQueries({ queryKey: ['intern-reports'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Report was not saved'),
  });

  const closeReport = useMutation({
    mutationFn: (id: number) => apiClient(`/api/interns/reports/${id}/`, { method: 'PATCH', body: { status: 'Fixed' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['intern-reports'] }),
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white">Interns</h1>
        <p className="text-sm text-text-sub mt-1">Tester interns sign in like staff, on the website and the phone app, and file what they tested.</p>
      </div>

      {canManage && (
        <form
          className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3"
          onSubmit={(event) => { event.preventDefault(); addIntern.mutate(); }}
        >
          <p className="text-sm font-semibold text-white">Add a tester login</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={login.full_name} onChange={(event) => setLogin({ ...login, full_name: event.target.value })} placeholder="Full name" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
            <input required type="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} placeholder="Email" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
            <input required minLength={8} type="text" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} placeholder="Password (8+ characters)" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
            <input value={login.location} onChange={(event) => setLogin({ ...login, location: event.target.value })} placeholder="Location, for example Trivandrum" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
            <input value={login.focus} onChange={(event) => setLogin({ ...login, focus: event.target.value })} placeholder="Focus" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
            <input value={login.phone} onChange={(event) => setLogin({ ...login, phone: event.target.value })} placeholder="Phone" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={addIntern.isPending} className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold disabled:opacity-50">Create login</button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {people.map((person) => (
          <div key={person.id} className="bg-bg-card border border-border-card rounded-2xl p-4 min-w-0">
            <p className="font-semibold text-white break-words">{person.full_name}</p>
            <p className="text-sm text-text-sub break-all">{person.email}</p>
            <p className="text-xs text-text-sub mt-2">{person.focus}{person.location ? ` · ${person.location}` : ''}</p>
          </div>
        ))}
        {people.length === 0 && <p className="text-sm text-text-sub">No tester logins yet.</p>}
      </div>

      <form
        className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3"
        onSubmit={(event) => { event.preventDefault(); fileReport.mutate(); }}
      >
        <p className="text-sm font-semibold text-white">File a test report</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required value={report.title} onChange={(event) => setReport({ ...report, title: event.target.value })} placeholder="What broke, or what you checked" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          <input value={report.area} onChange={(event) => setReport({ ...report, area: event.target.value })} placeholder="Screen, for example Billing" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          <input value={report.location} onChange={(event) => setReport({ ...report, location: event.target.value })} placeholder="Where you tested" className="sm:col-span-2 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
        </div>
        <textarea required rows={3} value={report.detail} onChange={(event) => setReport({ ...report, detail: event.target.value })} placeholder="What you did and what you saw" className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={fileReport.isPending} className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold disabled:opacity-50">Save report</button>
      </form>

      <div className="space-y-2">
        {reports.map((row) => (
          <div key={row.id} className="bg-bg-card border border-border-card rounded-2xl p-4 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-white break-words">{row.title}</p>
                <p className="text-xs text-text-sub">{row.author_name}{row.area ? ` · ${row.area}` : ''}{row.location ? ` · ${row.location}` : ''}</p>
              </div>
              <span className={`text-xs font-semibold ${row.status === 'Fixed' ? 'text-success' : 'text-warning'}`}>{row.status}</span>
            </div>
            <p className="text-sm text-text-sub mt-2 whitespace-pre-wrap break-words">{row.detail}</p>
            {canManage && row.status === 'Open' && (
              <button type="button" onClick={() => closeReport.mutate(row.id)} className="mt-2 text-xs font-semibold text-primary">Mark fixed</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
