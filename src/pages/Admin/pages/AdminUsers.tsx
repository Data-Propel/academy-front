import { useState, useEffect, useCallback, useMemo, memo, type FormEvent, type ChangeEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { type User } from '../AdminContext';
import PageHeader from '../components/PageHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import { adminApi } from '../../../services/api';

// ---- Constants ----

const ORGANIZATION_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ong', label: 'ONG / Organización sin fines de lucro' },
  { value: 'fundacion', label: 'Fundación' },
  { value: 'asociacion', label: 'Asociación civil' },
  { value: 'empresa_social', label: 'Empresa social' },
  { value: 'cooperativa', label: 'Cooperativa' },
  { value: 'educativa', label: 'Institución educativa' },
  { value: 'gobierno', label: 'Organismo gubernamental' },
  { value: 'internacional', label: 'Organismo internacional' },
  { value: 'otro', label: 'Otro' },
];

type EditableField =
  | 'email' | 'first_name' | 'last_name' | 'display_name'
  | 'country' | 'organization' | 'organization_type'
  | 'avatar' | 'bio'
  | 'is_active' | 'email_verified' | 'is_staff' | 'is_superuser';

type RowEdits = Partial<Pick<User, EditableField>>;
type EditMap = Record<number, RowEdits>;

interface CreateForm {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
  is_superuser: boolean;
}

const emptyCreateForm: CreateForm = {
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_active: true,
  is_superuser: false,
};

type SortDir = 'asc' | 'desc';
type SortKey = keyof User;

interface ColumnDef {
  key: SortKey;
  label: string;
  type: 'text' | 'select' | 'textarea' | 'checkbox' | 'readonly-number' | 'readonly-date';
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'id',                label: 'ID',         type: 'readonly-number', width: '70px' },
  { key: 'email',             label: 'Email',      type: 'text',            width: '240px' },
  { key: 'first_name',        label: 'Nombre',     type: 'text',            width: '140px' },
  { key: 'last_name',         label: 'Apellido',   type: 'text',            width: '140px' },
  { key: 'display_name',      label: 'Mostrar',    type: 'text',            width: '140px' },
  { key: 'country',           label: 'País',       type: 'text',            width: '140px' },
  { key: 'organization',      label: 'Organización', type: 'text',          width: '180px' },
  { key: 'organization_type', label: 'Tipo org.',  type: 'select',          width: '160px' },
  { key: 'avatar',            label: 'Avatar URL', type: 'text',            width: '180px' },
  { key: 'bio',               label: 'Bio',        type: 'textarea',        width: '200px' },
  { key: 'is_active',         label: 'Activo',     type: 'checkbox',        width: '70px' },
  { key: 'email_verified',    label: 'Verificado', type: 'checkbox',        width: '90px' },
  { key: 'is_staff',          label: 'Staff',      type: 'checkbox',        width: '70px' },
  { key: 'is_superuser',      label: 'Admin',      type: 'checkbox',        width: '70px' },
  { key: 'date_joined',       label: 'Registrado', type: 'readonly-date',   width: '120px' },
];

// Country canonicalization map (mirrors the SQL normalization script).
const COUNTRY_MAP: Record<string, string> = {
  MX: 'México',  PE: 'Perú',  CL: 'Chile',  CO: 'Colombia',  AR: 'Argentina',
  BO: 'Bolivia',  EC: 'Ecuador',  CU: 'Cuba',
  Mexico: 'México',  Brazil: 'Brasil',  Spain: 'España',  Panama: 'Panamá',
  'United States': 'Estados Unidos',  Germany: 'Alemania',  Italy: 'Italia',
  Poland: 'Polonia',  Lithuania: 'Lituania',  Iceland: 'Islandia',
  Luxembourg: 'Luxemburgo',  Japan: 'Japón',  Belize: 'Belice',  Monaco: 'Mónaco',
  Mali: 'Malí',  Bahrain: 'Baréin',  Rwanda: 'Ruanda',  Azerbaijan: 'Azerbaiyán',
  Taiwan: 'Taiwán',  'Guinea-Bissau': 'Guinea-Bisáu',  Afghanistan: 'Afganistán',
  'Dominican Republic': 'República Dominicana',
  'Saint Vincent and the Grenadines': 'San Vicente y las Granadinas',
  'Central African Republic': 'República Centroafricana',
  'Congo (Congo-Brazzaville)': 'República del Congo',
  'Democratic Republic of the Congo': 'República Democrática del Congo',
};

// Canonical country names (all valid targets); used for accent-insensitive matching.
const CANONICAL_COUNTRIES = [
  'México', 'Perú', 'Chile', 'Colombia', 'Argentina', 'Bolivia', 'Ecuador',
  'Cuba', 'Brasil', 'España', 'Panamá', 'Estados Unidos', 'Alemania', 'Italia',
  'Polonia', 'Lituania', 'Islandia', 'Luxemburgo', 'Japón', 'Belice', 'Mónaco',
  'Malí', 'Baréin', 'Ruanda', 'Azerbaiyán', 'Taiwán', 'Guinea-Bisáu', 'Afganistán',
  'República Dominicana', 'San Vicente y las Granadinas', 'República Centroafricana',
  'República del Congo', 'República Democrática del Congo',
  'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica',
  'Venezuela', 'Uruguay', 'Paraguay', 'Israel', 'Uganda', 'Chad',
  'Vietnam', 'Sri Lanka', 'Liberia', 'Jamaica', 'Seychelles', 'Serbia',
  'Malta', 'Namibia', 'Kiribati', 'Nauru',
];

