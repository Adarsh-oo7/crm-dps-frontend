import { Link } from 'react-router-dom';
import { Phone, X } from 'lucide-react';

interface WaContact {
  id: number;
  wa_id: string;
  profile_name: string;
  display_phone?: string;
  notes?: string;
  tags?: string[];
  lead?: number | null;
  client?: number | null;
}

interface LeadLite {
  id: number;
  company_name?: string;
  contact_person?: string;
  status?: string;
  industry?: string;
  assigned_to_detail?: { full_name?: string } | null;
  tags?: string[];
  notes?: string | null;
  email?: string | null;
}

interface ClientLite {
  id: number;
  company_name?: string;
  status?: string;
  industry?: string;
  notes?: string | null;
  tags?: string[];
}

export default function WhatsAppCustomerPanel({
  contact,
  phone,
  name,
  sessionOpen,
  notes,
  setNotes,
  clients,
  clientId,
  setClientId,
  leads,
  leadId,
  setLeadId,
  linkedLead,
  linkedClient,
  onCreateLead,
  onCreateClient,
  onLinkClient,
  onLinkLead,
  onSaveNotes,
  onCall,
  onClose,
  linking,
}: {
  contact: WaContact;
  phone: string;
  name: string;
  sessionOpen: boolean;
  notes: string;
  setNotes: (value: string) => void;
  clients: { id: number; company_name: string }[];
  clientId: string;
  setClientId: (value: string) => void;
  leads: { id: number; company_name: string; contact_person?: string }[];
  leadId: string;
  setLeadId: (value: string) => void;
  linkedLead?: LeadLite | null;
  linkedClient?: ClientLite | null;
  onCreateLead: () => void;
  onCreateClient: () => void;
  onLinkClient: () => void;
  onLinkLead: () => void;
  onSaveNotes: () => void;
  onCall: () => void;
  onClose?: () => void;
  linking?: boolean;
}) {
  const linked = Boolean(contact.lead || contact.client);
  const status = linkedClient?.status || linkedLead?.status || (linked ? 'Linked' : 'Not linked');
  const company = linkedClient?.company_name || linkedLead?.company_name || '—';
  const assigned = linkedLead?.assigned_to_detail?.full_name || '—';
  const tags = (linkedClient?.tags || linkedLead?.tags || contact.tags || []).filter(Boolean);

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-main">
      <div className="px-4 py-3 border-b border-border-card flex items-start justify-between gap-2 shrink-0">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-sub">CRM</p>
          <h3 className="text-base font-semibold text-text-main">Customer</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-text-sub hover:bg-bg-card xl:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <div className="bg-bg-card border border-border-card rounded-2xl p-4">
          <p className="text-lg font-semibold text-white leading-tight">{name}</p>
          <p className="text-sm text-text-sub mt-1">{phone}</p>
          <p className="text-xs text-text-sub mt-2">WhatsApp contact</p>
        </div>

        <div className={`text-sm rounded-xl px-3 py-2 border ${
          sessionOpen
            ? 'bg-success/10 text-success border-success/20'
            : 'bg-danger/10 text-danger border-danger/20'
        }`}>
          {sessionOpen ? 'Customer can be messaged right now' : 'Customer service window expired — choose a template'}
        </div>

        {linked ? (
          <div className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-sub">Status</p>
              <p className="font-medium mt-0.5">{contact.client ? 'Active Client' : status}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-sub">Company</p>
              <p className="font-medium mt-0.5">{company}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-text-sub">Assigned to</p>
              <p className="font-medium mt-0.5">{assigned}</p>
            </div>
            {tags.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-sub mb-1">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {(linkedLead?.notes || linkedClient?.notes) && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-sub">CRM notes</p>
                <p className="text-text-sub mt-1 whitespace-pre-wrap">{linkedLead?.notes || linkedClient?.notes}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              {contact.lead ? (
                <Link to="/leads" className="px-3 py-1.5 rounded-lg bg-primary text-[#111B21] text-sm font-semibold">
                  View lead
                </Link>
              ) : null}
              {contact.client ? (
                <Link to="/clients" className="px-3 py-1.5 rounded-lg bg-primary text-[#111B21] text-sm font-semibold">
                  View customer
                </Link>
              ) : null}
              <button type="button" onClick={onCall} className="px-3 py-1.5 rounded-lg border border-border-card text-sm text-text-sub hover:text-text-main inline-flex items-center gap-1">
                <Phone size={14} /> Call
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3">
            <p className="text-sm font-medium text-white">No CRM profile linked</p>
            <p className="text-sm text-text-sub">Create a lead or client, or link this number to an existing record.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={linking} onClick={onCreateLead} className="px-3 py-1.5 rounded-lg bg-primary text-[#111B21] text-sm font-semibold disabled:opacity-50">
                Create Lead
              </button>
              <button type="button" disabled={linking} onClick={onCreateClient} className="px-3 py-1.5 rounded-lg border border-border-card text-sm font-semibold disabled:opacity-50">
                Create Client
              </button>
            </div>
          </div>
        )}

        <div className="bg-bg-card border border-border-card rounded-2xl p-4 space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-text-sub">Link existing</p>
          <div className="flex gap-2">
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="flex-1 bg-bg-main rounded-lg px-2 py-2 text-sm border border-border-card">
              <option value="">Select lead</option>
              {leads.map((row) => (
                <option key={row.id} value={row.id}>{row.company_name}{row.contact_person ? ` · ${row.contact_person}` : ''}</option>
              ))}
            </select>
            <button type="button" disabled={!leadId || linking} onClick={onLinkLead} className="px-3 py-2 rounded-lg bg-bg-main border border-border-card text-sm disabled:opacity-50">
              Link
            </button>
          </div>
          <div className="flex gap-2">
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="flex-1 bg-bg-main rounded-lg px-2 py-2 text-sm border border-border-card">
              <option value="">Select client</option>
              {clients.map((row) => (
                <option key={row.id} value={row.id}>{row.company_name}</option>
              ))}
            </select>
            <button type="button" disabled={!clientId || linking} onClick={onLinkClient} className="px-3 py-2 rounded-lg bg-bg-main border border-border-card text-sm disabled:opacity-50">
              Link
            </button>
          </div>
        </div>

        <div className="bg-bg-card border border-border-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-wide text-text-sub mb-2">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Needs website quotation…"
            className="w-full bg-bg-main rounded-lg px-3 py-2 text-sm border border-border-card"
          />
          <button type="button" onClick={onSaveNotes} className="mt-2 px-3 py-1.5 rounded-lg border border-border-card text-sm">
            Save notes
          </button>
        </div>
      </div>
    </div>
  );
}
