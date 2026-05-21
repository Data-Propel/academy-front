import { useState } from 'react';
import PageHead from '../../utils/PageHead';
import propelSquare from '../../assets/workshop/propel-square.png';
import googleOrg from '../../assets/workshop/google-org.png';
import courseAsistente from '../../assets/workshop/course-asistente.png';
import courseLidera from '../../assets/workshop/course-lidera.png';
import courseMetas from '../../assets/workshop/course-metas.png';
import courseData from '../../assets/workshop/course-data.png';
import './WorkshopLanding.css';

const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
  'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela', 'España', 'Otro',
];

const TIPOS_ORG = [
  'ONG / OSC', 'Fundación', 'Asociación Civil', 'Empresa Social',
  'Sector Público', 'Academia / Universidad', 'Otro',
];

const COMO_TE_ENTERASTE = [
  'Wingu',
  'Red Argentina de Cooperacion Internacional | RACI',
  'Potenciar Solidario',
  'Fundación Navarro Viola',
  'Fundación Mustakis',
  'Comunidad Organizaciones Solidarias | COS Chile',
  'Propel',
];

const COURSES = [
  { tag: 'Live',                    title: 'Workshop:\nLidera con IA mindset',  date: '18 DE JUNIO',  meta: '10 AM CH | 11 AM ARG', img: courseLidera },
  { tag: 'Inteligencia Artificial', title: 'Crea tu\nasistente IA',             date: '30 DE JUNIO',  meta: '20 MIN',               img: courseAsistente },
  { tag: 'Liderazgo',               title: 'Define tus metas\ncon IA',          date: '16 DE JULIO',  meta: '30 MIN',               img: courseMetas },
  { tag: 'Medición de impacto',     title: 'Data para el\nimpacto social',      date: '23 DE JULIO',  meta: '30 MIN',               img: courseData },
];

type FormState = {
  nombre: string; apellido: string; email: string; pais: string;
  organizacion: string; tipoOrganizacion: string; comoTeEnteraste: string;
  newsletter: boolean;
};

const EMPTY: FormState = {
  nombre: '', apellido: '', email: '', pais: '',
  organizacion: '', tipoOrganizacion: '', comoTeEnteraste: '', newsletter: false,
};

