import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, isAuthenticated, setProfileComplete } from '../../services/api';
import { ORGANIZATION_TYPES, COUNTRIES, needsProfileCompletion } from '../../utils/profileOptions';
import PageHead from '../../utils/PageHead';
import './CompleteProfile.css';

// Onboarding step for users who signed in with Google: Google supplies name +
// email but not organization/type/country, so we collect those here before
// letting them into the catalog.
const CompleteProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [country, setCountry] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
      return;
    }
    let active = true;
    (async () => {
      const { ok, data } = await authApi.getProfile();
      if (!active) return;
      if (ok) {
        // Nothing to complete (e.g. reached this URL directly) → skip the step.
        if (!needsProfileCompletion(data)) {
          navigate('/cursos', { replace: true });
          return;
        }
        setOrganization(data.organization || '');
        setOrganizationType(data.organization_type || '');
        setCountry(data.country || '');
        setNewsletterOptIn(!!data.newsletter_opt_in);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || !organizationType || !country) {
      setError('Completa Organización, Tipo de organización y País.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { ok, data } = await authApi.updateProfile({
        organization: organization.trim(),
        organization_type: organizationType,
        country,
        newsletter_opt_in: newsletterOptIn,
      });
      if (ok) {
        setProfileComplete(true);
        navigate('/cursos', { replace: true });
      } else {
        const msg = data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'No se pudo guardar. Intenta de nuevo.';
        setError(msg || 'No se pudo guardar. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="cp-page">
      <PageHead title="Completa tu perfil" noIndex />
      <form className="cp-card" onSubmit={handleSubmit}>
        <h1 className="cp-title">Completa tu perfil</h1>
        <p className="cp-sub">Cuéntanos un poco sobre tu organización para terminar de crear tu cuenta.</p>

        {error && <div className="cp-error">{error}</div>}

        <div className="cp-field">
          <label htmlFor="organization">Organización*</label>
          <input
            id="organization"
            type="text"
            required
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
        </div>

        <div className="cp-field">
          <label htmlFor="organizationType">Tipo de organización*</label>
          <select
            id="organizationType"
            required
            value={organizationType}
            onChange={(e) => setOrganizationType(e.target.value)}
          >
            {ORGANIZATION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="cp-field">
          <label htmlFor="country">País*</label>
          <select
            id="country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {COUNTRIES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <label className="cp-checkbox">
          <input
            type="checkbox"
            checked={newsletterOptIn}
            onChange={(e) => setNewsletterOptIn(e.target.checked)}
          />
          <span>¿Quieres suscribirte al newsletter de Propel?</span>
        </label>

        <button type="submit" className="cp-btn" disabled={saving}>
          {saving ? 'Guardando...' : 'Continuar'}
        </button>
      </form>
    </div>
  );
};

export default CompleteProfile;
