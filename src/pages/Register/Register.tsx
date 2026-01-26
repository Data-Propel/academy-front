import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <div className="register-header">
              <h2 className="register-title">Confirma tu correo</h2>
              <div className="register-divider"></div>
            </div>
            <div className="confirm-email-message">
              <div className="confirm-email-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <p className="confirm-email-text">
                Hemos enviado un correo de confirmación a <strong>{formData.email}</strong>
              </p>
              <p className="confirm-email-subtext">
                Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
              </p>
              <button className="submit-button" onClick={() => navigate('/login')}>
                <span className="button-text">Ir a Iniciar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h2 className="register-title">Regístrate</h2>
            <p className="register-subtitle">Únete a la comunidad y escala con IA.</p>
            <div className="register-divider"></div>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="form-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">
                  Nombre <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="form-input"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">
                  Apellido <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="form-input"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Correo electrónico <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
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
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                Confirmar contraseña <span className="required">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className="form-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="button-divider"></div>

            <button type="submit" className="submit-button" disabled={loading}>
              <span className="button-text">{loading ? 'Cargando...' : 'Regístrate'}</span>
            </button>
          </form>

          <div className="register-footer">
            ¿Ya tienes una cuenta?{' '}
            <a href="/login" className="login-link">Inicia sesión.</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
