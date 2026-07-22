import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHead from '../../utils/PageHead';
import { credentialApi, type CredentialVerification } from '../../services/api';
import googleOrg from '../../assets/workshop/google-org.png';
import propelSquare from '../../assets/workshop/propel-square.png';
import './VerifyCredential.css';

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
};

const NotFoundState = () => (
  <div className="cred-page cred-page--center">
    <PageHead title="Credencial no encontrada" noIndex />
    <div className="cred-empty">
      <h1 className="cred-empty__title">Credencial no encontrada</h1>
      <p className="cred-empty__text">
        Este enlace de credencial no es válido o fue revocado.
      </p>
      <a href="/" className="cred-empty__link">Ir a Propel Academy</a>
    </div>
  </div>
);

const VerifyCredential = () => {
  const { code } = useParams<{ code: string }>();
  const [cred, setCred] = useState<CredentialVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) return;
    let active = true;
    credentialApi.verify(code)
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data) setCred(data);
        else setError(true);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code]);

  if (!code) return <NotFoundState />;
  if (loading) {
    return (
      <div className="cred-page cred-page--center">
        <div className="cred-empty"><p className="cred-empty__text">Cargando credencial…</p></div>
      </div>
    );
  }
  if (error || !cred) return <NotFoundState />;

  const issued = formatDate(cred.issued_at);

  return (
    <div className="cred-page">
      <PageHead
        raw
        title={`Credencial — ${cred.track_name} | Propel`}
        description={`${cred.recipient_name} completó "${cred.track_name}" en Propel.`}
        ogImage="/og/credential-badge.png"
        canonicalPath={`/verify/${code}`}
      />

      {/* ── Hero (ruta brand banner) ── */}
      <section className="cred-hero">
        <div className="cred-hero__left">
          <span className="cred-hero__tag">Certificación en IA</span>
          <h1 className="cred-hero__title">
            <span className="cred-hero__title-light">Lidera con un</span>{' '}
            <span className="cred-hero__title-medium">IA mindset</span>
          </h1>
          <p className="cred-hero__subtitle">Aprende a usar IA en tu organización social</p>
          <img className="cred-hero__google" src={googleOrg} alt="with support from Google.org" />
        </div>
        <div className="cred-hero__right">
          <img
            className="cred-hero__photo"
            src="/thumbnails/landinglidera.jpg"
            alt=""
            aria-hidden="true"
          />
          <img className="cred-hero__accent" src={propelSquare} alt="" aria-hidden="true" />
        </div>
      </section>

      {/* ── Credential ── */}
      <section className="cred-body">
        <div className="cred-body__left">
          <h2 className="cred-body__title">Felicidades. Completaste la ruta de aprendizaje.</h2>
          <ul className="cred-list">
            <li className="cred-item">
              <span className="cred-bullet" aria-hidden="true" />
              <div>
                <p className="cred-label">Nombre:</p>
                <p className="cred-value">{cred.recipient_name}</p>
              </div>
            </li>
            <li className="cred-item">
              <span className="cred-bullet" aria-hidden="true" />
              <div>
                <p className="cred-label">ID de la credencial</p>
                <p className="cred-value">{cred.credential_id}</p>
              </div>
            </li>
            {issued && (
              <li className="cred-item">
                <span className="cred-bullet" aria-hidden="true" />
                <div>
                  <p className="cred-label">Fecha de emisión:</p>
                  <p className="cred-value">{issued}</p>
                </div>
              </li>
            )}
          </ul>
          <span className="cred-verified">
            <span className="cred-check" aria-hidden="true">✓</span>
            Credencial verificada por {cred.organization}
          </span>
        </div>

        <div className="cred-body__right">
          <img className="cred-badge" src={cred.badge_url} alt="Insignia Lidera con un IA mindset" />
          <a className="cred-btn cred-btn--download" href={cred.badge_url} download target="_blank" rel="noopener noreferrer">
            Descarga tu insignia
          </a>
        </div>
      </section>
    </div>
  );
};

export default VerifyCredential;
