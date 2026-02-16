import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isAuthenticated, isSuperuser, authApi } from '../../services/api';
import logo from '../../assets/logoacademyblanco.png';
import './Topbar.css';

const Topbar = () => {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [isAdmin, setIsAdmin] = useState(isSuperuser());

  useEffect(() => {
    const authenticated = isAuthenticated();
    setLoggedIn(authenticated);

    // Check localStorage directly
    const superuserFlag = localStorage.getItem('is_superuser');
    setIsAdmin(superuserFlag === 'true');

    // Always fetch profile when logged in to get current superuser status
    if (authenticated) {
      authApi.getProfile().then((res) => {
        if (res.ok) {
          const adminStatus = res.data.is_superuser || res.data.is_admin || false;
          setIsAdmin(adminStatus);
        }
      }).catch(() => {
        // Profile fetch failed, use cached value
      });
    }
  }, [location]);

  const handleLogout = () => {
    authApi.logout();
  };

  return (
    <header className="topbar">
      <div className="topbar-container">
        <a href="/" className="topbar-logo">
          <img
            src={logo}
            alt="Propel Logo"
            className="topbar-logo-img"
          />
        </a>
        <nav className="topbar-nav">
          {loggedIn && isAdmin && (
            <a href="/admin" className="topbar-admin">
              Admin
            </a>
          )}
          {loggedIn ? (
            <button className="topbar-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          ) : (
            <a href="/login" className="topbar-login">
              Iniciar sesión
            </a>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Topbar;
