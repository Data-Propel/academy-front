import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tracksApi, type Track } from '../../services/api';
import './TrackHero.css';

interface TrackHeroProps {
  track: Track;
  userFirstName?: string;
  localThumbnails?: Record<string, string>;
  onEnrolled?: () => void;
}

const COLOR_THEMES = ['blue', 'orange', 'teal'] as const;

const TrackHero = ({ track, userFirstName, localThumbnails, onEnrolled }: TrackHeroProps) => {
  const [enrolling, setEnrolling] = useState(false);
  const hasAnyEnrollment = track.courses.some(c => c.is_enrolled || c.is_completed);

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
  const activeIndex = courses.findIndex((c) => !c.is_completed);
  const currentStep = activeIndex === -1 ? courses.length - 1 : activeIndex;

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
              Empezarás por el primer curso. Los demás se desbloquean al completar el anterior.
            </p>
          </div>
        )}

        <ol className="track-stepper" aria-label="Progreso de la certificación">
          {courses.map((c, i) => {
            const state = c.is_completed
              ? 'done'
              : i === currentStep
                ? 'active'
                : 'pending';
            const label = c.deadline_label || c.subtitle || `Paso ${i + 1}`;
            return (
              <li key={c.course_id} className={`track-step track-step--${state}`}>
                <span className="track-step__label">{renderStepLabel(label)}</span>
                <span className="track-step__dot" aria-hidden="true">
                  {c.is_completed && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="track-cards">
          {courses.map((c, i) => {
            const thumb = c.thumbnail_url || localThumbnails?.[c.slug];
            const theme = COLOR_THEMES[i % COLOR_THEMES.length];
            const state = c.is_completed ? 'done' : i === currentStep ? 'active' : 'pending';
            const ctaLabel = c.is_completed
              ? 'Revisar curso'
              : c.is_enrolled
                ? 'Continuar'
                : 'Conoce más';
            const cardClass = `track-card track-card--${theme} track-card--${state}${c.is_locked ? ' track-card--locked' : ''}`;
            const CardWrapper: React.ElementType = c.is_locked ? 'div' : Link;
            const wrapperProps = c.is_locked
              ? { 'aria-disabled': true, title: 'Disponible al completar el curso anterior' }
              : { to: `/courses/${c.slug}`, 'aria-label': `${ctaLabel}: ${c.title}` };
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
                  {c.short_description && (
                    <p className="track-card__desc">{c.short_description}</p>
                  )}
                  {c.duration_display && (
                    <span className="track-card__meta">{c.duration_display}</span>
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
