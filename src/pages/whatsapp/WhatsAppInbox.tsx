import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Check, CheckCheck, Smile, Paperclip, MoreVertical,
  ArrowLeft, MessageCircle, Clock, Mic, Phone, Video, Image as ImageIcon,
  FileText, Camera, Square,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { apiBlob, apiClient } from '../../api/client';
import WhatsAppCustomerPanel from './WhatsAppCustomerPanel';

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
  notes?: string;
  tags?: string[];
  lead?: number | null;
  client?: number | null;
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
  media_id?: string;
  source?: string;
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
  billing_url?: string;
  billing_blocked?: boolean;
}

const AVATAR_COLORS = ['#E17076', '#7BC862', '#6EC9CB', '#6BCBEF', '#E6BF7E', '#A695E7', '#EE7B4D', '#61CDBB'];
const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','😘','😎','🤔','😅','😭','😡','👍','👎','🙏','👏','🔥','❤️','💯','🎉',
  '👌','🤝','💪','🙌','✨','⭐','🇮🇳','✅','❌','📱','📷','🎤','📞','💬','📌','📍','📎','🕐','💡','🚀',
  '😅','😉','😌','😴','🤗','🤩','😇','😋','😐','🙄','😬','😳','😢','😤','🤯','👋','✌️','🤞','👀','💀',
];

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return [];
}

function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

function formatPhone(waId: string) {
  const digits = digitsOnly(waId);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 11 && digits.startsWith('0')) return formatPhone(`91${digits.slice(1)}`);
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
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

async function prepareWhatsAppFile(file: File): Promise<File> {
  const type = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  if (type.includes('webm') || name.endsWith('.webm')) {
    throw new Error('Voice notes from this browser are not supported. Send a photo or document instead.');
  }
  if (type === 'video/quicktime' || name.endsWith('.mov')) {
    throw new Error('Send the video as MP4.');
  }
  const isImage = type.startsWith('image/') || /\.(heic|heif|webp|gif|tif|tiff|jpe?g|png)$/i.test(name);
  if (!isImage) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    let width = bitmap.width;
    let height = bitmap.height;
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

function StatusTicks({ status }: { status: string }) {
  if (status === 'failed') return <span className="text-[12px] text-[#F15C6D] ml-1 leading-none">!</span>;
  if (status === 'read') return <CheckCheck size={16} className="text-[#53BDEB] ml-0.5" />;
  if (status === 'delivered') return <CheckCheck size={16} className="text-[#8696A0] ml-0.5" />;
  if (status === 'sent' || status === 'accepted') return <Check size={16} className="text-[#8696A0] ml-0.5" />;
  return <Clock size={13} className="text-[#8696A0] ml-0.5" />;
}

function Avatar({ name, waId, photo, size = 40 }: { name: string; waId: string; photo?: string; size?: number }) {
  if (photo) {
    return <img src={photo} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
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

function MediaBubble({ message }: { message: WaMessage }) {
  const [url, setUrl] = useState('');
  const hasMedia = Boolean(message.media_id) && ['image', 'video', 'audio', 'document', 'sticker'].includes(message.message_type);

  useEffect(() => {
    if (!hasMedia) return;
    let objectUrl = '';
    let cancelled = false;
    apiBlob(`/api/whatsapp/messages/${message.id}/media/`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasMedia, message.id]);

  if (!hasMedia) {
    return <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px]">{message.text || ' '}</p>;
  }

  if (message.message_type === 'image' || message.message_type === 'sticker') {
    return (
      <div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="" className="max-w-[260px] max-h-[320px] rounded-lg object-cover mb-1" />
          </a>
        ) : (
          <div className="w-[220px] h-[160px] rounded-lg bg-black/20 mb-1" />
        )}
        {message.text && message.text !== 'Photo' && (
          <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px]">{message.text}</p>
        )}
      </div>
    );
  }

  if (message.message_type === 'video') {
    return url ? (
      <video src={url} controls className="max-w-[260px] rounded-lg mb-1" />
    ) : (
      <p className="text-sm text-[#8696A0]">Video</p>
    );
  }

  if (message.message_type === 'audio') {
    return url ? <audio src={url} controls className="max-w-[240px]" /> : <p className="text-sm">Voice message</p>;
  }

  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="text-[#53BDEB] underline text-sm">
      {message.text || 'Document'}
    </a>
  ) : (
    <p className="text-sm">{message.text || 'Document'}</p>
  );
}

