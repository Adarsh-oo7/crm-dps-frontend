import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Users, FolderGit, DollarSign, Clock, ArrowUpRight, ArrowDownRight, 
  ArrowRight, CheckCircle2, TrendingUp, AlertCircle, Zap, LogIn, LogOut, Play, Square 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import DateDisplay from '../../components/shared/DateDisplay';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

interface DashboardSummary {
  leads_count: number;
  hot_leads_count: number;
  active_projects_count: number;
  my_tasks_today_count: number;
  revenue_this_month: number;
  expenses_this_month: number;
  profit_this_month: number;
  today_followups_count: number;
}

interface SalesReport {
  total_leads: number;
  leads_won: number;
  conversion_rate: number;
  leads_by_status: { status: string; count: number }[];
  leads_by_source: { lead_source: string; count: number }[];
}

interface ProjectsReport {
  total_projects: number;
  projects_by_status: { status: string; count: number }[];
  overdue_milestones_count: number;
}

interface FollowUp {
  id: number;
  title: string;
  follow_up_type: string;
  scheduled_at: string;
  status: string;
  related_to_type: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  task_type: string;
  project_detail?: { id: number; name: string };
  due_date: string | null;
}

interface AttendanceRecord {
  id: number;
  date: string;
  check_in: string | null;
  check_out: string | null;
  duration_hours: string | null;
  status: string;
}

