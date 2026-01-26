import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2 className="login-title">Inicia sesión</h2>
            <p className="login-subtitle">Continúa tu aprendizaje y escala con IA.</p>
            <div className="login-divider"></div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
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
              <a href="/restablecer-contrasena" className="forgot-password">¿Olvidaste tu contraseña?</a>
            </div>

            <div className="button-divider"></div>

            <button type="submit" className="submit-button" disabled={loading}>
              <span className="button-text">{loading ? 'Cargando...' : 'Inicia sesión'}</span>
            </button>
          </form>

          <div className="login-footer">
            ¿Todavía no eres miembro?{' '}
            <a href="/registro" className="register-link">Regístrate ahora.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
