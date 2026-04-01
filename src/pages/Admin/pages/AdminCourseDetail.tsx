import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { type Lesson, type Topic, type Quiz, type Resource, type CourseResource } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type TabType = 'curriculum' | 'evaluaciones' | 'info';

interface EvalForm {
  id: number;
  course_id: number;
  title: string;
  description: string;
  is_active: boolean;
  questions: EvalQuestion[];
  responses_count: number;
}

interface EvalQuestion {
  id: number;
  form_id: number;
  question_text: string;
  question_type: 'rating' | 'scale' | 'nps' | 'yes_no' | 'multiple_choice' | 'text';
  options: string[];
  is_required: boolean;
  order_index: number;
}

interface EvalQuestionStat {
  question_id: number;
  question_text: string;
  question_type: string;
  total_answers: number;
  average?: number;
  distribution?: Record<string, number>;
  yes_count?: number;
  no_count?: number;
  sample_answers?: string[];
  nps_score?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
}

interface EvalResponsesData {
  form_id: number;
  course_title: string;
  total_responses: number;
  statistics: EvalQuestionStat[];
}

const extractArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown[] }).results)
  ) {
    return (data as { results: unknown[] }).results;
  }
  return [];
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, loading, showSuccess, showError, clearMessages, setLessons } = useAdmin();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('curriculum');

  // Course data
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([]);
  const [courseTopics, setCourseTopics] = useState<Topic[]>([]);
  const [courseQuizzes, setCourseQuizzes] = useState<Quiz[]>([]);
  const [courseResources, setCourseResources] = useState<Resource[]>([]);
  const [courseLevelResources, setCourseLevelResources] = useState<CourseResource[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Expanded lessons
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());

  // Inline editing
  const [editingType, setEditingType] = useState<'lesson' | 'topic' | 'quiz' | 'resource' | 'course-resource' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingParentLessonId, setEditingParentLessonId] = useState<number>(0);

  // Form states
  const [lessonForm, setLessonForm] = useState({ title: '', content: '', video_url: '', order_index: 1 });
  const [topicForm, setTopicForm] = useState({ title: '', content: '', video_url: '', order_index: 1 });
  const [quizForm, setQuizForm] = useState({ title: '', content: '', order_index: 1 });
  const [resourceForm, setResourceForm] = useState({ title: '', resource_type: 'document', file_url: '' });
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [courseResourceForm, setCourseResourceForm] = useState({ title: '', resource_type: 'document', file_url: '', order_index: 0 });
  const [courseResourceFile, setCourseResourceFile] = useState<File | null>(null);
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonThumbnail, setLessonThumbnail] = useState<File | null>(null);
  const [lessonThumbnailPreview, setLessonThumbnailPreview] = useState('');
  const [deleteLessonThumbnail, setDeleteLessonThumbnail] = useState(false);

  // Evaluation state
  const [evalForm, setEvalForm] = useState<EvalForm | null>(null);
  const [evalQuestionForm, setEvalQuestionForm] = useState({
    question_text: '', question_type: 'rating' as string, options: [] as string[], is_required: true, order_index: 1,
  });
  const [editingEvalQuestion, setEditingEvalQuestion] = useState<number | null>(null);
  const [creatingEvalQuestion, setCreatingEvalQuestion] = useState(false);
  const [evalResponses, setEvalResponses] = useState<EvalResponsesData | null>(null);
  const [showEvalResults, setShowEvalResults] = useState(false);
  const [evalFormTitle, setEvalFormTitle] = useState('Evaluación del curso');
  const [evalFormDesc, setEvalFormDesc] = useState('');
  const [creatingEvalForm, setCreatingEvalForm] = useState(false);
  const [newOption, setNewOption] = useState('');

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Find course from context
  const course = courses.find(c => c.id === Number(id));

  // Load course data
  useEffect(() => {
    loadCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCourseData = async () => {
    setDataLoading(true);
    try {
      const [lessonsRes, topicsRes, quizzesRes, resourcesRes, courseResourcesRes] = await Promise.all([
        adminApi.getLessons(),
        adminApi.getTopics(),
        adminApi.getQuizzes(),
        adminApi.getResources(),
        adminApi.getCourseResources(Number(id)),
      ]);

      const allLessons = extractArray(lessonsRes.ok ? lessonsRes.data : []) as Lesson[];
      const allTopics = extractArray(topicsRes.ok ? topicsRes.data : []) as Topic[];
      const allQuizzes = extractArray(quizzesRes.ok ? quizzesRes.data : []) as Quiz[];
      const allResources = extractArray(resourcesRes.ok ? resourcesRes.data : []) as Resource[];
      const allCourseResources = extractArray(courseResourcesRes.ok ? courseResourcesRes.data : []) as CourseResource[];

      // Load evaluation form
      const evalRes = await adminApi.getEvaluationForms(Number(id));
      const evalForms = extractArray(evalRes.ok ? evalRes.data : []) as EvalForm[];
      setEvalForm(evalForms.length > 0 ? evalForms[0] : null);

      const courseId = Number(id);
      setCourseLessons(
        allLessons
          .filter(l => l.course_id === courseId)
          .sort((a, b) => a.order_index - b.order_index),
      );
      setCourseTopics(allTopics.filter(t => t.course_id === courseId));
      setCourseQuizzes(allQuizzes.filter(q => q.course_id === courseId));
      setCourseResources(allResources);
      setCourseLevelResources(allCourseResources.sort((a, b) => a.order_index - b.order_index));
    } catch {
      showError('Error al cargar datos del curso.');
    } finally {
      setDataLoading(false);
    }
  };

  // Toggle lesson expand/collapse
  const toggleLesson = (lessonId: number) => {
    setExpandedLessons(prev => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  // Cancel editing and reset forms
  const cancelEditing = () => {
    setEditingType(null);
    setEditingId(null);
    setEditingParentLessonId(0);
    setLessonForm({ title: '', content: '', video_url: '', order_index: 1 });
    setTopicForm({ title: '', content: '', video_url: '', order_index: 1 });
    setQuizForm({ title: '', content: '', order_index: 1 });
    setResourceForm({ title: '', resource_type: 'document', file_url: '' });
    setResourceFile(null);
    setLessonVideoFile(null);
    setLessonThumbnail(null);
    setLessonThumbnailPreview('');
    setDeleteLessonThumbnail(false);
  };

  // ---- Lesson thumbnail handler ----

  const handleLessonThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      showError('Imagen muy grande. Máximo 5MB.');
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      if (w < 400 || h < 225) {
        showError(`Imagen muy pequeña. Mínimo 400x225px.`);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      if (Math.abs(w / h - 16 / 9) > 0.5) {
        showError(`Se recomienda proporción 16:9.`);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      setLessonThumbnail(file);
      setLessonThumbnailPreview(blobUrl);
      setDeleteLessonThumbnail(false);
    };
    img.onerror = () => URL.revokeObjectURL(blobUrl);
    img.src = blobUrl;
  };

  // ---- Lesson CRUD ----

  const startCreateLesson = () => {
    cancelEditing();
    setEditingType('lesson');
    setLessonForm({ title: '', content: '', video_url: '', order_index: courseLessons.length + 1 });
  };

  const startEditLesson = (lesson: Lesson) => {
    cancelEditing();
    setEditingType('lesson');
    setEditingId(lesson.id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      order_index: lesson.order_index,
    });
    setLessonThumbnailPreview(lesson.thumbnail || '');
  };

  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const courseId = Number(id);
    try {
      if (editingId) {
        const { ok, data } = await adminApi.updateLesson(
          editingId,
          { ...lessonForm, course_id: courseId },
          lessonThumbnail || undefined,
          deleteLessonThumbnail,
          lessonVideoFile || undefined,
        );
        if (ok) {
          setCourseLessons(prev =>
            prev.map(l => (l.id === data.id ? data : l)).sort((a, b) => a.order_index - b.order_index),
          );
          setLessons(prev => prev.map(l => (l.id === data.id ? data : l)));
          showSuccess('Lección actualizada.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al actualizar lección.');
        }
      } else {
        const { ok, data } = await adminApi.createLesson(
          { ...lessonForm, course_id: courseId },
          lessonThumbnail || undefined,
          lessonVideoFile || undefined,
        );
        if (ok) {
          setCourseLessons(prev =>
            [...prev, data].sort((a, b) => a.order_index - b.order_index),
          );
          setLessons(prev => [...prev, data]);
          showSuccess('Lección creada.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al crear lección.');
        }
      }
    } catch {
      showError('Error de conexión.');
    }
  };

  const confirmDeleteLesson = (lesson: Lesson) => {
    setConfirmTitle('Eliminar lección');
    setConfirmMessage(
      `¿Eliminar "${lesson.title}"? Se eliminarán todos sus temas, quizzes y recursos.`,
    );
    setConfirmAction(() => async () => {
      try {
        const { ok } = await adminApi.deleteLesson(lesson.id);
        if (ok) {
          setCourseLessons(prev => prev.filter(l => l.id !== lesson.id));
          setCourseTopics(prev => prev.filter(t => t.lesson_id !== lesson.id));
          setCourseQuizzes(prev => prev.filter(q => q.lesson_id !== lesson.id));
          setCourseResources(prev => prev.filter(r => r.lesson_id !== lesson.id));
          setLessons(prev => prev.filter(l => l.id !== lesson.id));
          showSuccess('Lección eliminada.');
        } else {
          showError('Error al eliminar lección.');
        }
      } catch {
        showError('Error de conexión.');
      }
    });
    setConfirmOpen(true);
  };

  // ---- Topic CRUD ----

  const startCreateTopic = (lessonId: number) => {
    cancelEditing();
    setEditingType('topic');
    setEditingParentLessonId(lessonId);
    const existingTopics = courseTopics.filter(t => t.lesson_id === lessonId);
    setTopicForm({ title: '', content: '', video_url: '', order_index: existingTopics.length + 1 });
  };

  const startEditTopic = (topic: Topic) => {
    cancelEditing();
    setEditingType('topic');
    setEditingId(topic.id);
    setEditingParentLessonId(topic.lesson_id);
    setTopicForm({
      title: topic.title,
      content: topic.content || '',
      video_url: topic.video_url || '',
      order_index: topic.order_index,
    });
  };

  const handleTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const courseId = Number(id);
    try {
      if (editingId) {
        const { ok, data } = await adminApi.updateTopic(editingId, {
          ...topicForm,
          course_id: courseId,
          lesson_id: editingParentLessonId,
        });
        if (ok) {
          setCourseTopics(prev => prev.map(t => (t.id === data.id ? data : t)));
          showSuccess('Tema actualizado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al actualizar tema.');
        }
      } else {
        const { ok, data } = await adminApi.createTopic({
          ...topicForm,
          course_id: courseId,
          lesson_id: editingParentLessonId,
        });
        if (ok) {
          setCourseTopics(prev => [...prev, data]);
          showSuccess('Tema creado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al crear tema.');
        }
      }
    } catch {
      showError('Error de conexión.');
    }
  };

  const confirmDeleteTopic = (topic: Topic) => {
    setConfirmTitle('Eliminar tema');
    setConfirmMessage(`¿Eliminar "${topic.title}"?`);
    setConfirmAction(() => async () => {
      try {
        const { ok } = await adminApi.deleteTopic(topic.id);
        if (ok) {
          setCourseTopics(prev => prev.filter(t => t.id !== topic.id));
          showSuccess('Tema eliminado.');
        } else {
          showError('Error al eliminar tema.');
        }
      } catch {
        showError('Error de conexión.');
      }
    });
    setConfirmOpen(true);
  };

  // ---- Quiz CRUD ----

  const startCreateQuiz = (lessonId: number) => {
    cancelEditing();
    setEditingType('quiz');
    setEditingParentLessonId(lessonId);
    const existingQuizzes = courseQuizzes.filter(q => q.lesson_id === lessonId);
    setQuizForm({ title: '', content: '', order_index: existingQuizzes.length + 1 });
  };

  const startEditQuiz = (quiz: Quiz) => {
    cancelEditing();
    setEditingType('quiz');
    setEditingId(quiz.id);
    setEditingParentLessonId(quiz.lesson_id);
    setQuizForm({
      title: quiz.title,
      content: quiz.content || '',
      order_index: quiz.order_index,
    });
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    const courseId = Number(id);
    try {
      if (editingId) {
        const { ok, data } = await adminApi.updateQuiz(editingId, {
          ...quizForm,
          course_id: courseId,
          lesson_id: editingParentLessonId,
        });
        if (ok) {
          setCourseQuizzes(prev => prev.map(q => (q.id === data.id ? data : q)));
          showSuccess('Quiz actualizado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al actualizar quiz.');
        }
      } else {
        const { ok, data } = await adminApi.createQuiz({
          ...quizForm,
          course_id: courseId,
          lesson_id: editingParentLessonId,
        });
        if (ok) {
          setCourseQuizzes(prev => [...prev, data]);
          showSuccess('Quiz creado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al crear quiz.');
        }
      }
    } catch {
      showError('Error de conexión.');
    }
  };

  const confirmDeleteQuiz = (quiz: Quiz) => {
    setConfirmTitle('Eliminar quiz');
    setConfirmMessage(`¿Eliminar "${quiz.title}"?`);
    setConfirmAction(() => async () => {
      try {
        const { ok } = await adminApi.deleteQuiz(quiz.id);
        if (ok) {
          setCourseQuizzes(prev => prev.filter(q => q.id !== quiz.id));
          showSuccess('Quiz eliminado.');
        } else {
          showError('Error al eliminar quiz.');
        }
      } catch {
        showError('Error de conexión.');
      }
    });
    setConfirmOpen(true);
  };

  // ---- Resource CRUD ----

  const startCreateResource = (lessonId: number) => {
    cancelEditing();
    setEditingType('resource');
    setEditingParentLessonId(lessonId);
    setResourceForm({ title: '', resource_type: 'document', file_url: '' });
    setResourceFile(null);
  };

  const startEditResource = (resource: Resource) => {
    cancelEditing();
    setEditingType('resource');
    setEditingId(resource.id);
    setEditingParentLessonId(resource.lesson_id);
    setResourceForm({ title: resource.title, resource_type: resource.resource_type || 'document', file_url: resource.file_url || '' });
    setResourceFile(null);
  };

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      if (editingId) {
        const { ok, data } = await adminApi.updateResource(
          editingId,
          { ...resourceForm, lesson_id: editingParentLessonId },
          resourceFile || undefined,
        );
        if (ok) {
          setCourseResources(prev => prev.map(r => (r.id === data.id ? data : r)));
          showSuccess('Recurso actualizado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al actualizar recurso.');
        }
      } else {
        if (!resourceFile && !resourceForm.file_url) {
          showError('Selecciona un archivo o ingresa una URL.');
          return;
        }
        const { ok, data } = await adminApi.createResource(
          { ...resourceForm, lesson_id: editingParentLessonId },
          resourceFile || undefined,
        );
        if (ok) {
          setCourseResources(prev => [...prev, data]);
          showSuccess('Recurso creado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al crear recurso.');
        }
      }
    } catch {
      showError('Error de conexión.');
    }
  };

  const confirmDeleteResource = (resource: Resource) => {
    setConfirmTitle('Eliminar recurso');
    setConfirmMessage(`¿Eliminar "${resource.title}"?`);
    setConfirmAction(() => async () => {
      try {
        const { ok } = await adminApi.deleteResource(resource.id);
        if (ok) {
          setCourseResources(prev => prev.filter(r => r.id !== resource.id));
          showSuccess('Recurso eliminado.');
        } else {
          showError('Error al eliminar recurso.');
        }
      } catch {
        showError('Error de conexión.');
      }
    });
    setConfirmOpen(true);
  };

  // ---- Course-level resource handlers ----

  const startCreateCourseResource = () => {
    cancelEditing();
    setEditingType('course-resource');
    setCourseResourceForm({ title: '', resource_type: 'document', file_url: '', order_index: courseLevelResources.length });
    setCourseResourceFile(null);
  };

  const startEditCourseResource = (resource: CourseResource) => {
    cancelEditing();
    setEditingType('course-resource');
    setEditingId(resource.id);
    setCourseResourceForm({
      title: resource.title,
      resource_type: resource.resource_type || 'document',
      file_url: resource.file_url || '',
      order_index: resource.order_index,
    });
    setCourseResourceFile(null);
  };

  const handleCourseResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      if (editingId) {
        const { ok, data } = await adminApi.updateCourseResource(
          editingId,
          { ...courseResourceForm, course_id: Number(id) },
          courseResourceFile || undefined,
        );
        if (ok) {
          setCourseLevelResources(prev => prev.map(r => (r.id === data.id ? data : r)).sort((a, b) => a.order_index - b.order_index));
          showSuccess('Recurso del curso actualizado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al actualizar recurso.');
        }
      } else {
        if (!courseResourceFile && !courseResourceForm.file_url) {
          showError('Selecciona un archivo o ingresa una URL.');
          return;
        }
        const { ok, data } = await adminApi.createCourseResource(
          { ...courseResourceForm, course_id: Number(id) },
          courseResourceFile || undefined,
        );
        if (ok) {
          setCourseLevelResources(prev => [...prev, data].sort((a, b) => a.order_index - b.order_index));
          showSuccess('Recurso del curso creado.');
          cancelEditing();
        } else {
          showError(data.detail || 'Error al crear recurso.');
        }
      }
    } catch {
      showError('Error de conexión.');
    }
  };

  const confirmDeleteCourseResource = (resource: CourseResource) => {
    setConfirmTitle('Eliminar recurso del curso');
    setConfirmMessage(`¿Eliminar "${resource.title}"?`);
    setConfirmAction(() => async () => {
      try {
        const { ok } = await adminApi.deleteCourseResource(resource.id);
        if (ok) {
          setCourseLevelResources(prev => prev.filter(r => r.id !== resource.id));
          showSuccess('Recurso eliminado.');
        } else {
          showError('Error al eliminar recurso.');
        }
      } catch {
        showError('Error de conexión.');
      }
    });
    setConfirmOpen(true);
  };

  // ---- Loading state ----

  if (dataLoading) {
    return (
      <div className="admin-content">
        <div className="admin-loading" style={{ minHeight: '40vh' }}>
          Cargando curso...
        </div>
      </div>
    );
  }

  // ---- Course not found ----

  if (!course && !loading) {
    return (
      <div className="admin-content">
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p
            style={{
              color: 'rgba(242, 242, 242, 0.7)',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '1rem',
              marginBottom: 20,
            }}
          >
            Curso no encontrado.
          </p>
          <button className="btn-submit" onClick={() => navigate('/admin/cursos')}>
            Volver a cursos
          </button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  // ---- Render ----

  return (
    <div className="admin-content">
      <PageHeader
        title={course.title}
        subtitle={course.is_published ? 'Publicado' : 'Borrador'}
        breadcrumbs={[
          { label: 'Cursos', to: '/admin/cursos' },
          { label: course.title },
        ]}
      />

      {/* Tab bar */}
      <div
        className="admin-tabs"
        style={{ borderRadius: '8px 8px 0 0', borderTop: '1px solid #656565' }}
      >
        <button
          className={`admin-tab ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          Currículo ({courseLessons.length} lecciones)
        </button>
        <button
          className={`admin-tab ${activeTab === 'evaluaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluaciones')}
        >
          Evaluaciones
        </button>
        <button
          className={`admin-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Información
        </button>
      </div>

      {/* ===== Currículo tab ===== */}
      {activeTab === 'curriculum' && (
        <div>
          {/* Course-level resources section */}
          <div className="curriculum-lesson-card" style={{ marginBottom: '20px' }}>
            <div className="curriculum-section" style={{ padding: '16px' }}>
              <div className="curriculum-section-header">
                <h4 className="curriculum-section-title" style={{ fontSize: '0.9rem' }}>Recursos del Curso</h4>
                <button className="curriculum-add-btn" onClick={startCreateCourseResource}>
                  + Agregar
                </button>
              </div>
              {courseLevelResources.length === 0 ? (
                <p className="curriculum-empty">Sin recursos a nivel de curso</p>
              ) : (
                courseLevelResources.map(resource => (
                  <div key={resource.id} className="curriculum-item">
                    <span className="curriculum-item-title">{resource.title}</span>
                    <span className="status-badge" style={{ fontSize: '11px', marginLeft: '8px' }}>
                      {{ document: 'Documento', spreadsheet: 'Hoja de cálculo', presentation: 'Presentación', video: 'Video', image: 'Imagen', link: 'Enlace', other: 'Otro' }[resource.resource_type] || resource.resource_type}
                    </span>
                    {resource.file_size > 0 && (
                      <span className="curriculum-item-size">{formatFileSize(resource.file_size)}</span>
                    )}
                    <div className="curriculum-item-actions">
                      <button className="action-btn edit" onClick={() => startEditCourseResource(resource)}>Editar</button>
                      <button className="action-btn delete" onClick={() => confirmDeleteCourseResource(resource)}>Eliminar</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {courseLessons.map(lesson => {
            const isExpanded = expandedLessons.has(lesson.id);
            const lessonTopics = courseTopics
              .filter(t => t.lesson_id === lesson.id)
              .sort((a, b) => a.order_index - b.order_index);
            const lessonQuizzes = courseQuizzes
              .filter(q => q.lesson_id === lesson.id)
              .sort((a, b) => a.order_index - b.order_index);
            const lessonResources = courseResources.filter(r => r.lesson_id === lesson.id);

            return (
              <div key={lesson.id} className="curriculum-lesson-card">
                <div
                  className="curriculum-lesson-header"
                  onClick={() => toggleLesson(lesson.id)}
                >
                  <span className={`curriculum-chevron ${isExpanded ? 'open' : ''}`}>
                    ▸
                  </span>
                  <span className="curriculum-lesson-order">{lesson.order_index}</span>
                  <span className="curriculum-lesson-title">{lesson.title}</span>
                  <span className="curriculum-lesson-counts">
                    {lessonTopics.length} temas · {lessonQuizzes.length} quizzes ·{' '}
                    {lessonResources.length} recursos
                  </span>
                  <div
                    className="curriculum-lesson-actions"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      className="action-btn edit"
                      onClick={() => startEditLesson(lesson)}
                    >
                      Editar
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => confirmDeleteLesson(lesson)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="curriculum-lesson-body">
                    {/* Topics section */}
                    <div className="curriculum-section">
                      <div className="curriculum-section-header">
                        <h4 className="curriculum-section-title">Temas</h4>
                        <button
                          className="curriculum-add-btn"
                          onClick={() => startCreateTopic(lesson.id)}
                        >
                          + Agregar
                        </button>
                      </div>
                      {lessonTopics.length === 0 ? (
                        <p className="curriculum-empty">Sin temas</p>
                      ) : (
                        lessonTopics.map(topic => (
                          <div key={topic.id} className="curriculum-item">
                            <span className="curriculum-item-order">
                              {topic.order_index}
                            </span>
                            <span className="curriculum-item-title">{topic.title}</span>
                            <div className="curriculum-item-actions">
                              <button
                                className="action-btn edit"
                                onClick={() => startEditTopic(topic)}
                              >
                                Editar
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => confirmDeleteTopic(topic)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quizzes section */}
                    <div className="curriculum-section">
                      <div className="curriculum-section-header">
                        <h4 className="curriculum-section-title">Quizzes</h4>
                        <button
                          className="curriculum-add-btn"
                          onClick={() => startCreateQuiz(lesson.id)}
                        >
                          + Agregar
                        </button>
                      </div>
                      {lessonQuizzes.length === 0 ? (
                        <p className="curriculum-empty">Sin quizzes</p>
                      ) : (
                        lessonQuizzes.map(quiz => (
                          <div key={quiz.id} className="curriculum-item">
                            <span className="curriculum-item-order">
                              {quiz.order_index}
                            </span>
                            <span className="curriculum-item-title">{quiz.title}</span>
                            <div className="curriculum-item-actions">
                              <button
                                className="action-btn edit"
                                onClick={() => startEditQuiz(quiz)}
                              >
                                Editar
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => confirmDeleteQuiz(quiz)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Resources section */}
                    <div className="curriculum-section">
                      <div className="curriculum-section-header">
                        <h4 className="curriculum-section-title">Recursos</h4>
                        <button
                          className="curriculum-add-btn"
                          onClick={() => startCreateResource(lesson.id)}
                        >
                          + Agregar
                        </button>
                      </div>
                      {lessonResources.length === 0 ? (
                        <p className="curriculum-empty">Sin recursos</p>
                      ) : (
                        lessonResources.map(resource => (
                          <div key={resource.id} className="curriculum-item">
                            <span className="curriculum-item-title">
                              {resource.title}
                            </span>
                            <span className="status-badge" style={{ fontSize: '11px', marginLeft: '8px' }}>
                              {{ document: 'Documento', spreadsheet: 'Hoja de cálculo', presentation: 'Presentación', video: 'Video', image: 'Imagen', link: 'Enlace', other: 'Otro' }[resource.resource_type] || resource.resource_type}
                            </span>
                            {resource.file_size > 0 && (
                              <span className="curriculum-item-size">
                                {formatFileSize(resource.file_size)}
                              </span>
                            )}
                            <div className="curriculum-item-actions">
                              <button
                                className="action-btn edit"
                                onClick={() => startEditResource(resource)}
                              >
                                Editar
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => confirmDeleteResource(resource)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add lesson button */}
          <button className="curriculum-add-lesson-btn" onClick={startCreateLesson}>
            + Agregar Lección
          </button>

          {/* Inline editing panel */}
          {editingType && (
            <div className="curriculum-edit-panel">
              <div className="curriculum-edit-panel-header">
                <h3 className="form-title">
                  {editingId ? 'Editar' : 'Crear'}{' '}
                  {editingType === 'lesson'
                    ? 'Lección'
                    : editingType === 'topic'
                      ? 'Tema'
                      : editingType === 'quiz'
                        ? 'Quiz'
                        : 'Recurso'}
                </h3>
                <button className="back-btn" onClick={cancelEditing}>
                  Cancelar
                </button>
              </div>

              {editingType === 'lesson' && (
                <form className="admin-form" onSubmit={handleLessonSubmit}>
                  <div className="form-group">
                    <label>
                      Título <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={e =>
                        setLessonForm({ ...lessonForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Thumbnail{' '}
                      <span className="label-hint">(16:9, mín. 400x225px)</span>
                    </label>
                    {lessonThumbnailPreview && (
                      <div className="thumbnail-preview">
                        <img src={lessonThumbnailPreview} alt="Preview" />
                        <button
                          type="button"
                          className="thumbnail-delete"
                          onClick={() => {
                            setLessonThumbnail(null);
                            setLessonThumbnailPreview('');
                            setDeleteLessonThumbnail(true);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLessonThumbnailChange}
                      className="file-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>URL de Video <span className="label-hint">(YouTube, Vimeo o enlace directo)</span></label>
                    <input
                      type="text"
                      value={lessonForm.video_url}
                      onChange={e =>
                        setLessonForm({ ...lessonForm, video_url: e.target.value })
                      }
                      placeholder="https://vimeo.com/... o https://youtube.com/..."
                    />
                  </div>
                  <div className="form-group">
                    <label>O subir video <span className="label-hint">(MP4, max 500MB)</span></label>
                    {lessonVideoFile && (
                      <div className="thumbnail-preview">
                        <span>{lessonVideoFile.name} ({(lessonVideoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                        <button type="button" className="thumbnail-delete" onClick={() => setLessonVideoFile(null)}>×</button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={e => setLessonVideoFile(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea
                      value={lessonForm.content}
                      onChange={e =>
                        setLessonForm({ ...lessonForm, content: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input
                      type="number"
                      min="1"
                      value={lessonForm.order_index}
                      onChange={e =>
                        setLessonForm({
                          ...lessonForm,
                          order_index: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={cancelEditing}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      {editingId ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}

              {editingType === 'topic' && (
                <form className="admin-form" onSubmit={handleTopicSubmit}>
                  <div className="form-group">
                    <label>
                      Título <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={topicForm.title}
                      onChange={e =>
                        setTopicForm({ ...topicForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>URL de Video <span className="label-hint">(YouTube, Vimeo o enlace directo)</span></label>
                    <input
                      type="text"
                      value={topicForm.video_url}
                      onChange={e =>
                        setTopicForm({ ...topicForm, video_url: e.target.value })
                      }
                      placeholder="https://vimeo.com/... o https://youtube.com/..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea
                      value={topicForm.content}
                      onChange={e =>
                        setTopicForm({ ...topicForm, content: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input
                      type="number"
                      min="1"
                      value={topicForm.order_index}
                      onChange={e =>
                        setTopicForm({
                          ...topicForm,
                          order_index: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={cancelEditing}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      {editingId ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}

              {editingType === 'quiz' && (
                <form className="admin-form" onSubmit={handleQuizSubmit}>
                  <div className="form-group">
                    <label>
                      Título <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={quizForm.title}
                      onChange={e =>
                        setQuizForm({ ...quizForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contenido</label>
                    <textarea
                      value={quizForm.content}
                      onChange={e =>
                        setQuizForm({ ...quizForm, content: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input
                      type="number"
                      min="1"
                      value={quizForm.order_index}
                      onChange={e =>
                        setQuizForm({
                          ...quizForm,
                          order_index: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={cancelEditing}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      {editingId ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}

              {editingType === 'resource' && (
                <form className="admin-form" onSubmit={handleResourceSubmit}>
                  <div className="form-group">
                    <label>
                      Título <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={resourceForm.title}
                      onChange={e =>
                        setResourceForm({ ...resourceForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de recurso</label>
                    <select
                      value={resourceForm.resource_type}
                      onChange={e =>
                        setResourceForm({ ...resourceForm, resource_type: e.target.value })
                      }
                    >
                      <option value="document">Documento</option>
                      <option value="spreadsheet">Hoja de cálculo</option>
                      <option value="presentation">Presentación</option>
                      <option value="video">Video</option>
                      <option value="image">Imagen</option>
                      <option value="link">Enlace</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Archivo</label>
                    <input
                      type="file"
                      onChange={e => setResourceFile(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>O URL externa</label>
                    <input
                      type="text"
                      value={resourceForm.file_url}
                      onChange={e =>
                        setResourceForm({ ...resourceForm, file_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={cancelEditing}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      {editingId ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}

              {editingType === 'course-resource' && (
                <form className="admin-form" onSubmit={handleCourseResourceSubmit}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#F2F2F2' }}>
                    {editingId ? 'Editar Recurso del Curso' : 'Crear Recurso del Curso'}
                  </h3>
                  <div className="form-group">
                    <label>
                      Título <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={courseResourceForm.title}
                      onChange={e =>
                        setCourseResourceForm({ ...courseResourceForm, title: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de recurso</label>
                    <select
                      value={courseResourceForm.resource_type}
                      onChange={e =>
                        setCourseResourceForm({ ...courseResourceForm, resource_type: e.target.value })
                      }
                    >
                      <option value="document">Documento</option>
                      <option value="spreadsheet">Hoja de cálculo</option>
                      <option value="presentation">Presentación</option>
                      <option value="video">Video</option>
                      <option value="image">Imagen</option>
                      <option value="link">Enlace</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Archivo</label>
                    <input
                      type="file"
                      onChange={e => setCourseResourceFile(e.target.files?.[0] || null)}
                      className="file-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>O URL externa</label>
                    <input
                      type="text"
                      value={courseResourceForm.file_url}
                      onChange={e =>
                        setCourseResourceForm({ ...courseResourceForm, file_url: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Orden</label>
                    <input
                      type="number"
                      value={courseResourceForm.order_index}
                      onChange={e =>
                        setCourseResourceForm({ ...courseResourceForm, order_index: Number(e.target.value) })
                      }
                      min={0}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={cancelEditing}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-submit">
                      {editingId ? 'Guardar' : 'Crear'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== Evaluaciones tab ===== */}
      {activeTab === 'evaluaciones' && (
        <div style={{ maxWidth: 800, padding: '20px 0' }}>
          {/* Form management */}
          {!evalForm && !creatingEvalForm && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ color: 'rgba(242,242,242,0.6)', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', marginBottom: 16 }}>
                Este curso no tiene formulario de evaluación.
              </p>
              <button className="btn-submit" onClick={() => setCreatingEvalForm(true)}>
                Crear formulario de evaluación
              </button>
            </div>
          )}

          {!evalForm && creatingEvalForm && (
            <div className="curriculum-edit-panel" style={{ margin: '0 0 20px' }}>
              <h4 style={{ color: '#F2F2F2', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem', marginBottom: 16 }}>Nuevo formulario</h4>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Título</label>
                <input className="form-input" value={evalFormTitle} onChange={e => setEvalFormTitle(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Descripción (opcional)</label>
                <textarea className="form-input" rows={2} value={evalFormDesc} onChange={e => setEvalFormDesc(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-submit" onClick={async () => {
                  const { ok, data } = await adminApi.createEvaluationForm({
                    course_id: Number(id), title: evalFormTitle, description: evalFormDesc,
                  });
                  if (ok) { setEvalForm(data); setCreatingEvalForm(false); showSuccess('Formulario creado.'); }
                  else showError('Error al crear formulario.');
                }}>Crear</button>
                <button className="btn-cancel" onClick={() => setCreatingEvalForm(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {evalForm && (
            <>
              {/* Form header */}
              <div className="curriculum-lesson-card" style={{ marginBottom: 20, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h4 style={{ color: '#F2F2F2', fontFamily: "'Poppins', sans-serif", fontSize: '0.95rem', margin: 0 }}>
                      {evalForm.title}
                    </h4>
                    {evalForm.description && (
                      <p style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.8rem', margin: '4px 0 0' }}>{evalForm.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`status-badge ${evalForm.is_active ? 'active' : 'inactive'}`}>
                      {evalForm.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      className="action-btn"
                      title={evalForm.is_active ? 'Desactivar' : 'Activar'}
                      onClick={async () => {
                        const { ok, data } = await adminApi.updateEvaluationForm(evalForm.id, {
                          is_active: !evalForm.is_active, title: evalForm.title, description: evalForm.description,
                        });
                        if (ok) { setEvalForm(data); showSuccess(data.is_active ? 'Formulario activado.' : 'Formulario desactivado.'); }
                      }}
                    >
                      {evalForm.is_active ? '⏸' : '▶'}
                    </button>
                    <button
                      className="action-btn delete"
                      title="Eliminar formulario"
                      onClick={() => {
                        setConfirmTitle('Eliminar formulario');
                        setConfirmMessage('¿Eliminar el formulario de evaluación y todas sus preguntas y respuestas?');
                        setConfirmAction(() => async () => {
                          const { ok } = await adminApi.deleteEvaluationForm(evalForm.id);
                          if (ok) { setEvalForm(null); setEvalResponses(null); setShowEvalResults(false); showSuccess('Formulario eliminado.'); }
                          else showError('Error al eliminar.');
                        });
                        setConfirmOpen(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p style={{ color: 'rgba(242,242,242,0.4)', fontSize: '0.8rem', margin: '8px 0 0' }}>
                  {evalForm.responses_count} respuesta{evalForm.responses_count !== 1 ? 's' : ''} recibida{evalForm.responses_count !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Questions list */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ color: '#F2F2F2', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', margin: 0 }}>
                    Preguntas ({evalForm.questions?.length || 0})
                  </h4>
                  <button className="curriculum-add-btn" onClick={() => {
                    setCreatingEvalQuestion(true);
                    setEditingEvalQuestion(null);
                    setEvalQuestionForm({ question_text: '', question_type: 'rating', options: [], is_required: true, order_index: (evalForm.questions?.length || 0) + 1 });
                  }}>+ Agregar pregunta</button>
                </div>

                {evalForm.questions?.map(q => (
                  <div key={q.id} className="curriculum-lesson-card" style={{ marginBottom: 8, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: 'rgba(242,242,242,0.4)', fontSize: '0.75rem', marginRight: 8 }}>#{q.order_index}</span>
                        <span style={{ color: '#F2F2F2', fontSize: '0.85rem' }}>{q.question_text}</span>
                        <span className="status-badge" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                          {q.question_type === 'rating' ? 'Estrellas' : q.question_type === 'scale' ? 'Escala' : q.question_type === 'nps' ? 'NPS' : q.question_type === 'yes_no' ? 'Sí/No' : q.question_type === 'multiple_choice' ? 'Opción múlt.' : 'Texto'}
                        </span>
                        {q.is_required && <span style={{ color: '#FF5A2F', fontSize: '0.75rem', marginLeft: 6 }}>*</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="action-btn" onClick={() => {
                          setEditingEvalQuestion(q.id);
                          setCreatingEvalQuestion(false);
                          setEvalQuestionForm({
                            question_text: q.question_text, question_type: q.question_type,
                            options: q.options || [], is_required: q.is_required, order_index: q.order_index,
                          });
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="action-btn delete" onClick={() => {
                          setConfirmTitle('Eliminar pregunta');
                          setConfirmMessage(`¿Eliminar "${q.question_text.substring(0, 50)}"?`);
                          setConfirmAction(() => async () => {
                            const { ok } = await adminApi.deleteEvaluationQuestion(q.id);
                            if (ok) {
                              setEvalForm(prev => prev ? { ...prev, questions: prev.questions.filter(x => x.id !== q.id) } : null);
                              showSuccess('Pregunta eliminada.');
                            } else showError('Error al eliminar.');
                          });
                          setConfirmOpen(true);
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Question edit/create form */}
              {(creatingEvalQuestion || editingEvalQuestion !== null) && (
                <div className="curriculum-edit-panel" style={{ marginBottom: 20 }}>
                  <h4 style={{ color: '#F2F2F2', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', marginBottom: 16 }}>
                    {editingEvalQuestion ? 'Editar pregunta' : 'Nueva pregunta'}
                  </h4>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Texto de la pregunta</label>
                    <textarea className="form-input" rows={2} value={evalQuestionForm.question_text}
                      onChange={e => setEvalQuestionForm(p => ({ ...p, question_text: e.target.value }))} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select className="form-input" value={evalQuestionForm.question_type}
                        onChange={e => setEvalQuestionForm(p => ({ ...p, question_type: e.target.value }))}>
                        <option value="rating">Estrellas (1-5)</option>
                        <option value="scale">Escala (1-10)</option>
                        <option value="nps">NPS (0-10)</option>
                        <option value="yes_no">Sí/No</option>
                        <option value="multiple_choice">Opción múltiple</option>
                        <option value="text">Texto libre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Orden</label>
                      <input className="form-input" type="number" min={1} value={evalQuestionForm.order_index}
                        onChange={e => setEvalQuestionForm(p => ({ ...p, order_index: Number(e.target.value) }))} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                      <label style={{ color: 'rgba(242,242,242,0.7)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={evalQuestionForm.is_required}
                          onChange={e => setEvalQuestionForm(p => ({ ...p, is_required: e.target.checked }))} />
                        Obligatoria
                      </label>
                    </div>
                  </div>

                  {evalQuestionForm.question_type === 'multiple_choice' && (
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Opciones</label>
                      {evalQuestionForm.options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <input className="form-input" style={{ flex: 1 }} value={opt}
                            onChange={e => {
                              const opts = [...evalQuestionForm.options];
                              opts[i] = e.target.value;
                              setEvalQuestionForm(p => ({ ...p, options: opts }));
                            }} />
                          <button className="action-btn delete" onClick={() => {
                            setEvalQuestionForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i) }));
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input className="form-input" style={{ flex: 1 }} placeholder="Nueva opción..."
                          value={newOption} onChange={e => setNewOption(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newOption.trim()) {
                              e.preventDefault();
                              setEvalQuestionForm(p => ({ ...p, options: [...p.options, newOption.trim()] }));
                              setNewOption('');
                            }
                          }} />
                        <button className="curriculum-add-btn" onClick={() => {
                          if (newOption.trim()) {
                            setEvalQuestionForm(p => ({ ...p, options: [...p.options, newOption.trim()] }));
                            setNewOption('');
                          }
                        }}>+</button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-submit" onClick={async () => {
                      if (!evalQuestionForm.question_text.trim()) { showError('Ingresa el texto de la pregunta.'); return; }
                      if (editingEvalQuestion) {
                        const { ok, data } = await adminApi.updateEvaluationQuestion(editingEvalQuestion, {
                          ...evalQuestionForm, form_id: evalForm.id,
                        });
                        if (ok) {
                          setEvalForm(prev => prev ? { ...prev, questions: prev.questions.map(q => q.id === data.id ? data : q) } : null);
                          setEditingEvalQuestion(null);
                          showSuccess('Pregunta actualizada.');
                        } else showError('Error al actualizar.');
                      } else {
                        const { ok, data } = await adminApi.createEvaluationQuestion({
                          ...evalQuestionForm, form_id: evalForm.id,
                        });
                        if (ok) {
                          setEvalForm(prev => prev ? { ...prev, questions: [...prev.questions, data] } : null);
                          setCreatingEvalQuestion(false);
                          setEvalQuestionForm({ question_text: '', question_type: 'rating', options: [], is_required: true, order_index: (evalForm.questions?.length || 0) + 2 });
                          showSuccess('Pregunta creada.');
                        } else showError('Error al crear pregunta.');
                      }
                    }}>
                      {editingEvalQuestion ? 'Guardar' : 'Crear'}
                    </button>
                    <button className="btn-cancel" onClick={() => { setCreatingEvalQuestion(false); setEditingEvalQuestion(null); }}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Results section */}
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn-submit"
                  style={{ background: evalForm.responses_count > 0 ? undefined : '#555' }}
                  disabled={evalForm.responses_count === 0}
                  onClick={async () => {
                    if (showEvalResults) { setShowEvalResults(false); return; }
                    const { ok, data } = await adminApi.getEvaluationResponses(evalForm.id);
                    if (ok) { setEvalResponses(data); setShowEvalResults(true); }
                    else showError('Error al cargar resultados.');
                  }}
                >
                  {showEvalResults ? 'Ocultar resultados' : `Ver resultados (${evalForm.responses_count})`}
                </button>
              </div>

              {showEvalResults && evalResponses && (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ color: '#F2F2F2', fontFamily: "'Poppins', sans-serif", fontSize: '0.9rem', marginBottom: 16 }}>
                    Resultados — {evalResponses.total_responses} respuesta{evalResponses.total_responses !== 1 ? 's' : ''}
                  </h4>
                  {evalResponses.statistics.map(stat => (
                    <div key={stat.question_id} className="curriculum-lesson-card" style={{ marginBottom: 12, padding: '16px' }}>
                      <p style={{ color: '#F2F2F2', fontSize: '0.85rem', fontWeight: 500, margin: '0 0 10px' }}>{stat.question_text}</p>

                      {(stat.question_type === 'rating' || stat.question_type === 'scale') && (
                        <div>
                          <span style={{ color: '#FF5A2F', fontSize: '1.6rem', fontWeight: 700, fontFamily: "'Libre Franklin', sans-serif" }}>
                            {stat.average}
                          </span>
                          <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.8rem', marginLeft: 6 }}>
                            / {stat.question_type === 'rating' ? '5' : '10'} promedio
                          </span>
                          {stat.distribution && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                              {Object.entries(stat.distribution).sort(([a], [b]) => Number(a) - Number(b)).map(([val, count]) => (
                                <div key={val} style={{ textAlign: 'center' }}>
                                  <div style={{
                                    width: 28, height: Math.max(6, (count / stat.total_answers) * 60),
                                    background: '#FF5A2F', borderRadius: 3, marginBottom: 2,
                                  }} />
                                  <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.7rem' }}>{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {stat.question_type === 'nps' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                            <span style={{
                              color: (stat.nps_score ?? 0) >= 50 ? '#27ae60' : (stat.nps_score ?? 0) >= 0 ? '#f39c12' : '#e74c3c',
                              fontSize: '2rem', fontWeight: 700, fontFamily: "'Libre Franklin', sans-serif",
                            }}>
                              {stat.nps_score ?? 0}
                            </span>
                            <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.8rem' }}>NPS Score</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                            <div>
                              <span style={{ color: '#27ae60', fontSize: '1rem', fontWeight: 600 }}>{stat.promoters || 0}</span>
                              <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.75rem', marginLeft: 4 }}>Promotores (9-10)</span>
                            </div>
                            <div>
                              <span style={{ color: '#f39c12', fontSize: '1rem', fontWeight: 600 }}>{stat.passives || 0}</span>
                              <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.75rem', marginLeft: 4 }}>Pasivos (7-8)</span>
                            </div>
                            <div>
                              <span style={{ color: '#e74c3c', fontSize: '1rem', fontWeight: 600 }}>{stat.detractors || 0}</span>
                              <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.75rem', marginLeft: 4 }}>Detractores (0-6)</span>
                            </div>
                          </div>
                          {stat.distribution && (
                            <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
                              {Object.entries(stat.distribution).sort(([a], [b]) => Number(a) - Number(b)).map(([val, count]) => {
                                const n = Number(val);
                                const color = n <= 6 ? '#e74c3c' : n <= 8 ? '#f39c12' : '#27ae60';
                                return (
                                  <div key={val} style={{ textAlign: 'center' }}>
                                    <div style={{
                                      width: 24, height: Math.max(6, (count / stat.total_answers) * 60),
                                      background: color, borderRadius: 3, marginBottom: 2,
                                    }} />
                                    <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.65rem' }}>{val}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {stat.question_type === 'yes_no' && (
                        <div style={{ display: 'flex', gap: 16 }}>
                          <div>
                            <span style={{ color: '#A3C94A', fontSize: '1.2rem', fontWeight: 600 }}>{stat.yes_count || 0}</span>
                            <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.8rem', marginLeft: 4 }}>Sí</span>
                          </div>
                          <div>
                            <span style={{ color: '#FF5A2F', fontSize: '1.2rem', fontWeight: 600 }}>{stat.no_count || 0}</span>
                            <span style={{ color: 'rgba(242,242,242,0.5)', fontSize: '0.8rem', marginLeft: 4 }}>No</span>
                          </div>
                        </div>
                      )}

                      {stat.question_type === 'multiple_choice' && stat.distribution && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {Object.entries(stat.distribution).sort(([, a], [, b]) => b - a).map(([option, count]) => (
                            <div key={option} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 8, background: 'rgba(242,242,242,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{
                                  width: `${stat.total_answers > 0 ? (count / stat.total_answers) * 100 : 0}%`,
                                  height: '100%', background: '#FF5A2F', borderRadius: 4,
                                }} />
                              </div>
                              <span style={{ color: 'rgba(242,242,242,0.7)', fontSize: '0.8rem', minWidth: 80 }}>{option}</span>
                              <span style={{ color: 'rgba(242,242,242,0.4)', fontSize: '0.75rem' }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {stat.question_type === 'text' && stat.sample_answers && (
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {stat.sample_answers.map((ans, i) => (
                            <div key={i} style={{
                              padding: '8px 12px', margin: '4px 0', background: 'rgba(242,242,242,0.05)',
                              borderRadius: 6, color: 'rgba(242,242,242,0.8)', fontSize: '0.8rem',
                            }}>
                              {ans}
                            </div>
                          ))}
                        </div>
                      )}

                      <span style={{ color: 'rgba(242,242,242,0.3)', fontSize: '0.7rem', marginTop: 8, display: 'block' }}>
                        {stat.total_answers} respuesta{stat.total_answers !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== Información tab ===== */}
      {activeTab === 'info' && course && (
        <div className="form-section" style={{ maxWidth: 800 }}>
          <h3 className="form-section-title">Detalles del curso</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              gap: '12px 16px',
              color: '#F2F2F2',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '0.9rem',
            }}
          >
            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Título</span>
            <span>{course.title}</span>

            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Slug</span>
            <span>{course.slug}</span>

            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Categoría</span>
            <span>{course.category?.name || 'Sin categoría'}</span>

            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Nivel</span>
            <span>
              {course.level === 'beginner'
                ? 'Principiante'
                : course.level === 'intermediate'
                  ? 'Intermedio'
                  : 'Avanzado'}
            </span>

            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Duración</span>
            <span>{course.duration_hours}h</span>

            <span style={{ color: 'rgba(242,242,242,0.5)' }}>Estado</span>
            <span>
              <span
                className={`status-badge ${course.is_published ? 'active' : 'inactive'}`}
              >
                {course.is_published ? 'Publicado' : 'Borrador'}
              </span>
              {course.is_featured && (
                <span className="status-badge admin" style={{ marginLeft: 8 }}>
                  Destacado
                </span>
              )}
            </span>

            {course.short_description && (
              <>
                <span style={{ color: 'rgba(242,242,242,0.5)' }}>Descripción</span>
                <span>{course.short_description}</span>
              </>
            )}

            {course.instructor && (
              <>
                <span style={{ color: 'rgba(242,242,242,0.5)' }}>Instructor</span>
                <span>{course.instructor}</span>
              </>
            )}
          </div>
          <div style={{ marginTop: 24 }}>
            <button
              className="btn-submit"
              onClick={() =>
                navigate('/admin/cursos', { state: { editCourseId: Number(id) } })
              }
            >
              Editar información
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={async () => {
          if (confirmAction) await confirmAction();
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
