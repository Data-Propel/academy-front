import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated } from '../../services/api';
import './CourseEvaluation.css';

interface EvaluationQuestion {
  id: number;
  question_text: string;
  question_type: 'rating' | 'scale' | 'nps' | 'yes_no' | 'multiple_choice' | 'text';
  options: string[];
  is_required: boolean;
  order_index: number;
}

interface EvaluationFormData {
  id: number;
  title: string;
  description: string;
  questions: EvaluationQuestion[];
}

export default function CourseEvaluation() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<EvaluationFormData | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!slug) return;
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return;
    }

    const loadForm = async () => {
      setLoading(true);
      const { ok, data } = await coursesApi.getEvaluationForm(slug);
      if (ok) {
        setForm(data.form);
        setAlreadySubmitted(data.already_submitted);
      } else {
        setError(data.detail || 'Error al cargar la evaluación.');
      }
      setLoading(false);
    };
    loadForm();
  }, [slug]);

  const setAnswer = useCallback((questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setValidationError('');
  }, []);

  const handleSubmit = async () => {
    if (!form || !slug) return;

    const missing = form.questions.filter(
      q => q.is_required && !answers[q.id]
    );
    if (missing.length > 0) {
      setValidationError(`Por favor responde todas las preguntas obligatorias (${missing.length} pendiente${missing.length > 1 ? 's' : ''}).`);
      return;
    }

    setSubmitting(true);
    const answersList = Object.entries(answers).map(([qId, value]) => ({
      question_id: Number(qId),
      value,
    }));

    const { ok, data } = await coursesApi.submitEvaluation(slug, answersList);
    if (ok) {
      setSubmitted(true);
    } else {
      setValidationError(data.detail || 'Error al enviar la evaluación.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="eval-page">
        <div className="eval-container">
          <div className="eval-loading">Cargando evaluación...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="eval-page">
        <div className="eval-container">
          <Link to={`/courses/${slug}`} className="eval-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al curso
          </Link>
          <div className="eval-error">{error}</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="eval-page">
        <div className="eval-container">
          <div className="eval-thankyou">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#A3C94A" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l2.5 2.5L16 9" />
            </svg>
            <h2>¡Gracias por tu evaluación!</h2>
            <p>Tu opinión nos ayuda a mejorar nuestros cursos.</p>
            <Link to={`/courses/${slug}`} className="eval-home-link">Volver al curso</Link>
          </div>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="eval-page">
        <div className="eval-container">
          <Link to={`/courses/${slug}`} className="eval-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Volver al curso
          </Link>
          <div className="eval-already">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0E4B43" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l2.5 2.5L16 9" />
            </svg>
            <h2>Ya evaluaste este curso</h2>
            <p>Gracias por compartir tu opinión.</p>
            <Link to="/profile" className="eval-home-link">Ir a mi perfil</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="eval-page">
      <div className="eval-container">
        <Link to={`/courses/${slug}`} className="eval-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Volver al curso
        </Link>

        <div className="eval-header">
          <h1 className="eval-title">{form.title}</h1>
          {form.description && <p className="eval-description">{form.description}</p>}
        </div>

        {form.questions.map(q => (
          <div key={q.id} className="eval-question">
            <p className="eval-question-text">
              {q.question_text}
              {q.is_required && <span className="eval-required">*</span>}
            </p>
            <QuestionInput
              question={q}
              value={answers[q.id] || ''}
              onChange={val => setAnswer(q.id, val)}
            />
          </div>
        ))}

        <div className="eval-submit-area">
          {validationError && (
            <p className="eval-validation-error">{validationError}</p>
          )}
          <button
            className="eval-submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : 'Enviar evaluación'}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: EvaluationQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  switch (question.question_type) {
    case 'rating':
      return <RatingInput value={value} onChange={onChange} />;
    case 'scale':
      return <ScaleInput value={value} onChange={onChange} />;
    case 'nps':
      return <NpsInput value={value} onChange={onChange} />;
    case 'yes_no':
      return <YesNoInput value={value} onChange={onChange} />;
    case 'multiple_choice':
      return <MultipleChoiceInput options={question.options} value={value} onChange={onChange} />;
    case 'text':
      return (
        <textarea
          className="eval-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Escribe tu respuesta..."
        />
      );
    default:
      return null;
  }
}

function RatingInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const rating = Number(value) || 0;
  const [hover, setHover] = useState(0);

  return (
    <div className="eval-stars">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="eval-star"
          onClick={() => onChange(String(star))}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
        >
          <svg width="32" height="32" viewBox="0 0 24 24"
            fill={(hover || rating) >= star ? '#FF5A2F' : 'none'}
            stroke="#FF5A2F" strokeWidth="1.5"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function ScaleInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="eval-scale">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          className={`eval-scale-btn${value === String(n) ? ' active' : ''}`}
          onClick={() => onChange(String(n))}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function NpsInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value !== '' ? Number(value) : -1;

  const getColor = (n: number) => {
    if (n <= 6) return '#e74c3c';
    if (n <= 8) return '#f39c12';
    return '#27ae60';
  };

  return (
    <div>
      <div className="eval-nps">
        {Array.from({ length: 11 }, (_, i) => i).map(n => (
          <button
            key={n}
            type="button"
            className={`eval-nps-btn${selected === n ? ' active' : ''}`}
            style={selected === n ? { background: getColor(n), borderColor: getColor(n) } : undefined}
            onClick={() => onChange(String(n))}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="eval-nps-labels">
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>
    </div>
  );
}

function YesNoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="eval-yesno">
      <button
        type="button"
        className={`eval-yesno-btn${value === 'yes' ? ' active' : ''}`}
        onClick={() => onChange('yes')}
      >
        Sí
      </button>
      <button
        type="button"
        className={`eval-yesno-btn${value === 'no' ? ' active' : ''}`}
        onClick={() => onChange('no')}
      >
        No
      </button>
    </div>
  );
}

function MultipleChoiceInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="eval-choices">
      {options.map(option => (
        <div
          key={option}
          className={`eval-choice${value === option ? ' active' : ''}`}
          onClick={() => onChange(option)}
        >
          <div className="eval-choice-radio">
            <div className="eval-choice-radio-dot" />
          </div>
          {option}
        </div>
      ))}
    </div>
  );
}
