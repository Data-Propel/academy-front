import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../../utils/PageHead';
import { PAGE_META } from '../../utils/pageMeta';
import googleOrg from '../../assets/register/google-org.png';
import heroImg from '../../assets/home/hero.jpg';
import courseLidera from '../../assets/home/course-lidera.png';
import courseAsistente from '../../assets/home/course-asistente.png';
import courseDonantes from '../../assets/home/course-donantes.png';
import tileExpertos from '../../assets/home/tile-expertos.jpg';
import tileDigitaliza from '../../assets/home/tile-digitaliza.jpg';
import tileGratis from '../../assets/home/tile-gratis.jpg';
import testimonialAlba from '../../assets/home/testimonial-alba.jpg';
import './Home.css';

type Course = {
  img: string;
  title: string;
  instructor: string;
  duration: string;
  description: string;
  badge?: string;
};

const COURSES: Course[] = [
  {
    img: courseLidera,
    title: 'Aprende a liderar con IA',
    instructor: 'Herman Marin',
    duration: '40 min',
    description: 'Lidera el cambio digital en tu ONG y crea procesos más ágiles con IA.',
    badge: 'Liderazgo',
  },
  {
    img: courseAsistente,
    title: 'Crea tu asistente IA',
    instructor: 'Carolina Diez Canseco',
    duration: '20 min',
    description: 'Automatiza procesos clave de tu equipo con un asistente virtual.',
    badge: 'Inteligencia Artificial',
  },
  {
    img: courseDonantes,
    title: 'Conecta con nuevos donantes',
    instructor: 'Maria Liliana Mor',
    duration: '40 min',
    description: 'Atrae donaciones de empresas para acelerar tu impacto.',
    badge: 'Fundraising',
  },
];

const FEATURES = [
  {
    img: tileExpertos,
    title: 'Aprende de expertos',
    description: 'Cursos creados por profesionales que conocen de impacto social.',
  },
  {
    img: tileDigitaliza,
    title: 'Digitaliza tu organización',
    description: 'Cada curso te prepara para usar IA y herramientas digitales.',
  },
  {
    img: tileGratis,
    title: 'Capacítate gratis',
    description: 'Acceso a todos los cursos y materiales prácticos.',
  },
];

const FAQS = [
  {
    q: '¿Necesito pagar para ver los cursos?',
    a: 'Todos los cursos son de acceso gratuito. Regístrate y empieza a aprender de inmediato.',
  },
  {
    q: '¿Cómo me registro en la plataforma?',
    a: 'Haz clic en «Registrarme», completa tus datos y confirma tu correo electrónico. En menos de un minuto tendrás acceso a todos los cursos.',
  },
  {
    q: '¿Cuánto dura cada curso?',
    a: 'Cada curso es corto y práctico: la mayoría toma entre 20 y 60 minutos, y puedes avanzar a tu propio ritmo.',
  },
  {
    q: '¿Qué hago si tengo problemas para ingresar o navegar la plataforma?',
    a: 'Escríbenos a academy@wepropel.org y nuestro equipo te ayudará a ingresar o a navegar la plataforma.',
  },
];

