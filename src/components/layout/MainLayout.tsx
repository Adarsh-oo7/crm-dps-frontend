import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import GlobalSearch from './GlobalSearch';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const isWhatsAppModule = location.pathname === '/whatsapp' || location.pathname.startsWith('/whatsapp/');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle('wa-lock', isWhatsAppModule);
    return () => document.documentElement.classList.remove('wa-lock');
  }, [isWhatsAppModule]);

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
    <div className={`${isWhatsAppModule ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-bg-main text-text-main`}>
      <GlobalSearch />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div
        className={`flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-20'
        } ${isWhatsAppModule ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
      >
        <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          className={
            isWhatsAppModule
              ? 'flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-4'
              : 'flex-1 p-4 sm:p-6 overflow-x-hidden'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
