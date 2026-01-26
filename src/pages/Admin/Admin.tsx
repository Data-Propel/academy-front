import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, isSuperuser, adminApi } from '../../services/api';
import './Admin.css';

type TabType = 'users' | 'courses' | 'categories' | 'lessons' | 'topics' | 'quizzes';
type ViewType = 'list' | 'create' | 'edit';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  level: string;
  duration_hours: number;
  category: Category | null;
  is_featured: boolean;
  is_published: boolean;
}

interface Lesson {
  id: number;
  title: string;
  content: string;
  course_id: number;
  course?: Course;
  order_index: number;
}

interface Topic {
  id: number;
  title: string;
  content: string;
  course_id: number;
  lesson_id: number;
  course?: Course;
  lesson?: Lesson;
  order_index: number;
}

interface Quiz {
  id: number;
  title: string;
  content: string;
  course_id: number;
  lesson_id: number;
  course?: Course;
  lesson?: Lesson;
  order_index: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [view, setView] = useState<ViewType>('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  // Filter states
  const [filterCourseId, setFilterCourseId] = useState<number>(0);
  const [filterLessonId, setFilterLessonId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterIsAdmin, setFilterIsAdmin] = useState<string>('');
  const [filterIsActive, setFilterIsActive] = useState<string>('');

  // User pagination
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalCount, setUsersTotalCount] = useState(0);
  const [usersHasNext, setUsersHasNext] = useState(false);
  const [usersHasPrev, setUsersHasPrev] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Editing item
  const [editingItem, setEditingItem] = useState<User | Course | Category | Lesson | Topic | Quiz | null>(null);

