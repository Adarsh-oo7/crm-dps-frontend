import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  Plus, Search, Grid, List, X, Mail, Phone, Briefcase, 
  FileText, PlusSquare, Upload, Trash2, Edit2, Globe
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Client {
  id: number;
  company_name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gstin: string | null;
  pan: string | null;
  logo: string | null;
  client_type: 'Service Client' | 'Product Client' | 'Both';
  status: 'Active' | 'Inactive' | 'On Hold' | 'Churned';
  notes: string | null;
  tags: string[];
  total_revenue: number;
  contacts?: { id: number; name: string; email: string; phone: string; is_primary: boolean }[];
  created_at: string;
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Selected Client details
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'projects' | 'documents' | 'timeline'>('overview');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Contacts Form Inside Detail Tab
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', phone: '', is_primary: false });

  // Document Upload Form
  const [docUploadOpen, setDocUploadOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Contract');
  const [docName, setDocName] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Client>>({
    company_name: '', industry: '', website: '', address: '', city: '',
    state: '', country: '', client_type: 'Service Client', status: 'Active',
    notes: '', tags: []
  });

  // Query: Clients List
  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient('/api/clients/')
  });

  // Query: Client detail timelines
  const { data: timeline = [] } = useQuery<any[]>({
    queryKey: ['client-timeline', selectedClient?.id],
    queryFn: () => selectedClient ? apiClient(`/api/clients/${selectedClient.id}/timeline/`) : Promise.resolve([]),
    enabled: !!selectedClient
  });

  // Query: Client contacts
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['client-contacts', selectedClient?.id],
    queryFn: () => selectedClient ? apiClient(`/api/clients/${selectedClient.id}/contacts/`) : Promise.resolve([]),
    enabled: !!selectedClient
  });

  // Query: Client documents
  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['client-documents', selectedClient?.id],
    queryFn: () => selectedClient ? apiClient(`/api/clients/${selectedClient.id}/documents/`) : Promise.resolve([]),
    enabled: !!selectedClient
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newClient: Partial<Client>) => apiClient('/api/clients/', { method: 'POST', body: newClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully!');
      setCreateModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create client')
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<Client> }) => apiClient(`/api/clients/${vars.id}/`, { method: 'PUT', body: vars.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated successfully!');
      setCreateModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update client')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/clients/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client soft-deleted (status set to Inactive).');
      setDeleteModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete client')
  });

  // Add Contact Mutation
  const addContactMutation = useMutation({
    mutationFn: (data: typeof contactFormData) => apiClient(`/api/clients/${selectedClient?.id}/contacts/`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contacts', selectedClient?.id] });
      toast.success('Contact added successfully!');
      setContactFormOpen(false);
      setContactFormData({ name: '', email: '', phone: '', is_primary: false });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add contact')
  });

  // Upload Document Mutation
  const uploadDocMutation = useMutation({
    mutationFn: (data: FormData) => apiClient(`/api/clients/${selectedClient?.id}/documents/`, {
      method: 'POST',
      body: data
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-documents', selectedClient?.id] });
      toast.success('Document uploaded successfully!');
      setDocUploadOpen(false);
      setDocFile(null);
      setDocName('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to upload document')
  });

  // Filter Clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.industry && c.industry.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      company_name: '', industry: '', website: '', address: '', city: '',
      state: '', country: '', client_type: 'Service Client', status: 'Active',
      notes: '', tags: []
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setIsEditing(true);
    setSelectedClient(client);
    setFormData(client);
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedClient) {
      updateMutation.mutate({ id: selectedClient.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setActiveTab('overview');
    setDetailDrawerOpen(true);
  };

  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addContactMutation.mutate(contactFormData);
  };

  const handleUploadDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      toast.error('Please select a file.');
      return;
    }
    const data = new FormData();
    data.append('file', docFile);
    data.append('name', docName || docFile.name);
    data.append('document_type', docType);
    
    uploadDocMutation.mutate(data);
  };

  const columns = [
    { 
      header: 'Company Name', 
      accessor: (row: Client) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 font-bold text-xs text-primary bg-primary-light border border-indigo-150 rounded-lg">
            {row.company_name[0].toUpperCase()}
          </div>
          <span className="font-semibold text-white">{row.company_name}</span>
        </div>
      ) 
    },
    { header: 'Industry', accessor: (row: Client) => row.industry || '—' },
    { header: 'Type', accessor: (row: Client) => row.client_type },
    { header: 'Status', accessor: (row: Client) => <StatusBadge label={row.status} /> },
    { header: 'Total Value', accessor: (row: Client) => <span className="font-semibold">${row.total_revenue || '0.00'}</span> },
    { header: 'Onboarded', accessor: (row: Client) => <DateDisplay dateString={row.created_at} /> },
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients Portfolio</h1>
          <p className="text-sm text-text-sub">Manage client profiles, documents, primary contact points, and project histories.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-bg-main rounded-lg p-0.5 border border-border-card">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-bg-card shadow-lg text-primary' : 'text-text-sub hover:text-white'} transition-all`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-bg-card shadow-lg text-primary' : 'text-text-sub hover:text-white'} transition-all`}
            >
              <List size={18} />
            </button>
          </div>
          
          <button
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-colors"
          >
            <Plus size={18} className="mr-1.5" />
            Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-bg-card p-4 rounded-2xl border border-border-card shadow-lg">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-sub/70">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search company name, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Hold">On Hold</option>
            <option value="Churned">Churned</option>
          </select>
        </div>
      </div>

      {/* Grid or List View */}
      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredClients}
          isLoading={isLoading}
          onRowClick={handleClientClick}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => handleClientClick(client)}
              className="bg-bg-card rounded-2xl border border-border-card shadow-lg p-5 hover:shadow-md cursor-pointer transition-shadow space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 font-bold text-sm text-primary bg-primary-light border border-indigo-100 rounded-2xl">
                    {client.company_name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white hover:text-primary transition-colors">{client.company_name}</h3>
                    <p className="text-xs text-text-sub">{client.industry || 'No industry set'}</p>
                  </div>
                </div>
                <StatusBadge label={client.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-border-card/40">
                <div>
                  <span className="text-text-sub/70 font-medium">Type</span>
                  <p className="font-semibold text-white mt-0.5">{client.client_type}</p>
                </div>
                <div>
                  <span className="text-text-sub/70 font-medium">Country</span>
                  <p className="font-semibold text-white mt-0.5">{client.country || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Right Drawer: Client Details & Tabs */}
      {detailDrawerOpen && selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDetailDrawerOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-bg-card shadow-xl flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-border-card flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-light text-primary font-bold rounded-lg flex items-center justify-center">
                    {selectedClient.company_name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedClient.company_name}</h2>
                    <p className="text-xs text-text-sub">{selectedClient.industry || 'No industry set'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailDrawerOpen(false)} className="p-1 rounded-full hover:bg-bg-main text-text-sub">
                  <X size={20} />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-border-card text-sm font-semibold">
                {(['overview', 'contacts', 'projects', 'documents', 'timeline'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center border-b-2 capitalize transition-colors
                      ${activeTab === tab 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-text-sub hover:text-white hover:border-border-card'
                      }
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Drawer Body - Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-bg-main p-4 rounded-2xl border border-border-card/40">
                      <div>
                        <span className="text-2xs text-text-sub/70 font-bold uppercase">Client Status</span>
                        <p className="mt-1"><StatusBadge label={selectedClient.status} /></p>
                      </div>
                      <div>
                        <span className="text-2xs text-text-sub/70 font-bold uppercase">Client Type</span>
                        <p className="text-sm font-bold text-white mt-1">{selectedClient.client_type}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-white border-b pb-2">Company Information</h3>
                      {selectedClient.website && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Globe size={16} className="text-text-sub/70 shrink-0" />
                          <a href={selectedClient.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{selectedClient.website}</a>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="text-sm text-text-sub">
                          <span className="font-medium text-white">Address:</span> {selectedClient.address}, {selectedClient.city}, {selectedClient.country}
                        </div>
                      )}
                    </div>

                    {selectedClient.notes && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-white border-b pb-2">Internal Notes</h3>
                        <p className="text-sm text-text-sub bg-bg-main p-3 rounded-lg border border-border-card/40 whitespace-pre-wrap">{selectedClient.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Contacts */}
                {activeTab === 'contacts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm text-white">Primary Contact Points</h3>
                      <button 
                        onClick={() => setContactFormOpen(!contactFormOpen)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center"
                      >
                        <PlusSquare size={14} className="mr-1" /> Add Contact
                      </button>
                    </div>

                    {/* Add Contact Form Inline */}
                    {contactFormOpen && (
                      <form onSubmit={handleAddContactSubmit} className="p-4 bg-bg-main border border-border-card rounded-lg space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Contact Name"
                          value={contactFormData.name}
                          onChange={(e) => setContactFormData({...contactFormData, name: e.target.value})}
                          className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            placeholder="Email"
                            value={contactFormData.email}
                            onChange={(e) => setContactFormData({...contactFormData, email: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            value={contactFormData.phone}
                            onChange={(e) => setContactFormData({...contactFormData, phone: e.target.value})}
                            className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                          />
                        </div>
                        <label className="flex items-center text-xs font-semibold text-text-sub">
                          <input
                            type="checkbox"
                            checked={contactFormData.is_primary}
                            onChange={(e) => setContactFormData({...contactFormData, is_primary: e.target.checked})}
                            className="mr-1.5 rounded border-border-card text-primary focus:ring-primary"
                          />
                          Set as Primary Contact
                        </label>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setContactFormOpen(false)}
                            className="px-3 py-1 text-2xs bg-bg-card border rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-2xs bg-primary text-white rounded font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {contacts.length === 0 ? (
                        <p className="text-xs text-text-sub text-center py-4">No contact profiles created yet.</p>
                      ) : (
                        contacts.map((contact: any) => (
                          <div key={contact.id} className="p-3 bg-bg-main border border-gray-150 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white flex items-center">
                                {contact.name}
                                {contact.is_primary && (
                                  <span className="ml-1.5 px-2 py-0.2 bg-primary-light text-primary border border-primary/20 text-3xs font-bold rounded-full">
                                    Primary
                                  </span>
                                )}
                              </p>
                              <div className="text-xs text-text-sub mt-1 flex flex-col space-y-0.5">
                                {contact.email && <span className="flex items-center"><Mail size={12} className="mr-1 shrink-0" />{contact.email}</span>}
                                {contact.phone && <span className="flex items-center"><Phone size={12} className="mr-1 shrink-0" />{contact.phone}</span>}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Projects */}
                {activeTab === 'projects' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-white border-b pb-2">Client projects</h3>
                    <div className="space-y-3">
                      {/* Projects list placeholder or real list */}
                      <p className="text-xs text-text-sub text-center py-4">No active projects assigned to client.</p>
                    </div>
                  </div>
                )}

                {/* Tab: Documents */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm text-white">Signed contracts & paperwork</h3>
                      <button 
                        onClick={() => setDocUploadOpen(!docUploadOpen)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center"
                      >
                        <Upload size={14} className="mr-1" /> Upload Doc
                      </button>
                    </div>

                    {/* Doc upload inline form */}
                    {docUploadOpen && (
                      <form onSubmit={handleUploadDocSubmit} className="p-4 bg-bg-main border border-border-card rounded-lg space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Document Name"
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                          >
                            <option value="Contract">Contract</option>
                            <option value="NDA">NDA</option>
                            <option value="Agreement">Agreement</option>
                            <option value="Invoice">Invoice</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="file"
                            required
                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                            className="w-full text-2xs"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setDocUploadOpen(false)}
                            className="px-3 py-1 text-2xs bg-bg-card border rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 text-2xs bg-primary text-white rounded font-semibold"
                          >
                            Upload
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {documents.length === 0 ? (
                        <p className="text-xs text-text-sub text-center py-4">No documents uploaded yet.</p>
                      ) : (
                        documents.map((doc: any) => (
                          <div key={doc.id} className="p-3 bg-bg-main border border-gray-150 rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText size={16} className="text-text-sub/70" />
                              <div>
                                <p className="text-xs font-semibold text-white">{doc.name}</p>
                                <span className="text-3xs text-text-sub font-bold uppercase">{doc.document_type}</span>
                              </div>
                            </div>
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Timeline */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-white border-b pb-2">Client Activity Timeline</h3>
                    <div className="flow-root">
                      {timeline.length === 0 ? (
                        <p className="text-xs text-text-sub text-center py-4">No history records logged yet.</p>
                      ) : (
                        <ul className="-mb-8">
                          {timeline.map((act: any, idx: number) => (
                            <li key={idx}>
                              <div className="relative pb-8">
                                {idx !== timeline.length - 1 && (
                                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-bg-main" />
                                )}
                                <div className="relative flex space-x-3">
                                  <div>
                                    <span className="h-8 w-8 rounded-full bg-primary-light border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                      {act.type[0]}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-1.5">
                                    <p className="text-xs text-text-sub">
                                      <span className="font-semibold text-white">{act.user}</span>{' '}
                                      {act.action.toLowerCase()}{' '}
                                      <span className="font-semibold text-white">{act.description}</span>
                                    </p>
                                    <span className="text-3xs text-text-sub/70 mt-1 block">
                                      <DateDisplay dateString={act.timestamp} includeTime />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-card bg-bg-main flex items-center justify-between">
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="flex items-center px-4 py-2 font-semibold text-white bg-bg-card hover:bg-bg-main border border-border-card rounded-lg transition-colors"
                >
                  <Edit2 size={16} className="mr-1.5" />
                  Edit Details
                </button>
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
              <h2 className="text-lg font-bold text-white mb-4">{isEditing ? 'Edit Client Profile' : 'Add Client'}</h2>
              
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
                    <label className="text-xs font-semibold text-text-sub">Industry</label>
                    <input
                      type="text"
                      value={formData.industry || ''}
                      onChange={(e) => setFormData({...formData, industry: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Website URL</label>
                    <input
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Client Type</label>
                    <select
                      value={formData.client_type}
                      onChange={(e: any) => setFormData({...formData, client_type: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Service Client">Service Client</option>
                      <option value="Product Client">Product Client</option>
                      <option value="Both">Both Client</option>
                    </select>
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
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Churned">Churned</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Country</label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Full Address</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Internal Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={2}
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
                    {isEditing ? 'Save Changes' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Soft-Delete Client?"
        message={`Are you sure you want to deactivate ${selectedClient?.company_name}? Their status will be updated to Inactive.`}
        onConfirm={() => selectedClient && deleteMutation.mutate(selectedClient.id)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
