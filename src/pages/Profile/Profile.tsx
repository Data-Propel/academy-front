import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, isAuthenticated, coursesApi, MEDIA_URL } from '../../services/api';
import './Profile.css';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  organization: string;
  created_at: string;
  avatar: string | null;
}

interface Enrollment {
  course: {
    id: number;
    title: string;
    slug: string;
    thumbnail_url: string | null;
  };
  progress: number;
  completed_at: string | null;
}

interface Favorite {
  course: {
    id: number;
    title: string;
    slug: string;
    thumbnail_url: string | null;
  };
}

type ProfileTab = 'learning' | 'list' | 'settings';

const localThumbnails: Record<string, string> = {
  'conecta-con-nuevos-donantes': '/thumbnails/Conacta-con-donantes-portada.webp',
  'crea-contenido-para-redes-sociales-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-may.webp',
  'aprende-a-liderar-con-ia': '/thumbnails/Thumbnail-Cursos-Nonprofit-Academy-3-oct.webp',
  'growth-marketing-para-ongs': '/thumbnails/Imagen-destacada.webp',
  'impact-accelerator': '/thumbnails/Copy-of-Imagen-destacada-1.webp',
  'propel-fellowship': '/thumbnails/Thumbnail-Propel-Fellowship-C8-1.webp',
  'team-handbook': '/thumbnails/Portadas-cursos-1.webp',
  'guia-de-procesos-internos': '/thumbnails/Portadas-cursos.webp',
  'introduccion-a-chatgpt-para-organizaciones-sociale': '/thumbnails/Introduccion-a-CHATGPT.webp',
  'define-tus-metas-con-okrs': '/thumbnails/okr.webp',
  'atrae-mas-vistas-con-seo': '/thumbnails/002.webp',
  'lean-data-para-impacto-social': '/thumbnails/Imagen-destacada-10-1.webp',
  'construye-indicadores-para-medir-impacto': '/thumbnails/Imagen-destacada-14.webp',
  'convierte-tus-ideas-en-un-pitch-ganador': '/thumbnails/001-1.webp',
  'potencia-tu-teoria-de-cambio': '/thumbnails/Imagen-destacada-11.webp',
  'aplica-a-tu-siguiente-grant-con-ia': '/thumbnails/003.webp',
  'identifica-a-tu-donante-ideal': '/thumbnails/Imagen-destacada-13-1.webp',
  'crea-tu-asistente-ia': '/thumbnails/Asistente-IA-portada.webp',
};

const GRADIENTS = [
  'linear-gradient(135deg, #FD6A44, #e55a36)',
  'linear-gradient(135deg, #0E4B43, #22c55e)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
];

const getAvatarGradient = (id: number) => GRADIENTS[id % GRADIENTS.length];

const getInitials = (firstName: string, lastName: string) => {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return f + l || '?';
};