// Email TLD → canonical country
const TLD_TO_COUNTRY: Record<string, string> = {
  mx: 'México', pe: 'Perú', cl: 'Chile', co: 'Colombia', ar: 'Argentina',
  bo: 'Bolivia', ec: 'Ecuador', br: 'Brasil', es: 'España', gt: 'Guatemala',
  hn: 'Honduras', sv: 'El Salvador', ni: 'Nicaragua', cr: 'Costa Rica',
  pa: 'Panamá', do: 'República Dominicana', uy: 'Uruguay', py: 'Paraguay',
  ve: 'Venezuela', cu: 'Cuba', us: 'Estados Unidos',
};

// Spanish particles that should stay lowercase mid-name (e.g. "Juan de la Cruz")
const SPANISH_PARTICLES = new Set([
  'de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das', 'di', 'van', 'von',
]);

// Strip diacritics + lowercase for fuzzy matching
const normalizeForMatch = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Build the lookup: every variant (normalized) → canonical
const COUNTRY_LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const c of CANONICAL_COUNTRIES) m.set(normalizeForMatch(c), c);
  for (const [variant, canonical] of Object.entries(COUNTRY_MAP)) m.set(normalizeForMatch(variant), canonical);
  // Common variants not in the map
  const extra: Array<[string, string]> = [
    ['usa', 'Estados Unidos'], ['u.s.a.', 'Estados Unidos'],
    ['ee.uu.', 'Estados Unidos'], ['eeuu', 'Estados Unidos'], ['ee uu', 'Estados Unidos'],
    ['mejico', 'México'],
  ];
  for (const [variant, canonical] of extra) m.set(normalizeForMatch(variant), canonical);
  return m;
})();

