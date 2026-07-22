import { recordApi, type RecordedStep } from '../utils/actionRecorder';
import { needsProfileCompletion } from '../utils/profileOptions';

const API_URL = '/api';
export const MEDIA_URL = 'https://api.academy.wepropel.org';

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
  localStorage.removeItem('is_users_readonly');
  localStorage.removeItem('is_marketing_admin');
  localStorage.removeItem('profile_complete');
};

// Whether the signed-in user has filled the required profile fields
// (organization/type/country). Persisted so the App-level gate can block every
// route until a Google-registered user completes their profile, instead of
// relying on a one-time redirect they could click past. `null` = not yet known.
export const setProfileComplete = (complete: boolean) => {
  const v = complete ? 'true' : 'false';
  if (localStorage.getItem('profile_complete') === v) return;
  localStorage.setItem('profile_complete', v);
  window.dispatchEvent(new Event('profile-flag'));
};
export const getProfileComplete = (): boolean | null => {
  const v = localStorage.getItem('profile_complete');
  return v === null ? null : v === 'true';
};

// Superuser management
export const setSuperuser = (isSuperuser: boolean) => {
  localStorage.setItem('is_superuser', String(isSuperuser));
};
export const isSuperuser = () => localStorage.getItem('is_superuser') === 'true';

// Users-readonly role (can view /admin/usuarios only)
export const setUsersReadonly = (flag: boolean) => {
  localStorage.setItem('is_users_readonly', String(flag));
};
export const isUsersReadonly = () => localStorage.getItem('is_users_readonly') === 'true';

// Marketing admin role (can manage /admin/campaigns and /admin/analytics)
export const setMarketingAdmin = (flag: boolean) => {
  localStorage.setItem('is_marketing_admin', String(flag));
};
export const isMarketingAdmin = () => localStorage.getItem('is_marketing_admin') === 'true';

export const canAccessAdmin = () => isSuperuser() || isUsersReadonly() || isMarketingAdmin();

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
  recordApi(method, endpoint, response.status);

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
  recordApi(options.method || 'GET', endpoint, response.status);

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
      // Strip any absolute API URL prefix to get relative path
      url = data.next.replace(/^https?:\/\/[^/]+\/api/, '');
    } else {
      url = '';
    }
  }

  return { ok: true, data: allResults };
};

// Refresh token — singleton: concurrent 401s share one refresh attempt
let _refreshPromise: Promise<boolean> | null = null;
const refreshToken = async (): Promise<boolean> => {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
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
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
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
      setSuperuser(data.user?.is_admin || false);
      setUsersReadonly(data.user?.is_users_readonly || false);
      setMarketingAdmin(data.user?.is_marketing_admin || false);
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
      setUsersReadonly(data.is_users_readonly || false);
      setMarketingAdmin(data.is_marketing_admin || false);
    }
    return { ok: response.ok, data };
  },

  register: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
    organization?: string;
    organization_type?: string;
    country?: string;
    newsletter_opt_in?: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_page?: string;
  }) => {
    const response = await fetch(`${API_URL}/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  googleAuth: async (credential: string, extras?: {
    organization?: string;
    organization_type?: string;
    country?: string;
    newsletter_opt_in?: boolean;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_page?: string;
  }) => {
    const response = await fetch(`${API_URL}/users/google-auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, ...(extras || {}) }),
    });
    const data = await response.json();
    if (response.ok) {
      setTokens(data.access, data.refresh);
      setSuperuser(data.is_superuser || false);
      setUsersReadonly(data.is_users_readonly || false);
      setMarketingAdmin(data.is_marketing_admin || false);
      setProfileComplete(!needsProfileCompletion(data.user));
    }
    return { ok: response.ok, data };
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
      setSuperuser(data.user?.is_admin || false);
      setUsersReadonly(data.user?.is_users_readonly || false);
      setMarketingAdmin(data.user?.is_marketing_admin || false);
    }
    return { ok: response.ok, data };
  },

  resendVerification: async (email: string) => {
    const response = await fetch(`${API_URL}/users/resend-verification/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return { ok: response.ok, data: await response.json() };
  },

  autoLogin: async (token: string) => {
    const response = await fetch(`${API_URL}/users/auto-login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    if (response.ok && data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      setSuperuser(data.user?.is_admin || false);
      setUsersReadonly(data.user?.is_users_readonly || false);
      setMarketingAdmin(data.user?.is_marketing_admin || false);
    }
    return { ok: response.ok, data };
  },

  getProfile: async () => {
    const response = await apiFetch('/users/profile/');
    const data = await response.json();
    if (response.ok) {
      const isAdmin = data.is_superuser || data.is_admin || false;
      setSuperuser(isAdmin);
      setUsersReadonly(data.is_users_readonly || false);
      setMarketingAdmin(data.is_marketing_admin || false);
      setProfileComplete(!needsProfileCompletion(data));
    }
    return { ok: response.ok, data };
  },

  updateProfile: async (profileData: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    bio?: string;
    organization?: string;
    organization_type?: string;
    country?: string;
    job_title?: string;
    phone?: string;
    newsletter_opt_in?: boolean;
    goal_hours_per_week?: string;
    goal_courses_per_month?: string;
    goal_categories?: string[];
  }) => {
    const response = await apiFetch('/users/profile/', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiFetchFormData('/users/profile/avatar/', formData);
    return { ok: response.ok, data: await response.json() };
  },

  setAvatarPreset: async (preset: string) => {
    const response = await apiFetch('/users/profile/avatar/', {
      method: 'POST',
      body: JSON.stringify({ preset }),
    });
    return { ok: response.ok, data: await response.json() };
  },

  changePassword: async (current_password: string, new_password: string, new_password_confirm: string) => {
    const response = await apiFetch('/users/change-password/', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password, new_password_confirm }),
    });
    const data = await response.json();
    if (response.ok && data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
    }
    return { ok: response.ok, data };
  },

  logout: () => {
    clearTokens();
    window.location.replace('https://propelacademy.org/');
  },
};

