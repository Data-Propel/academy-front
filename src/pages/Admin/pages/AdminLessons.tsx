import { useState, useMemo } from 'react';
import { useAdmin } from '../AdminContext';
import { type Lesson } from '../AdminContext';
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
  order_index: 1,
};

export default function AdminLessons() {
  const { courses, lessons, setLessons, loading, showSuccess, showError, clearMessages, getCourseName } = useAdmin();

  const [view, setView] = useState<ViewType>('list');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState(initialForm);

  // Filter
  const [filterCourseId, setFilterCourseId] = useState<number>(0);

  // Thumbnail state
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailError, setThumbnailError] = useState('');
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);

  // ---- Filtered data ----

  const filteredLessons = useMemo(() => {
    if (!filterCourseId) return lessons;
    return lessons.filter((l) => l.course_id === filterCourseId);
  }, [lessons, filterCourseId]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
    setThumbnail(null);
    setThumbnailPreview('');
    setThumbnailError('');
    setDeleteThumbnail(false);
  };

  const goBackToList = () => {
    setView('list');
    setEditingLesson(null);
    resetForm();
    clearMessages();
  };

  // ---- Thumbnail handling ----

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setThumbnailError('El archivo debe ser una imagen.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setThumbnailError('La imagen es muy grande. Maximo 5MB.');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const ratio = w / h;

      if (w < 400 || h < 225) {
        setThumbnailError(`Imagen muy pequena. Minimo 400x225px. Tu imagen: ${w}x${h}px`);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      if (Math.abs(ratio - 16 / 9) > 0.25) {
        setThumbnailError(`La imagen debe ser 16:9 (ej: 1280x720). Tu imagen: ${w}x${h}px`);
        URL.revokeObjectURL(blobUrl);
        return;
      }

      setThumbnailError('');
      setThumbnail(file);
      setThumbnailPreview(blobUrl);
      setDeleteThumbnail(false);
    };
    img.onerror = () => {
      setThumbnailError('No se pudo cargar la imagen.');
      URL.revokeObjectURL(blobUrl);
    };
    img.src = blobUrl;
  };

  const handleDeleteThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview('');
    setDeleteThumbnail(true);
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingLesson(null);
    clearMessages();
    // Pre-fill course_id from filter
    if (filterCourseId) {
      setForm((prev) => ({ ...prev, course_id: filterCourseId }));
    }
    setView('create');
  };

  const openEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    clearMessages();
    setForm({
      title: lesson.title,
      content: lesson.content || '',
      course_id: lesson.course_id,
      order_index: lesson.order_index,
    });
    setThumbnail(null);
    setThumbnailPreview(lesson.thumbnail || '');
    setThumbnailError('');
    setDeleteThumbnail(false);
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!form.course_id) {
      showError('Selecciona un curso.');
      return;
    }

    if (view === 'create' && !thumbnail) {
      showError('Debes seleccionar una imagen de thumbnail.');
      return;
    }

    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createLesson(form, thumbnail || undefined);
        if (ok) {
          setLessons([...lessons, data]);
          showSuccess('Leccion creada.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear leccion.');
        }
      } else if (editingLesson) {
        const { ok, data } = await adminApi.updateLesson(
          editingLesson.id,
          form,
          thumbnail || undefined,
          deleteThumbnail,
        );
        if (ok) {
          setLessons(lessons.map((l) => (l.id === data.id ? data : l)));
          showSuccess('Leccion actualizada.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar leccion.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (lesson: Lesson) => {
    setDeletingLesson(lesson);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLesson) return;
    try {
      const { ok } = await adminApi.deleteLesson(deletingLesson.id);
      if (ok) {
        setLessons(lessons.filter((l) => l.id !== deletingLesson.id));
        showSuccess('Leccion eliminada.');
      } else {
        showError('Error al eliminar leccion.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeletingLesson(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Lesson>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Titulo' },
    {
      key: 'course_id',
      label: 'Curso',
      render: (lesson) => getCourseName(lesson.course_id),
    },
    { key: 'order_index', label: 'Orden' },
  ];

  // ---- Filters ----

  const filters = (
    <div className="admin-filters">
      <select
        value={filterCourseId}
        onChange={(e) => setFilterCourseId(Number(e.target.value))}
      >
        <option value={0}>Todos los cursos</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Lecciones"
          action={{ label: '+ Crear Leccion', onClick: openCreate }}
        />
        <DataTable<Lesson>
          columns={columns}
          data={filteredLessons}
          loading={loading}
          filters={filters}
          emptyMessage="No se encontraron lecciones."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar leccion"
          message="¿Eliminar esta leccion? Esta accion no se puede deshacer."
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingLesson(null); }}
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
            {view === 'create' ? 'Crear Leccion' : 'Editar Leccion'}
          </h2>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Curso <span className="required">*</span>
            </label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })}
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
            <label>
              Thumbnail {view === 'create' && <span className="required">*</span>}
              <span className="label-hint">(16:9, min. 400x225px)</span>
            </label>
            {thumbnailPreview && (
              <div className="thumbnail-preview">
                <img src={thumbnailPreview} alt="Preview" />
                {view === 'edit' && !thumbnail && (
                  <span className="thumbnail-current">Actual</span>
                )}
                {thumbnail && <span className="thumbnail-new">Nueva imagen</span>}
                <button
                  type="button"
                  className="thumbnail-delete"
                  onClick={handleDeleteThumbnail}
                  title="Eliminar thumbnail"
                >
                  ×
                </button>
              </div>
            )}
            {deleteThumbnail && (
              <div className="thumbnail-deleted">
                Thumbnail sera eliminado al guardar
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="file-input"
            />
            {thumbnailError && (
              <div className="thumbnail-error">{thumbnailError}</div>
            )}
            {view === 'edit' && !deleteThumbnail && !thumbnailError && (
              <span className="file-hint">
                Selecciona una nueva imagen para cambiar el thumbnail
              </span>
            )}
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
