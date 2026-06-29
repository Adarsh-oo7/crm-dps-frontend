import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StatusBadge, PriorityBadge } from '../../components/shared/Badge';
import { Plus, Layout, Bug, Check, Code, User, AlertTriangle, Layers, DollarSign } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  product_type: string;
  status: string;
  tagline: string;
  monthly_revenue: string;
  total_users: number;
  active_users: number;
  launch_date: string | null;
}

interface Feature {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  product: number;
  target_version: string;
}

interface BugReport {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  environment: string;
  product: number;
}

export default function Products() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'products' | 'roadmap' | 'bugs'>('products');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [featureModalOpen, setFeatureModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

  // Forms
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    product_type: 'SaaS',
    status: 'Idea',
    tagline: '',
    pricing_model: 'Subscription',
    monthly_revenue: '0.00',
    total_users: 0,
    active_users: 0
  });

  const [featureForm, setFeatureForm] = useState({
    product: '',
    title: '',
    description: '',
    status: 'Backlog',
    priority: 'Medium',
    target_version: ''
  });

  const [bugForm, setBugForm] = useState({
    product: '',
    title: '',
    description: '',
    steps_to_reproduce: '',
    severity: 'Medium',
    status: 'Open',
    environment: 'Production'
  });

  // Queries
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiClient('/api/products/products/')
  });

  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ['features'],
    queryFn: () => apiClient('/api/products/features/')
  });

  const { data: bugs = [] } = useQuery<BugReport[]>({
    queryKey: ['bugs'],
    queryFn: () => apiClient('/api/products/bugs/')
  });

  // Mutations
  const createProduct = useMutation({
    mutationFn: (body: any) => apiClient('/api/products/products/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('In-house product created!');
      setProductModalOpen(false);
    }
  });

  const createFeature = useMutation({
    mutationFn: (body: any) => apiClient('/api/products/features/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Feature added to roadmap!');
      setFeatureModalOpen(false);
    }
  });

  const createBug = useMutation({
    mutationFn: (body: any) => apiClient('/api/products/bugs/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast.success('Bug ticket recorded!');
      setBugModalOpen(false);
    }
  });

  const fixBugMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/products/bugs/${id}/`, {
      method: 'PUT',
      body: { status: 'Fixed', resolved_at: new Date().toISOString() }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast.success('Bug marked as Fixed!');
    }
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">In-house Products</h1>
          <p className="text-sm text-gray-500">Track internal software SaaS roadmap products, features backlog, and bug reports.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Layers size={16} />
            Products Directory
          </button>
          <button
            onClick={() => setActiveTab('roadmap')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'roadmap' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Layout size={16} />
            Roadmap Board
          </button>
          <button
            onClick={() => setActiveTab('bugs')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'bugs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Bug size={16} />
            Bug Tracker
          </button>
        </nav>
      </div>

      {/* Panels */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Register a new product in the dashboard.</span>
            <button
              onClick={() => setProductModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add Product
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">No products launched yet.</div>
            ) : (
              products.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-2xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{p.product_type}</span>
                      <StatusBadge label={p.status} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{p.name}</h3>
                    <p className="text-xs text-indigo-600 font-semibold">{p.tagline}</p>
                    <p className="text-sm text-gray-500 line-clamp-3">{p.description}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-4xs text-gray-400 font-bold uppercase tracking-wider block">Monthly Rev</span>
                      <span className="text-sm font-extrabold text-green-600">${parseFloat(p.monthly_revenue).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-4xs text-gray-400 font-bold uppercase tracking-wider block">Total Users</span>
                      <span className="text-sm font-bold text-gray-900">{p.total_users.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-4xs text-gray-400 font-bold uppercase tracking-wider block">Active Users</span>
                      <span className="text-sm font-bold text-gray-900">{p.active_users.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'roadmap' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Coordinate roadmap plans.</span>
            <button
              onClick={() => setFeatureModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add Feature
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['Backlog', 'Planned', 'In Development', 'Done'].map((col) => {
              const colFeatures = features.filter(f => f.status === col);
              return (
                <div key={col} className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col h-full min-h-[300px]">
                  <h3 className="font-semibold text-gray-900 text-sm mb-3 border-b pb-2 flex justify-between">
                    {col}
                    <span className="bg-gray-200 text-gray-700 px-2 py-0.5 text-2xs font-bold rounded-full">{colFeatures.length}</span>
                  </h3>
                  <div className="space-y-3 overflow-y-auto max-h-[400px]">
                    {colFeatures.map((f) => (
                      <div key={f.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-2">
                        <div className="flex justify-between">
                          <PriorityBadge label={f.priority} />
                          <span className="text-3xs font-semibold text-gray-400">{f.target_version}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm">{f.title}</h4>
                        <p className="text-xs text-gray-500">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Submit and resolve product bug tickets.</span>
            <button
              onClick={() => setBugModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Report Bug
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Bug Title</th>
                  <th className="p-4">Environment</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bugs.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No bugs logged. Good job!</td></tr>
                ) : (
                  bugs.map((b) => (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{b.title}</td>
                      <td className="p-4">{b.environment}</td>
                      <td className="p-4"><PriorityBadge label={b.severity} /></td>
                      <td className="p-4"><StatusBadge label={b.status} /></td>
                      <td className="p-4 text-right">
                        {b.status !== 'Fixed' && (
                          <button
                            onClick={() => fixBugMutation.mutate(b.id)}
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

      {/* Product Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setProductModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Product</h2>
              <form onSubmit={(e) => { e.preventDefault(); createProduct.mutate(productForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Name *</label>
                  <input type="text" required value={productForm.name} onChange={(e) => setProductForm({...productForm, name: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Tagline</label>
                  <input type="text" value={productForm.tagline} onChange={(e) => setProductForm({...productForm, tagline: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Type</label>
                    <select value={productForm.product_type} onChange={(e) => setProductForm({...productForm, product_type: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="SaaS">SaaS</option>
                      <option value="Mobile App">Mobile App</option>
                      <option value="Web App">Web App</option>
                      <option value="API">API</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Status</label>
                    <select value={productForm.status} onChange={(e) => setProductForm({...productForm, status: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Idea">Idea</option>
                      <option value="Planning">Planning</option>
                      <option value="Development">Development</option>
                      <option value="Beta">Beta</option>
                      <option value="Live">Live</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Description</label>
                  <textarea rows={3} value={productForm.description} onChange={(e) => setProductForm({...productForm, description: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setProductModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Launch</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feature Modal */}
      {featureModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setFeatureModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Feature</h2>
              <form onSubmit={(e) => { e.preventDefault(); createFeature.mutate(featureForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Product *</label>
                  <select required value={featureForm.product} onChange={(e) => setFeatureForm({...featureForm, product: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Title *</label>
                  <input type="text" required value={featureForm.title} onChange={(e) => setFeatureForm({...featureForm, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Description</label>
                  <textarea rows={3} value={featureForm.description} onChange={(e) => setFeatureForm({...featureForm, description: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setFeatureModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bug Modal */}
      {bugModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setBugModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Report Bug</h2>
              <form onSubmit={(e) => { e.preventDefault(); createBug.mutate(bugForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Product *</label>
                  <select required value={bugForm.product} onChange={(e) => setBugForm({...bugForm, product: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Title *</label>
                  <input type="text" required value={bugForm.title} onChange={(e) => setBugForm({...bugForm, title: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Description</label>
                  <textarea rows={3} value={bugForm.description} onChange={(e) => setBugForm({...bugForm, description: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setBugModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Report</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