  // Form states
  const [userForm, setUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    is_active: true,
    is_superuser: false,
  });

  const [courseForm, setCourseForm] = useState({
    title: '',
    slug: '',
    short_description: '',
    description: '',
    level: 'beginner',
    duration_hours: 1,
    category_id: 0,
    is_featured: false,
    is_published: false,
  });
  const [courseThumbnail, setCourseThumbnail] = useState<File | null>(null);
  const [courseThumbnailPreview, setCourseThumbnailPreview] = useState<string>('');
  const [deleteThumbnailCourse, setDeleteThumbnailCourse] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
  });

  const [lessonForm, setLessonForm] = useState({
    title: '',
    content: '',
    course_id: 0,
    order_index: 1,
  });
  const [lessonThumbnail, setLessonThumbnail] = useState<File | null>(null);
  const [lessonThumbnailPreview, setLessonThumbnailPreview] = useState<string>('');
  const [deleteThumbnailLesson, setDeleteThumbnailLesson] = useState(false);

  const [topicForm, setTopicForm] = useState({
    title: '',
    content: '',
    course_id: 0,
    lesson_id: 0,
    order_index: 1,
  });

  const [quizForm, setQuizForm] = useState({
    title: '',
    content: '',
    course_id: 0,
    lesson_id: 0,
    order_index: 1,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    if (!isSuperuser()) {
      navigate('/');
      return;
    }

    loadData();
  }, [navigate]);

  // Helper to extract array from response
  const extractArray = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results)) {
      return (data as { results: unknown[] }).results;
    }
    return [];
  };

  // Load users with pagination, search and filters
  const loadUsers = useCallback(async (search: string, page: number, isAdmin?: string, isActive?: string) => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: search || undefined,
        page,
        isAdmin: isAdmin === 'true' ? true : isAdmin === 'false' ? false : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      if (res.ok) {
        const data = res.data as { results?: User[]; count?: number; next?: string; previous?: string };
        if (Array.isArray(res.data)) {
          setUsers(res.data as User[]);
          setUsersTotalCount((res.data as User[]).length);
          setUsersHasNext(false);
          setUsersHasPrev(false);
        } else {
          setUsers(data.results || []);
          setUsersTotalCount(data.count || 0);
          setUsersHasNext(!!data.next);
          setUsersHasPrev(!!data.previous);
        }
      }
    } catch {
      setError('Error al cargar usuarios.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [coursesRes, categoriesRes, lessonsRes, topicsRes, quizzesRes] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getCategories(),
        adminApi.getLessons(),
        adminApi.getTopics(),
        adminApi.getQuizzes(),
      ]);

      if (coursesRes.ok) setCourses(extractArray(coursesRes.data) as Course[]);
      if (categoriesRes.ok) setCategories(extractArray(categoriesRes.data) as Category[]);
      if (lessonsRes.ok) setLessons(extractArray(lessonsRes.data) as Lesson[]);
      if (topicsRes.ok) setTopics(extractArray(topicsRes.data) as Topic[]);
      if (quizzesRes.ok) setQuizzes(extractArray(quizzesRes.data) as Quiz[]);

      // Load users separately with pagination
      await loadUsers('', 1, '', '');
    } catch {
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search and filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'users') {
        setUsersPage(1);
        loadUsers(searchQuery, 1, filterIsAdmin, filterIsActive);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterIsAdmin, filterIsActive, activeTab, loadUsers]);

  // Page change effect
  useEffect(() => {
    if (activeTab === 'users' && usersPage > 1) {
      loadUsers(searchQuery, usersPage, filterIsAdmin, filterIsActive);
    }
  }, [usersPage]);

  const resetForms = () => {
    setUserForm({ email: '', first_name: '', last_name: '', password: '', is_active: true, is_superuser: false });
    setCourseForm({ title: '', slug: '', short_description: '', description: '', level: 'beginner', duration_hours: 1, category_id: 0, is_featured: false, is_published: false });
    setCourseThumbnail(null);
    setCourseThumbnailPreview('');
    setDeleteThumbnailCourse(false);
    setCategoryForm({ name: '', slug: '', description: '' });
    setLessonForm({ title: '', content: '', course_id: 0, order_index: 1 });
    setLessonThumbnail(null);
    setLessonThumbnailPreview('');
    setDeleteThumbnailLesson(false);
    setTopicForm({ title: '', content: '', course_id: 0, lesson_id: 0, order_index: 1 });
    setQuizForm({ title: '', content: '', course_id: 0, lesson_id: 0, order_index: 1 });
  };

  const validateThumbnail = (file: File): Promise<{ valid: boolean; error?: string; width?: number; height?: number }> => {
    return new Promise((resolve) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        resolve({ valid: false, error: 'El archivo debe ser una imagen.' });
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl); // Clean up

        const width = img.width;
        const height = img.height;
        const ratio = width / height;
        const targetRatio = 16 / 9; // 1.777...
        const tolerance = 0.15; // 15% tolerance

        // Check minimum dimensions
        if (width < 400 || height < 225) {
          resolve({ valid: false, error: `Imagen muy pequeña. Mínimo 400x225px. Tu imagen: ${width}x${height}px`, width, height });
          return;
        }

        // Check aspect ratio (16:9 with tolerance)
        if (Math.abs(ratio - targetRatio) > tolerance) {
          resolve({ valid: false, error: `La imagen debe tener proporción 16:9 (ej: 1280x720, 1920x1080). Tu imagen: ${width}x${height}px`, width, height });
          return;
        }

        resolve({ valid: true, width, height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ valid: false, error: 'No se pudo cargar la imagen. Verifica que el archivo sea válido.' });
      };

      img.src = objectUrl;
    });
  };

  const handleCourseThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    try {
      const validation = await validateThumbnail(file);
      if (!validation.valid) {
        setError(validation.error || 'Imagen inválida.');
        e.target.value = '';
        return;
      }

      // Clean up old preview URL if exists
      if (courseThumbnailPreview && courseThumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(courseThumbnailPreview);
      }

      setCourseThumbnail(file);
      setCourseThumbnailPreview(URL.createObjectURL(file));
      setDeleteThumbnailCourse(false);
    } catch (err) {
      setError('Error al procesar la imagen.');
      e.target.value = '';
    }
  };

  const handleLessonThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    try {
      const validation = await validateThumbnail(file);
      if (!validation.valid) {
        setError(validation.error || 'Imagen inválida.');
        e.target.value = '';
        return;
      }

      // Clean up old preview URL if exists
      if (lessonThumbnailPreview && lessonThumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(lessonThumbnailPreview);
      }

      setLessonThumbnail(file);
      setLessonThumbnailPreview(URL.createObjectURL(file));
      setDeleteThumbnailLesson(false);
    } catch (err) {
      setError('Error al procesar la imagen.');
      e.target.value = '';
    }
  };

  const handleDeleteCourseThumbnail = () => {
    setCourseThumbnail(null);
    setCourseThumbnailPreview('');
    setDeleteThumbnailCourse(true);
  };

  const handleDeleteLessonThumbnail = () => {
    setLessonThumbnail(null);
    setLessonThumbnailPreview('');
    setDeleteThumbnailLesson(true);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setView('list');
    setEditingItem(null);
    setFilterCourseId(0);
    setFilterLessonId(0);
    setSearchQuery('');
    setFilterIsAdmin('');
    setFilterIsActive('');
    resetForms();
    setError('');
  };

  const openCreateForm = () => {
    resetForms();
    // Pre-fill course_id from filter if applicable
    if (filterCourseId) {
      setLessonForm(prev => ({ ...prev, course_id: filterCourseId }));
      setTopicForm(prev => ({ ...prev, course_id: filterCourseId }));
      setQuizForm(prev => ({ ...prev, course_id: filterCourseId }));
    }
    if (filterLessonId) {
      setTopicForm(prev => ({ ...prev, lesson_id: filterLessonId }));
      setQuizForm(prev => ({ ...prev, lesson_id: filterLessonId }));
    }
    setEditingItem(null);
    setView('create');
    setError('');
  };

  const openEditForm = (item: User | Course | Category | Lesson | Topic | Quiz) => {
    setEditingItem(item);
    setError('');

    if (activeTab === 'users') {
      const user = item as User;
      setUserForm({ email: user.email, first_name: user.first_name, last_name: user.last_name, password: '', is_active: user.is_active, is_superuser: user.is_superuser });
    } else if (activeTab === 'courses') {
      const course = item as Course;
      setCourseForm({ title: course.title, slug: course.slug, short_description: course.short_description || '', description: '', level: course.level, duration_hours: course.duration_hours, category_id: course.category?.id || 0, is_featured: course.is_featured, is_published: course.is_published });
      setCourseThumbnail(null);
      setCourseThumbnailPreview((course as Course & { thumbnail?: string }).thumbnail || '');
    } else if (activeTab === 'categories') {
      const category = item as Category;
      setCategoryForm({ name: category.name, slug: category.slug, description: category.description || '' });
    } else if (activeTab === 'lessons') {
      const lesson = item as Lesson;
      setLessonForm({ title: lesson.title, content: lesson.content || '', course_id: lesson.course_id, order_index: lesson.order_index });
      setLessonThumbnail(null);
      setLessonThumbnailPreview((lesson as Lesson & { thumbnail?: string }).thumbnail || '');
    } else if (activeTab === 'topics') {
      const topic = item as Topic;
      setTopicForm({ title: topic.title, content: topic.content || '', course_id: topic.course_id, lesson_id: topic.lesson_id, order_index: topic.order_index });
    } else if (activeTab === 'quizzes') {
      const quiz = item as Quiz;
      setQuizForm({ title: quiz.title, content: quiz.content || '', course_id: quiz.course_id, lesson_id: quiz.lesson_id, order_index: quiz.order_index });
    }

    setView('edit');
  };

  const goBackToList = () => {
    setView('list');
    setEditingItem(null);
    resetForms();
    setError('');
  };

  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Get course name by ID
  const getCourseName = (courseId: number) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || '-';
  };

  // Get lesson name by ID
  const getLessonName = (lessonId: number) => {
    const lesson = lessons.find(l => l.id === lessonId);
    return lesson?.title || '-';
  };

  // Get filtered lessons for a course
  const getLessonsForCourse = (courseId: number) => {
    return lessons.filter(l => l.course_id === courseId);
  };

  // Filtered data based on filters
  const filteredLessons = filterCourseId ? lessons.filter(l => l.course_id === filterCourseId) : lessons;
  const filteredTopics = (() => {
    let filtered = topics;
    if (filterCourseId) filtered = filtered.filter(t => t.course_id === filterCourseId);
    if (filterLessonId) filtered = filtered.filter(t => t.lesson_id === filterLessonId);
    return filtered;
  })();
  const filteredQuizzes = (() => {
    let filtered = quizzes;
    if (filterCourseId) filtered = filtered.filter(q => q.course_id === filterCourseId);
    if (filterLessonId) filtered = filtered.filter(q => q.lesson_id === filterLessonId);
    return filtered;
  })();

  // User handlers
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createUser(userForm);
        if (ok) { setUsers([...users, data]); showSuccessMessage('Usuario creado.'); goBackToList(); }
        else setError(data.detail || 'Error al crear usuario.');
      } else if (editingItem) {
        const updateData = { ...userForm };
        if (!updateData.password) delete (updateData as { password?: string }).password;
        const { ok, data } = await adminApi.updateUser((editingItem as User).id, updateData);
        if (ok) { setUsers(users.map(u => u.id === data.id ? data : u)); showSuccessMessage('Usuario actualizado.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar usuario.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      const { ok } = await adminApi.deleteUser(id);
      if (ok) { setUsers(users.filter(u => u.id !== id)); showSuccessMessage('Usuario eliminado.'); }
      else setError('Error al eliminar usuario.');
    } catch { setError('Error de conexión.'); }
  };

  // Course handlers
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (view === 'create' && !courseThumbnail) {
      setError('Debes seleccionar una imagen de thumbnail.');
      return;
    }
    try {
      const courseData = { ...courseForm, category_id: courseForm.category_id || undefined };
      if (view === 'create') {
        const { ok, data } = await adminApi.createCourse(courseData, courseThumbnail || undefined);
        if (ok) { setCourses([...courses, data]); showSuccessMessage('Curso creado.'); goBackToList(); }
        else setError(data.detail || 'Error al crear curso.');
      } else if (editingItem) {
        const { ok, data } = await adminApi.updateCourse((editingItem as Course).id, courseData, courseThumbnail || undefined, deleteThumbnailCourse);
        if (ok) { setCourses(courses.map(c => c.id === data.id ? data : c)); showSuccessMessage('Curso actualizado.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar curso.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('¿Eliminar este curso?')) return;
    try {
      const { ok } = await adminApi.deleteCourse(id);
      if (ok) { setCourses(courses.filter(c => c.id !== id)); showSuccessMessage('Curso eliminado.'); }
      else setError('Error al eliminar curso.');
    } catch { setError('Error de conexión.'); }
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createCategory(categoryForm);
        if (ok) { setCategories([...categories, data]); showSuccessMessage('Categoría creada.'); goBackToList(); }
        else setError(data.detail || 'Error al crear categoría.');
      } else if (editingItem) {
        const { ok, data } = await adminApi.updateCategory((editingItem as Category).id, categoryForm);
        if (ok) { setCategories(categories.map(c => c.id === data.id ? data : c)); showSuccessMessage('Categoría actualizada.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar categoría.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      const { ok } = await adminApi.deleteCategory(id);
      if (ok) { setCategories(categories.filter(c => c.id !== id)); showSuccessMessage('Categoría eliminada.'); }
      else setError('Error al eliminar categoría.');
    } catch { setError('Error de conexión.'); }
  };

  // Lesson handlers
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!lessonForm.course_id) { setError('Selecciona un curso.'); return; }
    if (view === 'create' && !lessonThumbnail) {
      setError('Debes seleccionar una imagen de thumbnail.');
      return;
    }
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createLesson(lessonForm, lessonThumbnail || undefined);
        if (ok) { setLessons([...lessons, data]); showSuccessMessage('Lección creada.'); goBackToList(); }
        else setError(data.detail || 'Error al crear lección.');
      } else if (editingItem) {
        const { ok, data } = await adminApi.updateLesson((editingItem as Lesson).id, lessonForm, lessonThumbnail || undefined, deleteThumbnailLesson);
        if (ok) { setLessons(lessons.map(l => l.id === data.id ? data : l)); showSuccessMessage('Lección actualizada.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar lección.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteLesson = async (id: number) => {
    if (!confirm('¿Eliminar esta lección?')) return;
    try {
      const { ok } = await adminApi.deleteLesson(id);
      if (ok) { setLessons(lessons.filter(l => l.id !== id)); showSuccessMessage('Lección eliminada.'); }
      else setError('Error al eliminar lección.');
    } catch { setError('Error de conexión.'); }
  };

  // Topic handlers
  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!topicForm.course_id) { setError('Selecciona un curso.'); return; }
    if (!topicForm.lesson_id) { setError('Selecciona una lección.'); return; }
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createTopic(topicForm);
        if (ok) { setTopics([...topics, data]); showSuccessMessage('Tema creado.'); goBackToList(); }
        else setError(data.detail || 'Error al crear tema.');
      } else if (editingItem) {
        const { ok, data } = await adminApi.updateTopic((editingItem as Topic).id, topicForm);
        if (ok) { setTopics(topics.map(t => t.id === data.id ? data : t)); showSuccessMessage('Tema actualizado.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar tema.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteTopic = async (id: number) => {
    if (!confirm('¿Eliminar este tema?')) return;
    try {
      const { ok } = await adminApi.deleteTopic(id);
      if (ok) { setTopics(topics.filter(t => t.id !== id)); showSuccessMessage('Tema eliminado.'); }
      else setError('Error al eliminar tema.');
    } catch { setError('Error de conexión.'); }
  };

  // Quiz handlers
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!quizForm.course_id) { setError('Selecciona un curso.'); return; }
    if (!quizForm.lesson_id) { setError('Selecciona una lección.'); return; }
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createQuiz(quizForm);
        if (ok) { setQuizzes([...quizzes, data]); showSuccessMessage('Quiz creado.'); goBackToList(); }
        else setError(data.detail || 'Error al crear quiz.');
      } else if (editingItem) {
        const { ok, data } = await adminApi.updateQuiz((editingItem as Quiz).id, quizForm);
        if (ok) { setQuizzes(quizzes.map(q => q.id === data.id ? data : q)); showSuccessMessage('Quiz actualizado.'); goBackToList(); }
        else setError(data.detail || 'Error al actualizar quiz.');
      }
    } catch { setError('Error de conexión.'); }
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm('¿Eliminar este quiz?')) return;
    try {
      const { ok } = await adminApi.deleteQuiz(id);
      if (ok) { setQuizzes(quizzes.filter(q => q.id !== id)); showSuccessMessage('Quiz eliminado.'); }
      else setError('Error al eliminar quiz.');
    } catch { setError('Error de conexión.'); }
  };

  const getLevelLabel = (level: string) => {
    const levels: Record<string, string> = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
    return levels[level] || level;
  };

  const getTabLabel = () => {
    const labels: Record<TabType, string> = { users: 'Usuario', courses: 'Curso', categories: 'Categoría', lessons: 'Lección', topics: 'Tema', quizzes: 'Quiz' };
    return labels[activeTab];
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="admin-title">Panel de Administración</h1>
          <p className="admin-subtitle">Gestiona usuarios, cursos, lecciones, temas y quizzes.</p>
        </div>

        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}

        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
            Usuarios ({usersTotalCount})
          </button>
          <button className={`admin-tab ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => handleTabChange('courses')}>
            Cursos ({courses.length})
          </button>
          <button className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => handleTabChange('categories')}>
            Categorías ({categories.length})
          </button>
          <button className={`admin-tab ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => handleTabChange('lessons')}>
            Lecciones ({lessons.length})
          </button>
          <button className={`admin-tab ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => handleTabChange('topics')}>
            Temas ({topics.length})
          </button>
          <button className={`admin-tab ${activeTab === 'quizzes' ? 'active' : ''}`} onClick={() => handleTabChange('quizzes')}>
            Quizzes ({quizzes.length})
          </button>
        </div>

        <div className="admin-content">
          {/* LIST VIEW */}
          {view === 'list' && (
            <>
              <div className="admin-toolbar">
                {/* Search and filters for users */}
                {activeTab === 'users' && (
                  <div className="admin-filters">
                    <input
                      type="text"
                      placeholder="Buscar por email o nombre..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    <select value={filterIsAdmin} onChange={e => setFilterIsAdmin(e.target.value)}>
                      <option value="">Todos los roles</option>
                      <option value="true">Administradores</option>
                      <option value="false">Usuarios</option>
                    </select>
                    <select value={filterIsActive} onChange={e => setFilterIsActive(e.target.value)}>
                      <option value="">Todos los estados</option>
                      <option value="true">Activos</option>
                      <option value="false">Inactivos</option>
                    </select>
                  </div>
                )}
                {/* Filters for lessons, topics, quizzes */}
                {(activeTab === 'lessons' || activeTab === 'topics' || activeTab === 'quizzes') && (
                  <div className="admin-filters">
                    <select value={filterCourseId} onChange={e => { setFilterCourseId(Number(e.target.value)); setFilterLessonId(0); }}>
                      <option value={0}>Todos los cursos</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    {(activeTab === 'topics' || activeTab === 'quizzes') && filterCourseId > 0 && (
                      <select value={filterLessonId} onChange={e => setFilterLessonId(Number(e.target.value))}>
                        <option value={0}>Todas las lecciones</option>
                        {getLessonsForCourse(filterCourseId).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    )}
                  </div>
                )}
                <button className="admin-create-btn" onClick={openCreateForm}>
                  + Crear {getTabLabel()}
                </button>
              </div>

              {/* Users Table */}
              {activeTab === 'users' && (
                <div className="admin-table-container">
                  {usersLoading && <div className="admin-loading-overlay">Buscando...</div>}
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Email</th><th>Nombre</th><th>Activo</th><th>Admin</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.email}</td>
                          <td>{user.first_name} {user.last_name}</td>
                          <td><span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? 'Sí' : 'No'}</span></td>
                          <td><span className={`status-badge ${user.is_superuser ? 'admin' : ''}`}>{user.is_superuser ? 'Sí' : 'No'}</span></td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(user)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteUser(user.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && !usersLoading && <div className="admin-empty">{searchQuery ? 'No se encontraron usuarios.' : 'No hay usuarios.'}</div>}
                  {/* Pagination */}
                  {usersTotalCount > 0 && (
                    <div className="pagination">
                      <span className="pagination-info">
                        Mostrando {users.length} de {usersTotalCount} usuarios
                      </span>
                      <div className="pagination-buttons">
                        <button
                          className="pagination-btn"
                          disabled={!usersHasPrev || usersLoading}
                          onClick={() => setUsersPage(p => p - 1)}
                        >
                          Anterior
                        </button>
                        <span className="pagination-page">Página {usersPage}</span>
                        <button
                          className="pagination-btn"
                          disabled={!usersHasNext || usersLoading}
                          onClick={() => setUsersPage(p => p + 1)}
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Courses Table */}
              {activeTab === 'courses' && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Título</th><th>Categoría</th><th>Nivel</th><th>Publicado</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id}>
                          <td>{course.id}</td>
                          <td>{course.title}</td>
                          <td>{course.category?.name || '-'}</td>
                          <td>{getLevelLabel(course.level)}</td>
                          <td><span className={`status-badge ${course.is_published ? 'active' : 'inactive'}`}>{course.is_published ? 'Sí' : 'No'}</span></td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(course)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteCourse(course.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {courses.length === 0 && <div className="admin-empty">No hay cursos.</div>}
                </div>
              )}

              {/* Categories Table */}
              {activeTab === 'categories' && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Nombre</th><th>Slug</th><th>Descripción</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {categories.map(category => (
                        <tr key={category.id}>
                          <td>{category.id}</td>
                          <td>{category.name}</td>
                          <td>{category.slug}</td>
                          <td>{category.description || '-'}</td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(category)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteCategory(category.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {categories.length === 0 && <div className="admin-empty">No hay categorías.</div>}
                </div>
              )}

              {/* Lessons Table */}
              {activeTab === 'lessons' && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Título</th><th>Curso</th><th>Orden</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredLessons.map(lesson => (
                        <tr key={lesson.id}>
                          <td>{lesson.id}</td>
                          <td>{lesson.title}</td>
                          <td>{getCourseName(lesson.course_id)}</td>
                          <td>{lesson.order_index}</td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(lesson)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteLesson(lesson.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredLessons.length === 0 && <div className="admin-empty">No hay lecciones.</div>}
                </div>
              )}

              {/* Topics Table */}
              {activeTab === 'topics' && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Título</th><th>Curso</th><th>Lección</th><th>Orden</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredTopics.map(topic => (
                        <tr key={topic.id}>
                          <td>{topic.id}</td>
                          <td>{topic.title}</td>
                          <td>{getCourseName(topic.course_id)}</td>
                          <td>{getLessonName(topic.lesson_id)}</td>
                          <td>{topic.order_index}</td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(topic)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteTopic(topic.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTopics.length === 0 && <div className="admin-empty">No hay temas.</div>}
                </div>
              )}

              {/* Quizzes Table */}
              {activeTab === 'quizzes' && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>ID</th><th>Título</th><th>Curso</th><th>Lección</th><th>Orden</th><th>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredQuizzes.map(quiz => (
                        <tr key={quiz.id}>
                          <td>{quiz.id}</td>
                          <td>{quiz.title}</td>
                          <td>{getCourseName(quiz.course_id)}</td>
                          <td>{getLessonName(quiz.lesson_id)}</td>
                          <td>{quiz.order_index}</td>
                          <td>
                            <button className="action-btn edit" onClick={() => openEditForm(quiz)}>Editar</button>
                            <button className="action-btn delete" onClick={() => handleDeleteQuiz(quiz.id)}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredQuizzes.length === 0 && <div className="admin-empty">No hay quizzes.</div>}
                </div>
              )}
            </>
          )}

          {/* CREATE/EDIT VIEW */}
          {(view === 'create' || view === 'edit') && (
            <div className="admin-form-container">
              <div className="admin-form-header">
                <button className="back-btn" onClick={goBackToList}>&larr; Volver</button>
                <h2 className="form-title">{view === 'create' ? 'Crear' : 'Editar'} {getTabLabel()}</h2>
              </div>

              {/* User Form */}
              {activeTab === 'users' && (
                <form className="admin-form" onSubmit={handleUserSubmit}>
                  <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre <span className="required">*</span></label>
                      <input type="text" value={userForm.first_name} onChange={e => setUserForm({ ...userForm, first_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Apellido <span className="required">*</span></label>
                      <input type="text" value={userForm.last_name} onChange={e => setUserForm({ ...userForm, last_name: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Contraseña {view === 'create' && <span className="required">*</span>}</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required={view === 'create'} placeholder={view === 'edit' ? 'Dejar vacío para no cambiar' : ''} />
                  </div>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label"><input type="checkbox" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} /><span>Usuario activo</span></label>
                    <label className="checkbox-label"><input type="checkbox" checked={userForm.is_superuser} onChange={e => setUserForm({ ...userForm, is_superuser: e.target.checked })} /><span>Administrador</span></label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}

              {/* Course Form */}
              {activeTab === 'courses' && (
                <form className="admin-form" onSubmit={handleCourseSubmit}>
                  <div className="form-group">
                    <label>Título <span className="required">*</span></label>
                    <input type="text" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Slug <span className="required">*</span></label>
                    <input type="text" value={courseForm.slug} onChange={e => setCourseForm({ ...courseForm, slug: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Descripción corta</label>
                    <textarea value={courseForm.short_description} onChange={e => setCourseForm({ ...courseForm, short_description: e.target.value })} rows={3} />
                  </div>
                  <div className="form-group">
                    <label>
                      Thumbnail {view === 'create' && <span className="required">*</span>}
                      <span className="label-hint">(16:9, mín. 400x225px)</span>
                    </label>
                    {courseThumbnailPreview && (
                      <div className="thumbnail-preview">
                        <img src={courseThumbnailPreview} alt="Preview" />
                        {view === 'edit' && !courseThumbnail && <span className="thumbnail-current">Actual</span>}
                        {courseThumbnail && <span className="thumbnail-new">Nueva imagen</span>}
                        <button type="button" className="thumbnail-delete" onClick={handleDeleteCourseThumbnail} title="Eliminar thumbnail">×</button>
                      </div>
                    )}
                    {deleteThumbnailCourse && (
                      <div className="thumbnail-deleted">Thumbnail será eliminado al guardar</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleCourseThumbnailChange} className="file-input" />
                    {view === 'edit' && !deleteThumbnailCourse && <span className="file-hint">Selecciona una nueva imagen para cambiar el thumbnail</span>}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Categoría</label>
                      <select value={courseForm.category_id} onChange={e => setCourseForm({ ...courseForm, category_id: Number(e.target.value) })}>
                        <option value={0}>Sin categoría</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Nivel</label>
                      <select value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Duración (horas)</label>
                    <input type="number" min="1" value={courseForm.duration_hours} onChange={e => setCourseForm({ ...courseForm, duration_hours: Number(e.target.value) })} />
                  </div>
                  <div className="form-row checkbox-row">
                    <label className="checkbox-label"><input type="checkbox" checked={courseForm.is_featured} onChange={e => setCourseForm({ ...courseForm, is_featured: e.target.checked })} /><span>Destacado</span></label>
                    <label className="checkbox-label"><input type="checkbox" checked={courseForm.is_published} onChange={e => setCourseForm({ ...courseForm, is_published: e.target.checked })} /><span>Publicado</span></label>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}

              {/* Category Form */}
              {activeTab === 'categories' && (
                <form className="admin-form" onSubmit={handleCategorySubmit}>
                  <div className="form-group">
                    <label>Nombre <span className="required">*</span></label>
                    <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Slug <span className="required">*</span></label>
                    <input type="text" value={categoryForm.slug} onChange={e => setCategoryForm({ ...categoryForm, slug: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Descripción</label>
                    <textarea value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} rows={3} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}

              {/* Lesson Form */}
              {activeTab === 'lessons' && (
                <form className="admin-form" onSubmit={handleLessonSubmit}>
                  <div className="form-group">
                    <label>Curso <span className="required">*</span></label>
                    <select value={lessonForm.course_id} onChange={e => setLessonForm({ ...lessonForm, course_id: Number(e.target.value) })} required>
                      <option value={0}>Seleccionar curso</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Título <span className="required">*</span></label>
                    <input type="text" value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>
                      Thumbnail {view === 'create' && <span className="required">*</span>}
                      <span className="label-hint">(16:9, mín. 400x225px)</span>
                    </label>
                    {lessonThumbnailPreview && (
                      <div className="thumbnail-preview">
                        <img src={lessonThumbnailPreview} alt="Preview" />
                        {view === 'edit' && !lessonThumbnail && <span className="thumbnail-current">Actual</span>}
                        {lessonThumbnail && <span className="thumbnail-new">Nueva imagen</span>}
                        <button type="button" className="thumbnail-delete" onClick={handleDeleteLessonThumbnail} title="Eliminar thumbnail">×</button>
                      </div>
                    )}
                    {deleteThumbnailLesson && (
                      <div className="thumbnail-deleted">Thumbnail será eliminado al guardar</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleLessonThumbnailChange} className="file-input" />
                    {view === 'edit' && !deleteThumbnailLesson && <span className="file-hint">Selecciona una nueva imagen para cambiar el thumbnail</span>}
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} rows={6} />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input type="number" min="1" value={lessonForm.order_index} onChange={e => setLessonForm({ ...lessonForm, order_index: Number(e.target.value) })} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}

              {/* Topic Form */}
              {activeTab === 'topics' && (
                <form className="admin-form" onSubmit={handleTopicSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Curso <span className="required">*</span></label>
                      <select value={topicForm.course_id} onChange={e => setTopicForm({ ...topicForm, course_id: Number(e.target.value), lesson_id: 0 })} required>
                        <option value={0}>Seleccionar curso</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Lección <span className="required">*</span></label>
                      <select value={topicForm.lesson_id} onChange={e => setTopicForm({ ...topicForm, lesson_id: Number(e.target.value) })} required disabled={!topicForm.course_id}>
                        <option value={0}>Seleccionar lección</option>
                        {getLessonsForCourse(topicForm.course_id).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Título <span className="required">*</span></label>
                    <input type="text" value={topicForm.title} onChange={e => setTopicForm({ ...topicForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea value={topicForm.content} onChange={e => setTopicForm({ ...topicForm, content: e.target.value })} rows={6} />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input type="number" min="1" value={topicForm.order_index} onChange={e => setTopicForm({ ...topicForm, order_index: Number(e.target.value) })} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}

              {/* Quiz Form */}
              {activeTab === 'quizzes' && (
                <form className="admin-form" onSubmit={handleQuizSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Curso <span className="required">*</span></label>
                      <select value={quizForm.course_id} onChange={e => setQuizForm({ ...quizForm, course_id: Number(e.target.value), lesson_id: 0 })} required>
                        <option value={0}>Seleccionar curso</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Lección <span className="required">*</span></label>
                      <select value={quizForm.lesson_id} onChange={e => setQuizForm({ ...quizForm, lesson_id: Number(e.target.value) })} required disabled={!quizForm.course_id}>
                        <option value={0}>Seleccionar lección</option>
                        {getLessonsForCourse(quizForm.course_id).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Título <span className="required">*</span></label>
                    <input type="text" value={quizForm.title} onChange={e => setQuizForm({ ...quizForm, title: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea value={quizForm.content} onChange={e => setQuizForm({ ...quizForm, content: e.target.value })} rows={6} />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input type="number" min="1" value={quizForm.order_index} onChange={e => setQuizForm({ ...quizForm, order_index: Number(e.target.value) })} />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
                    <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
