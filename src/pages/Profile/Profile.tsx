import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi, isAuthenticated, coursesApi, MEDIA_URL } from '../../services/api';
import {
  GOAL_HOURS_OPTIONS, GOAL_COURSES_OPTIONS, visibleGoalCategories,
  currentCycle, formatCycleEnd, goalCoursesMin, goalHoursLabel, goalCoursesLabel, joinNames,
} from '../../utils/goalOptions';
import PageHead from '../../utils/PageHead';
import './Profile.css';
import cameraBadge from '../../assets/profile/camera-badge.svg';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  bio: string;
  organization: string;
  organization_type: string;
  country: string;
  job_title: string;
  phone: string;
  created_at: string;
  avatar: string | null;
  goal_hours_per_week?: string;
  goal_courses_per_month?: string;
  goal_categories?: string[];
  goal_set_at?: string | null;
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

type ProfileTab = 'learning' | 'list' | 'settings' | 'goal';

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
  'atrae-mas-vistas-con-seo': '/thumbnails/alcanzamasvistasconseo.png',
  'lean-data-para-impacto-social': '/thumbnails/Imagen-destacada-10-1.webp',
  'construye-indicadores-para-medir-impacto': '/thumbnails/Imagen-destacada-14.webp',
  'convierte-tus-ideas-en-un-pitch-ganador': '/thumbnails/conviertetusideasenunpitchganador.png',
  'potencia-tu-teoria-de-cambio': '/thumbnails/Imagen-destacada-11.webp',
  'aplica-a-tu-siguiente-grant-con-ia': '/thumbnails/aplicaatusiguientegrantconia.png',
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

// Country dial codes for the Celular field (S6-03). Same country set as the
// País select; flag emoji + dial prefix shown in the dropdown.
const PHONE_COUNTRIES: { code: string; flag: string; dial: string }[] = [
  { code: 'AR', flag: '🇦🇷', dial: '+54' },
  { code: 'BO', flag: '🇧🇴', dial: '+591' },
  { code: 'BR', flag: '🇧🇷', dial: '+55' },
  { code: 'CL', flag: '🇨🇱', dial: '+56' },
  { code: 'CO', flag: '🇨🇴', dial: '+57' },
  { code: 'CR', flag: '🇨🇷', dial: '+506' },
  { code: 'CU', flag: '🇨🇺', dial: '+53' },
  { code: 'DO', flag: '🇩🇴', dial: '+1' },
  { code: 'EC', flag: '🇪🇨', dial: '+593' },
  { code: 'SV', flag: '🇸🇻', dial: '+503' },
  { code: 'GT', flag: '🇬🇹', dial: '+502' },
  { code: 'HN', flag: '🇭🇳', dial: '+504' },
  { code: 'MX', flag: '🇲🇽', dial: '+52' },
  { code: 'NI', flag: '🇳🇮', dial: '+505' },
  { code: 'PA', flag: '🇵🇦', dial: '+507' },
  { code: 'PY', flag: '🇵🇾', dial: '+595' },
  { code: 'PE', flag: '🇵🇪', dial: '+51' },
  { code: 'PR', flag: '🇵🇷', dial: '+1' },
  { code: 'ES', flag: '🇪🇸', dial: '+34' },
  { code: 'US', flag: '🇺🇸', dial: '+1' },
  { code: 'UY', flag: '🇺🇾', dial: '+598' },
  { code: 'VE', flag: '🇻🇪', dial: '+58' },
];

const dialOf = (code: string) => PHONE_COUNTRIES.find((c) => c.code === code)?.dial || '';

// Split a stored "+51 986 913 451" into { country, number }. Matches the
// longest dial code first so +591 wins over +5. Unknown prefix → whole string
// kept as the number.
const parsePhone = (raw?: string): { country: string; number: string } => {
  const val = (raw || '').trim();
  const match = [...PHONE_COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => val.startsWith(c.dial));
  if (match) return { country: match.code, number: val.slice(match.dial.length).trim() };
  return { country: '', number: val };
};

const getThumbnail = (slug: string, thumbnailUrl: string | null) => {
  if (localThumbnails[slug]) return localThumbnails[slug];
  if (thumbnailUrl) {
    return thumbnailUrl.startsWith('http') ? thumbnailUrl : `${MEDIA_URL}${thumbnailUrl}`;
  }
  return null;
};

