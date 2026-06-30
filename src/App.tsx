import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import Leads from './pages/leads/Leads';
import Clients from './pages/clients/Clients';
import Projects from './pages/projects/Projects';
import Tasks from './pages/tasks/Tasks';
import FollowUps from './pages/followups/FollowUps';
import Team from './pages/team/Team';
import Finance from './pages/finance/Finance';
import Marketing from './pages/marketing/Marketing';
import SEO from './pages/seo/SEO';
import Products from './pages/products/Products';
import Infrastructure from './pages/servers/Infrastructure';
import Knowledge from './pages/knowledge/Knowledge';
import Reports from './pages/reports/Reports';
import SettingsPage from './pages/settings/Settings';
import Profile from './pages/profile/Profile';
import Notifications from './pages/notifications/Notifications';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Main Layout routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Real core modules */}
            <Route path="leads" element={<Leads />} />
            <Route path="clients" element={<Clients />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="followups" element={<FollowUps />} />
            
            {/* Fallbacks for pending modules in future setup */}
            <Route path="finance" element={<Finance />} />
            <Route path="team" element={<Team />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="seo" element={<SEO />} />
            <Route path="infrastructure" element={<Infrastructure />} />
            <Route path="knowledge" element={<Knowledge />} />
            <Route path="products" element={<Products />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
