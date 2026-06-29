import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserSquare2, FolderGit, CheckSquare, 
  Clock, DollarSign, CalendarRange, TrendingUp, ShieldCheck, 
  Settings, Server, Globe, Package, ChevronLeft, 
  ChevronRight, LogOut, BookOpen, X
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

  const menuGroups = [
    {
      title: 'Core Management',
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
      title: 'Finance & Staffing',
      items: [
        { name: 'Finance', path: '/finance', icon: DollarSign, roles: ['superadmin', 'admin', 'finance'] },
        { name: 'Team Hub', path: '/team', icon: CalendarRange, roles: ['superadmin', 'admin', 'manager', 'developer', 'designer', 'marketer', 'support', 'finance'] },
      ] as SidebarItem[]
    },
    {
      title: 'Growth & Infrastructure',
      items: [
        { name: 'Marketing', path: '/marketing', icon: TrendingUp, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'SEO Control', path: '/seo', icon: Globe, roles: ['superadmin', 'admin', 'marketer'] },
        { name: 'Servers', path: '/infrastructure', icon: Server, roles: ['superadmin', 'admin'] },
        { name: 'Products', path: '/products', icon: Package, roles: ['superadmin', 'admin', 'developer', 'designer'] },
      ] as SidebarItem[]
    },
    {
      title: 'Knowledge & Metrics',
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

  return (
    <>
      {/* Mobile Sidebar backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-35 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
      )}

      <aside 
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-bg-card border-r border-border-card flex flex-col justify-between
          ${isOpen ? 'w-64 translate-x-0' : 'w-20 lg:translate-x-0 -translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div>
          <div className="flex items-center justify-between h-16 px-4 border-b border-border-card bg-bg-main/30">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="flex items-center justify-center w-9 h-9 bg-primary text-white rounded-lg shrink-0 shadow-lg shadow-primary/20">
                <span className="font-extrabold text-sm tracking-tighter">DP</span>
              </div>
              {isOpen && (
                <span className="text-sm font-bold text-white tracking-wide truncate">DPS Agency OS</span>
              )}
            </div>
            
            {/* Toggle Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded-lg bg-bg-main border border-border-card text-text-sub hover:text-white transition-colors duration-200"
            >
              {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
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
                    <h3 className="px-3 text-3xs font-bold text-text-sub uppercase tracking-wider block mb-1.5 opacity-60">
                      {group.title}
                    </h3>
                  )}
                  {visibleItems.map((item, itemIdx) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={itemIdx}
                        to={item.path}
                        onClick={() => {
                          // Close sidebar on mobile after clicking a link
                          if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className={({ isActive }) => `
                          flex items-center px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 group
                          ${isActive 
                            ? 'bg-primary text-white shadow-md shadow-primary/10' 
                            : 'text-text-sub hover:bg-bg-main hover:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
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
        <div className="p-3 border-t border-border-card bg-bg-main/30">
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-danger rounded-lg hover:bg-danger/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
