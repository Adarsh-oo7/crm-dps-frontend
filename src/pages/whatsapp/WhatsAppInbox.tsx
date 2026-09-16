import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Send, Check, CheckCheck, Smile, Paperclip, MoreVertical,
  ArrowLeft, MessageCircle, Clock, Mic, Copy, Phone, X, Video, Image as ImageIcon,
  FileText, Camera, Square,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { apiBlob, apiClient } from '../../api/client';

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
  media_id?: string;
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
  const [recording, setRecording] = useState(false);
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
    enabled: !!activeId,
    refetchInterval: 2000,
    retry: false,
  });

  const refreshThread = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-thread', activeId] });
    queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
  };

  const sendMutation = useMutation({
    mutationFn: (text: string) => apiClient(`/api/whatsapp/conversations/${activeId}/`, { method: 'POST', body: { text } }),
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

  const startLink = status?.click_to_chat_url || 'https://wa.me/919447845185';
  const businessNumber = status?.display_number || '+91 94478 45185';

  const visibleContacts = useMemo(
    () => (filter === 'unread' ? contacts.filter((c) => c.unread_count > 0) : contacts),
    [contacts, filter],
  );

  useEffect(() => {
    if (activeId != null && contacts.some((c) => c.id === activeId)) return;
    const preferred = visibleContacts.find((c) => c.session_open)
      || visibleContacts.find((c) => c.last_status !== 'failed')
      || visibleContacts[0]
      || contacts.find((c) => c.session_open)
      || contacts[0];
    setActiveId(preferred?.id ?? null);
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
  const sessionOpen = !!activeContact?.session_open || messages.some((msg) => msg.direction === 'in');

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

  const sendFile = (file: File) => {
    if (!activeId) return;
    const form = new FormData();
    form.append('file', file);
    if (draft.trim()) form.append('caption', draft.trim());
    mediaMutation.mutate(form);
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

  const startVideo = () => {
    if (!activeContact) return;
    window.open(`https://wa.me/${digitsOnly(activeContact.wa_id)}`, '_blank');
    toast.success('Video calls use the WhatsApp app. Chat opened for this number.');
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

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#0B141A] text-[#E9EDEF]">
      <Toaster position="top-center" toastOptions={{ style: { background: '#202C33', color: '#E9EDEF' } }} />
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

      <aside className={`flex flex-col w-full sm:w-[410px] sm:min-w-[360px] sm:max-w-[410px] border-r border-[#2A3942] bg-[#111B21] ${activeId ? 'hidden sm:flex' : 'flex'} h-full min-h-0`}>
        <div className="h-[60px] px-4 flex items-center justify-between bg-[#202C33] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={status?.verified_name || 'WhatsApp'} waId={businessNumber} photo={status?.profile_picture_url} size={40} />
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
                if (e.key === 'Enter' && looksLikePhone(search) && !openExistingOrCompose(search)) {
                  setNewPhone(search);
                  setComposerOpen(true);
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

      <section className={`flex-1 min-w-0 min-h-0 h-full flex-col ${activeId ? 'flex' : 'hidden sm:flex'} bg-[#0B141A]`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222E35] text-center px-8 border-b-[6px] border-[#00A884]">
            <MessageCircle size={72} className="text-[#00A884] mb-6" />
            <h2 className="text-[32px] font-light">{status?.verified_name || 'Digital Product Solutions'}</h2>
            <p className="text-[#8696A0] mt-3 max-w-lg text-[14px] leading-6">
              WhatsApp inbox for {formatPhone(businessNumber)}. Reply with text, emoji, photos, voice notes, or documents.
            </p>
          </div>
        ) : (
          <>
            <div className="h-[60px] px-3 sm:px-4 flex items-center gap-2 bg-[#202C33] shrink-0">
              <button className="sm:hidden p-2 text-[#AEBAC1]" onClick={() => setActiveId(null)}>
                <ArrowLeft size={22} />
              </button>
              <button type="button" onClick={() => setInfoOpen(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <Avatar name={activeContact.profile_name} waId={activeContact.wa_id} size={40} />
                <div className="min-w-0">
                  <p className="text-[16px] font-medium truncate">{contactName(activeContact)}</p>
                  <p className="text-[13px] text-[#8696A0] truncate">{contactPhone(activeContact)}</p>
                </div>
              </button>
              <button type="button" onClick={startVideo} className="p-2 rounded-full text-[#AEBAC1] hover:bg-[#2A3942]" title="Video">
                <Video size={20} />
              </button>
              <button type="button" onClick={startCall} className="p-2 rounded-full text-[#AEBAC1] hover:bg-[#2A3942]" title="Call">
                <Phone size={20} />
              </button>
              <button type="button" onClick={() => setInfoOpen(true)} className="p-2 rounded-full text-[#AEBAC1] hover:bg-[#2A3942]">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-[8%] py-4 space-y-1 wa-wallpaper">
              <div className="flex justify-center mb-3">
                <span className="max-w-md text-[12px] leading-4 bg-[#182229] text-[#8696A0] px-3 py-1.5 rounded-lg text-center">
                  Messages are end-to-end encrypted. Only people in this chat can read them.
                  {sessionOpen
                    ? ' You can reply freely for 24 hours.'
                    : ' Send a first message here — WhatsApp delivers it as a template. After they reply, chat is free for 24 hours.'}
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
                        <MediaBubble message={msg} />
                        <div className="flex items-center justify-end gap-1 mt-[2px]">
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

            <div className="relative shrink-0 bg-[#202C33]">
              {emojiOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#202C33] border border-[#2A3942] rounded-xl p-2 grid grid-cols-10 gap-1 max-h-48 overflow-y-auto shadow-2xl">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="h-8 text-lg hover:bg-[#2A3942] rounded"
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
                <div className="absolute bottom-full left-12 mb-2 bg-[#233138] rounded-xl p-2 w-44 shadow-2xl">
                  <button type="button" onClick={() => pickFile('image/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#2A3942] text-sm">
                    <ImageIcon size={18} className="text-[#007BFC]" /> Photos
                  </button>
                  <button type="button" onClick={() => pickFile('image/*;capture=camera')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#2A3942] text-sm">
                    <Camera size={18} className="text-[#FF2E74]" /> Camera
                  </button>
                  <button type="button" onClick={() => pickFile('video/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#2A3942] text-sm">
                    <Video size={18} className="text-[#5F66CD]" /> Video
                  </button>
                  <button type="button" onClick={() => pickFile('*/*')} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-[#2A3942] text-sm">
                    <FileText size={18} className="text-[#7F66FF]" /> Document
                  </button>
                </div>
              )}
              <form onSubmit={onSend} className="px-2 sm:px-4 py-2 flex items-end gap-2">
                <button type="button" onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false); }} className="p-2 text-[#AEBAC1] hover:bg-[#2A3942] rounded-full">
                  <Smile size={24} />
                </button>
                <button type="button" onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); }} className="p-2 text-[#AEBAC1] hover:bg-[#2A3942] rounded-full">
                  <Paperclip size={22} />
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
                  placeholder={recording ? 'Recording voice note…' : 'Type a message'}
                  className="flex-1 max-h-[120px] resize-none bg-[#2A3942] border-0 rounded-lg px-4 py-[11px] text-[15px] text-[#E9EDEF] placeholder-[#8696A0] leading-[20px]"
                />
                {draft.trim() ? (
                  <button type="submit" disabled={busy} className="w-[46px] h-[46px] rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center disabled:opacity-40 shrink-0">
                    <Send size={20} />
                  </button>
                ) : (
                  <button type="button" onClick={toggleVoice} disabled={busy} className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 ${recording ? 'bg-[#F15C6D] text-white' : 'bg-[#00A884] text-[#111B21]'}`}>
                    {recording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
                  </button>
                )}
              </form>
            </div>
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
              <div className="flex gap-6 mt-2">
                <button type="button" onClick={startCall} className="flex flex-col items-center gap-1 text-[#00A884] text-xs">
                  <span className="w-10 h-10 rounded-full bg-[#00A884]/15 flex items-center justify-center"><Phone size={18} /></span>
                  Call
                </button>
                <button type="button" onClick={startVideo} className="flex flex-col items-center gap-1 text-[#00A884] text-xs">
                  <span className="w-10 h-10 rounded-full bg-[#00A884]/15 flex items-center justify-center"><Video size={18} /></span>
                  Video
                </button>
                <button type="button" onClick={copyStartLink} className="flex flex-col items-center gap-1 text-[#00A884] text-xs">
                  <span className="w-10 h-10 rounded-full bg-[#00A884]/15 flex items-center justify-center"><Copy size={18} /></span>
                  Link
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setComposerOpen(false)} />
          <div className="relative w-full max-w-md bg-[#202C33] rounded-xl p-5 space-y-3 border border-[#2A3942] shadow-2xl">
            <h3 className="text-lg font-semibold">Message someone first</h3>
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="9400355185"
              className="w-full bg-[#111B21] rounded-lg px-3 py-2.5 text-sm"
            />
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={3}
              className="w-full bg-[#111B21] rounded-lg px-3 py-2.5 text-sm"
            />
            <p className="text-[13px] text-[#8696A0] leading-5">
              WhatsApp only allows a first message as an approved template. After they reply, you can chat normally for 24 hours at no charge.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setComposerOpen(false)} className="px-4 py-2 text-sm text-[#AEBAC1]">Close</button>
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
                className="px-4 py-2 text-sm font-semibold bg-[#00A884] text-[#111B21] rounded-full disabled:opacity-50"
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