// Short-lived cache of `/courses/<slug>/` so hover-prefetch warms the data that
// the preview modal, course detail, and learner pages all load via getBySlug.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CourseBySlugResult = { ok: boolean; data: any };
const COURSE_BY_SLUG_TTL = 60_000;
const courseBySlugCache = new Map<string, { ts: number; promise: Promise<CourseBySlugResult> }>();

const cloneCourseResult = (r: CourseBySlugResult): CourseBySlugResult => {
  // Return a fresh copy so callers that mutate `.data` (e.g. is_enrolled) don't
  // corrupt the shared cached object.
  try {
    return { ok: r.ok, data: structuredClone(r.data) };
  } catch {
    return { ok: r.ok, data: r.data };
  }
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

  getBySlug: async (slug: string): Promise<CourseBySlugResult> => {
    const cached = courseBySlugCache.get(slug);
    if (cached && Date.now() - cached.ts < COURSE_BY_SLUG_TTL) {
      return cloneCourseResult(await cached.promise);
    }
    const promise = (async () => {
      const response = await apiFetch(`/courses/${slug}/`);
      return { ok: response.ok, data: await response.json() };
    })();
    courseBySlugCache.set(slug, { ts: Date.now(), promise });
    // Don't cache failures — evict so the next call retries.
    promise.then((r) => { if (!r.ok) courseBySlugCache.delete(slug); }).catch(() => courseBySlugCache.delete(slug));
    return cloneCourseResult(await promise);
  },

  // Fire-and-forget warm-up for hover/focus on a course card.
  prefetchBySlug: (slug: string) => {
    const cached = courseBySlugCache.get(slug);
    if (cached && Date.now() - cached.ts < COURSE_BY_SLUG_TTL) return;
    coursesApi.getBySlug(slug).catch(() => {});
  },

  getCategories: async () => {
    const response = await apiFetch('/courses/categories/');
    return { ok: response.ok, data: await response.json() };
  },

  enroll: async (slug: string, attribution?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_page?: string;
  }) => {
    const response = await apiFetch(`/courses/${slug}/enroll/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attribution || {}),
    });
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

  getCourseProgress: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/progress/`);
    return { ok: response.ok, data: await response.json() };
  },

  markLessonComplete: async (lessonId: number) => {
    const response = await apiFetch(`/courses/lessons/${lessonId}/complete/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },

  markTopicComplete: async (topicId: number) => {
    const response = await apiFetch(`/courses/topics/${topicId}/complete/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },

  // Evaluations
  getEvaluationForm: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/evaluation/`);
    return { ok: response.ok, data: await response.json() };
  },

  getEvaluationStatus: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/evaluation/status/`);
    return { ok: response.ok, data: await response.json() };
  },

  submitEvaluation: async (slug: string, answers: { question_id: number; value: string }[]) => {
    const response = await apiFetch(`/courses/${slug}/evaluation/submit/`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return { ok: response.ok, data: await response.json() };
  },

  getNextCourse: async (slug: string) => {
    const response = await apiFetch(`/courses/${slug}/next-course/`);
    return { ok: response.ok, data: await response.json() };
  },

  downloadCertificate: async (slug: string) => {
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_URL}/courses/${slug}/certificate/`, { headers });

    if (response.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getToken()}`;
        response = await fetch(`${API_URL}/courses/${slug}/certificate/`, { headers });
      } else {
        clearTokens();
        window.location.href = '/login';
        return;
      }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, detail: data.detail as string | undefined };
    }

    const blob = await response.blob();
    triggerBlobDownload(blob, `certificado-${slug}.pdf`);
    return { ok: true };
  },
};

