import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './Login.css';

type LoginStep = 'email' | 'password' | 'setup-password';

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
      } else {
        setError(data.detail || 'Credenciales inválidas. Intenta de nuevo.');
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
