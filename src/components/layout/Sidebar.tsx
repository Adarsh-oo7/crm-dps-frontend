import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserSquare2, FolderGit, CheckSquare, 
  Clock, DollarSign, CalendarRange, TrendingUp, ShieldCheck, 
  Settings, Server, Globe, Package, ChevronLeft, 
  ChevronRight, LogOut, BookOpen, MessageCircle, Plug
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badgeKey?: string;
}

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const { user, logout } = useAuthStore();
  const userRole = user?.role || 'developer';
  const location = useLocation();
  const isWhatsAppInbox = location.pathname === '/whatsapp';

  const menuGroups = [
    {
      title: 'Chats',
      items: [
        { name: 'WhatsApp', path: '/whatsapp', icon: MessageCircle },
        { name: 'WhatsApp Integration', path: '/whatsapp/integration', icon: Plug },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', path: '/leads', icon: Users, roles: ['superadmin', 'admin', 'manager', 'marketer'] },
        { name: 'Clients', path: '/clients', icon: UserSquare2, roles: ['superadmin', 'admin', 'manager', 'support', 'finance'] },
        { name: 'Projects', path: '/projects', icon: FolderGit, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer'] },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Follow-ups', path: '/followups', icon: Clock, roles: ['superadmin', 'admin', 'manager', 'support'] },
      ] as SidebarItem[]
    },
    {
      title: 'Team',
      items: [
        { name: 'Finance', path: '/finance', icon: DollarSign, roles: ['superadmin', 'admin', 'finance'] },
        { name: 'Team Hub', path: '/team', icon: CalendarRange, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer', 'marketer', 'support', 'finance'] },
      ] as SidebarItem[]
    },
    {
      title: 'Channels',
      items: [
        { name: 'Marketing', path: '/marketing', icon: TrendingUp, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'SEO Control', path: '/seo', icon: Globe, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'Servers', path: '/infrastructure', icon: Server, roles: ['superadmin', 'admin'] },
        { name: 'Products', path: '/products', icon: Package, roles: ['superadmin', 'admin', 'developer', 'designer'] },
      ] as SidebarItem[]
    },
    {
      title: 'Starred',
      items: [
        { name: 'Knowledge SOPs', path: '/knowledge', icon: BookOpen },
        { name: 'Reports', path: '/reports', icon: ShieldCheck, roles: ['superadmin', 'admin', 'manager', 'finance'] },
        { name: 'Settings', path: '/settings', icon: Settings, roles: ['superadmin', 'admin'] },
      ] as SidebarItem[]
    }
  ];

  const checkRoleAccess = (item: SidebarItem) => {
    if (!item.roles) return true;
    if (item.roles.includes(userRole)) return true;
    
    const permName = item.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const userPermissions = user?.custom_permissions || [];
    return userPermissions.includes(permName);
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <>
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-35 bg-black/70 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-wa-panel border-r border-border-card flex flex-col
          ${isOpen ? 'w-[280px] translate-x-0' : 'w-20 lg:translate-x-0 -translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-[60px] px-3 bg-wa-header shrink-0">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="relative shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-[#111B21]">
                <MessageCircle size={20} fill="currentColor" />
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-wa-header" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-text-main truncate leading-tight">DPS Agency OS</p>
                <p className="text-[12px] text-text-sub truncate capitalize">{user?.full_name || 'Online'}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-wa-icon hover:bg-wa-hover hover:text-text-main transition-colors"
            aria-label="Toggle sidebar"
          >
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => checkRoleAccess(item));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx}>
                {isOpen && !isWhatsAppInbox && (
                  <h3 className="px-4 pt-3 pb-1 text-[11px] font-semibold text-primary tracking-wide">
                    {group.title}
                  </h3>
                )}
                {visibleItems.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.path}
                      end={item.path === '/whatsapp'}
                      onClick={() => {
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className={({ isActive }) => `
                        wa-chat-row group relative
                        ${isActive
                          ? 'bg-wa-hover'
                          : 'hover:bg-wa-hover/70'
                        }
                        ${!isOpen ? 'justify-center px-0 border-b-0 py-3' : ''}
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />
                          )}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                            isActive ? 'bg-primary text-[#111B21]' : 'bg-bg-card text-wa-icon group-hover:text-text-main'
                          }`}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          {isOpen && !isWhatsAppInbox && (
                            <div className="min-w-0 flex-1">
                              <p className={`text-[15px] truncate ${isActive ? 'text-text-main font-medium' : 'text-text-main'}`}>
                                {item.name}
                              </p>
                              <p className="text-[12px] text-text-sub truncate">
                                {item.name === 'WhatsApp' ? 'Business inbox' : item.name === 'Dashboard' ? 'Today · Agency overview' : 'Open conversation'}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="p-2 border-t border-border-card bg-wa-header">
          <button
            onClick={() => logout()}
            className={`flex items-center w-full rounded-lg text-[14px] font-medium text-danger hover:bg-danger/10 transition-all duration-200 ${
              isOpen ? 'px-3 py-2.5 gap-3' : 'justify-center py-3'
            }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {isOpen && <span>Logout</span>}
          </button>
          {isOpen && (
            <p className="px-3 pb-2 text-[11px] text-text-sub">{initials} · {userRole}</p>
          )}
        </div>
      </aside>
    </>
  );
}
