import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  Users, FolderGit, DollarSign, Clock, ArrowUpRight, ArrowDownRight, 
  ArrowRight, CheckCircle2, TrendingUp, AlertCircle, Zap, LogIn, LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/shared/Badge';
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
  'New': 'bg-gray-800 text-text-sub/70 border-gray-700',
  'Planning': 'bg-indigo-900/40 text-indigo-300 border-indigo-500/20',
  'UI Design': 'bg-purple-900/40 text-purple-300 border-purple-500/20',
  'Development': 'bg-blue-900/40 text-blue-300 border-blue-500/20',
  'Testing': 'bg-amber-900/40 text-amber-300 border-amber-500/20',
  'Deployment': 'bg-orange-950/40 text-orange-300 border-orange-500/20',
  'Completed': 'bg-green-950/40 text-green-300 border-green-500/20',
  'On Hold': 'bg-red-950/40 text-red-300 border-red-500/20',
  'Cancelled': 'bg-gray-900/40 text-text-sub border-gray-800',
  'Backlog': 'bg-slate-900/40 text-slate-400 border-slate-800',
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

const formatAttendanceTime = (dateStr: string, timeStr: string | null) => {
  if (!timeStr) return '';
  try {
    const combinedStr = `${dateStr}T${timeStr}Z`;
    const date = new Date(combinedStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return timeStr;
  }
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Queries
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient('/api/dashboard/summary/'),
    refetchInterval: 60000,
  });

  const { data: salesReport } = useQuery<SalesReport>({
    queryKey: ['reports-sales'],
    queryFn: () => apiClient('/api/reports/sales/'),
  });

  const { data: projectsReport } = useQuery<ProjectsReport>({
    queryKey: ['reports-projects'],
    queryFn: () => apiClient('/api/reports/projects/'),
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
      toast.success("Successfully checked in! Let's build something awesome.");
    },
    onError: (err: any) => toast.error(err.message || 'Check-in failed'),
    onSettled: () => setIsCheckingIn(false)
  });

  const checkOutMutation = useMutation({
    mutationFn: () => apiClient('/api/team/attendance/check-out/', { method: 'POST' }),
    onMutate: () => setIsCheckingOut(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast.success('Successfully checked out! Have a restful evening.');
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
      color: 'bg-primary-light0/10 text-primary-light border-indigo-500/20',
      onClick: () => navigate('/leads'),
    },
    {
      name: 'Active Projects',
      value: summary?.active_projects_count ?? '—',
      sub: `${projectsReport?.overdue_milestones_count ?? 0} overdue milestones`,
      positive: (projectsReport?.overdue_milestones_count ?? 0) === 0,
      icon: FolderGit,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      onClick: () => navigate('/projects'),
    },
    {
      name: 'Revenue (MTD)',
      value: summary ? formatCurrency(summary.revenue_this_month) : '—',
      sub: `${formatCurrency(summary?.profit_this_month ?? 0)} profit`,
      positive: (summary?.profit_this_month ?? 0) >= 0,
      icon: DollarSign,
      color: 'bg-success/100/10 text-green-400 border-green-500/20',
      onClick: () => navigate('/finance'),
    },
    {
      name: "Today's Follow-ups",
      value: summary?.today_followups_count ?? '—',
      sub: `${todayFollowups.filter(f => f.status === 'Pending').length} pending`,
      positive: (summary?.today_followups_count ?? 0) === 0,
      icon: Clock,
      color: 'bg-warning/100/10 text-amber-400 border-amber-500/20',
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-xs md:text-sm text-text-sub">Here's what's happening with DPS today.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time Punch card inside header */}
          <div className="flex items-center bg-bg-card border border-border-card px-3.5 py-1.5 rounded-2xl shadow-md space-x-3.5">
            <div className="flex flex-col text-left">
              <span className="text-4xs font-bold text-text-sub uppercase tracking-wider">Attendance Status</span>
              <span className="text-2xs font-semibold">
                {!isCheckedIn ? (
                  <span className="text-text-sub">Not Checked In</span>
                ) : isCheckedOut ? (
                  <span className="text-amber-500">Checked Out</span>
                ) : (
                  <span className="text-success">Checked In ({formatAttendanceTime(todayRecord.date, todayRecord.check_in)})</span>
                )}
              </span>
            </div>
            
            {!isCheckedIn || isCheckedOut ? (
              <button
                onClick={() => checkInMutation.mutate()}
                disabled={isCheckingIn}
                className="flex items-center px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded-lg text-2xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <LogIn size={12} className="mr-1" />
                {isCheckingIn ? '...' : 'Check In'}
              </button>
            ) : (
              <button
                onClick={() => checkOutMutation.mutate()}
                disabled={isCheckingOut}
                className="flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-2xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <LogOut size={12} className="mr-1" />
                {isCheckingOut ? '...' : 'Check Out'}
              </button>
            )}
          </div>

          {summary?.hot_leads_count ? (
            <div className="flex items-center px-3 py-1.5 bg-danger/10 border border-danger/20 rounded-2xl text-2xs font-bold text-danger shadow-lg">
              <Zap size={12} className="mr-1" />
              {summary.hot_leads_count} Hot Lead{summary.hot_leads_count > 1 ? 's' : ''} Alert
            </div>
          ) : null}
          <div className="text-2xs font-semibold text-text-sub bg-bg-card border border-border-card px-3 py-1.5 rounded-2xl shadow-lg capitalize">
            {user?.role}
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <button
              key={idx}
              onClick={stat.onClick}
              className="bg-bg-card border border-border-card rounded-2xl p-5 flex flex-col justify-between text-left group hover:border-primary/40 transition-all duration-350 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-text-sub truncate uppercase tracking-wider">{stat.name}</p>
                  <p className="mt-1.5 text-2xl font-bold text-white tracking-tight">{String(stat.value)}</p>
                </div>
                <div className={`p-2.5 rounded-2xl border ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                <span className={`flex items-center font-bold mr-2 ${stat.positive ? 'text-success' : 'text-warning'}`}>
                  {stat.positive ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                </span>
                <span className="text-text-sub truncate font-medium">{stat.sub}</span>
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
            <div className="bg-bg-card p-5 rounded-2xl border border-border-card shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lead Pipeline</h3>
                <button onClick={() => navigate('/leads')} className="text-xs text-primary font-bold hover:underline flex items-center">
                  View All <ArrowRight size={12} className="ml-1" />
                </button>
              </div>
              <div className="space-y-3">
                {statusOrder.map(status => {
                  const count = statusMap[status] || 0;
                  const pct = Math.round((count / totalLeads) * 100);
                  const isWon = status === 'Won';
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <div className="w-24 text-2xs font-semibold text-text-sub truncate">{status}</div>
                      <div className="flex-1 bg-bg-main h-5 rounded-lg relative overflow-hidden border border-border-card">
                        <div
                          className={`${isWon ? 'bg-success' : 'bg-primary'} h-full transition-all duration-700`}
                          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                        />
                        {count > 0 && (
                          <span className="absolute inset-y-0 right-2 flex items-center text-3xs font-bold text-white">{count}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {salesReport && (
                  <div className="mt-3 pt-3 border-t border-border-card flex items-center justify-between text-xs text-text-sub font-semibold">
                    <span>Conversion rate</span>
                    <span className="font-bold text-success">{salesReport.conversion_rate.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Project Status Breakdown */}
            <div className="bg-bg-card p-5 rounded-2xl border border-border-card shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Project Status</h3>
                <button onClick={() => navigate('/projects')} className="text-xs text-primary font-bold hover:underline flex items-center">
                  View All <ArrowRight size={12} className="ml-1" />
                </button>
              </div>
              <div className="space-y-3.5">
                {Object.entries(projectStatusMap).length === 0 ? (
                  <p className="text-xs text-text-sub text-center py-6">No projects currently.</p>
                ) : (
                  Object.entries(projectStatusMap).map(([status, count]) => {
                    const pct = Math.round((count / totalProjects) * 100);
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${COLORS_BY_STATUS[status]?.split(' ')[0] || 'bg-gray-600'}`} />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-2xs font-semibold text-text-sub">{status}</span>
                          <span className="text-2xs font-bold text-white">{count}</span>
                        </div>
                        <div className="w-16 bg-bg-main h-1.5 rounded-full overflow-hidden border border-border-card">
                          <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {projectsReport?.overdue_milestones_count ? (
                <div className="mt-4 p-2 bg-warning/10 border border-warning/20 rounded-2xl flex items-center space-x-1.5 text-3xs text-warning font-bold uppercase tracking-wider">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{projectsReport.overdue_milestones_count} Overdue Milestone{projectsReport.overdue_milestones_count > 1 ? 's' : ''}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* My Tasks for Today */}
          <div className="bg-bg-card p-5 rounded-2xl border border-border-card shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">My Tasks Due Today</h3>
              <button onClick={() => navigate('/tasks')} className="text-xs text-primary font-bold hover:underline flex items-center">
                All Tasks <ArrowRight size={13} className="ml-1" />
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-text-sub">
                <CheckCircle2 size={28} className="mb-2 text-success" />
                <p className="text-xs font-semibold">All clear for today! No tasks due.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-card">
                {todayTasks.slice(0, 6).map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        task.priority === 'Blocker' ? 'bg-danger' :
                        task.priority === 'Critical' ? 'bg-danger' :
                        task.priority === 'High' ? 'bg-warning' :
                        task.priority === 'Medium' ? 'bg-primary' : 'bg-gray-600'
                      }`} />
                      <div>
                        <p className="text-xs font-semibold text-white leading-snug">{task.title}</p>
                        <p className="text-3xs text-text-sub">{task.project_detail?.name || 'Standalone Task'}</p>
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
          <div className="bg-bg-card p-5 rounded-2xl border border-border-card shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Today's Follow-ups</h3>
              <button onClick={() => navigate('/followups')} className="text-xs text-primary font-bold hover:underline">
                View All
              </button>
            </div>
            {todayFollowups.length === 0 ? (
              <p className="text-xs text-text-sub text-center py-6">No follow-ups scheduled today.</p>
            ) : (
              <div className="space-y-3">
                {todayFollowups.slice(0, 5).map((f) => (
                  <div key={f.id} className="p-3 bg-bg-main/60 rounded-2xl border border-border-card">
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold text-white leading-snug">{f.title}</p>
                      <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded text-4xs font-bold uppercase tracking-wider ${
                        f.status === 'Pending' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-success/10 text-success border border-success/20'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center space-x-2 text-3xs text-text-sub font-semibold">
                      <span>{f.follow_up_type}</span>
                      <span>·</span>
                      <span>{f.related_to_type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
