import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import GlobalSearch from './GlobalSearch';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.location.pathname.startsWith('/whatsapp'));
  const location = useLocation();
  const isWhatsApp = location.pathname.startsWith('/whatsapp');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isWhatsApp) setSidebarOpen(false);
  }, [isWhatsApp]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-bg-main">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-text-sub">Opening DPS OS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main">
      <GlobalSearch />
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div 
        className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-20'}
        `}
      >
        {!isWhatsApp && <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />}
        {isWhatsApp && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-full bg-[#202C33] text-[#AEBAC1]"
          >
            Menu
          </button>
        )}
        <main className={isWhatsApp
          ? 'flex-1 overflow-hidden h-screen min-h-0'
          : 'flex-1 p-4 sm:p-6 overflow-x-hidden wa-wallpaper'
        }>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
