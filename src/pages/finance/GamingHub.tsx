import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type Gear = { id: number; name: string; kind: string; quantity: number; daily_rate: string; notes: string };
type ProjectRow = {
  id: number;
  name: string;
  currency: string;
  invoiced: string;
  collected: string;
  expenses: string;
  purchases: string;
  profit: string;
  gear: Gear[];
};
type Line = { description: string; quantity: number; days: number; rate_per_day: number };
type Rental = {
  id: number;
  estimate_number: string;
  customer_name: string;
  date_issued: string;
  status: string;
  delivery_location: string;
  start_date: string;
  end_date: string;
  days: number;
  subtotal: string;
  advance_amount: string;
  balance: string;
  collected: string;
  pdf_file: string;
  created_by_name: string;
};

function money(value: string | number, currency = 'INR') {
  const amount = Number(value || 0);
  if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

export function ProjectMoney() {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useQuery<ProjectRow[]>({
    queryKey: ['project-money'],
    queryFn: () => apiClient('/api/finance/projects/'),
  });
  const [collectFor, setCollectFor] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [note, setNote] = useState('');

  const collect = useMutation({
    mutationFn: () => apiClient('/api/finance/collect/', {
      method: 'POST',
      body: { project: collectFor || undefined, amount, payment_method: method, notes: note, customer_name: note || 'Cash collection' },
    }),
    onSuccess: () => {
      toast.success('Money added to the company totals');
      setAmount('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['project-money'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not record that'),
  });

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-white">Profit by project</p>
        <p className="text-xs text-text-sub mt-1">Invoiced rentals and bills, money collected, and purchases or expenses on that project.</p>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="bg-bg-card border border-border-card rounded-2xl p-4 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-white break-words">{row.name}</p>
                <p className="text-xs text-text-sub">{row.currency === 'INR' ? 'Rupees' : row.currency}</p>
              </div>
              <p className={`text-lg font-bold ${Number(row.profit) >= 0 ? 'text-success' : 'text-danger'}`}>{money(row.profit, row.currency)}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              <Stat label="Invoiced" value={money(row.invoiced, row.currency)} />
              <Stat label="Collected" value={money(row.collected, row.currency)} />
              <Stat label="Purchases" value={money(row.purchases, row.currency)} />
              <Stat label="All expenses" value={money(row.expenses, row.currency)} />
            </div>
            {row.gear.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {row.gear.map((item) => (
                  <span key={item.id} className="text-xs rounded-full border border-border-card px-2.5 py-1 text-text-sub">
                    {item.quantity} × {item.name}{Number(item.daily_rate) > 0 ? ` · ${money(item.daily_rate)}/day` : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          collect.mutate();
        }}
      >
        <p className="text-sm font-semibold text-white">Collect money</p>
        <p className="text-xs text-text-sub">This adds the amount to invoiced and collected money for the company.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <select value={collectFor} onChange={(event) => setCollectFor(event.target.value ? Number(event.target.value) : '')} className="w-full min-w-0 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm">
            <option value="">DPS Gaming Hub</option>
            {rows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <input required type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Amount in Rs." className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          <select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm">
            <option>UPI</option>
            <option>Cash</option>
            <option>Bank Transfer</option>
          </select>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Who paid, or what it was for" className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={collect.isPending} className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold disabled:opacity-50">
          Add to company money
        </button>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-sub">{label}</p>
      <p className="font-semibold text-white break-words">{value}</p>
    </div>
  );
}

const emptyLine = (): Line => ({ description: '', quantity: 1, days: 1, rate_per_day: 0 });

export default function GamingHub() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { data: rentals = [] } = useQuery<Rental[]>({
    queryKey: ['rentals'],
    queryFn: () => apiClient('/api/finance/rentals/'),
  });
  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ['project-money'],
    queryFn: () => apiClient('/api/finance/projects/'),
  });
  const hub = projects.find((row) => row.name === 'DPS Gaming Hub');
  const [form, setForm] = useState({
    customer_name: '',
    delivery_location: '',
    start_date: '',
    end_date: '',
    advance_amount: '500',
    lines: [
      { description: 'PS5 Console (DualSense included)', quantity: 1, days: 1, rate_per_day: 1000 },
      { description: 'TV / Monitor', quantity: 1, days: 1, rate_per_day: 0 },
      { description: 'UPS 1250v', quantity: 1, days: 1, rate_per_day: 150 },
    ] as Line[],
  });
  const [collectId, setCollectId] = useState<number | null>(null);
  const [collectAmount, setCollectAmount] = useState('');

  const createBill = useMutation({
    mutationFn: () => apiClient('/api/finance/rentals/', { method: 'POST', body: form }),
    onSuccess: () => {
      toast.success('Client bill created');
      setForm({ ...form, customer_name: '', delivery_location: '' });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['project-money'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Bill was not created'),
  });

  const collect = useMutation({
    mutationFn: () => apiClient('/api/finance/collect/', {
      method: 'POST',
      body: { estimate: collectId, amount: collectAmount, payment_method: 'UPI' },
    }),
    onSuccess: () => {
      toast.success('Payment recorded on the bill');
      setCollectId(null);
      setCollectAmount('');
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      queryClient.invalidateQueries({ queryKey: ['project-money'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Payment was not recorded'),
  });

  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border-card rounded-2xl p-4">
        <p className="text-sm font-semibold text-white">DPS Gaming Hub</p>
        <p className="text-xs text-text-sub mt-1">3 PS5 consoles, 3 TVs, and a UPS. Rentals earn, and gear you buy shows under purchases on the project.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {(hub?.gear || []).map((item) => (
            <span key={item.id} className="text-xs rounded-full bg-bg-main border border-border-card px-3 py-1 text-text-main">
              {item.quantity} × {item.name}
            </span>
          ))}
        </div>
      </div>

      <form
        className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          createBill.mutate();
        }}
      >
        <p className="text-sm font-semibold text-white">Create a bill</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} placeholder="Customer name" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          <input required value={form.delivery_location} onChange={(event) => setForm({ ...form, delivery_location: event.target.value })} placeholder="Delivery location" className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm" />
          <label className="text-xs text-text-sub">From
            <input required type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="mt-1 w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm text-text-main" />
          </label>
          <label className="text-xs text-text-sub">To
            <input required type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="mt-1 w-full bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm text-text-main" />
          </label>
        </div>
        <div className="space-y-2">
          {form.lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2">
              <input value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Item" className="col-span-6 bg-bg-main border border-border-card rounded-lg px-2 py-2 text-sm" />
              <input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} className="col-span-2 bg-bg-main border border-border-card rounded-lg px-2 py-2 text-sm" />
              <input type="number" min="0" value={line.rate_per_day} onChange={(event) => updateLine(index, { rate_per_day: Number(event.target.value) })} className="col-span-3 bg-bg-main border border-border-card rounded-lg px-2 py-2 text-sm" />
              <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, item) => item !== index) })} className="col-span-1 text-text-sub">×</button>
            </div>
          ))}
          <button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })} className="text-xs text-primary font-semibold">Add item</button>
        </div>
        <label className="block text-xs text-text-sub">Advance to lock the booking (Rs.)
          <input type="number" min="0" value={form.advance_amount} onChange={(event) => setForm({ ...form, advance_amount: event.target.value })} className="mt-1 w-full sm:w-48 bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm text-text-main" />
        </label>
        <button type="submit" disabled={createBill.isPending} className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold disabled:opacity-50">
          Create Gaming Hub bill
        </button>
        <p className="border-t border-border-card pt-3 text-center text-xs text-text-sub">
          By <span className="font-semibold text-white">{user?.full_name || 'You'}</span>
        </p>
      </form>

      <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-text-sub">
              <tr>
                <th className="p-3">Bill</th>
                <th className="p-3">Customer</th>
                <th className="p-3">By</th>
                <th className="p-3">Total</th>
                <th className="p-3">Collected</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((row) => (
                <tr key={row.id} className="border-t border-border-card">
                  <td className="p-3">
                    <p className="font-semibold text-white">{row.estimate_number}</p>
                    <p className="text-xs text-text-sub">{row.start_date} to {row.end_date}</p>
                  </td>
                  <td className="p-3 break-words">{row.customer_name}<p className="text-xs text-text-sub">{row.delivery_location}</p></td>
                  <td className="p-3 break-words">{row.created_by_name || '—'}</td>
                  <td className="p-3">{money(row.subtotal)}</td>
                  <td className="p-3">{money(row.collected)}</td>
                  <td className="p-3 text-xs">{row.status}</td>
                  <td className="p-3 text-right space-y-2">
                    {row.pdf_file && (
                      <a href={`${base}${row.pdf_file}`} target="_blank" rel="noreferrer" className="block text-primary text-xs font-semibold">Open PDF</a>
                    )}
                    <button type="button" onClick={() => { setCollectId(row.id); setCollectAmount(String(row.advance_amount)); }} className="text-xs font-semibold text-text-main">Collect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {collectId && (
        <form
          className="bg-bg-card border border-border-card rounded-2xl p-4 flex flex-wrap gap-2 items-end"
          onSubmit={(event) => { event.preventDefault(); collect.mutate(); }}
        >
          <label className="text-xs text-text-sub">Amount collected
            <input required type="number" min="1" value={collectAmount} onChange={(event) => setCollectAmount(event.target.value)} className="mt-1 block bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm text-text-main" />
          </label>
          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-[#111B21] text-sm font-semibold">Save payment</button>
          <button type="button" onClick={() => setCollectId(null)} className="px-4 py-2 text-sm text-text-sub">Cancel</button>
        </form>
      )}
    </div>
  );

  function updateLine(index: number, patch: Partial<Line>) {
    const lines = form.lines.map((line, item) => item === index ? { ...line, ...patch } : line);
    setForm({ ...form, lines });
  }
}
