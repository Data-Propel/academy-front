import { useEffect, useState, type FormEvent } from 'react';
import { adminApi } from '../../../services/api';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';

interface Campaign {
  id: number;
  name: string;
  slug: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  target_path: string;
  notes: string;
  created_by_email?: string;
  created_at: string;
  generated_url: string;
}

const emptyForm = {
  name: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
  target_path: '/',
  notes: '',
};

export default function AdminCampaigns() {
  const { showSuccess, showError } = useAdmin();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await adminApi.listCampaigns();
    if (res.ok) {
      setCampaigns(Array.isArray(res.data) ? res.data : res.data.results || []);
    } else {
      showError('No se pudieron cargar las campañas.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.utm_source || !form.utm_campaign) {
      showError('Nombre, utm_source y utm_campaign son obligatorios.');
      return;
    }
    setSubmitting(true);
    const res = await adminApi.createCampaign(form);
    setSubmitting(false);
    if (res.ok) {
      showSuccess('Campaña creada.');
      setForm(emptyForm);
      setView('list');
      load();
    } else {
      showError(res.data?.detail || 'Error al crear la campaña.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const res = await adminApi.deleteCampaign(deleteTarget.id);
    if (res.ok) {
      showSuccess('Campaña eliminada.');
      setDeleteTarget(null);
      load();
    } else {
      showError('No se pudo eliminar.');
    }
  };

  const copy = async (url: string, id: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      showError('No se pudo copiar al portapapeles.');
    }
  };

  if (view === 'create') {
    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setView('list')} className="back-btn">← Volver</button>
        </div>
        <PageHeader title="Nueva campaña" subtitle="Genera una URL con UTMs para una campaña" />
        <form className="admin-form" onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
          <Field label="Nombre interno*" hint="Cómo identificarás esta campaña internamente">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="utm_source*" hint="De dónde viene: facebook, instagram, newsletter, google…">
            <input value={form.utm_source} onChange={(e) => setForm({ ...form, utm_source: e.target.value })} required />
          </Field>
          <Field label="utm_medium" hint="Canal: cpc, social, email, organic…">
            <input value={form.utm_medium} onChange={(e) => setForm({ ...form, utm_medium: e.target.value })} />
          </Field>
          <Field label="utm_campaign*" hint="Identificador único de la campaña, ej. lanzamiento_ia_2026">
            <input value={form.utm_campaign} onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })} required />
          </Field>
          <Field label="utm_term" hint="(opcional) palabras clave para SEM">
            <input value={form.utm_term} onChange={(e) => setForm({ ...form, utm_term: e.target.value })} />
          </Field>
          <Field label="utm_content" hint="(opcional) diferencia creativos dentro de la misma campaña">
            <input value={form.utm_content} onChange={(e) => setForm({ ...form, utm_content: e.target.value })} />
          </Field>
          <Field label="Ruta destino" hint="Página de destino en el sitio. Ejemplos: / · /register · /courses/asistente-ia">
            <input value={form.target_path} onChange={(e) => setForm({ ...form, target_path: e.target.value })} />
          </Field>
          <Field label="Notas">
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="button" className="btn-cancel" onClick={() => setView('list')}>Cancelar</button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear campaña'}
            </button>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Campañas"
        subtitle="URLs con UTMs para campañas de marketing"
        action={{ label: '+ Nueva campaña', onClick: () => { setView('create'); setForm(emptyForm); } }}
      />
      <div className="admin-content">
        {loading ? (
          <div className="admin-loading-overlay">Cargando...</div>
        ) : campaigns.length === 0 ? (
          <div className="admin-empty">Todavía no hay campañas. Crea la primera con "+ Nueva campaña".</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Source</th>
                <th>Medium</th>
                <th>Campaign</th>
                <th>URL</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.notes && <div style={{ fontSize: 12, opacity: 0.7 }}>{c.notes}</div>}
                  </td>
                  <td>{c.utm_source}</td>
                  <td>{c.utm_medium || '—'}</td>
                  <td>{c.utm_campaign}</td>
                  <td style={{ maxWidth: 360 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <code style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={c.generated_url}>
                        {c.generated_url}
                      </code>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => copy(c.generated_url, c.id)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {copied === c.id ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="action-btn delete" onClick={() => setDeleteTarget(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar campaña"
        message={`¿Eliminar la campaña "${deleteTarget?.name}"? Las URLs ya enviadas seguirán registrando UTMs.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontWeight: 500 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 12, opacity: 0.7 }}>{hint}</div>}
    </div>
  );
}
