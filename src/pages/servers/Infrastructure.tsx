import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { StatusBadge } from '../../components/shared/Badge';
import { 
  Plus, Server, Globe, Key, AlertTriangle, ShieldCheck, 
  Cpu, HardDrive, DollarSign, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface Domain {
  id: number;
  domain_name: string;
  registrar: string;
  expiry_date: string;
  auto_renew: boolean;
  status: string;
}

interface Hosting {
  id: number;
  server_name: string;
  server_type: string;
  provider: string;
  ip_address: string;
  monthly_cost: string;
  renewal_date: string;
  ram_gb: number;
  storage_gb: number;
  cpu_cores: number;
  status: string;
}

interface SSLCert {
  id: number;
  domain_detail?: { domain_name: string };
  issuer: string;
  expiry_date: string;
  status: string;
}

export default function Infrastructure() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'hosting' | 'ssl'>('overview');
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [hostingModalOpen, setHostingModalOpen] = useState(false);
  const [sslModalOpen, setSSLModalOpen] = useState(false);

  // Forms
  const [domainForm, setDomainForm] = useState({
    domain_name: '',
    registrar: 'Namecheap',
    registered_date: '',
    expiry_date: '',
    auto_renew: false
  });

  const [hostingForm, setHostingForm] = useState({
    server_name: '',
    server_type: 'VPS',
    provider: 'DigitalOcean',
    ip_address: '',
    start_date: '',
    renewal_date: '',
    monthly_cost: '0.00',
    ram_gb: 1,
    storage_gb: 20,
    cpu_cores: 1,
    status: 'Active'
  });

  const [sslForm, setSSLForm] = useState({
    domain: '',
    issuer: "Let's Encrypt",
    issued_date: '',
    expiry_date: '',
    status: 'Valid'
  });

  // Queries
  const { data: domains = [] } = useQuery<Domain[]>({
    queryKey: ['domains'],
    queryFn: () => apiClient('/api/servers/domains/')
  });

  const { data: hostings = [] } = useQuery<Hosting[]>({
    queryKey: ['hostings'],
    queryFn: () => apiClient('/api/servers/hosting/')
  });

  const { data: sslCerts = [] } = useQuery<SSLCert[]>({
    queryKey: ['ssl-certs'],
    queryFn: () => apiClient('/api/servers/ssl/')
  });

  const { data: alerts = { domains: [], ssl: [], hosting: [] } } = useQuery({
    queryKey: ['expiry-alerts'],
    queryFn: () => apiClient('/api/servers/expiry-alerts/')
  });

  // Mutations
  const createDomain = useMutation({
    mutationFn: (body: any) => apiClient('/api/servers/domains/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success('Domain registered!');
      setDomainModalOpen(false);
    }
  });

  const createHosting = useMutation({
    mutationFn: (body: any) => apiClient('/api/servers/hosting/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostings'] });
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success('Server configuration saved!');
      setHostingModalOpen(false);
    }
  });

  const createSSL = useMutation({
    mutationFn: (body: any) => apiClient('/api/servers/ssl/', { method: 'POST', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssl-certs'] });
      queryClient.invalidateQueries({ queryKey: ['expiry-alerts'] });
      toast.success('SSL certificate logged!');
      setSSLModalOpen(false);
    }
  });

  const totalAlerts = alerts.domains.length + alerts.ssl.length + alerts.hosting.length;

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Infrastructure Tracker</h1>
          <p className="text-sm text-gray-500">Manage hosting VPS servers, domain registrants, and SSL expiries.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Server size={16} />
            Overview
            {totalAlerts > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-3xs font-bold bg-amber-500 text-white rounded-full">
                {totalAlerts}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('domains')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'domains' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Globe size={16} />
            Domains
          </button>
          <button
            onClick={() => setActiveTab('hosting')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'hosting' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Cpu size={16} />
            Hostings
          </button>
          <button
            onClick={() => setActiveTab('ssl')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
              ${activeTab === 'ssl' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
          >
            <Key size={16} />
            SSL Certificates
          </button>
        </nav>
      </div>

      {/* Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Expiry Alerts block */}
          {totalAlerts > 0 && (
            <div className="bg-white border border-amber-200 shadow-sm rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-amber-700 text-lg flex items-center">
                <AlertTriangle className="mr-2" size={20} />
                Upcoming Renewals & Expiries
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                {alerts.domains.map((d: any) => (
                  <div key={d.id} className="flex justify-between border-b pb-2">
                    <span className="font-medium text-gray-900">Domain: {d.domain_name}</span>
                    <span className="text-amber-600 font-bold">Expires: {d.expiry_date}</span>
                  </div>
                ))}
                {alerts.ssl.map((s: any) => (
                  <div key={s.id} className="flex justify-between border-b pb-2">
                    <span className="font-medium text-gray-900">SSL Certificate: {s.domain_detail?.domain_name}</span>
                    <span className="text-amber-600 font-bold">Expires: {s.expiry_date}</span>
                  </div>
                ))}
                {alerts.hosting.map((h: any) => (
                  <div key={h.id} className="flex justify-between border-b pb-2">
                    <span className="font-medium text-gray-900">Hosting: {h.server_name} ({h.ip_address})</span>
                    <span className="text-amber-600 font-bold">Renewal Due: {h.renewal_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex justify-between items-center">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">Tracked Domains</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{domains.length}</h3>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600"><Globe size={20} /></div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex justify-between items-center">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">VPS Servers</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{hostings.length}</h3>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600"><Server size={20} /></div>
            </div>
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex justify-between items-center">
              <div>
                <span className="text-2xs text-gray-400 font-bold uppercase">Active SSLs</span>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{sslCerts.length}</h3>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><ShieldCheck size={20} /></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Register new domains.</span>
            <button
              onClick={() => setDomainModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add Domain
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Domain Name</th>
                  <th className="p-4">Registrar</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Auto Renew</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {domains.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">No domains logged.</td></tr>
                ) : (
                  domains.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{d.domain_name}</td>
                      <td className="p-4">{d.registrar}</td>
                      <td className="p-4 font-semibold text-gray-900">{d.expiry_date}</td>
                      <td className="p-4">{d.auto_renew ? 'Yes' : 'No'}</td>
                      <td className="p-4"><StatusBadge label={d.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hosting' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Manage VPS servers specs.</span>
            <button
              onClick={() => setHostingModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Add Server
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Server Name</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Specs</th>
                  <th className="p-4">Monthly Cost</th>
                  <th className="p-4">Renewal Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {hostings.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No servers configured.</td></tr>
                ) : (
                  hostings.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{h.server_name}</td>
                      <td className="p-4 text-xs font-semibold text-gray-600">{h.ip_address}</td>
                      <td className="p-4">{h.provider}</td>
                      <td className="p-4 text-xs text-gray-500 font-medium">
                        {h.cpu_cores} vCPU / {h.ram_gb} GB RAM / {h.storage_gb} GB SSD
                      </td>
                      <td className="p-4 font-bold text-gray-900">${parseFloat(h.monthly_cost).toFixed(2)}</td>
                      <td className="p-4">{h.renewal_date}</td>
                      <td className="p-4"><StatusBadge label={h.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ssl' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">Track SSL certifications expiries.</span>
            <button
              onClick={() => setSSLModalOpen(true)}
              className="flex items-center px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all"
            >
              <Plus size={16} className="mr-1.5" />
              Log Certificate
            </button>
          </div>

          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-semibold bg-gray-50/50">
                  <th className="p-4">Domain</th>
                  <th className="p-4">Issuer</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {sslCerts.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-400">No SSL certificates registered.</td></tr>
                ) : (
                  sslCerts.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{s.domain_detail?.domain_name}</td>
                      <td className="p-4">{s.issuer}</td>
                      <td className="p-4 font-semibold text-gray-900">{s.expiry_date}</td>
                      <td className="p-4"><StatusBadge label={s.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Domain Modal */}
      {domainModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDomainModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Domain</h2>
              <form onSubmit={(e) => { e.preventDefault(); createDomain.mutate(domainForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Domain Name *</label>
                  <input type="text" required placeholder="example.com" value={domainForm.domain_name} onChange={(e) => setDomainForm({...domainForm, domain_name: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Registrar</label>
                    <select value={domainForm.registrar} onChange={(e) => setDomainForm({...domainForm, registrar: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="GoDaddy">GoDaddy</option>
                      <option value="Namecheap">Namecheap</option>
                      <option value="Google Domains">Google Domains</option>
                      <option value="Dynadot">Dynadot</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Expiry Date *</label>
                    <input type="date" required value={domainForm.expiry_date} onChange={(e) => setDomainForm({...domainForm, expiry_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Registered Date *</label>
                  <input type="date" required value={domainForm.registered_date} onChange={(e) => setDomainForm({...domainForm, registered_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="auto_renew" checked={domainForm.auto_renew} onChange={(e) => setDomainForm({...domainForm, auto_renew: e.target.checked})} className="rounded text-primary focus:ring-primary h-4 w-4" />
                  <label htmlFor="auto_renew" className="text-xs font-semibold text-gray-600">Auto Renew Enabled</label>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setDomainModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Track</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Hosting Modal */}
      {hostingModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setHostingModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add Server</h2>
              <form onSubmit={(e) => { e.preventDefault(); createHosting.mutate(hostingForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Server Name *</label>
                  <input type="text" required value={hostingForm.server_name} onChange={(e) => setHostingForm({...hostingForm, server_name: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">IP Address *</label>
                    <input type="text" required placeholder="0.0.0.0" value={hostingForm.ip_address} onChange={(e) => setHostingForm({...hostingForm, ip_address: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Monthly Cost ($)</label>
                    <input type="number" required value={hostingForm.monthly_cost} onChange={(e) => setHostingForm({...hostingForm, monthly_cost: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Start Date</label>
                    <input type="date" required value={hostingForm.start_date} onChange={(e) => setHostingForm({...hostingForm, start_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Renewal Date</label>
                    <input type="date" required value={hostingForm.renewal_date} onChange={(e) => setHostingForm({...hostingForm, renewal_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">RAM (GB)</label>
                    <input type="number" value={hostingForm.ram_gb} onChange={(e) => setHostingForm({...hostingForm, ram_gb: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">SSD (GB)</label>
                    <input type="number" value={hostingForm.storage_gb} onChange={(e) => setHostingForm({...hostingForm, storage_gb: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Cores</label>
                    <input type="number" value={hostingForm.cpu_cores} onChange={(e) => setHostingForm({...hostingForm, cpu_cores: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setHostingModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SSL Modal */}
      {sslModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSSLModalOpen(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4 font-heading">Log SSL Certificate</h2>
              <form onSubmit={(e) => { e.preventDefault(); createSSL.mutate(sslForm); }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Domain *</label>
                  <select required value={sslForm.domain} onChange={(e) => setSSLForm({...sslForm, domain: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option value="">Select Domain</option>
                    {domains.map(d => <option key={d.id} value={d.id}>{d.domain_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Issuer</label>
                    <select value={sslForm.issuer} onChange={(e) => setSSLForm({...sslForm, issuer: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                      <option value="Let's Encrypt">Let's Encrypt</option>
                      <option value="Comodo">Comodo</option>
                      <option value="DigiCert">DigiCert</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Expiry Date *</label>
                    <input type="date" required value={sslForm.expiry_date} onChange={(e) => setSSLForm({...sslForm, expiry_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Issued Date *</label>
                  <input type="date" required value={sslForm.issued_date} onChange={(e) => setSSLForm({...sslForm, issued_date: e.target.value})} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setSSLModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg font-semibold">Log Cert</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