const titleCaseSpanish = (input: string): string => {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed
    .toLowerCase()
    .split(' ')
    .map((word, idx) => {
      if (idx > 0 && SPANISH_PARTICLES.has(word)) return word;
      // Hyphenated names ("Maria-Jose") and apostrophes ("D'Angelo")
      return word
        .split(/([-'])/)
        .map((part) => (part === '-' || part === "'" ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
    })
    .join(' ');
};

// Org Title Case — like Spanish Title Case but preserves short ALL-CAPS tokens as acronyms.
const isAcronymToken = (word: string): boolean =>
  word.length >= 2 && word.length <= 5 && word === word.toUpperCase() && /^[A-ZÁÉÍÓÚÑÜ0-9]+$/.test(word);

const titleCaseOrg = (input: string): string => {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  return trimmed
    .split(' ')
    .map((word, idx) => {
      if (isAcronymToken(word)) return word; // keep IMSS, BID, ONG, etc.
      const lower = word.toLowerCase();
      if (idx > 0 && SPANISH_PARTICLES.has(lower)) return lower;
      return lower
        .split(/([-'])/)
        .map((part) => (part === '-' || part === "'" ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('');
    })
    .join(' ');
};

const PLACEHOLDER_ORG_VALUES = new Set(['-', '_', '.', '..', '...', 'n/a', 'na', 'ninguna', 'ninguno', 'none', 'no', 's/n']);

// Patterns that infer organization_type from the organization name.
// First match wins — order matters (fundación > asociación > ong).
const ORG_TYPE_PATTERNS: Array<{ type: string; test: RegExp }> = [
  { type: 'fundacion',      test: /(^|\s)fundacion/ },
  { type: 'cooperativa',    test: /cooperativa/ },
  { type: 'empresa_social', test: /empresa social|social enterprise/ },
  { type: 'educativa',      test: /\b(universidad|instituto|colegio|escuela|tecnologic|tec de)\b/ },
  { type: 'gobierno',       test: /\b(ministerio|gobierno|secretari|municip)/ },
  { type: 'asociacion',     test: /\b(asoc|asociacion civil|a\.c\.|ac)\b/ },
  { type: 'ong',            test: /\bong\b/ },
];

// Common email-domain typos → corrected domain
const EMAIL_TYPO_DOMAINS: Record<string, string> = {
  'gmial.com': 'gmail.com',   'gnail.com': 'gmail.com',  'gmai.com': 'gmail.com',
  'gimal.com': 'gmail.com',   'gamil.com': 'gmail.com',  'gmail.co': 'gmail.com',
  'gmail.cm':  'gmail.com',
  'hotnail.com':  'hotmail.com', 'hotmial.com':  'hotmail.com',
  'homail.com':   'hotmail.com', 'hotmali.com':  'hotmail.com',
  'hotmail.co':   'hotmail.com',
  'yaho.com':   'yahoo.com', 'yahho.com':  'yahoo.com',
  'yahoo.co':   'yahoo.com', 'yahool.com': 'yahoo.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'outloook.com': 'outlook.com',
  'icloud.co':  'icloud.com', 'iclud.com':  'icloud.com',
};

// ---- Suggestion engine ----

interface Suggestion {
  userId: number;
  field: EditableField;
  current: unknown;
  proposed: unknown;
}

interface SuggestionCategory {
  key: string;
  label: string;
  description: string;
  suggestions: Suggestion[];
}

const computeSuggestions = (users: User[]): SuggestionCategory[] => {
  const country: Suggestion[] = [];
  const countryFromTld: Suggestion[] = [];
  const nameCase: Suggestion[] = [];
  const whitespace: Suggestion[] = [];
  const emailCase: Suggestion[] = [];
  const splitName: Suggestion[] = [];
  const deriveDisplay: Suggestion[] = [];
  const orgUnify: Suggestion[] = [];
  const orgCase: Suggestion[] = [];
  const orgPlaceholder: Suggestion[] = [];
  const orgTypeInfer: Suggestion[] = [];
  const emailTypo: Suggestion[] = [];
  const emailInName: Suggestion[] = [];
  const nameEqualsLast: Suggestion[] = [];

  const TEXT_FIELDS: EditableField[] = ['first_name', 'last_name', 'display_name', 'organization', 'country', 'bio', 'avatar'];

  // -------- Pre-pass: organization variant unification --------
  // Group users by normalized org → pick most-common spelling; suggest others map to it.
  const orgGroups = new Map<string, Map<string, number>>(); // norm → (variant → count)
  for (const u of users) {
    const org = u.organization;
    if (!org) continue;
    const norm = normalizeForMatch(org.replace(/\s+/g, ' '));
    if (!norm || PLACEHOLDER_ORG_VALUES.has(norm)) continue;
    let inner = orgGroups.get(norm);
    if (!inner) { inner = new Map(); orgGroups.set(norm, inner); }
    inner.set(org, (inner.get(org) ?? 0) + 1);
  }
  // Canonical spelling per normalized key.
  // Strategy: take the most-common variant, then apply Title-Case canonicalization,
  // so even when every variant in the data is dirty (e.g. all-caps), we propose a clean target.
  const orgCanonical = new Map<string, string>();
  for (const [norm, variants] of orgGroups) {
    if (variants.size < 2) continue; // only one spelling — nothing to unify
    let mostCommon = '';
    let mostCommonCount = -1;
    for (const [variant, count] of variants) {
      if (count > mostCommonCount || (count === mostCommonCount && variant.localeCompare(mostCommon) < 0)) {
        mostCommon = variant; mostCommonCount = count;
      }
    }
    orgCanonical.set(norm, titleCaseOrg(mostCommon));
  }

  // Track (user, field) already suggested so we don't double-suggest
  const orgSuggested = new Set<number>(); // userId — for organization field only

  for (const u of users) {
    // -------- Country normalization (case + accent insensitive) --------
    if (u.country) {
      const key = normalizeForMatch(u.country);
      const canonical = COUNTRY_LOOKUP.get(key);
      if (canonical && canonical !== u.country) {
        country.push({ userId: u.id, field: 'country', current: u.country, proposed: canonical });
      }
    }

    // -------- Country inference from email TLD --------
    if (!u.country && u.email) {
      const m = u.email.toLowerCase().match(/\.([a-z]{2})$/);
      const tld = m?.[1];
      if (tld && TLD_TO_COUNTRY[tld]) {
        countryFromTld.push({ userId: u.id, field: 'country', current: '', proposed: TLD_TO_COUNTRY[tld] });
      }
    }

    // -------- Name capitalization (ALL CAPS / all lower → Title Case) --------
    for (const f of ['first_name', 'last_name'] as const) {
      const v = u[f];
      if (typeof v !== 'string' || !v.trim()) continue;
      const isAllUpper = v === v.toUpperCase() && /[A-ZÁÉÍÓÚÑÜ]/.test(v);
      const isAllLower = v === v.toLowerCase() && /[a-záéíóúñü]/.test(v);
      if (!isAllUpper && !isAllLower) continue;
      const proposed = titleCaseSpanish(v);
      if (proposed !== v) {
        nameCase.push({ userId: u.id, field: f, current: v, proposed });
      }
    }

    // -------- Whitespace cleanup on text fields --------
    for (const f of TEXT_FIELDS) {
      const v = u[f];
      if (typeof v !== 'string' || !v) continue;
      const cleaned = v.replace(/\s+/g, ' ').trim();
      if (cleaned !== v) {
        whitespace.push({ userId: u.id, field: f, current: v, proposed: cleaned });
      }
    }
    if (u.email) {
      const cleaned = u.email.trim();
      if (cleaned !== u.email) {
        whitespace.push({ userId: u.id, field: 'email', current: u.email, proposed: cleaned });
      }
    }

    // -------- Email lowercase --------
    if (u.email && u.email.trim() !== u.email.trim().toLowerCase()) {
      emailCase.push({ userId: u.id, field: 'email', current: u.email, proposed: u.email.trim().toLowerCase() });
    }

    // -------- First/last name split (only when last_name is empty and first_name has exactly 2 words) --------
    if (u.first_name && !u.last_name) {
      const parts = u.first_name.trim().split(/\s+/);
      if (parts.length === 2) {
        splitName.push({ userId: u.id, field: 'first_name', current: u.first_name, proposed: parts[0] });
        splitName.push({ userId: u.id, field: 'last_name',  current: '',           proposed: parts[1] });
      }
    }

    // -------- Organization: placeholder values → empty --------
    if (u.organization) {
      const normOrg = normalizeForMatch(u.organization.replace(/\s+/g, ' '));
      if (PLACEHOLDER_ORG_VALUES.has(normOrg)) {
        orgPlaceholder.push({ userId: u.id, field: 'organization', current: u.organization, proposed: '' });
        orgSuggested.add(u.id);
      }
    }

    // -------- Organization: unify duplicate variants (most-common spelling wins) --------
    if (u.organization && !orgSuggested.has(u.id)) {
      const norm = normalizeForMatch(u.organization.replace(/\s+/g, ' '));
      const canonical = orgCanonical.get(norm);
      if (canonical && canonical !== u.organization) {
        orgUnify.push({ userId: u.id, field: 'organization', current: u.organization, proposed: canonical });
        orgSuggested.add(u.id);
      }
    }

    // -------- Organization: case normalization (Title Case with acronym + particle handling) --------
    // Catches ALL CAPS, all lowercase, AND mixed-case issues like "Tec de monterrey" or "Tec De Monterrey".
    if (u.organization && !orgSuggested.has(u.id)) {
      const v = u.organization;
      const proposed = titleCaseOrg(v);
      const isPureCaseChange = proposed !== v && proposed.toLowerCase() === v.toLowerCase();
      if (isPureCaseChange) {
        // Require at least one "confidence" signal: a word that's clearly mis-cased.
        const words = v.split(/\s+/);
        const hasFixableWord = words.some((w, i) => {
          if (w.length < 2) return false;
          const lower = w.toLowerCase();
          // Particle wrongly capitalized in non-first position (e.g. "Tec De Monterrey")
          if (i > 0 && SPANISH_PARTICLES.has(lower)) return w !== lower;
          // Acronyms stay all-caps — don't propose changing them
          if (isAcronymToken(w)) return false;
          // Long words written entirely in upper or entirely in lower case
          if (w.length >= 4 && (w === w.toLowerCase() || w === w.toUpperCase())) return true;
          return false;
        });
        if (hasFixableWord) {
          orgCase.push({ userId: u.id, field: 'organization', current: v, proposed });
        }
      }
    }

    // -------- Infer organization_type from organization name --------
    if (u.organization && !u.organization_type) {
      const norm = normalizeForMatch(u.organization);
      for (const { type, test } of ORG_TYPE_PATTERNS) {
        if (test.test(norm)) {
          orgTypeInfer.push({ userId: u.id, field: 'organization_type', current: '', proposed: type });
          break;
        }
      }
    }

    // -------- Email domain typo correction --------
    if (u.email) {
      const trimmed = u.email.trim().toLowerCase();
      const atIdx = trimmed.lastIndexOf('@');
      if (atIdx > 0) {
        const local = trimmed.slice(0, atIdx);
        const domain = trimmed.slice(atIdx + 1);
        const fixedDomain = EMAIL_TYPO_DOMAINS[domain];
        if (fixedDomain) {
          emailTypo.push({ userId: u.id, field: 'email', current: u.email, proposed: `${local}@${fixedDomain}` });
        }
      }
    }

    // -------- Email address found inside a name field --------
    // Try to extract a name from the local part. Only propose when the local part is name-like
    // (alphabetic letters, 2-30 chars). Otherwise skip — leaving the cell for manual review.
    for (const f of ['first_name', 'last_name'] as const) {
      const v = u[f];
      if (typeof v !== 'string' || !/[\w.+-]+@[\w-]+\.[\w.-]+/.test(v)) continue;
      const m = v.match(/^([^@]+)@/);
      const candidate = m ? m[1].trim() : '';
      if (/^[A-Za-zÁ-ÿ]{2,30}$/.test(candidate)) {
        emailInName.push({ userId: u.id, field: f, current: v, proposed: titleCaseSpanish(candidate) });
      }
    }

    // -------- first_name === last_name (probable duplicate from import) --------
    if (u.first_name && u.last_name && u.first_name.trim() === u.last_name.trim()) {
      nameEqualsLast.push({ userId: u.id, field: 'last_name', current: u.last_name, proposed: '' });
    }

    // -------- Derive display_name from first/last when empty --------
    if (!u.display_name && (u.first_name || u.last_name)) {
      const first = (u.first_name ?? '').trim();
      const last = (u.last_name ?? '').trim();
      const initial = last ? ` ${last.charAt(0).toUpperCase()}.` : '';
      const proposed = `${first}${initial}`.trim();
      if (proposed) {
        deriveDisplay.push({ userId: u.id, field: 'display_name', current: '', proposed });
      }
    }
  }

  return [
    { key: 'country',         label: 'Normalizar países',                description: 'Códigos ISO-2, nombres en inglés, mayúsculas o sin tildes → forma canónica en español.',                                                  suggestions: country },
    { key: 'countryFromTld',  label: 'Inferir país desde email',         description: 'Usuarios sin país cuyo email termina en un TLD de país (.mx, .pe, .cl…).',                                                              suggestions: countryFromTld },
    { key: 'nameCase',        label: 'Capitalización de nombres',        description: 'Nombres en MAYÚSCULAS o minúsculas → Title Case respetando partículas (de, la, del).',                                                   suggestions: nameCase },
    { key: 'orgUnify',        label: 'Unificar variantes de organización', description: 'Cuando una organización aparece escrita de varias formas, proponer la versión Title-Case de la grafía más común (ej. "FUNDACION X"/"Fundacion X" → "Fundacion X").', suggestions: orgUnify },
    { key: 'orgCase',         label: 'Capitalización de organizaciones', description: 'Title Case con acrónimos preservados (IMSS, BID, ONG…) y partículas en minúscula. Detecta MAYÚSCULAS, minúsculas, y casos mixtos como "Tec de monterrey".',  suggestions: orgCase },
    { key: 'orgPlaceholder',  label: 'Limpiar organización vacía',       description: 'Valores como "-", ".", "n/a", "ninguna" no representan una organización real → vaciar el campo.',                                          suggestions: orgPlaceholder },
    { key: 'orgTypeInfer',    label: 'Inferir tipo de organización',     description: 'Cuando "Tipo de organización" está vacío pero el nombre delata el tipo (Fundación…, Universidad…, Ministerio…), proponer el tipo correspondiente.', suggestions: orgTypeInfer },
    { key: 'emailTypo',       label: 'Corregir errores en dominio de email', description: 'Detecta typos comunes en dominios de email (gmial→gmail, hotnail→hotmail, yaho→yahoo, etc.).',                                              suggestions: emailTypo },
    { key: 'emailInName',     label: 'Email dentro del campo de nombre', description: 'El nombre o apellido contiene una dirección de email (probable error de captura) → vaciar el campo para revisión.',                            suggestions: emailInName },
    { key: 'nameEqualsLast',  label: 'Nombre igual a apellido',          description: 'Cuando nombre y apellido son idénticos, probable error de importación → vaciar el apellido para revisión.',                                     suggestions: nameEqualsLast },
    { key: 'splitName',       label: 'Separar nombre y apellido',        description: 'Apellido vacío y nombre con dos palabras → dividir en nombre + apellido.',                                                                suggestions: splitName },
    { key: 'deriveDisplay',   label: 'Generar nombre para mostrar',      description: 'Cuando "Mostrar" está vacío, derivarlo como "Nombre A." a partir del nombre y apellido.',                                                  suggestions: deriveDisplay },
    { key: 'whitespace',      label: 'Eliminar espacios',                description: 'Espacios en blanco al inicio, al final o repetidos dentro de un campo.',                                                                  suggestions: whitespace },
    { key: 'emailCase',       label: 'Email a minúsculas',               description: 'Direcciones de email con mayúsculas se convierten a minúsculas.',                                                                          suggestions: emailCase },
  ].filter((c) => c.suggestions.length > 0);
};

// ---- Column width persistence ----

const COL_WIDTHS_KEY = 'admin_users_col_widths';

const parseDefaultWidth = (w: string | undefined): number => {
  if (!w) return 120;
  const n = parseInt(w, 10);
  return Number.isFinite(n) ? n : 120;
};

const loadColumnWidths = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(COL_WIDTHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, number>;
  } catch {
    /* ignore */
  }
  return {};
};

// ---- Helpers ----

const compareValues = (a: unknown, b: unknown, dir: SortDir): number => {
  // Push null/undefined/empty to the bottom regardless of direction
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else if (typeof a === 'boolean' && typeof b === 'boolean') {
    cmp = a === b ? 0 : a ? 1 : -1;
  } else {
    cmp = String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  }
  return dir === 'asc' ? cmp : -cmp;
};

const formatDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
};

// ---- Memoized row ----

interface RowProps {
  user: User;
  edits: RowEdits | undefined;
  onCellChange: (id: number, field: EditableField, value: unknown) => void;
  onDelete: (user: User) => void;
}

const EditableRow = memo(function EditableRow({ user, edits, onCellChange, onDelete }: RowProps) {
  const getValue = (field: EditableField): unknown => {
    if (edits && field in edits) return edits[field];
    return user[field];
  };
  const isDirty = (field: EditableField): boolean => !!(edits && field in edits);

  return (
    <tr>
      {COLUMNS.map((col) => {
        if (col.type === 'readonly-number') {
          return <td key={col.key} className="grid-cell readonly">{user[col.key] as number}</td>;
        }
        if (col.type === 'readonly-date') {
          return <td key={col.key} className="grid-cell readonly">{formatDate(user[col.key] as string | undefined)}</td>;
        }
        const field = col.key as EditableField;
        const dirty = isDirty(field);
        const cellClass = `grid-cell${dirty ? ' dirty' : ''}`;
        if (col.type === 'checkbox') {
          return (
            <td key={col.key} className={cellClass}>
              <input
                type="checkbox"
                className="grid-checkbox"
                checked={Boolean(getValue(field))}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onCellChange(user.id, field, e.target.checked)}
              />
            </td>
          );
        }
        if (col.type === 'select') {
          return (
            <td key={col.key} className={cellClass}>
              <select
                className="grid-input"
                value={String(getValue(field) ?? '')}
                onChange={(e) => onCellChange(user.id, field, e.target.value)}
              >
                <option value="">—</option>
                {ORGANIZATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </td>
          );
        }
        if (col.type === 'textarea') {
          return (
            <td key={col.key} className={cellClass}>
              <textarea
                className="grid-input grid-textarea"
                value={String(getValue(field) ?? '')}
                onChange={(e) => onCellChange(user.id, field, e.target.value)}
                rows={2}
              />
            </td>
          );
        }
        // text
        return (
          <td key={col.key} className={cellClass}>
            <input
              type="text"
              className="grid-input"
              value={String(getValue(field) ?? '')}
              onChange={(e) => onCellChange(user.id, field, e.target.value)}
            />
          </td>
        );
      })}
      <td className="grid-cell actions-cell">
        <button className="action-btn delete" onClick={() => onDelete(user)}>Eliminar</button>
      </td>
    </tr>
  );
}, (prev, next) => prev.user === next.user && prev.edits === next.edits);

// ---- Main component ----

export default function AdminUsers() {
  const { showSuccess, showError } = useAdmin();
  const location = useLocation();

  const [view, setView] = useState<'list' | 'create'>('list');

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState(false);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [filterAdmin, setFilterAdmin] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Create form
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Column widths (persisted)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(loadColumnWidths);
  useEffect(() => {
    window.localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Suggestions modal
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ---- Load all users once ----

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers();
      if (res.ok) {
        setUsers(res.data as User[]);
      } else {
        showError('Error al cargar usuarios.');
      }
    } catch {
      showError('Error de conexión al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle "Create" deep link from Dashboard
  useEffect(() => {
    const state = location.state as { openCreate?: boolean } | null;
    if (state?.openCreate) {
      setView('create');
      setCreateForm(emptyCreateForm);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // ---- Filter + sort (client-side) ----

  const countries = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => { if (u.country) set.add(u.country); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [users]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (q) {
        const hay = `${u.email} ${u.first_name} ${u.last_name} ${u.display_name ?? ''} ${u.organization ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterAdmin === 'true' && !u.is_superuser) return false;
      if (filterAdmin === 'false' && u.is_superuser) return false;
      if (filterActive === 'true' && !u.is_active) return false;
      if (filterActive === 'false' && u.is_active) return false;
      if (filterCountry === '__empty__' && u.country) return false;
      if (filterCountry && filterCountry !== '__empty__' && u.country !== filterCountry) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = edits[a.id]?.[sortKey as EditableField] ?? a[sortKey];
      const bv = edits[b.id]?.[sortKey as EditableField] ?? b[sortKey];
      return compareValues(av, bv, sortDir);
    });
    return sorted;
  }, [users, search, filterAdmin, filterActive, filterCountry, sortKey, sortDir, edits]);

  // ---- Edit tracking ----

  const dirtyCount = useMemo(() => {
    return Object.values(edits).filter((rowEdits) => rowEdits && Object.keys(rowEdits).length > 0).length;
  }, [edits]);

  const handleCellChange = useCallback((id: number, field: EditableField, value: unknown) => {
    setEdits((prev) => {
      const current = prev[id] ?? {};
      const user = users.find((u) => u.id === id);
      const original = user ? user[field] : undefined;
      // If value matches original, drop the field from edits (keeps dirtyCount honest)
      const matches = (value ?? '') === (original ?? '');
      let nextRow: RowEdits;
      if (matches) {
        const { [field]: _drop, ...rest } = current;
        void _drop;
        nextRow = rest;
      } else {
        nextRow = { ...current, [field]: value };
      }
      const next = { ...prev };
      if (Object.keys(nextRow).length === 0) {
        delete next[id];
      } else {
        next[id] = nextRow;
      }
      return next;
    });
  }, [users]);

  const handleDiscard = () => setEdits({});

  // ---- Suggestions ----

  const suggestionCategories = useMemo(() => computeSuggestions(users), [users]);
  const totalSuggestions = useMemo(
    () => suggestionCategories.reduce((sum, c) => sum + c.suggestions.length, 0),
    [suggestionCategories],
  );

  const applySuggestions = useCallback((sList: Suggestion[]) => {
    setEdits((prev) => {
      const next = { ...prev };
      for (const s of sList) {
        const current = next[s.userId] ?? {};
        next[s.userId] = { ...current, [s.field]: s.proposed };
      }
      return next;
    });
  }, []);

  // ---- Column resize ----

  const getColWidth = useCallback((col: ColumnDef): number => {
    return columnWidths[col.key] ?? parseDefaultWidth(col.width);
  }, [columnWidths]);

  const startResize = useCallback((colKey: string, startX: number, startWidth: number) => {
    const onMove = (e: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + e.clientX - startX);
      setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const resetColumnWidths = () => setColumnWidths({});

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleSave = async () => {
    const dirtyIds = Object.keys(edits).map(Number).filter((id) => Object.keys(edits[id] ?? {}).length > 0);
    if (dirtyIds.length === 0) return;
    setSaving(true);

    const updatedUserPatches: Record<number, RowEdits> = {};
    const failed: Array<{ id: number; email: string; message: string }> = [];

    // Run sequentially to keep error reporting clear and avoid hammering the API
    for (const id of dirtyIds) {
      const patch = edits[id] ?? {};
      const user = users.find((u) => u.id === id);
      try {
        const res = await adminApi.updateUser(id, patch as Parameters<typeof adminApi.updateUser>[1]);
        if (res.ok) {
          updatedUserPatches[id] = patch;
        } else {
          const errorData = res.data as Record<string, string[]>;
          const message = Object.values(errorData).flat().join(' ') || 'Error desconocido';
          failed.push({ id, email: user?.email ?? `#${id}`, message });
        }
      } catch {
        failed.push({ id, email: user?.email ?? `#${id}`, message: 'Error de conexión' });
      }
    }

    // Apply successful patches to local users list; drop saved edits
    if (Object.keys(updatedUserPatches).length > 0) {
      setUsers((prev) => prev.map((u) => (updatedUserPatches[u.id] ? { ...u, ...updatedUserPatches[u.id] } : u)));
      setEdits((prev) => {
        const next = { ...prev };
        Object.keys(updatedUserPatches).forEach((id) => { delete next[Number(id)]; });
        return next;
      });
    }

    setSaving(false);

    const savedCount = Object.keys(updatedUserPatches).length;
    if (failed.length === 0) {
      showSuccess(`Guardados ${savedCount} usuarios.`);
    } else {
      const sample = failed.slice(0, 3).map((f) => `${f.email}: ${f.message}`).join(' · ');
      showError(`Guardados ${savedCount}, fallaron ${failed.length}. ${sample}${failed.length > 3 ? ' …' : ''}`);
    }
  };

  // ---- Create handler ----

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: Parameters<typeof adminApi.createUser>[0] = {
        email: createForm.email,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        password: createForm.password,
        is_active: createForm.is_active,
        is_superuser: createForm.is_superuser,
      };
      if (!createForm.password) {
        delete (payload as Record<string, unknown>).password;
      }
      const res = await adminApi.createUser(payload);
      if (res.ok) {
        showSuccess('Usuario creado exitosamente.');
        setView('list');
        setCreateForm(emptyCreateForm);
        loadAll();
      } else {
        const errorData = res.data as Record<string, string[]>;
        const messages = Object.values(errorData).flat().join(' ');
        showError(messages || 'Error al crear usuario.');
      }
    } catch {
      showError('Error de conexión al crear usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminApi.deleteUser(deleteTarget.id);
      if (res.ok) {
        showSuccess('Usuario eliminado exitosamente.');
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[deleteTarget.id];
          return next;
        });
      } else {
        showError('Error al eliminar usuario.');
      }
    } catch {
      showError('Error de conexión al eliminar usuario.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // ---- Render: create view ----

  if (view === 'create') {
    return (
      <div className="admin-content">
        <div className="admin-form-container">
          <div className="admin-form-header">
            <button className="back-btn" onClick={() => setView('list')}>← Volver</button>
            <h2 className="form-title">Crear Usuario</h2>
          </div>
          <form className="admin-form" onSubmit={handleCreateSubmit}>
            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre <span className="required">*</span></label>
                <input
                  type="text"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Apellido <span className="required">*</span></label>
                <input
                  type="text"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Dejar vacío — se enviará email de invitación"
              />
              <span style={{ fontSize: '13px', color: '#888', marginTop: '4px', display: 'block' }}>
                Si no se asigna contraseña, el usuario recibirá un email para crear la suya.
              </span>
            </div>
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                />
                Usuario activo
              </label>
            </div>
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={createForm.is_superuser}
                  onChange={(e) => setCreateForm({ ...createForm, is_superuser: e.target.checked })}
                />
                Administrador
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setView('list')}>Cancelar</button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- Render: grid view ----

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        action={{ label: '+ Crear Usuario', onClick: () => { setView('create'); setCreateForm(emptyCreateForm); } }}
      />

      <div className="admin-content">
        {/* Toolbar: search + filters + save bar */}
        <div className="admin-toolbar grid-toolbar">
          <div className="admin-filters">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por email, nombre, organización..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterAdmin} onChange={(e) => setFilterAdmin(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="true">Administradores</option>
              <option value="false">Usuarios</option>
            </select>
            <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <option value="">Todos los países</option>
              <option value="__empty__">(Sin país)</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid-save-bar">
            <span className="grid-count">
              {filteredSorted.length} / {users.length}
              {dirtyCount > 0 && <span className="grid-dirty-count"> · {dirtyCount} con cambios</span>}
            </span>
            <button
              className="btn-suggestions"
              disabled={totalSuggestions === 0}
              onClick={() => setShowSuggestions(true)}
              title="Sugerencias automáticas de limpieza"
            >
              ✨ Sugerencias{totalSuggestions > 0 ? ` (${totalSuggestions})` : ''}
            </button>
            <button
              className="btn-cancel"
              disabled={dirtyCount === 0 || saving}
              onClick={handleDiscard}
            >
              Descartar
            </button>
            <button
              className="btn-submit"
              disabled={dirtyCount === 0 || saving}
              onClick={handleSave}
            >
              {saving ? 'Guardando...' : `Guardar cambios${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </button>
          </div>
        </div>

        {/* Editable table */}
        <div className="admin-table-container grid-table-container">
          {loading && <div className="admin-loading-overlay">Cargando...</div>}
          {!loading && filteredSorted.length === 0 ? (
            <div className="admin-empty">No se encontraron usuarios.</div>
          ) : (
            <table className="admin-table grid-table">
              <thead>
                <tr>
                  {COLUMNS.map((col) => {
                    const w = getColWidth(col);
                    return (
                      <th
                        key={col.key}
                        className="grid-header sortable"
                        style={{ width: w, minWidth: w }}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}{sortIndicator(col.key)}
                        <span
                          className="col-resize-handle"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            startResize(col.key, e.clientX, w);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setColumnWidths((prev) => {
                              const next = { ...prev };
                              delete next[col.key];
                              return next;
                            });
                          }}
                          title="Arrastra para cambiar el ancho · doble clic para restablecer"
                        />
                      </th>
                    );
                  })}
                  <th className="grid-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((user) => (
                  <EditableRow
                    key={user.id}
                    user={user}
                    edits={edits[user.id]}
                    onCellChange={handleCellChange}
                    onDelete={(u) => setDeleteTarget(u)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${deleteTarget?.email}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {showSuggestions && (
        <div className="suggestions-overlay" onClick={() => setShowSuggestions(false)}>
          <div className="suggestions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="suggestions-header">
              <h2>Sugerencias automáticas</h2>
              <button className="suggestions-close" onClick={() => setShowSuggestions(false)}>×</button>
            </div>
            <div className="suggestions-body">
              {suggestionCategories.length === 0 ? (
                <p className="suggestions-empty">No se encontraron sugerencias automáticas.</p>
              ) : (
                <>
                  <p className="suggestions-intro">
                    Estas son correcciones automáticas detectadas en los datos actuales. Aplicar
                    no guarda — solo agrega los cambios a la cola; revisa la tabla y haz clic en
                    <strong> Guardar cambios</strong> para persistirlos.
                  </p>
                  <div className="suggestions-actions">
                    <button
                      className="btn-submit"
                      onClick={() => {
                        const all = suggestionCategories.flatMap((c) => c.suggestions);
                        applySuggestions(all);
                        setShowSuggestions(false);
                      }}
                    >
                      Aplicar todas ({totalSuggestions})
                    </button>
                  </div>
                  {suggestionCategories.map((cat) => (
                    <SuggestionCategoryView
                      key={cat.key}
                      category={cat}
                      users={users}
                      onApply={(s) => applySuggestions(s)}
                    />
                  ))}
                </>
              )}
            </div>
            <div className="suggestions-footer">
              <button className="link-btn" onClick={resetColumnWidths}>Reiniciar anchos de columna</button>
              <button className="btn-cancel" onClick={() => setShowSuggestions(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---- Suggestion category sub-component ----

interface SuggestionCategoryViewProps {
  category: SuggestionCategory;
  users: User[];
  onApply: (suggestions: Suggestion[]) => void;
}

function SuggestionCategoryView({ category, users, onApply }: SuggestionCategoryViewProps) {
  const [expanded, setExpanded] = useState(false);
  const usersById = useMemo(() => {
    const m = new Map<number, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const preview = category.suggestions.slice(0, expanded ? category.suggestions.length : 5);

  return (
    <div className="suggestions-category">
      <div className="suggestions-category-header">
        <div>
          <strong>{category.label}</strong>
          <span className="suggestions-count"> · {category.suggestions.length}</span>
          <div className="suggestions-category-desc">{category.description}</div>
        </div>
        <button className="btn-submit" onClick={() => onApply(category.suggestions)}>
          Aplicar todas
        </button>
      </div>
      <ul className="suggestions-list">
        {preview.map((s, i) => {
          const u = usersById.get(s.userId);
          return (
            <li key={`${s.userId}-${s.field}-${i}`}>
              <span className="suggestions-user">{u?.email ?? `#${s.userId}`}</span>
              <span className="suggestions-field"> · {s.field}</span>
              <span className="suggestions-diff">
                <span className="suggestions-current">{String(s.current)}</span>
                <span className="suggestions-arrow"> → </span>
                <span className="suggestions-proposed">{String(s.proposed)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {category.suggestions.length > 5 && (
        <button className="link-btn" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Mostrar menos' : `Mostrar todos (${category.suggestions.length})`}
        </button>
      )}
    </div>
  );
}
