import { useState } from 'react';
import { authApi } from '../../services/api';
import './ResetPassword.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="reset-page">
      <div className="reset-container">
        <div className="reset-card">
          <div className="reset-header">
            <h2 className="reset-title">Restablecer contraseña</h2>
            <p className="reset-subtitle">Ingresa tu correo y te enviaremos un enlace.</p>
            <div className="reset-divider"></div>
          </div>

          <form className="reset-form" onSubmit={handleSubmit}>
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
