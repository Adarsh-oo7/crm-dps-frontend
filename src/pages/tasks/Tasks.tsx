import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  Plus, Search, List, Kanban, X, Calendar, Clock, 
  MessageSquare, CheckSquare, PlusSquare, Trash2, Edit2, Play, Timer
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Task {
  id: number;
  title: string;
  description: string | null;
  project: number | null;
  project_detail?: { id: number; name: string };
  assigned_to: number | null;
  assigned_to_detail?: { id: number; full_name: string; avatar: string | null };
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | 'Blocker';
  status: 'Todo' | 'In Progress' | 'In Review' | 'Blocked' | 'Done' | 'Cancelled';
  task_type: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: string;
  logged_hours: number;
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  
  // Selected task drawer details
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sub-forms inside detail drawer
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  
  // Time Logging Form
  const [timelogFormOpen, setTimelogFormOpen] = useState(false);
  const [timelogFormData, setTimelogFormData] = useState({ started_at: '', ended_at: '', description: '' });

  // Form State
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', project: null, assigned_to: null, priority: 'Medium',
    status: 'Todo', task_type: 'Development', due_date: '', estimated_hours: '0.00'
  });

  // Query: Tasks list
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => apiClient('/api/tasks/')
  });

  // Query: Projects list
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/api/projects/').catch(() => [])
  });

  // Query: Team members
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['members'],
    queryFn: () => apiClient('/api/team/members/').catch(() => [])
  });

  // Query: Checklist items for selected task
  const { data: checklistItems = [] } = useQuery<any[]>({
    queryKey: ['task-checklist', selectedTask?.id],
    queryFn: () => selectedTask ? apiClient(`/api/tasks/${selectedTask.id}/checklist/`) : Promise.resolve([]),
    enabled: !!selectedTask
  });

  // Query: Comments for selected task
  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ['task-comments', selectedTask?.id],
    queryFn: () => selectedTask ? apiClient(`/api/tasks/${selectedTask.id}/comments/`) : Promise.resolve([]),
    enabled: !!selectedTask
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newTask: Partial<Task>) => apiClient('/api/tasks/', { method: 'POST', body: newTask }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully!');
      setCreateModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create task')
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Partial<Task> }) => apiClient(`/api/tasks/${vars.id}/`, { method: 'PUT', body: vars.data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully!');
      setCreateModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update task')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/tasks/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully!');
      setDeleteModalOpen(false);
      setDetailDrawerOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete task')
  });

  // Add Checklist Item
  const addChecklistMutation = useMutation({
    mutationFn: (text: string) => apiClient(`/api/tasks/${selectedTask?.id}/checklist/`, { method: 'POST', body: { text } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist', selectedTask?.id] });
      setNewChecklistText('');
      toast.success('Checklist item added!');
    }
  });

  // Toggle Checklist Item
  const toggleChecklistMutation = useMutation({
    mutationFn: (vars: { cid: number; is_completed: boolean }) => apiClient(`/api/tasks/${selectedTask?.id}/checklist/${vars.cid}/`, {
      method: 'PATCH',
      body: { is_completed: vars.is_completed }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist', selectedTask?.id] });
    }
  });

  // Add Comment
  const addCommentMutation = useMutation({
    mutationFn: (comment: string) => apiClient(`/api/tasks/${selectedTask?.id}/comments/`, { method: 'POST', body: { comment } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', selectedTask?.id] });
      setNewCommentText('');
      toast.success('Comment posted!');
    }
  });

  // Log Time
  const logTimeMutation = useMutation({
    mutationFn: (data: typeof timelogFormData) => apiClient(`/api/tasks/${selectedTask?.id}/timelogs/`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Time logged successfully!');
      setTimelogFormOpen(false);
      setTimelogFormData({ started_at: '', ended_at: '', description: '' });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to log time')
  });

  // Drag and Drop (HTML5)
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusStage: Task['status']) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr);

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === statusStage) return;

    try {
      await apiClient(`/api/tasks/${taskId}/status/`, {
        method: 'PATCH',
        body: { status: statusStage }
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Task status updated to ${statusStage}`);
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProj = projectFilter ? t.project === parseInt(projectFilter) : true;
    return matchesSearch && matchesProj;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setFormData({
      title: '', description: '', project: projects[0]?.id || null, assigned_to: null, priority: 'Medium',
      status: 'Todo', task_type: 'Development', due_date: '', estimated_hours: '0.00'
    });
    setCreateModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setIsEditing(true);
    setSelectedTask(task);
    setFormData(task);
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedTask) {
      updateMutation.mutate({ id: selectedTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText) return;
    addChecklistMutation.mutate(newChecklistText);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText) return;
    addCommentMutation.mutate(newCommentText);
  };

  const handleLogTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logTimeMutation.mutate(timelogFormData);
  };

  const kanbanStages: Task['status'][] = [
    'Todo', 'In Progress', 'In Review', 'Blocked', 'Done'
  ];

  const columns = [
    { 
      header: 'Task Title', 
      accessor: (row: Task) => (
        <div>
          <span className="font-semibold text-white">{row.title}</span>
          <div className="text-xs text-text-sub">{row.project_detail?.name || 'General Task'}</div>
        </div>
      ) 
    },
    { header: 'Type', accessor: (row: Task) => row.task_type },
    { 
      header: 'Assignee', 
      accessor: (row: Task) => (
        <div className="flex items-center space-x-2">
          {row.assigned_to_detail ? (
            <>
              <UserAvatar name={row.assigned_to_detail.full_name} size="sm" />
              <span className="text-xs text-white">{row.assigned_to_detail.full_name}</span>
            </>
          ) : (
            <span className="text-xs text-text-sub/70">Unassigned</span>
          )}
        </div>
      )
    },
    { header: 'Status', accessor: (row: Task) => <StatusBadge label={row.status} /> },
    { header: 'Priority', accessor: (row: Task) => <PriorityBadge label={row.priority} /> },
    { header: 'Logged / Est.', accessor: (row: Task) => <span>{row.logged_hours}h / {row.estimated_hours}h</span> },
    { header: 'Due Date', accessor: (row: Task) => <DateDisplay dateString={row.due_date} /> },
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <p className="text-sm text-text-sub">Log client hours, coordinate task boards, and document notes.</p>
        </div>
        
        <div className="flex items-center space-x-3">
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
          
          <button
            onClick={handleOpenCreate}
            className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-colors"
          >
            <Plus size={18} className="mr-1.5" />
            New Task
          </button>
        </div>
      </div>

      {/* Search/Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-bg-card p-4 rounded-2xl border border-border-card shadow-lg">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-sub/70">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search task title, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid Kanban vs List Table */}
      {viewMode === 'list' ? (
        <DataTable
          columns={columns}
          data={filteredTasks}
          isLoading={isLoading}
          onRowClick={handleTaskClick}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-200 min-h-[calc(100vh-280px)]">
          {kanbanStages.map(stage => {
            const stageTasks = filteredTasks.filter(t => t.status === stage);
            return (
              <div 
                key={stage}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex-1 min-w-[280px] max-w-[320px] bg-bg-main border border-border-card rounded-2xl p-3 flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-950 text-sm">
                    {stage}
                    <span className="ml-2 px-2 py-0.5 text-2xs font-bold bg-bg-main text-white rounded-full">
                      {stageTasks.length}
                    </span>
                  </h3>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-340px)] flex-1 min-h-[150px]">
                  {stageTasks.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border border-dashed border-border-card rounded-lg text-center text-xs text-text-sub/70">
                      Drag tasks here
                    </div>
                  ) : (
                    stageTasks.map(task => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => handleTaskClick(task)}
                        className="bg-bg-card p-4 rounded-lg border border-border-card shadow-lg hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3"
                      >
                        <h4 className="font-bold text-white text-sm truncate">{task.title}</h4>
                        <p className="text-3xs text-text-sub font-bold uppercase tracking-wider">{task.project_detail?.name || 'General Task'}</p>
                        
                        <div className="flex items-center justify-between">
                          <PriorityBadge label={task.priority} />
                          {task.assigned_to_detail && (
                            <UserAvatar name={task.assigned_to_detail.full_name} size="sm" />
                          )}
                        </div>

                        {task.due_date && (
                          <div className="flex items-center text-3xs text-text-sub/70 font-semibold pt-1 border-t border-border-card/40">
                            <Clock size={10} className="mr-1 shrink-0" />
                            Due: <DateDisplay dateString={task.due_date} />
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

      {/* Task Details Right Drawer */}
      {detailDrawerOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDetailDrawerOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-bg-card shadow-xl flex flex-col">
              
              {/* Header */}
              <div className="p-6 border-b border-border-card flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedTask.title}</h2>
                  <p className="text-xs text-text-sub">{selectedTask.project_detail?.name || 'General Task'}</p>
                </div>
                <button onClick={() => setDetailDrawerOpen(false)} className="p-1 rounded-full hover:bg-bg-main text-text-sub">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Status Priority Details */}
                <div className="grid grid-cols-2 gap-4 bg-bg-main p-4 rounded-2xl border border-border-card/40">
                  <div>
                    <span className="text-2xs text-text-sub/70 font-bold uppercase">Status</span>
                    <p className="mt-1"><StatusBadge label={selectedTask.status} /></p>
                  </div>
                  <div>
                    <span className="text-2xs text-text-sub/70 font-bold uppercase">Priority</span>
                    <p className="mt-1"><PriorityBadge label={selectedTask.priority} /></p>
                  </div>
                </div>

                {/* Info Fields */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-sub font-semibold">Assignee:</span>
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      {selectedTask.assigned_to_detail ? (
                        <>
                          <UserAvatar name={selectedTask.assigned_to_detail.full_name} size="sm" />
                          <span>{selectedTask.assigned_to_detail.full_name}</span>
                        </>
                      ) : (
                        <span className="text-text-sub/70">Unassigned</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-sub font-semibold">Hours Logged:</span>
                    <span className="font-bold text-primary">{selectedTask.logged_hours}h / {selectedTask.estimated_hours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-sub font-semibold">Due Date:</span>
                    <DateDisplay dateString={selectedTask.due_date} />
                  </div>
                </div>

                {/* Checklist Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-white border-b pb-2">Checklist</h3>
                  
                  <form onSubmit={handleAddChecklist} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add subtask checklist item..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" className="p-1.5 bg-primary text-white rounded-lg"><Plus size={16} /></button>
                  </form>

                  <div className="space-y-2">
                    {checklistItems.length === 0 ? (
                      <p className="text-3xs text-text-sub/70 text-center py-2">No checklist items created.</p>
                    ) : (
                      checklistItems.map((item: any) => (
                        <label key={item.id} className="flex items-center text-xs text-white cursor-pointer hover:bg-bg-main p-1.5 rounded border border-border-card/40">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={(e) => toggleChecklistMutation.mutate({ cid: item.id, is_completed: e.target.checked })}
                            className="mr-2 rounded border-border-card text-primary"
                          />
                          <span className={item.is_completed ? 'line-through text-text-sub/70' : ''}>{item.text}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Time Logging Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-sm text-white">Work Logs</h3>
                    <button 
                      onClick={() => setTimelogFormOpen(!timelogFormOpen)}
                      className="text-xs text-primary font-semibold hover:underline flex items-center"
                    >
                      <Timer size={14} className="mr-1" /> Log Time
                    </button>
                  </div>

                  {timelogFormOpen && (
                    <form onSubmit={handleLogTimeSubmit} className="p-3 bg-bg-main border border-border-card rounded-lg space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-3xs font-bold text-text-sub uppercase">Started At</label>
                          <input
                            type="datetime-local"
                            required
                            value={timelogFormData.started_at}
                            onChange={(e) => setTimelogFormData({...timelogFormData, started_at: e.target.value})}
                            className="w-full px-2 py-1 text-xs border border-border-card rounded"
                          />
                        </div>
                        <div>
                          <label className="text-3xs font-bold text-text-sub uppercase">Ended At</label>
                          <input
                            type="datetime-local"
                            required
                            value={timelogFormData.ended_at}
                            onChange={(e) => setTimelogFormData({...timelogFormData, ended_at: e.target.value})}
                            className="w-full px-2 py-1 text-xs border border-border-card rounded"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Log notes (what did you work on?)"
                        value={timelogFormData.description}
                        onChange={(e) => setTimelogFormData({...timelogFormData, description: e.target.value})}
                        className="w-full px-3 py-1.5 text-xs border border-border-card rounded-lg"
                      />
                      <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => setTimelogFormOpen(false)} className="px-2 py-1 text-3xs border rounded bg-bg-card">Cancel</button>
                        <button type="submit" className="px-2 py-1 text-3xs bg-primary text-white rounded font-bold">Log</button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Comments Section */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-white border-b pb-2">Comments</h3>
                  
                  <form onSubmit={handleAddComment} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">Post</button>
                  </form>

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-3xs text-text-sub/70 text-center py-2">No comments posted yet.</p>
                    ) : (
                      comments.map((c: any) => (
                        <div key={c.id} className="p-2.5 bg-bg-main border border-gray-150 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{c.user_detail?.full_name || 'System User'}</span>
                            <span className="text-3xs text-text-sub/70"><DateDisplay dateString={c.created_at} includeTime /></span>
                          </div>
                          <p className="text-xs text-text-sub whitespace-pre-wrap">{c.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

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
                  onClick={() => handleOpenEdit(selectedTask)}
                  className="flex items-center px-4 py-2 font-semibold text-white bg-bg-card hover:bg-bg-main border border-border-card rounded-lg transition-colors"
                >
                  <Edit2 size={16} className="mr-1.5" />
                  Edit Task
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
              <h2 className="text-lg font-bold text-white mb-4">{isEditing ? 'Edit Task Settings' : 'Create Task'}</h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Project</label>
                    <select
                      value={formData.project || ''}
                      onChange={(e) => setFormData({...formData, project: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">General Task (No Project)</option>
                      {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Assign To</label>
                    <select
                      value={formData.assigned_to || ''}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Unassigned</option>
                      {members.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Task Type</label>
                    <select
                      value={formData.task_type}
                      onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Development">Development</option>
                      <option value="Design">Design</option>
                      <option value="Testing">Testing</option>
                      <option value="Marketing">Marketing</option>
                      <option value="SEO">SEO</option>
                      <option value="Meeting">Meeting</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Support">Support</option>
                      <option value="Other">Other</option>
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
                      <option value="Critical">Critical</option>
                      <option value="Blocker">Blocker</option>
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
                      {kanbanStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Est. Hours</label>
                    <input
                      type="text"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-sub">Due Date</label>
                    <input
                      type="datetime-local"
                      value={formData.due_date ? formData.due_date.slice(0, 16) : ''}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-sub">Task Details</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    {isEditing ? 'Save Changes' : 'Create Task'}
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
        title="Delete Task?"
        message={`Are you sure you want to permanently delete task: "${selectedTask?.title}"? This action cannot be undone.`}
        onConfirm={() => selectedTask && deleteMutation.mutate(selectedTask.id)}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
