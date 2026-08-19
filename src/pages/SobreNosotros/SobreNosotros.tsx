import { useEffect, useState } from 'react';
import PageHead from '../../utils/PageHead';
import { PAGE_META } from '../../utils/pageMeta';
import heroBanner from '../../assets/about/hero-banner.webp';
import introImg from '../../assets/about/intro.webp';
import cardCursos from '../../assets/about/card-cursos.webp';
import cardIa from '../../assets/about/card-ia.webp';
import cardCasos from '../../assets/about/card-casos.webp';
import testimonialSofia from '../../assets/about/testimonial-sofia.webp';
import testimonialHugo from '../../assets/about/testimonial-hugo.webp';
import propelLogo from '../../assets/about/propel-logo.svg';
import './SobreNosotros.css';

const STATS = [
  { number: '+2200', label: 'usuarios registrados', variant: 'yellow' },
  { number: '+1600', label: 'organizaciones sociales', variant: 'orange' },
  { number: '30', label: 'países', variant: 'green' },
];

const BENEFITS = [
  {
    image: cardCursos,
    title: 'Cursos prácticos',
    description: 'Aprendizaje diseñado para adoptar nuevas herramientas digitales en el sector social.',
  },
  {
    image: cardIa,
    title: 'IA aplicable',
    description: 'Frameworks y plantillas para llevar la inteligencia artificial al trabajo diario de tu organización.',
  },
  {
    image: cardCasos,
    title: 'Casos de éxito',
    description: 'Historias de organizaciones sociales que ya impulsan su impacto con tecnología.',
  },
];

const TESTIMONIALS = [
  {
    image: testimonialSofia,
    name: 'Sofía Schmidt',
    role: 'Directora Ejecutiva de Fundación Brotario | Chile',
    quote: 'Es una muy buena introducción para integrar IA en las organizaciones. La estructura de los contenidos me ayuda a avanzar a mi propio ritmo.',
    linkedin: 'https://www.linkedin.com/in/sofiaschmidtm/',
    website: 'https://brotario.cl/',
  },
  {
    image: testimonialHugo,
    name: 'Hugo Vides',
    role: 'Director de Programas de Sociedad Ornitológica de Córdoba | Colombia',
    quote: '"El programa tiene un diseño y contenidos bien armados para aprender y poner en práctica herramientas actuales”.',
    linkedin: 'https://www.linkedin.com/in/hugo-vides/',
    website: 'https://sociedadornitologicadecordoba.org/',
  },
];

const LinkedinIcon = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
    <path fill="currentColor" d="M26.2 4H5.8C4.8 4 4 4.8 4 5.7v20.5c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V5.7c0-.9-.8-1.7-1.8-1.7M11.1 24.4H7.6V13h3.5zm-1.7-13c-1.1 0-2.1-.9-2.1-2.1s.9-2.1 2.1-2.1c1.1 0 2.1.9 2.1 2.1s-1 2.1-2.1 2.1m15.1 12.9H21v-5.6c0-1.3 0-3.1-1.9-3.1S17 17.1 17 18.5v5.7h-3.5V13h3.3v1.5h.1c.5-.9 1.7-1.9 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 256 256" width="100%" height="100%" aria-hidden="true">
    <path fill="currentColor" d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24m88 104a87.6 87.6 0 0 1-3.33 24h-38.51a157.4 157.4 0 0 0 0-48h38.51a87.6 87.6 0 0 1 3.33 24m-114 40h52a115.1 115.1 0 0 1-26 45a115.3 115.3 0 0 1-26-45m-3.9-16a140.8 140.8 0 0 1 0-48h59.88a140.8 140.8 0 0 1 0 48ZM40 128a87.6 87.6 0 0 1 3.33-24h38.51a157.4 157.4 0 0 0 0 48H43.33A87.6 87.6 0 0 1 40 128m114-40h-52a115.1 115.1 0 0 1 26-45a115.3 115.3 0 0 1 26 45m52.33 0h-35.62a135.3 135.3 0 0 0-22.3-45.6A88.29 88.29 0 0 1 206.37 88Zm-98.74-45.6A135.3 135.3 0 0 0 85.29 88H49.63a88.29 88.29 0 0 1 57.96-45.6M49.63 168h35.66a135.3 135.3 0 0 0 22.3 45.6A88.29 88.29 0 0 1 49.63 168m98.78 45.6a135.3 135.3 0 0 0 22.3-45.6h35.66a88.29 88.29 0 0 1-57.96 45.6" />
  </svg>
);

