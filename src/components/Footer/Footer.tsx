import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          {/* Logo and tagline */}
          <div className="footer-brand">
            <img
              src="/landing/propel-logo.webp"
              alt="Propel Logo"
              className="footer-logo"
            />
            <p className="footer-tagline">
              Propel es una organización sin fines de lucro 501(c)(3) reconocida por el IRS.
              Las donaciones son deducibles de impuestos según la ley vigente.
            </p>
          </div>

          {/* Navigation columns */}
          <div className="footer-nav">
            <div className="footer-column">
              <h4 className="footer-heading">Nonprofit Academy</h4>
              <ul className="footer-links">
                <li><a href="https://www.wepropel.org/propel-fellowship" target="_blank" rel="noopener noreferrer">Fellowship</a></li>
                <li><a href="https://www.wepropel.org/impact-accelerator" target="_blank" rel="noopener noreferrer">Impact Accelerator</a></li>
                <li><a href="https://www.wepropel.org/nonprofit-academy" target="_blank" rel="noopener noreferrer">Workshops</a></li>
                <li><a href="https://www.wepropel.org/propel-events" target="_blank" rel="noopener noreferrer">Eventos</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-heading">Quiénes Somos</h4>
              <ul className="footer-links">
                <li><a href="https://www.wepropel.org/equipo-propel" target="_blank" rel="noopener noreferrer">Equipo Propel</a></li>
                <li><a href="https://www.wepropel.org/directorio" target="_blank" rel="noopener noreferrer">Comunidad</a></li>
                <li><a href="https://www.wepropel.org/reporte-de-impacto-2023" target="_blank" rel="noopener noreferrer">Impacto</a></li>
                <li><a href="https://www.wepropel.org/dona" target="_blank" rel="noopener noreferrer">Dona</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="footer-heading">Recursos</h4>
              <ul className="footer-links">
                <li><a href="https://www.wepropel.org/grantbot" target="_blank" rel="noopener noreferrer">GrantBot</a></li>
                <li><a href="/oportunidades">Base de Oportunidades</a></li>
                <li><a href="/perfil">Perfil Digital</a></li>
                <li><a href="/blog">Blog</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Social media */}
        <div className="footer-social">
          <a href="https://www.wepropel.org/newsletter" target="_blank" rel="noopener noreferrer" aria-label="Newsletter">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/company/wepropel" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/wepropelorg" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <a href="https://www.wepropel.org" target="_blank" rel="noopener noreferrer" aria-label="Sitio web">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </a>
        </div>

        {/* Contact */}
        <div className="footer-contact">
          Si tienes un problema contáctanos a <a href="mailto:hola@wepropel.org">hola@wepropel.org</a>
        </div>

        {/* Legal footer */}
        <div className="footer-legal">
          <a href="/terminos">Términos & Condiciones</a>
          <span className="footer-divider">|</span>
          <a href="/privacidad">Política de Privacidad</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
