import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/shared/Badge';
import { Plus, TrendingUp, DollarSign, Calendar, MessageSquare, Megaphone, Check, Globe } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Campaign {
  id: number;
  name: string;
  campaign_type: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: string;
  actual_spent: string;
  platform: string;
  expected_reach: number;
  actual_reach: number;
  clicks: number;
  conversions: number;
  roi: number;
}

interface ContentItem {
  id: number;
  title: string;
  content_type: string;
  platform: string;
  status: string;
  scheduled_date: string | null;
  published_date: string | null;
  author_detail?: { full_name: string };
  reviewer_detail?: { full_name: string };
  content_url: string;
}

export default function Marketing() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'campaigns' | 'calendar'>('campaigns');
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);

  // Forms
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    campaign_type: 'Email',
    status: 'Planning',
    start_date: '',
    end_date: '',
    budget: '0.00',
    actual_spent: '0.00',
    platform: 'Facebook',
    goal: '',
    target_audience: ''
  });

  const [contentForm, setContentForm] = useState({
    title: '',
    content_type: 'LinkedIn Post',
    platform: 'LinkedIn',
    status: 'Idea',
    scheduled_date: '',
    notes: ''
  });

  // Queries
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => apiClient('/api/marketing/campaigns/')
  });

  const { data: contentItems = [] } = useQuery<ContentItem[]>({
    queryKey: ['content-items'],
    queryFn: () => apiClient('/api/marketing/content/')
  });

  // Mutations
  const createCampaign = useMutation({
    mutationFn: (body: any) => apiClient('/api/marketing/campaigns/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign launched!');
      setCampaignModalOpen(false);
    }
  });

  const createContent = useMutation({
    mutationFn: (body: any) => apiClient('/api/marketing/content/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      toast.success('Calendar item scheduled!');
      setContentModalOpen(false);
    }
  });

  const publishContentMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/marketing/content/${id}/`, {
      method: 'PUT',
      body: { status: 'Published', published_date: new Date().toISOString() }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
      toast.success('Content marked as Published!');
    }
  });

  // Stats computed
  const totalBudget = campaigns.reduce((acc, c) => acc + parseFloat(c.budget), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + parseFloat(c.actual_spent), 0);
  const avgROI = campaigns.length > 0 ? campaigns.reduce((acc, c) => acc + c.roi, 0) / campaigns.length : 0;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing & Campaigns</h1>
          <p className="text-sm text-gray-500">Coordinate organic content calendars and tracked paid ads performance.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'campaigns' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Megaphone size={16} />
            Paid Campaigns
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'calendar' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Calendar size={16} />
            Content Calendar
          </button>
        </nav>
      </div>

      {/* Panels */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">Total Budget Allocated</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">${totalBudget.toLocaleString()}</h3>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600"><DollarSign size={20} /></div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">Total Spent</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">${totalSpent.toLocaleString()}</h3>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600"><TrendingUp size={20} /></div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center justify-between">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">Average ROI</span>
                <h3 className="text-2xl font-extrabold text-green-600 mt-1">{avgROI.toFixed(1)}x</h3>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600"><MessageSquare size={20} /></div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Track active ad campaigns.</span>
            <button
              onClick={() => setCampaignModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Launch Campaign
            </button>
          </div>

          {/* List */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Campaign Name</th>
                  <th className="p-4">Platform</th>
                  <th className="p-4">Budget</th>
                  <th className="p-4">Spent</th>
                  <th className="p-4">Conversions</th>
                  <th className="p-4">ROI</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No campaigns launched.</td></tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{c.name}</td>
                      <td className="p-4">{c.platform}</td>
                      <td className="p-4">${parseFloat(c.budget).toLocaleString()}</td>
                      <td className="p-4">${parseFloat(c.actual_spent).toLocaleString()}</td>
                      <td className="p-4">{c.conversions}</td>
                      <td className="p-4 font-bold text-green-600">{c.roi.toFixed(1)}x</td>
                      <td className="p-4"><StatusBadge label={c.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Plan posts and articles schedules.</span>
            <button
              onClick={() => setContentModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Schedule Post
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Title</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Platform</th>
                  <th className="p-4">Scheduled Date</th>
                  <th className="p-4">Author</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contentItems.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No scheduled content.</td></tr>
                ) : (
                  contentItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">
                        {item.content_url ? (
                          <a href={item.content_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {item.title} <Globe size={12} />
                          </a>
                        ) : (
                          item.title
                        )}
                      </td>
                      <td className="p-4">{item.content_type}</td>
                      <td className="p-4">{item.platform}</td>
                      <td className="p-4">{item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '—'}</td>
                      <td className="p-4 text-gray-500 font-medium">{item.author_detail?.full_name}</td>
                      <td className="p-4"><StatusBadge label={item.status} /></td>
                      <td className="p-4 text-right">
                        {item.status !== 'Published' && (
                          <button
                            onClick={() => publishContentMutation.mutate(item.id)}
                            className="inline-flex p-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded"
                          >
                            <Check size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCampaignModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Launch Campaign</h2>
              <form onSubmit={(e) => { e.preventDefault(); createCampaign.mutate(campaignForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Name *</label>
                  <input type="text" required value={campaignForm.name} onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Type</label>
                    <select value={campaignForm.campaign_type} onChange={(e) => setCampaignForm({...campaignForm, campaign_type: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Email">Email</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Google Ads">Google Ads</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Content">Content</option>
                      <option value="SEO">SEO</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Platform</label>
                    <select value={campaignForm.platform} onChange={(e) => setCampaignForm({...campaignForm, platform: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Google">Google</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Start Date</label>
                    <input type="date" required value={campaignForm.start_date} onChange={(e) => setCampaignForm({...campaignForm, start_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">End Date</label>
                    <input type="date" required value={campaignForm.end_date} onChange={(e) => setCampaignForm({...campaignForm, end_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Budget ($)</label>
                    <input type="number" required value={campaignForm.budget} onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Spent ($)</label>
                    <input type="number" required value={campaignForm.actual_spent} onChange={(e) => setCampaignForm({...campaignForm, actual_spent: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setCampaignModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Launch</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Content Modal */}
      {contentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setContentModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule Post</h2>
              <form onSubmit={(e) => { e.preventDefault(); createContent.mutate(contentForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Title *</label>
                  <input type="text" required value={contentForm.title} onChange={(e) => setContentForm({...contentForm, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Content Type</label>
                    <select value={contentForm.content_type} onChange={(e) => setContentForm({...contentForm, content_type: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Blog">Blog</option>
                      <option value="LinkedIn Post">LinkedIn Post</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Video">Video</option>
                      <option value="Email Newsletter">Email Newsletter</option>
                      <option value="Case Study">Case Study</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Platform</label>
                    <input type="text" required value={contentForm.platform} onChange={(e) => setContentForm({...contentForm, platform: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Scheduled Date</label>
                  <input type="datetime-local" value={contentForm.scheduled_date} onChange={(e) => setContentForm({...contentForm, scheduled_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setContentModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
