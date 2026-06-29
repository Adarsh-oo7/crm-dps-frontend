import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: 'superadmin' | 'admin' | 'manager' | 'developer' | 'designer' | 'marketer' | 'support' | 'finance';
  department: string;
  avatar: string | null;
  is_active: boolean;
  is_online: boolean;
  whatsapp_number: string;
  notification_preferences: Record<string, any>;
  custom_permissions: string[];
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient('/api/auth/login/', {
        method: 'POST',
        body: { email, password },
      });
      
      const { access, refresh, user } = response;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return user;
    } catch (err: any) {
      const message = err.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient('/api/auth/logout/', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },
  
  checkAuth: () => {
    const accessToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (accessToken && savedUser) {
      set({ 
        user: JSON.parse(savedUser) as UserProfile, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  
  updateProfile: (updatedData) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  }
}));
