// First-touch attribution: capture UTM params + referrer + landing page on the
// first page load of the session and persist in localStorage so they survive
// reloads and the trip through the register form.

const STORAGE_KEY = 'first_touch_attribution';

export type Attribution = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  referrer: string;
  landing_page: string;
};

const EMPTY: Attribution = {
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
  referrer: '',
  landing_page: '',
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

function isInternalReferrer(ref: string): boolean {
  if (!ref) return true;
  try {
    return new URL(ref).host === window.location.host;
  } catch {
    return false;
  }
}

export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;

  // Already captured this session — first-touch wins, don't overwrite.
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    try {
      return { ...EMPTY, ...JSON.parse(existing) };
    } catch {
      // fall through and re-capture
    }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = { ...EMPTY };

  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) attribution[key] = val.slice(0, 255);
  }

  const ref = document.referrer || '';
  if (ref && !isInternalReferrer(ref)) {
    attribution.referrer = ref.slice(0, 2000);
  }
  attribution.landing_page = window.location.href.slice(0, 2000);

  // Only persist if we actually got something meaningful. Otherwise leave
  // localStorage empty so a later visit with real UTMs becomes the first-touch.
  const hasSignal = UTM_KEYS.some((k) => attribution[k]) || !!attribution.referrer;
  if (hasSignal) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    } catch {
      // ignore storage errors
    }
  }

  return attribution;
}

export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function clearAttribution(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Current-touch: prefer this visit's URL params, fall back to first-touch.
// Used for per-action attribution (e.g. enrollment) — the most recent campaign
// the user clicked through is the one we credit.
export function getCurrentAttribution(): Attribution {
  if (typeof window === 'undefined') return EMPTY;
  const params = new URLSearchParams(window.location.search);
  const current: Attribution = { ...EMPTY };
  let anyUrlUtm = false;
  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) {
      current[key] = val.slice(0, 255);
      anyUrlUtm = true;
    }
  }
  if (anyUrlUtm) {
    const ref = document.referrer || '';
    if (ref && !isInternalReferrer(ref)) current.referrer = ref.slice(0, 2000);
    current.landing_page = window.location.href.slice(0, 2000);
    return current;
  }
  return getAttribution();
}
