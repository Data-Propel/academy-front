import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
  console.log('[ResetPassword]');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Request reset form state
  const [email, setEmail] = useState('');

  // Set new password form state
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Common state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear messages when switching between modes
    setError('');
    setSuccess('');
  }, [token]);

  // Handle request reset (email form)
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { ok, data } = await authApi.resetPassword(email);
      if (ok) {
        setSuccess(data.message || 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
        setEmail('');
      } else {
        setError(data.email?.[0] || data.detail || 'Error al enviar. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Handle set new password (token form)
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const { ok, data } = await authApi.confirmResetPassword(token!, password, passwordConfirm);
      if (ok) {
        setSuccess('Contraseña actualizada correctamente. Redirigiendo...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(data.detail || data.token?.[0] || data.password?.[0] || 'Error al restablecer. El enlace puede haber expirado.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // If token present, show set new password form
  if (token) {
    return (
      <div className="reset-page">
        <div className="reset-container">
          <div className="reset-card">
            <div className="reset-header">
              <h2 className="reset-title">Nueva contraseña</h2>
              <p className="reset-subtitle">Ingresa tu nueva contraseña.</p>
              <div className="reset-divider"></div>
            </div>

            <form className="reset-form" onSubmit={handleSetPassword}>
              {error && <div className="form-error">{error}</div>}
              {success && <div className="form-success">{success}</div>}

              <div className="form-group">
                <label htmlFor="password">
                  Nueva contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="form-group">
                <label htmlFor="passwordConfirm">
                  Confirmar contraseña <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="passwordConfirm"
                  name="passwordConfirm"
                  className="form-input"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="button-divider"></div>

              <button type="submit" className="submit-button" disabled={loading}>
                <span className="button-text">{loading ? 'Guardando...' : 'Guardar contraseña'}</span>
              </button>
            </form>

            <div className="reset-footer">
              <a href="/login" className="login-link">Volver al inicio de sesión</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: show request reset form
  return (
    <div className="reset-page">
      <div className="reset-container">
        <div className="reset-card">
          <div className="reset-header">
            <h2 className="reset-title">Restablecer contraseña</h2>
            <p className="reset-subtitle">Ingresa tu correo y te enviaremos un enlace.</p>
            <div className="reset-divider"></div>
          </div>

          <form className="reset-form" onSubmit={handleRequestReset}>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}

            <div className="form-group">
              <label htmlFor="email">
                Correo electrónico <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="button-divider"></div>

            <button type="submit" className="submit-button" disabled={loading}>
              <span className="button-text">{loading ? 'Enviando...' : 'Enviar enlace'}</span>
            </button>
          </form>

          <div className="reset-footer">
            ¿Recordaste tu contraseña?{' '}
            <a href="/login" className="login-link">Inicia sesión.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
