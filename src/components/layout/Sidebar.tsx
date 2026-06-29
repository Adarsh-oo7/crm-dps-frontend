import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserSquare2, FolderGit, CheckSquare, 
  Clock, DollarSign, CalendarRange, TrendingUp, ShieldCheck, 
  Settings, Server, Globe, Package, ChevronLeft, 
  ChevronRight, LogOut, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // Allowed roles (if empty, visible to all authenticated)
  badgeKey?: string; // Key for dynamic badge counts if any
}

export default function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) {
  const { user, logout } = useAuthStore();
  const userRole = user?.role || 'developer';

  const menuGroups = [
    {
      title: 'Core',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', path: '/leads', icon: Users, roles: ['superadmin', 'admin', 'manager', 'marketer'] },
        { name: 'Clients', path: '/clients', icon: UserSquare2, roles: ['superadmin', 'admin', 'manager', 'support', 'finance'] },
        { name: 'Projects', path: '/projects', icon: FolderGit, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer'] },
        { name: 'Tasks', path: '/tasks', icon: CheckSquare },
        { name: 'Follow-ups', path: '/followups', icon: Clock, roles: ['superadmin', 'admin', 'manager', 'support'] },
      ] as SidebarItem[]
    },
    {
      title: 'Finance & Team',
      items: [
        { name: 'Finance', path: '/finance', icon: DollarSign, roles: ['superadmin', 'admin', 'finance'] },
        { name: 'Team', path: '/team', icon: CalendarRange, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer', 'marketer', 'support', 'finance'] },
      ] as SidebarItem[]
    },
    {
      title: 'Marketing & SEO',
      items: [
        { name: 'Marketing', path: '/marketing', icon: TrendingUp, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'SEO', path: '/seo', icon: Globe, roles: ['superadmin', 'admin', 'marketer'] },
      ] as SidebarItem[]
    },
    {
      title: 'Infrastructure & Products',
      items: [
        { name: 'Infrastructure', path: '/infrastructure', icon: Server, roles: ['superadmin', 'admin'] },
        { name: 'Products', path: '/products', icon: Package, roles: ['superadmin', 'admin', 'developer', 'designer'] },
      ] as SidebarItem[]
    },
    {
      title: 'Settings & Analytics',
      items: [
        { name: 'Knowledge SOPs', path: '/knowledge', icon: BookOpen },
        { name: 'Reports', path: '/reports', icon: ShieldCheck, roles: ['superadmin', 'admin', 'manager', 'finance'] },
        { name: 'Settings', path: '/settings', icon: Settings, roles: ['superadmin', 'admin'] },
      ] as SidebarItem[]
    }
  ];

  // Filter items by role or custom permissions
  const checkRoleAccess = (item: SidebarItem) => {
    if (!item.roles) return true;
    if (item.roles.includes(userRole)) return true;
    
    // Normalize name, e.g. "Knowledge SOPs" -> "knowledgesops" or "Leads" -> "leads"
    const permName = item.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const userPermissions = user?.custom_permissions || [];
    return userPermissions.includes(permName);
  };

  return (
    <aside 
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-sidebar-bg border-r border-indigo-950 flex flex-col justify-between
        ${isOpen ? 'w-64' : 'w-20'}
      `}
    >
      {/* Sidebar Header */}
      <div>
        <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-950">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg shrink-0">
              <span className="font-bold text-lg text-white">DP</span>
            </div>
            {isOpen && (
              <span className="text-lg font-bold text-white tracking-wide truncate">DPS OS</span>
            )}
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg bg-indigo-950 text-sidebar-text hover:text-white transition-colors duration-200"
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
 
        {/* Sidebar Items */}
        <div className="px-3 py-4 overflow-y-auto max-h-[calc(100vh-130px)] space-y-4">
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => checkRoleAccess(item));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                {isOpen && (
                  <h3 className="px-3 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                    {group.title}
                  </h3>
                )}
                {visibleItems.map((item, itemIdx) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                        ${isActive 
                          ? 'bg-primary text-white' 
                          : 'text-sidebar-text hover:bg-indigo-950 hover:text-white'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {isOpen && (
                        <span className="ml-3 truncate">{item.name}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-indigo-950">
        <button
          onClick={() => logout()}
          className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-300 rounded-lg hover:bg-red-950 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
