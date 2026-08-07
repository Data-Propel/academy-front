import { useEffect, useRef, useState } from 'react';
import { authApi, getToken, isAuthenticated } from '../../services/api';
import PageHead from '../../utils/PageHead';
import { PAGE_META } from '../../utils/pageMeta';
import propelSquare from '../../assets/workshop/propel-square.png';
import andreaPhoto from '../../assets/workshop/andrea-lopez.png';
import iconCalendar from '../../assets/workshop/icons/calendar-dark.svg';
import iconClock from '../../assets/workshop/icons/clock-dark.svg';
import iconVideo from '../../assets/workshop/icons/video-dark.svg';
import './WorkshopEvent.css';

// Landing genérica de eventos en /workshop (Figma "Nueva Landing registro
// evento"). EVENT es el contenido estático de la edición vigente; el slug
// apunta al Workshop en la base, que guarda el Link de Zoom y la señal de
// confirmación (editables desde /admin/workshops sin despliegue).
const EVENT = {
  slug: 'mide-impacto-ia',
  name: 'Mide tu impacto con IA',
  dateLabel: '20 de agosto',
  timeLabel: '9:00 AM CDMX | 10:00 AM PE/CO | 11:00 AM CH/AR',
  takeaways: [
    'Claridad sobre qué, cómo y cuándo medir.',
    'Un plan para fortalecer su sistema de medición con IA.',
    'Un caso de uso de IA listo para implementar.',
  ],
  presenter: { name: 'Andrea López Aranda', role: 'Programs Manager', org: '@ Propel' },
};

const PAISES = [
  'Argentina', 'Bolivia', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador',
  'El Salvador', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá',
  'Paraguay', 'Perú', 'República Dominicana', 'Uruguay', 'Venezuela', 'España', 'Otro',
];

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

const ORG_TYPE_SLUG_TO_LABEL: Record<string, string> = {
  ong: 'ONG o fundación', fundacion: 'ONG o fundación', asociacion: 'ONG o fundación',
  empresa_social: 'Cooperativa o empresa social',
  educativa: 'Centro educativo, universidad u otros',
  gobierno: 'Entidad pública',
};

type FormState = {
  nombre: string; apellido: string; email: string; pais: string;
  organizacion: string; tipoOrganizacion: string; newsletter: boolean;
};

const EMPTY: FormState = {
  nombre: '', apellido: '', email: '', pais: '',
  organizacion: '', tipoOrganizacion: '', newsletter: false,
};

type FieldKey = keyof FormState;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Mensajes específicos por campo (criterio: error claro sin perder lo ingresado).
const validateField = (name: FieldKey, form: FormState): string => {
  switch (name) {
    case 'nombre': return form.nombre.trim() ? '' : 'Ingresa tu nombre.';
    case 'apellido': return form.apellido.trim() ? '' : 'Ingresa tu apellido.';
    case 'organizacion': return form.organizacion.trim() ? '' : 'Ingresa el nombre de tu organización.';
    case 'tipoOrganizacion': return form.tipoOrganizacion ? '' : 'Selecciona el tipo de organización.';
    case 'pais': return form.pais ? '' : 'Selecciona tu país.';
    case 'email':
      if (!form.email.trim()) return 'Ingresa tu correo electrónico.';
      return EMAIL_RE.test(form.email.trim()) ? '' : 'Ingresa un correo electrónico válido (ej. nombre@organizacion.org).';
    case 'newsletter': return form.newsletter ? '' : 'Marca la casilla para continuar.';
  }
};

const FIELD_ORDER: FieldKey[] = [
  'nombre', 'apellido', 'organizacion', 'tipoOrganizacion', 'pais', 'email', 'newsletter',
];

// DRF field keys → form field keys, para mapear errores del backend al campo.
const API_TO_FIELD: Record<string, FieldKey> = {
  nombre: 'nombre', apellido: 'apellido', email: 'email', pais: 'pais',
  organizacion: 'organizacion', tipo_organizacion: 'tipoOrganizacion', newsletter: 'newsletter',
};

