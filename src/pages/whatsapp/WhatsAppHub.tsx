import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/whatsapp/dashboard', label: 'Dashboard' },
  { to: '/whatsapp/connect', label: 'Connect' },
  { to: '/whatsapp/businesses', label: 'Businesses' },
  { to: '/whatsapp/numbers', label: 'Numbers' },
  { to: '/whatsapp/templates', label: 'Templates' },
  { to: '/whatsapp/contacts', label: 'Contacts' },
  { to: '/whatsapp/history', label: 'History' },
  { to: '/whatsapp/sync', label: 'Sync status' },
  { to: '/whatsapp/provider', label: 'Tech Provider' },
];

export default function WhatsAppHub() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-[#00A884]">WhatsApp module</p>
        <h1 className="text-2xl font-semibold">Tech Provider hub</h1>
        <p className="text-sm text-text-sub mt-1">Connect multiple WhatsApp Business accounts without replacing the rest of the CRM.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-sm ${isActive ? 'bg-[#00A884] text-[#111B21] font-semibold' : 'bg-bg-card text-text-sub hover:text-text-main'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <NavLink to="/whatsapp" className="px-3 py-1.5 rounded-full text-sm bg-bg-card text-text-sub hover:text-text-main">
          Inbox
        </NavLink>
      </div>
      <Outlet />
    </div>
  );
}
