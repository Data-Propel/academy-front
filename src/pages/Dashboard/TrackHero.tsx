import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tracksApi, credentialApi, type Track, type EarnedCredential } from '../../services/api';
import certificationBadge from '../../assets/workshop/certification-badge.png';
import './TrackHero.css';

interface TrackHeroProps {
  track: Track;
  userFirstName?: string;
  localThumbnails?: Record<string, string>;
  onEnrolled?: () => void;
  // Slug of the Track that owns the downloadable certificate. Set only when a
  // certificate exists; the ruta is workshop-based so this differs from track.slug.
  certSlug?: string | null;
}

const COLOR_THEMES = ['blue', 'orange', 'teal'] as const;

const TrackHero = ({ track, userFirstName, localThumbnails, onEnrolled, certSlug }: TrackHeroProps) => {
  const [enrolling, setEnrolling] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [credential, setCredential] = useState<EarnedCredential | null>(null);
  const hasAnyEnrollment = track.courses.some(c => c.is_enrolled || c.is_completed);

  const handleDownloadCert = async () => {
    if (!certSlug) return;
    setDownloadingCert(true);
    setCertError(null);
    const res = await tracksApi.downloadCertificate(certSlug);
    if (res && !res.ok) setCertError(res.detail || 'No se pudo descargar el certificado.');
    setDownloadingCert(false);
  };

  const handleEnrollTrack = async () => {
    setEnrolling(true);
    try {
      const res = await tracksApi.enroll(track.slug);
      if (res.ok) {
        onEnrolled?.();
      }
    } finally {
      setEnrolling(false);
    }
  };
  const courses = [...track.courses].sort((a, b) => a.order_index - b.order_index);

  // No required order: every course shows its own status, and progress is a
  // plain count of completed courses. The synthetic live-session step
  // (course_id === -1, prepended by the dashboard's workshop-route adapter) is
  // excluded from the count so it reads "X de N cursos", not "X de N+1".
  const stepState = (c: Track['courses'][number]) =>
    c.is_completed ? 'done' : c.is_enrolled ? 'in-progress' : 'not-started';

  // In the stepper, "en curso" must mean actually started — workshop users are
  // auto-enrolled in every course, so an enrolled-but-untouched course has to
  // read as upcoming, not in-progress. Otherwise every dot looks active/done.
  const stepDotState = (c: Track['courses'][number]) =>
    c.is_completed ? 'done' : c.is_enrolled && c.progress > 0 ? 'in-progress' : 'not-started';

  // The certification badge lights up (full opacity) once every real course is
  // done. The synthetic live-session step (course_id === -1) tracks workshop
  // attendance, not course completion, so it's excluded from the gate.
  const allCoursesCompleted = courses
    .filter((c) => c.course_id !== -1)
    .every((c) => c.is_completed);

  // Once the ruta is finished, look up the user's verifiable badge for this
  // track so we can link to it next to the certificate download.
  useEffect(() => {
    if (!allCoursesCompleted || !certSlug) return;
    let active = true;
    credentialApi.mine().then(({ ok, data }) => {
      if (active && ok) setCredential(data.find((c) => c.track_slug === certSlug) ?? null);
    });
    return () => { active = false; };
  }, [allCoursesCompleted, certSlug]);

  const greeting = userFirstName
    ? `¡Hola ${userFirstName}! ${track.cta_heading || track.name}`
    : track.cta_heading || track.name;

  const renderHeadline = (name: string) => {
    const idx = name.indexOf('IA ');
    if (idx === -1) return name;
    return (
      <>
        {name.slice(0, idx)}
        <strong>{name.slice(idx)}</strong>
      </>
    );
  };

  const renderStepLabel = (label: string) => {
    const m = label.match(/^(.*\bdel\s+)(.+)$/i);
    if (!m) return label;
    return (
      <>
        {m[1]}
        <strong>{m[2]}</strong>
      </>
    );
  };

  // Build a "add to Google Calendar" link for a course's deadline. All-day
  // event on the deadline date (Google's end date is exclusive, so +1 day),
  // mirroring the SUMMARY/DESCRIPTION of the .ics sent in the enrollment email.
  const calendarUrl = (c: Track['courses'][number]): string | null => {
    if (!c.deadline) return null;
    const [y, m, d] = c.deadline.split('-').map(Number);
    if (!y || !m || !d) return null;
    const start = c.deadline.replace(/-/g, '');
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const end = `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, '0')}${String(next.getUTCDate()).padStart(2, '0')}`;
    const courseUrl = `${window.location.origin}/courses/${c.slug}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Completa: ${c.title}`,
      dates: `${start}/${end}`,
      details: `Fecha límite para completar «${c.title}». Ábrelo aquí: ${courseUrl}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const openCalendar = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <section className="track-hero" aria-labelledby="track-hero-title">
      <div className="track-hero__inner">
        <header className="track-hero__header">
          <p className="track-hero__greeting">{greeting}</p>
          <h2 id="track-hero-title" className="track-hero__headline">{renderHeadline(track.name)}</h2>
        </header>

        {!hasAnyEnrollment && (
          <div className="track-hero__enroll-cta">
            <button
              type="button"
              className="track-hero__enroll-btn"
              onClick={handleEnrollTrack}
              disabled={enrolling}
            >
              {enrolling ? 'Inscribiendo…' : 'Inscríbete a la certificación'}
            </button>
            <p className="track-hero__enroll-note">
              Completa los cursos en el orden que prefieras para obtener la certificación.
            </p>
          </div>
        )}

        <ol className={`track-stepper${allCoursesCompleted ? ' track-stepper--complete' : ''}`} aria-label="Progreso de la certificación">
          {courses.map((c) => {
            const state = stepDotState(c);
            const label = c.deadline_label || c.subtitle || c.title;
            return (
              <li key={c.course_id} className={`track-step track-step--${state}`}>
                <span className="track-step__label">{renderStepLabel(label)}</span>
                <span className="track-step__node">
                  <span className="track-step__dot" aria-hidden="true">
                    {c.is_completed && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
          {/* Final milestone — the certification reward badge (Propel ×
              Google.org). Fills in once every step of the route is done. */}
          <li className={`track-step track-step--badge track-step--${allCoursesCompleted ? 'done' : 'pending'}`}>
            <span className="track-step__label">Certificación</span>
            <span className="track-step__node">
              <img
                className="track-step__badge-img"
                src={certificationBadge}
                alt="Certificación: Lidera con un IA mindset"
              />
            </span>
          </li>
        </ol>

        {allCoursesCompleted && certSlug && (
          <div className="track-hero__cert">
            <div className="track-hero__cert-actions">
              <button
                type="button"
                className="track-hero__cert-btn"
                onClick={handleDownloadCert}
                disabled={downloadingCert}
              >
                {downloadingCert ? 'Descargando…' : 'Descargar tu certificado'}
              </button>
              {credential && (
                <a
                  className="track-hero__cert-btn track-hero__cert-btn--outline"
                  href={credential.verify_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver tu insignia digital
                </a>
              )}
            </div>
            {certError && <p className="track-hero__cert-error">{certError}</p>}
          </div>
        )}

        <div className="track-cards">
          {courses.map((c, i) => {
            const thumb = c.thumbnail_url || localThumbnails?.[c.slug];
            const theme = COLOR_THEMES[i % COLOR_THEMES.length];
            const state = stepState(c);
            // The synthetic live-session step (course_id === -1) reads "Ver
            // grabación" once it points at a recording course; until then it
            // links to the landing and keeps the normal enrollment labels.
            const isRecording = c.course_id === -1 && (c.href?.startsWith('/courses/') ?? false);
            const ctaLabel = isRecording
              ? 'Ver grabación'
              : c.is_completed
                ? 'Revisar curso'
                : c.is_enrolled
                  ? 'Continuar'
                  : 'Conoce más';
            const cardClass = `track-card track-card--${theme} track-card--${state}${c.is_locked ? ' track-card--locked' : ''}`;
            const CardWrapper: React.ElementType = c.is_locked ? 'div' : Link;
            const wrapperProps = c.is_locked
              ? { 'aria-disabled': true, title: 'Disponible al completar el curso anterior' }
              : { to: c.href ?? `/courses/${c.slug}`, 'aria-label': `${ctaLabel}: ${c.title}` };
            return (
              <CardWrapper
                key={c.course_id}
                className={cardClass}
                {...wrapperProps}
              >
                <div className="track-card__media">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" />
                  ) : (
                    <div className="track-card__media-art">
                      <div className="track-card__title-panel">
                        <span className="track-card__top-title">{c.title}</span>
                      </div>
                    </div>
                  )}
                  {c.is_completed && <span className="track-card__badge">Completado</span>}
                  {c.is_locked && (
                    <div className="track-card__lock-overlay" aria-hidden="true">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Bloqueado</span>
                    </div>
                  )}
                </div>
                <div className="track-card__body">
                  <h3 className="track-card__title">{c.title}</h3>
                  {c.duration_display && (
                    <span className="track-card__meta">{c.duration_display}</span>
                  )}
                  {c.deadline_text && (() => {
                    const calUrl = calendarUrl(c);
                    return (
                      <div className="track-card__deadline">
                        <svg className="track-card__deadline-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="track-card__deadline-text">
                          Completa antes del <strong>{c.deadline_text}</strong>
                        </span>
                        {calUrl && (
                          <span
                            className="track-card__deadline-add"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openCalendar(calUrl); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openCalendar(calUrl); } }}
                          >
                            Agregar al calendario
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {c.short_description && (
                    <p className="track-card__desc">{c.short_description}</p>
                  )}
                  {c.is_enrolled && !c.is_completed && c.progress > 0 && (
                    <div className="track-card__progress" aria-label={`${c.progress}% completado`}>
                      <div className="track-card__progress-bar" style={{ width: `${c.progress}%` }} />
                    </div>
                  )}
                  {!c.is_locked && <span className="track-card__cta">{ctaLabel}</span>}
                </div>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrackHero;
