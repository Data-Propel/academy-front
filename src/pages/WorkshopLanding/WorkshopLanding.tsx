import { useEffect, useState } from 'react';
import { authApi, getToken, isAuthenticated } from '../../services/api';
import PageHead from '../../utils/PageHead';
import { PAGE_META } from '../../utils/pageMeta';
import googleOrg from '../../assets/workshop/google-org.png';
import peCard from '../../assets/workshop/pe-card.jpg';
import peHero from '../../assets/workshop/pe-hero.jpg';
import peSquare from '../../assets/workshop/pe-square.png';
import iconCalendar from '../../assets/workshop/icons/calendar.svg';
import iconClock from '../../assets/workshop/icons/clock.svg';
import iconVideo from '../../assets/workshop/icons/video.svg';
import './WorkshopLanding.css';

// Ediciones del workshop (setiembre 2026). El slug apunta al Workshop en la
// base; el resto es el contenido estático del hero y la tarjeta 1 de la ruta.
// `referralFallback` solo se usa si la API del landing no responde — la lista
// viva es Workshop.referral_options, editable desde /admin/workshops.
export type WorkshopEditionKey = 'pe' | 'co';

type WorkshopEdition = {
  slug: string;
  heroDateLabel: string;
  cardDateLabel: string;
  timeLabel: string;
  referralFallback: string[];
  metaKey: 'workshop' | 'workshopCo';
};

const EDITIONS: Record<WorkshopEditionKey, WorkshopEdition> = {
  pe: {
    slug: 'lidera-ia-pe',
    heroDateLabel: '9 de septiembre',
    cardDateLabel: '9 de septiembre',
    timeLabel: '9 AM PE',
    referralFallback: ['Ikigai', 'Kunan', 'Es Hoy', 'Propel'],
    metaKey: 'workshop',
  },
  co: {
    slug: 'lidera-ia-co',
    heroDateLabel: '10 de septiembre',
    cardDateLabel: '10 de septiembre',
    timeLabel: '9 AM CO',
    referralFallback: ['AFE', 'Makaia', 'Propel'],
    metaKey: 'workshopCo',
  },
};

const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
  'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela', 'España', 'Otro',
];

// Must read EXACTLY like the answers on the Zoom registration questionnaire
// (meeting 89072511024) — same wording is reused in pauta pagada.
const TIPOS_ORG = [
  'ONG o fundación',
  'Empresa privada o consultora',
  'Centro educativo, universidad u otros',
  'Entidad pública',
  'Cooperativa o empresa social',
];

// Profile stores country as ISO code; this form uses Spanish names. Unmapped → 'Otro'.
const COUNTRY_ISO_TO_NAME: Record<string, string> = {
  AR: 'Argentina', BO: 'Bolivia', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica',
  EC: 'Ecuador', SV: 'El Salvador', GT: 'Guatemala', HN: 'Honduras', MX: 'México',
  NI: 'Nicaragua', PA: 'Panamá', PY: 'Paraguay', PE: 'Perú', DO: 'República Dominicana',
  UY: 'Uruguay', VE: 'Venezuela', ES: 'España',
};

// Profile stores org type as a slug; this form uses labels. Unmapped → left
// empty so the person picks one themselves.
const ORG_TYPE_SLUG_TO_LABEL: Record<string, string> = {
  ong: 'ONG o fundación', fundacion: 'ONG o fundación', asociacion: 'ONG o fundación',
  empresa_social: 'Cooperativa o empresa social',
  educativa: 'Centro educativo, universidad u otros',
  gobierno: 'Entidad pública',
};

type PathCourse = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  thumbnail_url: string;
  status: string;
  duration: string;
  fecha: string;
};

// One ruta card. The first card is the live workshop itself (static page
// content); the rest come from the path API (on-demand courses, titles baked
// into their thumbnails).
type RutaCard = {
  key: string;
  href: string;
  thumbnail: string;
  alt: string;
  live: boolean;
  fecha: string;
  metaLabel: string;
  metaValue: string;
};

type FormState = {
  nombre: string; apellido: string; email: string; pais: string;
  organizacion: string; tipoOrganizacion: string; comoTeEnteraste: string;
  newsletter: boolean;
};

const EMPTY: FormState = {
  nombre: '', apellido: '', email: '', pais: '',
  organizacion: '', tipoOrganizacion: '', comoTeEnteraste: '', newsletter: false,
};

// DRF returns either { detail: "..." } or field-keyed errors like { email: ["..."] }.
const extractError = (data: Record<string, unknown>): string => {
  if (typeof data.detail === 'string') return data.detail;
  for (const v of Object.values(data)) {
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  }
  return 'Ocurrió un error. Por favor, intenta de nuevo.';
};

type AlreadyRegistered = { zoomJoinUrl: string | null };

