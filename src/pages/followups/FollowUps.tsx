import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/Badge';
import DateDisplay from '../../components/shared/DateDisplay';
import UserAvatar from '../../components/shared/UserAvatar';
import { Plus, Search, Calendar, Phone, Mail, CheckCircle2, ChevronRight, X, Clock, HelpCircle, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Member {
  id: number;
  full_name: string;
  role: string;
  email: string;
}

interface FollowUp {
  id: number;
  title: string;
  description: string | null;
  follow_up_type: string;
  related_to_type: string;
  related_to_id: number | null;
  scheduled_at: string;
  status: 'Pending' | 'Completed' | 'Missed' | 'Rescheduled' | 'Cancelled';
  outcome: string | null;
  reschedule_count: number;
  assigned_to: number | null;
  assigned_to_detail?: Member;
}

export default function FollowUps() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed'>('today');

  // Modals
  const [selectedFollowup, setSelectedFollowup] = useState<FollowUp | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);

  // Forms
  const [outcomeText, setOutcomeText] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [formData, setFormData] = useState<Partial<FollowUp>>({
    title: '', description: '', follow_up_type: 'Call', related_to_type: 'General',
    related_to_id: null, scheduled_at: '', status: 'Pending', assigned_to: null
  });

  // Queries
  const { data: followups = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ['followups', activeTab],
    queryFn: () => apiClient(`/api/followups/${activeTab === 'today' ? 'today' : activeTab === 'upcoming' ? 'upcoming' : activeTab === 'overdue' ? 'overdue' : ''}/`)
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => apiClient('/api/team/members/').catch(() => [])
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newFollow: Partial<FollowUp>) => apiClient('/api/followups/', { method: 'POST', body: newFollow }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up scheduled successfully!');
      setCreateModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to schedule follow-up')
  });

  const completeMutation = useMutation({
    mutationFn: (vars: { id: number; outcome: string }) => apiClient(`/api/followups/${vars.id}/complete/`, {
      method: 'PATCH',
      body: { outcome: vars.outcome }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up marked as completed!');
      setCompleteModalOpen(false);
      setOutcomeText('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to complete')
  });

  const rescheduleMutation = useMutation({
    mutationFn: (vars: { id: number; date: string }) => apiClient(`/api/followups/${vars.id}/reschedule/`, {
      method: 'PATCH',
      body: { scheduled_at: vars.date }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      toast.success('Follow-up rescheduled successfully!');
      setRescheduleModalOpen(false);
      setRescheduleDate('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to reschedule')
  });

  // Filter List
  const filteredFollowups = followups.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setFormData({
      title: '', description: '', follow_up_type: 'Call', related_to_type: 'General',
      related_to_id: null, scheduled_at: '', status: 'Pending', assigned_to: null
    });
    setCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFollowup) {
      completeMutation.mutate({ id: selectedFollowup.id, outcome: outcomeText });
    }
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFollowup) {
      rescheduleMutation.mutate({ id: selectedFollowup.id, date: rescheduleDate });
    }
  };

  const columns = [
    { 
      header: 'Follow-up Target', 
      accessor: (row: FollowUp) => (
        <div>
          <span className="font-semibold text-gray-900">{row.title}</span>
          <div className="text-xs text-gray-500">{row.related_to_type} #{row.related_to_id || 'General'}</div>
        </div>
      ) 
    },
    { header: 'Type', accessor: (row: FollowUp) => row.follow_up_type },
    { 
      header: 'Assignee', 
      accessor: (row: FollowUp) => (
        <div className="flex items-center space-x-2">
          {row.assigned_to_detail ? (
            <>
              <UserAvatar name={row.assigned_to_detail.full_name} size="sm" />
              <span className="text-xs text-gray-700">{row.assigned_to_detail.full_name}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}
        </div>
      )
    },
    { header: 'Status', accessor: (row: FollowUp) => <StatusBadge label={row.status} /> },
    { header: 'Scheduled Date/Time', accessor: (row: FollowUp) => <DateDisplay dateString={row.scheduled_at} includeTime /> },
    { 
      header: 'Actions', 
      accessor: (row: FollowUp) => (
        <div className="flex items-center space-x-2">
          {row.status !== 'Completed' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFollowup(row);
                  setCompleteModalOpen(true);
                }}
                className="p-1 text-green-600 hover:bg-green-50 rounded border border-green-200 transition-colors"
                title="Mark Completed"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFollowup(row);
                  setRescheduleModalOpen(true);
                }}
                className="px-2 py-1 text-xs text-primary hover:bg-indigo-50 border border-indigo-200 rounded transition-colors"
              >
                Reschedule
              </button>
            </>
          )}
        </div>
      ) 
    },
  ];

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups Scheduler</h1>
          <p className="text-sm text-gray-500">Ensure no clients or prospects go uncontacted. Schedule follow-ups.</p>
        </div>
        
        <button
          onClick={handleOpenCreate}
          className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
        >
          <Plus size={18} className="mr-1.5" />
          Schedule Follow-up
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-sm font-semibold">
        {(['today', 'upcoming', 'overdue', 'completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 sm:flex-initial px-6 py-3 text-center border-b-2 capitalize transition-colors
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

      {/* Filter and Table */}
      <div className="space-y-4">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search scheduled follow-ups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pl-10 pr-4 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredFollowups}
          isLoading={isLoading}
          emptyMessage={`No followups scheduled under ${activeTab}.`}
        />
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCreateModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule Follow-up</h2>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Title / Objective *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Call Stark Industries regarding proposal"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Related To Type</label>
                    <select
                      value={formData.related_to_type}
                      onChange={(e) => setFormData({...formData, related_to_type: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Lead">Lead Profile</option>
                      <option value="Client">Client Profile</option>
                      <option value="Project">Project Board</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Assign To Team Member</label>
                    <select
                      value={formData.assigned_to || ''}
                      onChange={(e) => setFormData({...formData, assigned_to: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
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
                    <label className="text-xs font-semibold text-gray-500">Contact Type</label>
                    <select
                      value={formData.follow_up_type}
                      onChange={(e) => setFormData({...formData, follow_up_type: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    >
                      <option value="Call">Phone Call</option>
                      <option value="Email">Email Check-in</option>
                      <option value="Meeting">Meeting Session</option>
                      <option value="WhatsApp">WhatsApp Chat</option>
                      <option value="Proposal">Send Proposal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Scheduled Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Brief Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCompleteModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Mark Follow-up Completed</h2>
              <p className="text-xs text-gray-500 mb-4">Record the outcome of: "{selectedFollowup?.title}"</p>
              
              <form onSubmit={handleCompleteSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Outcome Details *</label>
                  <textarea
                    required
                    placeholder="Describe what was discussed or decided..."
                    value={outcomeText}
                    onChange={(e) => setOutcomeText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setCompleteModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                  >
                    Submit Outcome
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Follow-up Modal */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setRescheduleModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Reschedule Follow-up</h2>
              <p className="text-xs text-gray-500 mb-4">Set a new date for: "{selectedFollowup?.title}"</p>
              
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">New Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm"
                  >
                    Save Reschedule
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
