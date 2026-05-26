import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, isAuthenticated } from '../../services/api';
import PageHead from '../../utils/PageHead';
import propelLogo from '../../assets/register/propel-logo.png';
import tileAsistenteIA from '../../assets/register/tile-asistente-ia.png';
import tileGrants from '../../assets/register/tile-grants.png';
import tileGrowth from '../../assets/register/tile-growth.png';
import tileData from '../../assets/register/tile-data.png';
import googleOrg from '../../assets/register/google-org.png';
import googleG from '../../assets/register/google-g.png';
import propelSquare from '../../assets/register/propel-square.png';
import './Login.css';

type LoginStep = 'login' | 'setup-password' | 'verify-email';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined;

type GoogleCredentialResponse = { credential: string };
type GoogleIdAPI = {
  initialize: (config: { client_id: string; callback: (r: GoogleCredentialResponse) => void }) => void;
  prompt: () => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdAPI } };
  }
}

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('login');

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const googleReady = useRef(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [gsiRendered, setGsiRendered] = useState(false);

  const handleGoogleCredential = async ({ credential }: GoogleCredentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await authApi.googleAuth(credential);
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
      id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      // Render Google's real button into a transparent overlay sized to match the
      // styled button. GSI won't render into a hidden/zero-size container, so the
      // overlay must have real dimensions; opacity:0 keeps it invisible while the
      // user's click lands on the real button (reliable popup flow, not One Tap).
      const container = googleBtnRef.current;
      if (container) {
        container.innerHTML = '';
        const w = Math.min(400, Math.max(200, Math.round(container.getBoundingClientRect().width) || 320));
        id.renderButton(container, {
          type: 'standard', theme: 'outline', size: 'large',
          text: 'continue_with', locale: 'es', width: w,
        });
        setGsiRendered(true);
      }
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
    const inner = googleBtnRef.current?.querySelector<HTMLElement>('div[role="button"], button');
    if (!googleReady.current || !inner) {
      setError('Cargando Google Sign-In, intenta de nuevo en un momento.');
      return;
    }
    inner.click();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const checkRes = await authApi.checkAccount(email);
      if (checkRes.ok) {
        if (!checkRes.data.exists) {
          setError('No existe una cuenta con este correo.');
          setLoading(false);
          return;
        }
        if (checkRes.data.requires_password_setup) {
          setSetupToken(checkRes.data.setup_token);
          setUserName(checkRes.data.user?.first_name || '');
          setStep('setup-password');
          setPassword('');
          setLoading(false);
          return;
        }
      }

      const { ok, data } = await authApi.login(email, password);
      if (ok) {
        navigate('/');
      } else if (data.email?.[0]?.toLowerCase().includes('verificar')) {
        setStep('verify-email');
        authApi.resendVerification(email).catch(() => {});
      } else {
        setError('Correo o contraseña incorrectos.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setResendSuccess('');
    setLoading(true);

    try {
      const { ok, data } = await authApi.resendVerification(email);
      if (ok) {
        setResendSuccess('Correo de verificación enviado. Revisa tu bandeja de entrada.');
      } else {
        setError(data.detail || 'Error al enviar el correo. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const { ok, data } = await authApi.setInitialPassword(email, setupToken, password, confirmPassword);
      if (ok) {
        navigate('/');
      } else {
        setError(data.detail || data.password?.[0] || 'Error al configurar contraseña.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('login');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );

  return (
    <div className="login2-page">
      <PageHead
        title="Iniciar sesión"
        description="Accede a tu cuenta de Propel Academy y continúa con tus cursos para organizaciones sin fines de lucro."
      />

      <header className="login2-mobileHeader">
        {step === 'login' && <h1 className="login2-mobileHeader__title">Inicia sesión</h1>}
        {step === 'setup-password' && <h1 className="login2-mobileHeader__title">¡Bienvenido, {userName}!</h1>}
        {step === 'verify-email' && <h1 className="login2-mobileHeader__title">Verifica tu correo</h1>}
        <img src={propelLogo} alt="Propel Nonprofit Academy" className="login2-mobileHeader__logo" />
        <p className="login2-mobileHeader__tagline">Continúa tu aprendizaje y escala con IA.</p>
      </header>

      <section className="login2-brand">
        <img src={propelLogo} alt="Propel Nonprofit Academy" className="login2-brand__logo" />
        <p className="login2-brand__tagline">Continúa tu aprendizaje y escala con IA.</p>

        <div className="login2-tiles">
          <img src={tileAsistenteIA} alt="Crea tu asistente IA" />
          <img src={tileGrants} alt="Aplica a Grants con IA" />
          <img src={tileGrowth} alt="Growth Marketing para ONGs" />
          <img src={tileData} alt="Data para el impacto social" />
        </div>

        <div className="login2-support">
          <img src={googleOrg} alt="with support from Google.org" />
        </div>

        <div className="login2-brand__corner">
          <img src={propelSquare} alt="" aria-hidden="true" />
        </div>
      </section>

      <section className="login2-formSide">
        {step === 'login' && (
          <form className="login2-form" onSubmit={handleLogin}>
            <h1 className="login2-title">Inicia sesión</h1>

            {error && <div className="login2-error">{error}</div>}

            <div className="login2-field">
              <label htmlFor="email">Correo electrónico*</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="login2-field">
              <label htmlFor="password">Contraseña*</label>
              <div className="login2-passwordWrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login2-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <p className="login2-required">*Obligatorio</p>

            <div style={{ position: 'relative' }}>
              <button type="button" className="login2-google" onClick={handleGoogleClick} disabled={loading} tabIndex={gsiRendered ? -1 : 0}>
                <img src={googleG} alt="" aria-hidden="true" />
                <span>Continuar con Google</span>
              </button>
              <div
                ref={googleBtnRef}
                style={{
                  position: 'absolute', inset: 0, opacity: 0, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: gsiRendered ? 'auto' : 'none',
                }}
              />
            </div>

            <div className="login2-actions">
              <button type="button" className="login2-btn login2-btn--outline" onClick={() => navigate('/register')}>
                Crear cuenta
              </button>
              <button type="submit" className="login2-btn login2-btn--primary" disabled={loading}>
                {loading ? 'Cargando...' : 'Inicia sesión'}
              </button>
            </div>

            <a href="/reset-password" className="login2-forgot">¿Olvidaste tu contraseña?</a>
          </form>
        )}

        {step === 'setup-password' && (
          <form className="login2-form" onSubmit={handleSetupPassword}>
            <h1 className="login2-title">¡Bienvenido, {userName}!</h1>
            <p className="login2-subtitle">Configura tu contraseña para continuar.</p>

            {error && <div className="login2-error">{error}</div>}

            <div className="login2-info">
              Detectamos que es tu primera vez iniciando sesión. Por favor, crea una contraseña segura.
            </div>

            <div className="login2-field">
              <label>Correo</label>
              <div className="login2-emailRow">
                <span>{email}</span>
                <button type="button" className="login2-link" onClick={handleBack}>Cambiar</button>
              </div>
            </div>

            <div className="login2-field">
              <label htmlFor="setup-password">Nueva contraseña*</label>
              <div className="login2-passwordWrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="setup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" className="login2-eye" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="login2-field">
              <label htmlFor="confirmPassword">Confirmar contraseña*</label>
              <div className="login2-passwordWrap">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" className="login2-eye" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                  {showConfirmPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <button type="submit" className="login2-btn login2-btn--primary login2-btn--full" disabled={loading}>
              {loading ? 'Configurando...' : 'Configurar contraseña'}
            </button>
          </form>
        )}

        {step === 'verify-email' && (
          <div className="login2-form login2-verify">
            <h1 className="login2-title">Verifica tu correo</h1>
            <p className="login2-subtitle">Tu cuenta aún no ha sido verificada.</p>

            {error && <div className="login2-error">{error}</div>}
            {resendSuccess && <div className="login2-success">{resendSuccess}</div>}

            <div className="login2-verify__icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <p className="login2-verify__text">
              Hemos enviado un correo de verificación a <strong>{email}</strong>
            </p>
            <p className="login2-verify__sub">
              Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
            </p>

            <button type="button" className="login2-btn login2-btn--primary login2-btn--full" onClick={handleResendVerification} disabled={loading}>
              {loading ? 'Enviando...' : 'Reenviar correo'}
            </button>
            <button type="button" className="login2-link login2-back" onClick={handleBack}>
              Volver al inicio de sesión
            </button>
          </div>
        )}

        <button
          type="button"
          className="login2-help"
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

      <footer className="login2-mobileFooter">
        <div className="login2-mobileFooter__support">
          <img src={googleOrg} alt="with support from Google.org" />
        </div>
        <div className="login2-mobileFooter__corner">
          <img src={propelSquare} alt="" aria-hidden="true" />
        </div>

        <div className="login2-siteFooter">
          <img src="/landing/propel-logo.webp" alt="Propel" className="login2-siteFooter__logo" />
          <p className="login2-siteFooter__tagline">
            @Propel, una organización sin fines de lucro 501(c)(3).
          </p>

          <nav className="login2-siteFooter__nav">
            <div className="login2-siteFooter__col">
              <h4>Quiénes Somos</h4>
              <a href="https://www.wepropel.org/equipo-propel" target="_blank" rel="noopener noreferrer">Equipo</a>
              <a href="https://www.wepropel.org/propel-fellowship" target="_blank" rel="noopener noreferrer">Propel Fellows</a>
              <a href="https://www.wepropel.org/reporte-de-impacto-2023" target="_blank" rel="noopener noreferrer">Impacto</a>
            </div>

            <div className="login2-siteFooter__col">
              <h4>Nuestros Programas</h4>
              <a href="https://www.wepropel.org/nonprofit-academy" target="_blank" rel="noopener noreferrer">Nonprofit Academy</a>
              <a href="https://www.wepropel.org/impact-accelerator" target="_blank" rel="noopener noreferrer">Impact Accelerator</a>
            </div>

            <div className="login2-siteFooter__col">
              <h4>Funding Hub</h4>
              <a href="/oportunidades">Oportunidades Propel</a>
              <a href="https://www.wepropel.org/grantbot" target="_blank" rel="noopener noreferrer">Grant Bot</a>
            </div>

            <div className="login2-siteFooter__col">
              <h4>Recursos</h4>
              <a href="/blog">Blog</a>
              <a href="https://www.wepropel.org/reporte-de-impacto-2023" target="_blank" rel="noopener noreferrer">Reportes</a>
              <a href="https://www.wepropel.org/propel-events" target="_blank" rel="noopener noreferrer">Eventos</a>
            </div>
          </nav>

          <div className="login2-siteFooter__social">
            <a href="https://www.instagram.com/wepropel" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://www.facebook.com/wepropel" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.408.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.408 24 22.676V1.325C24 .593 23.407 0 22.675 0z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/company/wepropel" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>

          <a href="mailto:hola@wepropel.org" className="login2-siteFooter__contact">Contáctanos</a>

          <div className="login2-siteFooter__legal">
            <a href="/terminos">Términos &amp; Condiciones</a>
            <a href="/privacidad">Política de Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
