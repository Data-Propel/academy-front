import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isAuthenticated, isSuperuser, authApi } from '../../services/api';
import './Topbar.css';

const Topbar = () => {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [isAdmin, setIsAdmin] = useState(isSuperuser());

  useEffect(() => {
    const authenticated = isAuthenticated();
    setLoggedIn(authenticated);
    setIsAdmin(isSuperuser());

    // Fetch profile to get superuser status if logged in but no superuser flag set
    if (authenticated && !isSuperuser()) {
      authApi.getProfile().then(() => {
        setIsAdmin(isSuperuser());
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
            src="https://www.academy.wepropel.org/wp-content/uploads/2025/04/Logotipo_Propel_Horizontal-02-removebg-preview-e1745455801946.png"
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