const Profile = () => {
  console.log('[Profile]');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('learning');
  const tabContentRef = useRef<HTMLDivElement>(null);
  const goalFormRef = useRef<HTMLHeadingElement>(null);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState('');
  const [country, setCountry] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('PE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Learning goal (Meta de aprendizaje)
  const [goalHours, setGoalHours] = useState('');
  const [goalCourses, setGoalCourses] = useState('');
  const [goalCats, setGoalCats] = useState<string[]>([]);
  const [goalCategories, setGoalCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalMessage, setGoalMessage] = useState('');
  const [goalError, setGoalError] = useState('');

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
  const [downloadingCertSlug, setDownloadingCertSlug] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

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
      const [profileRes, enrollRes, favRes, categoriesRes, coursesRes] = await Promise.all([
        authApi.getProfile(),
        coursesApi.getMyEnrollments(),
        coursesApi.getMyFavorites(),
        coursesApi.getCategories().catch(() => ({ ok: false, data: null })),
        coursesApi.list().catch(() => ({ ok: false, data: null })),
      ]);

      if (profileRes.ok) {
        const u = profileRes.data;
        setUser(u);
        setFirstName(u.first_name || '');
        setLastName(u.last_name || '');
        setOrganization(u.organization || '');
        setOrganizationType(u.organization_type || '');
        setCountry(u.country || '');
        setJobTitle(u.job_title || '');
        const parsed = parsePhone(u.phone);
        const fallback = PHONE_COUNTRIES.some((c) => c.code === u.country) ? u.country : 'PE';
        setPhoneCountry(parsed.country || fallback);
        setPhoneNumber(parsed.number);
        setGoalHours(u.goal_hours_per_week || '');
        setGoalCourses(u.goal_courses_per_month || '');
        setGoalCats(Array.isArray(u.goal_categories) ? u.goal_categories : []);
      }
      if (categoriesRes.ok && Array.isArray(categoriesRes.data)) {
        // Only offer categories that actually have visible courses.
        const catalog = coursesRes.ok && Array.isArray(coursesRes.data) ? coursesRes.data : [];
        setGoalCategories(catalog.length > 0
          ? visibleGoalCategories(categoriesRes.data, catalog)
          : categoriesRes.data);
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
    if (!firstName.trim() || !lastName.trim() || !jobTitle.trim() || !organization.trim() || !organizationType || !country) {
      setProfileError('Completa los campos obligatorios.');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    setProfileMessage('');

    try {
      const res = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        organization: organization.trim(),
        organization_type: organizationType,
        country: country,
        job_title: jobTitle.trim(),
        phone: phoneNumber.trim() ? `${dialOf(phoneCountry)} ${phoneNumber.trim()}`.trim() : '',
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

  const handleGoalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalHours || !goalCourses || goalCats.length === 0) {
      setGoalError('Elige categorías, cursos por mes y horas por semana.');
      return;
    }

    setGoalSaving(true);
    setGoalError('');
    setGoalMessage('');

    try {
      const res = await authApi.updateProfile({
        goal_hours_per_week: goalHours,
        goal_courses_per_month: goalCourses,
        goal_categories: goalCats,
      });

      if (res.ok) {
        setUser(res.data);
        setGoalMessage('Meta actualizada exitosamente.');
      } else {
        const errors = res.data;
        const msg = typeof errors === 'object'
          ? Object.values(errors).flat().join(' ')
          : 'Error al guardar.';
        setGoalError(msg);
      }
    } catch {
      setGoalError('Error de conexión.');
    }
    setGoalSaving(false);
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

  const completed = enrollments.filter((e) => e.completed_at || e.progress === 100);
  const certificatesCount = completed.filter((e) =>
    !evalStatuses[e.course.slug]?.has_evaluation_form ||
    evalStatuses[e.course.slug]?.has_submitted
  ).length;

  // Learning-goal summary band (Figma S6-01) shown atop the Meta tab once a
  // goal exists: deadline + real progress vs. the monthly course target, the
  // goal summary, and an "Edita tu meta" CTA that jumps to the edit form.
  const goalCycle = user?.goal_set_at ? currentCycle(user.goal_set_at) : null;
  const goalTarget = goalCoursesMin(user?.goal_courses_per_month);
  const goalCompletedInCycle = goalCycle
    ? enrollments.filter((e) => {
        if (!e.completed_at) return false;
        const t = new Date(e.completed_at).getTime();
        return t >= goalCycle.start.getTime() && t < goalCycle.end.getTime();
      }).length
    : 0;
  const goalPct = goalCycle ? Math.min(100, Math.round((goalCompletedInCycle / goalTarget) * 100)) : 0;
  const goalCategoryNames = (user?.goal_categories || [])
    .map((slug) => goalCategories.find((c) => c.slug === slug)?.name)
    .filter((n): n is string => !!n);

  const switchTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    setTimeout(() => tabContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
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
      <PageHead title="Mi perfil" noIndex />
      {/* Hero band */}
      <div className="profile-hero-band">
        <div className="profile-container profile-hero">
          <div
            className="profile-avatar"
            style={{ background: user ? getAvatarGradient(user.id) : GRADIENTS[0] }}
          >
            {user?.avatar ? (
              <img className="profile-avatar-img" src={user.avatar} alt="" />
            ) : (
              <span className="profile-avatar-initials">
                {getInitials(user?.first_name || '', user?.last_name || '')}
              </span>
            )}
            <Link to="/profile/foto" className="profile-avatar-camera" aria-label="Cambiar foto de perfil">
              <img src={cameraBadge} alt="" />
            </Link>
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">
              {user?.display_name || `${user?.first_name} ${user?.last_name}`}
            </h1>
            <p className="profile-hero-email">{user?.email}</p>
            {user?.created_at && (
              <p className="profile-hero-since">{formatMemberSince(user.created_at)}</p>
            )}
          </div>
          <button className="profile-hero-edit" onClick={() => switchTab('settings')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar tu perfil
          </button>
        </div>
      </div>

      <div className="profile-container">
        {/* Stats */}
        <div className="profile-stats">
          <button className="profile-stat-card" onClick={() => switchTab('learning')}>
            <span className="profile-stat-number">{enrollments.length}</span>
            <span className="profile-stat-label">Cursos inscritos</span>
          </button>
          <button className="profile-stat-card" onClick={() => switchTab('learning')}>
            <span className="profile-stat-number">{completed.length}</span>
            <span className="profile-stat-label">Completados</span>
          </button>
          <button className="profile-stat-card" onClick={() => switchTab('learning')}>
            <span className="profile-stat-number">{certificatesCount}</span>
            <span className="profile-stat-label">Certificados</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab${activeTab === 'learning' ? ' active' : ''}`}
            onClick={() => setActiveTab('learning')}
          >
            Mi aprendizaje
          </button>
          <button
            className={`profile-tab${activeTab === 'list' ? ' active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Favoritos
          </button>
          <button
            className={`profile-tab${activeTab === 'settings' ? ' active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuración
          </button>
          <button
            className={`profile-tab${activeTab === 'goal' ? ' active' : ''}`}
            onClick={() => setActiveTab('goal')}
          >
            Meta
          </button>
        </div>

        {/* Tab content */}
        <div className="profile-tab-content" ref={tabContentRef}>
          {/* Mi Aprendizaje */}
          {activeTab === 'learning' && (
            <div className="profile-learning">
              {certError && (
                <p style={{ color: '#e53e3e', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{certError}</p>
              )}
              {enrollments.length > 0 ? (
                <div className="profile-learn-rows">
                  {enrollments.map((enrollment) => {
                    const thumb = getThumbnail(enrollment.course.slug, enrollment.course.thumbnail_url);
                    const done = !!enrollment.completed_at || enrollment.progress === 100;
                    const status = evalStatuses[enrollment.course.slug];
                    const evalPending = done && status?.has_evaluation_form && !status?.has_submitted;
                    const canDownload = done && !evalPending;
                    return (
                      <div key={enrollment.course.id} className="profile-learn-row">
                        <Link to={`/courses/${enrollment.course.slug}`} className="profile-learn-thumb">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={enrollment.course.title}
                              // Staging serves no course media — fall back to the placeholder bg
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <span className="profile-course-thumb-placeholder">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                              </svg>
                            </span>
                          )}
                        </Link>
                        <div className="profile-learn-info">
                          <Link to={`/courses/${enrollment.course.slug}`} className="profile-learn-title">
                            {enrollment.course.title}
                          </Link>
                          <div className="profile-learn-progress">
                            <div className="profile-learn-bar">
                              <div className="profile-learn-fill" style={{ width: `${enrollment.progress}%` }} />
                            </div>
                            <span className="profile-learn-pct">{enrollment.progress}%</span>
                            <button
                              className="profile-learn-cert"
                              disabled={!canDownload || downloadingCertSlug === enrollment.course.slug}
                              onClick={async () => {
                                setDownloadingCertSlug(enrollment.course.slug);
                                setCertError(null);
                                try {
                                  const result = await coursesApi.downloadCertificate(enrollment.course.slug);
                                  if (result && !result.ok) {
                                    setCertError(result.detail || 'No se pudo descargar el certificado.');
                                  }
                                } finally {
                                  setDownloadingCertSlug(null);
                                }
                              }}
                            >
                              {downloadingCertSlug === enrollment.course.slug ? 'Descargando...' : 'Certificado'}
                            </button>
                          </div>
                        </div>
                      </div>
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
                  <Link to="/cursos" className="profile-empty-cta">Explorar cursos</Link>
                </div>
              )}
            </div>
          )}

          {/* Favoritos */}
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
                            title="Quitar de Favoritos"
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
                  <p className="profile-empty-text">No tienes cursos favoritos aún.</p>
                  <Link to="/cursos" className="profile-empty-cta">Explorar cursos</Link>
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
                      <label htmlFor="firstName">*Nombre</label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="lastName">*Apellido</label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="jobTitle">*Cargo</label>
                      <input
                        id="jobTitle"
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Ej: Fundador"
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="organization">*Organización</label>
                      <input
                        id="organization"
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label htmlFor="organizationType">*Tipo de organización</label>
                      <select
                        id="organizationType"
                        value={organizationType}
                        onChange={(e) => setOrganizationType(e.target.value)}
                        required
                      >
                        <option value="">Selecciona un tipo</option>
                        <option value="ong">ONG / Organización sin fines de lucro</option>
                        <option value="fundacion">Fundación</option>
                        <option value="asociacion">Asociación civil</option>
                        <option value="empresa_social">Empresa social</option>
                        <option value="cooperativa">Cooperativa</option>
                        <option value="educativa">Institución educativa</option>
                        <option value="gobierno">Organismo gubernamental</option>
                        <option value="internacional">Organismo internacional</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="country">*País</label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                      >
                        <option value="">Selecciona un país</option>
                        <option value="AR">Argentina</option>
                        <option value="BO">Bolivia</option>
                        <option value="BR">Brasil</option>
                        <option value="CL">Chile</option>
                        <option value="CO">Colombia</option>
                        <option value="CR">Costa Rica</option>
                        <option value="CU">Cuba</option>
                        <option value="DO">República Dominicana</option>
                        <option value="EC">Ecuador</option>
                        <option value="SV">El Salvador</option>
                        <option value="GT">Guatemala</option>
                        <option value="HN">Honduras</option>
                        <option value="MX">México</option>
                        <option value="NI">Nicaragua</option>
                        <option value="PA">Panamá</option>
                        <option value="PY">Paraguay</option>
                        <option value="PE">Perú</option>
                        <option value="PR">Puerto Rico</option>
                        <option value="ES">España</option>
                        <option value="US">Estados Unidos</option>
                        <option value="UY">Uruguay</option>
                        <option value="VE">Venezuela</option>
                        <option value="OTHER">Otro</option>
                      </select>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="phone">Celular</label>
                      <div className="profile-phone">
                        <select
                          className="profile-phone-code"
                          value={phoneCountry}
                          onChange={(e) => setPhoneCountry(e.target.value)}
                          aria-label="Código de país"
                        >
                          {PHONE_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                          ))}
                        </select>
                        <input
                          id="phone"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="986 913 451"
                        />
                      </div>
                    </div>
                    {profileError && <div className="profile-error">{profileError}</div>}
                    {profileMessage && <div className="profile-success">{profileMessage}</div>}
                    <button type="submit" className="profile-btn" disabled={profileSaving}>
                      {profileSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <p className="profile-required-note">*Estos campos son obligatorios.</p>
                  </form>
                </section>

                {/* Change Password */}
                <section className="profile-card">
                  <h2 className="profile-card-title">Cambiar contraseña</h2>
                  <form onSubmit={handlePasswordChange}>
                    <div className="profile-field">
                      <label htmlFor="currentPassword">*Contraseña actual</label>
                      <input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <Link to="/reset-password" className="profile-forgot-link">¿Olvidaste tu contraseña?</Link>
                    </div>
                    <div className="profile-field">
                      <label htmlFor="newPassword">*Nueva contraseña</label>
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
                      <label htmlFor="confirmPassword">*Confirmar nueva contraseña</label>
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
                    <p className="profile-required-note">*Estos campos son obligatorios.</p>
                  </form>
                </section>
              </div>
            </div>
          )}

          {/* Meta */}
          {activeTab === 'goal' && (
            <div className="profile-goal">
              {goalCycle && (
                <div className="goal-band">
                  <div className="goal-band__progress">
                    <h2 className="goal-band__title">Tu meta hasta el {formatCycleEnd(goalCycle.end)}</h2>
                    <div className="goal-band__bar-row">
                      <div
                        className="goal-band__track"
                        role="progressbar"
                        aria-valuenow={goalPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="goal-band__fill" style={{ width: `${goalPct}%` }} />
                      </div>
                      <span className="goal-band__pct">{goalPct}%</span>
                    </div>
                  </div>
                  <div className="goal-band__summary">
                    <p><span className="goal-band__label">Tiempo:</span> {goalHoursLabel(user?.goal_hours_per_week)} por semana</p>
                    <p><span className="goal-band__label">Cantidad:</span> {goalCoursesLabel(user?.goal_courses_per_month)} por mes</p>
                    {goalCategoryNames.length > 0 && (
                      <p><span className="goal-band__label">Intereses:</span> {joinNames(goalCategoryNames)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="goal-band__edit"
                    onClick={() => goalFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Edita tu meta
                  </button>
                </div>
              )}
              <h2 className="profile-goal-title" ref={goalFormRef}>Edita tu meta</h2>
              <form onSubmit={handleGoalSave}>
                <div className="profile-goal-question">
                  <p className="profile-goal-q">1. ¿Cuántas horas a la semana quieres dedicarle a aprender?</p>
                  <div className="profile-goal-chips">
                    {GOAL_HOURS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`profile-goal-chip${goalHours === opt.value ? ' profile-goal-chip--selected' : ''}`}
                        onClick={() => setGoalHours(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="profile-goal-question">
                  <p className="profile-goal-q">2. ¿Cuántos cursos quieres llevar por mes?</p>
                  <p className="profile-goal-hint">Cada curso dura entre 30 min a 50 min.</p>
                  <div className="profile-goal-chips">
                    {GOAL_COURSES_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`profile-goal-chip${goalCourses === opt.value ? ' profile-goal-chip--selected' : ''}`}
                        onClick={() => setGoalCourses(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="profile-goal-question">
                  <p className="profile-goal-q">3. ¿Qué temas te gustaría aprender más?</p>
                  <p className="profile-goal-hint">Elige al menos un tema:</p>
                  <div className="profile-goal-chips">
                    {goalCategories.map((cat) => (
                      <button
                        key={cat.slug}
                        type="button"
                        className={`profile-goal-chip${goalCats.includes(cat.slug) ? ' profile-goal-chip--selected' : ''}`}
                        onClick={() => setGoalCats((prev) =>
                          prev.includes(cat.slug) ? prev.filter((s) => s !== cat.slug) : [...prev, cat.slug]
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                {goalError && <div className="profile-error">{goalError}</div>}
                {goalMessage && <div className="profile-success">{goalMessage}</div>}
                <button type="submit" className="profile-btn profile-goal-btn" disabled={goalSaving}>
                  {goalSaving ? 'Guardando...' : 'Actualizar'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
