import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import logo from '../../assets/propel-nonprofitaca.svg';
import './Login.css';

type LoginStep = 'email' | 'password' | 'setup-password' | 'verify-email';

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [userName, setUserName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  const handleCheckAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { ok, data } = await authApi.checkAccount(email);
      if (ok) {
        if (!data.exists) {
          setError('No existe una cuenta con este correo.');
        } else if (data.requires_password_setup) {
          setSetupToken(data.setup_token);
          setUserName(data.user?.first_name || '');
          setStep('setup-password');
        } else {
          setUserName(data.user?.first_name || '');
          setStep('password');
        }
      } else {
        setError(data.detail || 'Error al verificar cuenta.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { ok, data } = await authApi.login(email, password);
      if (ok) {
        navigate('/');
      } else if (data.email?.[0]?.toLowerCase().includes('verificar')) {
        setStep('verify-email');
      } else {
        setError(data.detail || data.email?.[0] || 'Credenciales inválidas. Intenta de nuevo.');
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
    setStep('email');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src={logo} alt="Propel Logo" className="login-logo" />
            {step === 'email' && (
              <>
                <h2 className="login-title">Inicia sesión</h2>
                <p className="login-subtitle">Continúa tu aprendizaje y escala con IA.</p>
              </>
            )}
            {step === 'password' && (
              <>
                <h2 className="login-title">¡Hola, {userName}!</h2>
                <p className="login-subtitle">Ingresa tu contraseña para continuar.</p>
              </>
            )}
            {step === 'setup-password' && (
              <>
                <h2 className="login-title">¡Bienvenido, {userName}!</h2>
                <p className="login-subtitle">Configura tu contraseña para continuar.</p>
              </>
            )}
            {step === 'verify-email' && (
              <>
                <h2 className="login-title">Verifica tu correo</h2>
                <p className="login-subtitle">Tu cuenta aún no ha sido verificada.</p>
              </>
            )}
            <div className="login-divider"></div>
          </div>

          {/* Step 1: Email */}
          {step === 'email' && (
            <form className="login-form" onSubmit={handleCheckAccount}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="email">
                  Correo electrónico <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="button-divider"></div>

              <button type="submit" className="submit-button" disabled={loading}>
                <span className="button-text">{loading ? 'Verificando...' : 'Continuar'}</span>
              </button>

              <div className="forgot-password-container">
                <a href="/reset-password" className="forgot-password">¿Olvidaste tu contraseña?</a>
              </div>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <form className="login-form" onSubmit={handleLogin}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-group">
                <label className="email-display">{email}</label>
                <button type="button" className="change-email" onClick={handleBack}>
                  Cambiar
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Recuérdame</span>
                </label>
                <a href="/reset-password" className="forgot-password">¿Olvidaste tu contraseña?</a>
              </div>

              <div className="button-divider"></div>

              <button type="submit" className="submit-button" disabled={loading}>
                <span className="button-text">{loading ? 'Cargando...' : 'Inicia sesión'}</span>
              </button>
            </form>
          )}

          {/* Step 3: Setup Password (Migrated Users) */}
          {step === 'setup-password' && (
            <form className="login-form" onSubmit={handleSetupPassword}>
              {error && <div className="form-error">{error}</div>}

              <div className="form-info">
                Detectamos que es tu primera vez iniciando sesión. Por favor, crea una contraseña segura.
              </div>

              <div className="form-group">
                <label className="email-display">{email}</label>
                <button type="button" className="change-email" onClick={handleBack}>
                  Cambiar
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Nueva contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirmar contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="button-divider"></div>

              <button type="submit" className="submit-button" disabled={loading}>
                <span className="button-text">{loading ? 'Configurando...' : 'Configurar contraseña'}</span>
              </button>
            </form>
          )}

          {/* Step 4: Verify Email */}
          {step === 'verify-email' && (
            <div className="verify-email-container">
              {error && <div className="form-error">{error}</div>}
              {resendSuccess && <div className="form-success">{resendSuccess}</div>}

              <div className="verify-email-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>

              <p className="verify-email-text">
                Hemos enviado un correo de verificación a <strong>{email}</strong>
              </p>
              <p className="verify-email-subtext">
                Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
              </p>

              <button
                type="button"
                className="submit-button"
                onClick={handleResendVerification}
                disabled={loading}
              >
                <span className="button-text">{loading ? 'Enviando...' : 'Reenviar correo'}</span>
              </button>

              <button type="button" className="back-to-login" onClick={handleBack}>
                Volver al inicio de sesión
              </button>
            </div>
          )}

          <div className="login-footer">
            ¿Todavía no eres miembro?{' '}
            <a href="/register" className="register-link">Regístrate ahora.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
