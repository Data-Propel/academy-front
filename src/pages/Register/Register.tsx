import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { getAttribution } from '../../utils/attribution';
import propelLogo from '../../assets/register/propel-logo.png';
import tileAsistenteIA from '../../assets/register/tile-asistente-ia.png';
import tileGrants from '../../assets/register/tile-grants.png';
import tileGrowth from '../../assets/register/tile-growth.png';
import tileData from '../../assets/register/tile-data.png';
import googleOrg from '../../assets/register/google-org.png';
import googleG from '../../assets/register/google-g.png';
import propelSquare from '../../assets/register/propel-square.png';
import './Register.css';

const ORGANIZATION_TYPES = [
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

const COUNTRIES = [
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;

type GoogleCredentialResponse = { credential: string };
type GoogleIdAPI = {
  initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void;
  prompt: () => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdAPI } };
  }
}

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    organizationType: '',
    country: '',
    newsletterOptIn: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const googleReady = useRef(false);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const handleGoogleCredential = async ({ credential }: GoogleCredentialResponse) => {
    const current = formDataRef.current;
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await authApi.googleAuth(credential, {
        organization: current.organization || undefined,
        organization_type: current.organizationType || undefined,
        country: current.country || undefined,
        newsletter_opt_in: current.newsletterOptIn,
        ...getAttribution(),
      });
      if (ok) {
        navigate('/');
      } else {
        setError(data.detail || 'No fue posible iniciar sesión con Google.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const init = () => {
      const id = window.google?.accounts?.id;
      if (!id) return;
      id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
      googleReady.current = true;
    };
    if (existing) {
      if (window.google?.accounts?.id) init();
      else existing.addEventListener('load', init);
    } else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In no está configurado (falta VITE_GOOGLE_OAUTH_CLIENT_ID).');
      return;
    }
    if (!googleReady.current) {
      setError('Cargando Google Sign-In, intenta de nuevo en un momento.');
      return;
    }
    window.google?.accounts?.id?.prompt();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await authApi.register({
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password,
        password_confirm: formData.confirmPassword,
        organization: formData.organization,
        organization_type: formData.organizationType,
        country: formData.country,
        newsletter_opt_in: formData.newsletterOptIn,
        ...getAttribution(),
      });
      if (ok) {
        setRegistered(true);
      } else {
        const errorMsg = data.email?.[0] || data.password?.[0] || data.detail || 'Error al registrar. Intenta de nuevo.';
        setError(errorMsg);
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="reg2-page">
        <div className="reg2-confirm">
          <h2 className="reg2-confirm__title">Confirma tu correo</h2>
          <p className="reg2-confirm__text">
            Hemos enviado un correo de confirmación a <strong>{formData.email}</strong>
          </p>
          <p className="reg2-confirm__sub">
            Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
          <button className="reg2-btn reg2-btn--primary" onClick={() => navigate('/login')}>
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reg2-page">
      <section className="reg2-brand">
        <h1 className="reg2-brand__welcome">Te damos la bienvenida</h1>
        <img src={propelLogo} alt="Propel Nonprofit Academy" className="reg2-brand__logo" />
        <p className="reg2-brand__tagline">Cursos gratuitos para organizaciones sociales</p>

        <div className="reg2-tiles">
          <img src={tileAsistenteIA} alt="Crea tu asistente IA" />
          <img src={tileGrants} alt="Aplica a Grants con IA" />
          <img src={tileGrowth} alt="Growth Marketing para ONGs" />
          <img src={tileData} alt="Data para el impacto social" />
        </div>

        <div className="reg2-support">
          <img src={googleOrg} alt="with support from Google.org" />
        </div>

        <div className="reg2-brand__corner">
          <img src={propelSquare} alt="" aria-hidden="true" />
        </div>
      </section>

      <section className="reg2-formSide">
        <form className="reg2-form" onSubmit={handleSubmit}>
          {error && <div className="reg2-error">{error}</div>}

          <div className="reg2-grid">
            <div className="reg2-field">
              <label htmlFor="firstName">Nombre*</label>
              <input id="firstName" name="firstName" type="text" required value={formData.firstName} onChange={handleChange} />
            </div>
            <div className="reg2-field">
              <label htmlFor="lastName">Apellido*</label>
              <input id="lastName" name="lastName" type="text" required value={formData.lastName} onChange={handleChange} />
            </div>

            <div className="reg2-field">
              <label htmlFor="organization">Organización*</label>
              <input id="organization" name="organization" type="text" required value={formData.organization} onChange={handleChange} />
            </div>
            <div className="reg2-field">
              <label htmlFor="organizationType">Tipo de organización*</label>
              <select id="organizationType" name="organizationType" required value={formData.organizationType} onChange={handleChange}>
                {ORGANIZATION_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="reg2-field">
              <label htmlFor="country">País*</label>
              <select id="country" name="country" required value={formData.country} onChange={handleChange}>
                {COUNTRIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="reg2-field">
              <label htmlFor="email">Correo electrónico*</label>
              <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
            </div>

            <div className="reg2-field">
              <label htmlFor="password">Contraseña*</label>
              <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} />
            </div>
            <div className="reg2-field">
              <label htmlFor="confirmPassword">Confirmar contraseña*</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          <p className="reg2-required-note">*Obligatorio</p>

          <button type="button" className="reg2-google" onClick={handleGoogleClick} disabled={loading}>
            <img src={googleG} alt="" aria-hidden="true" />
            <span>Continuar con Google</span>
          </button>

          <label className="reg2-checkbox">
            <input type="checkbox" name="newsletterOptIn" checked={formData.newsletterOptIn} onChange={handleChange} />
            <span>¿Quieres suscribirte al newsletter de Propel?*</span>
          </label>

          <p className="reg2-terms">
            En Propel, respetamos tu privacidad. Al aceptar este formulario aceptas nuestros términos y
            condiciones, política de privacidad y recibir correos de nuestros cursos y eventos.
          </p>

          <div className="reg2-actions">
            <button type="submit" className="reg2-btn reg2-btn--primary" disabled={loading}>
              {loading ? 'Cargando...' : 'Registrarme'}
            </button>
            <button type="button" className="reg2-btn reg2-btn--outline" onClick={() => navigate('/login')}>
              Ya tengo una cuenta
            </button>
          </div>
        </form>

        <button
          type="button"
          className="reg2-help"
          aria-label="Ayuda"
          onClick={() => window.open('mailto:academy@wepropel.org', '_blank')}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      </section>
    </div>
  );
};

export default Register;