const Home = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="home-page">
      <PageHead
        raw
        title={PAGE_META.home.title}
        description={PAGE_META.home.description}
        ogDescription={PAGE_META.home.ogDescription}
        ogImage={PAGE_META.home.ogImage}
        canonicalPath={PAGE_META.home.canonicalPath}
      />

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__text">
            <h1 className="home-hero__title">
              <span className="home-hero__title-light">Aprende a usar</span>{' '}
              <span className="home-hero__title-bold">IA con propósito</span>
            </h1>
            <p className="home-hero__subtitle">
              Cursos prácticos y gratuitos para organizaciones sociales.
            </p>
            <Link to="/register" className="home-btn home-btn--primary">Únete aquí</Link>
            <div className="home-hero__support">
              <img src={googleOrg} alt="with support from Google.org" />
            </div>
          </div>
          <div className="home-hero__media">
            <img src={heroImg} alt="Líder social aprendiendo con tecnología" />
          </div>
        </div>
      </section>

      {/* ── Popular courses ── */}
      <section className="home-courses">
        <h2 className="home-courses__title">
          Empieza hoy con los <strong>3 cursos más populares</strong> entre organizaciones
          sociales de LatAm.
        </h2>
        <div className="home-courses__grid">
          {COURSES.map((c) => (
            <Link to="/cursos" key={c.title} className="home-card">
              <div className="home-card__media">
                <img src={c.img} alt={c.title} loading="lazy" />
                {c.badge && <span className="home-card__badge">{c.badge}</span>}
              </div>
              <div className="home-card__body">
                <h3 className="home-card__title">{c.title}</h3>
                <p className="home-card__meta">{c.instructor} · {c.duration}</p>
                <p className="home-card__desc">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="home-courses__cta">
          <Link to="/cursos" className="home-btn home-btn--primary">Ver todos los cursos</Link>
        </div>
      </section>

      {/* ── Academy (teal) ── */}
      <section className="home-academy">
        <h2 className="home-academy__title">
          La academia gratuita donde líderes sociales aprenden a{' '}
          <span className="home-academy__accent">escalar su impacto con tecnología.</span>
        </h2>
        <div className="home-academy__grid">
          {FEATURES.map((f) => (
            <article className="home-feature" key={f.title}>
              <div className="home-feature__media">
                <img src={f.img} alt={f.title} loading="lazy" />
              </div>
              <div className="home-feature__body">
                <h3 className="home-feature__title">{f.title}</h3>
                <p className="home-feature__desc">{f.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Testimonial (white section) ── */}
      <section className="home-testimonial-section">
        <figure className="home-testimonial">
          <div className="home-testimonial__photo">
            <img src={testimonialAlba} alt="Alba Carrasco" />
          </div>
          <div className="home-testimonial__content">
            <blockquote className="home-testimonial__quote">
              «La forma en que distribuyen la información y combinan teoría con práctica marca la diferencia».
            </blockquote>
            <figcaption className="home-testimonial__author">
              <span className="home-testimonial__name">Alba Carrasco</span>
              <span className="home-testimonial__role">
                Directora Ejecutiva de Fundación Ixcanul | Guatemala
              </span>
            </figcaption>
            <a
              href="https://www.linkedin.com/company/wepropel"
              target="_blank"
              rel="noopener noreferrer"
              className="home-testimonial__linkedin"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </figure>
      </section>

      {/* ── Fellowship band (orange) ── */}
      <section className="home-fellowship">
        <h2 className="home-fellowship__title">
          ¿Buscas una experiencia de aprendizaje más profunda y aplicada?
        </h2>
        <p className="home-fellowship__subtitle">
          <strong>Propel Fellowship:</strong> Programa de 6 semanas para líderes sociales
        </p>
        <a
          href="https://www.wepropel.org/propel-fellowship"
          target="_blank"
          rel="noopener noreferrer"
          className="home-btn home-btn--accent"
        >
          Quiero saber más
        </a>
      </section>

      {/* ── FAQ (teal) ── */}
      <section className="home-faq">
        <div className="home-faq__inner">
          <h2 className="home-faq__title">Preguntas frecuentes</h2>
          <ul className="home-faq__list">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <li className={`home-faq__item${open ? ' is-open' : ''}`} key={item.q}>
                  <button
                    type="button"
                    className="home-faq__q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    <span>{item.q}</span>
                    <svg className="home-faq__chevron" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {open && <p className="home-faq__a">{item.a}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="home-footer__inner">
          <div className="home-footer__brand">
            <img src="/landing/propel-logo.webp" alt="Propel" className="home-footer__logo" />
            <p className="home-footer__legal">
              © PropL, una organización sin fines de lucro 501 (c) (3).
            </p>
          </div>

          <div className="home-footer__panel">
            <nav className="home-footer__nav">
              <h3 className="home-footer__heading">Quiénes Somos</h3>
              <a href="https://www.wepropel.org/equipo-propel" target="_blank" rel="noopener noreferrer">Equipo Propel</a>
              <a href="https://www.wepropel.org/directorio" target="_blank" rel="noopener noreferrer">Comunidad</a>
              <a href="https://www.wepropel.org/reporte-de-impacto-2023" target="_blank" rel="noopener noreferrer">Impacto</a>
            </nav>
            <div className="home-footer__bottom">
              <div className="home-footer__social">
                <a href="https://www.linkedin.com/company/wepropel" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/wepropelorg" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a href="https://www.wepropel.org" target="_blank" rel="noopener noreferrer" aria-label="Sitio web">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </a>
              </div>
              <div className="home-footer__legal-links">
                <a href="https://www.wepropel.org" target="_blank" rel="noopener noreferrer">Términos &amp; Condiciones</a>
                <span>|</span>
                <a href="https://www.wepropel.org" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
