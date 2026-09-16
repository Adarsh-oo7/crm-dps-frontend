import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Check, CheckCheck, Smile, Paperclip, MoreVertical,
  ArrowLeft, MessageCircle, Clock, Mic, Copy, Phone, X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { apiClient } from '../../api/client';

interface WaContact {
  id: number;
  wa_id: string;
  profile_name: string;
  display_phone?: string;
  last_message_at: string | null;
  last_message_preview: string;
  unread_count: number;
  session_open?: boolean;
  last_direction?: string;
  last_status?: string;
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
  profile_picture_url?: string;
  verified_name?: string;
}

const AVATAR_COLORS = ['#E17076', '#7BC862', '#6EC9CB', '#6BCBEF', '#E6BF7E', '#A695E7', '#EE7B4D', '#61CDBB'];

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return [];
}

function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

function formatPhone(waId: string) {
  const digits = digitsOnly(waId);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return formatPhone(`91${digits.slice(1)}`);
  }
  return digits ? `+${digits}` : '';
}

function contactPhone(contact: Pick<WaContact, 'display_phone' | 'wa_id'>) {
  return contact.display_phone || formatPhone(contact.wa_id);
}

function contactName(contact: Pick<WaContact, 'profile_name' | 'display_phone' | 'wa_id'>) {
  return (contact.profile_name || '').trim() || contactPhone(contact);
}

function initials(name: string, waId: string) {
  const source = (name || '').trim() || formatPhone(waId) || waId;
  const parts = source.replace(/^\+/, '').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.replace(/\D/g, '').slice(-2) || source.slice(0, 2).toUpperCase();
}

