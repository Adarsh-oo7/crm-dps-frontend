import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  Plus, Search, List, Kanban, UserCheck, Trash, Phone, Mail, Globe,
  Clock, X, Calendar, AlertCircle, MessageCircle, StickyNote,
  Building2, User, Filter, CheckSquare, Square, Users
} from 'lucide-react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { useAuthStore } from '../../store/authStore';

type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Meeting Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Won'
  | 'Lost'
  | 'On Hold';

interface Member {
  id: number;
  full_name: string;
  email: string;
  role: string;
  avatar: string | null;
}

interface Lead {
  id: number;
  company_name: string;
  contact_person: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  lead_source: string;
  lead_score: number;
  status: LeadStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Hot';
  estimated_value: string;
  currency: string;
  notes: string | null;
  tags: string[];
  next_followup_date: string | null;
  next_followup_note: string | null;
  lost_reason: string | null;
  assigned_to: number | null;
  assigned_to_detail?: Member | null;
  project: number | null;
  product: number | null;
  project_detail?: { id: number; name: string } | null;
  product_detail?: { id: number; name: string } | null;
  created_at: string;
}

interface Activity {
  id: number;
  activity_type: string;
  description: string;
  created_at: string;
  user_detail?: Member | null;
}

const OPEN_STAGES: LeadStatus[] = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation'];
const CLOSED_STAGES: LeadStatus[] = ['Won', 'Lost', 'On Hold'];
const ALL_STAGES: LeadStatus[] = [...OPEN_STAGES, ...CLOSED_STAGES];

const STAGE_META: Record<LeadStatus, { hint: string; next: string }> = {
  New: { hint: 'Just arrived', next: 'Call or WhatsApp them' },
  Contacted: { hint: 'You reached out', next: 'Book a meeting' },
  'Meeting Scheduled': { hint: 'Call is booked', next: 'Send a proposal' },
  'Proposal Sent': { hint: 'Quote is out', next: 'Follow up on price' },
  Negotiation: { hint: 'Talking terms', next: 'Win or pause' },
  Won: { hint: 'Became a client', next: 'Convert if needed' },
  Lost: { hint: 'Did not close', next: 'Note the reason' },
  'On Hold': { hint: 'Paused for now', next: 'Set a follow-up' },
};

