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
  localStorage.removeItem('is_superuser');
};

// Superuser management
export const setSuperuser = (isSuperuser: boolean) => {
  localStorage.setItem('is_superuser', String(isSuperuser));
};
export const isSuperuser = () => localStorage.getItem('is_superuser') === 'true';

// API fetch wrapper for FormData (file uploads)
const apiFetchFormData = async (endpoint: string, formData: FormData, method: string = 'POST') => {
  const token = getToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      return fetch(`${API_URL}${endpoint}`, { method, headers, body: formData });
    } else {
      clearTokens();
      window.location.href = '/login';
    }
  }

  return response;
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

// Helper to fetch all pages from paginated endpoints
const fetchAllPages = async (initialUrl: string): Promise<{ ok: boolean; data: unknown }> => {
  const allResults: unknown[] = [];
  let url = initialUrl;

  while (url) {
    const response = await apiFetch(url);
    if (!response.ok) return { ok: false, data: await response.json() };
    const data = await response.json();

    // If response is a direct array, return it
    if (Array.isArray(data)) {
      return { ok: true, data };
    }

    // If paginated, collect results
    if (data.results) {
      allResults.push(...data.results);
    }

    // Handle next page URL
    if (data.next) {
      url = data.next.replace(API_URL, '');
    } else {
      url = '';
    }
  }

  return { ok: true, data: allResults };
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
  checkAccount: async (email: string) => {
    const response = await fetch(`${API_URL}/users/check-account/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { ok: response.ok, data: await response.json() };
  },

  setInitialPassword: async (email: string, token: string, password: string, password_confirm: string) => {
    const response = await fetch(`${API_URL}/users/set-initial-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, password, password_confirm }),
    });
    const data = await response.json();
    if (response.ok && data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      setSuperuser(data.is_superuser || data.is_admin || false);
    }
    return { ok: response.ok, data };
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setTokens(data.access, data.refresh);
      setSuperuser(data.is_superuser || data.is_admin || false);
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

  confirmResetPassword: async (token: string, password: string, password_confirm: string) => {
    const response = await fetch(`${API_URL}/users/password-reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, password_confirm }),
    });
    const data = await response.json();
    if (response.ok && data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      setSuperuser(data.is_superuser || data.is_admin || false);
    }
    return { ok: response.ok, data };
  },

  getProfile: async () => {
    const response = await apiFetch('/users/profile/');
    const data = await response.json();
    if (response.ok) {
      const isAdmin = data.is_superuser || data.is_admin || false;
      setSuperuser(isAdmin);
    }
    return { ok: response.ok, data };
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

// Admin API (requires is_superuser)
export const adminApi = {
  // Users - /api/users/admin/
  getUsers: async (options?: {
    search?: string;
    page?: number;
    pageSize?: number;
    isAdmin?: boolean;
    isActive?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', String(options.page));
    if (options?.pageSize) params.append('page_size', String(options.pageSize));
    if (options?.search) params.append('search', options.search);
    if (options?.isAdmin !== undefined) params.append('is_admin', String(options.isAdmin));
    if (options?.isActive !== undefined) params.append('is_active', String(options.isActive));
    const query = params.toString();
    const response = await apiFetch(`/users/admin/${query ? `?${query}` : ''}`);
    return { ok: response.ok, data: await response.json() };
  },

  getUser: async (id: number) => {
    const response = await apiFetch(`/users/admin/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createUser: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    is_active?: boolean;
    is_superuser?: boolean;
  }) => {
    const response = await apiFetch('/users/admin/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateUser: async (id: number, userData: {
    email?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    is_active?: boolean;
    is_superuser?: boolean;
  }) => {
    const response = await apiFetch(`/users/admin/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteUser: async (id: number) => {
    const response = await apiFetch(`/users/admin/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Courses - /api/courses/admin/
  getCourses: async () => {
    return fetchAllPages('/courses/admin/');
  },

  getCourse: async (id: number) => {
    const response = await apiFetch(`/courses/admin/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createCourse: async (courseData: {
    title: string;
    slug: string;
    short_description?: string;
    description?: string;
    level?: string;
    duration_hours?: number;
    category_id?: number;
    is_featured?: boolean;
    is_published?: boolean;
  }, thumbnail?: File) => {
    const formData = new FormData();
    formData.append('title', courseData.title);
    formData.append('slug', courseData.slug);
    if (courseData.short_description) formData.append('short_description', courseData.short_description);
    if (courseData.description) formData.append('description', courseData.description);
    if (courseData.level) formData.append('level', courseData.level);
    if (courseData.duration_hours) formData.append('duration_hours', String(courseData.duration_hours));
    if (courseData.category_id) formData.append('category_id', String(courseData.category_id));
    formData.append('is_featured', String(courseData.is_featured || false));
    formData.append('is_published', String(courseData.is_published || false));
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiFetchFormData('/courses/admin/', formData, 'POST');
    return { ok: response.ok, data: await response.json() };
  },

  updateCourse: async (id: number, courseData: {
    title?: string;
    slug?: string;
    short_description?: string;
    description?: string;
    level?: string;
    duration_hours?: number;
    category_id?: number;
    is_featured?: boolean;
    is_published?: boolean;
  }, thumbnail?: File, deleteThumbnail?: boolean) => {
    const formData = new FormData();
    if (courseData.title) formData.append('title', courseData.title);
    if (courseData.slug) formData.append('slug', courseData.slug);
    if (courseData.short_description !== undefined) formData.append('short_description', courseData.short_description);
    if (courseData.description !== undefined) formData.append('description', courseData.description);
    if (courseData.level) formData.append('level', courseData.level);
    if (courseData.duration_hours) formData.append('duration_hours', String(courseData.duration_hours));
    if (courseData.category_id) formData.append('category_id', String(courseData.category_id));
    if (courseData.is_featured !== undefined) formData.append('is_featured', String(courseData.is_featured));
    if (courseData.is_published !== undefined) formData.append('is_published', String(courseData.is_published));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (deleteThumbnail) formData.append('delete_thumbnail', 'true');

    const response = await apiFetchFormData(`/courses/admin/${id}/`, formData, 'PUT');
    return { ok: response.ok, data: await response.json() };
  },

  deleteCourse: async (id: number) => {
    const response = await apiFetch(`/courses/admin/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Categories - /api/courses/admin/categories/
  getCategories: async () => {
    return fetchAllPages('/courses/admin/categories/');
  },

  getCategory: async (id: number) => {
    const response = await apiFetch(`/courses/admin/categories/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createCategory: async (categoryData: { name: string; slug: string; description?: string }) => {
    const response = await apiFetch('/courses/admin/categories/', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateCategory: async (id: number, categoryData: { name?: string; slug?: string; description?: string }) => {
    const response = await apiFetch(`/courses/admin/categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteCategory: async (id: number) => {
    const response = await apiFetch(`/courses/admin/categories/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Lessons - /api/courses/admin/lessons/
  getLessons: async (courseId?: number) => {
    const params = courseId ? `?course_id=${courseId}` : '';
    return fetchAllPages(`/courses/admin/lessons/${params}`);
  },

  getLesson: async (id: number) => {
    const response = await apiFetch(`/courses/admin/lessons/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createLesson: async (lessonData: {
    title: string;
    content?: string;
    course_id: number;
    order_index?: number;
  }, thumbnail?: File) => {
    const formData = new FormData();
    formData.append('title', lessonData.title);
    formData.append('course_id', String(lessonData.course_id));
    if (lessonData.content) formData.append('content', lessonData.content);
    if (lessonData.order_index) formData.append('order_index', String(lessonData.order_index));
    if (thumbnail) formData.append('thumbnail', thumbnail);

    const response = await apiFetchFormData('/courses/admin/lessons/', formData, 'POST');
    return { ok: response.ok, data: await response.json() };
  },

  updateLesson: async (id: number, lessonData: {
    title?: string;
    content?: string;
    course_id?: number;
    order_index?: number;
  }, thumbnail?: File, deleteThumbnail?: boolean) => {
    const formData = new FormData();
    if (lessonData.title) formData.append('title', lessonData.title);
    if (lessonData.content !== undefined) formData.append('content', lessonData.content);
    if (lessonData.course_id) formData.append('course_id', String(lessonData.course_id));
    if (lessonData.order_index) formData.append('order_index', String(lessonData.order_index));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (deleteThumbnail) formData.append('delete_thumbnail', 'true');

    const response = await apiFetchFormData(`/courses/admin/lessons/${id}/`, formData, 'PUT');
    return { ok: response.ok, data: await response.json() };
  },

  deleteLesson: async (id: number) => {
    const response = await apiFetch(`/courses/admin/lessons/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Topics - /api/courses/admin/topics/
  getTopics: async (courseId?: number, lessonId?: number) => {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', String(courseId));
    if (lessonId) params.append('lesson_id', String(lessonId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAllPages(`/courses/admin/topics/${query}`);
  },

  getTopic: async (id: number) => {
    const response = await apiFetch(`/courses/admin/topics/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createTopic: async (topicData: {
    title: string;
    content?: string;
    course_id: number;
    lesson_id: number;
    order_index?: number;
  }) => {
    const response = await apiFetch('/courses/admin/topics/', {
      method: 'POST',
      body: JSON.stringify(topicData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateTopic: async (id: number, topicData: {
    title?: string;
    content?: string;
    course_id?: number;
    lesson_id?: number;
    order_index?: number;
  }) => {
    const response = await apiFetch(`/courses/admin/topics/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(topicData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteTopic: async (id: number) => {
    const response = await apiFetch(`/courses/admin/topics/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Quizzes - /api/courses/admin/quizzes/
  getQuizzes: async (courseId?: number, lessonId?: number) => {
    const params = new URLSearchParams();
    if (courseId) params.append('course_id', String(courseId));
    if (lessonId) params.append('lesson_id', String(lessonId));
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAllPages(`/courses/admin/quizzes/${query}`);
  },

  getQuiz: async (id: number) => {
    const response = await apiFetch(`/courses/admin/quizzes/${id}/`);
    return { ok: response.ok, data: await response.json() };
  },

  createQuiz: async (quizData: {
    title: string;
    content?: string;
    course_id: number;
    lesson_id: number;
    order_index?: number;
  }) => {
    const response = await apiFetch('/courses/admin/quizzes/', {
      method: 'POST',
      body: JSON.stringify(quizData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateQuiz: async (id: number, quizData: {
    title?: string;
    content?: string;
    course_id?: number;
    lesson_id?: number;
    order_index?: number;
  }) => {
    const response = await apiFetch(`/courses/admin/quizzes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(quizData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteQuiz: async (id: number) => {
    const response = await apiFetch(`/courses/admin/quizzes/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },
};
