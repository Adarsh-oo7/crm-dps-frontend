import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Users, FolderGit, ShieldCheck, FileText, AlertCircle
} from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

export default function Reports() {
  // Queries
  const { data: salesReport = { total_leads: 0, leads_won: 0, conversion_rate: 0, leads_by_status: [], leads_by_source: [] } } = useQuery({
    queryKey: ['reports-sales'],
    queryFn: () => apiClient('/api/reports/sales/')
  });

  const { data: projectsReport = { total_projects: 0, projects_by_status: [], projects_by_priority: [], overdue_milestones_count: 0 } } = useQuery({
    queryKey: ['reports-projects'],
    queryFn: () => apiClient('/api/reports/projects/')
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: () => apiClient('/api/finance/revenue-chart/').catch(() => [])
  });

  const statusPieData = projectsReport.projects_by_status.map((item: any) => ({
    name: item.status,
    value: item.count
  }));

  const leadsPieData = salesReport.leads_by_status.map((item: any) => ({
    name: item.status,
    value: item.count
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Reports</h1>
        <p className="text-sm text-gray-500">Overview of sales conversions, financial performance, and project health metrics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Sales Conversion Rate</span>
            <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{parseFloat(salesReport.conversion_rate).toFixed(1)}%</h3>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600"><TrendingUp size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Total Tracked Leads</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{salesReport.total_leads}</h3>
          </div>
          <div className="p-3 rounded-lg bg-green-50 text-green-600"><Users size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Total Projects Tracked</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{projectsReport.total_projects}</h3>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><FolderGit size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Overdue Milestones</span>
            <h3 className="text-2xl font-extrabold text-red-600 mt-1">{projectsReport.overdue_milestones_count}</h3>
          </div>
          <div className="p-3 rounded-lg bg-red-50 text-red-600"><AlertCircle size={20} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">P&L Performance Overview</h3>
          <div className="h-80">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">No financial data logged. Add invoices to see chart.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#4F46E5" name="Revenue / Invoiced" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Status Pie */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Project Status Breakdown</h3>
          <div className="h-64 flex justify-center items-center">
            {statusPieData.length === 0 ? (
              <span className="text-gray-400">No active projects.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            {statusPieData.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-1.5 font-medium text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Stages Pie */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Leads Pipeline Distribution</h3>
          <div className="h-64 flex justify-center items-center">
            {leadsPieData.length === 0 ? (
              <span className="text-gray-400">No leads added.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadsPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadsPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            {leadsPieData.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-1.5 font-medium text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
