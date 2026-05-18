// Spanish-aware course search utilities.

const STATIC_ALIASES: Record<string, string[]> = {
  ia: ['inteligencia artificial'],
  'inteligencia artificial': ['ia'],
  rrhh: ['recursos humanos'],
  'recursos humanos': ['rrhh'],
  ong: ['organizacion no gubernamental'],
  rrss: ['redes sociales'],
  'redes sociales': ['rrss'],
};

export const normalize = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Word-prefix match (e.g. "market" matches "marketing"; "ia" only matches a word starting with "ia")
const matchesPhrase = (haystack: string, phrase: string): boolean => {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const re = new RegExp(tokens.map(t => `\\b${escapeRe(t)}`).join('\\s+\\S*\\s*'));
  return re.test(haystack);
};

export interface TagLike { name: string; aliases?: string }

/**
 * Build per-token candidate phrases (the token itself plus any aliases — static or tag-defined).
 * If any candidate phrase word-prefix-matches the haystack, the token is satisfied.
 */
const candidatesForToken = (token: string, tagAliases: Record<string, string[]>): string[] => {
  const out = new Set<string>([token]);
  for (const a of STATIC_ALIASES[token] || []) out.add(a);
  for (const a of tagAliases[token] || []) out.add(a);
  return [...out];
};

const buildTagAliasMap = (tags: TagLike[]): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const t of tags) {
    const name = normalize(t.name);
    const aliases = (t.aliases || '')
      .split(',')
      .map(a => normalize(a))
      .filter(Boolean);
    const all = [name, ...aliases];
    for (const term of all) {
      map[term] = map[term] || [];
      for (const other of all) if (other !== term) map[term].push(other);
    }
  }
  return map;
};

export const matchesSearch = (
  query: string,
  haystackParts: (string | undefined | null)[],
  tags: TagLike[] = [],
): boolean => {
  const q = normalize(query);
  if (!q) return true;
  const haystack = ' ' + haystackParts.map(p => normalize(p || '')).join(' ') + ' ';
  const tagAliases = buildTagAliasMap(tags);

  // Try query as one phrase first (handles multi-word like "inteligencia artificial").
  if (matchesPhrase(haystack, q)) return true;
  for (const cand of STATIC_ALIASES[q] || []) {
    if (matchesPhrase(haystack, cand)) return true;
  }

  // AND-match each token, expanded by aliases.
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every(tok =>
    candidatesForToken(tok, tagAliases).some(c => matchesPhrase(haystack, c))
  );
};
