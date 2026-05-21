import { useEffect, useState } from 'react';
import { adminApi } from '../../../services/api';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';

interface Row { value: string; count: number }
interface ConversionRow { campaign: string; registered: number; converted: number; rate: number }
interface CourseRow { course: string; count: number }

interface Stats {
  registrations: { total: number; by_source: Row[]; by_medium: Row[]; by_campaign: Row[] };
  enrollments: { total: number; by_source: Row[]; by_medium: Row[]; by_campaign: Row[] };
  conversion: ConversionRow[];
  top_courses_by_campaign: Record<string, CourseRow[]>;
}

export default function AdminAnalytics() {
  const { showError } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await adminApi.getUtmStats({ start: start || undefined, end: end || undefined });
    setLoading(false);
    if (res.ok) {
      setStats(res.data);
    } else {
      showError('No se pudieron cargar las estadísticas.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <>
      <PageHeader title="Analítica de campañas" subtitle="Atribución por UTM en registros e inscripciones" />
      <div className="admin-content">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
          <DateField label="Desde" value={start} onChange={setStart} />
          <DateField label="Hasta" value={end} onChange={setEnd} />
          <button className="btn-submit" onClick={load}>Aplicar</button>
          <button className="btn-cancel" onClick={() => { setStart(''); setEnd(''); setTimeout(load, 0); }}>Limpiar</button>
        </div>

        {loading && <div className="admin-loading-overlay">Cargando...</div>}

        {stats && !loading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
              <KpiCard label="Registros (rango)" value={stats.registrations.total} />
              <KpiCard label="Inscripciones (rango)" value={stats.enrollments.total} />
            </div>

            <Section title="Registros por fuente / medio / campaña">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <RowTable heading="Source" rows={stats.registrations.by_source} />
                <RowTable heading="Medium" rows={stats.registrations.by_medium} />
                <RowTable heading="Campaign" rows={stats.registrations.by_campaign} />
              </div>
            </Section>

            <Section title="Inscripciones por fuente / medio / campaña">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <RowTable heading="Source" rows={stats.enrollments.by_source} />
                <RowTable heading="Medium" rows={stats.enrollments.by_medium} />
                <RowTable heading="Campaign" rows={stats.enrollments.by_campaign} />
              </div>
            </Section>

            <Section title="Conversión (registro → al menos una inscripción)" hint="Basado en la atribución de primer toque del usuario (User.utm_campaign).">
              {stats.conversion.length === 0 ? (
                <Empty />
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Campaña</th>
                      <th style={{ textAlign: 'right' }}>Registros</th>
                      <th style={{ textAlign: 'right' }}>Convertidos</th>
                      <th style={{ textAlign: 'right' }}>Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.conversion.map((r) => (
                      <tr key={r.campaign}>
                        <td>{r.campaign}</td>
                        <td style={{ textAlign: 'right' }}>{r.registered}</td>
                        <td style={{ textAlign: 'right' }}>{r.converted}</td>
                        <td style={{ textAlign: 'right' }}>{(r.rate * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="Top cursos por campaña" hint="Basado en la atribución de inscripción (Enrollment.utm_campaign).">
              {Object.keys(stats.top_courses_by_campaign).length === 0 ? (
                <Empty />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {Object.entries(stats.top_courses_by_campaign).map(([campaign, courses]) => (
                    <div key={campaign} style={{ border: '1px solid rgba(101,101,101,0.4)', padding: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>{campaign}</div>
                      <table className="admin-table" style={{ width: '100%' }}>
                        <tbody>
                          {courses.map((c) => (
                            <tr key={c.course}>
                              <td>{c.course}</td>
                              <td style={{ textAlign: 'right' }}>{c.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: '1px solid rgba(101,101,101,0.4)', padding: 16 }}>
      <div style={{ fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 600, marginTop: 4 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ margin: '0 0 4px 0' }}>{title}</h2>
      {hint && <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>{hint}</div>}
      {children}
    </section>
  );
}

function RowTable({ heading, rows }: { heading: string; rows: Row[] }) {
  if (rows.length === 0) return <div style={{ opacity: 0.7 }}><strong>{heading}</strong>: sin datos.</div>;
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>{heading}</th>
          <th style={{ textAlign: 'right' }}>#</th>
          <th style={{ textAlign: 'right' }}>%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.value}>
            <td>{r.value}</td>
            <td style={{ textAlign: 'right' }}>{r.count}</td>
            <td style={{ textAlign: 'right' }}>{total ? ((r.count / total) * 100).toFixed(1) : '0.0'}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, opacity: 0.7 }}>{label}</label>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Empty() {
  return <div className="admin-empty">Sin datos en el rango seleccionado.</div>;
}
