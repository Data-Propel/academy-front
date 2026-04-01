import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { type Category } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type ViewType = 'list' | 'create' | 'edit';

const initialForm = {
  name: '',
  slug: '',
  description: '',
};

export default function AdminCategories() {
  const { categories, setCategories, loading, showSuccess, showError, clearMessages } = useAdmin();
  const location = useLocation();

  const [view, setView] = useState<ViewType>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState(initialForm);

  // Delete confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Handle navigation state from Dashboard
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setForm(initialForm);
      setEditingCategory(null);
      clearMessages();
      setView('create');
      window.history.replaceState({}, '');
    }
  }, [location.state, clearMessages]);

  // ---- Helpers ----

  const resetForm = () => {
    setForm(initialForm);
  };

  const goBackToList = () => {
    setView('list');
    setEditingCategory(null);
    resetForm();
    clearMessages();
  };

  // ---- CRUD handlers ----

  const openCreate = () => {
    resetForm();
    setEditingCategory(null);
    clearMessages();
    setView('create');
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    clearMessages();
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    });
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createCategory(form);
        if (ok) {
          setCategories([...categories, data]);
          showSuccess('Categoria creada.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear categoria.');
        }
      } else if (editingCategory) {
        const { ok, data } = await adminApi.updateCategory(editingCategory.id, form);
        if (ok) {
          setCategories(categories.map((c) => (c.id === data.id ? data : c)));
          showSuccess('Categoria actualizada.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar categoria.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    try {
      const { ok } = await adminApi.deleteCategory(deletingCategory.id);
      if (ok) {
        setCategories(categories.filter((c) => c.id !== deletingCategory.id));
        showSuccess('Categoria eliminada.');
      } else {
        showError('Error al eliminar categoria.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeletingCategory(null);
    }
  };

  // ---- Table columns ----

  const columns: Column<Category>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nombre' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'description',
      label: 'Descripcion',
      render: (category) => {
        const desc = category.description || '';
        return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc || '-';
      },
    },
  ];

  // ---- Render ----

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Categorias"
          action={{ label: '+ Crear Categoria', onClick: openCreate }}
        />
        <DataTable<Category>
          columns={columns}
          data={categories}
          loading={loading}
          emptyMessage="No se encontraron categorias."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar categoria"
          message="¿Eliminar esta categoria?"
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeletingCategory(null); }}
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
            {view === 'create' ? 'Crear Categoria' : 'Editar Categoria'}
          </h2>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              Nombre <span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>
              Slug <span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
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
