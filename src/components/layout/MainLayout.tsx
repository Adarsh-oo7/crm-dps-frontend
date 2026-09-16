import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import GlobalSearch from './GlobalSearch';
import { useAuthStore } from '../../store/authStore';

export default function MainLayout() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.location.pathname !== '/whatsapp');
  const location = useLocation();
  const isWhatsAppInbox = location.pathname === '/whatsapp';

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isWhatsAppInbox) setSidebarOpen(false);
  }, [isWhatsAppInbox]);

  useEffect(() => {
    document.documentElement.classList.toggle('wa-lock', isWhatsAppInbox);
    document.body.classList.toggle('wa-lock', isWhatsAppInbox);
    return () => {
      document.documentElement.classList.remove('wa-lock');
      document.body.classList.remove('wa-lock');
    };
  }, [isWhatsAppInbox]);

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
    <div className={isWhatsAppInbox ? 'h-dvh overflow-hidden bg-bg-main text-text-main' : 'min-h-screen bg-bg-main text-text-main'}>
      <GlobalSearch />
      
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {isWhatsAppInbox ? (
        <>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-full bg-[#202C33] text-[#AEBAC1]"
          >
            Menu
          </button>
          <main className={`fixed inset-0 z-30 overflow-hidden ${sidebarOpen ? 'lg:left-[280px]' : 'lg:left-20'}`}>
            <Outlet />
          </main>
        </>
      ) : (
        <div
          className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-20'
          }`}
        >
          <Topbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden wa-wallpaper">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}
