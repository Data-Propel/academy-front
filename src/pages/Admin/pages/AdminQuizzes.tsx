import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../AdminContext';
import { type Quiz } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type ViewType = 'list' | 'create' | 'edit';

const initialForm = {
  title: '',
  content: '',
  course_id: 0,
  lesson_id: 0,
  order_index: 1,
};

const extractArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results))
    return (data as { results: unknown[] }).results;
  return [];
};

export default function AdminQuizzes() {
  const { courses, showSuccess, showError, clearMessages, getCourseName, getLessonName, getLessonsForCourse } = useAdmin();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewType>('list');
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [form, setForm] = useState(initialForm);

  // Filters
  const [filterCourseId, setFilterCourseId] = useState<number>(0);
  const [filterLessonId, setFilterLessonId] = useState<number>(0);

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingQuiz, setDeletingQuiz] = useState<Quiz | null>(null);

  // ---- Data loading ----

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getQuizzes();
      if (res.ok) setQuizzes(extractArray(res.data) as Quiz[]);
    } catch {
      showError('Error al cargar quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filtered data ----

  const filteredQuizzes = useMemo(() => {
    let filtered = quizzes;
    if (filterCourseId) filtered = filtered.filter((q) => q.course_id === filterCourseId);
    if (filterLessonId) filtered = filtered.filter((q) => q.lesson_id === filterLessonId);
    return filtered;
  }, [quizzes, filterCourseId, filterLessonId]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
  };

  const goBackToList = () => {
    setView('list');
    setEditingQuiz(null);
    resetForm();
    clearMessages();
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingQuiz(null);
    clearMessages();
    setForm({
      ...initialForm,
      course_id: filterCourseId,
      lesson_id: filterLessonId,
    });
    setView('create');
  };

  const openEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    clearMessages();
    setForm({
      title: quiz.title,
      content: quiz.content || '',
      course_id: quiz.course_id,
      lesson_id: quiz.lesson_id,
      order_index: quiz.order_index,
    });
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!form.course_id) {
      showError('Selecciona un curso.');
      return;
    }
    if (!form.lesson_id) {
      showError('Selecciona una leccion.');
      return;
    }

    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createQuiz(form);
        if (ok) {
          setQuizzes([...quizzes, data]);
          showSuccess('Quiz creado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear quiz.');
        }
      } else if (editingQuiz) {
        const { ok, data } = await adminApi.updateQuiz(editingQuiz.id, form);
        if (ok) {
          setQuizzes(quizzes.map((q) => (q.id === data.id ? data : q)));
          showSuccess('Quiz actualizado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar quiz.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (quiz: Quiz) => {
    setDeletingQuiz(quiz);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQuiz) return;
    try {
      const { ok } = await adminApi.deleteQuiz(deletingQuiz.id);
      if (ok) {
        setQuizzes(quizzes.filter((q) => q.id !== deletingQuiz.id));
        showSuccess('Quiz eliminado.');
      } else {
        showError('Error al eliminar quiz.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeletingQuiz(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Quiz>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Titulo' },
    {
      key: 'course_id',
      label: 'Curso',
      render: (quiz) => getCourseName(quiz.course_id),
    },
    {
      key: 'lesson_id',
      label: 'Leccion',
      render: (quiz) => getLessonName(quiz.lesson_id),
    },
    { key: 'order_index', label: 'Orden' },
  ];

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Quizzes"
          action={{ label: '+ Crear Quiz', onClick: openCreate }}
        />
        <DataTable<Quiz>
          columns={columns}
          data={filteredQuizzes}
          loading={loading}
          emptyMessage="No se encontraron quizzes."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
          filters={
            <div className="admin-filters">
              <select
                value={filterCourseId}
                onChange={(e) => {
                  setFilterCourseId(Number(e.target.value));
                  setFilterLessonId(0);
                }}
              >
                <option value={0}>Todos los cursos</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {filterCourseId > 0 && (
                <select
                  value={filterLessonId}
                  onChange={(e) => setFilterLessonId(Number(e.target.value))}
                >
                  <option value={0}>Todas las lecciones</option>
                  {getLessonsForCourse(filterCourseId).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          }
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar quiz"
          message="¿Eliminar este quiz? Esta accion no se puede deshacer."
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingQuiz(null); }}
        />
      </div>
    );
  }

  // Create / Edit form
  return (
    <div className="admin-content">
      <div className="admin-form-container">
        <div className="admin-form-header">
          <button type="button" className="back-btn" onClick={goBackToList}>
            ← Volver
          </button>
          <h2 className="form-title">
            {view === 'create' ? 'Crear Quiz' : 'Editar Quiz'}
          </h2>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>
                Curso <span className="required">*</span>
              </label>
              <select
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: Number(e.target.value), lesson_id: 0 })}
                required
              >
                <option value={0}>Seleccionar curso</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                Leccion <span className="required">*</span>
              </label>
              <select
                value={form.lesson_id}
                onChange={(e) => setForm({ ...form, lesson_id: Number(e.target.value) })}
                required
                disabled={!form.course_id}
              >
                <option value={0}>Seleccionar leccion</option>
                {getLessonsForCourse(form.course_id).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              Titulo <span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Contenido</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>Orden</label>
            <input
              type="number"
              min={1}
              value={form.order_index}
              onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={goBackToList}>
              Cancelar
            </button>
            <button type="submit" className="btn-submit">
              {view === 'create' ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
