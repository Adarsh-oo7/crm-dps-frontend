import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { StatusBadge } from '../../components/shared/Badge';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  DollarSign, FileText, Plus, Check, Printer, TrendingUp, TrendingDown, 
  Layers, AlertCircle, ShoppingBag, X
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_number: string;
  client: number;
  client_detail?: { id: number; company_name: string };
  project: number | null;
  project_detail?: { id: number; name: string };
  invoice_date: string;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  total_amount: string;
  pdf_file: string | null;
}

interface Proposal {
  id: number;
  proposal_number: string;
  client: number;
  client_detail?: { id: number; company_name: string };
  project_name: string;
  description: string;
  valid_until: string;
  status: string;
  pdf_file: string | null;
}

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  client_detail?: { id: number; company_name: string };
  project_detail?: { id: number; name: string };
}

export default function Finance() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdminOrFinance = ['superadmin', 'admin', 'finance'].includes(user?.role || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'proposals' | 'expenses'>('overview');

  const base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Modals
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [createProposalOpen, setCreateProposalOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState<number | null>(null);

  // Forms data
  const [invoiceForm, setInvoiceForm] = useState({
    client: '',
    project: '',
    invoice_date: '',
    due_date: '',
    terms_and_conditions: 'Payment is due within 15 days of invoice date.',
    line_items: [{ description: '', quantity: 1, unit_price: 0, tax_percent: 0, discount_percent: 0 }]
  });

  const [proposalForm, setProposalForm] = useState({
    client: '',
    project_name: '',
    description: '',
    valid_until: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0, tax_percent: 0, discount_percent: 0 }]
  });

  const [expenseForm, setExpenseForm] = useState({
    category: 'Software',
    description: '',
    amount: '',
    expense_date: '',
    client: '',
    project: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: ''
  });

  // Queries
  const { data: summary = { total_invoiced_this_month: 0, total_collected_this_month: 0, outstanding_payments: 0, expenses_this_month: 0, profit_this_month: 0 } } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => apiClient('/api/finance/summary/')
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => apiClient('/api/finance/revenue-chart/')
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => apiClient('/api/finance/invoices/')
  });

  const { data: proposals = [] } = useQuery<Proposal[]>({
    queryKey: ['proposals'],
    queryFn: () => apiClient('/api/finance/proposals/')
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => apiClient('/api/finance/expenses/')
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient('/api/clients/').then(res => res.results || res)
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/api/projects/').then(res => res.results || res)
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (body: any) => apiClient('/api/finance/invoices/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-chart'] });
      toast.success('Invoice created!');
      setCreateInvoiceOpen(false);
      setInvoiceForm({
        client: '', project: '', invoice_date: '', due_date: '',
        terms_and_conditions: 'Payment is due within 15 days.',
        line_items: [{ description: '', quantity: 1, unit_price: 0, tax_percent: 0, discount_percent: 0 }]
      });
    },
    onError: (err: any) => toast.error(err.message || 'Invoice creation failed')
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/finance/invoices/${id}/send/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent & PDF generated!');
    }
  });

  const payInvoiceMutation = useMutation({
    mutationFn: (vars: { id: number; body: any }) => apiClient(`/api/finance/invoices/${vars.id}/payments/`, { method: 'POST', body: vars.body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-chart'] });
      toast.success('Payment recorded!');
      setPayInvoiceId(null);
      setPaymentForm({ amount: '', payment_method: 'Bank Transfer', reference_number: '', notes: '' });
    },
    onError: (err: any) => toast.error(err.message || 'Payment recording failed')
  });

  const createProposalMutation = useMutation({
    mutationFn: (body: any) => apiClient('/api/finance/proposals/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal created!');
      setCreateProposalOpen(false);
    }
  });

  const sendProposalMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/finance/proposals/${id}/send/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposal sent & PDF generated!');
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (body: any) => apiClient('/api/finance/expenses/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-chart'] });
      toast.success('Expense logged!');
      setCreateExpenseOpen(false);
    }
  });

  const approveExpenseMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/finance/expenses/${id}/approve/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Expense approved!');
    }
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Finance & Billing</h1>
          <p className="text-xs sm:text-sm text-text-sub">Track and manage agency P&L, invoicing, proposals, and team expenses.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-card">
        <nav className="flex space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-text-sub hover:text-white'}`}
          >
            <DollarSign size={14} />
            P&L Overview
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-text-sub hover:text-white'}`}
          >
            <FileText size={14} />
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'proposals' ? 'border-primary text-primary' : 'border-transparent text-text-sub hover:text-white'}`}
          >
            <Layers size={14} />
            Proposals
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
              ${activeTab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-text-sub hover:text-white'}`}
          >
            <ShoppingBag size={14} />
            Expenses
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="transition-all duration-200">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-4xs font-bold text-text-sub uppercase tracking-wider">Invoiced This Month</span>
                  <h3 className="text-xl font-extrabold text-white mt-1.5">${parseFloat(summary.total_invoiced_this_month || '0').toLocaleString()}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><FileText size={18} /></div>
              </div>
              <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-4xs font-bold text-text-sub uppercase tracking-wider">Collected This Month</span>
                  <h3 className="text-xl font-extrabold text-success mt-1.5">${parseFloat(summary.total_collected_this_month || '0').toLocaleString()}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-success/10 text-success border border-success/20"><TrendingUp size={18} /></div>
              </div>
              <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-4xs font-bold text-text-sub uppercase tracking-wider">Expenses This Month</span>
                  <h3 className="text-xl font-extrabold text-danger mt-1.5">${parseFloat(summary.expenses_this_month || '0').toLocaleString()}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20"><TrendingDown size={18} /></div>
              </div>
              <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-4xs font-bold text-text-sub uppercase tracking-wider">Outstanding Invoices</span>
                  <h3 className="text-xl font-extrabold text-warning mt-1.5">${parseFloat(summary.outstanding_payments || '0').toLocaleString()}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-warning/10 text-warning border border-warning/20"><AlertCircle size={18} /></div>
              </div>
            </div>

            {/* P&L Chart */}
            <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">P&L Performance (Last 6 Months)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                    <YAxis stroke="#9CA3AF" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }} 
                      itemStyle={{ color: '#FFFFFF' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="revenue" fill="#6366F1" name="Revenue / Invoiced" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#EF4444" name="Expenses Logged" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-bg-card p-4 rounded-2xl border border-border-card shadow-md gap-3">
              <span className="text-xs font-semibold text-text-sub">Create, track, and record payments for invoices.</span>
              <button
                onClick={() => setCreateInvoiceOpen(true)}
                className="flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus size={14} className="mr-1" />
                Create Invoice
              </button>
            </div>

            {/* List */}
            <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-card text-text-sub font-bold uppercase tracking-wider bg-bg-main/40">
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Invoice Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/40">
                    {invoices.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-text-sub">No invoices generated yet.</td></tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-bg-main/30 transition-colors">
                          <td className="p-4 font-bold text-white">{inv.invoice_number}</td>
                          <td className="p-4 text-text-sub">{inv.client_detail?.company_name}</td>
                          <td className="p-4 text-text-sub">{inv.invoice_date}</td>
                          <td className="p-4 text-text-sub">{inv.due_date}</td>
                          <td className="p-4 font-bold text-white">${parseFloat(inv.total_amount).toLocaleString()}</td>
                          <td className="p-4"><StatusBadge label={inv.status} /></td>
                          <td className="p-4 text-right space-x-2">
                            {inv.status === 'Draft' && (
                              <button
                                onClick={() => sendInvoiceMutation.mutate(inv.id)}
                                className="px-2.5 py-1 text-4xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all"
                              >
                                Send
                              </button>
                            )}
                            {inv.status !== 'Paid' && inv.status !== 'Draft' && (
                              <button
                                onClick={() => setPayInvoiceId(inv.id)}
                                className="px-2.5 py-1 text-4xs font-bold text-white bg-success hover:bg-success/80 rounded-lg transition-all"
                              >
                                Record Pay
                              </button>
                            )}
                            {inv.pdf_file && (
                              <a
                                href={`${base_url}${inv.pdf_file}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1.5 bg-bg-main border border-border-card rounded-lg text-text-sub hover:text-white transition-colors"
                              >
                                <Printer size={12} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-bg-card p-4 rounded-2xl border border-border-card shadow-md gap-3">
              <span className="text-xs font-semibold text-text-sub">Draft proposals and scopes of work.</span>
              <button
                onClick={() => setCreateProposalOpen(true)}
                className="flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus size={14} className="mr-1" />
                Create Proposal
              </button>
            </div>

            {/* List */}
            <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-card text-text-sub font-bold uppercase tracking-wider bg-bg-main/40">
                      <th className="p-4">Proposal #</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Project Name</th>
                      <th className="p-4">Valid Until</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/40">
                    {proposals.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-text-sub">No proposals drafted.</td></tr>
                    ) : (
                      proposals.map((prop) => (
                        <tr key={prop.id} className="hover:bg-bg-main/30 transition-colors">
                          <td className="p-4 font-bold text-white">{prop.proposal_number}</td>
                          <td className="p-4 text-text-sub">{prop.client_detail?.company_name}</td>
                          <td className="p-4 text-text-sub">{prop.project_name}</td>
                          <td className="p-4 text-text-sub">{prop.valid_until}</td>
                          <td className="p-4"><StatusBadge label={prop.status} /></td>
                          <td className="p-4 text-right space-x-2">
                            {prop.status === 'Draft' && (
                              <button
                                onClick={() => sendProposalMutation.mutate(prop.id)}
                                className="px-2.5 py-1 text-4xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all"
                              >
                                Send
                              </button>
                            )}
                            {prop.pdf_file && (
                              <a
                                href={`${base_url}${prop.pdf_file}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex p-1.5 bg-bg-main border border-border-card rounded-lg text-text-sub hover:text-white transition-colors"
                              >
                                <Printer size={12} />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-bg-card p-4 rounded-2xl border border-border-card shadow-md gap-3">
              <span className="text-xs font-semibold text-text-sub">Track and reimburse internal expenses.</span>
              <button
                onClick={() => setCreateExpenseOpen(true)}
                className="flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus size={14} className="mr-1" />
                Log Expense
              </button>
            </div>

            {/* List */}
            <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-card text-text-sub font-bold uppercase tracking-wider bg-bg-main/40">
                      <th className="p-4">Category</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Expense Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-card/40">
                    {expenses.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-text-sub">No expenses logged.</td></tr>
                    ) : (
                      expenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-bg-main/30 transition-colors">
                          <td className="p-4 font-bold text-white">{exp.category}</td>
                          <td className="p-4 max-w-xs truncate text-text-sub">{exp.description}</td>
                          <td className="p-4 font-bold text-white">${parseFloat(exp.amount).toLocaleString()}</td>
                          <td className="p-4 text-text-sub">{exp.expense_date}</td>
                          <td className="p-4"><StatusBadge label={exp.status} /></td>
                          <td className="p-4 text-right">
                            {isAdminOrFinance && exp.status === 'Pending' && (
                              <button
                                onClick={() => approveExpenseMutation.mutate(exp.id)}
                                className="inline-flex p-1 bg-success/15 text-success hover:bg-success/20 border border-success/30 rounded-lg"
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {createInvoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateInvoiceOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-2xl rounded-2xl bg-bg-card p-6 shadow-xl border border-border-card">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create Invoice</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createInvoiceMutation.mutate(invoiceForm);
                }} 
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Client *</label>
                    <select
                      required
                      value={invoiceForm.client}
                      onChange={(e) => setInvoiceForm({...invoiceForm, client: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Client</option>
                      {clients.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Project (Optional)</label>
                    <select
                      value={invoiceForm.project}
                      onChange={(e) => setInvoiceForm({...invoiceForm, project: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select Project</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Invoice Date *</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.invoice_date}
                      onChange={(e) => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Due Date *</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.due_date}
                      onChange={(e) => setInvoiceForm({...invoiceForm, due_date: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Line Items Builder */}
                <div className="space-y-2 border-t border-border-card pt-4">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">Line Items</h4>
                  {invoiceForm.line_items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-5 space-y-1">
                        <label className="text-4xs text-text-sub font-bold uppercase">Description</label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.line_items];
                            newItems[idx].description = e.target.value;
                            setInvoiceForm({...invoiceForm, line_items: newItems});
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-bg-main border border-border-card rounded-lg text-white"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-4xs text-text-sub font-bold uppercase">Qty</label>
                        <input
                          type="number"
                          required
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.line_items];
                            newItems[idx].quantity = parseFloat(e.target.value);
                            setInvoiceForm({...invoiceForm, line_items: newItems});
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-bg-main border border-border-card rounded-lg text-white"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-4xs text-text-sub font-bold uppercase">Unit Price ($)</label>
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...invoiceForm.line_items];
                            newItems[idx].unit_price = parseFloat(e.target.value);
                            setInvoiceForm({...invoiceForm, line_items: newItems});
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-bg-main border border-border-card rounded-lg text-white"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = invoiceForm.line_items.filter((_, i) => i !== idx);
                            setInvoiceForm({...invoiceForm, line_items: newItems});
                          }}
                          className="text-danger hover:underline text-xs mb-2 block"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setInvoiceForm({
                      ...invoiceForm,
                      line_items: [...invoiceForm.line_items, { description: '', quantity: 1, unit_price: 0, tax_percent: 0, discount_percent: 0 }]
                    })}
                    className="text-2xs font-bold text-primary hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="flex justify-end space-x-3 border-t border-border-card pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateInvoiceOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-text-sub bg-bg-main hover:bg-bg-main/70 border border-border-card rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-colors"
                  >
                    Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payInvoiceId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPayInvoiceId(null)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-bg-card p-6 shadow-xl border border-border-card">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Record Payment</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (payInvoiceId) {
                    payInvoiceMutation.mutate({ id: payInvoiceId, body: paymentForm });
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Payment Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Payment Method *</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash / Cheque</option>
                    <option value="Stripe">Stripe / Online</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN987654321"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 border-t border-border-card pt-4">
                  <button
                    type="button"
                    onClick={() => setPayInvoiceId(null)}
                    className="px-4 py-2 text-xs font-semibold text-text-sub bg-bg-main hover:bg-bg-main/70 border border-border-card rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-success hover:bg-success/80 rounded-xl shadow-md transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log Expense Modal */}
      {createExpenseOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateExpenseOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-bg-card p-6 shadow-xl border border-border-card">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Log Expense</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createExpenseMutation.mutate(expenseForm);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  >
                    <option value="Software">SaaS Subscription</option>
                    <option value="Hardware">Hardware / Assets</option>
                    <option value="Marketing">Marketing / Ad Spend</option>
                    <option value="Salary">Developer Payroll / Contractor</option>
                    <option value="Office">Office Rent & Utilities</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Description / Details *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. AWS server hosting costs for client portal"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 border-t border-border-card pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateExpenseOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-text-sub bg-bg-main hover:bg-bg-main/70 border border-border-card rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-colors"
                  >
                    Log Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Proposal Modal */}
      {createProposalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateProposalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-xl rounded-2xl bg-bg-card p-6 shadow-xl border border-border-card">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Create Proposal</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createProposalMutation.mutate(proposalForm);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Client *</label>
                  <select
                    required
                    value={proposalForm.client}
                    onChange={(e) => setProposalForm({...proposalForm, client: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Project Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mobile Application V2"
                      value={proposalForm.project_name}
                      onChange={(e) => setProposalForm({...proposalForm, project_name: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-text-sub uppercase">Valid Until *</label>
                    <input
                      type="date"
                      required
                      value={proposalForm.valid_until}
                      onChange={(e) => setProposalForm({...proposalForm, valid_until: e.target.value})}
                      className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-3xs font-bold text-text-sub uppercase">Scope / Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide overview of the project deliverables..."
                    value={proposalForm.description}
                    onChange={(e) => setProposalForm({...proposalForm, description: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-bg-main border border-border-card rounded-xl text-white focus:outline-none"
                  />
                </div>

                {/* Line Items for proposal */}
                <div className="space-y-2 border-t border-border-card pt-4">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">Line Items</h4>
                  {proposalForm.line_items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-6 space-y-1">
                        <label className="text-4xs text-text-sub font-bold uppercase">Description</label>
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...proposalForm.line_items];
                            newItems[idx].description = e.target.value;
                            setProposalForm({...proposalForm, line_items: newItems});
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-bg-main border border-border-card rounded-lg text-white"
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-4xs text-text-sub font-bold uppercase">Estimated Cost ($)</label>
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => {
                            const newItems = [...proposalForm.line_items];
                            newItems[idx].unit_price = parseFloat(e.target.value);
                            setProposalForm({...proposalForm, line_items: newItems});
                          }}
                          className="w-full px-2 py-1.5 text-xs bg-bg-main border border-border-card rounded-lg text-white"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = proposalForm.line_items.filter((_, i) => i !== idx);
                            setProposalForm({...proposalForm, line_items: newItems});
                          }}
                          className="text-danger hover:underline text-xs mb-2 block"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setProposalForm({
                      ...proposalForm,
                      line_items: [...proposalForm.line_items, { description: '', quantity: 1, unit_price: 0, tax_percent: 0, discount_percent: 0 }]
                    })}
                    className="text-2xs font-bold text-primary hover:underline"
                  >
                    + Add Line Item
                  </button>
                </div>

                <div className="flex justify-end space-x-3 border-t border-border-card pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateProposalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-text-sub bg-bg-main hover:bg-bg-main/70 border border-border-card rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-md transition-colors"
                  >
                    Create Proposal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
