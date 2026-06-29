import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import DataTable from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/Badge';
import UserAvatar from '../../components/shared/UserAvatar';
import DateDisplay from '../../components/shared/DateDisplay';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { 
  Users, Clock, CalendarDays, BookOpen, LogIn, LogOut, Plus, 
  Check, X, FileText, ChevronRight, AlertCircle, Phone, Mail, UserCheck, Trash, Edit2
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Member {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  department: string;
  is_active: boolean;
  is_online: boolean;
  avatar: string | null;
  whatsapp_number?: string;
  custom_permissions?: string[];
}

interface AttendanceRecord {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  duration_hours: string | null;
  status: string;
  notes: string;
  user_detail?: Member;
}

interface LeaveRequest {
  id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by_detail?: Member;
  notes: string;
  created_at: string;
  user_detail?: Member;
}

interface WorkLog {
  id: number;
  date: string;
  log_text: string;
  tasks_completed: any[];
  blockers: string;
  created_at: string;
  user_detail?: Member;
}

export default function Team() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdminOrManager = ['superadmin', 'admin', 'manager'].includes(user?.role || '');
  const [activeTab, setActiveTab] = useState<'members' | 'attendance' | 'leaves' | 'logs'>('members');
  
  // Modals & Forms States
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [approveLeaveId, setApproveLeaveId] = useState<number | null>(null);
  const [rejectLeaveId, setRejectLeaveId] = useState<number | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  
  // Member Create/Edit/Delete States
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null);

  // Form inputs
  const [leaveFormData, setLeaveFormData] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  const [logFormData, setLogFormData] = useState({
    log_text: '',
    blockers: '',
  });

  const [memberForm, setMemberForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'developer',
    department: 'Engineering',
    whatsapp_number: '',
    password: '',
    custom_permissions: [] as string[]
  });

  // Queries
  const { data: members = [], isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => apiClient('/api/team/members/')
  });

  const { data: myAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance'],
    queryFn: () => apiClient('/api/team/attendance/my/')
  });

  const { data: todayAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['today-attendance'],
    queryFn: () => apiClient('/api/team/attendance/today/'),
    enabled: isAdminOrManager
  });

  const { data: myLeaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['my-leaves'],
    queryFn: () => apiClient('/api/team/leave-requests/my/')
  });

  const { data: pendingLeaves = [] } = useQuery<LeaveRequest[]>({
    queryKey: ['pending-leaves'],
    queryFn: () => apiClient('/api/team/leave-requests/pending/'),
    enabled: isAdminOrManager
  });

  const { data: myLogs = [] } = useQuery<WorkLog[]>({
    queryKey: ['my-logs'],
    queryFn: () => apiClient('/api/team/work-logs/my/')
  });

  const { data: allLogs = [] } = useQuery<WorkLog[]>({
    queryKey: ['all-logs'],
    queryFn: () => apiClient('/api/team/work-logs/all/'),
    enabled: isAdminOrManager
  });

  // Check if checked in today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = myAttendance.find(r => r.date === todayStr);
  const isCheckedIn = !!todayRecord;
  const isCheckedOut = todayRecord ? !!todayRecord.check_out : false;

  // Mutations
  const checkInMutation = useMutation({
    mutationFn: () => apiClient('/api/team/attendance/check-in/', { method: 'POST' }),
    onMutate: () => setIsCheckingIn(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast.success('Successfully checked in!');
    },
    onError: (err: any) => toast.error(err.message || 'Check-in failed'),
    onSettled: () => setIsCheckingIn(false)
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient('/api/team/attendance/check-out/', { method: 'POST' }),
    onMutate: () => setIsCheckingOut(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance'] });
      toast.success('Successfully checked out!');
    },
    onError: (err: any) => toast.error(err.message || 'Check-out failed'),
    onSettled: () => setIsCheckingOut(false)
  });

  const createLeaveMutation = useMutation({
    mutationFn: (data: typeof leaveFormData) => apiClient('/api/team/leave-requests/', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      toast.success('Leave request submitted!');
      setLeaveModalOpen(false);
      setLeaveFormData({ leave_type: 'Annual', start_date: '', end_date: '', reason: '' });
    },
    onError: (err: any) => toast.error(err.message || 'Submission failed')
  });

  const approveLeaveMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/team/leave-requests/${id}/approve/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      toast.success('Leave request approved!');
      setApproveLeaveId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Approval failed')
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/team/leave-requests/${id}/reject/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      toast.success('Leave request rejected.');
      setRejectLeaveId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Rejection failed')
  });

  const createLogMutation = useMutation({
    mutationFn: (data: typeof logFormData) => apiClient('/api/team/work-logs/', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-logs'] });
      queryClient.invalidateQueries({ queryKey: ['all-logs'] });
      toast.success('Daily work log submitted!');
      setLogModalOpen(false);
      setLogFormData({ log_text: '', blockers: '' });
    },
    onError: (err: any) => toast.error(err.message || 'Log submission failed')
  });

  const createMemberMutation = useMutation({
    mutationFn: (body: any) => apiClient('/api/team/members/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Team member created!');
      setMemberModalOpen(false);
      setMemberForm({ email: '', full_name: '', phone: '', role: 'developer', department: 'Engineering', whatsapp_number: '', password: '', custom_permissions: [] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add member')
  });

  const updateMemberMutation = useMutation({
    mutationFn: (vars: { id: number; body: any }) => apiClient(`/api/team/members/${vars.id}/`, { method: 'PUT', body: vars.body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Team member updated!');
      setMemberModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update member')
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/team/members/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Team member removed.');
      setDeleteMemberId(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete member')
  });

  const handleOpenCreateMember = () => {
    setIsEditingMember(false);
    setSelectedMember(null);
    setMemberForm({
      email: '',
      full_name: '',
      phone: '',
      role: 'developer',
      department: 'Engineering',
      whatsapp_number: '',
      password: '',
      custom_permissions: []
    });
    setMemberModalOpen(true);
  };

  const handleOpenEditMember = (member: Member) => {
    setIsEditingMember(true);
    setSelectedMember(member);
    setMemberForm({
      email: member.email,
      full_name: member.full_name,
      phone: member.phone || '',
      role: member.role,
      department: member.department || '',
      whatsapp_number: member.whatsapp_number || '',
      password: '',
      custom_permissions: (member as any).custom_permissions || []
    });
    setMemberModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team & HR Hub</h1>
          <p className="text-sm text-gray-500">Manage directory, daily attendance check-ins, leaves, and work logs.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'members' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Users size={16} />
            Members Directory
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'attendance' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Clock size={16} />
            Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'leaves' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <CalendarDays size={16} />
            Leave Requests
            {isAdminOrManager && pendingLeaves.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-3xs font-bold bg-amber-500 text-white rounded-full">
                {pendingLeaves.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'logs' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <BookOpen size={16} />
            Daily Work Logs
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        {activeTab === 'members' && (
          <div className="space-y-4">
            {user?.role === 'superadmin' && (
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-sm font-semibold text-gray-600">Register new team members and assign roles.</span>
                <button
                  onClick={handleOpenCreateMember}
                  className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
                >
                  <Plus size={16} className="mr-1.5" />
                  Add Team Member
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingMembers ? (
                <div className="col-span-full text-center py-12 text-gray-500">Loading directory...</div>
              ) : members.length === 0 ? (
                <div className="col-span-full text-center py-12 text-gray-500">No team members found.</div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex items-start space-x-4">
                        <UserAvatar name={member.full_name} size="lg" />
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-900 text-base leading-none">{member.full_name}</h3>
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${member.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
                          </div>
                          <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">{member.role}</p>
                          <p className="text-xs text-gray-400 font-semibold">{member.department || 'General'}</p>
                        </div>
                      </div>
                      {user?.role === 'superadmin' && (
                        <div className="flex space-x-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditMember(member)}
                            className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          {member.id !== user.id && (
                            <button
                              onClick={() => setDeleteMemberId(member.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Mail size={14} className="text-gray-400" />
                      <a href={`mailto:${member.email}`} className="hover:underline hover:text-primary">{member.email}</a>
                    </div>
                    {member.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Check-in Widget */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">My Attendance Status</h3>
                <p className="text-sm text-gray-500 mt-1">Track your daily shift entry and exits.</p>
              </div>

              <div className="py-6 border-y border-gray-100 flex flex-col items-center">
                <div className="text-4xl font-extrabold text-indigo-600 mb-2">
                  {todayRecord ? (todayRecord.status) : 'Not Logged'}
                </div>
                {todayRecord?.check_in && (
                  <div className="text-sm text-gray-500 mt-1">
                    Check-in: <span className="font-semibold text-gray-900">{todayRecord.check_in}</span>
                    {todayRecord.check_out && (
                      <> | Check-out: <span className="font-semibold text-gray-900">{todayRecord.check_out}</span></>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  disabled={isCheckedIn || isCheckingIn}
                  onClick={() => checkInMutation.mutate()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <LogIn size={18} />
                  Check In
                </button>
                <button
                  disabled={!isCheckedIn || isCheckedOut || isCheckingOut}
                  onClick={() => checkOutMutation.mutate()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <LogOut size={18} />
                  Check Out
                </button>
              </div>
            </div>

            {/* Attendance History */}
            <div className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Shift History</h3>
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Check In</th>
                      <th className="py-2.5">Check Out</th>
                      <th className="py-2.5">Hours</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAttendance.length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-center text-gray-400">No logs logged.</td></tr>
                    ) : (
                      myAttendance.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-medium text-gray-900">{row.date}</td>
                          <td className="py-3 text-gray-600">{row.check_in || '—'}</td>
                          <td className="py-3 text-gray-600">{row.check_out || '—'}</td>
                          <td className="py-3 font-semibold text-gray-900">{row.duration_hours ? `${row.duration_hours} hrs` : '—'}</td>
                          <td className="py-3"><StatusBadge label={row.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Admin: Team Today */}
            {isAdminOrManager && (
              <div className="col-span-full bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Team Attendance Today</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                        <th className="py-2.5">Member</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Check In</th>
                        <th className="py-2.5">Check Out</th>
                        <th className="py-2.5">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayAttendance.length === 0 ? (
                        <tr><td colSpan={5} className="py-4 text-center text-gray-400">No shifts started today.</td></tr>
                      ) : (
                        todayAttendance.map((row) => (
                          <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 font-semibold text-gray-900">{row.user_detail?.full_name || 'System User'}</td>
                            <td className="py-3"><StatusBadge label={row.status} /></td>
                            <td className="py-3">{row.check_in || '—'}</td>
                            <td className="py-3">{row.check_out || '—'}</td>
                            <td className="py-3">{row.duration_hours ? `${row.duration_hours} hrs` : '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-sm font-semibold text-gray-600">Track and request time off.</span>
              <button
                onClick={() => setLeaveModalOpen(true)}
                className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
              >
                <Plus size={16} className="mr-1.5" />
                Request Time Off
              </button>
            </div>

            {/* Pending Requests for Managers */}
            {isAdminOrManager && pendingLeaves.length > 0 && (
              <div className="bg-white border border-yellow-200 shadow-sm rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-amber-700 text-lg flex items-center">
                  <AlertCircle className="mr-2" size={20} />
                  Pending Approvals
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                        <th className="py-2.5">Member</th>
                        <th className="py-2.5">Leave Type</th>
                        <th className="py-2.5">Duration</th>
                        <th className="py-2.5">Reason</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLeaves.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-semibold text-gray-900">{row.user_detail?.full_name}</td>
                          <td className="py-3 font-medium">{row.leave_type}</td>
                          <td className="py-3 text-gray-600">
                            {row.start_date} to {row.end_date} ({row.days_requested} days)
                          </td>
                          <td className="py-3 max-w-xs truncate text-gray-500">{row.reason}</td>
                          <td className="py-3 text-right space-x-2">
                            <button
                              onClick={() => setApproveLeaveId(row.id)}
                              className="inline-flex p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setRejectLeaveId(row.id)}
                              className="inline-flex p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* My Leave Requests History */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Leave History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                      <th className="py-2.5">Leave Type</th>
                      <th className="py-2.5">Dates</th>
                      <th className="py-2.5">Days</th>
                      <th className="py-2.5">Reason</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.length === 0 ? (
                      <tr><td colSpan={5} className="py-4 text-center text-gray-400">No leave requests found.</td></tr>
                    ) : (
                      myLeaves.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 font-semibold text-gray-900">{row.leave_type}</td>
                          <td className="py-3 text-gray-600">{row.start_date} to {row.end_date}</td>
                          <td className="py-3 font-semibold text-gray-900">{row.days_requested}</td>
                          <td className="py-3 max-w-xs truncate text-gray-500">{row.reason}</td>
                          <td className="py-3"><StatusBadge label={row.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-sm font-semibold text-gray-600">Submit what you worked on today.</span>
              <button
                onClick={() => setLogModalOpen(true)}
                className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
              >
                <Plus size={16} className="mr-1.5" />
                Submit Work Log
              </button>
            </div>

            {/* Logs feed */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Recent Work Logs</h3>
              <div className="space-y-4">
                {(isAdminOrManager ? allLogs : myLogs).length === 0 ? (
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 text-center text-gray-400">
                    No work logs found. Be the first to submit today!
                  </div>
                ) : (
                  (isAdminOrManager ? allLogs : myLogs).map((log) => (
                    <div key={log.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <UserAvatar name={log.user_detail?.full_name || 'System User'} size="sm" />
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{log.user_detail?.full_name}</p>
                            <p className="text-3xs text-indigo-600 font-semibold uppercase tracking-wider">{log.user_detail?.role}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-400">{log.date}</span>
                      </div>

                      <div className="text-sm text-gray-700 whitespace-pre-wrap pl-1">{log.log_text}</div>

                      {log.blockers && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 flex items-start space-x-2">
                          <AlertCircle className="shrink-0 mt-0.5" size={14} />
                          <div>
                            <span className="font-bold">Blockers:</span> {log.blockers}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leave request modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setLeaveModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">Submit Leave Request</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createLeaveMutation.mutate(leaveFormData);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Leave Type</label>
                  <select
                    value={leaveFormData.leave_type}
                    onChange={(e) => setLeaveFormData({...leaveFormData, leave_type: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Annual">Annual</option>
                    <option value="Sick">Sick</option>
                    <option value="Casual">Casual</option>
                    <option value="Maternity">Maternity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveFormData.start_date}
                      onChange={(e) => setLeaveFormData({...leaveFormData, start_date: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveFormData.end_date}
                      onChange={(e) => setLeaveFormData({...leaveFormData, end_date: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({...leaveFormData, reason: e.target.value})}
                    placeholder="Provide details for your request..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLeaveModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Log modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setLogModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Submit Daily Work Log</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createLogMutation.mutate(logFormData);
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">What did you accomplish today? *</label>
                  <textarea
                    required
                    rows={4}
                    value={logFormData.log_text}
                    onChange={(e) => setLogFormData({...logFormData, log_text: e.target.value})}
                    placeholder="List the features built, bugs fixed, or tasks completed..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Blockers (if any)</label>
                  <textarea
                    rows={2}
                    value={logFormData.blockers}
                    onChange={(e) => setLogFormData({...logFormData, blockers: e.target.value})}
                    placeholder="Are you blocked by anything? (Leave blank if none)"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLogModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
                  >
                    Submit Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={approveLeaveId !== null}
        title="Approve Leave?"
        message="Are you sure you want to approve this leave request? This will mark the days as WFH/Leave for the team member."
        confirmLabel="Approve"
        onConfirm={() => approveLeaveId !== null && approveLeaveMutation.mutate(approveLeaveId)}
        onCancel={() => setApproveLeaveId(null)}
      />

      <ConfirmModal
        isOpen={rejectLeaveId !== null}
        title="Reject Leave Request?"
        message="Are you sure you want to reject this request? The employee will be notified."
        confirmLabel="Reject"
        onConfirm={() => rejectLeaveId !== null && rejectLeaveMutation.mutate(rejectLeaveId)}
        onCancel={() => setRejectLeaveId(null)}
      />

      {/* Add / Edit Member Modal */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setMemberModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {isEditingMember ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const payload = { ...memberForm };
                  if (isEditingMember && !payload.password) {
                    delete (payload as any).password;
                  }
                  if (isEditingMember && selectedMember) {
                    updateMemberMutation.mutate({ id: selectedMember.id, body: payload });
                  } else {
                    createMemberMutation.mutate(payload);
                  }
                }} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={memberForm.full_name}
                    onChange={(e) => setMemberForm({...memberForm, full_name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Phone</label>
                    <input
                      type="text"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">WhatsApp Number</label>
                    <input
                      type="text"
                      value={memberForm.whatsapp_number}
                      onChange={(e) => setMemberForm({...memberForm, whatsapp_number: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Role</label>
                    <select
                      value={memberForm.role}
                      onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="superadmin">Super Admin / Founder</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="developer">Developer</option>
                      <option value="designer">Designer</option>
                      <option value="marketer">Marketer</option>
                      <option value="support">Support</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Department</label>
                    <input
                      type="text"
                      value={memberForm.department}
                      onChange={(e) => setMemberForm({...memberForm, department: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">
                    {isEditingMember ? 'Update Password (leave blank to keep current)' : 'Initial Password *'}
                  </label>
                  <input
                    type="password"
                    required={!isEditingMember}
                    value={memberForm.password}
                    onChange={(e) => setMemberForm({...memberForm, password: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Custom Permissions Checklist */}
                <div className="space-y-2 border-t pt-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Access Capabilities</span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {['leads', 'clients', 'projects', 'finance', 'team', 'marketing', 'seo', 'infrastructure', 'products', 'reports', 'settings'].map(cap => (
                      <label key={cap} className="flex items-center space-x-2 text-xs font-semibold text-gray-600 capitalize cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memberForm.custom_permissions.includes(cap)}
                          onChange={(e) => {
                            const newPerms = e.target.checked
                              ? [...memberForm.custom_permissions, cap]
                              : memberForm.custom_permissions.filter(p => p !== cap);
                            setMemberForm({ ...memberForm, custom_permissions: newPerms });
                          }}
                          className="rounded text-primary h-4 w-4"
                        />
                        <span>{cap}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMemberModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-colors"
                  >
                    {isEditingMember ? 'Update Member' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation */}
      <ConfirmModal
        isOpen={deleteMemberId !== null}
        title="Remove Team Member?"
        message="Are you sure you want to remove this member from the organization? This action is permanent and revoke all CRM access."
        confirmLabel="Remove Member"
        onConfirm={() => deleteMemberId !== null && deleteMemberMutation.mutate(deleteMemberId)}
        onCancel={() => setDeleteMemberId(null)}
      />
    </div>
  );
}
