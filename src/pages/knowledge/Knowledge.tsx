import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/shared/Badge';
import { 
  BookOpen, Plus, Search, Eye, User, Calendar, Folder, FileText, ArrowLeft,
  Lock, ShieldAlert
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

interface Article {
  id: number;
  title: string;
  category: string;
  content: string;
  is_confidential: boolean;
  visibility: string;
  allowed_roles: string[];
  tags: string[];
  view_count: number;
  updated_at: string;
  author_detail?: { full_name: string };
}

export default function Knowledge() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Form states
  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'Guide',
    content: '',
    is_confidential: false,
    visibility: 'All',
    allowed_roles: [] as string[]
  });

  // Queries
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['articles'],
    queryFn: () => apiClient('/api/knowledge/articles/')
  });

  const { data: articleDetail } = useQuery<Article>({
    queryKey: ['article-detail', selectedArticleId],
    queryFn: () => apiClient(`/api/knowledge/articles/${selectedArticleId}/`),
    enabled: selectedArticleId !== null
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['article-categories'],
    queryFn: () => apiClient('/api/knowledge/articles/categories/')
  });

  // Mutations
  const createArticle = useMutation({
    mutationFn: (body: any) => apiClient('/api/knowledge/articles/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-categories'] });
      toast.success('Wiki article published!');
      setIsCreating(false);
      setArticleForm({ title: '', category: 'Guide', content: '', is_confidential: false, visibility: 'All', allowed_roles: [] });
    },
    onError: (err: any) => toast.error(err.message || 'Publish failed')
  });

  const deleteArticle = useMutation({
    mutationFn: (id: number) => apiClient(`/api/knowledge/articles/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['article-categories'] });
      toast.success('Article deleted.');
      setSelectedArticleId(null);
    }
  });

  // Filters
  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          art.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? art.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base SOPs</h1>
          <p className="text-sm text-text-sub">Access internal guides, operational procedures, templates, and credentials.</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      {!selectedArticleId && !isCreating ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar / Categories */}
          <div className="space-y-4">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-all"
            >
              <Plus size={18} />
              Write SOP / Article
            </button>

            <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-text-sub/70 uppercase tracking-wider px-3 mb-3">Categories</h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex justify-between
                  ${selectedCategory === null ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
              >
                <span>All Articles</span>
                <span className="text-text-sub/70 font-bold">{articles.length}</span>
              </button>
              {categories.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCategory(c.category)}
                  className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg transition-colors flex justify-between
                    ${selectedCategory === c.category ? 'bg-primary-light text-primary' : 'text-text-sub hover:bg-bg-main'}`}
                >
                  <span>{c.category}</span>
                  <span className="text-text-sub/70 font-bold">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Articles Feed */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-sub/70"><Search size={18} /></span>
              <input
                type="text"
                placeholder="Search articles by title or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-sm bg-bg-card border border-border-card rounded-lg focus:ring-2 focus:ring-primary shadow-lg"
              />
            </div>

            {/* List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-text-sub">Loading wiki logs...</div>
              ) : filteredArticles.length === 0 ? (
                <div className="bg-bg-card border rounded-2xl p-12 text-center text-text-sub/70">No articles matching search query.</div>
              ) : (
                filteredArticles.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticleId(art.id)}
                    className="bg-bg-card border border-border-card rounded-2xl p-5 hover:shadow-md cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xs font-semibold text-primary bg-primary-light px-2 py-0.5 rounded uppercase">{art.category}</span>
                        {art.is_confidential && <Lock size={12} className="text-red-500" />}
                      </div>
                      <span className="text-xs text-text-sub/70 font-medium">{new Date(art.updated_at).toLocaleDateString()}</span>
                    </div>

                    <h3 className="font-bold text-white text-base">{art.title}</h3>
                    <p className="text-sm text-text-sub line-clamp-2">{art.content.replace(/<[^>]*>/g, '')}</p>

                    <div className="pt-3 border-t border-border-card/40 flex justify-between items-center text-xs text-text-sub">
                      <span className="flex items-center gap-1"><User size={12} /> {art.author_detail?.full_name}</span>
                      <span className="flex items-center gap-1"><Eye size={12} /> {art.view_count} views</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : selectedArticleId && articleDetail ? (
        /* Read View */
        <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-6 space-y-6 max-w-4xl mx-auto">
          <button
            onClick={() => { setSelectedArticleId(null); queryClient.invalidateQueries({ queryKey: ['articles'] }); }}
            className="flex items-center text-sm font-semibold text-primary hover:underline gap-1.5"
          >
            <ArrowLeft size={16} /> Back to Directory
          </button>

          <div className="space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-2xs font-bold text-primary bg-primary-light px-2 py-0.5 rounded uppercase">{articleDetail.category}</span>
                  {articleDetail.is_confidential && <span className="text-3xs font-bold bg-danger/10 text-danger px-1.5 py-0.5 rounded">Confidential</span>}
                </div>
                <h2 className="text-2xl font-bold text-white font-heading">{articleDetail.title}</h2>
              </div>
              {isAdminOrUser(articleDetail) && (
                <button
                  onClick={() => deleteArticle.mutate(articleDetail.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 rounded border border-red-200"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="text-sm text-white leading-relaxed whitespace-pre-wrap py-4">
              {articleDetail.content}
            </div>

            <div className="pt-6 border-t flex justify-between items-center text-xs text-text-sub">
              <span className="flex items-center gap-1"><User size={14} /> Published by {articleDetail.author_detail?.full_name}</span>
              <span className="flex items-center gap-1"><Eye size={14} /> Read by {articleDetail.view_count} members</span>
            </div>
          </div>
        </div>
      ) : (
        /* Create Form */
        <div className="bg-bg-card border border-border-card shadow-lg rounded-2xl p-6 max-w-2xl mx-auto space-y-6">
          <button
            onClick={() => setIsCreating(false)}
            className="flex items-center text-sm font-semibold text-primary hover:underline gap-1.5"
          >
            <ArrowLeft size={16} /> Back to Directory
          </button>

          <h2 className="text-lg font-bold text-white">Publish SOP / Article</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createArticle.mutate(articleForm);
            }}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-sub">Title *</label>
              <input type="text" required value={articleForm.title} onChange={(e) => setArticleForm({...articleForm, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-sub">Category</label>
                <select value={articleForm.category} onChange={(e) => setArticleForm({...articleForm, category: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg">
                  <option value="SOP">SOP</option>
                  <option value="Checklist">Checklist</option>
                  <option value="Template">Template</option>
                  <option value="Guide">Guide</option>
                  <option value="Policy">Policy</option>
                  <option value="Credential">Credential</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-sub">Visibility</label>
                <select value={articleForm.visibility} onChange={(e) => setArticleForm({...articleForm, visibility: e.target.value})} className="w-full px-3 py-2 text-sm border border-border-card rounded-lg">
                  <option value="All">All</option>
                  <option value="Admin Only">Admin Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="is_confidential" checked={articleForm.is_confidential} onChange={(e) => setArticleForm({...articleForm, is_confidential: e.target.checked})} className="rounded text-primary focus:ring-primary h-4 w-4" />
              <label htmlFor="is_confidential" className="text-xs font-semibold text-text-sub">Mark as Confidential (Confidential files have strict read access)</label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-sub">Content *</label>
              <textarea required rows={10} value={articleForm.content} onChange={(e) => setArticleForm({...articleForm, content: e.target.value})} placeholder="Write wiki content or SOP checkmarks..." className="w-full px-3 py-2 text-sm border border-border-card rounded-lg focus:ring-2 focus:ring-primary" />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm text-white bg-bg-main border rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Publish Article</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function isAdminOrUser(art: Article) {
    return ['superadmin', 'admin'].includes(user?.role || '');
  }
}
