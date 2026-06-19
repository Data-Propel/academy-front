// Passive action recorder for the admin panel. Keeps a ring buffer of the
// user's recent interactions (clicks, navigation, API calls, JS errors) so a
// problem report can include the steps that led to the issue.

export interface RecordedStep {
  t: string;
  type: 'click' | 'nav' | 'api' | 'error';
  detail: string;
}

const MAX_STEPS = 60;
let steps: RecordedStep[] = [];
let active = false;

const push = (type: RecordedStep['type'], detail: string) => {
  if (!active) return;
  steps.push({ t: new Date().toISOString(), type, detail });
  if (steps.length > MAX_STEPS) steps = steps.slice(-MAX_STEPS);
};

const describeTarget = (target: EventTarget | null): string => {
  if (!(target instanceof Element)) return 'unknown';
  const el = target.closest('button, a, input, select, textarea, [role="button"]') || target;
  const tag = el.tagName.toLowerCase();
  const cls = typeof el.className === 'string' && el.className
    ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
    : '';
  let text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!text && el instanceof HTMLInputElement) {
    text = el.placeholder || el.type;
  }
  return `<${tag}${cls}> ${text}`.trim();
};

const onClick = (e: MouseEvent) => push('click', describeTarget(e.target));
const onError = (e: ErrorEvent) =>
  push('error', `${e.message} (${e.filename}:${e.lineno})`);
const onRejection = (e: PromiseRejectionEvent) =>
  push('error', `Unhandled rejection: ${String(e.reason).slice(0, 200)}`);

export const startRecorder = () => {
  if (active) return;
  active = true;
  steps = [];
  document.addEventListener('click', onClick, true);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
};

export const stopRecorder = () => {
  active = false;
  document.removeEventListener('click', onClick, true);
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onRejection);
};

export const recordNav = (path: string) => push('nav', path);

export const recordApi = (method: string, endpoint: string, status: number) =>
  push('api', `${method} ${endpoint} → ${status}`);

export const getRecordedSteps = (): RecordedStep[] => [...steps];