const SOURCES = ['WhatsApp', 'Website', 'LinkedIn', 'Referral', 'Cold Email', 'Event', 'Other'];
const ACTIVITY_TYPES = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Note', 'Follow-up', 'Proposal Sent'];

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function money(value: string | number, currency = 'INR') {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

function isDueToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function waLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function leadPayload(form: Partial<Lead>) {
  return {
    company_name: form.company_name,
    contact_person: form.contact_person,
    email: form.email || null,
    phone: form.phone || null,
    website: form.website || null,
    industry: form.industry || null,
    lead_source: form.lead_source || 'WhatsApp',
    lead_score: form.lead_score ?? 50,
    status: form.status || 'New',
    priority: form.priority || 'Medium',
    estimated_value: form.estimated_value || '0',
    currency: form.currency || 'INR',
    notes: form.notes || '',
    tags: form.tags || [],
    next_followup_date: form.next_followup_date || null,
    next_followup_note: form.next_followup_note || '',
    lost_reason: form.lost_reason || '',
    assigned_to: form.assigned_to || null,
    project: form.project || null,
    product: form.product || null,
  };
}

const emptyForm: Partial<Lead> = {
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  website: '',
  industry: '',
  lead_source: 'WhatsApp',
  lead_score: 50,
  status: 'New',
  priority: 'Medium',
  estimated_value: '0',
  currency: 'INR',
  notes: '',
  tags: [],
  next_followup_date: null,
  next_followup_note: '',
  lost_reason: '',
  assigned_to: null,
  project: null,
  product: null,
};

export default function Leads() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'details' | 'activity'>('details');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [pendingLostStatus, setPendingLostStatus] = useState<LeadStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Lead>>(emptyForm);
  const [tagInput, setTagInput] = useState('');
  const [lostReason, setLostReason] = useState('');

  const [activityType, setActivityType] = useState('Note');
  const [activityText, setActivityText] = useState('');
  const [followupAt, setFollowupAt] = useState('');
  const [followupNote, setFollowupNote] = useState('');
  const [bulkUserId, setBulkUserId] = useState('');

  const { data: projects = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/api/projects/').then(asList<{ id: number; name: string }>),
  });

  const { data: products = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['products'],
    queryFn: () => apiClient('/api/products/products/').then(asList<{ id: number; name: string }>),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => apiClient('/api/team/members/').then(asList<Member>),
  });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiClient('/api/leads/').then(asList<Lead>),
  });

  const { data: activities = [], isFetching: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ['lead-activities', selectedLead?.id],
    queryFn: () => apiClient(`/api/leads/${selectedLead!.id}/activities/`).then(asList<Activity>),
    enabled: drawerOpen && !!selectedLead,
  });

  const refreshLeads = () => queryClient.invalidateQueries({ queryKey: ['leads'] });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Lead>) => apiClient('/api/leads/', { method: 'POST', body: leadPayload(payload) }),
    onSuccess: () => {
      refreshLeads();
      toast.success('Lead added to New');
      setCreateModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create lead'),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<Lead> }) =>
      apiClient(`/api/leads/${vars.id}/`, { method: 'PUT', body: leadPayload(vars.data) }),
    onSuccess: (updated: Lead) => {
      refreshLeads();
      toast.success('Lead saved');
      setCreateModalOpen(false);
      setSelectedLead(updated);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not save lead'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/leads/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      refreshLeads();
      toast.success('Lead deleted');
      setDeleteModalOpen(false);
      setDrawerOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not delete lead'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/leads/${id}/convert/`, { method: 'POST' }),
    onSuccess: () => {
      refreshLeads();
      toast.success('Converted to a client');
      setConvertModalOpen(false);
      setDrawerOpen(false);
      navigate('/clients');
    },
    onError: (err: Error) => toast.error(err.message || 'Conversion failed'),
  });

  const moveMutation = useMutation({
    mutationFn: (vars: { id: number; status: LeadStatus; lost_reason?: string }) =>
      apiClient(`/api/leads/${vars.id}/move-stage/`, { method: 'PATCH', body: { status: vars.status } }).then(async (lead: Lead) => {
        if (vars.status === 'Lost' && vars.lost_reason) {
          await apiClient(`/api/leads/${vars.id}/`, {
            method: 'PUT',
            body: leadPayload({ ...lead, status: 'Lost', lost_reason: vars.lost_reason }),
          });
        }
        return lead;
      }),
    onSuccess: (_, vars) => {
      refreshLeads();
      queryClient.invalidateQueries({ queryKey: ['lead-activities', vars.id] });
      toast.success(`Moved to ${vars.status}`);
    },
    onError: () => toast.error('Could not move lead'),
  });

  const activityMutation = useMutation({
    mutationFn: (vars: { leadId: number; activity_type: string; description: string }) =>
      apiClient(`/api/leads/${vars.leadId}/activities/`, {
        method: 'POST',
        body: { activity_type: vars.activity_type, description: vars.description, lead: vars.leadId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', selectedLead?.id] });
      toast.success('Activity logged');
      setActivityText('');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not log activity'),
  });

  const followupMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const iso = fromLocalInput(followupAt);
      if (!iso) throw new Error('Pick a follow-up date and time');
      await apiClient(`/api/leads/${lead.id}/`, {
        method: 'PUT',
        body: leadPayload({ ...lead, next_followup_date: iso, next_followup_note: followupNote }),
      });
      await apiClient('/api/followups/', {
        method: 'POST',
        body: {
          title: `Follow up: ${lead.company_name}`,
          description: followupNote || lead.next_followup_note || '',
          follow_up_type: 'WhatsApp',
          related_to_type: 'Lead',
          related_to_id: lead.id,
          scheduled_at: iso,
          assigned_to: lead.assigned_to || currentUser?.id || null,
        },
      });
      await apiClient(`/api/leads/${lead.id}/activities/`, {
        method: 'POST',
        body: {
          activity_type: 'Follow-up',
          description: `Follow-up set for ${new Date(iso).toLocaleString()} — ${followupNote || 'No note'}`,
          lead: lead.id,
        },
      });
    },
    onSuccess: () => {
      refreshLeads();
      queryClient.invalidateQueries({ queryKey: ['lead-activities', selectedLead?.id] });
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up scheduled');
      setFollowupAt('');
      setFollowupNote('');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not schedule follow-up'),
  });

  const bulkAssignMutation = useMutation({
    mutationFn: () =>
      apiClient('/api/leads/bulk-assign/', {
        method: 'POST',
        body: { lead_ids: selectedIds, user_id: Number(bulkUserId) },
      }),
    onSuccess: () => {
      refreshLeads();
      toast.success(`Assigned ${selectedIds.length} lead${selectedIds.length === 1 ? '' : 's'}`);
      setSelectedIds([]);
      setBulkUserId('');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not assign leads'),
  });

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return leads.filter((lead) => {
      const hay = `${lead.company_name} ${lead.contact_person} ${lead.email || ''} ${lead.phone || ''} ${lead.industry || ''}`.toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesStatus = statusFilter ? lead.status === statusFilter : true;
      const matchesPriority = priorityFilter ? lead.priority === priorityFilter : true;
      const matchesSource = sourceFilter ? lead.lead_source === sourceFilter : true;
      const matchesAssignee = assigneeFilter
        ? assigneeFilter === 'unassigned'
          ? !lead.assigned_to
          : String(lead.assigned_to) === assigneeFilter
        : true;
      return matchesSearch && matchesStatus && matchesPriority && matchesSource && matchesAssignee;
    });
  }, [leads, searchTerm, statusFilter, priorityFilter, sourceFilter, assigneeFilter]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => OPEN_STAGES.includes(l.status));
    const hot = leads.filter((l) => l.priority === 'Hot' && l.status !== 'Won' && l.status !== 'Lost');
    const follow = leads.filter((l) => isOverdue(l.next_followup_date) || isDueToday(l.next_followup_date));
    const won = leads.filter((l) => l.status === 'Won');
    const value = open.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
    return { open: open.length, hot: hot.length, follow: follow.length, won: won.length, value };
  }, [leads]);

  const boardStages = showClosed || statusFilter ? (statusFilter ? [statusFilter as LeadStatus] : ALL_STAGES) : OPEN_STAGES;

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({ ...emptyForm, assigned_to: currentUser?.id || null });
    setTagInput('');
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setIsEditing(true);
    setSelectedLead(lead);
    setFormData({
      ...lead,
      assigned_to: lead.assigned_to,
      project: lead.project,
      product: lead.product,
    });
    setTagInput((lead.tags || []).join(', '));
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = { ...formData, tags };
    if (isEditing && selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerTab('details');
    setFollowupAt(toLocalInput(lead.next_followup_date));
    setFollowupNote(lead.next_followup_note || '');
    setDrawerOpen(true);
  };

  const requestMove = (lead: Lead, status: LeadStatus) => {
    if (status === 'Lost') {
      setSelectedLead(lead);
      setPendingLostStatus(status);
      setLostReason(lead.lost_reason || '');
      setLostModalOpen(true);
      return;
    }
    moveMutation.mutate({ id: lead.id, status });
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    requestMove(lead, status);
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const visibleLeadIds = filteredLeads.map((l) => l.id);
  const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every((id) => selectedIds.includes(id));

  const columns = [
    {
      header: '',
      accessor: (row: Lead) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleSelected(row.id);
          }}
          className="text-wa-icon hover:text-primary"
        >
          {selectedIds.includes(row.id) ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      ),
    },
    {
      header: 'Company',
      accessor: (row: Lead) => (
        <div>
          <div className="font-semibold text-text-main">{row.company_name}</div>
          <div className="text-xs text-text-sub">{row.contact_person}</div>
        </div>
      ),
    },
    { header: 'Source', accessor: (row: Lead) => row.lead_source || '—' },
    { header: 'Stage', accessor: (row: Lead) => <StatusBadge label={row.status} /> },
    { header: 'Priority', accessor: (row: Lead) => <PriorityBadge label={row.priority} /> },
    {
      header: 'Value',
      accessor: (row: Lead) => <span className="font-medium">{money(row.estimated_value, row.currency)}</span>,
    },
    {
      header: 'Owner',
      accessor: (row: Lead) =>
        row.assigned_to_detail ? (
          <div className="flex items-center gap-2">
            <UserAvatar name={row.assigned_to_detail.full_name} avatarUrl={row.assigned_to_detail.avatar} size="sm" />
            <span className="text-xs">{row.assigned_to_detail.full_name}</span>
          </div>
        ) : (
          <span className="text-text-sub">Unassigned</span>
        ),
    },
    {
      header: 'Follow-up',
      accessor: (row: Lead) => (
        <span className={isOverdue(row.next_followup_date) ? 'text-danger font-semibold' : ''}>
          <DateDisplay dateString={row.next_followup_date} includeTime />
        </span>
      ),
    },
    {
      header: '',
      accessor: (row: Lead) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.phone && (
            <a href={`tel:${row.phone}`} className="p-1.5 rounded-full hover:bg-wa-hover text-wa-icon" title="Call">
              <Phone size={14} />
            </a>
          )}
          {waLink(row.phone) && (
            <a href={waLink(row.phone)!} target="_blank" rel="noreferrer" className="p-1.5 rounded-full hover:bg-wa-hover text-primary" title="WhatsApp">
              <MessageCircle size={14} />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Toaster
        position="top-right"
        toastOptions={{ style: { background: '#202C33', color: '#E9EDEF', border: '1px solid #2A3942' } }}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-main">Leads</h1>
          <p className="text-sm text-text-sub">
            Everyone you are talking to about a deal. Drag a card to move it. Open a card to call, WhatsApp, or convert.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-wa-panel rounded-full p-0.5 border border-border-card">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-primary text-[#111B21]' : 'text-text-sub hover:text-text-main'}`}
            >
              <Kanban size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${viewMode === 'list' ? 'bg-primary text-[#111B21]' : 'text-text-sub hover:text-text-main'}`}
            >
              <List size={14} /> List
            </button>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2 text-sm font-semibold text-[#111B21] bg-primary hover:bg-primary-dark rounded-full"
          >
            <Plus size={16} className="mr-1" /> New lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open deals', value: stats.open, sub: 'In the pipeline' },
          { label: 'Pipeline value', value: money(stats.value), sub: 'Open deals only' },
          { label: 'Need follow-up', value: stats.follow, sub: 'Today or overdue', warn: stats.follow > 0 },
          { label: 'Hot / Won', value: `${stats.hot} hot · ${stats.won} won`, sub: 'Priority + closed' },
        ].map((card) => (
          <div key={card.label} className="bg-bg-card border border-border-card rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-text-sub">{card.label}</p>
            <p className={`text-lg font-semibold mt-1 ${card.warn ? 'text-warning' : 'text-text-main'}`}>{card.value}</p>
            <p className="text-xs text-text-sub mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-card rounded-xl p-3 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${!statusFilter ? 'bg-primary text-[#111B21]' : 'bg-wa-panel text-text-sub hover:text-text-main'}`}
          >
            All ({leads.length})
          </button>
          {ALL_STAGES.map((stage) => {
            const count = leads.filter((l) => l.status === stage).length;
            return (
              <button
                key={stage}
                onClick={() => setStatusFilter(statusFilter === stage ? '' : stage)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${statusFilter === stage ? 'bg-primary text-[#111B21]' : 'bg-wa-panel text-text-sub hover:text-text-main'}`}
              >
                {stage} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-wa-icon" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search company, person, phone, email..."
              className="w-full py-2 pl-9 pr-3 text-sm bg-wa-panel border-0 rounded-lg"
            />
          </div>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="px-3 py-2 text-sm bg-wa-panel border-0 rounded-lg">
            <option value="">All sources</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 text-sm bg-wa-panel border-0 rounded-lg">
            <option value="">All priorities</option>
            {['Hot', 'High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="px-3 py-2 text-sm bg-wa-panel border-0 rounded-lg">
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
            ))}
          </select>
          {viewMode === 'kanban' && (
            <button
              onClick={() => setShowClosed((v) => !v)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border ${showClosed ? 'border-primary text-primary' : 'border-border-card text-text-sub'}`}
            >
              <Filter size={12} className="inline mr-1" />
              {showClosed ? 'Hide closed' : 'Show Won / Lost'}
            </button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-wa-panel rounded-lg px-3 py-2">
            <Users size={14} className="text-primary" />
            <span className="text-xs text-text-main font-medium">{selectedIds.length} selected</span>
            <select value={bulkUserId} onChange={(e) => setBulkUserId(e.target.value)} className="px-2 py-1 text-xs bg-bg-card rounded-md">
              <option value="">Assign to...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
              ))}
            </select>
            <button
              disabled={!bulkUserId || bulkAssignMutation.isPending}
              onClick={() => bulkAssignMutation.mutate()}
              className="px-3 py-1 text-xs font-semibold bg-primary text-[#111B21] rounded-full disabled:opacity-50"
            >
              Assign
            </button>
            <button onClick={() => setSelectedIds([])} className="text-xs text-text-sub hover:text-text-main">Clear</button>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredLeads}
          isLoading={isLoading}
          onRowClick={openLead}
          emptyMessage="No leads match these filters."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 min-h-[520px]">
          {boardStages.map((stage) => {
            const stageLeads = filteredLeads.filter((l) => l.status === stage);
            const stageValue = stageLeads.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex-1 min-w-[260px] max-w-[300px] bg-wa-panel border border-border-card rounded-xl p-2.5 flex flex-col"
              >
                <div className="px-1.5 py-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-main">{stage}</h3>
                    <span className="text-[11px] font-bold bg-bg-card text-text-sub px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <p className="text-[11px] text-text-sub mt-0.5">{STAGE_META[stage].hint} · {money(stageValue)}</p>
                </div>
                <div className="space-y-2 overflow-y-auto flex-1 min-h-[180px] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="h-28 border border-dashed border-border-card rounded-xl flex items-center justify-center text-center px-3 text-xs text-text-sub">
                      Drop here when: {STAGE_META[stage].next}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(lead.id))}
                        onClick={() => openLead(lead)}
                        className="bg-bg-card p-3 rounded-xl border border-border-card cursor-grab active:cursor-grabbing hover:border-primary/40 space-y-2"
                      >
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-text-main truncate">{lead.company_name}</p>
                            <p className="text-xs text-text-sub truncate">{lead.contact_person}</p>
                          </div>
                          <PriorityBadge label={lead.priority} />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-primary font-semibold">{money(lead.estimated_value, lead.currency)}</span>
                          <span className="text-text-sub">{lead.lead_source}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          {lead.assigned_to_detail ? (
                            <UserAvatar name={lead.assigned_to_detail.full_name} avatarUrl={lead.assigned_to_detail.avatar} size="sm" />
                          ) : (
                            <span className="text-[11px] text-text-sub">No owner</span>
                          )}
                          {lead.next_followup_date && (
                            <span className={`flex items-center text-[11px] ${isOverdue(lead.next_followup_date) ? 'text-danger' : 'text-warning'}`}>
                              <Clock size={10} className="mr-1" />
                              <DateDisplay dateString={lead.next_followup_date} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && filteredLeads.length > 0 && (
        <button
          type="button"
          onClick={() => setSelectedIds(allVisibleSelected ? [] : visibleLeadIds)}
          className="text-xs text-primary hover:underline"
        >
          {allVisibleSelected ? 'Clear selection' : 'Select all in this list'}
        </button>
      )}

      {drawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-bg-card shadow-xl flex flex-col border-l border-border-card">
            <div className="h-[60px] px-4 bg-wa-header flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary text-[#111B21] flex items-center justify-center font-bold">
                {selectedLead.company_name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-text-main truncate">{selectedLead.company_name}</p>
                <p className="text-[12px] text-text-sub truncate">{selectedLead.contact_person} · {selectedLead.status}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-wa-hover text-wa-icon">
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 flex gap-2 border-b border-border-card">
              {selectedLead.phone && (
                <a href={`tel:${selectedLead.phone}`} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-wa-panel text-xs text-text-main">
                  <Phone size={16} className="text-primary" /> Call
                </a>
              )}
              {waLink(selectedLead.phone) && (
                <a href={waLink(selectedLead.phone)!} target="_blank" rel="noreferrer" className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-wa-panel text-xs text-text-main">
                  <MessageCircle size={16} className="text-primary" /> WhatsApp
                </a>
              )}
              {selectedLead.email && (
                <a href={`mailto:${selectedLead.email}`} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-wa-panel text-xs text-text-main">
                  <Mail size={16} className="text-primary" /> Email
                </a>
              )}
            </div>

            <div className="flex border-b border-border-card">
              {(['details', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-semibold capitalize ${drawerTab === tab ? 'text-primary border-b-2 border-primary' : 'text-text-sub'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'details' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 bg-wa-panel rounded-xl p-3">
                    <div>
                      <p className="text-[11px] text-text-sub">Value</p>
                      <p className="font-semibold">{money(selectedLead.estimated_value, selectedLead.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-text-sub">Score</p>
                      <p className="font-semibold text-primary">{selectedLead.lead_score}/100</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-text-sub">Source</p>
                      <p className="font-medium">{selectedLead.lead_source}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-text-sub">Priority</p>
                      <PriorityBadge label={selectedLead.priority} />
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-text-sub mb-1">Move to stage</p>
                    <select
                      value={selectedLead.status}
                      onChange={(e) => requestMove(selectedLead, e.target.value as LeadStatus)}
                      className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg"
                    >
                      {ALL_STAGES.map((s) => <option key={s} value={s}>{s} — {STAGE_META[s].hint}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2 text-sm">
                    {selectedLead.phone && (
                      <p className="flex items-center gap-2"><Phone size={14} className="text-wa-icon" /> {selectedLead.phone}</p>
                    )}
                    {selectedLead.email && (
                      <p className="flex items-center gap-2"><Mail size={14} className="text-wa-icon" /> {selectedLead.email}</p>
                    )}
                    {selectedLead.website && (
                      <a href={selectedLead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary">
                        <Globe size={14} /> {selectedLead.website}
                      </a>
                    )}
                    {selectedLead.industry && (
                      <p className="flex items-center gap-2"><Building2 size={14} className="text-wa-icon" /> {selectedLead.industry}</p>
                    )}
                    <p className="flex items-center gap-2">
                      <User size={14} className="text-wa-icon" />
                      {selectedLead.assigned_to_detail?.full_name || 'Unassigned'}
                    </p>
                  </div>

                  {selectedLead.notes && (
                    <div className="bg-wa-outgoing/40 border border-primary/20 rounded-xl rounded-bl-sm p-3 text-sm whitespace-pre-wrap">
                      {selectedLead.notes}
                    </div>
                  )}

                  {selectedLead.lost_reason && (
                    <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-sm">
                      <p className="text-[11px] font-bold text-danger uppercase">Lost reason</p>
                      {selectedLead.lost_reason}
                    </div>
                  )}

                  <div className="bg-wa-panel rounded-xl p-3 space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1"><Calendar size={14} className="text-primary" /> Next follow-up</p>
                    <input
                      type="datetime-local"
                      value={followupAt}
                      onChange={(e) => setFollowupAt(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-bg-card rounded-lg"
                    />
                    <input
                      value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)}
                      placeholder="What should we say next time?"
                      className="w-full px-3 py-2 text-sm bg-bg-card rounded-lg"
                    />
                    <button
                      onClick={() => followupMutation.mutate(selectedLead)}
                      disabled={followupMutation.isPending}
                      className="w-full py-2 text-sm font-semibold bg-primary text-[#111B21] rounded-full disabled:opacity-50"
                    >
                      Save follow-up
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="bg-wa-panel rounded-xl p-3 space-y-2">
                    <p className="text-sm font-semibold">Log what happened</p>
                    <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full px-3 py-2 text-sm bg-bg-card rounded-lg">
                      {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <textarea
                      value={activityText}
                      onChange={(e) => setActivityText(e.target.value)}
                      rows={3}
                      placeholder="Short note: called, sent quote, waiting on GST..."
                      className="w-full px-3 py-2 text-sm bg-bg-card rounded-lg"
                    />
                    <button
                      disabled={!activityText.trim() || activityMutation.isPending}
                      onClick={() =>
                        activityMutation.mutate({
                          leadId: selectedLead.id,
                          activity_type: activityType,
                          description: activityText.trim(),
                        })
                      }
                      className="w-full py-2 text-sm font-semibold bg-primary text-[#111B21] rounded-full disabled:opacity-50"
                    >
                      <StickyNote size={14} className="inline mr-1" /> Add to timeline
                    </button>
                  </div>

                  {activitiesLoading && <p className="text-xs text-text-sub">Loading timeline...</p>}
                  {activities.length === 0 && !activitiesLoading && (
                    <p className="text-sm text-text-sub text-center py-8">No activity yet. Log the first call or WhatsApp.</p>
                  )}
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="bg-wa-panel rounded-xl rounded-bl-sm p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-primary uppercase">{act.activity_type}</span>
                          <DateDisplay dateString={act.created_at} includeTime />
                        </div>
                        <p className="text-sm text-text-main">{act.description}</p>
                        <p className="text-[11px] text-text-sub mt-1">{act.user_detail?.full_name || 'Team'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-card bg-wa-header flex items-center justify-between gap-2">
              <button onClick={() => setDeleteModalOpen(true)} className="p-2 text-danger hover:bg-danger/10 rounded-full">
                <Trash size={18} />
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(selectedLead)}
                  className="px-4 py-2 text-sm font-medium border border-border-card rounded-full hover:bg-wa-hover"
                >
                  Edit
                </button>
                {selectedLead.status !== 'Won' && (
                  <button
                    onClick={() => setConvertModalOpen(true)}
                    className="flex items-center px-4 py-2 text-sm font-semibold bg-primary text-[#111B21] rounded-full"
                  >
                    <UserCheck size={14} className="mr-1" /> Make client
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60" onClick={() => setCreateModalOpen(false)} />
          <div className="flex min-h-screen items-start justify-center p-4 pt-10">
            <form onSubmit={handleFormSubmit} className="relative w-full max-w-2xl bg-bg-card rounded-xl border border-border-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{isEditing ? 'Edit lead' : 'New lead'}</h2>
                  <p className="text-xs text-text-sub">Company and contact are enough to start. Add the rest as you learn more.</p>
                </div>
                <button type="button" onClick={() => setCreateModalOpen(false)} className="p-2 rounded-full hover:bg-wa-hover">
                  <X size={18} />
                </button>
              </div>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Who is this?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-text-sub space-y-1">
                    Company *
                    <input required value={formData.company_name || ''} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Contact person *
                    <input required value={formData.contact_person || ''} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Phone / WhatsApp
                    <input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" placeholder="+91..." />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Email
                    <input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">The deal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-text-sub space-y-1">
                    Estimated value
                    <input value={formData.estimated_value || ''} onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Currency
                    <select value={formData.currency || 'INR'} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    How they found us
                    <select value={formData.lead_source} onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Priority
                    <select value={formData.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value as Lead['priority'] })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      {['Hot', 'High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Stage
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Owner
                    <select
                      value={formData.assigned_to || ''}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value ? Number(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => <option key={m.id} value={m.id}>{m.full_name || m.email}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1 sm:col-span-2">
                    Lead score ({formData.lead_score || 50}/100)
                    <input type="range" min={1} max={100} value={formData.lead_score || 50} onChange={(e) => setFormData({ ...formData, lead_score: Number(e.target.value) })} className="w-full accent-primary" />
                  </label>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Context</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs text-text-sub space-y-1">
                    Industry
                    <input value={formData.industry || ''} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Website
                    <input value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" placeholder="https://" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Related project
                    <select value={formData.project || ''} onChange={(e) => setFormData({ ...formData, project: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      <option value="">None</option>
                      {projects.map((p: { id: number; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Related product
                    <select value={formData.product || ''} onChange={(e) => setFormData({ ...formData, product: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg">
                      <option value="">None</option>
                      {products.map((p: { id: number; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Next follow-up
                    <input
                      type="datetime-local"
                      value={toLocalInput(formData.next_followup_date || null)}
                      onChange={(e) => setFormData({ ...formData, next_followup_date: fromLocalInput(e.target.value) })}
                      className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg"
                    />
                  </label>
                  <label className="text-xs text-text-sub space-y-1">
                    Follow-up note
                    <input value={formData.next_followup_note || ''} onChange={(e) => setFormData({ ...formData, next_followup_note: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                  <label className="text-xs text-text-sub space-y-1 sm:col-span-2">
                    Tags (comma separated)
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" placeholder="saas, kerala, referral" />
                  </label>
                  {formData.status === 'Lost' && (
                    <label className="text-xs text-text-sub space-y-1 sm:col-span-2">
                      Why did we lose this?
                      <input value={formData.lost_reason || ''} onChange={(e) => setFormData({ ...formData, lost_reason: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                    </label>
                  )}
                  <label className="text-xs text-text-sub space-y-1 sm:col-span-2">
                    Notes
                    <textarea rows={3} value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg" />
                  </label>
                </div>
              </section>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-sm rounded-full border border-border-card">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold bg-primary text-[#111B21] rounded-full disabled:opacity-50"
                >
                  {isEditing ? 'Save lead' : 'Add to pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lostModalOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-black/60" onClick={() => setLostModalOpen(false)} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-bg-card rounded-xl border border-border-card p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-danger shrink-0" size={20} />
                <div>
                  <h3 className="font-semibold">Mark as lost?</h3>
                  <p className="text-sm text-text-sub mt-1">A short reason helps the team avoid repeating this.</p>
                </div>
              </div>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                rows={3}
                placeholder="Price, timing, chose another vendor..."
                className="w-full px-3 py-2 text-sm bg-wa-panel rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setLostModalOpen(false)} className="px-4 py-2 text-sm rounded-full border border-border-card">Cancel</button>
                <button
                  onClick={() => {
                    if (!selectedLead || !pendingLostStatus) return;
                    moveMutation.mutate({ id: selectedLead.id, status: pendingLostStatus, lost_reason: lostReason });
                    setLostModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-semibold bg-danger text-white rounded-full"
                >
                  Mark lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={convertModalOpen}
        title="Make this a client?"
        message={`${selectedLead?.company_name} will be marked Won and added to Clients with ${selectedLead?.contact_person} as the primary contact.`}
        confirmLabel="Convert now"
        isSubmitting={convertMutation.isPending}
        onConfirm={() => selectedLead && convertMutation.mutate(selectedLead.id)}
        onCancel={() => setConvertModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete this lead?"
        message={`${selectedLead?.company_name} will be removed. This cannot be undone.`}
        confirmLabel="Delete"
        isSubmitting={deleteMutation.isPending}
        onConfirm={() => selectedLead && deleteMutation.mutate(selectedLead.id)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