export const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Check if user is authenticated
export const isAuthenticated = () => !!getToken();

// Admin API (requires is_superuser)
export const adminApi = {
  // Debug report - /api/users/debug-report/
  sendDebugReport: async (description: string, steps: RecordedStep[]) => {
    const response = await apiFetch('/users/debug-report/', {
      method: 'POST',
      body: JSON.stringify({
        description,
        steps,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      }),
    });
    return { ok: response.ok, data: await response.json() };
  },

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

  getAllUsers: async () => {
    return fetchAllPages('/users/admin/?page_size=100');
  },

  createUser: async (userData: {
    email: string;
    first_name: string;
    last_name: string;
    password?: string;
    display_name?: string;
    avatar?: string | null;
    bio?: string;
    organization?: string;
    organization_type?: string;
    country?: string;
    email_verified?: boolean;
    is_active?: boolean;
    is_staff?: boolean;
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
    display_name?: string;
    avatar?: string | null;
    bio?: string;
    organization?: string;
    organization_type?: string;
    country?: string;
    email_verified?: boolean;
    is_active?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
  }) => {
    const response = await apiFetch(`/users/admin/${id}/`, {
      method: 'PATCH',
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
    subtitle?: string;
    level?: string;
    duration_hours?: number;
    price?: string;
    price_type?: string;
    category_id?: number;
    tag_ids?: number[];
    instructor?: string;
    instructor_title?: string;
    instructor_bio?: string;
    is_featured?: boolean;
    is_published?: boolean;
  }, thumbnail?: File, instructorAvatar?: File) => {
    const formData = new FormData();
    formData.append('title', courseData.title);
    formData.append('slug', courseData.slug);
    if (courseData.short_description) formData.append('short_description', courseData.short_description);
    if (courseData.description) formData.append('description', courseData.description);
    if (courseData.subtitle) formData.append('subtitle', courseData.subtitle);
    if (courseData.level) formData.append('level', courseData.level);
    if (courseData.duration_hours) formData.append('duration_hours', String(courseData.duration_hours));
    if (courseData.price) formData.append('price', courseData.price);
    if (courseData.price_type) formData.append('price_type', courseData.price_type);
    if (courseData.category_id) formData.append('category_id', String(courseData.category_id));
    if (courseData.tag_ids) {
      for (const id of courseData.tag_ids) formData.append('tag_ids', String(id));
    }
    if (courseData.instructor) formData.append('instructor', courseData.instructor);
    if (courseData.instructor_title) formData.append('instructor_title', courseData.instructor_title);
    if (courseData.instructor_bio) formData.append('instructor_bio', courseData.instructor_bio);
    formData.append('is_featured', String(courseData.is_featured || false));
    formData.append('is_published', String(courseData.is_published || false));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (instructorAvatar) formData.append('instructor_avatar', instructorAvatar);

    const response = await apiFetchFormData('/courses/admin/', formData, 'POST');
    let data;
    try { data = await response.json(); } catch { data = { detail: `Error del servidor (${response.status})` }; }
    return { ok: response.ok, data };
  },

  updateCourse: async (id: number, courseData: {
    title?: string;
    slug?: string;
    short_description?: string;
    description?: string;
    subtitle?: string;
    level?: string;
    duration_hours?: number;
    price?: string;
    price_type?: string;
    category_id?: number;
    tag_ids?: number[];
    instructor?: string;
    instructor_title?: string;
    instructor_bio?: string;
    is_featured?: boolean;
    is_published?: boolean;
  }, thumbnail?: File, deleteThumbnail?: boolean, instructorAvatar?: File) => {
    const formData = new FormData();
    if (courseData.title) formData.append('title', courseData.title);
    if (courseData.slug) formData.append('slug', courseData.slug);
    if (courseData.short_description !== undefined) formData.append('short_description', courseData.short_description);
    if (courseData.description !== undefined) formData.append('description', courseData.description);
    if (courseData.subtitle !== undefined) formData.append('subtitle', courseData.subtitle);
    if (courseData.level) formData.append('level', courseData.level);
    if (courseData.duration_hours) formData.append('duration_hours', String(courseData.duration_hours));
    if (courseData.price !== undefined) formData.append('price', courseData.price);
    if (courseData.price_type) formData.append('price_type', courseData.price_type);
    if (courseData.category_id) formData.append('category_id', String(courseData.category_id));
    if (courseData.tag_ids) {
      for (const id of courseData.tag_ids) formData.append('tag_ids', String(id));
    }
    if (courseData.instructor !== undefined) formData.append('instructor', courseData.instructor);
    if (courseData.instructor_title !== undefined) formData.append('instructor_title', courseData.instructor_title);
    if (courseData.instructor_bio !== undefined) formData.append('instructor_bio', courseData.instructor_bio);
    if (courseData.is_featured !== undefined) formData.append('is_featured', String(courseData.is_featured));
    if (courseData.is_published !== undefined) formData.append('is_published', String(courseData.is_published));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (deleteThumbnail) formData.append('delete_thumbnail', 'true');
    if (instructorAvatar) formData.append('instructor_avatar', instructorAvatar);

    const response = await apiFetchFormData(`/courses/admin/${id}/`, formData, 'PUT');
    let data;
    try { data = await response.json(); } catch { data = { detail: `Error del servidor (${response.status})` }; }
    return { ok: response.ok, data };
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

  // Tags - /api/courses/admin/tags/
  getTags: async () => {
    return fetchAllPages('/courses/admin/tags/');
  },

  createTag: async (data: { name: string; slug: string; aliases?: string }) => {
    const response = await apiFetch('/courses/admin/tags/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateTag: async (id: number, data: { name?: string; slug?: string; aliases?: string }) => {
    const response = await apiFetch(`/courses/admin/tags/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteTag: async (id: number) => {
    const response = await apiFetch(`/courses/admin/tags/${id}/`, {
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
    video_url?: string;
    course_id: number;
    order_index?: number;
  }, thumbnail?: File, videoFile?: File) => {
    const formData = new FormData();
    formData.append('title', lessonData.title);
    formData.append('course_id', String(lessonData.course_id));
    if (lessonData.content) formData.append('content', lessonData.content);
    if (lessonData.video_url) formData.append('video_url', lessonData.video_url);
    if (lessonData.order_index) formData.append('order_index', String(lessonData.order_index));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (videoFile) formData.append('video_file', videoFile);

    const response = await apiFetchFormData('/courses/admin/lessons/', formData, 'POST');
    return { ok: response.ok, data: await response.json() };
  },

  updateLesson: async (id: number, lessonData: {
    title?: string;
    content?: string;
    video_url?: string;
    course_id?: number;
    order_index?: number;
  }, thumbnail?: File, deleteThumbnail?: boolean, videoFile?: File) => {
    const formData = new FormData();
    if (lessonData.title) formData.append('title', lessonData.title);
    if (lessonData.content !== undefined) formData.append('content', lessonData.content);
    if (lessonData.video_url !== undefined) formData.append('video_url', lessonData.video_url);
    if (lessonData.course_id) formData.append('course_id', String(lessonData.course_id));
    if (lessonData.order_index) formData.append('order_index', String(lessonData.order_index));
    if (thumbnail) formData.append('thumbnail', thumbnail);
    if (deleteThumbnail) formData.append('delete_thumbnail', 'true');
    if (videoFile) formData.append('video_file', videoFile);

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
    video_url?: string;
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
    video_url?: string;
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

  // Resources - /api/courses/admin/resources/
  getResources: async (lessonId?: number) => {
    const params = lessonId ? `?lesson_id=${lessonId}` : '';
    return fetchAllPages(`/courses/admin/resources/${params}`);
  },

  createResource: async (resourceData: {
    lesson_id: number;
    title: string;
    resource_type?: string;
    file_url?: string;
  }, file?: File) => {
    const formData = new FormData();
    formData.append('lesson_id', String(resourceData.lesson_id));
    formData.append('title', resourceData.title);
    if (resourceData.resource_type) formData.append('resource_type', resourceData.resource_type);
    if (file) formData.append('file', file);
    if (resourceData.file_url) formData.append('file_url', resourceData.file_url);

    const response = await apiFetchFormData('/courses/admin/resources/', formData, 'POST');
    return { ok: response.ok, data: await response.json() };
  },

  updateResource: async (id: number, resourceData: {
    lesson_id?: number;
    title?: string;
    resource_type?: string;
    file_url?: string;
  }, file?: File) => {
    const formData = new FormData();
    if (resourceData.lesson_id) formData.append('lesson_id', String(resourceData.lesson_id));
    if (resourceData.title) formData.append('title', resourceData.title);
    if (resourceData.resource_type) formData.append('resource_type', resourceData.resource_type);
    if (file) formData.append('file', file);
    if (resourceData.file_url) formData.append('file_url', resourceData.file_url);

    const response = await apiFetchFormData(`/courses/admin/resources/${id}/`, formData, 'PUT');
    return { ok: response.ok, data: await response.json() };
  },

  deleteResource: async (id: number) => {
    const response = await apiFetch(`/courses/admin/resources/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Course Resources
  getCourseResources: async (courseId?: number) => {
    const params = courseId ? `?course_id=${courseId}` : '';
    return fetchAllPages(`/courses/admin/course-resources/${params}`);
  },

  createCourseResource: async (resourceData: {
    course_id: number;
    title: string;
    resource_type?: string;
    file_url?: string;
    order_index?: number;
  }, file?: File) => {
    const formData = new FormData();
    formData.append('course_id', String(resourceData.course_id));
    formData.append('title', resourceData.title);
    if (resourceData.resource_type) formData.append('resource_type', resourceData.resource_type);
    if (file) formData.append('file', file);
    if (resourceData.file_url) formData.append('file_url', resourceData.file_url);
    if (resourceData.order_index !== undefined) formData.append('order_index', String(resourceData.order_index));
    const response = await apiFetchFormData('/courses/admin/course-resources/', formData, 'POST');
    return { ok: response.ok, data: await response.json() };
  },

  updateCourseResource: async (id: number, resourceData: {
    course_id?: number;
    title?: string;
    resource_type?: string;
    file_url?: string;
    order_index?: number;
  }, file?: File) => {
    const formData = new FormData();
    if (resourceData.course_id) formData.append('course_id', String(resourceData.course_id));
    if (resourceData.title) formData.append('title', resourceData.title);
    if (resourceData.resource_type) formData.append('resource_type', resourceData.resource_type);
    if (file) formData.append('file', file);
    if (resourceData.file_url) formData.append('file_url', resourceData.file_url);
    if (resourceData.order_index !== undefined) formData.append('order_index', String(resourceData.order_index));
    const response = await apiFetchFormData(`/courses/admin/course-resources/${id}/`, formData, 'PUT');
    return { ok: response.ok, data: await response.json() };
  },

  deleteCourseResource: async (id: number) => {
    const response = await apiFetch(`/courses/admin/course-resources/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Evaluations - /api/courses/admin/evaluations/
  getEvaluationForms: async (courseId?: number) => {
    const params = courseId ? `?course_id=${courseId}` : '';
    return fetchAllPages(`/courses/admin/evaluations/${params}`);
  },

  createEvaluationForm: async (formData: {
    course_id: number;
    title: string;
    description?: string;
    is_active?: boolean;
  }) => {
    const response = await apiFetch('/courses/admin/evaluations/', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateEvaluationForm: async (id: number, formData: {
    title?: string;
    description?: string;
    is_active?: boolean;
    course_id?: number;
  }) => {
    const response = await apiFetch(`/courses/admin/evaluations/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteEvaluationForm: async (id: number) => {
    const response = await apiFetch(`/courses/admin/evaluations/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Evaluation Questions
  getEvaluationQuestions: async (formId?: number) => {
    const params = formId ? `?form_id=${formId}` : '';
    return fetchAllPages(`/courses/admin/evaluation-questions/${params}`);
  },

  createEvaluationQuestion: async (questionData: {
    form_id: number;
    question_text: string;
    question_type: string;
    options?: string[];
    is_required?: boolean;
    order_index?: number;
  }) => {
    const response = await apiFetch('/courses/admin/evaluation-questions/', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  updateEvaluationQuestion: async (id: number, questionData: {
    form_id?: number;
    question_text?: string;
    question_type?: string;
    options?: string[];
    is_required?: boolean;
    order_index?: number;
  }) => {
    const response = await apiFetch(`/courses/admin/evaluation-questions/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(questionData),
    });
    return { ok: response.ok, data: await response.json() };
  },

  deleteEvaluationQuestion: async (id: number) => {
    const response = await apiFetch(`/courses/admin/evaluation-questions/${id}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },

  // Evaluation Responses/Stats
  getEvaluationResponses: async (formId: number) => {
    const response = await apiFetch(`/courses/admin/evaluations/${formId}/responses/`);
    return { ok: response.ok, data: await response.json() };
  },

  // ---- Marketing / Campaigns ----
  listCampaigns: async () => {
    const response = await apiFetch('/marketing/campaigns/');
    return { ok: response.ok, data: await response.json() };
  },
  createCampaign: async (payload: {
    name: string;
    utm_source: string;
    utm_medium?: string;
    utm_campaign: string;
    utm_term?: string;
    utm_content?: string;
    target_path?: string;
    notes?: string;
  }) => {
    const response = await apiFetch('/marketing/campaigns/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  updateCampaign: async (id: number, payload: Partial<{
    name: string;
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
    target_path: string;
    notes: string;
  }>) => {
    const response = await apiFetch(`/marketing/campaigns/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  deleteCampaign: async (id: number) => {
    const response = await apiFetch(`/marketing/campaigns/${id}/`, { method: 'DELETE' });
    return { ok: response.ok, data: response.ok ? null : await response.json() };
  },
  getUtmStats: async (params?: { start?: string; end?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.append('start', params.start);
    if (params?.end) qs.append('end', params.end);
    if (params?.limit) qs.append('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    const response = await apiFetch(`/marketing/utm-stats/${suffix}`);
    return { ok: response.ok, data: await response.json() };
  },

  // Workshops - /api/workshops/admin/<slug>/
  getWorkshops: async () => {
    const response = await apiFetch('/workshops/admin/');
    return { ok: response.ok, data: await response.json() };
  },

  createWorkshop: async (data: {
    name: string;
    slug: string;
    event_date: string; // ISO 8601
    zoom_meeting_id?: string;
    certification_name?: string;
    description?: string;
  }) => {
    const response = await apiFetch('/workshops/admin/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  getWorkshopRegistrations: async (slug: string, stage?: number) => {
    const suffix = stage ? `?stage=${stage}` : '';
    const response = await apiFetch(`/workshops/admin/${slug}/registrations/${suffix}`);
    return { ok: response.ok, data: await response.json() };
  },

  getWorkshopStats: async (slug: string) => {
    const response = await apiFetch(`/workshops/admin/${slug}/stats/`);
    return { ok: response.ok, data: await response.json() };
  },

  // Live Zoom participant list (who actually joined the meeting), reconciled
  // against registrations. Pulled on demand from the Zoom API.
  getWorkshopZoomAttendance: async (slug: string) => {
    const response = await apiFetch(`/workshops/admin/${slug}/zoom-attendance/`);
    return { ok: response.ok, data: await response.json() };
  },

  // Ruta de aprendizaje (ordered courses on a workshop's certification path)
  getWorkshopPath: async (slug: string) => {
    const response = await apiFetch(`/workshops/admin/${slug}/path/`);
    return { ok: response.ok, data: await response.json() };
  },

  addWorkshopPathCourse: async (slug: string, courseId: number) => {
    const response = await apiFetch(`/workshops/admin/${slug}/path/`, {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId }),
    });
    return { ok: response.ok, data: response.status === 204 ? null : await response.json().catch(() => null) };
  },

  removeWorkshopPathCourse: async (slug: string, courseId: number) => {
    const response = await apiFetch(`/workshops/admin/${slug}/path/${courseId}/`, {
      method: 'DELETE',
    });
    return { ok: response.ok };
  },

  reorderWorkshopPath: async (slug: string, courseIds: number[]) => {
    const response = await apiFetch(`/workshops/admin/${slug}/path/reorder/`, {
      method: 'PATCH',
      body: JSON.stringify({ course_ids: courseIds }),
    });
    return { ok: response.ok };
  },

  // Set or clear (releaseDate=null) the Fecha shown on a ruta card.
  setWorkshopPathDate: async (slug: string, courseId: number, releaseDate: string | null) => {
    const response = await apiFetch(`/workshops/admin/${slug}/path/${courseId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ release_date: releaseDate }),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  setWorkshopAttendance: async (slug: string, registrationId: number, attended: boolean) => {
    const response = await apiFetch(`/workshops/admin/${slug}/registrations/${registrationId}/attendance/`, {
      method: 'PATCH',
      body: JSON.stringify({ attended }),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  // Campaign email checklist (cronograma de señales) of a workshop ruta.
  getWorkshopJourney: async (slug: string): Promise<{ ok: boolean; data: { journey_steps: TrackJourneyStep[] } }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/`);
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  setWorkshopJourney: async (slug: string, steps: TrackJourneyStep[]): Promise<{ ok: boolean; data: { journey_steps: TrackJourneyStep[] } }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/`, {
      method: 'PUT',
      body: JSON.stringify({ journey_steps: steps }),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  // Platform sending of a journey señal: recipient preview, test send to the
  // requesting admin, and batched real sends (POST until pending is 0).
  getWorkshopJourneyRecipients: async (slug: string, stepId: string): Promise<{ ok: boolean; data: JourneySendPreview }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/${stepId}/send/`);
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  sendWorkshopJourneyTest: async (slug: string, stepId: string): Promise<{ ok: boolean; data: { detail: string } }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/${stepId}/send/`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  sendWorkshopJourneyBatch: async (slug: string, stepId: string): Promise<{ ok: boolean; data: JourneySendResult }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/${stepId}/send/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  },

  // Mailchimp-ready CSV of a señal's audience (Tags column = mailchimp_tag).
  downloadWorkshopJourneyCsv: async (slug: string, stepId: string): Promise<{ ok: boolean; blob: Blob | null }> => {
    const response = await apiFetch(`/workshops/admin/${slug}/journey/${stepId}/csv/`);
    return { ok: response.ok, blob: response.ok ? await response.blob() : null };
  },
};

export interface JourneySendPreview {
  audience_label: string;
  total: number;
  already_sent: number;
  pending: number;
}

export interface JourneySendResult {
  sent: number;
  failed: number;
  pending: number;
  already_sent: number;
  total: number;
}


// Tracks API (certification paths)
export interface TrackCourse {
  course_id: number;
  title: string;
  slug: string;
  short_description: string;
  subtitle: string;
  duration_display: string;
  thumbnail_url: string | null;
  order_index: number;
  deadline_label: string;
  is_enrolled: boolean;
  is_completed: boolean;
  is_locked: boolean;
  progress: number;
  // Optional override for the card link; defaults to `/courses/${slug}` in
  // TrackHero. Used for non-course steps like a workshop event whose card
  // should point at the landing page rather than a non-existent course route.
  href?: string;
}

// One signal of the campaign journey checklist (admin-only field on Track).
export interface TrackJourneyStep {
  id: string;
  kind: 'auto' | 'manual' | 'milestone';
  date_label: string;
  title: string;
  audience: string;
  mounted: boolean; // ¿Montado en Mailchimp?
  sent: boolean; // ¿Enviado?
  // Platform audience (optional). With audience_key set, the señal can export
  // its recipient list as a Mailchimp CSV (mailchimp_tag fills the Tags
  // column) and — if subject/body are also set — send from the platform.
  // Subject/body/cta_url accept {{ user_name }}, {{ workshop_name }},
  // {{ zoom_join_url }} variables.
  audience_key?: string;
  mailchimp_tag?: string;
  subject?: string;
  body?: string;
  cta_label?: string;
  cta_url?: string;
}

export interface Track {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  cta_heading: string;
  description: string;
  is_published: boolean;
  is_featured: boolean;
  completed_count: number;
  total_count: number;
  courses: TrackCourse[];
  certificate_template_url: string | null;
  medal_image_url: string | null;
  cert_name_x: number;
  cert_name_y: number;
  cert_name_font_size: number;
  cert_name_color: string;
  completion_email_subject: string;
  completion_email_body: string;
  journey_steps?: TrackJourneyStep[]; // only present on admin endpoints
}

export interface TrackWritePayload {
  name: string;
  slug?: string;
  subtitle?: string;
  cta_heading?: string;
  description?: string;
  is_published?: boolean;
  is_featured?: boolean;
  journey_steps?: TrackJourneyStep[];
}

export type TrackEmailTrigger = 'track_enrolled' | 'course_completed' | 'course_inactive' | 'track_completed';

export interface TrackEmail {
  id: number;
  trigger: TrackEmailTrigger;
  course: number | null;
  course_title: string | null;
  days_after: number;
  name: string;
  subject: string;
  body: string;
  cta_label: string;
  is_active: boolean;
  sent_count: number;
  updated_at: string;
}

export type TrackEmailPayload = Omit<TrackEmail, 'id' | 'course_title' | 'sent_count' | 'updated_at'>;

export const tracksApi = {
  getFeatured: async (): Promise<{ ok: boolean; data: Track | null }> => {
    const response = await apiFetch('/courses/tracks/featured/');
    return { ok: response.ok, data: await response.json() };
  },
  getBySlug: async (slug: string): Promise<{ ok: boolean; data: Track }> => {
    const response = await apiFetch(`/courses/tracks/${slug}/`);
    return { ok: response.ok, data: await response.json() };
  },
  getEngagement: async (slug: string) => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/engagement/`);
    return { ok: response.ok, data: await response.json() };
  },
  downloadEngagementCsv: async (slug: string, completed: number | 'all'): Promise<{ ok: boolean; blob: Blob | null }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/engagement/csv/?completed=${completed}`);
    return { ok: response.ok, blob: response.ok ? await response.blob() : null };
  },
  listAdmin: async (): Promise<{ ok: boolean; data: Track[] }> => {
    const response = await apiFetch('/courses/admin/tracks/');
    return { ok: response.ok, data: await response.json() };
  },
  enroll: async (slug: string) => {
    const response = await apiFetch(`/courses/tracks/${slug}/enroll/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },
  certificateUrl: (slug: string) => `${API_URL}/courses/tracks/${slug}/certificate/`,
  updateConfig: async (slug: string, formData: FormData) => {
    const response = await apiFetchFormData(`/courses/admin/tracks/${slug}/config/`, formData, 'PATCH');
    return { ok: response.ok, data: await response.json() };
  },
  createTrack: async (payload: TrackWritePayload): Promise<{ ok: boolean; data: Track }> => {
    const response = await apiFetch('/courses/admin/tracks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  updateTrack: async (slug: string, payload: Partial<TrackWritePayload>): Promise<{ ok: boolean; data: Track }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/manage/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  deleteTrack: async (slug: string) => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/manage/`, { method: 'DELETE' });
    return { ok: response.ok };
  },
  setCourses: async (
    slug: string,
    courses: { course_id: number; deadline_label?: string }[],
  ): Promise<{ ok: boolean; data: Track }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/courses/`, {
      method: 'PUT',
      body: JSON.stringify({ courses }),
    });
    return { ok: response.ok, data: await response.json() };
  },
  listEmails: async (slug: string): Promise<{ ok: boolean; data: TrackEmail[] }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/emails/`);
    return { ok: response.ok, data: await response.json() };
  },
  createEmail: async (slug: string, payload: TrackEmailPayload): Promise<{ ok: boolean; data: TrackEmail }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/emails/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  updateEmail: async (slug: string, id: number, payload: Partial<TrackEmailPayload>): Promise<{ ok: boolean; data: TrackEmail }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/emails/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  deleteEmail: async (slug: string, id: number) => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/emails/${id}/`, { method: 'DELETE' });
    return { ok: response.ok };
  },
  testEmail: async (slug: string, id: number): Promise<{ ok: boolean; data: { detail: string } }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/emails/${id}/test/`, { method: 'POST' });
    return { ok: response.ok, data: await response.json() };
  },
  listMailchimpTemplates: async (): Promise<{ ok: boolean; data: MailchimpTemplate[] }> => {
    const response = await apiFetch('/courses/admin/mailchimp/templates/');
    return { ok: response.ok, data: response.ok ? await response.json() : [] };
  },
  previewMailchimpTemplate: async (id: number): Promise<{ ok: boolean; data: MailchimpTemplateContent }> => {
    const response = await apiFetch(`/courses/admin/mailchimp/templates/${id}/content/`);
    return { ok: response.ok, data: await response.json() };
  },
  listMilestoneTemplates: async (slug: string): Promise<{ ok: boolean; data: MilestoneTemplate[] }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/milestone-templates/`);
    return { ok: response.ok, data: response.ok ? await response.json() : [] };
  },
  setMilestoneTemplate: async (
    slug: string,
    payload: { milestone: string; template_id: number; template_name?: string },
  ): Promise<{ ok: boolean; data: MilestoneTemplate }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/milestone-templates/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  mailchimpPreview: async (slug: string, bucket: number | 'all'): Promise<{ ok: boolean; data: MailchimpPreview }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/mailchimp/preview/`, {
      method: 'POST',
      body: JSON.stringify({ bucket }),
    });
    return { ok: response.ok, data: await response.json() };
  },
  mailchimpPrepare: async (
    slug: string,
    payload: { bucket: number | 'all'; template_id: number; subject: string; include_new?: boolean },
  ): Promise<{ ok: boolean; data: MailchimpPrepare }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/mailchimp/prepare/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, data: await response.json() };
  },
  mailchimpSend: async (slug: string, campaignId: string): Promise<{ ok: boolean; data: { detail: string } }> => {
    const response = await apiFetch(`/courses/admin/tracks/${slug}/mailchimp/send/`, {
      method: 'POST',
      body: JSON.stringify({ campaign_id: campaignId }),
    });
    return { ok: response.ok, data: await response.json() };
  },
};

