import { useEffect, useState, type ReactElement } from 'react';
import { workshopsApi, isSuperuser, isMarketingAdmin, triggerBlobDownload, type RutaFunnel } from '../../services/api';
import './TrackFunnel.css';

// Live funnel card for the ruta — rendered on the track view, staff only
// (mockup: src/assets/s6_08_mockup.jpg).

const ICONS: Record<string, ReactElement> = {
  registered: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  attended: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  ),
  course: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  course_last: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4v16" />
      <path d="M8 6v14" />
      <path d="M12 6v14" />
      <path d="m16 6 4 14" />
    </svg>
  ),
  certified: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <path d="m12 5.2 0.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 7.3l2-.3z" fill="currentColor" stroke="none" />
    </svg>
  ),
};

const iconFor = (key: string, isLastCourse: boolean): ReactElement => {
  if (key.startsWith('course_')) return isLastCourse ? ICONS.course_last : ICONS.course;
  return ICONS[key] ?? ICONS.course;
};

interface TrackFunnelProps {
  trackName: string;
  workshopSlug: string;
}

const TrackFunnel = ({ trackName, workshopSlug }: TrackFunnelProps) => {
  const [data, setData] = useState<RutaFunnel | null>(null);
  const [mins, setMins] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const staff = isSuperuser() || isMarketingAdmin();

  const downloadCsv = async () => {
    if (downloading) return;
    setDownloading(true);
    const { ok, blob } = await workshopsApi.downloadRutaFunnelCsv(workshopSlug);
    if (ok && blob) triggerBlobDownload(blob, `ruta-funnel-${workshopSlug}.csv`);
    setDownloading(false);
  };

  useEffect(() => {
    if (!staff) return;
    let active = true;
    workshopsApi.getRutaFunnel(workshopSlug).then((d) => {
      if (!active) return;
      setData(d);
      if (d) {
        setMins(Math.max(0, Math.floor(
          (Date.now() - new Date(d.generated_at).getTime()) / 60000,
        )));
      }
    });
    return () => { active = false; };
  }, [workshopSlug, staff]);

  if (!staff || !data || data.steps.length === 0) return null;

  const first = data.steps[0].count;
  const lastCourseKey = [...data.steps].reverse().find(s => s.key.startsWith('course_'))?.key;

  return (
    <div className="tf-card">
      <div className="tf-head">
        <div>
          <h3 className="tf-title">{data.name || trackName}</h3>
          <p className="tf-sub">
            {data.date_range} · solo visible para staff de Propel Academy
          </p>
        </div>
        <span className="tf-live">
          <span className="tf-live-dot" aria-hidden="true" />
          En vivo · {mins < 1 ? 'ahora' : `hace ${mins} min`}
        </span>
      </div>
      <hr className="tf-rule" />

      {data.steps.map((s, i) => {
        const pct = first > 0 ? Math.round((s.count / first) * 100) : 0;
        return (
          <div className="tf-row" key={s.key}>
            <div className="tf-row-top">
              <span className="tf-icon">{iconFor(s.key, s.key === lastCourseKey)}</span>
              <span className="tf-label">{s.label}</span>
              {i > 0 && <span className="tf-pct">{pct}% desde el inicio</span>}
              <span className="tf-count">{s.count}</span>
            </div>
            <div className="tf-bar">
              <div
                className="tf-bar-fill"
                style={{ width: `${pct}%`, minWidth: s.count > 0 ? 14 : 0 }}
              />
            </div>
          </div>
        );
      })}

      <hr className="tf-rule tf-rule--bottom" />
      <div className="tf-foot-row">
        <p className="tf-foot">Meta real de Q3: 50 usuarios certificados en esta ruta.</p>
        <button className="tf-download" onClick={downloadCsv} disabled={downloading}>
          {downloading ? 'Descargando…' : 'Descargar lista (CSV)'}
        </button>
      </div>
    </div>
  );
};

export default TrackFunnel;
