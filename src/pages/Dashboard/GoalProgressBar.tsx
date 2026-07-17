import { useState } from 'react';
import { currentCycle, formatCycleEnd, goalCoursesMin, goalHoursLabel, goalCoursesLabel, joinNames } from '../../utils/goalOptions';
import type { GoalCategory } from '../../components/GoalSurveyModal/GoalSurveyModal';
import './GoalProgressBar.css';

// Learning-goal widget (Figma S6-01): dark strip with real progress vs. the
// user's monthly course goal + light panel summarizing the goal, with an
// "Edita tu meta" CTA that reopens the survey prefilled.

const ClockIcon = () => (
  <svg className="gpb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const BookIcon = () => (
  <svg className="gpb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="gpb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-7.5-4.7-9.5-9.2C1.2 8.6 3.2 5 6.7 5c2 0 3.4 1 4.3 2.5H12h1c.9-1.5 2.3-2.5 4.3-2.5 3.5 0 5.5 3.6 4.2 6.8C19.5 16.3 12 21 12 21z" />
  </svg>
);

const GoalProgressBar = ({ goal, categories, completionDates, onEdit }: {
  goal: {
    goal_hours_per_week?: string;
    goal_courses_per_month?: string;
    goal_categories?: string[];
    goal_set_at: string;
  };
  categories: GoalCategory[];
  completionDates: string[];
  onEdit: () => void;
}) => {
  // X only hides the summary panel for this visit; the progress strip stays.
  const [panelOpen, setPanelOpen] = useState(true);

  const { start, end } = currentCycle(goal.goal_set_at);
  const target = goalCoursesMin(goal.goal_courses_per_month);
  const completed = completionDates.filter((d) => {
    const t = new Date(d).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;
  const pct = Math.min(100, Math.round((completed / target) * 100));

  const message = pct >= 100
    ? '¡Cumpliste tu meta! 🎉'
    : pct >= 50
      ? '¡Ya estás cerca de cumplir tu meta!'
      : 'Tu meta está en marcha';

  const categoryNames = (goal.goal_categories || [])
    .map((slug) => categories.find((c) => c.slug === slug)?.name)
    .filter((n): n is string => !!n);

  return (
    <div className="gpb">
      <div className="gpb-strip">
        <span className="gpb-strip__msg">{message}</span>
        <div className="gpb-strip__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="gpb-strip__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="gpb-strip__pct">{pct}%</span>
      </div>

      {panelOpen && (
        <div className="gpb-panel">
          <button className="gpb-panel__close" onClick={() => setPanelOpen(false)} aria-label="Ocultar meta">✕</button>
          <div className="gpb-panel__info">
            <h2 className="gpb-panel__title">Tu meta hasta el {formatCycleEnd(end)}</h2>
            <div className="gpb-panel__chips">
              <span className="gpb-chip"><ClockIcon /> {goalHoursLabel(goal.goal_hours_per_week)} por semana</span>
              <span className="gpb-chip"><BookIcon /> {goalCoursesLabel(goal.goal_courses_per_month)} mes</span>
              {categoryNames.length > 0 && (
                <span className="gpb-chip"><HeartIcon /> {joinNames(categoryNames)}</span>
              )}
            </div>
          </div>
          <button className="gpb-panel__edit" onClick={onEdit}>Edita tu meta</button>
        </div>
      )}
    </div>
  );
};

export default GoalProgressBar;
