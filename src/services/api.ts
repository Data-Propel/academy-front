const API_URL = 'https://api.academy.wepropel.org/api';

// Token management
export const getToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// API fetch wrapper
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Try to refresh token
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry request with new token
      (headers as Record<string, string>)['Authorization'] = `Bearer ${getToken()}`;
      return fetch(`${API_URL}${endpoint}`, { ...options, headers });
    } else {
      clearTokens();
      window.location.href = '/login';
    }
  }

  return response;
};

// Refresh token
const refreshToken = async (): Promise<boolean> => {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_URL}/users/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      setTokens(data.access, data.refresh || refresh);
      return true;
    }
  } catch {
    // Refresh failed
  }
  return false;
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setTokens(data.access, data.refresh);
    }
    return { ok: response.ok, data };
  },

  register: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
  }) => {
    const response = await fetch(`${API_URL}/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  resetPassword: async (email: string) => {
    const response = await fetch(`${API_URL}/users/password-reset/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { ok: response.ok, data: await response.json() };
  },

  getProfile: async () => {
    const response = await apiFetch('/users/profile/');
    return { ok: response.ok, data: await response.json() };
  },

  logout: () => {
    clearTokens();
    window.location.href = '/login';
  },
};

// Courses API
export const coursesApi = {
  list: async (params?: { category?: string; level?: string; search?: string; featured?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.featured) searchParams.append('featured', 'true');

    const query = searchParams.toString();
    const response = await apiFetch(`/courses/${query ? `?${query}` : ''}`);
    return { ok: response.ok, data: await response.json() };
  },

  getBySlug: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/`);
    return { ok: response.ok, data: await response.json() };
  },

  getCategories: async () => {
    const response = await apiFetch('/courses/categories/');
    return { ok: response.ok, data: await response.json() };
  },

  enroll: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/enroll/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },

  toggleFavorite: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/favorite/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },

  getMyEnrollments: async () => {
    const response = await apiFetch('/courses/my/enrollments/');
    return { ok: response.ok, data: await response.json() };
  },

  getMyFavorites: async () => {
    const response = await apiFetch('/courses/my/favorites/');
    return { ok: response.ok, data: await response.json() };
  },
};

// Check if user is authenticated
export const isAuthenticated = () => !!getToken();
