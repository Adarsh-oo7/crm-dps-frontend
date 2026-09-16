import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserSquare2, FolderGit, CheckSquare,
  Clock, DollarSign, CalendarRange, TrendingUp, ShieldCheck,
  Settings, Server, Globe, Package, ChevronLeft,
  ChevronRight, LogOut, BookOpen, MessageCircle, Building2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const { user, logout } = useAuthStore();
  const userRole = user?.role || 'developer';

  const menuGroups = [
    {
      title: 'CRM',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', path: '/leads', icon: Users, roles: ['superadmin', 'admin', 'manager', 'marketer'] },
        { name: 'Clients', path: '/clients', icon: UserSquare2, roles: ['superadmin', 'admin', 'manager', 'support', 'finance'] },
        { name: 'Projects', path: '/projects', icon: FolderGit, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer'] },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Follow-ups', path: '/followups', icon: Clock, roles: ['superadmin', 'admin', 'manager', 'support'] },
        { name: 'Team', path: '/team', icon: CalendarRange },
        { name: 'Billing', path: '/finance', icon: DollarSign, roles: ['superadmin', 'admin', 'finance'] },
        { name: 'Reports', path: '/reports', icon: ShieldCheck, roles: ['superadmin', 'admin', 'manager', 'finance'] },
      ] as SidebarItem[],
    },
    {
      title: 'Communication',
      items: [
        { name: 'WhatsApp', path: '/whatsapp', icon: MessageCircle },
      ] as SidebarItem[],
    },
    {
      title: 'Operations',
      items: [
        { name: 'Marketing', path: '/marketing', icon: TrendingUp, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'SEO', path: '/seo', icon: Globe, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'Products', path: '/products', icon: Package, roles: ['superadmin', 'admin', 'developer', 'designer'] },
        { name: 'Servers', path: '/infrastructure', icon: Server, roles: ['superadmin', 'admin'] },
        { name: 'Knowledge', path: '/knowledge', icon: BookOpen },
      ] as SidebarItem[],
    },
    {
      title: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings, roles: ['superadmin', 'admin'] },
      ] as SidebarItem[],
    },
  ];

  const checkRoleAccess = (item: SidebarItem) => {
    if (!item.roles) return true;
    if (item.roles.includes(userRole)) return true;
    const permName = item.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    return (user?.custom_permissions || []).includes(permName);
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-35 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-sidebar-bg border-r border-border-card flex flex-col transition-all duration-300
          ${isOpen ? 'w-[260px] translate-x-0' : 'w-20 lg:translate-x-0 -translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-[60px] px-3 border-b border-border-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-[#111B21] shrink-0">
              <Building2 size={20} />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-text-main leading-tight">DPS</p>
                <p className="text-[11px] text-text-sub leading-tight">Agency OS</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg text-text-sub hover:bg-bg-card hover:text-text-main"
            aria-label="Toggle sidebar"
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(checkRoleAccess);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} className="mb-3">
                {isOpen && (
                  <h3 className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-sub">
                    {group.title}
                  </h3>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/whatsapp' ? false : item.path !== '/dashboard'}
                      onClick={() => {
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className={({ isActive }) =>
                        `flex items-center gap-3 mx-2 rounded-lg text-sm transition-colors ${
                          isOpen ? 'px-3 py-2' : 'justify-center py-2.5'
                        } ${isActive ? 'bg-primary/15 text-primary font-semibold' : 'text-text-sub hover:bg-bg-card hover:text-text-main'}`
                      }
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {isOpen && <span className="truncate">{item.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border-card">
          {isOpen && (
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary text-[#111B21] flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-text-sub capitalize truncate">{userRole}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => logout()}
            className={`flex items-center w-full rounded-lg text-sm text-danger hover:bg-danger/10 ${
              isOpen ? 'px-3 py-2 gap-2' : 'justify-center py-2'
            }`}
          >
            <LogOut className="w-[16px] h-[16px]" />
            {isOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