const formatMemberSince = (dateStr: string) => {
  if (!dateStr) return '';
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const d = new Date(dateStr);
  return `Miembro desde ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const getPasswordStrength = (password: string): number => {
  if (!password) return 0;
  if (password.length < 8) return 1;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (hasUpper && hasLower && hasNum && hasSpecial) return 3;
  return 2;
};

const getThumbnail = (slug: string, thumbnailUrl: string | null) => {
  if (localThumbnails[slug]) return localThumbnails[slug];
  if (thumbnailUrl) {
    return thumbnailUrl.startsWith('http') ? thumbnailUrl : `${MEDIA_URL}${thumbnailUrl}`;
  }
  return null;
};

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('learning');

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [organization, setOrganization] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Courses data
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [evalStatuses, setEvalStatuses] = useState<Record<string, { has_evaluation_form: boolean; has_submitted: boolean }>>({});

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, enrollRes, favRes] = await Promise.all([
        authApi.getProfile(),
        coursesApi.getMyEnrollments(),
        coursesApi.getMyFavorites(),
      ]);

      if (profileRes.ok) {
        const u = profileRes.data;
        setUser(u);
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setBio(u.bio || '');
        setOrganization(u.organization || '');
      }
      if (enrollRes.ok) {
        setEnrollments(enrollRes.data);
        // Fetch evaluation statuses for completed courses
        const completed = (enrollRes.data as Enrollment[]).filter(
          (e) => e.completed_at || e.progress === 100
        );
        if (completed.length > 0) {
          const results = await Promise.all(
            completed.map(async (e) => {
              const res = await coursesApi.getEvaluationStatus(e.course.slug);
              return { slug: e.course.slug, data: res.ok ? res.data : null };
            })
          );
          const statuses: Record<string, { has_evaluation_form: boolean; has_submitted: boolean }> = {};
          for (const r of results) {
            if (r.data) statuses[r.slug] = r.data;
          }
          setEvalStatuses(statuses);
        }
      }
      if (favRes.ok) setFavorites(favRes.data);
    } catch {
      // Failed to load
    }
    setLoading(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('Nombre y apellido son obligatorios.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const res = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim(),
        organization: organization.trim(),
      });

      if (res.ok) {
        setUser(res.data);
        setProfileMessage('Perfil actualizado exitosamente.');
      } else {
        const errors = res.data;
        const msg = typeof errors === 'object'
          ? Object.values(errors).flat().join(' ')
          : 'Error al guardar.';
        setProfileError(msg);
      }
    } catch {
      setProfileError('Error de conexión.');
    }
    setProfileSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);

      if (res.ok) {
        setPasswordMessage('Contraseña actualizada exitosamente.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errors = res.data;
        if (errors.current_password) {
          setPasswordError(errors.current_password);
        } else if (errors.new_password) {
          const msg = Array.isArray(errors.new_password)
            ? errors.new_password.join(' ')
            : errors.new_password;
          setPasswordError(msg);
        } else {
          const msg = typeof errors === 'object'
            ? Object.values(errors).flat().join(' ')
            : 'Error al cambiar contraseña.';
          setPasswordError(msg);
        }
      }
    } catch {
      setPasswordError('Error de conexión.');
    }
    setPasswordSaving(false);
  };

  const handleRemoveFavorite = async (slug: string) => {
    try {
      const res = await coursesApi.toggleFavorite(slug);
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.course.slug !== slug));
      }
    } catch {
      // Failed
    }
  };

  const inProgress = enrollments.filter((e) => !e.completed_at && e.progress < 100);
  const completed = enrollments.filter((e) => e.completed_at || e.progress === 100);
  const passwordStrength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-hero-skeleton">
            <div className="skeleton profile-avatar-skeleton" />
            <div className="profile-hero-skeleton-text">
              <div className="skeleton" style={{ width: 220, height: 32 }} />
              <div className="skeleton" style={{ width: 160, height: 16, marginTop: 8 }} />
            </div>
          </div>
          <div className="profile-stats-skeleton">
            <div className="skeleton" style={{ height: 72, flex: 1 }} />
            <div className="skeleton" style={{ height: 72, flex: 1 }} />
            <div className="skeleton" style={{ height: 72, flex: 1 }} />
          </div>
          <div className="skeleton" style={{ height: 48, marginBottom: 32 }} />
          <div className="profile-cards-skeleton">
            <div className="skeleton" style={{ height: 120 }} />
            <div className="skeleton" style={{ height: 120 }} />
            <div className="skeleton" style={{ height: 120 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Hero */}
        <div className="profile-hero">
          <div
            className="profile-avatar"
            style={{ background: user ? getAvatarGradient(user.id) : GRADIENTS[0] }}
          >
            <span className="profile-avatar-initials">
              {getInitials(user?.first_name || '', user?.last_name || '')}
            </span>
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">
              {user?.first_name} {user?.last_name}
            </h1>
            {user?.organization && (
              <p className="profile-hero-org">{user.organization}</p>
            )}
            <p className="profile-hero-email">{user?.email}</p>
            {user?.created_at && (
              <p className="profile-hero-since">{formatMemberSince(user.created_at)}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat-card">
            <span className="profile-stat-number">{enrollments.length}</span>
            <span className="profile-stat-label">Cursos inscritos</span>
          </div>
          <div className="profile-stat-card">
            <span className="profile-stat-number">{completed.length}</span>
            <span className="profile-stat-label">Completados</span>
          </div>
          <div className="profile-stat-card">
            <span className="profile-stat-number">{completed.length}</span>
            <span className="profile-stat-label">Certificados</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab${activeTab === 'learning' ? ' active' : ''}`}
            onClick={() => setActiveTab('learning')}
          >
            Mi Aprendizaje
          </button>
          <button
            className={`profile-tab${activeTab === 'list' ? ' active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Mi Lista
          </button>
          <button
            className={`profile-tab${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuración
          </button>
        </div>

        {/* Tab content */}
        <div className="profile-tab-content">
          {/* Mi Aprendizaje */}
          {activeTab === 'learning' && (
            <div className="profile-learning">
              {/* In Progress */}
              <section className="profile-section">
                <h2 className="profile-section-title">En progreso</h2>
                {inProgress.length > 0 ? (
                  <div className="profile-course-cards">
                    {inProgress.map((enrollment) => {
                      const thumb = getThumbnail(enrollment.course.slug, enrollment.course.thumbnail_url);
                      return (
                        <Link
                          to={`/courses/${enrollment.course.slug}`}
                          key={enrollment.course.id}
                          className="profile-course-card"
                        >
                          <div className="profile-course-thumb">
                            {thumb ? (
                              <img src={thumb} alt={enrollment.course.title} />
                            ) : (
                              <div className="profile-course-thumb-placeholder">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="profile-course-card-body">
                            <span className="profile-course-card-title">{enrollment.course.title}</span>
                            <div className="profile-course-card-progress">
                              <div className="profile-course-card-bar">
                                <div
                                  className="profile-course-card-fill"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                              <span className="profile-course-card-pct">{enrollment.progress}%</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="profile-empty">
                    <svg className="profile-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    <p className="profile-empty-text">Aún no estás inscrito en ningún curso</p>
                    <Link to="/" className="profile-empty-cta">Explorar cursos</Link>
                  </div>
                )}
              </section>

              {/* Completed */}
              <section className="profile-section">
                <h2 className="profile-section-title">Completados</h2>
                {completed.length > 0 ? (
                  <div className="profile-course-cards">
                    {completed.map((enrollment) => {
                      const thumb = getThumbnail(enrollment.course.slug, enrollment.course.thumbnail_url);
                      return (
                        <div key={enrollment.course.id} className="profile-course-card profile-course-card--completed">
                          <div className="profile-course-thumb">
                            {thumb ? (
                              <img src={thumb} alt={enrollment.course.title} />
                            ) : (
                              <div className="profile-course-thumb-placeholder">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                              </div>
                            )}
                            <span className="profile-course-badge-done">Completado</span>
                          </div>
                          <div className="profile-course-card-body">
                            <Link to={`/courses/${enrollment.course.slug}`} className="profile-course-card-title">
                              {enrollment.course.title}
                            </Link>
                            <div className="profile-course-actions">
                              <button
                                className="profile-certificate-btn"
                                onClick={() => coursesApi.downloadCertificate(enrollment.course.slug)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Certificado
                              </button>
                              {evalStatuses[enrollment.course.slug]?.has_evaluation_form && !evalStatuses[enrollment.course.slug]?.has_submitted && (
                                <Link to={`/courses/${enrollment.course.slug}/evaluate`} className="profile-evaluate-btn">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                  Evaluar
                                </Link>
                              )}
                              {evalStatuses[enrollment.course.slug]?.has_evaluation_form && evalStatuses[enrollment.course.slug]?.has_submitted && (
                                <span className="profile-evaluated-badge">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                  Evaluado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="profile-empty">
                    <svg className="profile-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                    <p className="profile-empty-text">Completa tu primer curso para obtener un certificado</p>
                    <Link to="/" className="profile-empty-cta">Explorar cursos</Link>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* Mi Lista */}
          {activeTab === 'list' && (
            <div className="profile-list">
              {favorites.length > 0 ? (
                <div className="profile-course-cards">
                  {favorites.map((fav) => {
                    const thumb = getThumbnail(fav.course.slug, fav.course.thumbnail_url);
                    return (
                      <div key={fav.course.id} className="profile-course-card">
                        <div className="profile-course-thumb">
                          {thumb ? (
                            <img src={thumb} alt={fav.course.title} />
                          ) : (
                            <div className="profile-course-thumb-placeholder">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="profile-course-card-body">
                          <Link to={`/courses/${fav.course.slug}`} className="profile-course-card-title">
                            {fav.course.title}
                          </Link>
                          <button
                            className="profile-remove-btn"
                            onClick={() => handleRemoveFavorite(fav.course.slug)}
                            title="Quitar de Mi Lista"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="profile-empty">
                  <svg className="profile-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <p className="profile-empty-text">Tu lista está vacía. Guarda cursos para verlos después.</p>
                  <Link to="/" className="profile-empty-cta">Explorar cursos</Link>
                </div>
              )}
            </div>
          )}

          {/* Configuración */}
          {activeTab === 'settings' && (
            <div className="profile-settings">
              <div className="profile-settings-grid">
                {/* Edit Profile */}
                <section className="profile-card">
                  <h2 className="profile-card-title">Información personal</h2>
                  <form onSubmit={handleProfileSave}>
                    <div className="profile-field">
                      <label htmlFor="firstName">Nombre</label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="lastName">Apellido</label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="organization">Organización</label>
                      <input
                        id="organization"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="bio">Bio</label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                      />
                    </div>
                    {profileError && <div className="profile-error">{profileError}</div>}
                    {profileMessage && <div className="profile-success">{profileMessage}</div>}
                    <button type="submit" className="profile-btn" disabled={profileSaving}>
                      {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </form>
                </section>

                {/* Change Password */}
                <section className="profile-card">
                  <h2 className="profile-card-title">Cambiar contraseña</h2>
                  <form onSubmit={handlePasswordChange}>
                    <div className="profile-field">
                      <label htmlFor="currentPassword">Contraseña actual</label>
                      <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="newPassword">Nueva contraseña</label>
                      <input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      {newPassword && (
                        <div className="profile-strength">
                          <div className="profile-strength-bar">
                            <div
                              className={`profile-strength-fill profile-strength-${passwordStrength}`}
                              style={{ width: `${(passwordStrength / 3) * 100}%` }}
                            />
                          </div>
                          <span className={`profile-strength-label profile-strength-${passwordStrength}`}>
                            {passwordStrength === 1 && 'Débil'}
                            {passwordStrength === 2 && 'Media'}
                            {passwordStrength === 3 && 'Fuerte'}
                          </span>
                        </div>
                      )}
                      <span className="profile-field-hint">Mínimo 8 caracteres</span>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    {passwordError && <div className="profile-error">{passwordError}</div>}
                    {passwordMessage && <div className="profile-success">{passwordMessage}</div>}
                    <button type="submit" className="profile-btn" disabled={passwordSaving}>
                      {passwordSaving ? 'Actualizando...' : 'Cambiar contraseña'}
                    </button>
                  </form>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