const COLORS_BY_STATUS: Record<string, string> = {
  'New': 'bg-gray-100 text-gray-700',
  'Planning': 'bg-gray-200 text-gray-700',
  'UI Design': 'bg-purple-100 text-purple-700',
  'Development': 'bg-blue-100 text-blue-700',
  'Testing': 'bg-amber-100 text-amber-700',
  'Deployment': 'bg-orange-100 text-orange-700',
  'Completed': 'bg-green-100 text-green-700',
  'On Hold': 'bg-red-100 text-red-700',
  'Cancelled': 'bg-gray-50 text-gray-400',
  'Backlog': 'bg-slate-100 text-slate-500',
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Queries
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient('/api/reports/dashboard/summary/'),
    refetchInterval: 60000,
  });

  const { data: salesReport } = useQuery<SalesReport>({
    queryKey: ['reports-sales'],
    queryFn: () => apiClient('/api/reports/reports/sales/'),
  });

  const { data: projectsReport } = useQuery<ProjectsReport>({
    queryKey: ['reports-projects'],
    queryFn: () => apiClient('/api/reports/reports/projects/'),
  });

  const { data: todayFollowups = [] } = useQuery<FollowUp[]>({
    queryKey: ['today-followups'],
    queryFn: () => apiClient('/api/followups/today/'),
    refetchInterval: 60000,
  });

  const { data: todayTasks = [] } = useQuery<Task[]>({
    queryKey: ['today-tasks'],
    queryFn: () => apiClient('/api/tasks/today/'),
  });

  const { data: myAttendance = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['my-attendance'],
    queryFn: () => apiClient('/api/team/attendance/my/'),
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
      toast.success('Successfully checked in today! Let\'s build great things.');
    },
    onError: (err: any) => toast.error(err.message || 'Check-in failed'),
    onSettled: () => setIsCheckingIn(false)
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient('/api/team/attendance/check-out/', { method: 'POST' }),
    onMutate: () => setIsCheckingOut(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast.success('Successfully checked out. Have a great evening!');
    },
    onError: (err: any) => toast.error(err.message || 'Check-out failed'),
    onSettled: () => setIsCheckingOut(false)
  });

  const stats = [
    {
      name: 'Total Leads',
      value: summary?.leads_count ?? '—',
      sub: `${summary?.hot_leads_count ?? 0} hot leads`,
      positive: (summary?.leads_count ?? 0) > 0,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-700',
      onClick: () => navigate('/leads'),
    },
    {
      name: 'Active Projects',
      value: summary?.active_projects_count ?? '—',
      sub: `${projectsReport?.overdue_milestones_count ?? 0} overdue milestones`,
      positive: (projectsReport?.overdue_milestones_count ?? 0) === 0,
      icon: FolderGit,
      color: 'bg-blue-50 text-blue-700',
      onClick: () => navigate('/projects'),
    },
    {
      name: 'Revenue (MTD)',
      value: summary ? formatCurrency(summary.revenue_this_month) : '—',
      sub: `${formatCurrency(summary?.profit_this_month ?? 0)} profit`,
      positive: (summary?.profit_this_month ?? 0) >= 0,
      icon: DollarSign,
      color: 'bg-green-50 text-green-700',
      onClick: () => navigate('/finance'),
    },
    {
      name: "Today's Follow-ups",
      value: summary?.today_followups_count ?? '—',
      sub: `${todayFollowups.filter(f => f.status === 'Pending').length} pending`,
      positive: (summary?.today_followups_count ?? 0) === 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-700',
      onClick: () => navigate('/followups'),
    },
  ];

  const statusOrder = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won'];
  const statusMap = Object.fromEntries((salesReport?.leads_by_status || []).map(s => [s.status, s.count]));
  const totalLeads = salesReport?.total_leads || 1;

  const projectStatusMap = Object.fromEntries((projectsReport?.projects_by_status || []).map(s => [s.status, s.count]));
  const totalProjects = projectsReport?.total_projects || 1;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-sm text-gray-500">Here's what's happening with DPS today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Real-time Punch card inside header */}
          <div className="flex items-center bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm space-x-4">
            <div className="flex flex-col text-left">
              <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Attendance Status</span>
              <span className="text-xs font-semibold text-gray-700">
                {!isCheckedIn ? (
                  <span className="text-gray-500">Not Checked In</span>
                ) : isCheckedOut ? (
                  <span className="text-amber-600">Checked Out (Done)</span>
                ) : (
                  <span className="text-green-600">Checked In ({todayRecord?.check_in})</span>
                )}
              </span>
            </div>
            
            {!isCheckedIn ? (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={isCheckingIn}
                className="flex items-center px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <LogIn size={14} className="mr-1" />
                {isCheckingIn ? '...' : 'Check In'}
              </button>
            ) : !isCheckedOut ? (
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={isCheckingOut}
                className="flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <LogOut size={14} className="mr-1" />
                {isCheckingOut ? '...' : 'Check Out'}
              </button>
            ) : (
              <span className="px-2.5 py-1 bg-gray-150 text-gray-500 text-2xs font-bold rounded-lg border border-gray-250">
                Done for Today
              </span>
            )}
          </div>

          {summary?.hot_leads_count ? (
            <div className="flex items-center px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700 shadow-sm">
              <Zap size={14} className="mr-1.5" />
              {summary.hot_leads_count} Hot Lead{summary.hot_leads_count > 1 ? 's' : ''} Need Attention
            </div>
          ) : null}
          <div className="text-sm font-medium text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm capitalize">
            {user?.role}
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <button
              key={idx}
              onClick={stat.onClick}
              className="bg-white overflow-hidden rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 p-5 flex flex-col justify-between text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 truncate">{stat.name}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{String(stat.value)}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={`flex items-center font-semibold mr-2 ${stat.positive ? 'text-green-600' : 'text-amber-600'}`}>
                  {stat.positive ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                </span>
                <span className="text-gray-500 truncate">{stat.sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Lead Pipeline Funnel */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Lead Pipeline</h3>
                <button onClick={() => navigate('/leads')} className="text-xs text-primary font-semibold hover:underline flex items-center">
                  View All <ArrowRight size={13} className="ml-1" />
                </button>
              </div>
              <div className="space-y-2.5">
                {statusOrder.map(status => {
                  const count = statusMap[status] || 0;
                  const pct = Math.round((count / totalLeads) * 100);
                  const isWon = status === 'Won';
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <div className="w-28 text-xs font-semibold text-gray-500 truncate">{status}</div>
                      <div className="flex-1 bg-gray-100 h-6 rounded relative overflow-hidden">
                        <div
                          className={`${isWon ? 'bg-green-500' : 'bg-indigo-500'} h-full transition-all duration-700`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                        {count > 0 && (
                          <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-gray-700">{count}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {salesReport && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Conversion rate</span>
                    <span className="font-bold text-green-600">{salesReport.conversion_rate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Status Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-900">Project Status</h3>
                <button onClick={() => navigate('/projects')} className="text-xs text-primary font-semibold hover:underline flex items-center">
                  View All <ArrowRight size={13} className="ml-1" />
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(projectStatusMap).length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No projects yet.</p>
                ) : (
                  Object.entries(projectStatusMap).map(([status, count]) => {
                    const pct = Math.round((count / totalProjects) * 100);
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLORS_BY_STATUS[status]?.split(' ')[0] || 'bg-gray-300'}`} />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">{status}</span>
                          <span className="text-xs font-bold text-gray-900">{count}</span>
                        </div>
                        <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-400 h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {projectsReport?.overdue_milestones_count ? (
                <div className="mt-4 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2 text-xs text-amber-700 font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{projectsReport.overdue_milestones_count} overdue milestone{projectsReport.overdue_milestones_count > 1 ? 's' : ''}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* My Tasks for Today */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">My Tasks Due Today</h3>
              <button onClick={() => navigate('/tasks')} className="text-xs text-primary font-semibold hover:underline flex items-center">
                All Tasks <ArrowRight size={14} className="ml-1" />
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <CheckCircle2 size={32} className="mb-2 text-green-400" />
                <p className="text-sm font-semibold">All clear for today! No tasks due.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayTasks.slice(0, 6).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        task.priority === 'Blocker' ? 'bg-red-600' :
                        task.priority === 'Critical' ? 'bg-red-500' :
                        task.priority === 'High' ? 'bg-amber-500' :
                        task.priority === 'Medium' ? 'bg-blue-400' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                        <p className="text-xs text-gray-400">{task.project_detail?.name || 'Standalone Task'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2 shrink-0">
                      <StatusBadge label={task.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Today's Follow-ups */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Today's Follow-ups</h3>
              <button onClick={() => navigate('/followups')} className="text-xs text-primary font-semibold hover:underline">
                View All
              </button>
            </div>
            {todayFollowups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No follow-ups scheduled today.</p>
            ) : (
              <div className="space-y-2.5">
                {todayFollowups.slice(0, 5).map((f) => (
                  <div key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{f.title}</p>
                      <span className={`shrink-0 ml-2 px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider ${
                        f.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2 text-2xs text-gray-500 font-semibold">
                      <span>{f.follow_up_type}</span>
                      <span>·</span>
                      <span>{f.related_to_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp size={16} className="mr-2 text-indigo-500" />
              Finance Summary (MTD)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Revenue</span>
                <span className="font-bold text-green-600">{formatCurrency(summary?.revenue_this_month ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Expenses</span>
                <span className="font-bold text-red-500">{formatCurrency(summary?.expenses_this_month ?? 0)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-sm">
                <span className="font-semibold text-gray-700">Net Profit</span>
                <span className={`font-bold text-base ${(summary?.profit_this_month ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary?.profit_this_month ?? 0)}
                </span>
              </div>
              <button
                onClick={() => navigate('/finance')}
                className="w-full mt-1 text-center text-xs text-primary font-semibold hover:underline flex items-center justify-center"
              >
                Open Finance <ArrowRight size={13} className="ml-1" />
              </button>
            </div>
          </div>

          {/* Lead Source Breakdown */}
          {salesReport?.leads_by_source && salesReport.leads_by_source.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Lead Sources</h3>
              <div className="space-y-2">
                {salesReport.leads_by_source.sort((a, b) => b.count - a.count).slice(0, 5).map(s => (
                  <div key={s.lead_source} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">{s.lead_source}</span>
                    <span className="font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
