import { Fragment, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../../services/api';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';

// Only one workshop exists today. When more are added, turn this into a selector.
const WORKSHOP_SLUG = 'lidera-ia';

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, s] = await Promise.all([
        adminApi.getWorkshopRegistrations(WORKSHOP_SLUG),
        adminApi.getWorkshopStats(WORKSHOP_SLUG),
      ]);
      setLoading(false);
      if (r.ok) setRegs(r.data as Registration[]);
      else showError('No se pudieron cargar las inscripciones.');
      if (s.ok) setStats(s.data as Stats);
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

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
    a.download = `inscripciones-${WORKSHOP_SLUG}-${new Date().toISOString().slice(0, 10)}.csv`;
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
      `}</style>

      <PageHeader
        title="Workshops"
        subtitle="Inscripciones y embudo de certificación · Lidera con IA mindset"
      />

      <div className="admin-content">
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
