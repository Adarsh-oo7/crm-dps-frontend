import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  Plus, Search, List, Kanban, Info, UserCheck, Trash, 
  MessageSquare, Phone, Mail, Globe, Clock, ChevronRight, X, Calendar, AlertCircle
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
  status: 'New' | 'Contacted' | 'Meeting Scheduled' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost' | 'On Hold';
  priority: 'Low' | 'Medium' | 'High' | 'Hot';
  estimated_value: string;
  currency: string;
  notes: string | null;
  tags: string[];
  next_followup_date: string | null;
  next_followup_note: string | null;
  lost_reason: string | null;
  assigned_to: number | null;
  assigned_to_detail?: { id: number; full_name: string; email: string; avatar: string | null };
  project: number | null;
  product: number | null;
  project_detail?: { id: number; name: string };
  product_detail?: { id: number; name: string };
  created_at: string;
}

export default function Leads() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  
  // Selected Lead for Drawers/Modals
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Lead>>({
    company_name: '', contact_person: '', email: '', phone: '', website: '',
    industry: '', lead_source: 'LinkedIn', lead_score: 50, status: 'New',
    priority: 'Medium', estimated_value: '0.00', notes: '', tags: [],
    project: null, product: null
  });

  // Query: Projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/api/projects/').then(res => res.results || res)
  });

  // Query: Products
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['products'],
    queryFn: () => apiClient('/api/products/products/').then(res => res.results || res)
  });

  // Query: Users (for assignment dropdown)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: () => apiClient('/api/auth/me/').then(() => apiClient('/api/auth/me/').then(() => [
      { id: 1, full_name: 'Sarah Manager', role: 'manager' },
      { id: 2, full_name: 'Alex Developer', role: 'developer' },
      { id: 3, full_name: 'Emma Designer', role: 'designer' },
      { id: 4, full_name: 'Bob Finance', role: 'finance' },
    ])) // Mock listing fallback since we only have auth details right now
  });

  // Query: Leads list
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => apiClient('/api/leads/')
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newLead: Partial<Lead>) => apiClient('/api/leads/', { method: 'POST', body: newLead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created successfully!');
      setCreateModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create lead')
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<Lead> }) => apiClient(`/api/leads/${vars.id}/`, { method: 'PUT', body: vars.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully!');
      setCreateModalOpen(false);
      setDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update lead')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/leads/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully!');
      setDeleteModalOpen(false);
      setDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete lead')
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/leads/${id}/convert/`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead converted to Client successfully!');
      setConvertModalOpen(false);
      setDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Conversion failed')
  });

  // Drag and Drop (HTML5)
  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData('text/plain', leadId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusStage: Lead['status']) => {
    e.preventDefault();
    const leadIdStr = e.dataTransfer.getData('text/plain');
    if (!leadIdStr) return;
    const leadId = parseInt(leadIdStr);
    
    // Optimistic UI update
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === statusStage) return;

    try {
      await apiClient(`/api/leads/${leadId}/move-stage/`, {
        method: 'PATCH',
        body: { status: statusStage }
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Moved lead to ${statusStage}`);
    } catch (err) {
      toast.error('Failed to move lead stage');
    }
  };

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter ? lead.status === statusFilter : true;
    const matchesPriority = priorityFilter ? lead.priority === priorityFilter : true;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Open forms
  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      company_name: '', contact_person: '', email: '', phone: '', website: '',
      industry: '', lead_source: 'LinkedIn', lead_score: 50, status: 'New',
      priority: 'Medium', estimated_value: '0.00', notes: '', tags: [],
      project: null, product: null
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setIsEditing(true);
    setSelectedLead(lead);
    setFormData(lead);
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedLead) {
      updateMutation.mutate({ id: selectedLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const columns = [
    { 
      header: 'Company / Contact', 
      accessor: (row: Lead) => (
        <div>
          <div className="font-semibold text-white">{row.company_name}</div>
          <div className="text-xs text-text-sub">{row.contact_person}</div>
        </div>
      ) 
    },
    { header: 'Email', accessor: (row: Lead) => row.email || '—' },
    { header: 'Status', accessor: (row: Lead) => <StatusBadge label={row.status} /> },
    { header: 'Priority', accessor: (row: Lead) => <PriorityBadge label={row.priority} /> },
    { header: 'Score', accessor: (row: Lead) => <span className="font-bold text-primary">{row.lead_score}/100</span> },
    { header: 'Est. Value', accessor: (row: Lead) => <span className="font-medium">${parseFloat(row.estimated_value).toLocaleString()}</span> },
    { header: 'Next Follow-up', accessor: (row: Lead) => <DateDisplay dateString={row.next_followup_date} /> },
  ];

  const kanbanStages: Lead['status'][] = [
    'New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads CRM</h1>
          <p className="text-sm text-text-sub">Track and manage your sales pipeline and deal closures.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex bg-bg-main rounded-lg p-0.5 border border-border-card">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-bg-card shadow-lg text-primary' : 'text-text-sub hover:text-white'} transition-all`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md ${viewMode === 'kanban' ? 'bg-bg-card shadow-lg text-primary' : 'text-text-sub hover:text-white'} transition-all`}
            >
              <Kanban size={18} />
            </button>
          </div>
          
          {/* Add button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-all duration-200"
          >
            <Plus size={18} className="mr-1.5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-bg-card p-4 rounded-2xl border border-border-card shadow-lg">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-sub/70">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search company, contact name, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="On Hold">On Hold</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Hot">Hot</option>
          </select>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredLeads}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          emptyMessage="No leads found."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 min-h-[calc(100vh-280px)]">
          {kanbanStages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.status === stage);
            return (
              <div 
                key={stage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex-1 min-w-[280px] max-w-[320px] bg-bg-main border border-border-card rounded-2xl p-3 flex flex-col h-full"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="font-semibold text-white text-sm flex items-center">
                    {stage}
                    <span className="ml-2 px-2 py-0.5 text-2xs font-bold bg-bg-main text-white rounded-full">
                      {stageLeads.length}
                    </span>
                  </h3>
                </div>

                {/* Column Body / Cards */}
                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] flex-1 min-h-[150px]">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border border-dashed border-border-card rounded-lg text-center text-xs text-text-sub/70">
                      Drag leads here
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => handleRowClick(lead)}
                        className="bg-bg-card p-4 rounded-lg border border-border-card shadow-lg hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-sm truncate max-w-[80%]">{lead.company_name}</h4>
                          <span className="text-2xs font-bold text-primary bg-primary-light px-1.5 py-0.5 rounded">
                            {lead.lead_score}
                          </span>
                        </div>
                        
                        <p className="text-xs text-text-sub truncate">{lead.contact_person}</p>
                        
                        <div className="flex items-center justify-between pt-1">
                          <PriorityBadge label={lead.priority} />
                          {lead.assigned_to_detail && (
                            <UserAvatar name={lead.assigned_to_detail.full_name} size="sm" />
                          )}
                        </div>

                        {lead.next_followup_date && (
                          <div className="flex items-center text-3xs text-yellow-600 font-semibold pt-1 border-t border-border-card/40">
                            <Clock size={10} className="mr-1 shrink-0" />
                            Next: <DateDisplay dateString={lead.next_followup_date} />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Right Drawer - Lead Details */}
      {drawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}></div>
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-bg-card shadow-xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-border-card flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedLead.company_name}</h2>
                  <p className="text-xs text-text-sub">Contact: {selectedLead.contact_person}</p>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-full hover:bg-bg-main text-text-sub">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Score & Status */}
                <div className="grid grid-cols-2 gap-4 bg-bg-main p-4 rounded-2xl border border-border-card/40">
                  <div>
                    <span className="text-2xs text-text-sub/70 font-bold uppercase">Lead Score</span>
                    <p className="text-xl font-bold text-primary mt-0.5">{selectedLead.lead_score} / 100</p>
                  </div>
                  <div>
                    <span className="text-2xs text-text-sub/70 font-bold uppercase">Status</span>
                    <div className="mt-1">
                      <StatusBadge label={selectedLead.status} />
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-white border-b pb-2">Information</h3>
                  
                  {selectedLead.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail size={16} className="text-text-sub/70 shrink-0" />
                      <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                    </div>
                  )}

                  {selectedLead.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone size={16} className="text-text-sub/70 shrink-0" />
                      <span>{selectedLead.phone}</span>
                    </div>
                  )}

                  {selectedLead.website && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Globe size={16} className="text-text-sub/70 shrink-0" />
                      <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{selectedLead.website}</a>
                    </div>
                  )}

                  {selectedLead.project_detail && (
                    <div className="flex items-center space-x-2 text-sm bg-primary-light/50 p-2.5 rounded-lg border border-primary/10">
                      <span className="text-2xs font-bold text-primary uppercase">Project Source:</span>
                      <span className="font-semibold text-white">{selectedLead.project_detail.name}</span>
                    </div>
                  )}

                  {selectedLead.product_detail && (
                    <div className="flex items-center space-x-2 text-sm bg-success/10/50 p-2.5 rounded-lg border border-green-100">
                      <span className="text-2xs font-bold text-success uppercase">Product Source:</span>
                      <span className="font-semibold text-white">{selectedLead.product_detail.name}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-2xs text-text-sub/70 font-bold">Estimated Value</span>
                      <p className="text-sm font-semibold">${parseFloat(selectedLead.estimated_value).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-2xs text-text-sub/70 font-bold">Priority</span>
                      <p className="mt-0.5"><PriorityBadge label={selectedLead.priority} /></p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedLead.notes && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-white border-b pb-2">Notes</h3>
                    <p className="text-sm text-text-sub bg-bg-main p-3 rounded-lg border border-border-card/40 whitespace-pre-wrap">{selectedLead.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-border-card bg-bg-main flex items-center justify-between">
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                >
                  <Trash size={20} />
                </button>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleOpenEdit(selectedLead)}
                    className="px-4 py-2 text-sm font-medium text-white bg-bg-card hover:bg-bg-main border border-border-card rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  
                  {selectedLead.status !== 'Won' && (
                    <button
                      onClick={() => setConvertModalOpen(true)}
                      className="flex items-center px-4 py-2 font-semibold text-white bg-success hover:bg-success/80 rounded-lg shadow-lg transition-colors"
                    >
                      <UserCheck size={16} className="mr-1.5" />
                      Convert to Client
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-2xl bg-bg-card p-6 shadow-xl border border-border-card">
              <h2 className="text-lg font-bold text-white mb-4">{isEditing ? 'Edit Lead' : 'Create Lead'}</h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Email Address</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Phone</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e: any) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Hot">Hot</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Lead Score (1-100)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.lead_score}
                      onChange={(e) => setFormData({...formData, lead_score: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Est. Value ($)</label>
                    <input
                      type="text"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({...formData, estimated_value: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">In-house Project Source</label>
                    <select
                      value={formData.project || ''}
                      onChange={(e) => setFormData({...formData, project: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">None</option>
                      {projects.map((proj: any) => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">In-house Product Source</label>
                    <select
                      value={formData.product || ''}
                      onChange={(e) => setFormData({...formData, product: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">None</option>
                      {products.map((prod: any) => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-bg-main hover:bg-bg-main border border-border-card rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-colors"
                  >
                    {isEditing ? 'Save Changes' : 'Create Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Convert Lead Confirmation Modal */}
      <ConfirmModal
        isOpen={convertModalOpen}
        title="Convert Lead to Client?"
        message={`This will convert ${selectedLead?.company_name} into an active client and create a primary contact profile. Are you sure you want to proceed?`}
        confirmLabel="Convert Now"
        onConfirm={() => selectedLead && convertMutation.mutate(selectedLead.id)}
        onCancel={() => setConvertModalOpen(false)}
      />

      {/* Delete Lead Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Lead?"
        message={`Are you sure you want to delete the lead for ${selectedLead?.company_name}? This action cannot be undone.`}
        onConfirm={() => selectedLead && deleteMutation.mutate(selectedLead.id)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
