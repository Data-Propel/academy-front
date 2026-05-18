import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { type Tag } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type ViewType = 'list' | 'create' | 'edit';

const initialForm = { name: '', slug: '', aliases: '' };

export default function AdminTags() {
  const { tags, setTags, loading, showSuccess, showError, clearMessages } = useAdmin();

  const [view, setView] = useState<ViewType>('list');
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState(initialForm);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const goBackToList = () => {
    setView('list');
    setEditing(null);
    setForm(initialForm);
    clearMessages();
  };

  const openCreate = () => {
    setForm(initialForm);
    setEditing(null);
    clearMessages();
    setView('create');
  };

  const openEdit = (tag: Tag) => {
    setEditing(tag);
    clearMessages();
    setForm({ name: tag.name, slug: tag.slug, aliases: tag.aliases || '' });
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      if (view === 'create') {
        const { ok, data } = await adminApi.createTag(form);
        if (ok) {
          setTags([...tags, data]);
          showSuccess('Tag creado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al crear tag.');
        }
      } else if (editing) {
        const { ok, data } = await adminApi.updateTag(editing.id, form);
        if (ok) {
          setTags(tags.map(t => (t.id === data.id ? data : t)));
          showSuccess('Tag actualizado.');
          goBackToList();
        } else {
          showError(data.detail || 'Error al actualizar tag.');
        }
      }
    } catch {
      showError('Error de conexion.');
    }
  };

  const handleDeleteClick = (tag: Tag) => {
    setDeleting(tag);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      const { ok } = await adminApi.deleteTag(deleting.id);
      if (ok) {
        setTags(tags.filter(t => t.id !== deleting.id));
        showSuccess('Tag eliminado.');
      } else {
        showError('Error al eliminar tag.');
      }
    } catch {
      showError('Error de conexion.');
    } finally {
      setConfirmOpen(false);
      setDeleting(null);
    }
  };

  const columns: Column<Tag>[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nombre' },
    { key: 'slug', label: 'Slug' },
    {
      key: 'aliases',
      label: 'Sinónimos',
      render: (tag) => tag.aliases || '-',
    },
  ];

  if (view === 'list') {
    return (
      <div className="admin-content">
        <PageHeader
          title="Tags"
          action={{ label: '+ Crear Tag', onClick: openCreate }}
        />
        <DataTable<Tag>
          columns={columns}
          data={tags}
          loading={loading}
          emptyMessage="No se encontraron tags."
          onEdit={openEdit}
          onDelete={handleDeleteClick}
        />
        <ConfirmDialog
          open={confirmOpen}
          title="Eliminar tag"
          message="¿Eliminar este tag?"
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setConfirmOpen(false); setDeleting(null); }}
        />
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-form-container">
        <div className="admin-form-header">
          <button type="button" className="back-btn" onClick={goBackToList}>← Volver</button>
          <h2 className="form-title">{view === 'create' ? 'Crear Tag' : 'Editar Tag'}</h2>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre <span className="required">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Slug <span className="required">*</span></label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Sinónimos (separados por coma)</label>
            <input
              type="text"
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              placeholder="IA, AI, inteligencia artificial"
            />
            <small>Términos alternativos por los que el buscador encontrará cursos con este tag.</small>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={goBackToList}>Cancelar</button>
            <button type="submit" className="btn-submit">{view === 'create' ? 'Crear' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