export default function WhatsAppInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newText, setNewText] = useState('Hello from DPS CRM');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [infoOpen, setInfoOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [clientId, setClientId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [recording, setRecording] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
    enabled: !!activeId && !!localStorage.getItem('access_token'),
    refetchInterval: 2000,
    retry: false,
  });

  const refreshThread = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', activeId] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
  };

  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      const open = !!thread?.contact?.session_open;
      return apiClient(`/api/whatsapp/conversations/${activeId}/`, {
        method: 'POST',
        body: open
          ? { text }
          : { text, template_name: selectedTemplate || 'dps_chat_message', language: 'en' },
      });
    },
    onSuccess: () => {
      setDraft('');
      setEmojiOpen(false);
      refreshThread();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send'),
  });

  const mediaMutation = useMutation({
    mutationFn: (form: FormData) => apiClient(`/api/whatsapp/conversations/${activeId}/media/`, { method: 'POST', body: form }),
    onSuccess: () => {
      setDraft('');
      setAttachOpen(false);
      refreshThread();
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send file'),
  });

  const startMutation = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/send/', { method: 'POST', body: { to: newPhone, text: newText } }),
    onSuccess: (res: { contact?: { id: number } }) => {
      toast.success('First message sent');
      setComposerOpen(false);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      if (res?.contact?.id) setActiveId(res.contact.id);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send first message'),
  });

  const { data: templates = [] } = useQuery<{ name: string; language: string; status: string }[]>({
    queryKey: ['whatsapp-templates'],
    queryFn: () => apiClient('/api/whatsapp/templates/catalog/'),
  });
  const { data: clientsRaw } = useQuery({
    queryKey: ['clients-lite'],
    queryFn: () => apiClient('/api/clients/'),
  });
  const clients = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw as { results?: { id: number; company_name: string }[] } | undefined)?.results || [];
  const { data: leadsRaw } = useQuery({
    queryKey: ['leads-lite'],
    queryFn: () => apiClient('/api/leads/'),
  });
  const leads = Array.isArray(leadsRaw) ? leadsRaw : (leadsRaw as { results?: { id: number; company_name: string; contact_person?: string }[] } | undefined)?.results || [];

  const linkMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiClient(`/api/whatsapp/contacts/${activeId}/link/`, { method: 'POST', body }),
    onSuccess: () => {
      toast.success('CRM record updated');
      refreshThread();
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update contact'),
  });
  const createClientMutation = useMutation({
    mutationFn: async () => {
      const contact = thread?.contact || contacts.find((c) => c.id === activeId);
      if (!contact) throw new Error('Select a conversation first');
      const created = await apiClient('/api/clients/', {
        method: 'POST',
        body: {
          company_name: contactName(contact),
          client_type: 'Service Client',
          status: 'Active',
          notes: `Created from WhatsApp ${contactPhone(contact)}`,
        },
      });
      await apiClient(`/api/whatsapp/contacts/${contact.id}/link/`, { method: 'POST', body: { client_id: created.id } });
      return created;
    },
    onSuccess: () => {
      toast.success('Client created and linked');
      queryClient.invalidateQueries({ queryKey: ['clients-lite'] });
      refreshThread();
    },
    onError: (err: Error) => toast.error(err.message || 'Could not create client'),
  });
  const businessNumber = status?.display_number || '+91 94478 45185';
  const requestedContact = Number(searchParams.get('contact') || 0) || null;
  const requestedPhone = searchParams.get('phone') || '';
  const requestedTemplate = searchParams.get('template') || '';

  const visibleContacts = useMemo(
    () => (filter === 'unread' ? contacts.filter((c) => c.unread_count > 0) : contacts),
    [contacts, filter],
  );

  useEffect(() => {
    if (requestedContact && contacts.some((c) => c.id === requestedContact)) {
      setActiveId(requestedContact);
      return;
    }
    if (requestedPhone) {
      const match = contacts.find((c) => sameNumber(c.wa_id, requestedPhone));
      if (match) {
        setActiveId(match.id);
        return;
      }
      if (contacts.length > 0 && !composerOpen) {
        setNewPhone(requestedPhone);
        setComposerOpen(true);
      }
    }
  }, [contacts, requestedContact, requestedPhone, composerOpen]);

  useEffect(() => {
    if (activeId != null && contacts.some((c) => c.id === activeId)) return;
    if (requestedContact || requestedPhone) return;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) return;
    const preferred = visibleContacts.find((c) => c.session_open)
      || visibleContacts.find((c) => c.last_status !== 'failed')
      || visibleContacts[0]
      || contacts.find((c) => c.session_open)
      || contacts[0];
    setActiveId(preferred?.id ?? null);
  }, [contacts, visibleContacts, activeId, requestedContact, requestedPhone]);

  useEffect(() => {
    if (!activeId) return;
    queryClient.setQueriesData({ queryKey: ['whatsapp-conversations'] }, (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((c: WaContact) => (c.id === activeId ? { ...c, unread_count: 0 } : c));
    });
  }, [activeId, queryClient]);

  const activeContact = thread?.contact || contacts.find((c) => c.id === activeId) || null;
  const messages = thread?.messages || [];
  const sessionOpen = !!activeContact?.session_open;
  const approvedTemplates = templates.filter((row) => (row.status || '').toUpperCase() === 'APPROVED');
  const { data: linkedLead } = useQuery({
    queryKey: ['lead', activeContact?.lead],
    queryFn: () => apiClient(`/api/leads/${activeContact!.lead}/`),
    enabled: !!activeContact?.lead,
  });
  const { data: linkedClient } = useQuery({
    queryKey: ['client', activeContact?.client],
    queryFn: () => apiClient(`/api/clients/${activeContact!.client}/`),
    enabled: !!activeContact?.client,
  });

  const selectConversation = (id: number | null) => {
    setActiveId(id);
    setInfoOpen(false);
    if (id) setSearchParams({ contact: String(id) }, { replace: true });
  };

  useEffect(() => {
    setNotes(activeContact?.notes || '');
    setClientId(activeContact?.client ? String(activeContact.client) : '');
    setLeadId(activeContact?.lead ? String(activeContact.lead) : '');
  }, [activeContact?.id, activeContact?.notes, activeContact?.client]);

  useEffect(() => {
    if (requestedTemplate) {
      setSelectedTemplate(requestedTemplate);
      return;
    }
    if (selectedTemplate || approvedTemplates.length === 0) return;
    setSelectedTemplate(approvedTemplates[0].name);
  }, [approvedTemplates, selectedTemplate, requestedTemplate]);

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

  const openExistingOrCompose = (raw: string) => {
    const match = contacts.find((c) => sameNumber(c.wa_id, raw));
    if (match) {
      selectConversation(match.id);
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

  const sendFile = async (file: File) => {
    if (!activeId) return;
    try {
      const prepared = await prepareWhatsAppFile(file);
      const form = new FormData();
      form.append('file', prepared);
      if (draft.trim()) form.append('caption', draft.trim());
      mediaMutation.mutate(form);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send file');
    }
  };

  const pickFile = (accept: string) => {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
    setAttachOpen(false);
  };

  const startCall = () => {
    if (!activeContact) return;
    window.location.href = `tel:+${digitsOnly(activeContact.wa_id)}`;
  };

  const toggleVoice = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      if ((recorder.mimeType || mime || '').includes('webm')) {
        stream.getTracks().forEach((track) => track.stop());
        toast.error('Voice notes from this browser are not supported. Send a photo or document instead.');
        return;
      }
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = (recorder.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
        sendFile(new File([blob], `voice.${ext}`, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      toast.success('Recording… tap again to send');
    } catch {
      toast.error('Microphone permission is required for voice notes');
    }
  };

  const busy = sendMutation.isPending || mediaMutation.isPending;

  const customerPanel = activeContact ? (
    <WhatsAppCustomerPanel
      contact={activeContact}
      phone={contactPhone(activeContact)}
      name={contactName(activeContact)}
      sessionOpen={sessionOpen}
      notes={notes}
      setNotes={setNotes}
      clients={clients}
      clientId={clientId}
      setClientId={setClientId}
      leads={leads}
      leadId={leadId}
      setLeadId={setLeadId}
      linkedLead={linkedLead}
      linkedClient={linkedClient}
      onCreateLead={() => linkMutation.mutate({ create_lead: true })}
      onCreateClient={() => createClientMutation.mutate()}
      onLinkClient={() => linkMutation.mutate({ client_id: Number(clientId) })}
      onLinkLead={() => linkMutation.mutate({ lead_id: Number(leadId) })}
      onSaveNotes={() => linkMutation.mutate({ notes })}
      onCall={startCall}
      onClose={() => setInfoOpen(false)}
      linking={linkMutation.isPending || createClientMutation.isPending}
    />
  ) : null;

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden rounded-2xl border border-border-card bg-bg-card">
      <Toaster position="top-right" toastOptions={{ style: { background: '#202C33', color: '#E9EDEF', border: '1px solid #2A3942' } }} />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) sendFile(file);
        }}
      />

      <aside className={`flex flex-col w-full md:w-[300px] lg:w-[320px] border-r border-border-card bg-bg-card ${activeId ? 'hidden md:flex' : 'flex'} h-full min-h-0 shrink-0`}>
        <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Conversations</p>
            <button
              onClick={() => {
                setNewPhone(looksLikePhone(search) ? search : '');
                setComposerOpen(true);
              }}
              className="p-1.5 rounded-lg text-text-sub hover:bg-bg-main hover:text-text-main"
              title="New chat"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && looksLikePhone(search) && !openExistingOrCompose(search)) {
                  setNewPhone(search);
                  setComposerOpen(true);
                }
              }}
              placeholder="Search"
              className="w-full bg-bg-main border border-border-card rounded-lg py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'unread'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                  filter === key ? 'bg-primary/15 text-primary' : 'bg-bg-main text-text-sub'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {visibleContacts.length === 0 && (
            <div className="px-6 py-12 text-center text-text-sub text-sm">
              No conversations yet. When a customer messages {formatPhone(businessNumber)}, the thread opens here.
            </div>
          )}
          {visibleContacts.map((c) => {
            const selected = activeId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border-card/60 ${selected ? 'bg-primary/10' : 'hover:bg-bg-main'}`}
              >
                <Avatar name={c.profile_name} waId={c.wa_id} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{contactName(c)}</p>
                    <span className={`text-[11px] shrink-0 ${c.unread_count ? 'text-primary' : 'text-text-sub'}`}>
                      {timeLabel(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-text-sub truncate flex items-center gap-0.5 min-w-0">
                      {c.last_direction === 'out' && <StatusTicks status={c.last_status || ''} />}
                      <span className="truncate">{c.last_message_preview || contactPhone(c)}</span>
                    </p>
                    {c.unread_count > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-[#111B21] text-[11px] font-bold flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  {(c.lead || c.client) && (
                    <p className="text-[11px] text-primary mt-0.5">{c.client ? 'Client' : 'Lead'} linked</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className={`flex-1 min-w-0 min-h-0 h-full flex-col ${activeId ? 'flex' : 'hidden md:flex'} bg-bg-main`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <MessageCircle size={36} className="text-primary mb-3" />
            <h2 className="text-lg font-semibold">Select a conversation</h2>
            <p className="text-text-sub mt-2 max-w-md text-sm">
              WhatsApp is a CRM communication channel. Pick a chat to see the customer record on the right.
            </p>
          </div>
        ) : (
          <>
            <div className="h-14 px-3 flex items-center gap-2 bg-bg-card border-b border-border-card shrink-0">
              <button className="md:hidden p-2 text-text-sub" onClick={() => selectConversation(null)}>
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar name={activeContact.profile_name} waId={activeContact.wa_id} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{contactName(activeContact)}</p>
                  <p className="text-xs text-text-sub truncate">{contactPhone(activeContact)}</p>
                </div>
              </div>
              <button type="button" onClick={startCall} className="p-2 rounded-lg text-text-sub hover:bg-bg-main" title="Call">
                <Phone size={16} />
              </button>
              <button type="button" onClick={() => setInfoOpen(true)} className="xl:hidden p-2 rounded-lg text-text-sub hover:bg-bg-main" title="Customer">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-1">
              <div className="flex justify-center mb-3">
                <span className={`max-w-md text-xs leading-4 px-3 py-1.5 rounded-lg text-center border ${
                  sessionOpen ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'
                }`}>
                  {sessionOpen
                    ? 'Customer can be messaged right now.'
                    : 'Customer service window expired. Choose a template to restart the chat.'}
                </span>
              </div>
              {grouped.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="flex justify-center my-3">
                    <span className="text-[11px] bg-bg-card text-text-sub px-3 py-1 rounded-full border border-border-card">{group.label}</span>
                  </div>
                  {group.items.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'} px-1`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 text-sm ${
                        msg.direction === 'out' ? 'wa-bubble-out' : 'wa-bubble-in'
                      }`}>
                        <MediaBubble message={msg} />
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[11px] text-text-sub">{timeLabel(msg.timestamp)}</span>
                          {msg.direction === 'out' && <StatusTicks status={msg.status} />}
                        </div>
                        {msg.error_message && (
                          <p className="text-[11px] text-danger mt-1">{msg.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="relative shrink-0 bg-bg-card border-t border-border-card">
              {emojiOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-2 bg-bg-card border border-border-card rounded-xl p-2 grid grid-cols-10 gap-1 max-h-48 overflow-y-auto shadow-2xl">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="h-8 text-lg hover:bg-bg-main rounded"
                      onClick={() => {
                        setDraft((value) => value + emoji);
                        inputRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {attachOpen && (
                <div className="absolute bottom-full left-12 mb-2 bg-bg-card border border-border-card rounded-xl p-2 w-44 shadow-2xl">
                  <button type="button" onClick={() => pickFile('image/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-bg-main text-sm">
                    <ImageIcon size={16} className="text-primary" /> Photos
                  </button>
                  <button type="button" onClick={() => pickFile('image/*;capture=camera')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-bg-main text-sm">
                    <Camera size={16} className="text-primary" /> Camera
                  </button>
                  <button type="button" onClick={() => pickFile('video/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-bg-main text-sm">
                    <Video size={16} className="text-primary" /> Video
                  </button>
                  <button type="button" onClick={() => pickFile('*/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-bg-main text-sm">
                    <FileText size={16} className="text-primary" /> Document
                  </button>
                </div>
              )}
              <form onSubmit={onSend} className="px-3 py-2 flex flex-col gap-2">
                <div className={`text-xs font-medium ${sessionOpen ? 'text-success' : 'text-danger'}`}>
                  {sessionOpen ? 'Ready to reply' : 'Customer service window expired'}
                </div>
                {!sessionOpen && (
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="bg-bg-main border border-border-card rounded-lg px-3 py-2 text-sm"
                  >
                    {approvedTemplates.length === 0 && <option value="">No approved templates</option>}
                    {approvedTemplates.map((row) => (
                      <option key={`${row.name}-${row.language}`} value={row.name}>
                        {row.name.replace(/_/g, ' ')} ({row.language})
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-end gap-1">
                  <button type="button" onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false); }} className="p-2 text-text-sub hover:bg-bg-main rounded-lg">
                    <Smile size={20} />
                  </button>
                  <button type="button" onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); }} className="p-2 text-text-sub hover:bg-bg-main rounded-lg">
                    <Paperclip size={18} />
                  </button>
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
                    placeholder={recording ? 'Recording…' : sessionOpen ? 'Type a message...' : 'Choose a template, then type a message'}
                    className="flex-1 max-h-[120px] resize-none bg-bg-main border border-border-card rounded-lg px-3 py-2.5 text-sm"
                  />
                  {draft.trim() ? (
                    <button type="submit" disabled={busy || (!sessionOpen && !selectedTemplate)} className="h-10 px-3 rounded-lg bg-primary text-[#111B21] flex items-center justify-center disabled:opacity-40 shrink-0">
                      <Send size={16} />
                    </button>
                  ) : (
                    <button type="button" onClick={toggleVoice} disabled={busy || !sessionOpen} className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${recording ? 'bg-danger text-white' : 'bg-bg-main text-text-sub border border-border-card'}`}>
                      {recording ? <Square size={14} fill="currentColor" /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        )}
      </section>

      {activeContact && (
        <aside className="hidden xl:flex w-[320px] min-w-[300px] flex-col border-l border-border-card h-full bg-bg-main">
          {customerPanel}
        </aside>
      )}

      {infoOpen && activeContact && (
        <div className="xl:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setInfoOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-bg-card border-l border-border-card shadow-2xl">
            {customerPanel}
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setComposerOpen(false)} />
          <div className="relative w-full max-w-md bg-bg-card rounded-2xl p-5 space-y-3 border border-border-card shadow-2xl">
            <h3 className="text-lg font-semibold">Start a conversation</h3>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Customer phone"
              className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2.5 text-sm"
            />
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              className="w-full bg-bg-main border border-border-card rounded-lg px-3 py-2.5 text-sm"
            />
            <p className="text-sm text-text-sub leading-5">
              If this customer has not messaged you yet, the first note is sent as an approved template. After they reply, you can chat normally.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setComposerOpen(false)} className="px-4 py-2 text-sm text-text-sub">Close</button>
              <button
                type="button"
                disabled={startMutation.isPending || !looksLikePhone(newPhone) || !newText.trim()}
                onClick={() => {
                  const existing = contacts.find((c) => sameNumber(c.wa_id, newPhone));
                  if (existing?.session_open) {
                    openExistingOrCompose(newPhone);
                    return;
                  }
                  startMutation.mutate();
                }}
                className="px-4 py-2 text-sm font-semibold bg-primary text-[#111B21] rounded-lg disabled:opacity-50"
              >
                {startMutation.isPending ? 'Sending…' : 'Send first message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
