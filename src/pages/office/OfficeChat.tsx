import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/authStore';

type Kind = 'direct' | 'project' | 'deal' | 'handover' | 'office';

interface Room {
  id: number;
  kind: Kind;
  title: string;
  last_message_preview: string;
  last_message_at: string | null;
  unread: number;
  handover_status: string;
  handover_from: string;
  handover_to: string;
  project_name: string;
  deal_name: string;
  participants: string[];
  monitoring: boolean;
  mine: boolean;
}

interface ChatMessage {
  id: number;
  body: string;
  kind: 'text' | 'system' | 'handover';
  sender_id: number | null;
  sender_name: string;
  created_at: string;
}

interface Directory {
  people: { id: number; name: string; role: string }[];
  projects: { id: number; name: string }[];
  deals: { id: number; name: string }[];
}

const FILTERS: { id: string; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'direct', label: 'People' },
  { id: 'project', label: 'Projects' },
  { id: 'deal', label: 'Deals' },
  { id: 'handover', label: 'Handover' },
];

const KIND_LABEL: Record<Kind, string> = {
  direct: 'Person',
  project: 'Project',
  deal: 'Deal',
  handover: 'Handover',
  office: 'Office',
};

function when(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function OfficeChat() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get('room') || 0) || null;
  const [filter, setFilter] = useState('');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [draft, setDraft] = useState('');
  const [composer, setComposer] = useState<Kind | null>(null);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [showList, setShowList] = useState(true);
  const [personQuery, setPersonQuery] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const roomsQuery = useQuery<{ can_monitor: boolean; rooms: Room[] }>({
    queryKey: ['office-rooms', filter, scope],
    queryFn: () => apiClient(`/api/office/rooms/?scope=${scope}${filter ? `&kind=${filter}` : ''}`),
    refetchInterval: 4000,
  });

  const threadQuery = useQuery<{ room: Room; messages: ChatMessage[] }>({
    queryKey: ['office-thread', selected],
    queryFn: () => apiClient(`/api/office/rooms/${selected}/`),
    enabled: !!selected,
    refetchInterval: 2500,
  });

  const directory = useQuery<Directory>({
    queryKey: ['office-directory'],
    queryFn: () => apiClient('/api/office/directory/'),
  });

  useEffect(() => {
    if (selected) setShowList(false);
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [selected, threadQuery.data?.messages.length]);

  const rooms = roomsQuery.data?.rooms || [];
  const canMonitor = !!roomsQuery.data?.can_monitor;
  const thread = threadQuery.data;
  const active = thread?.room || rooms.find((room) => room.id === selected) || null;

  const send = useMutation({
    mutationFn: (text: string) => apiClient(`/api/office/rooms/${selected}/`, { method: 'POST', body: { text } }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['office-thread', selected] });
      queryClient.invalidateQueries({ queryKey: ['office-rooms'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Message was not sent'),
  });

  const openRoom = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiClient('/api/office/rooms/', { method: 'POST', body }),
    onSuccess: (room: Room) => {
      setComposer(null);
      setTarget('');
      setNote('');
      setParams({ room: String(room.id) });
      queryClient.invalidateQueries({ queryKey: ['office-rooms'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not open that chat'),
  });

  const handover = useMutation({
    mutationFn: (action: 'accept' | 'done') =>
      apiClient(`/api/office/rooms/${selected}/handover/`, { method: 'POST', body: { action } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-thread', selected] });
      queryClient.invalidateQueries({ queryKey: ['office-rooms'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Could not update the handover'),
  });

  function submitNew(event: FormEvent) {
    event.preventDefault();
    if (!composer) return;
    if (composer === 'handover' && !note.trim()) return;
    if (composer === 'office' && !target.trim()) return;
    if (composer !== 'office' && !target) return;
    if (composer === 'direct') openRoom.mutate({ kind: 'direct', user_id: Number(target), text: note });
    if (composer === 'project') openRoom.mutate({ kind: 'project', project_id: Number(target) });
    if (composer === 'deal') openRoom.mutate({ kind: 'deal', lead_id: Number(target) });
    if (composer === 'handover') openRoom.mutate({ kind: 'handover', user_id: Number(target), text: note });
    if (composer === 'office') openRoom.mutate({ kind: 'office', title: target.trim(), text: note });
  }

  function onSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selected) return;
    send.mutate(text);
  }

  const choices = useMemo(() => {
    if (!directory.data || !composer) return [];
    const needle = personQuery.trim().toLowerCase();
    const rows = composer === 'direct' || composer === 'handover'
      ? directory.data.people.map((person) => ({ id: person.id, label: `${person.name} · ${person.role}` }))
      : composer === 'project'
        ? directory.data.projects.map((project) => ({ id: project.id, label: project.name }))
        : composer === 'deal'
          ? directory.data.deals.map((deal) => ({ id: deal.id, label: deal.name }))
          : [];
    return needle ? rows.filter((row) => row.label.toLowerCase().includes(needle)) : rows;
  }, [composer, directory.data, personQuery]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-border-card bg-[#0B141A]">
      <Toaster position="top-right" />
      <aside className={`${showList || !selected ? 'flex' : 'hidden'} md:flex w-full md:w-[320px] shrink-0 flex-col border-r border-border-card bg-[#111B21]`}>
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Office</p>
              <h1 className="text-lg font-bold text-white">Team chat</h1>
            </div>
            {canMonitor && (
              <button
                type="button"
                onClick={() => setScope(scope === 'all' ? 'mine' : 'all')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${scope === 'all' ? 'bg-primary text-[#111B21]' : 'border border-border-card text-text-sub'}`}
              >
                {scope === 'all' ? 'Monitoring' : 'Monitor'}
              </button>
            )}
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {FILTERS.map((item) => (
              <button
                key={item.id || 'all'}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${filter === item.id ? 'bg-primary/20 text-primary' : 'text-text-sub'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {(['direct', 'project', 'deal', 'handover', 'office'] as Kind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => { setPersonQuery(''); setTarget(''); setComposer(kind); }} className="rounded-lg bg-[#202C33] py-1.5 text-[10px] font-bold text-text-main">
                {KIND_LABEL[kind]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {roomsQuery.isError && <p className="px-4 py-6 text-sm text-red-300">Chats could not load. Pull the page again in a moment.</p>}
          {!roomsQuery.isError && rooms.length === 0 && <p className="px-4 py-8 text-sm text-text-sub">No chats yet. Start with a person, a project, a deal, or a handover.</p>}
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => setParams({ room: String(room.id) })}
              className={`flex w-full items-start gap-3 px-3 py-3 text-left border-b border-border-card/60 ${selected === room.id ? 'bg-[#202C33]' : 'hover:bg-[#202C33]/60'}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {room.title.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{room.title}</p>
                  <span className="shrink-0 text-[10px] text-text-sub">{when(room.last_message_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-text-sub">{room.last_message_preview || KIND_LABEL[room.kind]}</p>
                  {room.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-[#111B21]">{room.unread}</span>}
                </div>
                {room.monitoring && <p className="text-[10px] font-bold text-amber-300">Monitoring</p>}
                {room.kind === 'handover' && room.handover_status && (
                  <p className="text-[10px] font-bold uppercase text-primary">{room.handover_status}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${!showList && selected ? 'flex' : 'hidden'} md:flex min-h-0 min-w-0 flex-1 flex-col bg-[#0B141A]`}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center">
            <div>
              <p className="text-lg font-bold text-white">Keep the work in one thread</p>
              <p className="mt-2 max-w-sm text-sm text-text-sub">Talk to a teammate, keep a project or deal thread, and hand work over so nothing sits in someone’s head.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border-card bg-[#202C33] px-3 py-2.5">
              <button type="button" className="md:hidden text-sm text-primary" onClick={() => { setShowList(true); setParams({}); }}>Back</button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{active.title}</p>
                <p className="truncate text-[11px] text-text-sub">
                  {KIND_LABEL[active.kind]}
                  {active.participants.length ? ` · ${active.participants.join(', ')}` : ''}
                  {active.monitoring ? ' · You are monitoring this chat' : ''}
                </p>
              </div>
            </header>
            {active.kind === 'handover' && active.handover_status !== 'done' && (
              <div className="flex items-center justify-between gap-2 border-b border-border-card bg-primary/10 px-3 py-2">
                <p className="text-xs text-text-main">
                  {active.handover_from} → {active.handover_to} · {active.handover_status}
                </p>
                <div className="flex gap-2">
                  {active.handover_status === 'open' && (
                    <button type="button" onClick={() => handover.mutate('accept')} className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-[#111B21]">Accept</button>
                  )}
                  <button type="button" onClick={() => handover.mutate('done')} className="rounded-lg border border-border-card px-2.5 py-1 text-[11px] font-bold">Done</button>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">
              {(thread?.messages || []).map((message) => {
                const mine = message.sender_id === user?.id;
                if (message.kind === 'system') {
                  return <p key={message.id} className="text-center text-[11px] text-text-sub">{message.body}</p>;
                }
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-xl px-3 py-2 ${mine ? 'wa-bubble-out' : 'wa-bubble-in'} ${message.kind === 'handover' ? 'border border-primary/40' : ''}`}>
                      {!mine && <p className="text-[10px] font-bold text-primary">{message.sender_name}</p>}
                      <p className="whitespace-pre-wrap text-sm text-white">{message.body}</p>
                      <p className="mt-1 text-right text-[10px] text-text-sub">{when(message.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
            {threadQuery.isError && <p className="px-3 py-2 text-xs text-red-300">This thread did not load.</p>}
            <form onSubmit={onSend} className="flex gap-2 border-t border-border-card bg-[#202C33] p-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write an update"
                className="min-w-0 flex-1 rounded-full bg-[#2A3942] px-4 py-2.5 text-sm text-white outline-none"
              />
              <button type="submit" disabled={send.isPending} className="rounded-full bg-primary px-4 text-sm font-bold text-[#111B21]">Send</button>
            </form>
          </>
        )}
      </section>

      {composer && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <form onSubmit={submitNew} className="w-full max-w-md rounded-2xl border border-border-card bg-[#111B21] p-4">
            <p className="text-sm font-bold text-white">New {KIND_LABEL[composer].toLowerCase()} thread</p>
            {composer === 'office' ? (
              <input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Thread name" className="mt-3 w-full rounded-lg bg-[#2A3942] px-3 py-2 text-sm text-white outline-none" />
            ) : (
              <>
                <input
                  value={personQuery}
                  onChange={(event) => setPersonQuery(event.target.value)}
                  placeholder={composer === 'direct' || composer === 'handover' ? 'Search a person' : 'Search'}
                  className="mt-3 w-full rounded-lg bg-[#2A3942] px-3 py-2 text-sm text-white outline-none"
                />
                <div className="mt-2 max-h-52 overflow-y-auto rounded-lg bg-[#0B141A]">
                  {directory.isLoading && <p className="px-3 py-3 text-sm text-text-sub">Loading…</p>}
                  {directory.isError && <p className="px-3 py-3 text-sm text-red-300">People could not be loaded. Refresh and try again.</p>}
                  {!directory.isLoading && !directory.isError && choices.length === 0 && (
                    <p className="px-3 py-3 text-sm text-text-sub">No matches. Try another name.</p>
                  )}
                  {choices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => setTarget(String(choice.id))}
                      className={`block w-full border-b border-border-card/40 px-3 py-2.5 text-left text-sm text-white ${String(choice.id) === target ? 'bg-primary/20' : 'hover:bg-[#202C33]'}`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {(composer === 'direct' || composer === 'handover' || composer === 'office') && (
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={composer === 'handover' ? 'What are you handing over, and what is left?' : 'First message'}
                className="mt-3 h-24 w-full rounded-lg bg-[#2A3942] px-3 py-2 text-sm text-white outline-none"
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setComposer(null)} className="rounded-lg px-3 py-2 text-sm text-text-sub">Cancel</button>
              <button
                type="submit"
                disabled={openRoom.isPending || (composer === 'office' ? !target.trim() : !target) || (composer === 'handover' && !note.trim())}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-[#111B21] disabled:opacity-50"
              >
                Open
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
