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
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-4 sm:px-6 bg-bg-card border-b border-border-card backdrop-blur-md shadow-lg">
      {/* Mobile Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="p-1.5 mr-2 rounded-lg bg-bg-main border border-border-card text-text-sub hover:text-white lg:hidden transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Search Bar */}
      <div className="relative w-72 sm:w-96 max-w-lg hidden sm:block">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-sub">
          <Search size={16} />
        </span>
        <input
          type="text"
          readOnly
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          placeholder="Global search (Cmd + K)..."
          className="w-full py-1.5 pl-9 pr-4 text-xs text-white bg-bg-main border border-border-card rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all duration-200 cursor-pointer placeholder-text-sub"
        />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-3 ml-auto">
        {/* Quick Add Button */}
        <button 
          onClick={() => navigate('/tasks?action=create')}
          className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-all duration-205"
        >
          <Plus size={14} className="mr-1" />
          Quick Add
        </button>

        {/* Notifications Bell */}
        <button 
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-text-sub hover:text-white bg-bg-main border border-border-card rounded-full transition-colors duration-200"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-3xs font-bold text-white bg-danger rounded-full ring-1 ring-bg-main">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Vertical divider */}
        <div className="w-px h-5 bg-border-card"></div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 focus:outline-none group"
          >
            {getAvatarUrl() ? (
              <img 
                src={getAvatarUrl()} 
                alt="Profile avatar" 
                className="w-8 h-8 rounded-full object-cover border border-border-card"
              />
            ) : (
              <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-primary bg-primary-light border border-primary/20 rounded-full">
                {initials}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-xs font-semibold text-white leading-none group-hover:text-primary transition-colors duration-200">
                {user?.full_name || 'System User'}
              </p>
              <p className="text-3xs text-text-sub capitalize leading-none mt-1">
                {user?.role || 'developer'}
              </p>
            </div>
            <ChevronDown size={12} className="text-text-sub group-hover:text-white transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 w-44 mt-2 origin-top-right bg-bg-card border border-border-card rounded-lg shadow-xl divide-y divide-border-card focus:outline-none z-50">
              <div className="py-1">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center w-full px-3 py-2 text-xs text-text-sub hover:bg-bg-main hover:text-white transition-colors"
                >
                  <User size={14} className="mr-2 text-text-sub" />
                  My Profile
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="flex items-center w-full px-3 py-2 text-xs text-text-sub hover:bg-bg-main hover:text-white transition-colors"
                >
                  <Settings size={14} className="mr-2 text-text-sub" />
                  Settings
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={14} className="mr-2 text-danger" />
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
