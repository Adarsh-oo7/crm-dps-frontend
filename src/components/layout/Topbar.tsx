import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Plus, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['unread-notifications-count'],
    queryFn: () => apiClient('/api/notifications/unread-count/').catch(() => ({ unread_count: 0 })),
    refetchInterval: 30000, // Poll every 30s
  });
  const unreadCount = unreadData?.unread_count || 0;

  // Close dropdown on click outside
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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-16 px-6 bg-white border-b border-gray-200 shadow-sm">
      {/* Search Bar */}
      <div className="relative w-96 max-w-lg hidden sm:block">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          readOnly
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          placeholder="Global search (Cmd/Ctrl + K)..."
          className="w-full py-2 pl-10 pr-4 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 cursor-pointer"
        />
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4 ml-auto">
        {/* Quick Add Button */}
        <button 
          onClick={() => navigate('/tasks?action=create')}
          className="flex items-center px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm transition-all duration-200"
        >
          <Plus size={16} className="mr-1.5" />
          Quick Add
        </button>

        {/* Notifications Bell */}
        <button 
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-gray-500 hover:text-gray-950 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-2xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-gray-200"></div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 focus:outline-none group"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile avatar" 
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
                {initials}
              </div>
            )}
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-gray-900 leading-none group-hover:text-primary transition-colors duration-200">
                {user?.full_name || 'System User'}
              </p>
              <p className="text-xs text-gray-500 capitalize leading-none mt-1">
                {user?.role || 'developer'}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 w-48 mt-2.5 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none">
              <div className="py-1">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={16} className="mr-2 text-gray-400" />
                  My Profile
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={16} className="mr-2 text-gray-400" />
                  Settings
                </button>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} className="mr-2 text-red-400" />
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