const WorkshopLanding = () => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/workshops/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({})) as { detail?: string };
        setError(data.detail || 'Ocurrió un error. Por favor, intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ws-page">
      <PageHead
        title="Workshop: Lidera con un IA mindset"
        description="Aprende a usar IA en tu organización social. Regístrate gratis al workshop virtual del 18 de junio."
      />

      {/* ── Success modal ── */}
      {success && (
        <div className="ws-modal-overlay">
          <div className="ws-modal">
            <button className="ws-modal__close" onClick={() => setSuccess(false)}>×</button>
            <h2 className="ws-modal__title">¡Estás dentro!</h2>
            <div className="ws-modal__body">
              <p>Gracias por registrarte al workshop: Lidera con un IA mindset. </p>
              <p><strong>Para iniciar tu certificación, crea tu cuenta en la Nonprofit Academy.</strong></p>
            </div>
            <div className="ws-modal__actions">
              <a href="/register" className="ws-btn ws-btn--modal-primary">Crear cuenta</a>
              <a href="/login" className="ws-btn ws-btn--modal-secondary">Ya tengo cuenta</a>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="ws-hero">

        {/* Left: blue info panel */}
        <div className="ws-hero__left">
          <span className="ws-badge">Workshop</span>
          <h1 className="ws-hero__title">
            <span className="ws-hero__title-light">Lidera con un</span>
            <br />
            <span className="ws-hero__title-medium">IA mindset</span>
          </h1>
          <p className="ws-hero__subtitle">Aprende a usar IA en tu organización social</p>

          <div className="ws-hero__details">
            <div className="ws-hero__detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div>
                <p className="ws-detail-line">18 de junio</p>
                <p className="ws-detail-line">11 AM AR/UR | 10 AM CH</p>
              </div>
            </div>
            <div className="ws-hero__detail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              <p className="ws-detail-line">Vía Zoom</p>
            </div>
          </div>

          <div className="ws-hero__support">
            <img src={googleOrg} alt="with support from Google.org" className="ws-hero__google" />
          </div>
        </div>

        {/* Centre: strip with propel square */}
        <div className="ws-hero__strip">
          <img src={propelSquare} alt="" aria-hidden="true" className="ws-hero__strip-img" />
        </div>

        {/* Right: white form panel */}
        <div className="ws-hero__right">
          <form className="ws-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="ws-form__error">{error}</div>}

            <div className="ws-form__row">
              <div className="ws-field">
                <label htmlFor="ws-nombre">Nombre*</label>
                <input id="ws-nombre" name="nombre" type="text" value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="ws-field">
                <label htmlFor="ws-apellido">Apellido*</label>
                <input id="ws-apellido" name="apellido" type="text" value={form.apellido} onChange={handleChange} required />
              </div>
            </div>

            <div className="ws-form__row">
              <div className="ws-field">
                <label htmlFor="ws-email">Correo electrónico*</label>
                <input id="ws-email" name="email" type="email" value={form.email} onChange={handleChange} required />
              </div>
              <div className="ws-field">
                <label htmlFor="ws-pais">País*</label>
                <div className="ws-select">
                  <select id="ws-pais" name="pais" value={form.pais} onChange={handleChange} required>
                    <option value="" disabled />
                    {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="ws-form__row">
              <div className="ws-field">
                <label htmlFor="ws-org">Organización*</label>
                <input id="ws-org" name="organizacion" type="text" value={form.organizacion} onChange={handleChange} required />
              </div>
              <div className="ws-field">
                <label htmlFor="ws-tipo">Tipo de organización*</label>
                <div className="ws-select">
                  <select id="ws-tipo" name="tipoOrganizacion" value={form.tipoOrganizacion} onChange={handleChange} required>
                    <option value="" disabled />
                    {TIPOS_ORG.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="ws-field ws-field--full">
              <label htmlFor="ws-como">¿Cómo te enteraste del workshop? *</label>
              <div className="ws-select">
                <select id="ws-como" name="comoTeEnteraste" value={form.comoTeEnteraste} onChange={handleChange} required>
                  <option value="" disabled />
                  {COMO_TE_ENTERASTE.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <p className="ws-form__note">*Los campos son obligatorios</p>

            <label className="ws-checkbox">
              <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} />
              <span>¿Quieres suscribirte al newsletter de Propel?*</span>
            </label>

            <p className="ws-form__legal">
              En Propel, respetamos tu privacidad. Al aceptar este formulario aceptas nuestros términos y condiciones, política de privacidad y recibir correos de nuestros cursos y eventos.
            </p>

            <button type="submit" className="ws-btn ws-btn--submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarme'}
            </button>
          </form>

          <button
            type="button"
            className="ws-help"
            aria-label="Ayuda"
            onClick={() => window.open('mailto:academy@wepropel.org', '_blank')}
          >?</button>
        </div>
      </section>

      {/* ── Courses ── */}
      <section className="ws-courses">
        <h2 className="ws-courses__title">Certificación en IA</h2>
        <p className="ws-courses__desc">
          Lidera el cambio en tu organización social y aplica IA de forma práctica con nuestra ruta de aprendizaje.
        </p>

        <div className="ws-grid">
          {COURSES.map(c => (
            <div key={c.title} className="ws-card">
              <div className="ws-card__img">
                <img src={c.img} alt={c.title.replace('\n', ' ')} />
              </div>
              <div className="ws-card__body">
                <span className="ws-card__tag">{c.tag}</span>
                <h3 className="ws-card__title">{c.title.split('\n').map((line, i) => (
                  <span key={i}>{line}{i < c.title.split('\n').length - 1 && <br />}</span>
                ))}</h3>
                <p className="ws-card__meta">{c.date}<br />{c.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="ws-courses__cta">
          <a href="/register" className="ws-btn ws-btn--cta">Crea tu cuenta</a>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="ws-benefits">
        <div className="ws-benefits__left">
          <h2>Impulsa tu<br />organización con IA</h2>
        </div>
        <div className="ws-benefits__right">
          <p className="ws-benefits__label">Obtendrás:</p>
          <ul className="ws-benefits__list">
            <li>Certificación en IA</li>
            <li>Kit de recursos</li>
            <li>Insignia digital</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default WorkshopLanding;
