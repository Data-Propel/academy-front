import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import PageHead from '../../utils/PageHead';
import './AutoLogin.css';

const AutoLogin = () => {
  console.log('[AutoLogin]');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const performAutoLogin = async () => {
      if (!token) {
        setError('Token no proporcionado.');
        setLoading(false);
        return;
      }

      try {
        const { ok, data } = await authApi.autoLogin(token);
        if (ok) {
          navigate('/');
        } else {
          setError(data.detail || data.token?.[0] || 'El enlace es inválido o ha expirado.');
          setLoading(false);
        }
      } catch {
        setError('Error de conexión. Intenta más tarde.');
        setLoading(false);
      }
    };

    performAutoLogin();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="autologin-page">
        <PageHead title="Iniciando sesión" noIndex />
        <div className="autologin-container">
          <div className="autologin-card">
            <div className="autologin-loading">
              <div className="spinner"></div>
              <p>Iniciando sesión...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="autologin-page">
      <PageHead title="Error de acceso" noIndex />
      <div className="autologin-container">
        <div className="autologin-card">
          <div className="autologin-header">
            <h2 className="autologin-title">Error de acceso</h2>
            <div className="autologin-divider"></div>
          </div>
          <div className="autologin-content">
            <div className="autologin-error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <p className="autologin-error-text">{error}</p>
            <button className="autologin-button" onClick={() => navigate('/login')}>
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoLogin;
