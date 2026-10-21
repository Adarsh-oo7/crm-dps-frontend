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
import PeopleDesk from './pages/desks/PeopleDesk';
import RequireModule from './components/auth/RequireModule';
import WhatsAppInbox from './pages/whatsapp/WhatsAppInbox';
import WhatsAppModule from './pages/whatsapp/WhatsAppModule';
import WhatsAppTemplates from './pages/whatsapp/WhatsAppTemplates';
import WhatsAppContactsPage from './pages/whatsapp/WhatsAppContactsPage';
import WhatsAppSettings from './pages/whatsapp/WhatsAppSettings';
import OfficeChat from './pages/office/OfficeChat';
import Interns from './pages/interns/Interns';
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
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="people" element={<RequireModule module="people"><PeopleDesk /></RequireModule>} />
            <Route path="office" element={<RequireModule module="office"><OfficeChat /></RequireModule>} />

            <Route path="whatsapp" element={<RequireModule module="whatsapp"><WhatsAppModule /></RequireModule>}>
              <Route index element={<WhatsAppInbox />} />
              <Route path="contacts" element={<WhatsAppContactsPage />} />
              <Route path="templates" element={<WhatsAppTemplates />} />
              <Route path="settings" element={<WhatsAppSettings />} />
            </Route>
            <Route path="whatsapp/integration" element={<Navigate to="/whatsapp/settings" replace />} />
            <Route path="whatsapp/connect" element={<Navigate to="/whatsapp/settings" replace />} />
            <Route path="whatsapp/dashboard" element={<Navigate to="/whatsapp" replace />} />
            <Route path="whatsapp/businesses" element={<Navigate to="/whatsapp/settings" replace />} />
            <Route path="whatsapp/numbers" element={<Navigate to="/whatsapp/settings" replace />} />
            <Route path="whatsapp/history" element={<Navigate to="/whatsapp" replace />} />
            <Route path="whatsapp/sync" element={<Navigate to="/whatsapp/settings" replace />} />
            <Route path="whatsapp/provider" element={<Navigate to="/whatsapp/settings" replace />} />

            <Route path="leads" element={<RequireModule module="leads"><Leads /></RequireModule>} />
            <Route path="clients" element={<RequireModule module="clients"><Clients /></RequireModule>} />
            <Route path="projects" element={<RequireModule module="projects"><Projects /></RequireModule>} />
            <Route path="tasks" element={<RequireModule module="tasks"><Tasks /></RequireModule>} />
            <Route path="followups" element={<RequireModule module="followups"><FollowUps /></RequireModule>} />
            <Route path="finance" element={<RequireModule module="billing"><Finance /></RequireModule>} />
            <Route path="interns" element={<RequireModule module="interns"><Interns /></RequireModule>} />
            <Route path="team" element={<RequireModule module="team"><Team /></RequireModule>} />
            <Route path="marketing" element={<RequireModule module="marketing"><Marketing /></RequireModule>} />
            <Route path="seo" element={<RequireModule module="seo"><SEO /></RequireModule>} />
            <Route path="infrastructure" element={<RequireModule module="servers"><Infrastructure /></RequireModule>} />
            <Route path="knowledge" element={<RequireModule module="knowledge"><Knowledge /></RequireModule>} />
            <Route path="products" element={<RequireModule module="products"><Products /></RequireModule>} />
            <Route path="reports" element={<RequireModule module="reports"><Reports /></RequireModule>} />
            <Route path="settings" element={<RequireModule module="settings"><SettingsPage /></RequireModule>} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
