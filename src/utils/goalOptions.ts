// Learning-goal (onboarding survey) options — mirror the backend choices in
// apps/users/models.py (GOAL_HOURS_CHOICES / GOAL_COURSES_CHOICES).

export const GOAL_HOURS_OPTIONS = [
  { value: '1_2', label: '1 a 2 horas' },
  { value: '2_3', label: '2 a 3 horas' },
  { value: '3_plus', label: '+3 horas' },
];

export const GOAL_COURSES_OPTIONS = [
  { value: '1_2', label: '1-2 cursos' },
  { value: '3_4', label: '3-4 cursos' },
  { value: '4_plus', label: '+4 cursos' },
];

export const goalHoursLabel = (value?: string) =>
  GOAL_HOURS_OPTIONS.find((o) => o.value === value)?.label || '';

export const goalCoursesLabel = (value?: string) =>
  GOAL_COURSES_OPTIONS.find((o) => o.value === value)?.label || '';

// Numeric target for the progress bar: the lower bound of the chosen range.
export const goalCoursesMin = (value?: string) =>
  ({ '1_2': 1, '3_4': 3, '4_plus': 4 }[value || ''] || 1);

const CYCLE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Rolling 30-day cycle anchored at goal_set_at: progress counts course
// completions inside the current cycle, and the deadline shown is its end.
export const currentCycle = (goalSetAt: string): { start: Date; end: Date } => {
  const anchor = new Date(goalSetAt).getTime();
  const elapsed = Math.max(0, Date.now() - anchor);
  const cycleIndex = Math.floor(elapsed / (CYCLE_DAYS * DAY_MS));
  const start = new Date(anchor + cycleIndex * CYCLE_DAYS * DAY_MS);
  const end = new Date(start.getTime() + CYCLE_DAYS * DAY_MS);
  return { start, end };
};

// "9 de julio" — Spanish date for the cycle deadline.
export const formatCycleEnd = (d: Date) =>
  d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });

// Survey options are only the categories with at least one visible course —
// the categories endpoint also returns internal ones (Staff, Test, ...).
export const visibleGoalCategories = <C extends { name: string }>(
  categories: C[],
  courses: { category?: { name: string } | null }[],
): C[] => {
  const inCatalog = new Set(courses.map((c) => c.category?.name).filter(Boolean));
  return categories.filter((c) => inCatalog.has(c.name));
};

// Join category names for the plan summary: "IA, Fundraising y Liderazgo".
export const joinNames = (names: string[]) => {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};
