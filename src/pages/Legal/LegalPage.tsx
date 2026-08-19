import PageHead from '../../utils/PageHead';
import { PAGE_META } from '../../utils/pageMeta';
import orangeIco from '../../assets/about/orange-ico.avif';
import { PRIVACIDAD_HTML } from './privacidadContent';
import { TERMINOS_HTML } from './terminosContent';
import { CONTACTO_HTML } from './contactoContent';
import ContactForm from './ContactForm';
import './LegalPage.css';

// Páginas de texto del Webflow (header38 verde + rich text sobre gris). Todas
// comparten shell; solo cambian título, contenido y meta. `compact` = la sección
// del cuerpo usa padding-section-medium en vez de large (página de contacto).
const PAGES = {
  privacy: {
    title: 'Política de Privacidad',
    html: PRIVACIDAD_HTML,
    metaKey: 'privacy' as const,
    compact: false,
  },
  terms: {
    title: 'Términos y Condiciones',
    html: TERMINOS_HTML,
    metaKey: 'terms' as const,
    compact: false,
  },
  contact: {
    title: 'Contacto',
    html: CONTACTO_HTML,
    metaKey: 'contact' as const,
    compact: true,
  },
};

const LegalPage = ({ page }: { page: keyof typeof PAGES }) => {
  const { title, html, metaKey, compact } = PAGES[page];
  const meta = PAGE_META[metaKey];

  return (
    <div className="lp-page">
      <PageHead
        raw
        title={meta.title}
        description={meta.description}
        ogDescription={meta.ogDescription}
        ogImage={meta.ogImage}
        canonicalPath={meta.canonicalPath}
      />

      {/* header38 del Webflow: ícono Propel naranja + bloque yellow-dark
          apilados a la derecha (50% × 22.5vh cada uno); juntos dan la altura
          de la banda. Ocultos ≤991 (hide-tablet). */}
      <header className="lp-hero">
        <div className="lp-hero__grid">
          <div className="lp-hero__content">
            <h1 className="lp-hero__heading">{title}</h1>
          </div>
          <div className="lp-hero__art" aria-hidden="true">
            <img src={orangeIco} alt="" className="lp-hero__icon" />
            <div className="lp-hero__block" />
          </div>
        </div>
      </header>

      <section className={`lp-body${compact ? ' lp-body--compact' : ''}`}>
        <div className="lp-container">
          {/* Contenido legal estático extraído del Webflow — ver *Content.ts */}
          <div className="lp-richtext" dangerouslySetInnerHTML={{ __html: html }} />
          {page === 'contact' && <ContactForm />}
        </div>
      </section>
    </div>
  );
};

export default LegalPage;
