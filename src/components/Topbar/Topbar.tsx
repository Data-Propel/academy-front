import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isAuthenticated, isSuperuser, authApi } from '../../services/api';
import logo from '../../assets/logoacademyblanco.webp';
import logo2x from '../../assets/logoacademyblanco@2x.webp';
import './Topbar.css';

const Topbar = ({ hideHamburger = false }: { hideHamburger?: boolean }) => {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [isAdmin, setIsAdmin] = useState(isSuperuser());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const authenticated = isAuthenticated();
    setLoggedIn(authenticated);

    const superuserFlag = localStorage.getItem('is_superuser');
    setIsAdmin(superuserFlag === 'true');

    if (authenticated) {
      authApi.getProfile().then((res) => {
        if (res.ok) {
          const adminStatus = res.data.is_superuser || res.data.is_admin || false;
          setIsAdmin(adminStatus);
        }
      }).catch(() => {});
    }
  }, [location]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    authApi.logout();
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-container">
          <a href="/" className="topbar-logo">
            <img
              src={logo}
              srcSet={`${logo} 1x, ${logo2x} 2x`}
              alt="Propel Logo"
              className="topbar-logo-img"
            />
          </a>

          {/* Desktop nav */}
          <nav className="topbar-nav">
            {loggedIn && (
              <a href="/profile" className="topbar-profile">
                Mi Perfil
              </a>
            )}
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
              <>
                <a href="/cursos" className="topbar-link">
                  Explorar cursos
                </a>
                <a href="/register" className="topbar-link">
                  Registrarse
                </a>
                <a href="/login" className="topbar-login">
                  Iniciar sesión
                </a>
              </>
            )}
          </nav>

          {/* Hamburger button — mobile only */}
          {!hideHamburger && (
            <button
              className={`topbar-hamburger${menuOpen ? ' is-open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="topbar-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <nav className={`topbar-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        {loggedIn ? (
          <>
            <a href="/profile" className="mobile-menu-item">Mi Perfil</a>
            {isAdmin && <a href="/admin" className="mobile-menu-item">Admin</a>}
            <button className="mobile-menu-item mobile-menu-logout" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <a href="/cursos" className="mobile-menu-item">Explorar cursos</a>
            <a href="/register" className="mobile-menu-item">Registrarse</a>
            <a href="/login" className="mobile-menu-item mobile-menu-cta">Iniciar sesión</a>
          </>
        )}
      </nav>
    </>
  );
};

export default Topbar;
