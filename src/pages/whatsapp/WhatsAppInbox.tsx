import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Send, Check, CheckCheck, Smile, Paperclip, MoreVertical, ArrowLeft, MessageCircle, Clock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { apiClient } from '../../api/client';

interface WaContact {
  id: number;
  wa_id: string;
  profile_name: string;
  last_message_at: string | null;
  last_message_preview: string;
  unread_count: number;
  session_open?: boolean;
}

interface WaMessage {
  id: number;
  wamid: string | null;
  direction: 'in' | 'out';
  message_type: string;
  text: string;
  status: string;
  error_message: string;
  timestamp: string;
  sent_by_name?: string;
}

interface WaStatus {
  configured?: boolean;
  display_number?: string;
  last_webhook_at?: string;
  inbound_count?: number;
  free_mode?: boolean;
  click_to_chat_url?: string;
  billing_blocked?: boolean;
  billing_url?: string;
  last_error?: string;
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return [];
}

function formatPhone(waId: string) {
  if (waId.startsWith('91') && waId.length === 12) {
    return `+91 ${waId.slice(2, 7)} ${waId.slice(7)}`;
  }
  return waId.startsWith('+') ? waId : `+${waId}`;
}

function initials(name: string, waId: string) {
  const source = (name || '').trim() || waId;
  return source.slice(0, 1).toUpperCase();
}

function timeLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function StatusTicks({ status }: { status: string }) {
  if (status === 'failed') return <span className="text-[11px] text-[#F15C6D] ml-1">!</span>;
  if (status === 'read') return <CheckCheck size={14} className="text-[#53BDEB] ml-1" />;
  if (status === 'delivered') return <CheckCheck size={14} className="text-[#8696A0] ml-1" />;
  if (status === 'sent') return <Check size={14} className="text-[#8696A0] ml-1" />;
  return <Clock size={12} className="text-[#8696A0] ml-1" />;
}

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery<WaStatus>({
    queryKey: ['whatsapp-status'],
    queryFn: () => apiClient('/api/whatsapp/status/'),
    refetchInterval: 15000,
  });

  const { data: contacts = [] } = useQuery<WaContact[]>({
    queryKey: ['whatsapp-conversations', search],
    queryFn: () => apiClient('/api/whatsapp/conversations/', { params: search ? { q: search } : undefined }).then(asList<WaContact>),
    refetchInterval: 3000,
  });

  const { data: thread } = useQuery<{ contact: WaContact; messages: WaMessage[] }>({
    queryKey: ['whatsapp-thread', activeId],
    queryFn: () => apiClient(`/api/whatsapp/conversations/${activeId}/`),
    enabled: !!activeId,
    refetchInterval: 2000,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => apiClient(`/api/whatsapp/conversations/${activeId}/`, { method: 'POST', body: { text } }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', activeId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send'),
  });

  const startLink = status?.click_to_chat_url || 'https://wa.me/919447845185';

  const activeContact = thread?.contact || contacts.find((c) => c.id === activeId) || null;
  const messages = thread?.messages || [];
  const sessionOpen = !!activeContact?.session_open;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const grouped = useMemo(() => {
    const days: { label: string; items: WaMessage[] }[] = [];
    messages.forEach((msg) => {
      const label = new Date(msg.timestamp).toDateString() === new Date().toDateString()
        ? 'Today'
        : new Date(msg.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      const last = days[days.length - 1];
      if (!last || last.label !== label) days.push({ label, items: [msg] });
      else last.items.push(msg);
    });
    return days;
  }, [messages]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionOpen || !draft.trim() || !activeId) return;
    sendMutation.mutate(draft.trim());
  };

  const openNewChat = (phone = '') => {
    setNewPhone(phone);
    setComposerOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 bg-[#0B141A] overflow-hidden">
      <Toaster position="top-center" />
      <aside className={`flex flex-col w-full max-w-full sm:max-w-[380px] sm:min-w-[320px] border-r border-[#2A3942] bg-[#111B21] ${activeId ? 'hidden sm:flex' : 'flex'} h-full`}>
        <div className="h-[60px] px-4 flex items-center justify-between bg-[#202C33] shrink-0">
          <div>
            <p className="text-[16px] font-semibold text-[#E9EDEF]">WhatsApp</p>
            <p className="text-[12px] text-[#8696A0]">{status?.display_number || '+91 94478 45185'}</p>
          </div>
          <button
            onClick={() => openNewChat(looksLikePhone(search) ? search : '')}
            className="p-2 rounded-full text-[#AEBAC1] hover:bg-[#2A3942]"
            title="New chat"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="px-4 py-2 text-[11px] bg-[#182229] text-[#8696A0] border-b border-[#2A3942]">
          Free Cloud API: customer texts {status?.display_number || '+91 94478 45185'} first, then you reply here for 24 hours at no charge.
        </div>

        <div className="px-3 py-2 bg-[#111B21]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696A0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && looksLikePhone(search) && contacts.length === 0) {
                  openNewChat(search);
                }
              }}
              placeholder="Search or start a new chat"
              className="w-full bg-[#202C33] border-0 rounded-lg py-2 pl-9 pr-3 text-[14px] text-[#E9EDEF] placeholder-[#8696A0]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 && (
            <div className="px-6 py-16 text-center text-[#8696A0] text-sm">
              No chats yet. When someone messages {status?.display_number || '+91 94478 45185'}, it appears here like WhatsApp Web.
            </div>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-[#222D34] hover:bg-[#202C33] ${activeId === c.id ? 'bg-[#2A3942]' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center font-semibold shrink-0">
                {initials(c.profile_name, c.wa_id)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[16px] text-[#E9EDEF] truncate">{c.profile_name || formatPhone(c.wa_id)}</p>
                  <span className="text-[12px] text-[#8696A0] shrink-0">{timeLabel(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-[13px] text-[#8696A0] truncate">{c.last_message_preview || formatPhone(c.wa_id)}</p>
                  {c.unread_count > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#00A884] text-[#111B21] text-[11px] font-bold flex items-center justify-center">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`flex-1 min-w-0 flex-col ${activeId ? 'flex' : 'hidden sm:flex'} h-full`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222E35] text-center px-8">
            <div className="w-20 h-20 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center mb-5">
              <MessageCircle size={40} fill="currentColor" />
            </div>
            <h2 className="text-[28px] font-light text-[#E9EDEF]">Digital Product Solutions</h2>
            <p className="text-[#8696A0] mt-2 max-w-md text-[14px]">
              This inbox is WhatsApp for {status?.display_number || '+91 94478 45185'}. Share the chat link so the customer messages first — replies from here are free and do not need Meta billing.
            </p>
            <a
              href={status?.click_to_chat_url || 'https://wa.me/919447845185'}
              target="_blank"
              rel="noreferrer"
              className="mt-5 px-5 py-2 rounded-full bg-[#00A884] text-[#111B21] text-sm font-semibold"
            >
              Copy customer chat link
            </a>
          </div>
        ) : (
          <>
            <div className="h-[60px] px-3 sm:px-4 flex items-center gap-3 bg-[#202C33] shrink-0">
              <button className="sm:hidden p-2 text-[#AEBAC1]" onClick={() => setActiveId(null)}>
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center font-semibold">
                {initials(activeContact.profile_name, activeContact.wa_id)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] text-[#E9EDEF] truncate">{activeContact.profile_name || formatPhone(activeContact.wa_id)}</p>
                <p className="text-[12px] text-[#8696A0] truncate">
                  {sessionOpen ? 'Online · 24-hour chat open' : formatPhone(activeContact.wa_id)}
                </p>
              </div>
              <MoreVertical size={18} className="text-[#AEBAC1]" />
            </div>

            {!sessionOpen && (
              <div className="px-4 py-2 text-[12px] bg-[#182229] text-[#FFD279] text-center">
                Waiting for them to message {status?.display_number || '+91 94478 45185'}. Starting a chat yourself needs a paid Meta template. Share {status?.click_to_chat_url || 'https://wa.me/919447845185'} instead.
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-3 wa-wallpaper">
              {grouped.map((group) => (
                <div key={group.label} className="space-y-2">
                  <div className="flex justify-center">
                    <span className="text-[12px] bg-[#182229] text-[#8696A0] px-3 py-1 rounded-lg">{group.label}</span>
                  </div>
                  {group.items.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[65%] px-2.5 py-1.5 rounded-lg text-[14.2px] leading-5 ${
                          msg.direction === 'out'
                            ? 'bg-[#005C4B] text-[#E9EDEF] rounded-tr-none'
                            : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                        }`}
                      >
                        {msg.message_type !== 'text' && (
                          <p className="text-[11px] uppercase text-[#8696A0] mb-0.5">{msg.message_type}</p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text || ' '}</p>
                        <div className="flex items-center justify-end gap-0.5 mt-0.5">
                          <span className="text-[11px] text-[#8696A0]">{timeLabel(msg.timestamp)}</span>
                          {msg.direction === 'out' && <StatusTicks status={msg.status} />}
                        </div>
                        {msg.error_message && (
                          <p className="text-[11px] text-[#F15C6D] mt-1">{msg.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={onSend} className="px-3 py-2 bg-[#202C33] flex items-end gap-2 shrink-0">
              <button type="button" className="p-2 text-[#AEBAC1] hidden sm:inline-flex"><Smile size={22} /></button>
              <button type="button" className="p-2 text-[#AEBAC1] hidden sm:inline-flex"><Paperclip size={22} /></button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (sessionOpen && draft.trim() && activeId) sendMutation.mutate(draft.trim());
                  }
                }}
                rows={1}
                disabled={!sessionOpen}
                placeholder={sessionOpen ? 'Type a message' : 'Waiting for their first message'}
                className="flex-1 max-h-32 resize-none bg-[#2A3942] border-0 rounded-lg px-4 py-2.5 text-[15px] text-[#E9EDEF] placeholder-[#8696A0] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!sessionOpen || !draft.trim() || sendMutation.isPending}
                className="w-11 h-11 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center disabled:opacity-40"
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </section>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setComposerOpen(false)} />
          <div className="relative w-full max-w-md bg-[#202C33] rounded-xl p-5 space-y-3 border border-[#2A3942]">
            <h3 className="text-lg font-semibold">Start a free chat</h3>
            <p className="text-xs text-[#8696A0]">
              Meta Cloud API is free only after the customer messages {status?.display_number || '+91 94478 45185'}. Share this link. Their message opens a 24-hour free reply window in this inbox.
            </p>
            <input
              readOnly
              value={startLink}
              className="w-full bg-[#111B21] rounded-lg px-3 py-2 text-sm"
            />
            {newPhone && (
              <p className="text-xs text-[#8696A0]">Ask {newPhone} to tap the link and send any message.</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setComposerOpen(false)} className="px-4 py-2 text-sm">Close</button>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(startLink);
                  toast.success('Chat link copied');
                }}
                className="px-4 py-2 text-sm font-semibold bg-[#00A884] text-[#111B21] rounded-full"
              >
                Copy link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
