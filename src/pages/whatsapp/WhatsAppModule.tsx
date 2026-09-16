import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface Status {
  configured?: boolean;
  display_number?: string;
  verified_name?: string;
}

export default function WhatsAppModule() {
  const location = useLocation();
  const { data } = useQuery<Status>({
    queryKey: ['whatsapp-status'],
    queryFn: () => apiClient('/api/whatsapp/status/'),
    refetchInterval: 30000,
  });

  const tabs = [
    { to: '/whatsapp', label: 'Inbox', end: true },
    { to: '/whatsapp/contacts', label: 'Contacts' },
    { to: '/whatsapp/templates', label: 'Templates' },
    { to: '/whatsapp/settings', label: 'Settings' },
  ];
  const isInbox = location.pathname === '/whatsapp';

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">WhatsApp</h1>
          <p className="text-sm text-text-sub">Communication inbox for your CRM</p>
        </div>
        <div
          className={`text-sm font-semibold px-3 py-1.5 rounded-full border ${
            data?.configured
              ? 'text-success border-success/30 bg-success/10'
              : 'text-text-sub border-border-card bg-bg-card'
          }`}
        >
          {data?.configured ? 'Connected ●' : 'Not connected'}
          {data?.verified_name ? ` · ${data.verified_name}` : ''}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg text-sm border ${
                isActive
                  ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                  : 'bg-bg-card text-text-sub border-border-card hover:text-text-main'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className={`flex-1 min-h-0 ${isInbox ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Outlet />
      </div>
    </div>
  );
}
