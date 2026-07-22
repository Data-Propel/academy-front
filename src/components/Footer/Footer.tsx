import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div className="footer-brand-inner">
          <img src="/landing/propel-logo.webp" alt="Propel" className="footer-logo" />
          <p className="footer-tagline">
            Propel es una organización sin fines de lucro 501(c)(3) reconocida por el IRS.
            Las donaciones son deducibles de impuestos según la ley vigente.
          </p>
        </div>
      </div>
      <div className="footer-panel">
        <div className="footer-panel-top">
          <nav className="footer-column">
            <p className="footer-heading">Quiénes Somos</p>
            <ul className="footer-links">
              <li>
                <a href="https://www.wepropel.org/equipo-propel" target="_blank" rel="noopener noreferrer">
                  Equipo Propel
                </a>
              </li>
              <li>
                <a href="https://www.wepropel.org/directorio" target="_blank" rel="noopener noreferrer">
                  Comunidad
                </a>
              </li>
              <li>
                <a href="https://www.wepropel.org/reporte-de-impacto-2023" target="_blank" rel="noopener noreferrer">
                  Impacto
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="footer-panel-bottom">
          <div className="footer-social">
            <a href="https://www.instagram.com/wepropelorg" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <img src="/landing/social/instagram.svg" alt="" />
            </a>
            <a href="https://www.facebook.com/wepropel" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <img src="/landing/social/facebook.svg" alt="" />
            </a>
            <a href="https://www.linkedin.com/company/wepropel" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <img src="/landing/social/linkedin.svg" alt="" />
            </a>
          </div>

          <p className="footer-legal">
            <a href="/terminos">Términos &amp; Condiciones</a>
            <span className="footer-divider"> | </span>
            <a href="/privacidad">Política de Privacidad</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
