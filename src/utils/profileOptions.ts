// Shared org-type / country select options used by the Register and
// CompleteProfile forms, plus the completeness check that decides whether a
// Google-authenticated user still needs to fill in their profile. Google only
// gives us name + email, so these three fields can come back blank.

export const ORGANIZATION_TYPES = [
  { value: '', label: 'Selecciona un tipo' },
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

export const COUNTRIES = [
  { value: '', label: 'Selecciona un país' },
  { value: 'AR', label: 'Argentina' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'CL', label: 'Chile' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'CU', label: 'Cuba' },
  { value: 'DO', label: 'República Dominicana' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'HN', label: 'Honduras' },
  { value: 'MX', label: 'México' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'PA', label: 'Panamá' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'PE', label: 'Perú' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'ES', label: 'España' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'OTHER', label: 'Otro' },
];

// True when the account is still missing one of the required profile fields the
// manual registration form collects. Used to route a Google sign-in to the
// CompleteProfile step instead of straight to the catalog.
export const needsProfileCompletion = (u?: {
  organization?: string;
  organization_type?: string;
  country?: string;
} | null) => !u || !u.organization || !u.organization_type || !u.country;
