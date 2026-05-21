import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, authApi, adminApi } from '../../services/api';

// ---- Exported types ----

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  avatar?: string | null;
  bio?: string;
  organization?: string;
  organization_type?: string;
  country?: string;
  email_verified?: boolean;
  is_active: boolean;
  is_staff?: boolean;
  is_superuser: boolean;
  is_users_readonly?: boolean;
  date_joined?: string;
  last_login?: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  aliases?: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  subtitle: string;
  level: string;
  duration_hours: number;
  price: string;
  price_type: string;
  category: Category | null;
  tags?: Tag[];
  instructor: string;
  instructor_title: string;
  instructor_bio: string;
  instructor_avatar?: string;
  is_featured: boolean;
  is_published: boolean;
  seo_title?: string;
  seo_description?: string;
  seo_image_url?: string;
  thumbnail?: string;
  lessons_count?: number;
  enrollments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Lesson {
  id: number;
  title: string;
  content: string;
  video_url?: string;
  course_id: number;
  course?: Course;
  order_index: number;
  thumbnail?: string;
}

export interface Topic {
  id: number;
  title: string;
  content: string;
  video_url?: string;
  course_id: number;
  lesson_id: number;
  course?: Course;
  lesson?: Lesson;
  order_index: number;
}

export interface Quiz {
  id: number;
  title: string;
  content: string;
  course_id: number;
  lesson_id: number;
  course?: Course;
  lesson?: Lesson;
  order_index: number;
}

export interface Resource {
  id: number;
  title: string;
  resource_type: string;
  lesson_id: number;
  file: string;
  file_url: string;
  file_size: number;
}

export interface CourseResource {
  id: number;
  title: string;
  resource_type: string;
  course_id: number;
  file: string;
  file_url: string;
  file_size: number;
  order_index: number;
}

// ---- Context value ----

interface AdminContextValue {
  courses: Course[];
  categories: Category[];
  tags: Tag[];
  lessons: Lesson[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setLessons: React.Dispatch<React.SetStateAction<Lesson[]>>;
  loading: boolean;
  refreshAll: () => Promise<void>;
  getCourseName: (id: number) => string;
  getLessonName: (id: number) => string;
  getLessonsForCourse: (courseId: number) => Lesson[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  success: string;
  error: string;
  clearMessages: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

// ---- Helpers ----

const extractArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results)) {
    return (data as { results: unknown[] }).results;
  }
  return [];
};

// ---- Provider ----

export function AdminProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setError('');
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    setSuccess('');
  }, []);

  const clearMessages = useCallback(() => {
    setSuccess('');
    setError('');
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, categoriesRes, lessonsRes, tagsRes] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getCategories(),
        adminApi.getLessons(),
        adminApi.getTags(),
      ]);

      if (coursesRes.ok) setCourses(extractArray(coursesRes.data) as Course[]);
      if (categoriesRes.ok) setCategories(extractArray(categoriesRes.data) as Category[]);
      if (lessonsRes.ok) setLessons(extractArray(lessonsRes.data) as Lesson[]);
      if (tagsRes.ok) setTags(extractArray(tagsRes.data) as Tag[]);
    } catch {
      showError('Error al cargar los datos del panel de administracion.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Auth check + initial data load — verify superuser from backend, not localStorage
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    authApi.getProfile().then(({ ok, data }) => {
      const profile = data as { is_superuser?: boolean; is_admin?: boolean };
      if (!ok || !(profile.is_admin || profile.is_superuser)) {
        navigate('/');
        return;
      }
      refreshAll();
    });
  }, [navigate, refreshAll]);

  // Helper functions
  const getCourseName = useCallback(
    (id: number): string => {
      const course = courses.find((c) => c.id === id);
      return course ? course.title : `Curso #${id}`;
    },
    [courses],
  );

  const getLessonName = useCallback(
    (id: number): string => {
      const lesson = lessons.find((l) => l.id === id);
      return lesson ? lesson.title : `Leccion #${id}`;
    },
    [lessons],
  );

  const getLessonsForCourse = useCallback(
    (courseId: number): Lesson[] => {
      return lessons.filter((l) => l.course_id === courseId);
    },
    [lessons],
  );

  const value: AdminContextValue = {
    courses,
    categories,
    tags,
    lessons,
    setCourses,
    setCategories,
    setTags,
    setLessons,
    loading,
    refreshAll,
    getCourseName,
    getLessonName,
    getLessonsForCourse,
    showSuccess,
    showError,
    success,
    error,
    clearMessages,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// ---- Hook ----

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