const SobreNosotros = () => {
  const [slide, setSlide] = useState(0);
  // El swiper2 del Webflow es vertical de 992px hacia arriba y horizontal
  // por debajo (breakpoints del init de Swiper).
  const [horizontal, setHorizontal] = useState(
    () => window.matchMedia('(max-width: 991px)').matches,
  );

  // Autoplay cada 6s, en loop, sin detenerse al interactuar
  // (disableOnInteraction: false).
  useEffect(() => {
    const t = setInterval(() => {
      setSlide((s) => (s + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 991px)');
    const onChange = (e: MediaQueryListEvent) => setHorizontal(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <div className="sn-page">
      <PageHead
        raw
        title={PAGE_META.about.title}
        description={PAGE_META.about.description}
        ogDescription={PAGE_META.about.ogDescription}
        ogImage={PAGE_META.about.ogImage}
        canonicalPath={PAGE_META.about.canonicalPath}
      />

      {/* Banner */}
      <header className="sn-banner">
        <img
          src={heroBanner}
          alt="Comunidad de líderes sociales de ONGs del programa Propel Fellowship en Perú"
          className="sn-banner__img"
        />
      </header>

      {/* Título */}
      <section className="sn-title">
        <div className="sn-container sn-title__grid">
          <h1 className="sn-title__heading">Sobre nosotros</h1>
          <p className="sn-title__subheading">
            Fortalecemos las capacidades digitales del sector social de América Latina
          </p>
        </div>
      </section>

      {/* Intro: imagen + texto (header39 del Webflow) */}
      <header className="sn-intro">
        <div className="sn-intro__grid">
          <div className="sn-intro__image-wrapper">
            <img src={introImg} alt="" className="sn-intro__img" />
          </div>
          <div className="sn-intro__content">
            La Nonprofit Academy es la plataforma educativa de Propel, creada para fortalecer
            las capacidades digitales de organizaciones sociales mediante formación práctica
            en tecnología.
            <br />
            <br />
            A través de nuestros cursos, ayudamos a cerrar la brecha de capacidades digitales
            del sector social. Apoyamos a líderes y equipos para integrar la tecnología en su
            trabajo diario y fortalecer el impacto de sus organizaciones.
          </div>
        </div>
      </header>

      {/* Nuestro impacto */}
      <section className="sn-impact">
        <div className="sn-container">
          <div className="sn-impact__inner">
            <h2 className="sn-h2">Nuestro impacto</h2>
            <p className="sn-impact__sub">
              Organizaciones de toda América Latina ya utilizan la Nonprofit Academy para
              desarrollar capacidades digitales.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="sn-stats" aria-label="Cifras de impacto">
        {STATS.map((s) => (
          <div key={s.label} className={`sn-stats__item sn-stats__item--${s.variant}`}>
            <div className="sn-stats__data">
              <div className="sn-stats__number">{s.number}</div>
              <h3 className="sn-stats__label">{s.label}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* Beneficios */}
      <section className="sn-benefits">
        <div className="sn-container">
          <h2 className="sn-benefits__heading">
            Diseñada para equipos que quieren pasar de experimentar a implementar IA
          </h2>
          <div className="sn-benefits__grid">
            {BENEFITS.map((b) => (
              <article key={b.title} className="sn-benefit">
                <div className="sn-benefit__image-wrapper">
                  <img src={b.image} alt={b.title} className="sn-benefit__img" />
                </div>
                <div className="sn-benefit__content">
                  <h3 className="sn-benefit__title">{b.title}</h3>
                  <p className="sn-benefit__description">{b.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="sn-testimonials" aria-label="Testimonios">
        <div
          className="sn-testimonials__track"
          style={{
            transform: horizontal
              ? `translateX(-${slide * 100}%)`
              : `translateY(-${slide * 100}%)`,
          }}
        >
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="sn-testimonial">
              <div className="sn-testimonial__image-wrapper">
                <a
                  href={t.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sn-testimonial__image-link"
                >
                  <img src={t.image} alt={t.name} className="sn-testimonial__img" />
                </a>
              </div>
              <div className="sn-testimonial__content">
                <div className="sn-testimonial__label">Testimonios</div>
                <div>
                  <figcaption className="sn-testimonial__client">
                    <div className="sn-testimonial__name">{t.name}</div>
                    <div className="sn-testimonial__role">{t.role}</div>
                  </figcaption>
                  <blockquote className="sn-testimonial__quote">{t.quote}</blockquote>
                </div>
                <div className="sn-testimonial__socials">
                  <a href={t.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`LinkedIn de ${t.name}`} className="sn-testimonial__social">
                    <LinkedinIcon />
                  </a>
                  <a href={t.website} target="_blank" rel="noopener noreferrer" aria-label={`Sitio web de ${t.name}`} className="sn-testimonial__social">
                    <GlobeIcon />
                  </a>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* Una iniciativa de Propel */}
      <section className="sn-propel">
        <div className="sn-container sn-propel__grid">
          <div>
            <h2 className="sn-h2">Una iniciativa de Propel</h2>
            <p className="sn-propel__text">
              La Nonprofit Academy es una iniciativa de Propel, organización sin fines de lucro
              que impulsa la transformación digital de organizaciones sociales en América Latina.
              A través de la Nonprofit Academy, más líderes y equipos pueden desarrollar
              capacidades digitales, integrar inteligencia artificial y fortalecer su impacto.
            </p>
          </div>
          <div className="sn-propel__logo-wrapper">
            <img src={propelLogo} alt="Logo de Propel" className="sn-propel__logo" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default SobreNosotros;
