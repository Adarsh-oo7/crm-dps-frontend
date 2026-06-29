import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, FolderGit, CheckSquare, X, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../api/client';

interface SearchResult {
  id: number;
  [key: string]: any;
}

interface SearchResults {
  leads: SearchResult[];
  clients: SearchResult[];
  projects: SearchResult[];
  tasks: SearchResult[];
  invoices: SearchResult[];
  articles: SearchResult[];
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Fetch results when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient('/api/search/', { params: { q: query } });
        setResults(data);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleResultClick = (type: string, id: number) => {
    setIsOpen(false);
    if (type === 'leads') navigate('/leads');
    else if (type === 'clients') navigate('/clients');
    else if (type === 'projects') navigate(`/projects`);
    else if (type === 'tasks') navigate(`/tasks`);
    else if (type === 'invoices') navigate(`/finance`);
    else if (type === 'articles') navigate(`/knowledge`);
  };

  if (!isOpen) return null;

  const totalResults = results
    ? Object.values(results).reduce((acc, curr) => acc + curr.length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-gray-900/40 backdrop-blur-xs">
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-bg-card rounded-2xl shadow-2xl border border-border-card overflow-hidden flex flex-col max-h-[500px]"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-border-card px-4 py-3 bg-bg-main">
          <Search className="text-text-sub/70 mr-3" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search leads, projects, tasks, invoices..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm font-medium"
          />
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-3" />
          ) : (
            query && (
              <button onClick={() => setQuery('')} className="text-text-sub/70 hover:text-text-sub mr-3">
                <X size={16} />
              </button>
            )
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-2xs font-bold text-text-sub/70 bg-bg-card border border-border-card rounded">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {query.trim() === '' ? (
            <div className="text-center py-12 text-text-sub">
              <Search className="mx-auto text-text-sub/55 mb-3" size={32} />
              <p className="text-sm font-medium">Search for anything in DPS OS</p>
              <p className="text-xs text-text-sub/70 mt-1">Press Ctrl+K or Cmd+K anytime to open search</p>
            </div>
          ) : results && totalResults > 0 ? (
            <div className="space-y-4">
              {/* Leads */}
              {results.leads.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <Users size={12} className="mr-1" /> Leads
                  </h4>
                  <div className="space-y-1.5">
                    {results.leads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => handleResultClick('leads', lead.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{lead.company_name}</p>
                          <p className="text-xs text-text-sub">Contact: {lead.contact_person}</p>
                        </div>
                        <span className="text-2xs font-semibold text-text-sub/70">Score: {lead.lead_score}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients */}
              {results.clients.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <Users size={12} className="mr-1" /> Clients
                  </h4>
                  <div className="space-y-1.5">
                    {results.clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleResultClick('clients', client.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{client.company_name}</p>
                          <p className="text-xs text-text-sub">{client.website || 'No website'}</p>
                        </div>
                        <span className="text-2xs font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">Active</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {results.projects.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <FolderGit size={12} className="mr-1" /> Projects
                  </h4>
                  <div className="space-y-1.5">
                    {results.projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleResultClick('projects', project.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{project.name}</p>
                          <p className="text-xs text-text-sub truncate max-w-md">{project.project_type}</p>
                        </div>
                        <span className="text-2xs font-semibold text-primary">{project.completion_percentage}% Done</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <CheckSquare size={12} className="mr-1" /> Tasks
                  </h4>
                  <div className="space-y-1.5">
                    {results.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleResultClick('tasks', task.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{task.title}</p>
                          <p className="text-xs text-text-sub">Status: {task.status} | Priority: {task.priority}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <FileText size={12} className="mr-1" /> Invoices
                  </h4>
                  <div className="space-y-1.5">
                    {results.invoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => handleResultClick('invoices', inv.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{inv.invoice_number}</p>
                          <p className="text-xs text-text-sub">Amount: ${inv.total_amount}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {results.articles.length > 0 && (
                <div>
                  <h4 className="text-2xs font-bold text-text-sub/70 uppercase tracking-wider mb-2 flex items-center">
                    <FileText size={12} className="mr-1" /> Knowledge Wiki
                  </h4>
                  <div className="space-y-1.5">
                    {results.articles.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => handleResultClick('articles', art.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-bg-main border border-transparent hover:border-border-card/40 transition-all flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{art.title}</p>
                          <p className="text-xs text-text-sub">{art.category}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-text-sub">
              <ShieldAlert className="mx-auto text-text-sub/55 mb-3" size={32} />
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-text-sub/70 mt-1">Try searching with other terms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
