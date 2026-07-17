import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './AddToCalendarModal.css';

// "Agregar a calendario" (S6-05): lets the user block time for a course.
// Fully client-side — builds a prefilled Google Calendar URL and a
// downloadable .ics file (Apple/Outlook), both linking back to the course.

interface AddToCalendarModalProps {
  courseTitle: string;
  courseUrl: string;
  /** Default event length in minutes (the course duration). */
  defaultDurationMinutes: number;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "20260716T090000" in the user's local time (floating, no TZ suffix). */
const toIcsLocal = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

/** UTC variant for the Google Calendar URL. */
const toIcsUtc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

const escapeIcsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const AddToCalendarModal = ({ courseTitle, courseUrl, defaultDurationMinutes, onClose }: AddToCalendarModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Default: tomorrow at 09:00, duration = course duration (rounded up to a
  // sensible option so a 40-min course offers 45 min by default).
  const defaults = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const duration = DURATION_OPTIONS.find(o => o >= defaultDurationMinutes) ?? DURATION_OPTIONS[DURATION_OPTIONS.length - 1];
    return { date, duration };
  }, [defaultDurationMinutes]);

  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState<number>(defaults.duration);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, input, select');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [close]);

  const buildEvent = (): { start: Date; end: Date; title: string; details: string } | null => {
    if (!date || !time) {
      setFieldError('Elige una fecha y una hora para tu sesión de estudio.');
      return null;
    }
    const start = new Date(`${date}T${time}`);
    if (isNaN(start.getTime())) {
      setFieldError('La fecha u hora no es válida.');
      return null;
    }
    setFieldError(null);
    const end = new Date(start.getTime() + duration * 60_000);
    return {
      start,
      end,
      title: `Curso: ${courseTitle} · Nonprofit Academy`,
      details: `Tiempo reservado para avanzar en el curso «${courseTitle}» de la Nonprofit Academy de Propel.\n\nContinúa el curso aquí: ${courseUrl}`,
    };
  };

  const openGoogleCalendar = () => {
    const ev = buildEvent();
    if (!ev) return;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: ev.title,
      dates: `${toIcsUtc(ev.start)}/${toIcsUtc(ev.end)}`,
      details: ev.details,
      location: courseUrl,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
  };

  const downloadIcs = () => {
    const ev = buildEvent();
    if (!ev) return;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Propel Nonprofit Academy//Agregar a calendario//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:academy-${Date.now()}@propelacademy.org`,
      `DTSTAMP:${toIcsUtc(new Date()).replace('Z', '')}Z`,
      `DTSTART:${toIcsLocal(ev.start)}`,
      `DTEND:${toIcsLocal(ev.end)}`,
      `SUMMARY:${escapeIcsText(ev.title)}`,
      `DESCRIPTION:${escapeIcsText(ev.details)}`,
      `URL:${courseUrl}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'curso-nonprofit-academy.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="atc-overlay" onClick={close}>
      <div
        ref={dialogRef}
        className="atc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="atc-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="atc-close" onClick={close} aria-label="Cerrar">✕</button>
        <div className="atc-icon" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        </div>
        <h2 id="atc-title" className="atc-title">Agrega este curso a tu calendario</h2>
        <p className="atc-text">
          Bloquea un espacio para avanzar en «{courseTitle}» y comprométete con una fecha.
        </p>

        <div className="atc-fields">
          <label className="atc-field">
            <span>Fecha</span>
            <input
              ref={firstFieldRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="atc-field">
            <span>Hora</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="atc-field">
            <span>Duración</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATION_OPTIONS.map(o => (
                <option key={o} value={o}>
                  {o < 60 ? `${o} min` : `${o / 60} h${o % 60 ? ` ${o % 60} min` : ''}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        {fieldError && <p className="atc-error" role="alert">{fieldError}</p>}

        <div className="atc-actions">
          <button className="atc-btn atc-btn--secondary" onClick={downloadIcs}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar .ics
          </button>
          <button className="atc-btn atc-btn--primary" onClick={openGoogleCalendar}>
            Google Calendar
          </button>
        </div>
        <p className="atc-hint">El archivo .ics funciona con Apple Calendar y Outlook.</p>
      </div>
    </div>,
    document.body
  );
};

export default AddToCalendarModal;
