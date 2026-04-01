import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { type CSSProperties } from 'react';
import './FormRenderer.css';

// ── API types ──────────────────────────────────────────────────────────────────

interface FormData {
  id: string;
  name: string;
  description: string;
  program: string;
  type: string;
  welcome: { title: string; message: string; image_url: string } | null;
  thank_you: { title: string; message: string; redirect_url: string };
  branding: { color: string; logo_url: string };
  hidden_fields: string[];
  enable_scoring: boolean;
  show_score_to_respondent: boolean;
  questions: Question[];
  total_questions: number;
}

interface Question {
  id: string;
  text: string;
  type:
    | 'text_short'
    | 'text_long'
    | 'rating'
    | 'multiple_choice'
    | 'multiple_select'
    | 'number'
    | 'date'
    | 'yes_no'
    | 'scale'
    | 'email'
    | 'phone'
    | 'url'
    | 'file_upload'
    | 'nps'
    | 'statement';
  required: boolean;
  order: number;
  config: Record<string, unknown>;
  description: string;
  placeholder: string;
  image_url: string;
  condition: {
    question_id: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt';
    value: string;
  } | null;
  indicator_id: string;
  indicator_name: string;
  indicator_emoji: string;
}

interface SubmitResponse {
  response_id: string;
  submitted_at: string;
  thank_you: { title: string; message: string; redirect_url: string };
  score: { total: number; max_possible: number; percentage: number } | null;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface FormRendererProps {
  slug: string;
  embedded?: boolean;
  hiddenFields?: Record<string, string>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const API_BASE = 'https://api.wepropel.org';

// ── Component ──────────────────────────────────────────────────────────────────

export default function FormRenderer({
  slug,
  embedded = false,
  hiddenFields = {},
}: FormRendererProps) {
  // ── State ──────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{
    status: number;
    message: string;
  } | null>(null);

  const [screen, setScreen] = useState<
    'welcome' | 'questions' | 'submitting' | 'thankyou'
  >('welcome');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState('');
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  // Rating hover state
  const [ratingHover, setRatingHover] = useState(0);

  // File upload state
  const [fileData, setFileData] = useState<
    Record<string, { name: string; data: string }>
  >({});

  // Timer
  const startTime = useRef(Date.now());

  // Transition
  const [transitioning, setTransitioning] = useState(false);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'backward'>(
    'forward',
  );

  // ── Fetch form on mount ────────────────────────────────────────────────────

  const fetchForm = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/forms/${slug}/`);
      if (res.ok) {
        const data: FormData = await res.json();
        setFormData(data);
        if (!data.welcome) setScreen('questions');
      } else if (res.status === 404) {
        setError({ status: 404, message: 'Formulario no encontrado' });
      } else if (res.status === 410) {
        const data = await res.json();
        setError({
          status: 410,
          message:
            (data as { message?: string }).message ||
            'Este formulario ya no está disponible',
        });
      } else if (res.status === 409) {
        setError({
          status: 409,
          message: 'Ya enviaste una respuesta a este formulario',
        });
      } else {
        setError({
          status: res.status,
          message: 'Error al cargar el formulario',
        });
      }
    } catch {
      setError({
        status: 0,
        message: 'Error de conexión. Verifica tu conexión a internet.',
      });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  // ── Visible questions (conditional logic) ──────────────────────────────────

  const visibleQuestions = useMemo(() => {
    if (!formData) return [];
    return formData.questions
      .sort((a, b) => a.order - b.order)
      .filter((q) => {
        if (!q.condition) return true;
        const answer = answers[q.condition.question_id];
        if (answer === undefined) return false;
        switch (q.condition.operator) {
          case 'equals':
            return answer === q.condition.value;
          case 'not_equals':
            return answer !== q.condition.value;
          case 'contains':
            return answer.includes(q.condition.value);
          case 'gt':
            return Number(answer) > Number(q.condition.value);
          case 'lt':
            return Number(answer) < Number(q.condition.value);
          default:
            return true;
        }
      });
  }, [formData, answers]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const currentQuestion = visibleQuestions[currentIndex] as
    | Question
    | undefined;
  const progress =
    visibleQuestions.length > 0
      ? ((currentIndex + 1) / visibleQuestions.length) * 100
      : 0;
  const isLastQuestion = currentIndex === visibleQuestions.length - 1;

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateQuestion = (
    q: Question,
    value: string | undefined,
  ): string => {
    if (q.type === 'statement') return '';
    if (q.required && (!value || value.trim() === ''))
      return 'Este campo es obligatorio';
    if (!value) return '';

    switch (q.type) {
      case 'email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return 'Ingresa un email válido';
        break;
      }
      case 'phone': {
        if (!/^[\d\s\-+()]{7,20}$/.test(value))
          return 'Ingresa un teléfono válido';
        break;
      }
      case 'url': {
        try {
          new URL(value);
        } catch {
          return 'Ingresa una URL válida';
        }
        break;
      }
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) return 'Ingresa un número válido';
        const config = q.config as { min?: number; max?: number };
        if (config.min !== undefined && num < config.min)
          return `El valor mínimo es ${config.min}`;
        if (config.max !== undefined && num > config.max)
          return `El valor máximo es ${config.max}`;
        break;
      }
    }
    return '';
  };

  // ── Answer handling ────────────────────────────────────────────────────────

  const setAnswer = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      setValidationError('');
    },
    [],
  );

  const toggleMultiSelect = useCallback(
    (questionId: string, optionValue: string) => {
      setAnswers((prev) => {
        const current = prev[questionId] || '';
        const values = current ? current.split(',') : [];
        const idx = values.indexOf(optionValue);
        if (idx >= 0) values.splice(idx, 1);
        else values.push(optionValue);
        return { ...prev, [questionId]: values.join(',') };
      });
      setValidationError('');
    },
    [],
  );

  const handleFileSelect = useCallback(
    (questionId: string, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setFileData((prev) => ({
          ...prev,
          [questionId]: { name: file.name, data: base64 },
        }));
        setAnswer(questionId, file.name);
      };
      reader.readAsDataURL(file);
    },
    [setAnswer],
  );

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setScreen('submitting');
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);

    const allHiddenFields: Record<string, string> = { ...hiddenFields };

    const answersArray = visibleQuestions
      .filter((q) => q.type !== 'statement' && answers[q.id])
      .map((q) => {
        let value = answers[q.id];
        if (q.type === 'file_upload' && fileData[q.id]) {
          value = fileData[q.id].data;
        }
        return { question_id: q.id, value };
      });

    const body = {
      respondent_email: allHiddenFields.email || '',
      respondent_name: allHiddenFields.name || '',
      hidden_fields: allHiddenFields,
      answers: answersArray,
      completion_time_seconds: elapsed,
    };

    try {
      const res = await fetch(`${API_BASE}/api/forms/${slug}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 201) {
        const result: SubmitResponse = await res.json();
        setSubmitResult(result);
        setScreen('thankyou');

        const redirectUrl = result.thank_you?.redirect_url;
        if (redirectUrl) {
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 3000);
        }
      } else if (res.status === 409) {
        setError({
          status: 409,
          message: 'Ya enviaste una respuesta a este formulario',
        });
        setScreen('questions');
      } else {
        setError({
          status: res.status,
          message: 'Error al enviar el formulario. Intenta de nuevo.',
        });
        setScreen('questions');
      }
    } catch {
      setError({
        status: 0,
        message: 'Error de conexión. Intenta de nuevo.',
      });
      setScreen('questions');
    }
  }, [answers, fileData, hiddenFields, slug, visibleQuestions]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (transitioning) return;
    if (!currentQuestion) return;

    const err = validateQuestion(currentQuestion, answers[currentQuestion.id]);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError('');

    if (isLastQuestion) {
      handleSubmit();
      return;
    }

    setTransitionDir('forward');
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setTransitioning(false);
    }, 300);
  }, [transitioning, currentQuestion, answers, isLastQuestion, handleSubmit]);

  const goPrev = useCallback(() => {
    if (transitioning || currentIndex === 0) return;
    setValidationError('');
    setTransitionDir('backward');
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
      setTransitioning(false);
    }, 300);
  }, [transitioning, currentIndex]);

  // ── Auto-advance wrapper ───────────────────────────────────────────────────

  const setAnswerAndAdvance = useCallback(
    (questionId: string, value: string) => {
      setAnswer(questionId, value);
      setTimeout(() => {
        goNext();
      }, 500);
    },
    [setAnswer, goNext],
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'questions') return;
      if (e.key === 'Enter' && !e.shiftKey) {
        if (currentQuestion?.type === 'text_long') return;
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, currentQuestion, goNext]);

  // ── Render question ────────────────────────────────────────────────────────

  const renderQuestion = (q: Question) => {
    const value = answers[q.id] || '';

    switch (q.type) {
      case 'text_short':
        return (
          <input
            className="form-input"
            type="text"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'Escribe tu respuesta...'}
            autoFocus
          />
        );

      case 'text_long':
        return (
          <textarea
            className="form-input form-textarea"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'Escribe tu respuesta...'}
            rows={4}
            autoFocus
          />
        );

      case 'email':
        return (
          <input
            className="form-input"
            type="email"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'nombre@ejemplo.com'}
            autoFocus
          />
        );

      case 'phone':
        return (
          <input
            className="form-input"
            type="tel"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || '+1 (555) 000-0000'}
            autoFocus
          />
        );

      case 'url':
        return (
          <input
            className="form-input"
            type="url"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder={q.placeholder || 'https://...'}
            autoFocus
          />
        );

      case 'number': {
        const cfg = q.config as { min?: number; max?: number };
        return (
          <input
            className="form-input form-number-input"
            type="number"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            min={cfg.min}
            max={cfg.max}
            placeholder={q.placeholder || 'Número'}
            autoFocus
          />
        );
      }

      case 'date':
        return (
          <input
            className="form-input form-date-input"
            type="date"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        );

      case 'rating': {
        const max = (q.config as { max?: number }).max || 5;
        const rating = Number(value) || 0;
        return (
          <div className="form-rating">
            {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
              <span
                key={star}
                className={`form-star ${star <= rating ? 'active' : ''} ${star <= ratingHover && ratingHover > 0 ? 'hover-preview' : ''}`}
                onClick={() => setAnswerAndAdvance(q.id, String(star))}
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(0)}
              >
                ★
              </span>
            ))}
          </div>
        );
      }

      case 'multiple_choice': {
        const options =
          (
            q.config as {
              options?: { label: string; value: string }[];
            }
          ).options || [];
        return (
          <div className="form-choices">
            {options.map((opt, i) => (
              <div
                key={opt.value}
                className={`form-choice ${value === opt.value ? 'selected' : ''}`}
                onClick={() => setAnswerAndAdvance(q.id, opt.value)}
              >
                <span className="form-choice-key">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="form-choice-label">{opt.label}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'multiple_select': {
        const options =
          (
            q.config as {
              options?: { label: string; value: string }[];
            }
          ).options || [];
        const selectedValues = value ? value.split(',') : [];
        return (
          <div className="form-choices">
            {options.map((opt, i) => (
              <div
                key={opt.value}
                className={`form-choice ${selectedValues.includes(opt.value) ? 'selected' : ''}`}
                onClick={() => toggleMultiSelect(q.id, opt.value)}
              >
                <span className="form-choice-key">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="form-choice-label">{opt.label}</span>
              </div>
            ))}
          </div>
        );
      }

      case 'yes_no':
        return (
          <div className="form-yesno">
            <button
              type="button"
              className={`form-yesno-btn ${value === 'yes' ? 'selected' : ''}`}
              onClick={() => setAnswerAndAdvance(q.id, 'yes')}
            >
              Sí
            </button>
            <button
              type="button"
              className={`form-yesno-btn ${value === 'no' ? 'selected' : ''}`}
              onClick={() => setAnswerAndAdvance(q.id, 'no')}
            >
              No
            </button>
          </div>
        );

      case 'scale': {
        const cfg = q.config as {
          min?: number;
          max?: number;
          step?: number;
          labels?: { start?: string; end?: string };
        };
        const min = cfg.min ?? 1;
        const max = cfg.max ?? 10;
        const step = cfg.step ?? 1;
        const steps: number[] = [];
        for (let v = min; v <= max; v += step) steps.push(v);
        return (
          <div>
            <div className="form-scale">
              {steps.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`form-scale-btn ${value === String(s) ? 'selected' : ''}`}
                  onClick={() => setAnswer(q.id, String(s))}
                >
                  {s}
                </button>
              ))}
            </div>
            {cfg.labels && (
              <div className="form-scale-labels">
                <span>{cfg.labels.start || ''}</span>
                <span>{cfg.labels.end || ''}</span>
              </div>
            )}
          </div>
        );
      }

      case 'nps':
        return (
          <div>
            <div className="form-nps">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`form-nps-btn ${value === String(n) ? 'selected' : ''}`}
                  onClick={() => setAnswerAndAdvance(q.id, String(n))}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="form-nps-labels">
              <span>Nada probable</span>
              <span>Muy probable</span>
            </div>
          </div>
        );

      case 'statement':
        return <div className="form-statement">{q.description}</div>;

      case 'file_upload': {
        const uploaded = fileData[q.id];
        return (
          <div>
            <div
              className="form-file-drop"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('dragover');
              }}
              onDragLeave={(e) =>
                e.currentTarget.classList.remove('dragover')
              }
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('dragover');
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(q.id, f);
              }}
              onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.onchange = () => {
                  if (inp.files?.[0]) handleFileSelect(q.id, inp.files[0]);
                };
                inp.click();
              }}
            >
              <p style={{ color: '#999', fontSize: '1rem' }}>
                Arrastra un archivo o{' '}
                <strong style={{ color: 'var(--form-color)' }}>
                  haz clic para seleccionar
                </strong>
              </p>
            </div>
            {uploaded && (
              <div className="form-file-name">
                <span>{uploaded.name}</span>
                <button
                  type="button"
                  className="form-file-remove"
                  onClick={() => {
                    setFileData((prev) => {
                      const next = { ...prev };
                      delete next[q.id];
                      return next;
                    });
                    setAnswer(q.id, '');
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <input
            className="form-input"
            type="text"
            value={value}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            autoFocus
          />
        );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Loading
  if (loading) {
    return (
      <div
        className={`form-renderer ${embedded ? 'embedded' : 'standalone'}`}
        style={{ '--form-color': '#6366f1' } as CSSProperties}
      >
        <div className="form-loading">
          <div className="form-loading-spinner" />
          <p>Cargando formulario...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div
        className={`form-renderer ${embedded ? 'embedded' : 'standalone'}`}
        style={{ '--form-color': '#6366f1' } as CSSProperties}
      >
        <div className="form-error-screen">
          <h2>
            {error.status === 404
              ? 'Formulario no encontrado'
              : error.status === 409
                ? 'Respuesta duplicada'
                : 'Error'}
          </h2>
          <p>{error.message}</p>
          {error.status === 0 && (
            <button className="form-retry-btn" onClick={fetchForm}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!formData) return null;

  const brandColor = formData.branding?.color || '#6366f1';

  return (
    <div
      className={`form-renderer ${embedded ? 'embedded' : 'standalone'}`}
      style={{ '--form-color': brandColor } as CSSProperties}
    >
      {/* Progress bar */}
      {screen === 'questions' && (
        <div className="form-progress-bar">
          <div
            className="form-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Header with logo */}
      {formData.branding?.logo_url && (
        <div className="form-header">
          <img src={formData.branding.logo_url} alt="" className="form-logo" />
        </div>
      )}

      {/* Welcome screen */}
      {screen === 'welcome' && formData.welcome && (
        <div className="form-content">
          <div className="form-welcome">
            {formData.welcome.image_url && (
              <img
                src={formData.welcome.image_url}
                alt=""
                className="form-welcome-image"
              />
            )}
            <h1 className="form-welcome-title">{formData.welcome.title}</h1>
            <p className="form-welcome-message">{formData.welcome.message}</p>
            <button
              className="form-start-btn"
              onClick={() => setScreen('questions')}
            >
              Comenzar
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      {screen === 'questions' && currentQuestion && (
        <>
          <div className="form-content">
            <div
              className={`form-question-container ${
                transitioning
                  ? transitionDir === 'forward'
                    ? 'form-question-exit-active'
                    : 'form-question-enter'
                  : 'form-question-enter-active'
              }`}
            >
              {/* Question number */}
              <div className="form-q-number">
                <span>{currentIndex + 1}</span>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path
                    d="M1 5l3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
                {currentQuestion.indicator_emoji && (
                  <span className="form-q-indicator">
                    {currentQuestion.indicator_emoji}{' '}
                    {currentQuestion.indicator_name}
                  </span>
                )}
              </div>

              {/* Question text */}
              <h2 className="form-q-text">
                {currentQuestion.text}
                {currentQuestion.required && (
                  <span className="form-q-required">*</span>
                )}
              </h2>

              {/* Description */}
              {currentQuestion.description &&
                currentQuestion.type !== 'statement' && (
                  <p className="form-q-description">
                    {currentQuestion.description}
                  </p>
                )}

              {/* Image */}
              {currentQuestion.image_url && (
                <img
                  src={currentQuestion.image_url}
                  alt=""
                  className="form-q-image"
                />
              )}

              {/* Input */}
              {renderQuestion(currentQuestion)}

              {/* Validation error */}
              {validationError && (
                <p className="form-error">{validationError}</p>
              )}

              {/* Enter hint for text inputs */}
              {[
                'text_short',
                'email',
                'phone',
                'url',
                'number',
              ].includes(currentQuestion.type) && (
                <p className="form-enter-hint">
                  Presiona <kbd>Enter ↵</kbd> para continuar
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="form-footer">
            <button
              type="button"
              className="form-nav-btn secondary"
              onClick={goPrev}
              disabled={currentIndex === 0}
            >
              ← Anterior
            </button>
            <span className="form-counter">
              {currentIndex + 1} / {visibleQuestions.length}
            </span>
            <button
              type="button"
              className="form-nav-btn primary"
              onClick={goNext}
            >
              {isLastQuestion ? 'Enviar' : 'Siguiente →'}
            </button>
          </div>
        </>
      )}

      {/* Submitting */}
      {screen === 'submitting' && (
        <div className="form-content">
          <div className="form-loading">
            <div className="form-loading-spinner" />
            <p>Enviando respuestas...</p>
          </div>
        </div>
      )}

      {/* Thank you */}
      {screen === 'thankyou' && (
        <div className="form-content">
          <div className="form-thankyou">
            {formData.show_score_to_respondent && submitResult?.score && (
              <div className="form-score">
                <div className="form-score-value">
                  {submitResult.score.percentage.toFixed(0)}%
                </div>
                <div className="form-score-label">
                  {submitResult.score.total} / {submitResult.score.max_possible}{' '}
                  puntos
                </div>
              </div>
            )}
            <h1 className="form-thankyou-title">
              {submitResult?.thank_you?.title ||
                formData.thank_you.title ||
                '¡Gracias!'}
            </h1>
            <p className="form-thankyou-message">
              {submitResult?.thank_you?.message ||
                formData.thank_you.message ||
                'Tu respuesta ha sido registrada.'}
            </p>
            {submitResult?.thank_you?.redirect_url && (
              <p style={{ color: '#999', fontSize: '0.85rem' }}>
                Redirigiendo en unos segundos...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
