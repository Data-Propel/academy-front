import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { GOAL_HOURS_OPTIONS, GOAL_COURSES_OPTIONS, goalHoursLabel, goalCoursesLabel, joinNames } from '../../utils/goalOptions';
import './GoalSurveyModal.css';

// Onboarding survey (Figma S6-01): 3 questions — categories, courses/month,
// hours/week — saved to the user profile as their learning goal, plus a
// "¡Listo! Ya tienes tu plan" summary with recommended courses.

export interface GoalCategory {
  id: number;
  name: string;
  slug: string;
}

export interface GoalCourseRec {
  id: number;
  title: string;
  slug: string;
  thumbnail?: string;
  categoryName?: string;
}

interface GoalProfile {
  goal_hours_per_week?: string;
  goal_courses_per_month?: string;
  goal_categories?: string[];
}

const StarIcon = () => (
  <svg className="gsm-q-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l2.7 5.9 6.3.7-4.7 4.3 1.3 6.2L12 17l-5.6 3.1 1.3-6.2L3 9.6l6.3-.7L12 3z" />
  </svg>
);

const BookIcon = () => (
  <svg className="gsm-q-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="gsm-q-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const HeartIcon = () => (
  <svg className="gsm-q-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-7.5-4.7-9.5-9.2C1.2 8.6 3.2 5 6.7 5c2 0 3.4 1 4.3 2.5H12h1c.9-1.5 2.3-2.5 4.3-2.5 3.5 0 5.5 3.6 4.2 6.8C19.5 16.3 12 21 12 21z" />
  </svg>
);

const GoalSurveyModal = ({ categories, courses, initial, onClose, onSaved }: {
  categories: GoalCategory[];
  courses: GoalCourseRec[];
  initial?: GoalProfile;
  onClose: () => void;
  onSaved: (profile: GoalProfile & { goal_set_at?: string }) => void;
}) => {
  const [step, setStep] = useState(0);
  const [selectedCats, setSelectedCats] = useState<string[]>(initial?.goal_categories || []);
  const [coursesGoal, setCoursesGoal] = useState(initial?.goal_courses_per_month || '');
  const [hoursGoal, setHoursGoal] = useState(initial?.goal_hours_per_week || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleCat = (slug: string) => {
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const selectedNames = useMemo(
    () => categories.filter((c) => selectedCats.includes(c.slug)).map((c) => c.name),
    [categories, selectedCats]
  );

  // Up to 2 courses in the chosen categories; pad with the first catalog
  // courses so the "Te recomendamos" section is never empty.
  const recommendations = useMemo(() => {
    const matching = courses.filter((c) => c.categoryName && selectedNames.includes(c.categoryName));
    const rest = courses.filter((c) => !matching.includes(c));
    return [...matching, ...rest].slice(0, 2);
  }, [courses, selectedNames]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { ok, data } = await authApi.updateProfile({
        goal_categories: selectedCats,
        goal_courses_per_month: coursesGoal,
        goal_hours_per_week: hoursGoal,
      });
      if (ok) {
        onSaved(data);
        setStep(3);
      } else {
        const msg = data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : '';
        setError(msg || 'No se pudo guardar. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const stepValid =
    (step === 0 && selectedCats.length >= 1) ||
    (step === 1 && !!coursesGoal) ||
    (step === 2 && !!hoursGoal);

  const handleNext = () => {
    if (!stepValid || saving) return;
    if (step === 2) {
      handleSave();
    } else {
      setError('');
      setStep(step + 1);
    }
  };

  return (
    <div className="gsm-overlay" role="dialog" aria-modal="true" aria-label="Encuesta de metas de aprendizaje">
      <div className="gsm-modal">
        <button className="gsm-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {step === 0 && (
          <>
            <h2 className="gsm-title"><StarIcon /> Quiero aprender sobre...</h2>
            <p className="gsm-sub">Elige una o más áreas.</p>
            <div className="gsm-options gsm-options--wrap">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  className={`gsm-opt${selectedCats.includes(cat.slug) ? ' gsm-opt--selected' : ''}`}
                  onClick={() => toggleCat(cat.slug)}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="gsm-title"><BookIcon /> ¿Cuántos cursos quieres llevar por mes?</h2>
            <p className="gsm-sub">Cada curso va a estar entre 30 min a 50 min.</p>
            <div className="gsm-options">
              {GOAL_COURSES_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`gsm-opt${coursesGoal === opt.value ? ' gsm-opt--selected' : ''}`}
                  onClick={() => setCoursesGoal(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="gsm-title"><ClockIcon /> ¿Cuántas horas por semana quieres aprender?</h2>
            <p className="gsm-sub">Con esto podremos medir tu progreso.</p>
            <div className="gsm-options">
              {GOAL_HOURS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`gsm-opt${hoursGoal === opt.value ? ' gsm-opt--selected' : ''}`}
                  onClick={() => setHoursGoal(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="gsm-title">¡Listo! Ya tienes tu plan. 💪</h2>
            <div className="gsm-summary">
              <span className="gsm-summary-item"><ClockIcon /> {goalHoursLabel(hoursGoal)} por semana</span>
              <span className="gsm-summary-item"><BookIcon /> {goalCoursesLabel(coursesGoal)} mes</span>
              <span className="gsm-summary-item"><HeartIcon /> {joinNames(selectedNames)}</span>
            </div>
            {recommendations.length > 0 && (
              <>
                <p className="gsm-rec-title">Te recomendamos:</p>
                <div className="gsm-recs">
                  {recommendations.map((course) => (
                    <div key={course.id} className="gsm-rec">
                      {course.thumbnail && (
                        <img
                          className="gsm-rec-thumb"
                          src={course.thumbnail}
                          alt={course.title}
                          // Staging has no course media — fall back to the title
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span className="gsm-rec-name">{course.title}</span>
                      <Link to={`/courses/${course.slug}`} className="gsm-rec-cta" onClick={onClose}>
                        Empieza aquí
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {error && <div className="gsm-error">{error}</div>}

        {step < 3 && (
          <div className="gsm-footer">
            {step > 0 ? (
              <button type="button" className="gsm-back" onClick={() => { setError(''); setStep(step - 1); }} disabled={saving}>
                <span aria-hidden="true">←</span> Volver
              </button>
            ) : <span />}
            <button type="button" className="gsm-next" onClick={handleNext} disabled={!stepValid || saving}>
              {saving ? 'Guardando...' : 'Siguiente'} <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalSurveyModal;
