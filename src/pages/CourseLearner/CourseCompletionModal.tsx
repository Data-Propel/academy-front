import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../services/api';
import './CourseCompletionModal.css';

interface Question {
  id: number;
  question_text: string;
  question_type: 'rating' | 'scale' | 'nps' | 'yes_no' | 'multiple_choice' | 'text';
  options: string[];
  is_required: boolean;
  order_index: number;
}

interface Props {
  slug: string;
  hasEvalForm: boolean;
  alreadyEvaluated: boolean;
  onClose: () => void;
  onEvaluationSubmitted?: () => void;
}

interface NextCourse {
  id: number;
  title: string;
  slug: string;
  thumbnail_url?: string | null;
  instructor?: string;
  duration_display?: string;
  short_description?: string;
}

const CONFETTI_COLORS = ['#FF5A2F', '#A3C94A', '#0E4B43', '#FFD700', '#4FC3F7', '#F48FB1', '#ffffff'];

export default function CourseCompletionModal({ slug, hasEvalForm, alreadyEvaluated, onClose, onEvaluationSubmitted }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [step, setStep] = useState<'form' | 'done' | 'next'>(
    !hasEvalForm || alreadyEvaluated ? 'done' : 'form'
  );
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [nextCourse, setNextCourse] = useState<NextCourse | null>(null);
  const nextCoursePromise = useRef<Promise<NextCourse | null> | null>(null);

  // Confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      rot: number; rotSpeed: number; w: number; h: number; color: string;
    }

    const particles: Particle[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.12,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    let alive = true;
    const tick = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let anyVisible = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rot += p.rotSpeed;
        if (p.y < canvas.height + 20) anyVisible = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (anyVisible) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { alive = false; };
  }, []);

  // Prefetch the recommended second course so the "Continúa aprendiendo"
  // step shows instantly after submitting the evaluation.
  useEffect(() => {
    if (!hasEvalForm || alreadyEvaluated) return;
    nextCoursePromise.current = coursesApi.getNextCourse(slug)
      .then(({ ok, data }) => (ok ? (data.course as NextCourse | null) : null))
      .catch(() => null);
  }, [slug, hasEvalForm, alreadyEvaluated]);

  // Load evaluation form
  useEffect(() => {
    if (!hasEvalForm || alreadyEvaluated) return;
    setLoadingForm(true);
    coursesApi.getEvaluationForm(slug).then(({ ok, data }) => {
      if (ok && data.form) {
        setQuestions(data.form.questions.sort((a: Question, b: Question) => a.order_index - b.order_index));
      } else {
        setStep('done');
      }
    }).catch(() => setStep('done')).finally(() => setLoadingForm(false));
  }, [slug, hasEvalForm, alreadyEvaluated]);

  const setAnswer = useCallback((id: number, val: string) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setValidationError('');
  }, []);

  const handleSubmit = async () => {
    const missing = questions.filter(q => q.is_required && !answers[q.id]);
    if (missing.length > 0) {
      setValidationError(`Por favor responde ${missing.length} pregunta${missing.length > 1 ? 's' : ''} obligatoria${missing.length > 1 ? 's' : ''}.`);
      return;
    }
    setSubmitting(true);
    const answersList = Object.entries(answers).map(([qId, value]) => ({ question_id: Number(qId), value }));
    const { ok, data } = await coursesApi.submitEvaluation(slug, answersList);
    setSubmitting(false);
    if (ok) {
      onEvaluationSubmitted?.();
      const next = nextCoursePromise.current ? await nextCoursePromise.current : null;
      if (next) {
        setNextCourse(next);
        setStep('next');
      } else {
        setStep('done');
      }
    } else {
      setValidationError(data?.detail || 'Error al enviar la evaluación.');
    }
  };

  const handleDownloadCert = async () => {
    setDownloadingCert(true);
    try { await coursesApi.downloadCertificate(slug); }
    finally { setDownloadingCert(false); }
  };

  return (
    <div className="ccm-overlay">
      <canvas ref={canvasRef} className="ccm-canvas" />

      <div className={`ccm-modal${step === 'next' ? ' ccm-modal--wide' : ''}${step === 'form' ? ' ccm-modal--form' : ''}`}>
        <button className="ccm-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {step === 'next' && nextCourse ? (
          <div className="ccm-next">
            <h2 className="ccm-next-title">Continúa aprendiendo con este curso</h2>
            <div className="ccm-next-card">
              {nextCourse.thumbnail_url && (
                <img
                  className="ccm-next-thumb"
                  src={nextCourse.thumbnail_url}
                  alt={nextCourse.title}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="ccm-next-info">
                <h3 className="ccm-next-course">{nextCourse.title}</h3>
                {(nextCourse.instructor || nextCourse.duration_display) && (
                  <p className="ccm-next-meta">
                    {[nextCourse.instructor, nextCourse.duration_display].filter(Boolean).join(' · ')}
                  </p>
                )}
                {nextCourse.short_description && (
                  <p className="ccm-next-desc">{nextCourse.short_description}</p>
                )}
                <Link to={`/courses/${nextCourse.slug}`} className="ccm-next-cta" onClick={onClose}>
                  Empieza aquí
                </Link>
              </div>
            </div>
            <div className="ccm-next-footer">
              <button className="ccm-next-cert" onClick={handleDownloadCert} disabled={downloadingCert}>
                {downloadingCert ? 'Descargando...' : 'Descargar certificado'}
              </button>
              <Link to="/cursos" className="ccm-next-back" onClick={onClose}>
                Volver a la Nonprofit Academy <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        ) : step === 'done' ? (
          <div className="ccm-done">
            <div className="ccm-trophy">🎉</div>
            <h2 className="ccm-title">¡Felicidades!</h2>
            <p className="ccm-subtitle">Has completado el curso.</p>
            <div className="ccm-actions">
              <button className="ccm-btn ccm-btn-primary" onClick={handleDownloadCert} disabled={downloadingCert}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloadingCert ? 'Descargando...' : 'Descargar certificado'}
              </button>
              <Link to="/cursos" className="ccm-btn ccm-btn-secondary" onClick={onClose}>
                Explorar más cursos
              </Link>
            </div>
          </div>
        ) : loadingForm ? (
          <div className="ccm-loading">Cargando evaluación...</div>
        ) : (
          <div className="ccm-form">
            <h2 className="ccm-form-title">¡Completaste el curso! <span aria-hidden="true">🎉</span></h2>

            <div className="ccm-questions">
              {questions.map(q => (
                <div key={q.id} className="ccm-question">
                  <p className="ccm-question-text">
                    {q.question_text}
                  </p>
                  <QuestionInput question={q} value={answers[q.id] || ''} onChange={val => setAnswer(q.id, val)} />
                </div>
              ))}
            </div>

            {validationError && <p className="ccm-error">{validationError}</p>}

            <button className="ccm-submit-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar respuestas'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  switch (question.question_type) {
    case 'rating': return <RatingInput value={value} onChange={onChange} />;
    case 'scale': return <ScaleInput value={value} onChange={onChange} />;
    case 'nps': return <NpsInput value={value} onChange={onChange} />;
    case 'yes_no': return <YesNoInput value={value} onChange={onChange} />;
    case 'multiple_choice': return <MultipleChoiceInput options={question.options} value={value} onChange={onChange} />;
    case 'text':
      return <textarea className="ccm-textarea" value={value} onChange={e => onChange(e.target.value)} placeholder="Escribe tu respuesta" />;
    default: return null;
  }
}

function RatingInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hover, setHover] = useState(0);
  const rating = Number(value) || 0;
  return (
    <div className="ccm-stars">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" className="ccm-star"
          onClick={() => onChange(String(star))}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          <svg width="32" height="32" viewBox="0 0 24 24"
            fill={(hover || rating) >= star ? '#FF5A2F' : 'none'}
            stroke="#FF5A2F" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ScaleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="ccm-scale">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button"
            className={`ccm-scale-btn${value === String(n) ? ' active' : ''}`}
            onClick={() => onChange(String(n))}>{n}</button>
        ))}
      </div>
      <div className="ccm-nps-labels">
        <span>Muy baja</span>
        <span>Muy alta</span>
      </div>
    </div>
  );
}

function NpsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value !== '' ? Number(value) : -1;
  return (
    <div>
      <div className="ccm-nps">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} type="button"
            className={`ccm-nps-btn${selected === n ? ' active' : ''}`}
            onClick={() => onChange(String(n))}>{n}</button>
        ))}
      </div>
      <div className="ccm-nps-labels"><span>Nada probable</span><span>Muy probable</span></div>
    </div>
  );
}

function YesNoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="ccm-yesno">
      <button type="button" className={`ccm-yesno-btn${value === 'yes' ? ' active' : ''}`} onClick={() => onChange('yes')}>Sí</button>
      <button type="button" className={`ccm-yesno-btn${value === 'no' ? ' active' : ''}`} onClick={() => onChange('no')}>No</button>
    </div>
  );
}

function MultipleChoiceInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="ccm-choices">
      {options.map(option => (
        <div key={option} className={`ccm-choice${value === option ? ' active' : ''}`} onClick={() => onChange(option)}>
          <div className="ccm-choice-radio"><div className="ccm-choice-radio-dot" /></div>
          {option}
        </div>
      ))}
    </div>
  );
}