const WorkshopEvent = () => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [statusReady, setStatusReady] = useState(!isAuthenticated());
  const [helpOpen, setHelpOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Close the help bubble on any click outside it.
  useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.wse-help') && !t.closest('.wse-help-bubble')) setHelpOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [helpOpen]);

  // Pre-fill from the logged-in user's profile (editable — they may register
  // someone else) and check whether they already registered for this event.
  useEffect(() => {
    if (!isAuthenticated()) return;
    let cancelled = false;
    (async () => {
      const token = getToken();
      const [profileRes, statusRes] = await Promise.all([
        authApi.getProfile(),
        fetch(`/api/workshops/${EVENT.slug}/my-status/`, {
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
        const data = await statusRes.json().catch(() => ({})) as { registered?: boolean };
        if (data.registered) setAlreadyRegistered(true);
      }
      // If the status call fails, fall open to the form — the POST endpoint
      // still rejects duplicates.
      setStatusReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const key = name as FieldKey;
    setForm(f => ({ ...f, [key]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
    setFieldErrors(errs => (errs[key] ? { ...errs, [key]: '' } : errs));
  };

  const focusField = (key: FieldKey) => {
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${key}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const errs: Partial<Record<FieldKey, string>> = {};
    for (const key of FIELD_ORDER) {
      const msg = validateField(key, form);
      if (msg) errs[key] = msg;
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      focusField(FIELD_ORDER.find(k => errs[k])!);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workshops/${EVENT.slug}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: form.email.trim(),
          pais: form.pais,
          organizacion: form.organizacion.trim(),
          tipo_organizacion: form.tipoOrganizacion,
          newsletter: form.newsletter,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
        // Field-keyed DRF errors land under their field; everything else
        // (e.g. correo duplicado) is shown as a form-level banner.
        const apiFieldErrs: Partial<Record<FieldKey, string>> = {};
        let banner = typeof data.detail === 'string' ? data.detail : '';
        for (const [k, v] of Object.entries(data)) {
          const msg = typeof v === 'string' ? v : (Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '');
          if (!msg) continue;
          const field = API_TO_FIELD[k];
          if (field) apiFieldErrs[field] = msg;
          else if (!banner) banner = msg;
        }
        if (Object.keys(apiFieldErrs).length > 0) {
          setFieldErrors(apiFieldErrs);
          focusField(FIELD_ORDER.find(k => apiFieldErrs[k])!);
        } else {
          setFormError(banner || 'Ocurrió un error. Por favor, intenta de nuevo.');
        }
      }
    } catch {
      setFormError('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key: FieldKey) => fieldErrors[key] ? (
    <p className="wse-field__error" role="alert">{fieldErrors[key]}</p>
  ) : null;

  // Fecha/hora del evento — se muestra en el hero y en la confirmación.
  const eventSchedule = (
    <div className="wse-details">
      <div className="wse-detail">
        <img src={iconCalendar} alt="" aria-hidden="true" className="wse-detail__icon" />
        <p>{EVENT.dateLabel}</p>
      </div>
      <div className="wse-detail">
        <img src={iconClock} alt="" aria-hidden="true" className="wse-detail__icon" />
        <p>{EVENT.timeLabel}</p>
      </div>
      <div className="wse-detail">
        <img src={iconVideo} alt="" aria-hidden="true" className="wse-detail__icon" />
        <p>Vía Zoom</p>
      </div>
    </div>
  );

  return (
    <div className="wse-page">
      <PageHead
        raw
        title={PAGE_META.workshopEvent.title}
        description={PAGE_META.workshopEvent.description}
        ogDescription={PAGE_META.workshopEvent.ogDescription}
        ogImage={PAGE_META.workshopEvent.ogImage}
        canonicalPath={PAGE_META.workshopEvent.canonicalPath}
      />

      {/* ── Success modal: confirma la inscripción con fecha/hora ── */}
      {success && (
        <div className="wse-modal-overlay">
          <div className="wse-modal" role="dialog" aria-modal="true" aria-labelledby="wse-modal-title">
            <button className="wse-modal__close" onClick={() => setSuccess(false)} aria-label="Cerrar">×</button>
            <h2 className="wse-modal__title" id="wse-modal-title">¡Estás dentro!</h2>
            <p className="wse-modal__text">
              Tu inscripción al workshop <strong>{EVENT.name}</strong> está confirmada.
            </p>
            {eventSchedule}
            <p className="wse-modal__text">
              Te enviaremos la confirmación con el link de Zoom a tu correo.
            </p>
          </div>
        </div>
      )}

      <section className="wse-hero">
        {/* Left: event info */}
        <div className="wse-left">
          <div className="wse-left__content">
            <span className="wse-badge">Workshop</span>
            <h1 className="wse-title">
              Mide tu<br />
              <span className="wse-title__medium">impacto con IA</span>
            </h1>
            <div className="wse-takeaways">
              <p>¿Qué te llevarás?</p>
              <ul>
                {EVENT.takeaways.map(t => <li key={t}>{t}</li>)}
              </ul>
            </div>
            {eventSchedule}
          </div>
          <div className="wse-band">
            <div className="wse-band__photo">
              <img src={andreaPhoto} alt={EVENT.presenter.name} />
            </div>
            <div className="wse-band__presenter">
              <p className="wse-band__name">{EVENT.presenter.name}</p>
              <p>{EVENT.presenter.role}</p>
              <p>{EVENT.presenter.org}</p>
            </div>
          </div>
        </div>

        {/* Decorative strip: Propel square + yellow column */}
        <div className="wse-strip" aria-hidden="true">
          <img src={propelSquare} alt="" className="wse-strip__square" />
          <div className="wse-strip__yellow" />
        </div>

        {/* Right: registration form */}
        <div className="wse-right">
          {!statusReady ? (
            <div className="wse-form wse-form--loading" aria-busy="true" />
          ) : alreadyRegistered ? (
            <div className="wse-form wse-form--registered">
              <h2 className="wse-modal__title">¡Ya estás registrado!</h2>
              <p className="wse-modal__text">
                Te esperamos en el workshop <strong>{EVENT.name}</strong>.
              </p>
              {eventSchedule}
              <p className="wse-modal__text">Te enviaremos el link de Zoom a tu correo.</p>
            </div>
          ) : (
            <form className="wse-form" onSubmit={handleSubmit} noValidate ref={formRef}>
              {formError && <div className="wse-form__error" role="alert">{formError}</div>}

              <div className="wse-form__row">
                <div className="wse-field">
                  <label htmlFor="wse-nombre">Nombre*</label>
                  <input id="wse-nombre" name="nombre" type="text" autoComplete="given-name"
                    value={form.nombre} onChange={handleChange}
                    className={fieldErrors.nombre ? 'wse-input--invalid' : ''} />
                  {fieldError('nombre')}
                </div>
                <div className="wse-field">
                  <label htmlFor="wse-apellido">Apellido*</label>
                  <input id="wse-apellido" name="apellido" type="text" autoComplete="family-name"
                    value={form.apellido} onChange={handleChange}
                    className={fieldErrors.apellido ? 'wse-input--invalid' : ''} />
                  {fieldError('apellido')}
                </div>
              </div>

              <div className="wse-form__row">
                <div className="wse-field">
                  <label htmlFor="wse-org">Organización*</label>
                  <input id="wse-org" name="organizacion" type="text" autoComplete="organization"
                    value={form.organizacion} onChange={handleChange}
                    className={fieldErrors.organizacion ? 'wse-input--invalid' : ''} />
                  {fieldError('organizacion')}
                </div>
                <div className="wse-field">
                  <label htmlFor="wse-tipo">Tipo de organización*</label>
                  <div className="wse-select">
                    <select id="wse-tipo" name="tipoOrganizacion" value={form.tipoOrganizacion}
                      onChange={handleChange}
                      className={fieldErrors.tipoOrganizacion ? 'wse-input--invalid' : ''}>
                      <option value="" disabled />
                      {TIPOS_ORG.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {fieldError('tipoOrganizacion')}
                </div>
              </div>

              <div className="wse-form__row">
                <div className="wse-field">
                  <label htmlFor="wse-pais">País*</label>
                  <div className="wse-select">
                    <select id="wse-pais" name="pais" value={form.pais} onChange={handleChange}
                      className={fieldErrors.pais ? 'wse-input--invalid' : ''}>
                      <option value="" disabled />
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {fieldError('pais')}
                </div>
                <div className="wse-field">
                  <label htmlFor="wse-email">Correo electrónico*</label>
                  <input id="wse-email" name="email" type="email" autoComplete="email"
                    value={form.email} onChange={handleChange}
                    className={fieldErrors.email ? 'wse-input--invalid' : ''} />
                  {fieldError('email')}
                </div>
              </div>

              <p className="wse-form__note">*Los campos son obligatorios</p>

              <div className="wse-field wse-field--checkbox">
                <label className="wse-checkbox">
                  <input type="checkbox" name="newsletter" checked={form.newsletter} onChange={handleChange} />
                  <span>¿Quieres suscribirte al newsletter de Propel?*</span>
                </label>
                {fieldError('newsletter')}
              </div>

              <p className="wse-form__legal">
                En Propel, respetamos tu privacidad. Al aceptar este formulario aceptas nuestros términos y condiciones, política de privacidad y recibir correos de nuestros cursos y eventos.
              </p>

              <button type="submit" className="wse-submit" disabled={loading}>
                {loading ? 'Registrando...' : 'Registrarme'}
              </button>
            </form>
          )}

          {helpOpen && (
            <div className="wse-help-bubble" role="tooltip">
              ¿Dudas? Escríbenos a<br />
              <strong>nonprofitacademy@wepropel.org</strong>
            </div>
          )}
          <button
            type="button"
            className="wse-help"
            aria-label="Ayuda"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(o => !o)}
          >?</button>
        </div>
      </section>
    </div>
  );
};

export default WorkshopEvent;
