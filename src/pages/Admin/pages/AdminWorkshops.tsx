import { Fragment, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../../services/api';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';

interface WorkshopOption {
  slug: string;
  name: string;
  event_date: string;
}

interface CourseProgress {
  slug: string;
  title: string;
  enrolled: boolean;
  progress: number;
  completed: boolean;
}

interface Registration {
  id: number;
  full_name: string;
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  organizacion: string;
  tipo_organizacion: string;
  como_te_enteraste: string;
  newsletter: boolean;
  registered_at: string;
  user_id: number | null;
  user_email: string | null;
  account_created_at: string | null;
  course_progress: CourseProgress[];
  certificate_issued_at: string | null;
  stage: number;
}

interface Stats {
  total_registered: number;
  stage_1_registered_only: number;
  stage_2_account_created: number;
  stage_3_enrolled: number;
  stage_4_completed: number;
  stage_5_certified: number;
}

interface PathCourse {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  thumbnail_url: string;
}

interface CourseOption {
  id: number;
  slug: string;
  title: string;
}

const STAGE_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Registrado', color: '#9aa5a1' },
  2: { label: 'Cuenta creada', color: '#5b8def' },
  3: { label: 'Inscrito', color: '#f8b81f' },
  4: { label: 'Completado', color: '#A3C94A' },
  5: { label: 'Certificado', color: '#0E4B43' },
};

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminWorkshops() {
  const { showError } = useAdmin();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<number | ''>('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [path, setPath] = useState<PathCourse[]>([]);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [courseToAdd, setCourseToAdd] = useState<number | ''>('');
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [workshopSlug, setWorkshopSlug] = useState<string>('');

  // Guided "Crear nueva ruta" flow: workshop + Zoom + courses, all from one
  // form. `creating` toggles the panel; the rest are form fields, with
  // `formCourseIds` collecting the 3-or-so courses tied to the ruta.
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formZoomId, setFormZoomId] = useState('');
  const [formCertName, setFormCertName] = useState('Certificación en IA');
  const [formCourseIds, setFormCourseIds] = useState<number[]>([]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

  const resetCreateForm = () => {
    setFormName(''); setFormSlug(''); setFormSlugTouched(false);
    setFormDate(''); setFormZoomId(''); setFormCertName('Certificación en IA');
    setFormCourseIds([]);
  };

  // Load the workshop list + global course catalog once. The selector reads
  // from `workshops`; default to the most-recent workshop (first in the list,
  // which is ordered by -event_date server-side).
  useEffect(() => {
    (async () => {
      const [w, c] = await Promise.all([
        adminApi.getWorkshops(),
        adminApi.getCourses(),
      ]);
      if (w.ok) {
        const list = w.data as WorkshopOption[];
        setWorkshops(list);
        if (list.length > 0 && !workshopSlug) setWorkshopSlug(list[0].slug);
      } else {
        showError('No se pudieron cargar los workshops.');
      }
      if (c.ok) setAllCourses((c.data as CourseOption[]).map((x) => ({ id: x.id, slug: x.slug, title: x.title })));
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Per-workshop data — refetched whenever the admin switches workshop.
  useEffect(() => {
    if (!workshopSlug) return;
    (async () => {
      setLoading(true);
      // Reset per-workshop state so the previous workshop's data doesn't
      // flash while the new one loads.
      setRegs([]); setStats(null); setPath([]); setExpanded(null);
      const [r, s, p] = await Promise.all([
        adminApi.getWorkshopRegistrations(workshopSlug),
        adminApi.getWorkshopStats(workshopSlug),
        adminApi.getWorkshopPath(workshopSlug),
      ]);
      setLoading(false);
      if (r.ok) setRegs(r.data as Registration[]);
      else showError('No se pudieron cargar las inscripciones.');
      if (s.ok) setStats(s.data as Stats);
      if (p.ok) setPath(p.data as PathCourse[]);
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [workshopSlug]);

  // Courses available to add = all courses minus those already on the path.
  const availableCourses = useMemo(() => {
    const taken = new Set(path.map((p) => p.id));
    return allCourses.filter((c) => !taken.has(c.id));
  }, [allCourses, path]);

  const addCourseToPath = async () => {
    if (courseToAdd === '') return;
    const id = Number(courseToAdd);
    const res = await adminApi.addWorkshopPathCourse(workshopSlug, id);
    if (!res.ok) { showError('No se pudo agregar el curso.'); return; }
    setPath((cur) => [...cur, res.data as PathCourse]);
    setCourseToAdd('');
  };

  const removeFromPath = async (id: number) => {
    const res = await adminApi.removeWorkshopPathCourse(workshopSlug, id);
    if (!res.ok) { showError('No se pudo quitar el curso.'); return; }
    setPath((cur) => cur.filter((p) => p.id !== id));
  };

  const submitCreate = async () => {
    if (!formName.trim() || !formSlug.trim() || !formDate) {
      showError('Nombre, slug y fecha son obligatorios.');
      return;
    }
    setCreateBusy(true);
    // Browser's datetime-local gives "YYYY-MM-DDTHH:MM"; backend accepts that
    // as a naive datetime in DRF's default parser.
    const wRes = await adminApi.createWorkshop({
      name: formName.trim(),
      slug: formSlug.trim(),
      event_date: formDate,
      zoom_meeting_id: formZoomId.trim() || undefined,
      certification_name: formCertName.trim() || undefined,
    });
    if (!wRes.ok) {
      setCreateBusy(false);
      const detail = wRes.data && typeof wRes.data === 'object' && 'detail' in wRes.data
        ? String((wRes.data as { detail: unknown }).detail) : 'No se pudo crear el workshop.';
      showError(detail);
      return;
    }
    const created = wRes.data as { slug: string; name: string; event_date: string };

    // Attach courses sequentially (the path endpoint appends one at a time and
    // backfills enrollments; sequential keeps order_index deterministic).
    for (const id of formCourseIds) {
      await adminApi.addWorkshopPathCourse(created.slug, id);
    }

    // Refresh the selector list and switch to the new ruta — its data fetches
    // automatically via the [workshopSlug] effect.
    const wList = await adminApi.getWorkshops();
    if (wList.ok) setWorkshops(wList.data as WorkshopOption[]);
    setWorkshopSlug(created.slug);
    setCreating(false);
    resetCreateForm();
    setCreateBusy(false);
  };

  // Swap two cards locally, persist the new order. Roll back on failure so the
  // UI never diverges from the server.
  const movePath = async (id: number, dir: -1 | 1) => {
    const idx = path.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= path.length) return;
    const next = [...path];
    [next[idx], next[target]] = [next[target], next[idx]];
    const prev = path;
    setPath(next);
    const res = await adminApi.reorderWorkshopPath(workshopSlug, next.map((p) => p.id));
    if (!res.ok) { setPath(prev); showError('No se pudo reordenar.'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter((r) => {
      if (stageFilter !== '' && r.stage !== stageFilter) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        r.organizacion.toLowerCase().includes(q)
      );
    });
  }, [regs, search, stageFilter]);

  // Cumulative funnel (each stage includes everyone who reached it or beyond).
  const funnel = stats
    ? [
        { label: 'Registrados', value: stats.total_registered },
        {
          label: 'Cuenta creada',
          value:
            stats.stage_2_account_created +
            stats.stage_3_enrolled +
            stats.stage_4_completed +
            stats.stage_5_certified,
        },
        {
          label: 'Inscritos',
          value: stats.stage_3_enrolled + stats.stage_4_completed + stats.stage_5_certified,
        },
        { label: 'Completados', value: stats.stage_4_completed + stats.stage_5_certified },
        { label: 'Certificados', value: stats.stage_5_certified },
      ]
    : [];

  const exportCsv = () => {
    const headers = [
      'Nombre', 'Apellido', 'Email', 'País', 'Organización', 'Tipo de organización',
      'Cómo se enteró', 'Newsletter', 'Registrado', 'Etapa', 'Cuenta', 'Certificado',
    ];
    const rows = filtered.map((r) => [
      r.nombre, r.apellido, r.email, r.pais, r.organizacion, r.tipo_organizacion,
      r.como_te_enteraste, r.newsletter ? 'Sí' : 'No', fmtDate(r.registered_at),
      STAGE_META[r.stage]?.label ?? r.stage,
      r.account_created_at ? fmtDate(r.account_created_at) : '',
      r.certificate_issued_at ? fmtDate(r.certificate_issued_at) : '',
    ]);
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscripciones-${workshopSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        .wk-funnel { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
        @media (max-width: 900px) { .wk-funnel { grid-template-columns: repeat(2, 1fr); } }
        .wk-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 16px; }
        .wk-card-value { font-family: 'Libre Franklin', sans-serif; font-size: 32px; font-weight: 700; color: #F2F2F2; line-height: 1; }
        .wk-card-label { font-family: 'Poppins', sans-serif; font-size: 0.8rem; color: rgba(242,242,242,0.7); margin-top: 6px; }
        .wk-bar { height: 4px; border-radius: 2px; margin-top: 12px; background: #FD6A44; }
        .wk-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
        .wk-toolbar input, .wk-toolbar select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; }
        .wk-toolbar input { flex: 1; min-width: 220px; }
        .wk-export { background: #FD6A44; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; }
        .wk-export:hover { background: #e55a36; }
        .wk-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #fff; }
        .wk-detail { background: rgba(255,255,255,0.03); padding: 16px 20px; }
        .wk-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px; }
        .wk-detail-grid .k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(242,242,242,0.5); }
        .wk-detail-grid .v { font-size: 0.9rem; color: #F2F2F2; margin-top: 2px; }
        .wk-course { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 0.85rem; color: #F2F2F2; }
        .wk-course-bar { flex: 1; max-width: 200px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
        .wk-course-fill { height: 100%; background: #A3C94A; }
        .wk-link { color: #FD6A44; text-decoration: none; }
        .wk-path-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 28px; }
        .wk-path-title { font-family: 'Libre Franklin', sans-serif; font-size: 1.05rem; color: #F2F2F2; margin: 0 0 4px; }
        .wk-path-sub { font-family: 'Poppins', sans-serif; font-size: 0.78rem; color: rgba(242,242,242,0.6); margin: 0 0 14px; }
        .wk-path-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .wk-path-item { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px; }
        .wk-path-thumb { width: 56px; height: 40px; object-fit: cover; border-radius: 4px; background: rgba(255,255,255,0.06); }
        .wk-path-name { flex: 1; font-size: 0.9rem; color: #F2F2F2; }
        .wk-path-actions { display: flex; gap: 4px; }
        .wk-path-btn { background: rgba(255,255,255,0.08); color: #F2F2F2; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
        .wk-path-btn:hover { background: rgba(255,255,255,0.14); }
        .wk-path-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .wk-path-btn--danger:hover { background: rgba(252,92,58,0.6); }
        .wk-path-add { display: flex; gap: 10px; align-items: center; }
        .wk-path-add select { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; }
        .wk-path-add button { background: #FD6A44; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; }
        .wk-path-add button:disabled { opacity: 0.4; cursor: not-allowed; }
        .wk-path-empty { font-size: 0.85rem; color: rgba(242,242,242,0.5); margin-bottom: 14px; }
        .wk-create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .wk-create-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: rgba(242,242,242,0.7); }
        .wk-create-grid label input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; }
        .wk-create-grid__full { grid-column: 1 / -1; }
        .wk-create-subhead { font-family: 'Libre Franklin', sans-serif; font-size: 0.95rem; color: #F2F2F2; margin: 4px 0 6px; }
        .wk-create-actions { display: flex; gap: 10px; margin-top: 18px; }
        @media (max-width: 700px) { .wk-create-grid { grid-template-columns: 1fr; } }
      `}</style>

      <PageHeader
        title="Workshops"
        subtitle={
          workshops.find((w) => w.slug === workshopSlug)?.name
          ?? 'Inscripciones y embudo de certificación'
        }
      />

      <div className="admin-content">
        <div className="wk-toolbar" style={{ marginBottom: 18 }}>
          <label style={{ fontSize: '0.85rem', color: 'rgba(242,242,242,0.7)' }}>
            Ruta:
          </label>
          <select
            value={workshopSlug}
            onChange={(e) => setWorkshopSlug(e.target.value)}
            disabled={workshops.length === 0}
          >
            {workshops.length === 0 && <option value="">— Sin rutas —</option>}
            {workshops.map((w) => (
              <option key={w.slug} value={w.slug}>{w.name}</option>
            ))}
          </select>
          <button className="wk-export" onClick={() => setCreating(true)}>
            + Crear nueva ruta
          </button>
        </div>

        {creating && (
          <section className="wk-path-section">
            <h2 className="wk-path-title">Nueva ruta</h2>
            <p className="wk-path-sub">
              Crea el workshop con su Zoom y elige los cursos que forman la ruta de aprendizaje.
            </p>

            <div className="wk-create-grid">
              <label>
                <span>Nombre del workshop *</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlugTouched) setFormSlug(slugify(e.target.value));
                  }}
                  placeholder="Lidera con un IA mindset"
                />
              </label>
              <label>
                <span>Slug (URL) *</span>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => { setFormSlug(slugify(e.target.value)); setFormSlugTouched(true); }}
                  placeholder="lidera-ia"
                />
              </label>
              <label>
                <span>Fecha y hora del evento *</span>
                <input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label>
                <span>Zoom Meeting ID</span>
                <input
                  type="text"
                  value={formZoomId}
                  onChange={(e) => setFormZoomId(e.target.value.replace(/\s+/g, ''))}
                  placeholder="123 4567 8901"
                />
              </label>
              <label className="wk-create-grid__full">
                <span>Nombre de la certificación</span>
                <input
                  type="text"
                  value={formCertName}
                  onChange={(e) => setFormCertName(e.target.value)}
                />
              </label>
            </div>

            <h3 className="wk-create-subhead">Cursos de la ruta</h3>
            <p className="wk-path-sub">
              Selecciona los cursos que el participante debe completar para obtener la certificación. Pueden ser tres o más.
            </p>
            {formCourseIds.length > 0 && (
              <div className="wk-path-list">
                {formCourseIds.map((cid, i) => {
                  const c = allCourses.find((x) => x.id === cid);
                  return (
                    <div className="wk-path-item" key={cid}>
                      <div className="wk-path-thumb" />
                      <div className="wk-path-name">{i + 1}. {c?.title ?? `Curso #${cid}`}</div>
                      <div className="wk-path-actions">
                        <button
                          className="wk-path-btn wk-path-btn--danger"
                          onClick={() => setFormCourseIds((ids) => ids.filter((x) => x !== cid))}
                          aria-label="Quitar"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wk-path-add">
              <select
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id) setFormCourseIds((ids) => ids.includes(id) ? ids : [...ids, id]);
                }}
              >
                <option value="">Agregar curso…</option>
                {allCourses
                  .filter((c) => !formCourseIds.includes(c.id))
                  .map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="wk-create-actions">
              <button
                className="wk-export"
                onClick={submitCreate}
                disabled={createBusy}
              >
                {createBusy ? 'Creando…' : 'Crear ruta'}
              </button>
              <button
                className="wk-path-btn"
                style={{ width: 'auto', padding: '9px 14px' }}
                onClick={() => { setCreating(false); resetCreateForm(); }}
                disabled={createBusy}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
        <section className="wk-path-section">
          <h2 className="wk-path-title">Ruta de aprendizaje</h2>
          <p className="wk-path-sub">
            Cursos que aparecen en la sección "Certificación en IA" del landing y que el participante debe completar para certificarse.
          </p>

          {path.length === 0 ? (
            <p className="wk-path-empty">Aún no hay cursos en la ruta.</p>
          ) : (
            <div className="wk-path-list">
              {path.map((c, i) => (
                <div className="wk-path-item" key={c.id}>
                  {c.thumbnail_url
                    ? <img className="wk-path-thumb" src={c.thumbnail_url} alt="" />
                    : <div className="wk-path-thumb" />}
                  <div className="wk-path-name">
                    {i + 1}. {c.title}
                  </div>
                  <div className="wk-path-actions">
                    <button
                      className="wk-path-btn"
                      onClick={() => movePath(c.id, -1)}
                      disabled={i === 0}
                      aria-label="Subir"
                    >↑</button>
                    <button
                      className="wk-path-btn"
                      onClick={() => movePath(c.id, 1)}
                      disabled={i === path.length - 1}
                      aria-label="Bajar"
                    >↓</button>
                    <button
                      className="wk-path-btn wk-path-btn--danger"
                      onClick={() => removeFromPath(c.id)}
                      aria-label="Quitar"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="wk-path-add">
            <select
              value={courseToAdd}
              onChange={(e) => setCourseToAdd(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Selecciona un curso…</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button onClick={addCourseToPath} disabled={courseToAdd === ''}>
              Agregar
            </button>
          </div>
        </section>

        <div className="wk-funnel">
          {funnel.map((f, i) => (
            <div className="wk-card" key={f.label}>
              <div className="wk-card-value">{f.value}</div>
              <div className="wk-card-label">{f.label}</div>
              <div
                className="wk-bar"
                style={{
                  width:
                    funnel[0].value > 0
                      ? `${Math.round((f.value / funnel[0].value) * 100)}%`
                      : '0%',
                  opacity: 1 - i * 0.12,
                }}
              />
            </div>
          ))}
        </div>

        <div className="wk-toolbar">
          <input
            type="text"
            placeholder="Buscar por email, nombre u organización…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Todas las etapas</option>
            {Object.entries(STAGE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button className="wk-export" onClick={exportCsv} disabled={filtered.length === 0}>
            Exportar CSV
          </button>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div className="admin-loading-overlay">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">No hay inscripciones.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>País</th>
                  <th>Organización</th>
                  <th>Registrado</th>
                  <th>Etapa</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = STAGE_META[r.stage] ?? STAGE_META[1];
                  const isOpen = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{r.email}</td>
                        <td>{r.full_name}</td>
                        <td>{r.pais}</td>
                        <td>{r.organizacion}</td>
                        <td>{fmtDate(r.registered_at)}</td>
                        <td>
                          <span className="wk-badge" style={{ background: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0 }}>
                            <div className="wk-detail">
                              <div className="wk-detail-grid">
                                <div>
                                  <div className="k">Tipo de organización</div>
                                  <div className="v">{r.tipo_organizacion || '—'}</div>
                                </div>
                                <div>
                                  <div className="k">Cómo se enteró</div>
                                  <div className="v">{r.como_te_enteraste || '—'}</div>
                                </div>
                                <div>
                                  <div className="k">Newsletter</div>
                                  <div className="v">{r.newsletter ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="k">Cuenta en plataforma</div>
                                  <div className="v">
                                    {r.user_id
                                      ? `Sí · ${fmtDate(r.account_created_at)}`
                                      : 'No creada'}
                                  </div>
                                </div>
                                <div>
                                  <div className="k">Certificado</div>
                                  <div className="v">
                                    {r.certificate_issued_at ? fmtDate(r.certificate_issued_at) : 'No emitido'}
                                  </div>
                                </div>
                              </div>

                              {r.course_progress.length > 0 ? (
                                <div>
                                  <div className="k" style={{ marginBottom: 6, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(242,242,242,0.5)' }}>
                                    Progreso de cursos
                                  </div>
                                  {r.course_progress.map((c) => (
                                    <div className="wk-course" key={c.slug}>
                                      <span style={{ minWidth: 200 }}>{c.title}</span>
                                      <div className="wk-course-bar">
                                        <div className="wk-course-fill" style={{ width: `${c.progress}%` }} />
                                      </div>
                                      <span style={{ minWidth: 90 }}>
                                        {c.completed ? '✓ Completado' : c.enrolled ? `${c.progress}%` : 'No inscrito'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="v" style={{ fontSize: '0.85rem', color: 'rgba(242,242,242,0.6)' }}>
                                  Sin cursos de certificación configurados o sin cuenta vinculada.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