function avatarColor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function timeLabel(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function looksLikePhone(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 10 && digits.length <= 15;
}

function sameNumber(left: string, right: string) {
  const a = digitsOnly(left);
  const b = digitsOnly(right);
  if (!a || !b) return false;
  return a === b || a.slice(-10) === b.slice(-10);
}

function StatusTicks({ status }: { status: string }) {
  if (status === 'failed') return <span className="text-[12px] text-[#F15C6D] ml-1 leading-none">!</span>;
  if (status === 'read') return <CheckCheck size={16} className="text-[#53BDEB] ml-0.5" />;
  if (status === 'delivered') return <CheckCheck size={16} className="text-[#8696A0] ml-0.5" />;
  if (status === 'sent' || status === 'accepted') return <Check size={16} className="text-[#8696A0] ml-0.5" />;
  return <Clock size={13} className="text-[#8696A0] ml-0.5" />;
}

function Avatar({
  name,
  waId,
  photo,
  size = 40,
}: {
  name: string;
  waId: string;
  photo?: string;
  size?: number;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full text-white flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, background: avatarColor(waId || name), fontSize: size > 44 ? 18 : 15 }}
    >
      {initials(name, waId)}
    </div>
  );
}

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [infoOpen, setInfoOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    retry: false,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => apiClient(`/api/whatsapp/conversations/${activeId}/`, { method: 'POST', body: { text } }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', activeId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send'),
  });

  const startLink = status?.click_to_chat_url || 'https://wa.me/919447845185';
  const businessNumber = status?.display_number || '+91 94478 45185';

  const visibleContacts = useMemo(
    () => (filter === 'unread' ? contacts.filter((c) => c.unread_count > 0) : contacts),
    [contacts, filter],
  );

  useEffect(() => {
    if (activeId != null && contacts.some((c) => c.id === activeId)) return;
    setActiveId(visibleContacts[0]?.id ?? contacts[0]?.id ?? null);
  }, [contacts, visibleContacts, activeId]);

  useEffect(() => {
    if (!activeId) return;
    queryClient.setQueriesData({ queryKey: ['whatsapp-conversations'] }, (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: WaContact) => (c.id === activeId ? { ...c, unread_count: 0 } : c));
    });
  }, [activeId, queryClient]);

  const activeContact = thread?.contact || contacts.find((c) => c.id === activeId) || null;
  const messages = thread?.messages || [];
  const hasInbound = messages.some((msg) => msg.direction === 'in');
  const sessionOpen = !!activeContact?.session_open || hasInbound;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const grouped = useMemo(() => {
    const days: { label: string; items: WaMessage[] }[] = [];
    messages.forEach((msg) => {
      const when = new Date(msg.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const label = when.toDateString() === today.toDateString()
        ? 'Today'
        : when.toDateString() === yesterday.toDateString()
          ? 'Yesterday'
          : when.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      const last = days[days.length - 1];
      if (!last || last.label !== label) days.push({ label, items: [msg] });
      else last.items.push(msg);
    });
    return days;
  }, [messages]);

  const copyStartLink = async () => {
    await navigator.clipboard.writeText(startLink);
    toast.success('WhatsApp link copied');
  };

  const openExistingOrCompose = (raw: string) => {
    const match = contacts.find((c) => sameNumber(c.wa_id, raw));
    if (match) {
      setActiveId(match.id);
      setComposerOpen(false);
      setSearch('');
      return true;
    }
    return false;
  };

  const onSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || !activeId || sendMutation.isPending) return;
    sendMutation.mutate(draft.trim());
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0B141A] text-[#E9EDEF]">
      <Toaster position="top-center" toastOptions={{ style: { background: '#202C33', color: '#E9EDEF' } }} />

      <aside className={`flex flex-col w-full sm:w-[410px] sm:min-w-[360px] sm:max-w-[410px] border-r border-[#2A3942] bg-[#111B21] ${activeId ? 'hidden sm:flex' : 'flex'} h-full min-h-0`}>
        <div className="h-[60px] px-4 flex items-center justify-between bg-[#202C33] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={status?.verified_name || 'WhatsApp'}
              waId={businessNumber}
              photo={status?.profile_picture_url}
              size={40}
            />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold leading-tight truncate">{status?.verified_name || 'WhatsApp'}</p>
              <p className="text-[12px] text-[#8696A0] truncate">{formatPhone(businessNumber)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNewPhone(looksLikePhone(search) ? search : '');
              setComposerOpen(true);
            }}
            className="p-2 rounded-full text-[#AEBAC1] hover:bg-[#2A3942]"
            title="New chat"
          >
            <Plus size={22} />
          </button>
        </div>

        <div className="px-3 pt-2 pb-1 bg-[#111B21] shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696A0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && looksLikePhone(search)) {
                  if (!openExistingOrCompose(search)) {
                    setNewPhone(search);
                    setComposerOpen(true);
                  }
                }
              }}
              placeholder="Search or start a new chat"
              className="w-full bg-[#202C33] border-0 rounded-lg py-[9px] pl-10 pr-3 text-[14px] text-[#E9EDEF] placeholder-[#8696A0]"
            />
          </div>
          <div className="flex gap-2 mt-2 mb-1">
            {(['all', 'unread'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-[13px] capitalize ${
                  filter === key ? 'bg-[#00A884]/20 text-[#00A884]' : 'bg-[#202C33] text-[#8696A0]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {visibleContacts.length === 0 && (
            <div className="px-8 py-16 text-center text-[#8696A0] text-sm">
              No chats yet. When someone messages {formatPhone(businessNumber)}, the thread opens here.
            </div>
          )}
          {visibleContacts.map((c) => {
            const selected = activeId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setActiveId(c.id); setInfoOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-[11px] text-left hover:bg-[#202C33] ${selected ? 'bg-[#2A3942]' : ''}`}
              >
                <Avatar name={c.profile_name} waId={c.wa_id} size={49} />
                <div className="min-w-0 flex-1 border-b border-[#222D34] pb-[10px]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[17px] text-[#E9EDEF] truncate">{contactName(c)}</p>
                    <span className={`text-[12px] shrink-0 ${c.unread_count ? 'text-[#00A884]' : 'text-[#8696A0]'}`}>
                      {timeLabel(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-[14px] text-[#8696A0] truncate flex items-center gap-0.5 min-w-0">
                      {c.last_direction === 'out' && <StatusTicks status={c.last_status || ''} />}
                      <span className="truncate">{c.last_message_preview || contactPhone(c)}</span>
                    </p>
                    {c.unread_count > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#00A884] text-[#111B21] text-[11px] font-bold flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className={`flex-1 min-w-0 min-h-0 flex-col ${activeId ? 'flex' : 'hidden sm:flex'} h-full bg-[#0B141A]`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222E35] text-center px-8 border-b-[6px] border-[#00A884]">
            <div className="w-[280px] h-[180px] rounded-3xl bg-[#00A884]/10 flex items-center justify-center mb-8">
              <MessageCircle size={72} className="text-[#00A884]" />
            </div>
            <h2 className="text-[32px] font-light text-[#E9EDEF]">{status?.verified_name || 'Digital Product Solutions'}</h2>
            <p className="text-[#8696A0] mt-3 max-w-lg text-[14px] leading-6">
              WhatsApp Business inbox for {formatPhone(businessNumber)}. Ask a customer to send the first message, then reply here like WhatsApp Web.
            </p>
            <button
              onClick={copyStartLink}
              className="mt-6 px-5 py-2.5 rounded-full bg-[#00A884] text-[#111B21] text-sm font-semibold"
            >
              Copy chat link
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="h-[60px] px-3 sm:px-4 flex items-center gap-3 bg-[#202C33] shrink-0 text-left"
            >
              <span className="sm:hidden p-2 text-[#AEBAC1]" onClick={(e) => { e.stopPropagation(); setActiveId(null); }}>
                <ArrowLeft size={22} />
              </span>
              <Avatar name={activeContact.profile_name} waId={activeContact.wa_id} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium truncate">{contactName(activeContact)}</p>
                <p className="text-[13px] text-[#8696A0] truncate">{contactPhone(activeContact)}</p>
              </div>
              <Copy
                size={18}
                className="text-[#AEBAC1] hidden sm:block"
                onClick={(e) => { e.stopPropagation(); copyStartLink(); }}
              />
              <Phone size={18} className="text-[#AEBAC1] hidden sm:block" />
              <MoreVertical size={18} className="text-[#AEBAC1]" />
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-[8%] py-4 space-y-1 wa-wallpaper">
              <div className="flex justify-center mb-3">
                <span className="max-w-md text-[12px] leading-4 bg-[#182229] text-[#8696A0] px-3 py-1.5 rounded-lg text-center">
                  Messages are end-to-end encrypted. Only people in this chat can read them.
                  {sessionOpen ? ' You can reply freely for 24 hours.' : ` Ask them to WhatsApp ${formatPhone(businessNumber)} first.`}
                </span>
              </div>
              {grouped.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="flex justify-center my-3">
                    <span className="text-[12.5px] bg-[#182229] text-[#8696A0] px-3 py-[5px] rounded-lg shadow-sm">{group.label}</span>
                  </div>
                  {group.items.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'} px-1`}>
                      <div className={`max-w-[85%] sm:max-w-[65%] px-[9px] pt-[6px] pb-[4px] text-[#E9EDEF] ${
                        msg.direction === 'out' ? 'wa-bubble-out' : 'wa-bubble-in'
                      }`}>
                        {msg.message_type !== 'text' && (
                          <p className="text-[11px] uppercase tracking-wide text-[#8696A0] mb-0.5">{msg.message_type}</p>
                        )}
                        <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px]">{msg.text || (msg.direction === 'in' ? 'Message' : ' ')}</p>
                        <div className="flex items-center justify-end gap-1 mt-[2px] relative top-[1px]">
                          <span className="text-[11px] text-[#ffffff99]">{timeLabel(msg.timestamp)}</span>
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

            <form onSubmit={onSend} className="px-2 sm:px-4 py-2 bg-[#202C33] flex items-end gap-2 shrink-0">
              <button type="button" className="p-2 text-[#AEBAC1] hover:bg-[#2A3942] rounded-full"><Smile size={24} /></button>
              <button type="button" className="p-2 text-[#AEBAC1] hover:bg-[#2A3942] rounded-full hidden sm:inline-flex"><Paperclip size={22} /></button>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder="Type a message"
                className="flex-1 max-h-[120px] resize-none bg-[#2A3942] border-0 rounded-lg px-4 py-[11px] text-[15px] text-[#E9EDEF] placeholder-[#8696A0] leading-[20px]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sendMutation.isPending}
                className="w-[46px] h-[46px] rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center disabled:opacity-40 shrink-0"
              >
                {draft.trim() ? <Send size={20} /> : <Mic size={20} />}
              </button>
            </form>
          </>
        )}
      </section>

      {infoOpen && activeContact && (
        <aside className="hidden lg:flex w-[360px] min-w-[320px] flex-col bg-[#111B21] border-l border-[#2A3942] h-full">
          <div className="h-[60px] px-4 flex items-center gap-4 bg-[#202C33] shrink-0">
            <button type="button" onClick={() => setInfoOpen(false)} className="p-1 text-[#AEBAC1] hover:bg-[#2A3942] rounded-full">
              <X size={20} />
            </button>
            <p className="text-[16px] font-medium">Contact info</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-[#202C33] py-8 flex flex-col items-center gap-3">
              <Avatar name={activeContact.profile_name} waId={activeContact.wa_id} size={200} />
              <p className="text-[24px] px-6 text-center">{contactName(activeContact)}</p>
              <p className="text-[#8696A0]">{contactPhone(activeContact)}</p>
            </div>
            <div className="mt-2 bg-[#202C33] px-6 py-4 text-sm">
              <p className="text-[#8696A0] text-[13px] mb-1">About</p>
              <p>{sessionOpen ? 'WhatsApp customer · 24-hour chat window is open' : 'Waiting for their next inbound message'}</p>
            </div>
            <p className="px-6 py-4 text-[12px] text-[#8696A0] leading-5">
              Meta Cloud API does not share customer profile photos. The name above comes from their WhatsApp profile.
            </p>
          </div>
        </aside>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setComposerOpen(false)} />
          <div className="relative w-full max-w-md bg-[#202C33] rounded-xl p-5 space-y-3 border border-[#2A3942] shadow-2xl">
            <h3 className="text-lg font-semibold">New chat</h3>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="9400355185"
              className="w-full bg-[#111B21] rounded-lg px-3 py-2.5 text-sm"
            />
            <p className="text-[13px] text-[#8696A0] leading-5">
              If this number already messaged {formatPhone(businessNumber)}, we open that same chat. Otherwise share the link so they text first.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setComposerOpen(false)} className="px-4 py-2 text-sm text-[#AEBAC1]">Close</button>
              <button
                type="button"
                onClick={() => {
                  if (looksLikePhone(newPhone) && openExistingOrCompose(newPhone)) return;
                  copyStartLink();
                }}
                className="px-4 py-2 text-sm font-semibold bg-[#00A884] text-[#111B21] rounded-full"
              >
                {looksLikePhone(newPhone) ? 'Open chat' : 'Copy link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
