import { useState } from 'react';
import './ResetPassword.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Reset password for:', email);
    // Reset password logic will be implemented here
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

            <button type="submit" className="submit-button">
              <span className="button-text">Enviar enlace</span>
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
