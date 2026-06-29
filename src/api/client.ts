const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
  body?: any;
}

export async function apiClient(endpoint: string, options: RequestOptions = {}) {
  const { params, headers, body, ...customConfig } = options;
  
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      searchParams.append(key, String(val));
    });
    url += `?${searchParams.toString()}`;
  }
  
  const token = localStorage.getItem('access_token');
  const defaultHeaders: Record<string, string> = {};
  
  if (!(body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...defaultHeaders,
      ...headers,
    } as HeadersInit,
    ...customConfig,
  };

  if (body) {
    if (body instanceof FormData) {
      config.body = body;
    } else {
      config.body = JSON.stringify(body);
    }
  }

  let response = await fetch(url, config);

  // If unauthorized, try to refresh token
  if (response.status === 401 && localStorage.getItem('refresh_token')) {
    try {
      const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: localStorage.getItem('refresh_token') }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        localStorage.setItem('access_token', refreshData.access);
        if (refreshData.refresh) {
          localStorage.setItem('refresh_token', refreshData.refresh);
        }
        // Retry original request
        const retryHeaders = {
          ...config.headers,
          'Authorization': `Bearer ${refreshData.access}`,
        };
        response = await fetch(url, { ...config, headers: retryHeaders as HeadersInit });
      } else {
        // Refresh token failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } catch (e) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData) || 'Something went wrong';
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
