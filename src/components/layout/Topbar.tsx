import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Plus, User, Settings, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export default function Topbar({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['unread-notifications-count'],
    queryFn: () => apiClient('/api/notifications/unread-count/').catch(() => ({ unread_count: 0 })),
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.unread_count || 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setDropdownOpen(false);
    navigate('/profile');
  };

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  const initials = user?.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const base_url = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const getAvatarUrl = () => {
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) return user.avatar;
      return `${base_url}${user.avatar}`;
    }
    return '';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-[60px] px-3 sm:px-4 bg-wa-header border-b border-border-card">
      <button 
        onClick={toggleSidebar}
        className="p-2 mr-1 rounded-full text-wa-icon hover:bg-wa-hover hover:text-text-main lg:hidden transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="relative w-72 sm:w-[420px] max-w-lg hidden sm:block">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-wa-icon">
          <Search size={16} />
        </span>
        <input
          type="text"
          readOnly
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          placeholder="Search leads, clients, projects..."
          className="w-full py-2 pl-10 pr-4 text-[14px] text-text-main bg-wa-panel border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer placeholder-text-sub"
        />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <button 
          onClick={() => navigate('/tasks?action=create')}
          className="flex items-center px-3 py-1.5 text-[13px] font-semibold text-[#111B21] bg-primary hover:bg-primary-dark rounded-full transition-colors"
        >
          <Plus size={14} className="mr-1" />
          New
        </button>

        <button 
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-wa-icon hover:text-text-main hover:bg-wa-hover rounded-full transition-colors"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-[#111B21] bg-primary rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-1 py-1 rounded-full hover:bg-wa-hover focus:outline-none"
          >
            {getAvatarUrl() ? (
              <img 
                src={getAvatarUrl()} 
                alt="Profile avatar" 
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 text-[12px] font-bold text-[#111B21] bg-primary rounded-full">
                {initials}
              </div>
            )}
            <div className="text-left hidden md:block pr-1">
              <p className="text-[14px] font-medium text-text-main leading-none">
                {user?.full_name || 'System User'}
              </p>
              <p className="text-[11px] text-primary capitalize leading-none mt-1">
                {user?.role || 'developer'} · online
              </p>
            </div>
            <ChevronDown size={14} className="text-wa-icon hidden md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 w-48 mt-2 origin-top-right bg-bg-card border border-border-card rounded-lg shadow-xl overflow-hidden z-50">
              <div className="py-1">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center w-full px-4 py-2.5 text-[14px] text-text-main hover:bg-wa-hover transition-colors"
                >
                  <User size={16} className="mr-3 text-wa-icon" />
                  My Profile
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="flex items-center w-full px-4 py-2.5 text-[14px] text-text-main hover:bg-wa-hover transition-colors"
                >
                  <Settings size={16} className="mr-3 text-wa-icon" />
                  Settings
                </button>
              </div>
              <div className="border-t border-border-card py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-[14px] text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={16} className="mr-3" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
