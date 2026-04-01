import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '../AdminContext';
import { type Topic } from '../AdminContext';
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

export default function AdminTopics() {
  const { courses, showSuccess, showError, clearMessages, getCourseName, getLessonName, getLessonsForCourse } = useAdmin();

  const [view, setView] = useState<ViewType>('list');
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [form, setForm] = useState(initialForm);

  // Local topics state (not in context)
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCourseId, setFilterCourseId] = useState<number>(0);
  const [filterLessonId, setFilterLessonId] = useState<number>(0);

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);

  // ---- Load topics ----

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTopics();
      if (res.ok) setTopics(extractArray(res.data) as Topic[]);
    } catch {
      showError('Error al cargar temas.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // ---- Filtered data ----

  const filteredTopics = useMemo(() => {
    let filtered = topics;
    if (filterCourseId) filtered = filtered.filter((t) => t.course_id === filterCourseId);
    if (filterLessonId) filtered = filtered.filter((t) => t.lesson_id === filterLessonId);
    return filtered;
  }, [topics, filterCourseId, filterLessonId]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
  };

  const goBackToList = () => {
    setView('list');
    setEditingTopic(null);
    resetForm();
    clearMessages();
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingTopic(null);
    clearMessages();
    // Pre-fill from filters
    const prefilled = { ...initialForm };
    if (filterCourseId) prefilled.course_id = filterCourseId;
    if (filterLessonId) prefilled.lesson_id = filterLessonId;
    setForm(prefilled);
    setView('create');
  };

  const openEdit = (topic: Topic) => {
    setEditingTopic(topic);
    clearMessages();
    setForm({
      title: topic.title,
      content: topic.content || '',
      course_id: topic.course_id,
      lesson_id: topic.lesson_id,
      order_index: topic.order_index,
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
        const { ok, data } = await adminApi.createTopic(form);
        if (ok) {
          setTopics([...topics, data]);
          showSuccess('Tema creado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear tema.');
        }
      } else if (editingTopic) {
        const { ok, data } = await adminApi.updateTopic(editingTopic.id, form);
        if (ok) {
          setTopics(topics.map((t) => (t.id === data.id ? data : t)));
          showSuccess('Tema actualizado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar tema.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (topic: Topic) => {
    setDeletingTopic(topic);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTopic) return;
    try {
      const { ok } = await adminApi.deleteTopic(deletingTopic.id);
      if (ok) {
        setTopics(topics.filter((t) => t.id !== deletingTopic.id));
        showSuccess('Tema eliminado.');
      } else {
        showError('Error al eliminar tema.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeletingTopic(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Topic>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Titulo' },
    {
      key: 'course_id',
      label: 'Curso',
      render: (topic) => getCourseName(topic.course_id),
    },
    {
      key: 'lesson_id',
      label: 'Leccion',
      render: (topic) => getLessonName(topic.lesson_id),
    },
    { key: 'order_index', label: 'Orden' },
  ];

  // ---- Filters ----

  const handleFilterCourseChange = (courseId: number) => {
    setFilterCourseId(courseId);
    setFilterLessonId(0);
  };

  const filters = (
    <div className="admin-filters">
      <select
        value={filterCourseId}
        onChange={(e) => handleFilterCourseChange(Number(e.target.value))}
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
  );

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Temas"
          action={{ label: '+ Crear Tema', onClick: openCreate }}
        />
        <DataTable<Topic>
          columns={columns}
          data={filteredTopics}
          loading={loading}
          filters={filters}
          emptyMessage="No se encontraron temas."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar tema"
          message="¿Eliminar este tema? Esta accion no se puede deshacer."
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingTopic(null); }}
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
            {view === 'create' ? 'Crear Tema' : 'Editar Tema'}
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
