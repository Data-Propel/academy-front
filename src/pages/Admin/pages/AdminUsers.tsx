import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { type User } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import DataTable, { type Column } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

type View = 'list' | 'create' | 'edit';

interface UserForm {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
  is_superuser: boolean;
}

const emptyForm: UserForm = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_active: true,
  is_superuser: false,
};

export default function AdminUsers() {
  const { showSuccess, showError } = useAdmin();
  const location = useLocation();

  // View state
  const [view, setView] = useState<View>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // List state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  // Form state
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ---- Data loading ----

  const loadUsers = useCallback(async (searchTerm: string, pageNum: number, isAdmin?: string, isActive?: string) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: searchTerm || undefined,
        page: pageNum,
        isAdmin: isAdmin === 'true' ? true : isAdmin === 'false' ? false : undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      if (res.ok) {
        const data = res.data as { results?: User[]; count?: number; next?: string; previous?: string };
        if (Array.isArray(res.data)) {
          setUsers(res.data as User[]);
          setTotalCount((res.data as User[]).length);
          setHasNext(false);
          setHasPrev(false);
        } else {
          setUsers(data.results || []);
          setTotalCount(data.count || 0);
          setHasNext(!!data.next);
          setHasPrev(!!data.previous);
        }
      }
    } catch {
      showError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Initial load
  useEffect(() => {
    loadUsers('', 1, '', '');
  }, [loadUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers(search, 1, filterAdmin, filterActive);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterAdmin, filterActive, loadUsers]);

  // Page change
  useEffect(() => {
    loadUsers(search, page, filterAdmin, filterActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Handle navigation state from Dashboard
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setView('create');
      setEditingUser(null);
      setForm(emptyForm);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // ---- Navigation helpers ----

  const goBackToList = () => {
    setView('list');
    setEditingUser(null);
    setForm(emptyForm);
    loadUsers(search, page, filterAdmin, filterActive);
  };

  const openCreate = () => {
    setView('create');
    setEditingUser(null);
    setForm(emptyForm);
  };

  const openEdit = (user: User) => {
    setView('edit');
    setEditingUser(user);
    setForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      is_active: user.is_active,
      is_superuser: user.is_superuser,
    });
  };

  // ---- Form handlers ----

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (view === 'create') {
        const createPayload: Parameters<typeof adminApi.createUser>[0] = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          password: form.password,
          is_active: form.is_active,
          is_superuser: form.is_superuser,
        };
        if (!form.password) {
          delete (createPayload as Record<string, unknown>).password;
        }
        const res = await adminApi.createUser(createPayload);
        if (res.ok) {
          showSuccess('Usuario creado exitosamente.');
          goBackToList();
        } else {
          const errorData = res.data as Record<string, string[]>;
          const messages = Object.values(errorData).flat().join(' ');
          showError(messages || 'Error al crear usuario.');
        }
      } else if (view === 'edit' && editingUser) {
        const payload: Record<string, unknown> = {
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          is_active: form.is_active,
          is_superuser: form.is_superuser,
        };
        if (form.password) {
          payload.password = form.password;
        }
        const res = await adminApi.updateUser(editingUser.id, payload as Parameters<typeof adminApi.updateUser>[1]);
        if (res.ok) {
          showSuccess('Usuario actualizado exitosamente.');
          goBackToList();
        } else {
          const errorData = res.data as Record<string, string[]>;
          const messages = Object.values(errorData).flat().join(' ');
          showError(messages || 'Error al actualizar usuario.');
        }
      }
    } catch {
      showError('Error de conexión al guardar usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete handler ----

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminApi.deleteUser(deleteTarget.id);
      if (res.ok) {
        showSuccess('Usuario eliminado exitosamente.');
        loadUsers(search, page, filterAdmin, filterActive);
      } else {
        showError('Error al eliminar usuario.');
      }
    } catch {
      showError('Error de conexión al eliminar usuario.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ---- Columns ----

  const columns: Column<User>[] = [
    { key: 'id', label: 'ID' },
    {
      key: 'email',
      label: 'Email',
      render: (user) => (
        <span className="clickable-cell" onClick={() => openEdit(user)}>
          {user.email}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Nombre',
      render: (user) => `${user.first_name} ${user.last_name}`.trim() || '—',
    },
    {
      key: 'is_active',
      label: 'Activo',
      render: (user) => (
        <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'is_superuser',
      label: 'Admin',
      render: (user) => (
        user.is_superuser
          ? <span className="status-badge admin">Admin</span>
          : <span className="status-badge">Usuario</span>
      ),
    },
  ];

  // ---- Render: List view ----

  if (view === 'list') {
    return (
      <>
        <PageHeader
          title="Usuarios"
          action={{ label: '+ Crear Usuario', onClick: openCreate }}
        />

        <div className="admin-content">
          <DataTable<User>
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="No se encontraron usuarios."
            filters={
              <>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar por email o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={filterAdmin}
                  onChange={(e) => { setFilterAdmin(e.target.value); setPage(1); }}
                >
                  <option value="">Todos los roles</option>
                  <option value="true">Administradores</option>
                  <option value="false">Usuarios</option>
                </select>
                <select
                  value={filterActive}
                  onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </>
            }
            pagination={{
              page,
              totalCount,
              hasNext,
              hasPrev,
              onPageChange: setPage,
            }}
            onEdit={openEdit}
            onDelete={(user) => setDeleteTarget(user)}
          />
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Eliminar usuario"
          message={`¿Estás seguro de que deseas eliminar al usuario "${deleteTarget?.email}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      </>
    );
  }

  // ---- Render: Create / Edit view ----

  return (
    <>
      <div className="admin-content">
        <div className="admin-form-container">
          <div className="admin-form-header">
            <button className="back-btn" onClick={goBackToList}>
              ← Volver
            </button>
            <h2 className="form-title">
              {view === 'create' ? 'Crear Usuario' : 'Editar Usuario'}
            </h2>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido <span className="required">*</span></label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={view === 'create' ? 'Dejar vacío — se enviará email de invitación' : 'Dejar vacío para no cambiar'}
              />
              {view === 'create' && (
                <span style={{ fontSize: '13px', color: '#888', marginTop: '4px', display: 'block' }}>
                  Si no se asigna contraseña, el usuario recibirá un email para crear la suya.
                </span>
              )}
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Usuario activo
              </label>
            </div>

            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_superuser}
                  onChange={(e) => setForm({ ...form, is_superuser: e.target.checked })}
                />
                Administrador
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={goBackToList}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting
                  ? 'Guardando...'
                  : view === 'create'
                    ? 'Crear Usuario'
                    : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
