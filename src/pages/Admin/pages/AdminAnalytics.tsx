import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

  const load = async (s?: string, e?: string) => {
    setLoading(true);
    const res = await adminApi.getUtmStats({
      start: (s ?? start) || undefined,
      end: (e ?? end) || undefined,
    });
    setLoading(false);
    if (res.ok) {
      setStats(res.data);
    } else {
      showError('No se pudieron cargar las estadísticas.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const clear = () => {
    setStart('');
    setEnd('');
    load('', '');
  };

  return (
    <>
      <PageHeader title="Analítica de campañas" subtitle="Atribución por UTM en registros e inscripciones" />
      <div className="admin-content">
        <div className="analytics-howto">
          <div className="analytics-howto-title">Cómo funciona</div>
          <div className="analytics-howto-steps">
            <div className="analytics-howto-step">
              <div className="analytics-howto-num">1</div>
              <div className="analytics-howto-text">
                <strong>Crea la campaña</strong>
                <span>
                  Ve a <Link to="/admin/campaigns" style={{ color: '#FD6A44' }}>Campañas</Link> y haz clic en
                  &nbsp;<em>+ Nueva campaña</em>. El sistema generará una URL con parámetros UTM.
                </span>
              </div>
            </div>
            <div className="analytics-howto-step">
              <div className="analytics-howto-num">2</div>
              <div className="analytics-howto-text">
                <strong>Comparte la URL</strong>
                <span>
                  Copia la URL generada y úsala en tu anuncio, post o email. Cada persona que entre por ahí queda etiquetada con esa campaña.
                </span>
              </div>
            </div>
            <div className="analytics-howto-step">
              <div className="analytics-howto-num">3</div>
              <div className="analytics-howto-text">
                <strong>Mide aquí los resultados</strong>
                <span>
                  Esta página muestra cuántos se registraron e inscribieron desde cada campaña, fuente y medio.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="analytics-filters">
          <div className="analytics-date">
            <label>Desde</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="analytics-date">
            <label>Hasta</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <button className="btn-submit" onClick={() => load()}>Aplicar</button>
          <button className="btn-cancel" onClick={clear}>Limpiar</button>
        </div>

        {loading && <div className="admin-loading-overlay">Cargando...</div>}

        {stats && !loading && (
          <>
            <div className="kpi-grid">
              <KpiCard label="Registros en el rango" value={stats.registrations.total} />
              <KpiCard label="Inscripciones en el rango" value={stats.enrollments.total} />
            </div>

            <Section
              title="Registros por fuente / medio / campaña"
              hint="De dónde vienen las personas que se registraron en el sitio."
            >
              <div className="analytics-grid-3">
                <RowTable heading="Fuente (utm_source)" rows={stats.registrations.by_source} />
                <RowTable heading="Medio (utm_medium)" rows={stats.registrations.by_medium} />
                <RowTable heading="Campaña (utm_campaign)" rows={stats.registrations.by_campaign} />
              </div>
            </Section>

            <Section
              title="Inscripciones por fuente / medio / campaña"
              hint="De dónde vienen las inscripciones a cursos."
            >
              <div className="analytics-grid-3">
                <RowTable heading="Fuente (utm_source)" rows={stats.enrollments.by_source} />
                <RowTable heading="Medio (utm_medium)" rows={stats.enrollments.by_medium} />
                <RowTable heading="Campaña (utm_campaign)" rows={stats.enrollments.by_campaign} />
              </div>
            </Section>

            <Section
              title="Conversión por campaña"
              hint="Cuántos de los que se registraron por una campaña terminaron inscribiéndose en al menos un curso."
            >
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

            <Section
              title="Top cursos por campaña"
              hint="Qué cursos atrae cada campaña según los parámetros UTM al momento de inscribirse."
            >
              {Object.keys(stats.top_courses_by_campaign).length === 0 ? (
                <Empty />
              ) : (
                <div className="analytics-grid-3">
                  {Object.entries(stats.top_courses_by_campaign).map(([campaign, courses]) => (
                    <div key={campaign} className="campaign-card">
                      <div className="campaign-card-title">{campaign}</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <tbody>
                          {courses.map((c) => (
                            <tr key={c.course}>
                              <td style={{ padding: '6px 0', color: 'rgba(242,242,242,0.9)' }}>{c.course}</td>
                              <td style={{ padding: '6px 0', textAlign: 'right', color: 'rgba(242,242,242,0.7)' }}>{c.count}</td>
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
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value.toLocaleString()}</div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="analytics-section">
      <h2 className="analytics-section-title">{title}</h2>
      {hint && <div className="analytics-section-hint">{hint}</div>}
      {children}
    </section>
  );
}

function RowTable({ heading, rows }: { heading: string; rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="analytics-subtable">
        <h4>{heading}</h4>
        <div className="analytics-subtable-empty">Sin datos todavía.</div>
      </div>
    );
  }
  const total = rows.reduce((a, r) => a + r.count, 0);
  return (
    <div className="analytics-subtable">
      <h4>{heading}</h4>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.value}>
              <td>{r.value}</td>
              <td className="num">{r.count}</td>
              <td className="num">{total ? ((r.count / total) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return <div className="admin-empty">Sin datos en el rango seleccionado. Cuando alguien entre con una URL de campaña, aparecerá aquí.</div>;
}
