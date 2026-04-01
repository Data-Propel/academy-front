import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../AdminContext';
import { type Resource } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type ViewType = 'list' | 'create' | 'edit';

const initialForm = {
  title: '',
  lesson_id: 0,
  file_url: '',
};

const extractArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown[] }).results))
    return (data as { results: unknown[] }).results;
  return [];
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminResources() {
  const { lessons, showSuccess, showError, clearMessages, getLessonName } = useAdmin();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<ViewType>('list');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState<File | null>(null);

  // Filter
  const [filterLessonId, setFilterLessonId] = useState<number>(0);

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);

  // ---- Data loading ----

  const loadResources = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getResources();
      if (res.ok) setResources(extractArray(res.data) as Resource[]);
    } catch {
      showError('Error al cargar recursos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Filtered data ----

  const filteredResources = useMemo(() => {
    if (filterLessonId) return resources.filter((r) => r.lesson_id === filterLessonId);
    return resources;
  }, [resources, filterLessonId]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
    setFile(null);
  };

  const goBackToList = () => {
    setView('list');
    setEditingResource(null);
    resetForm();
    clearMessages();
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingResource(null);
    clearMessages();
    setForm({
      ...initialForm,
      lesson_id: filterLessonId,
    });
    setView('create');
  };

  const openEdit = (resource: Resource) => {
    setEditingResource(resource);
    clearMessages();
    setForm({
      title: resource.title,
      lesson_id: resource.lesson_id,
      file_url: resource.file_url || '',
    });
    setFile(null);
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!form.lesson_id) {
      showError('Selecciona una leccion.');
      return;
    }

    if (view === 'create' && !file && !form.file_url) {
      showError('Selecciona un archivo o ingresa una URL.');
      return;
    }

    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createResource(form, file || undefined);
        if (ok) {
          setResources([...resources, data]);
          showSuccess('Recurso creado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear recurso.');
        }
      } else if (editingResource) {
        const { ok, data } = await adminApi.updateResource(editingResource.id, form, file || undefined);
        if (ok) {
          setResources(resources.map((r) => (r.id === data.id ? data : r)));
          showSuccess('Recurso actualizado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar recurso.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (resource: Resource) => {
    setDeletingResource(resource);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResource) return;
    try {
      const { ok } = await adminApi.deleteResource(deletingResource.id);
      if (ok) {
        setResources(resources.filter((r) => r.id !== deletingResource.id));
        showSuccess('Recurso eliminado.');
      } else {
        showError('Error al eliminar recurso.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeletingResource(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Resource>[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Titulo' },
    {
      key: 'lesson_id',
      label: 'Leccion',
      render: (resource) => getLessonName(resource.lesson_id),
    },
    {
      key: 'file_size',
      label: 'Tamano',
      render: (resource) => formatFileSize(resource.file_size),
    },
  ];

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Recursos"
          action={{ label: '+ Crear Recurso', onClick: openCreate }}
        />
        <DataTable<Resource>
          columns={columns}
          data={filteredResources}
          loading={loading}
          emptyMessage="No se encontraron recursos."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
          filters={
            <div className="admin-filters">
              <select
                value={filterLessonId}
                onChange={(e) => setFilterLessonId(Number(e.target.value))}
              >
                <option value={0}>Todas las lecciones</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar recurso"
          message="¿Eliminar este recurso? Esta accion no se puede deshacer."
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingResource(null); }}
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
            {view === 'create' ? 'Crear Recurso' : 'Editar Recurso'}
          </h2>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Leccion <span className="required">*</span>
            </label>
            <select
              value={form.lesson_id}
              onChange={(e) => setForm({ ...form, lesson_id: Number(e.target.value) })}
              required
            >
              <option value={0}>Seleccionar leccion</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
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
              Archivo {view === 'create' && !form.file_url && <span className="required">*</span>}
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="file-input"
            />
            {view === 'edit' && (
              <span className="file-hint">
                Selecciona un nuevo archivo para reemplazar el actual
              </span>
            )}
          </div>

          <div className="form-group">
            <label>O URL externa</label>
            <input
              type="url"
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              placeholder="https://..."
            />
            <span className="file-hint">
              Usa una URL externa si no subes un archivo
            </span>
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