const WorkshopLanding = ({ edition = 'pe' }: { edition?: WorkshopEditionKey }) => {
  const ed = EDITIONS[edition];
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  // For authenticated users we ask the backend up-front whether they already
  // have a registration for this workshop. While `statusReady` is false we
  // render a skeleton in the form panel so the form never flashes before
  // being replaced — for guests it's true from the start.
  const [statusReady, setStatusReady] = useState(!isAuthenticated());
  const [alreadyRegistered, setAlreadyRegistered] = useState<AlreadyRegistered | null>(null);
  const [pathCourses, setPathCourses] = useState<PathCourse[]>([]);
  const [referralOptions, setReferralOptions] = useState<string[]>(ed.referralFallback);
  const [helpOpen, setHelpOpen] = useState(false);

  // Close the help bubble on any click outside it (the bubble itself stays
  // clickable so the email can be selected and copied).
  useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.ws-help') && !t.closest('.ws-help-bubble')) setHelpOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [helpOpen]);

  // Public 'ruta de aprendizaje' + dropdown de aliados — run on mount for
  // everyone, no auth needed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workshops/${ed.slug}/path/`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as PathCourse[];
        if (!cancelled) setPathCourses(data);
      } catch {
        // Leave empty on failure — the section just hides itself.
      }
    })();
    (async () => {
      try {
        const res = await fetch(`/api/workshops/${ed.slug}/landing/`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as { referral_options?: string[] };
        if (!cancelled && Array.isArray(data.referral_options) && data.referral_options.length > 0) {
          setReferralOptions(data.referral_options);
        }
      } catch {
        // Keep the fallback list.
      }
    })();
    return () => { cancelled = true; };
  }, [ed.slug]);

  // Pre-fill from the logged-in user's profile (editable — they may register someone else)
  // and check whether they already have a registration for this workshop.
  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;
    (async () => {
      const token = getToken();
      const [profileRes, statusRes] = await Promise.all([
        authApi.getProfile(),
        fetch(`/api/workshops/${ed.slug}/my-status/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);
      if (cancelled) return;

      if (profileRes.ok) {
        const u = profileRes.data as {
          first_name?: string; last_name?: string; email?: string;
          organization?: string; organization_type?: string; country?: string;
        };
        setForm(f => ({
          ...f,
          nombre: f.nombre || u.first_name || '',
          apellido: f.apellido || u.last_name || '',
          email: f.email || u.email || '',
          organizacion: f.organizacion || u.organization || '',
          pais: f.pais || (u.country ? (COUNTRY_ISO_TO_NAME[u.country] ?? 'Otro') : ''),
          tipoOrganizacion: f.tipoOrganizacion || (u.organization_type ? (ORG_TYPE_SLUG_TO_LABEL[u.organization_type] ?? '') : ''),
        }));
      }

      if (statusRes.ok) {
        const data = await statusRes.json().catch(() => ({})) as {
          registered?: boolean; zoom_join_url?: string | null;
        };
        if (data.registered) {
          setAlreadyRegistered({ zoomJoinUrl: data.zoom_join_url ?? null });
        }
      }
      // If the status call fails (e.g. 401 after refresh-token expiry), fall
      // open to the form — the POST endpoint will still reject duplicates.
      setStatusReady(true);
    })();
    return () => { cancelled = true; };
  }, [ed.slug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/workshops/${ed.slug}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          pais: form.pais,
          organizacion: form.organizacion,
          tipo_organizacion: form.tipoOrganizacion,
          como_te_enteraste: form.comoTeEnteraste,
          newsletter: form.newsletter,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        setError(extractError(data));
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  // Card 1 is the workshop itself (Workshop Live); cards 2+ are the on-demand
  // courses from the path API. Only built when there are path courses, since
  // the whole section is gated on that below.
  const rutaCards: RutaCard[] = [
    {
      key: 'workshop',
      href: '#ws-registro',
      thumbnail: peCard,
      alt: 'Lidera con un IA mindset',
      live: true,
      fecha: ed.cardDateLabel,
      metaLabel: 'Duración',
      metaValue: '60 min',
    },
    ...pathCourses.map((c): RutaCard => ({
      key: String(c.id),
      href: `/courses/${c.slug}`,
      thumbnail: c.thumbnail_url,
      alt: c.title,
      live: false,
      fecha: c.fecha,
      metaLabel: 'Duración',
      metaValue: c.duration,
    })),
  ];

  return (
    <div className="ws-page">
      <PageHead
        raw
        title={PAGE_META[ed.metaKey].title}
        description={PAGE_META[ed.metaKey].description}
        ogDescription={PAGE_META[ed.metaKey].ogDescription}
        ogImage={PAGE_META[ed.metaKey].ogImage}
        canonicalPath={PAGE_META[ed.metaKey].canonicalPath}
      />

      {/* ── Success modal ── */}
      {success && (
        <div className="ws-modal-overlay">
          <div className="ws-modal">
            <button className="ws-modal__close" onClick={() => setSuccess(false)}>×</button>
            <h2 className="ws-modal__title">¡Estás dentro!</h2>
            <div className="ws-modal__body">
              <p>Gracias por registrarte al workshop: Lidera con un IA mindset.</p>
              <p><strong>
                {isAuthenticated()
                  ? 'Mientras tanto, comienza tu certificación en la Nonprofit Academy.'
                  : 'Para iniciar tu certificación, crea tu cuenta en la Nonprofit Academy.'}
              </strong></p>
            </div>
            <div className="ws-modal__actions">
              {isAuthenticated() ? (
                <a href="/cursos" className="ws-btn ws-btn--modal-primary">Ir a mis cursos</a>
              ) : (
                <>
                  <a href="/register" className="ws-btn ws-btn--modal-primary">Crear cuenta</a>
                  <a href="/login" className="ws-btn ws-btn--modal-secondary">Ya tengo cuenta</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="ws-hero" id="ws-registro">

        {/* Left: blue info panel */}
        <div className="ws-hero__left">
          <div className="ws-hero__badge-row">
            <span className="ws-badge">Workshop</span>
          </div>
          <h1 className="ws-hero__title">
            <span className="ws-hero__title-light">Lidera con un</span>
            <br />
            <span className="ws-hero__title-medium">IA mindset</span>
          </h1>
          <p className="ws-hero__subtitle">Aprende a usar IA en tu organización social</p>

          <div className="ws-hero__details">
            <div className="ws-hero__detail">
              <img src={iconCalendar} alt="" aria-hidden="true" className="ws-hero__detail-icon" />
              <p className="ws-detail-line">{ed.heroDateLabel}</p>
            </div>
            <div className="ws-hero__detail">
              <img src={iconClock} alt="" aria-hidden="true" className="ws-hero__detail-icon" />
              <p className="ws-detail-line">{ed.timeLabel}</p>
            </div>
            <div className="ws-hero__detail">
              <img src={iconVideo} alt="" aria-hidden="true" className="ws-hero__detail-icon" />
              <p className="ws-detail-line">Vía Zoom</p>
            </div>
          </div>

          <div className="ws-hero__support">
            <img src={googleOrg} alt="with support from Google.org" className="ws-hero__google" />
          </div>

          {/* Full-bleed photo strip: photo left, Propel square + blue block on
              the right edge, per the Figma frame. */}
          <div className="ws-hero__photo" aria-hidden="true">
            <img src={peHero} alt="" className="ws-hero__photo-img" />
            <div className="ws-hero__photo-side">
              <img src={peSquare} alt="" className="ws-hero__photo-square" />
              <div className="ws-hero__photo-block" />
            </div>
          </div>
        </div>

        {/* Right: white form panel */}
        <div className="ws-hero__right">
          {!statusReady ? (
            <div className="ws-form ws-form--loading" aria-busy="true" />
          ) : alreadyRegistered ? (
            <div className="ws-form ws-form--registered">
              <h2 className="ws-modal__title">¡Ya estás registrado!</h2>
              <p>Te esperamos en el workshop: Lidera con un IA mindset el {ed.heroDateLabel}.</p>
              <p><strong>Mientras tanto, comienza tu certificación en la Nonprofit Academy.</strong></p>
              <a href="/cursos" className="ws-btn ws-btn--submit">Ver cursos disponibles</a>
            </div>
          ) : (
          <form className="ws-form" onSubmit={handleSubmit}>
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
                  {referralOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <p className="ws-form__note">*Los campos son obligatorios</p>

            <label className="ws-checkbox">
              <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} required />
              <span>¿Quieres suscribirte al newsletter de Propel?*</span>
            </label>

            <p className="ws-form__legal">
              En Propel, respetamos tu privacidad. Al aceptar este formulario aceptas nuestros términos y condiciones, política de privacidad y recibir correos de nuestros cursos y eventos.
            </p>

            <button type="submit" className="ws-btn ws-btn--submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrarme'}
            </button>
          </form>
          )}

          {helpOpen && (
            <div className="ws-help-bubble" role="tooltip">
              ¿Dudas? Escríbenos a<br />
              <strong>nonprofitacademy@wepropel.org</strong>
            </div>
          )}
          <button
            type="button"
            className="ws-help"
            aria-label="Ayuda"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(o => !o)}
          >?</button>
        </div>
      </section>

      {/* ── Courses ── */}
      {pathCourses.length > 0 && (
        <section className="ws-courses">
          <h2 className="ws-courses__title">Certificación en IA</h2>
          <p className="ws-courses__desc">
            Lidera el cambio en tu organización social y aplica IA de forma práctica con nuestra ruta de aprendizaje.
          </p>

          <div className="ws-grid">
            {rutaCards.map(card => (
              <a key={card.key} href={card.href} className="ws-card">
                <div className="ws-card__img">
                  {card.thumbnail && <img src={card.thumbnail} alt={card.alt} loading="lazy" />}
                </div>
                <div className="ws-card__body">
                  <span className={`ws-card__chip${card.live ? ' ws-card__chip--live' : ''}`}>
                    {card.live ? 'Workshop' : 'On demand'}
                  </span>
                  {card.fecha && (
                    <p className="ws-card__row">
                      <span className="ws-card__row-label">Fecha:</span> {card.fecha}
                    </p>
                  )}
                  {card.metaValue && (
                    <p className="ws-card__row ws-card__row--meta">
                      <span className="ws-card__row-label">{card.metaLabel}:</span> {card.metaValue}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>

          <div className="ws-courses__cta">
            <a href="/register" className="ws-btn ws-btn--cta">Crea tu cuenta</a>
          </div>
        </section>
      )}

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
