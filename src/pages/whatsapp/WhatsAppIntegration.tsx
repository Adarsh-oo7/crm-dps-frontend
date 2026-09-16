import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle2, Copy, Link2, MessageCircle, Plug, Send } from 'lucide-react';
import { apiClient } from '../../api/client';

interface Integration {
  connected: boolean;
  display_number: string;
  phone_number_id: string;
  waba_id: string;
  verified_name: string;
  source: string;
  meta_app_id: string;
  meta_config_id: string;
  signup_ready: boolean;
  webhook_url: string;
  click_to_chat_url: string;
  inbound_count: number;
}

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (cb: (res: { authResponse?: { code?: string } }) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

function loadFacebookSdk(appId: string) {
  return new Promise<NonNullable<typeof window.FB>>((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version: 'v21.0' });
      if (window.FB) resolve(window.FB);
      else reject(new Error('Facebook SDK failed to load'));
    };
    const existing = document.getElementById('facebook-jssdk');
    if (existing) return;
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.onerror = () => reject(new Error('Could not load Facebook SDK'));
    document.body.appendChild(script);
  });
}

export default function WhatsAppIntegration() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionRef = useRef<Record<string, unknown>>({});
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Hello from DPS CRM');

  const { data, isLoading } = useQuery<Integration>({
    queryKey: ['whatsapp-integration'],
    queryFn: () => apiClient('/api/whatsapp/integration/'),
  });

  const connectMutation = useMutation({
    mutationFn: (payload: { code: string; session: Record<string, unknown> }) =>
      apiClient('/api/whatsapp/connect/', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-integration'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('WhatsApp Business account connected');
    },
    onError: (err: Error) => toast.error(err.message || 'Could not connect WhatsApp'),
  });

  const testMutation = useMutation({
    mutationFn: () => apiClient('/api/whatsapp/send/', { method: 'POST', body: { to: testPhone, text: testText } }),
    onSuccess: (res: { contact?: { id: number } }) => {
      toast.success('Test message sent to WhatsApp');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      if (res?.contact?.id) navigate(`/whatsapp`);
    },
    onError: (err: Error) => toast.error(err.message || 'Could not send test message'),
  });

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (![
        'https://www.facebook.com',
        'https://web.facebook.com',
        'https://www.facebook.com/',
        'https://web.facebook.com/',
      ].includes(event.origin) && !String(event.origin).includes('facebook.com')) {
        return;
      }
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload?.type === 'WA_EMBEDDED_SIGNUP') {
          sessionRef.current = payload;
        }
      } catch {
        /* ignore non-JSON */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const connectWhatsApp = async () => {
    if (!data?.meta_app_id) {
      toast.error('Meta App ID is missing on the server.');
      return;
    }
    if (!data.meta_config_id) {
      toast.error('Add META_EMBEDDED_SIGNUP_CONFIG_ID from Meta Embedded Signup, then retry Connect WhatsApp.');
      return;
    }
    try {
      const FB = await loadFacebookSdk(data.meta_app_id);
      FB.login((response) => {
        const code = response?.authResponse?.code;
        if (!code) {
          toast.error('WhatsApp authorization was cancelled.');
          return;
        }
        connectMutation.mutate({ code, session: sessionRef.current });
      }, {
        config_id: data.meta_config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: '3' },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start Meta signup');
    }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Toaster position="top-right" />
      <div>
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Integrations</p>
        <h1 className="text-2xl font-bold text-white mt-1">WhatsApp Integration</h1>
        <p className="text-sm text-text-sub mt-1">Connect a WhatsApp Business account with Meta Embedded Signup, then send and reply from the CRM inbox.</p>
      </div>

      <div className="bg-bg-card border border-border-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center">
            <MessageCircle size={28} fill="currentColor" />
          </div>
          <div>
            <p className="text-sm text-text-sub">WhatsApp Business</p>
            {isLoading ? (
              <p className="text-lg font-semibold">Checking connection…</p>
            ) : data?.connected ? (
              <>
                <p className="text-2xl font-semibold text-white">{data.display_number}</p>
                <p className="text-sm text-[#00A884] flex items-center gap-1 mt-1">
                  <CheckCircle2 size={14} /> Connected{data.verified_name ? ` · ${data.verified_name}` : ''}
                </p>
              </>
            ) : (
              <p className="text-lg font-semibold">Not connected</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={connectWhatsApp}
          disabled={connectMutation.isPending}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-[#1877F2] text-white font-semibold hover:bg-[#166fe0] disabled:opacity-60"
        >
          <Plug size={18} />
          {connectMutation.isPending ? 'Connecting…' : 'Connect WhatsApp'}
        </button>
      </div>

      {data?.connected && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold">Connected number</h2>
            <p className="text-3xl font-light text-white">{data.display_number}</p>
            <dl className="text-sm text-text-sub space-y-1">
              <div className="flex justify-between gap-3"><dt>Phone number ID</dt><dd className="text-text-main font-mono text-xs">{data.phone_number_id}</dd></div>
              <div className="flex justify-between gap-3"><dt>WABA ID</dt><dd className="text-text-main font-mono text-xs">{data.waba_id}</dd></div>
              <div className="flex justify-between gap-3"><dt>Inbound messages</dt><dd className="text-text-main">{data.inbound_count}</dd></div>
            </dl>
            <button
              type="button"
              onClick={() => navigate('/whatsapp')}
              className="w-full h-10 rounded-lg bg-[#00A884] text-[#111B21] font-semibold"
            >
              Open WhatsApp inbox
            </button>
          </div>

          <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold">Send a test message</h2>
            <p className="text-sm text-text-sub">
              If they already messaged {data.display_number}, this is a free reply. If they have not, WhatsApp sends your first text as a template (Meta billing required).
            </p>
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="9400355185"
              className="w-full bg-wa-panel rounded-lg px-3 py-2"
            />
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={3}
              className="w-full bg-wa-panel rounded-lg px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !testPhone.trim()}
                className="flex-1 h-10 rounded-lg bg-[#00A884] text-[#111B21] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={16} /> Send test
              </button>
              <button
                type="button"
                onClick={() => copy(data.click_to_chat_url, 'Chat link')}
                className="h-10 px-3 rounded-lg bg-wa-hover text-wa-icon"
                title="Copy customer chat link"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-2 text-sm text-text-sub">
        <h2 className="font-semibold text-text-main flex items-center gap-2"><Link2 size={16} /> Meta Embedded Signup</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click <span className="text-text-main">Connect WhatsApp</span> and complete Facebook Login.</li>
          <li>Select or create the WhatsApp Business account and phone number.</li>
          <li>Authorize the CRM. You return here with the connected number.</li>
          <li>Message {data?.display_number || '+91 94478 45185'} from a customer phone — it appears in the inbox.</li>
          <li>Reply from the CRM inbox to send it back to WhatsApp.</li>
        </ol>
        {!data?.signup_ready && (
          <p className="text-warning pt-2">
            To launch the Meta popup, add an Embedded Signup configuration ID in Meta App Dashboard (Facebook Login for Business) and set META_EMBEDDED_SIGNUP_CONFIG_ID plus META_APP_SECRET on the server. Also add https://crm.digitalproductsolutions.in to Valid OAuth Redirect URIs and Allowed domains.
          </p>
        )}
      </div>
    </div>
  );
}
