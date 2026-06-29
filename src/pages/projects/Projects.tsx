import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  Plus, Search, List, Kanban, X, Calendar, DollarSign, 
  Settings, CheckSquare, PlusSquare, Trash2, Edit2, ShieldAlert
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Project {
  id: number;
  name: string;
  client: number;
  client_detail?: { id: number; company_name: string };
  project_type: string;
  status: 'Backlog' | 'Planning' | 'UI Design' | 'Development' | 'Testing' | 'Deployment' | 'Completed' | 'On Hold' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  project_manager: number | null;
  project_manager_detail?: { id: number; full_name: string; avatar: string | null };
  start_date: string | null;
  deadline: string | null;
  budget: string;
  completion_percentage: number;
  description: string | null;
  tech_stack: string[];
}

export default function Projects() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals / Drawers
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'tasks'>('overview');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Milestones Inline Form
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);
  const [milestoneFormData, setMilestoneFormData] = useState({ title: '', due_date: '', status: 'Pending' });

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '', client: 1, project_type: 'Web Development', status: 'Planning',
    priority: 'Medium', budget: '0.00', completion_percentage: 0, description: ''
  });

  // Query: Projects List
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/api/projects/')
  });

  // Query: Clients List (for select dropdown)
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient('/api/clients/').catch(() => [])
  });

  // Query: Milestones for selected project
  const { data: milestones = [] } = useQuery<any[]>({
    queryKey: ['project-milestones', selectedProject?.id],
    queryFn: () => selectedProject ? apiClient(`/api/projects/${selectedProject.id}/milestones/`) : Promise.resolve([]),
    enabled: !!selectedProject
  });

  // Query: Tasks for selected project
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['project-tasks', selectedProject?.id],
    queryFn: () => selectedProject ? apiClient(`/api/projects/${selectedProject.id}/tasks/`) : Promise.resolve([]),
    enabled: !!selectedProject
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newProj: Partial<Project>) => apiClient('/api/projects/', { method: 'POST', body: newProj }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      setCreateModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create project')
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<Project> }) => apiClient(`/api/projects/${vars.id}/`, { method: 'PUT', body: vars.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
      setCreateModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update project')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/projects/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project cancelled (soft deleted).');
      setDeleteModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete project')
  });

  // Add Milestone Mutation
  const addMilestoneMutation = useMutation({
    mutationFn: (data: typeof milestoneFormData) => apiClient(`/api/projects/${selectedProject?.id}/milestones/`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', selectedProject?.id] });
      toast.success('Milestone added successfully!');
      setMilestoneFormOpen(false);
      setMilestoneFormData({ title: '', due_date: '', status: 'Pending' });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add milestone')
  });

  // Drag and Drop (HTML5)
  const handleDragStart = (e: React.DragEvent, projId: number) => {
    e.dataTransfer.setData('text/plain', projId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusStage: Project['status']) => {
    e.preventDefault();
    const projIdStr = e.dataTransfer.getData('text/plain');
    if (!projIdStr) return;
    const projId = parseInt(projIdStr);

    const proj = projects.find(p => p.id === projId);
    if (!proj || proj.status === statusStage) return;

    try {
      await apiClient(`/api/projects/${projId}/status/`, {
        method: 'PATCH',
        body: { status: statusStage }
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(`Project moved to ${statusStage}`);
    } catch (err) {
      toast.error('Failed to update project status');
    }
  };

  // Filter Projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.project_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      name: '', client: clients[0]?.id || 1, project_type: 'Web Development', status: 'Planning',
      priority: 'Medium', budget: '0.00', completion_percentage: 0, description: ''
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setIsEditing(true);
    setSelectedProject(project);
    setFormData(project);
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedProject) {
      updateMutation.mutate({ id: selectedProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setActiveTab('overview');
    setDetailDrawerOpen(true);
  };

  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMilestoneMutation.mutate(milestoneFormData);
  };

  const kanbanStages: Project['status'][] = [
    'Backlog', 'Planning', 'UI Design', 'Development', 'Testing', 'Deployment', 'Completed'
  ];

  const columns = [
    { 
      header: 'Project Name', 
      accessor: (row: Project) => (
        <div>
          <span className="font-semibold text-gray-900">{row.name}</span>
          <div className="text-xs text-gray-500">{row.client_detail?.company_name || 'No Client'}</div>
        </div>
      ) 
    },
    { header: 'Type', accessor: (row: Project) => row.project_type },
    { header: 'Status', accessor: (row: Project) => <StatusBadge label={row.status} /> },
    { header: 'Priority', accessor: (row: Project) => <PriorityBadge label={row.priority} /> },
    { 
      header: 'Progress', 
      accessor: (row: Project) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${row.completion_percentage}%` }}></div>
          </div>
          <span className="text-xs font-bold text-gray-700">{row.completion_percentage}%</span>
        </div>
      ) 
    },
    { header: 'Budget', accessor: (row: Project) => <span className="font-semibold">${parseFloat(row.budget).toLocaleString()}</span> },
    { header: 'Deadline', accessor: (row: Project) => <DateDisplay dateString={row.deadline} /> },
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects Tracking</h1>
          <p className="text-sm text-gray-500">Coordinate client deliverables, tech stacks, active milestones, and team tasks.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'} transition-all`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'} transition-all`}
            >
              <Kanban size={18} />
            </button>
          </div>
          
          <button
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
          >
            <Plus size={18} className="mr-1.5" />
            New Project
          </button>
        </div>
      </div>

      {/* Search/Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search project name, type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Statuses</option>
            {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main View Grid/Kanban */}
      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredProjects}
          isLoading={isLoading}
          onRowClick={handleProjectClick}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 min-h-[calc(100vh-280px)]">
          {kanbanStages.map(stage => {
            const stageProjects = filteredProjects.filter(p => p.status === stage);
            return (
              <div 
                key={stage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex-1 min-w-[280px] max-w-[320px] bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-950 text-sm">
                    {stage}
                    <span className="ml-2 px-2 py-0.5 text-2xs font-bold bg-gray-200 text-gray-700 rounded-full">
                      {stageProjects.length}
                    </span>
                  </h3>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] flex-1 min-h-[150px]">
                  {stageProjects.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-400">
                      Drag projects here
                    </div>
                  ) : (
                    stageProjects.map(proj => (
                      <div
                        key={proj.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, proj.id)}
                        onClick={() => handleProjectClick(proj)}
                        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3"
                      >
                        <h4 className="font-bold text-gray-900 text-sm truncate">{proj.name}</h4>
                        <p className="text-3xs text-gray-500 font-bold uppercase tracking-wider">{proj.project_type}</p>
                        
                        <div className="flex items-center justify-between">
                          <PriorityBadge label={proj.priority} />
                          <span className="text-xs font-bold text-gray-700">{proj.completion_percentage}%</span>
                        </div>

                        <div className="w-full bg-gray-150 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${proj.completion_percentage}%` }}></div>
                        </div>

                        {proj.deadline && (
                          <div className="flex items-center text-3xs text-gray-400 font-semibold pt-1 border-t border-gray-100">
                            <Calendar size={10} className="mr-1 shrink-0" />
                            Due: <DateDisplay dateString={proj.deadline} />
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

      {/* Detail Drawer */}
      {detailDrawerOpen && selectedProject && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDetailDrawerOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-xl flex flex-col">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedProject.name}</h2>
                  <p className="text-xs text-gray-500">{selectedProject.project_type}</p>
                </div>
                <button onClick={() => setDetailDrawerOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 text-sm font-semibold">
                {(['overview', 'milestones', 'tasks'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center border-b-2 capitalize transition-colors
                      ${activeTab === tab 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                      }
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-2xs text-gray-400 font-bold uppercase">Status</span>
                        <p className="mt-1"><StatusBadge label={selectedProject.status} /></p>
                      </div>
                      <div>
                        <span className="text-2xs text-gray-400 font-bold uppercase">Priority</span>
                        <p className="mt-1"><PriorityBadge label={selectedProject.priority} /></p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-sm text-gray-900 border-b pb-2">Financials & Timeline</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <DollarSign size={16} className="text-gray-400" />
                        <span>Budget: <span className="font-bold text-gray-950">${parseFloat(selectedProject.budget).toLocaleString()}</span></span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>Deadline: <DateDisplay dateString={selectedProject.deadline} /></span>
                      </div>
                    </div>

                    {selectedProject.description && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-gray-900 border-b pb-2">Project Brief</h3>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{selectedProject.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Milestones */}
                {activeTab === 'milestones' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm text-gray-900">Project milestones</h3>
                      <button
                        onClick={() => setMilestoneFormOpen(!milestoneFormOpen)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center"
                      >
                        <PlusSquare size={14} className="mr-1" /> Add Milestone
                      </button>
                    </div>

                    {/* Inline Form */}
                    {milestoneFormOpen && (
                      <form onSubmit={handleAddMilestoneSubmit} className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Milestone Title"
                          value={milestoneFormData.title}
                          onChange={(e) => setMilestoneFormData({...milestoneFormData, title: e.target.value})}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        />
                        <input
                          type="date"
                          required
                          value={milestoneFormData.due_date}
                          onChange={(e) => setMilestoneFormData({...milestoneFormData, due_date: e.target.value})}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setMilestoneFormOpen(false)}
                            className="px-3 py-1 text-2xs bg-white border rounded"
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
                      {milestones.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No milestones scheduled.</p>
                      ) : (
                        milestones.map((m: any) => (
                          <div key={m.id} className="p-3 bg-gray-50 border border-gray-150 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-3xs text-gray-500">Due: <DateDisplay dateString={m.due_date} /></span>
                              </div>
                            </div>
                            <StatusBadge label={m.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-sm text-gray-900 border-b pb-2">Assigned Tasks</h3>
                    <div className="space-y-3">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No tasks found in project backlog.</p>
                      ) : (
                        tasks.map((t: any) => (
                          <div key={t.id} className="p-3 bg-gray-50 border border-gray-150 rounded-lg flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{t.title}</p>
                              <span className="text-3xs text-gray-500">Priority: {t.priority}</span>
                            </div>
                            <StatusBadge label={t.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => handleOpenEdit(selectedProject)}
                  className="flex items-center px-4 py-2 font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
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
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{isEditing ? 'Edit Project Settings' : 'Create Project'}</h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Client *</label>
                    <select
                      value={formData.client}
                      onChange={(e) => setFormData({...formData, client: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {clients.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Project Type</label>
                    <select
                      value={formData.project_type}
                      onChange={(e) => setFormData({...formData, project_type: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile App">Mobile App</option>
                      <option value="SEO">SEO</option>
                      <option value="Digital Marketing">Digital Marketing</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Software">Software</option>
                      <option value="In-house Product">In-house Product</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e: any) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Est. Budget ($)</label>
                    <input
                      type="text"
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Project Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline || ''}
                      onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Project Details</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
                  >
                    {isEditing ? 'Save Changes' : 'Create Project'}
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
        title="Cancel Project?"
        message={`Are you sure you want to cancel the project ${selectedProject?.name}? Their status will be set to Cancelled.`}
        onConfirm={() => selectedProject && deleteMutation.mutate(selectedProject.id)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
