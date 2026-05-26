import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { type Course } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type ViewType = 'list' | 'create' | 'edit';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const PRICE_TYPE_LABELS: Record<string, string> = {
  free: 'Gratuito',
  paid: 'De pago',
  subscription: 'Suscripción',
};

const initialForm = {
  title: '',
  slug: '',
  subtitle: '',
  short_description: '',
  description: '',
  level: 'beginner',
  duration_hours: 1,
  price: '0',
  price_type: 'free',
  category_id: 0,
  tag_ids: [] as number[],
  instructor: '',
  instructor_title: '',
  instructor_bio: '',
  is_featured: false,
  is_published: false,
  seo_title: '',
  seo_description: '',
  seo_image_url: '',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCourses() {
  const { courses, categories, tags, setCourses, loading, showSuccess, showError, clearMessages } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<ViewType>('list');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState(initialForm);
  const [autoSlug, setAutoSlug] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Thumbnail state
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [thumbnailError, setThumbnailError] = useState('');
  const [deleteThumbnail, setDeleteThumbnail] = useState(false);
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instructor avatar state
  const [instructorAvatar, setInstructorAvatar] = useState<File | null>(null);
  const [instructorAvatarPreview, setInstructorAvatarPreview] = useState('');

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Handle navigation state from Dashboard or CourseDetail
  useEffect(() => {
    const state = location.state as { editCourseId?: number; openCreate?: boolean } | null;
    if (!state) return;
    if (state.openCreate) {
      openCreate();
    } else if (state.editCourseId && courses.length > 0) {
      const course = courses.find(c => c.id === state.editCourseId);
      if (course) openEdit(course);
    }
    // Clear the state so refreshing doesn't re-trigger
    window.history.replaceState({}, '');
  }, [location.state, courses]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
    setAutoSlug(true);
    setThumbnail(null);
    setThumbnailPreview('');
    setThumbnailError('');
    setDeleteThumbnail(false);
    setDragover(false);
    setInstructorAvatar(null);
    setInstructorAvatarPreview('');
  };

  const goBackToList = () => {
    setView('list');
    setEditingCourse(null);
    resetForm();
    clearMessages();
  };

  const handleTitleChange = (title: string) => {
    setForm(prev => ({
      ...prev,
      title,
      ...(autoSlug ? { slug: slugify(title) } : {}),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setAutoSlug(false);
    setForm(prev => ({ ...prev, slug }));
  };

  // ---- Thumbnail handling ----

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setThumbnailError('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbnailError('La imagen es muy grande. Máximo 5MB.');
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const ratio = w / h;

      if (w < 400 || h < 225) {
        setThumbnailError(`Imagen muy pequeña. Mínimo 400x225px. Tu imagen: ${w}x${h}px`);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      if (Math.abs(ratio - 16 / 9) > 0.5) {
        setThumbnailError(`Se recomienda proporción 16:9 (ej: 1280x720). Tu imagen: ${w}x${h}px`);
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDeleteThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview('');
    setDeleteThumbnail(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setInstructorAvatar(file);
    setInstructorAvatarPreview(URL.createObjectURL(file));
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingCourse(null);
    clearMessages();
    setView('create');
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    clearMessages();
    setAutoSlug(false);
    setForm({
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle || '',
      short_description: course.short_description || '',
      description: course.description || '',
      level: course.level,
      duration_hours: course.duration_hours,
      price: course.price || '0',
      price_type: course.price_type || 'free',
      category_id: course.category?.id || 0,
      tag_ids: (course.tags || []).map(t => t.id),
      instructor: course.instructor || '',
      instructor_title: course.instructor_title || '',
      instructor_bio: course.instructor_bio || '',
      is_featured: course.is_featured,
      is_published: course.is_published,
      seo_title: course.seo_title || '',
      seo_description: course.seo_description || '',
      seo_image_url: course.seo_image_url || '',
    });
    setThumbnail(null);
    setThumbnailPreview(course.thumbnail || '');
    setThumbnailError('');
    setDeleteThumbnail(false);
    setInstructorAvatar(null);
    setInstructorAvatarPreview(course.instructor_avatar || '');
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (view === 'create' && !thumbnail) {
      showError('Debes seleccionar una imagen de thumbnail.');
      return;
    }

    setSubmitting(true);
    try {
      const courseData = {
        ...form,
        category_id: form.category_id || undefined,
      };

      if (view === 'create') {
        const res = await adminApi.createCourse(courseData, thumbnail || undefined, instructorAvatar || undefined);
        if (res.ok) {
          setCourses([...courses, res.data]);
          showSuccess('Curso creado exitosamente.');
          navigate(`/admin/cursos/${res.data.id}`);
        } else {
          showError(res.data?.detail || res.data?.message || 'Error al crear curso. Verifica los datos e intenta de nuevo.');
        }
      } else if (editingCourse) {
        const res = await adminApi.updateCourse(
          editingCourse.id,
          courseData,
          thumbnail || undefined,
          deleteThumbnail,
          instructorAvatar || undefined,
        );
        if (res.ok) {
          setCourses(courses.map(c => c.id === res.data.id ? res.data : c));
          showSuccess('Curso actualizado exitosamente.');
          goBackToList();
        } else {
          showError(res.data?.detail || res.data?.message || 'Error al actualizar curso.');
        }
      }
    } catch (err) {
      console.error('Course submit error:', err);
      showError('Error del servidor. Es posible que el almacenamiento de archivos no esté configurado. Contacta al administrador.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setDeletingCourse(course);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCourse) return;
    try {
      const { ok } = await adminApi.deleteCourse(deletingCourse.id);
      if (ok) {
        setCourses(courses.filter(c => c.id !== deletingCourse.id));
        showSuccess('Curso eliminado.');
      } else {
        showError('Error al eliminar curso.');
      }
    } catch {
      showError('Error de conexión.');
    } finally {
      setConfirmOpen(false);
      setDeletingCourse(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Course>[] = [
    {
      key: 'title',
      label: 'Curso',
      render: (course) => (
        <div className="course-title-cell">
          {course.thumbnail && (
            <img src={course.thumbnail} alt="" className="table-thumbnail" />
          )}
          <span>{course.title}</span>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoría',
      render: (course) => course.category?.name || '-',
    },
    {
      key: 'level',
      label: 'Nivel',
      render: (course) => LEVEL_LABELS[course.level] || course.level,
    },
    {
      key: 'lessons_count',
      label: 'Lecciones',
      render: (course) => course.lessons_count ?? '-',
    },
    {
      key: 'enrollments_count',
      label: 'Inscritos',
      render: (course) => course.enrollments_count ?? '-',
    },
    {
      key: 'is_published',
      label: 'Estado',
      render: (course) => (
        <span className={`status-badge ${course.is_published ? 'active' : 'inactive'}`}>
          {course.is_published ? 'Publicado' : 'Borrador'}
        </span>
      ),
    },
  ];

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Cursos"
          subtitle={`${courses.length} cursos en total`}
          action={{ label: '+ Crear Curso', onClick: openCreate }}
        />
        <DataTable<Course>
          columns={columns}
          data={search.trim() ? courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : courses}
          loading={loading}
          emptyMessage="No se encontraron cursos."
          filters={
            <input
              className="search-input"
              placeholder="Buscar curso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
          onRowClick={(course) => navigate(`/admin/cursos/${course.id}`)}
          onEdit={openEdit}
          onDelete={handleDeleteClick}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar curso"
          message={`¿Eliminar "${deletingCourse?.title}"? Esta acción no se puede deshacer. Se eliminarán todas las lecciones, temas y quizzes asociados.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingCourse(null); }}
        />
      </div>
    );
  }

  const descLen = form.short_description.length;

  // Create / Edit form — two-column layout
  return (
    <div className="admin-content">
      <div className="admin-form-header">
        <button type="button" className="back-btn" onClick={goBackToList}>
          ← Volver
        </button>
        <h2 className="form-title">
          {view === 'create' ? 'Crear Curso' : 'Editar Curso'}
        </h2>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="course-form-layout">
          {/* ===== LEFT COLUMN: Main content ===== */}
          <div className="course-form-main">

            {/* Section: Info Básica */}
            <div className="form-section">
              <h3 className="form-section-title">Información básica</h3>

              <div className="form-group">
                <label>Título <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Ej: Introducción a Python"
                  required
                />
              </div>

              <div className="slug-row">
                <div className="form-group">
                  <label>Slug <span className="required">*</span></label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    placeholder="introduccion-a-python"
                    required
                  />
                </div>
                <button
                  type="button"
                  className={`slug-auto-btn ${autoSlug ? 'active' : ''}`}
                  onClick={() => {
                    setAutoSlug(!autoSlug);
                    if (!autoSlug) setForm(prev => ({ ...prev, slug: slugify(prev.title) }));
                  }}
                  title={autoSlug ? 'Slug se genera automáticamente' : 'Clic para auto-generar slug'}
                >
                  {autoSlug ? 'Auto ✓' : 'Auto'}
                </button>
              </div>

              <div className="form-group">
                <label>Descripción corta <span className="label-hint">(máx. 500 caracteres — se muestra en las tarjetas del catálogo)</span></label>
                <textarea
                  value={form.short_description}
                  onChange={e => setForm({ ...form, short_description: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder="Resumen breve del curso que se muestra en las tarjetas"
                />
                <span className={`char-counter ${descLen > 450 ? (descLen >= 500 ? 'over' : 'warn') : ''}`}>
                  {descLen}/500
                </span>
              </div>

              <div className="form-group">
                <label>Descripción completa</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={8}
                  placeholder="Descripción detallada del curso, objetivos de aprendizaje, temario, etc."
                />
              </div>
            </div>

            {/* Section: Instructor */}
            <div className="form-section">
              <h3 className="form-section-title">Instructor</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del instructor</label>
                  <input
                    type="text"
                    value={form.instructor}
                    onChange={e => setForm({ ...form, instructor: e.target.value })}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="form-group">
                  <label>Cargo / Título</label>
                  <input
                    type="text"
                    value={form.instructor_title}
                    onChange={e => setForm({ ...form, instructor_title: e.target.value })}
                    placeholder="Ej: Senior Developer"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Biografía</label>
                <textarea
                  value={form.instructor_bio}
                  onChange={e => setForm({ ...form, instructor_bio: e.target.value })}
                  rows={3}
                  placeholder="Breve bio del instructor"
                />
              </div>

              <div className="form-group">
                <label>Avatar del instructor</label>
                {instructorAvatarPreview && (
                  <img src={instructorAvatarPreview} alt="Avatar" className="avatar-preview" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="file-input"
                />
              </div>
            </div>

            {/* Section: SEO */}
            <div className="form-section">
              <h3 className="form-section-title">SEO</h3>
              <p className="label-hint" style={{ marginTop: -8, marginBottom: 16 }}>
                Estos campos sobrescriben el título y descripción que aparecen en Google y al compartir el link.
                Si los dejas en blanco, se usan el título y la descripción corta del curso.
              </p>

              <div className="form-group">
                <label>
                  Meta title <span className="label-hint">(máx. 60–70 caracteres recomendado)</span>
                </label>
                <input
                  type="text"
                  value={form.seo_title}
                  onChange={e => setForm({ ...form, seo_title: e.target.value })}
                  maxLength={70}
                  placeholder={form.title ? `${form.title} — Propel Academy` : 'Ej: Curso de IA generativa para ONGs — Propel Academy'}
                />
                <span className={`char-counter ${form.seo_title.length > 60 ? 'warn' : ''}`}>
                  {form.seo_title.length}/70
                </span>
              </div>

              <div className="form-group">
                <label>
                  Meta description <span className="label-hint">(máx. 150–160 caracteres recomendado)</span>
                </label>
                <textarea
                  value={form.seo_description}
                  onChange={e => setForm({ ...form, seo_description: e.target.value })}
                  rows={3}
                  maxLength={200}
                  placeholder="Resumen del curso optimizado para resultados de búsqueda."
                />
                <span className={`char-counter ${form.seo_description.length > 160 ? 'warn' : ''}`}>
                  {form.seo_description.length}/200
                </span>
              </div>

              <div className="form-group">
                <label>
                  Imagen para redes sociales (URL absoluta) <span className="label-hint">(1200×630 recomendado)</span>
                </label>
                <input
                  type="url"
                  value={form.seo_image_url}
                  onChange={e => setForm({ ...form, seo_image_url: e.target.value })}
                  placeholder="https://..."
                />
                {form.seo_image_url && (
                  <img
                    src={form.seo_image_url}
                    alt="Vista previa OG"
                    style={{ marginTop: 8, maxWidth: 320, width: '100%', borderRadius: 4, border: '1px solid #ddd' }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN: Sidebar ===== */}
          <div className="course-form-sidebar">

            {/* Section: Publicación */}
            <div className="form-section">
              <h3 className="form-section-title">Publicación</h3>

              <div className="publish-toggle">
                <span className="publish-toggle-label">Publicado</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={e => setForm({ ...form, is_published: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="publish-toggle">
                <span className="publish-toggle-label">Destacado</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* Section: Thumbnail */}
            <div className="form-section">
              <h3 className="form-section-title">
                Thumbnail {view === 'create' && <span className="required">*</span>}
              </h3>

              {thumbnailPreview ? (
                <div className="thumbnail-preview-large">
                  <img src={thumbnailPreview} alt="Preview" />
                  <div className="thumbnail-actions">
                    {view === 'edit' && !thumbnail && (
                      <span className="thumbnail-badge current">Actual</span>
                    )}
                    {thumbnail && (
                      <span className="thumbnail-badge new">Nueva</span>
                    )}
                    <button
                      type="button"
                      className="thumbnail-remove"
                      onClick={handleDeleteThumbnail}
                      title="Eliminar"
                    >×</button>
                  </div>
                </div>
              ) : deleteThumbnail ? (
                <div className="thumbnail-deleted">
                  Se eliminará al guardar
                </div>
              ) : null}

              <div
                className={`thumbnail-dropzone ${dragover ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={handleDrop}
              >
                <div className="thumbnail-dropzone-text">
                  Arrastra una imagen o <strong>haz clic para seleccionar</strong>
                </div>
                <div className="thumbnail-dropzone-hint">16:9, mín. 400x225px, máx. 5MB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                />
              </div>

              {thumbnailError && (
                <div className="thumbnail-error">{thumbnailError}</div>
              )}
            </div>

            {/* Section: Configuración */}
            <div className="form-section">
              <h3 className="form-section-title">Configuración</h3>

              <div className="form-group">
                <label>Categoría</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: Number(e.target.value) })}
                >
                  <option value={0}>Sin categoría</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tags</label>
                <div className="tag-checkbox-grid">
                  {tags.length === 0 && <small>Crea tags en /admin/tags.</small>}
                  {tags.map(tag => {
                    const checked = form.tag_ids.includes(tag.id);
                    return (
                      <label key={tag.id} className="tag-checkbox">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setForm({
                              ...form,
                              tag_ids: checked
                                ? form.tag_ids.filter(id => id !== tag.id)
                                : [...form.tag_ids, tag.id],
                            });
                          }}
                        />
                        <span>{tag.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Nivel</label>
                <select
                  value={form.level}
                  onChange={e => setForm({ ...form, level: e.target.value })}
                >
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Duración (horas)</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration_hours}
                  onChange={e => setForm({ ...form, duration_hours: Number(e.target.value) })}
                />
              </div>

              <div className="price-row">
                <div className="form-group">
                  <label>Tipo de precio</label>
                  <select
                    value={form.price_type}
                    onChange={e => setForm({ ...form, price_type: e.target.value })}
                  >
                    {Object.entries(PRICE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {form.price_type !== 'free' && (
                  <div className="form-group">
                    <label>Precio ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={e => setForm({ ...form, price: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form actions — full width */}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={goBackToList} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Guardando...' : (view === 'create' ? 'Crear Curso' : 'Guardar Cambios')}
          </button>
        </div>
      </form>
    </div>
  );
}
