const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const API_BASE_URL = BASE_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
  body?: any;
}

let refreshPromise: Promise<string | null> | null = null;

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return null;
    const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!refreshResponse.ok) return null;
    const refreshData = await refreshResponse.json();
    localStorage.setItem('access_token', refreshData.access);
    if (refreshData.refresh) localStorage.setItem('refresh_token', refreshData.refresh);
    return refreshData.access as string;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
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

  if (response.status === 401 && localStorage.getItem('refresh_token')) {
    const access = await refreshAccessToken();
    if (access) {
      const retryHeaders = {
        ...config.headers,
        Authorization: `Bearer ${access}`,
      };
      response = await fetch(url, { ...config, headers: retryHeaders as HeadersInit });
    } else {
      clearSession();
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

export async function apiBlob(endpoint: string) {
  const request = (token: string | null) =>
    fetch(`${BASE_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let response = await request(localStorage.getItem('access_token'));
  if (response.status === 401 && localStorage.getItem('refresh_token')) {
    const access = await refreshAccessToken();
    if (access) response = await request(access);
  }
  if (!response.ok) {
    throw new Error('Could not load media');
  }
  return response.blob();
}
