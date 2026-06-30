import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { 
  Bell, Check, CheckCheck, Clock, CheckSquare, Users, 
  Briefcase, DollarSign, Settings, ChevronRight, Inbox
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import DateDisplay from '../../components/shared/DateDisplay';

interface Notification {
  id: number;
  user: number;
  title: string;
  message: string;
  notification_type: 'Lead' | 'Task' | 'Follow-up' | 'Invoice' | 'Project' | 'System';
  related_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Query notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient('/api/notifications/')
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient('/api/notifications/mark-all-read/', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('All notifications marked as read');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to mark all as read')
  });

  // Mark individual as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/api/notifications/${id}/read/`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    }
  });

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.related_url) {
      const targetUrl = notif.related_url.startsWith('/') ? notif.related_url : `/${notif.related_url}`;
      navigate(targetUrl);
    }
  };

  const getNotificationIcon = (type: Notification['notification_type']) => {
    switch (type) {
      case 'Lead':
        return <Users className="text-info shrink-0" size={18} />;
      case 'Task':
        return <CheckSquare className="text-primary shrink-0" size={18} />;
      case 'Follow-up':
        return <Clock className="text-warning shrink-0" size={18} />;
      case 'Invoice':
        return <DollarSign className="text-success shrink-0" size={18} />;
      case 'Project':
        return <Briefcase className="text-primary shrink-0" size={18} />;
      default:
        return <Settings className="text-text-sub shrink-0" size={18} />;
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.is_read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell size={24} className="text-primary" />
            Notifications Center
          </h1>
          <p className="text-sm text-text-sub">Stay updated with leads, tasks, and system activities.</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            <CheckCheck size={16} className="mr-1.5" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-card">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            filter === 'all' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-sub hover:text-white'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            filter === 'unread' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-sub hover:text-white'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-text-sub">Loading notifications...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-card border border-border-card rounded-2xl p-6 text-center space-y-3">
          <div className="p-3 bg-bg-main border border-border-card rounded-full text-text-sub/50">
            <Inbox size={28} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">No notifications found</h3>
            <p className="text-xs text-text-sub mt-1">
              {filter === 'unread' 
                ? "You've read all your notifications! Great job." 
                : "When you receive system activities or updates, they will appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-card rounded-2xl divide-y divide-border-card overflow-hidden shadow-lg">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`flex items-start gap-4 p-4 hover:bg-bg-main/60 transition-colors cursor-pointer ${
                !notif.is_read ? 'bg-primary-light/5 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="p-2 bg-bg-main border border-border-card/40 rounded-xl">
                {getNotificationIcon(notif.notification_type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white leading-snug">{notif.title}</h4>
                  <span className="text-3xs text-text-sub/70 font-semibold shrink-0">
                    <DateDisplay dateString={notif.created_at} includeTime />
                  </span>
                </div>
                <p className="text-xs text-text-sub leading-relaxed">{notif.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!notif.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(notif.id);
                    }}
                    className="p-1.5 hover:bg-primary-light rounded-md text-primary transition-colors cursor-pointer"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <ChevronRight size={14} className="text-text-sub/40" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
