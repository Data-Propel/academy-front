import { useEffect, useState } from 'react';
import { isAuthenticated, authApi } from '../../services/api';
import './Topbar.css';

const Topbar = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

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
