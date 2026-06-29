import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/shared/Badge';
import { 
  Plus, Search, ArrowUp, ArrowDown, ExternalLink, Calendar,
  BarChart2, FileText, Activity, AlertCircle, Trash
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface SEOKeyword {
  id: number;
  keyword: string;
  target_url: string;
  search_engine: string;
  current_position: number;
  best_position: number;
  monthly_search_volume: number;
  difficulty: number;
  status: string;
}

interface SEOReport {
  id: number;
  report_date: string;
  organic_traffic: number;
  organic_clicks: number;
  impressions: number;
  avg_position: string;
  backlinks_total: number;
  client_detail?: { company_name: string };
}

export default function SEO() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'keywords' | 'reports'>('keywords');
  const [keywordModalOpen, setKeywordModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(null);
  
  // Forms
  const [keywordForm, setKeywordForm] = useState({
    keyword: '',
    target_url: '',
    search_engine: 'Google',
    country: 'US',
    language: 'en',
    monthly_search_volume: 0,
    difficulty: 10,
  });

  const [reportForm, setReportForm] = useState({
    client: '',
    report_date: '',
    organic_traffic: 0,
    organic_clicks: 0,
    impressions: 0,
    avg_position: '0.00',
    backlinks_total: 0
  });

  // Queries
  const { data: keywords = [] } = useQuery<SEOKeyword[]>({
    queryKey: ['seo-keywords'],
    queryFn: () => apiClient('/api/seo/keywords/')
  });

  const { data: stats = { total_keywords: 0, average_position: 0, top_3_count: 0, top_10_count: 0 } } = useQuery({
    queryKey: ['seo-stats'],
    queryFn: () => apiClient('/api/seo/keywords/stats/')
  });

  const { data: reports = [] } = useQuery<SEOReport[]>({
    queryKey: ['seo-reports'],
    queryFn: () => apiClient('/api/seo/reports/')
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient('/api/clients/').then(res => res.results || res)
  });

  const { data: rankHistory = [] } = useQuery<any[]>({
    queryKey: ['rank-history', selectedKeywordId],
    queryFn: () => apiClient(`/api/seo/keywords/${selectedKeywordId}/rank-history/`),
    enabled: selectedKeywordId !== null
  });

  // Mutations
  const createKeyword = useMutation({
    mutationFn: (body: any) => apiClient('/api/seo/keywords/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] });
      queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      toast.success('Keyword added for tracking!');
      setKeywordModalOpen(false);
    }
  });

  const createReport = useMutation({
    mutationFn: (body: any) => apiClient('/api/seo/reports/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-reports'] });
      toast.success('SEO performance report logged!');
      setReportModalOpen(false);
    }
  });

  const deleteKeyword = useMutation({
    mutationFn: (id: number) => apiClient(`/api/seo/keywords/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords'] });
      queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      toast.success('Keyword removed.');
    }
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Rankings Tracker</h1>
          <p className="text-sm text-gray-500">Monitor website keyword rankings, search engine volumes, and organic metrics.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Tracked Keywords</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total_keywords}</h3>
          </div>
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600"><Search size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Average Position</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">#{parseFloat(stats.average_position).toFixed(1)}</h3>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600"><Activity size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Top 3 Keywords</span>
            <h3 className="text-2xl font-extrabold text-green-600 mt-1">{stats.top_3_count}</h3>
          </div>
          <div className="p-3 rounded-lg bg-green-50 text-green-600"><ArrowUp size={20} /></div>
        </div>
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
          <div>
            <span className="text-2xs text-gray-400 font-bold uppercase">Top 10 Keywords</span>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.top_10_count}</h3>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><BarChart2 size={20} /></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('keywords')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'keywords' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Activity size={16} />
            Keyword Rankings
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <FileText size={16} />
            Performance Reports
          </button>
        </nav>
      </div>

      {/* Panels */}
      {activeTab === 'keywords' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Track organic ranks.</span>
            <button
              onClick={() => setKeywordModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add Keyword
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Keyword</th>
                  <th className="p-4">Target URL</th>
                  <th className="p-4">Search Engine</th>
                  <th className="p-4">Search Volume</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Current Pos</th>
                  <th className="p-4">Best Pos</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keywords.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">No keywords added yet.</td></tr>
                ) : (
                  keywords.map((k) => (
                    <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{k.keyword}</td>
                      <td className="p-4 text-xs font-semibold text-indigo-600 truncate max-w-xs">
                        <a href={k.target_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                          {k.target_url} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="p-4">{k.search_engine}</td>
                      <td className="p-4">{k.monthly_search_volume.toLocaleString()}</td>
                      <td className="p-4 font-medium">{k.difficulty}/100</td>
                      <td className="p-4 font-bold text-gray-900">
                        #{k.current_position}
                      </td>
                      <td className="p-4 font-bold text-green-600">#{k.best_position || '—'}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedKeywordId(k.id)}
                          className="px-2.5 py-1 text-2xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                        >
                          History
                        </button>
                        <button
                          onClick={() => deleteKeyword.mutate(k.id)}
                          className="inline-flex p-1 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Log monthly SEO reports.</span>
            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add SEO Report
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Client</th>
                  <th className="p-4">Report Date</th>
                  <th className="p-4">Traffic</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">Impressions</th>
                  <th className="p-4">Avg. Position</th>
                  <th className="p-4">Total Backlinks</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No performance reports submitted.</td></tr>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{r.client_detail?.company_name || 'System Client'}</td>
                      <td className="p-4">{r.report_date}</td>
                      <td className="p-4">{r.organic_traffic.toLocaleString()}</td>
                      <td className="p-4">{r.organic_clicks.toLocaleString()}</td>
                      <td className="p-4">{r.impressions.toLocaleString()}</td>
                      <td className="p-4 font-semibold">#{parseFloat(r.avg_position).toFixed(1)}</td>
                      <td className="p-4">{r.backlinks_total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keyword Modal */}
      {keywordModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setKeywordModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Track Keyword</h2>
              <form onSubmit={(e) => { e.preventDefault(); createKeyword.mutate(keywordForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Keyword *</label>
                  <input type="text" required value={keywordForm.keyword} onChange={(e) => setKeywordForm({...keywordForm, keyword: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Target URL *</label>
                  <input type="url" required value={keywordForm.target_url} onChange={(e) => setKeywordForm({...keywordForm, target_url: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Search Engine</label>
                    <select value={keywordForm.search_engine} onChange={(e) => setKeywordForm({...keywordForm, search_engine: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Google">Google</option>
                      <option value="Bing">Bing</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Difficulty (1-100)</label>
                    <input type="number" min="1" max="100" value={keywordForm.difficulty} onChange={(e) => setKeywordForm({...keywordForm, difficulty: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Monthly Search Volume</label>
                  <input type="number" value={keywordForm.monthly_search_volume} onChange={(e) => setKeywordForm({...keywordForm, monthly_search_volume: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setKeywordModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Track</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Sub-modal */}
      {selectedKeywordId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedKeywordId(null)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">Rank log details</h3>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-semibold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankHistory.length === 0 ? (
                      <tr><td colSpan={2} className="py-4 text-center text-gray-400">No historical checks.</td></tr>
                    ) : (
                      rankHistory.map((h, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2.5">{h.check_date}</td>
                          <td className="py-2.5 font-bold text-indigo-600">#{h.position}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-right">
                <button onClick={() => setSelectedKeywordId(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded font-semibold text-sm">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setReportModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">Submit SEO Report</h2>
              <form onSubmit={(e) => { e.preventDefault(); createReport.mutate(reportForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Client *</label>
                  <select required value={reportForm.client} onChange={(e) => setReportForm({...reportForm, client: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Select Client</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Report Date *</label>
                  <input type="date" required value={reportForm.report_date} onChange={(e) => setReportForm({...reportForm, report_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Organic Traffic</label>
                    <input type="number" value={reportForm.organic_traffic} onChange={(e) => setReportForm({...reportForm, organic_traffic: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Organic Clicks</label>
                    <input type="number" value={reportForm.organic_clicks} onChange={(e) => setReportForm({...reportForm, organic_clicks: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Avg. Position</label>
                    <input type="text" value={reportForm.avg_position} onChange={(e) => setReportForm({...reportForm, avg_position: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Total Backlinks</label>
                    <input type="number" value={reportForm.backlinks_total} onChange={(e) => setReportForm({...reportForm, backlinks_total: parseInt(e.target.value)})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setReportModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Submit Report</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