export interface MailchimpTemplate {
  id: number;
  name: string;
}

export interface MailchimpTemplateContent {
  html: string;
  plain_text: string;
  mailchimp_url?: string;
  detail?: string;
}

export interface MilestoneTemplate {
  milestone: string;
  template_id: number | null;
  template_name: string;
}

export interface MailchimpPreview {
  total: number;
  in_audience: number;
  not_in_audience: number;
  detail?: string;
}

export interface MailchimpPrepare {
  campaign_id?: string;
  web_id?: number;
  archive_url?: string;
  recipients?: number;
  not_in_audience?: number;
  included_new?: boolean;
  test_sent_to?: string;
  detail?: string;
}

export interface TrackEngagement {
  track: { slug: string; name: string };
  total_courses: number;
  enrolled_users: number;
  buckets: Record<string, number>;
}

export interface WorkshopRoute {
  workshop: {
    slug: string;
    name: string;
    event_date: string;
    certification_name: string;
    zoom_join_url: string | null;
    attended: boolean;
    attended_at: string | null;
  };
  courses: {
    id: number;
    slug: string;
    title: string;
    subtitle: string;
    thumbnail_url: string;
    enrolled: boolean;
    progress: number;
    completed: boolean;
  }[];
  certificate_issued_at: string | null;
}

export const workshopsApi = {
  // Authenticated user's rutas de aprendizaje for the dashboard.
  getMyRoutes: async (): Promise<{ ok: boolean; data: WorkshopRoute[] }> => {
    const response = await apiFetch('/workshops/my-routes/');
    return { ok: response.ok, data: await response.json() };
  },
};
