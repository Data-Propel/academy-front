import { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdmin } from './AdminContext';
import { isSuperuser, isMarketingAdmin, adminApi } from '../../services/api';
import { startRecorder, stopRecorder, recordNav, getRecordedSteps } from '../../utils/actionRecorder';
import './AdminLayout.css';

const SIDEBAR_STORAGE_KEY = 'admin_sidebar_open';
const MOBILE_BREAKPOINT = 768;

const getInitialSidebarOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return window.innerWidth > MOBILE_BREAKPOINT;
};

interface NavItem {
  label: string;
  path: string;
  end?: boolean;
  icon: React.ReactNode;
}

interface NavSection {
  group: string | null;
  items: NavItem[];
}

const navItems: NavSection[] = [
  {
    group: null,
    items: [
      {
        label: 'Dashboard',
        path: '/admin',
        end: true,
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Contenido',
    items: [
      {
        label: 'Cursos',
        path: '/admin/cursos',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
        ),
      },
      {
        label: 'Categorías',
        path: '/admin/categorias',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
        ),
      },
      {
        label: 'Tags',
        path: '/admin/tags',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        ),
      },
      {
        label: 'Tracks',
        path: '/admin/tracks',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h4l3-9 4 18 3-9h4" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Marketing',
    items: [
      {
        label: 'Campañas',
        path: '/admin/campaigns',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11l18-8-3 18-6-7-9-3z" />
          </svg>
        ),
      },
      {
        label: 'Analítica',
        path: '/admin/analytics',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-5" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Workshops',
    items: [
      {
        label: 'Inscripciones',
        path: '/admin/workshops',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 11l-3 3-2-2" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Personas',
    items: [
      {
        label: 'Usuarios Admin',
        path: '/admin/usuarios',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
      {
        label: 'Usuarios Legacy',
        path: '/admin/usuarios-legacy',
        icon: (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
    ],
  },
];

export default function AdminLayout() {
  const { error, success, showSuccess, showError } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(getInitialSidebarOpen);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const location = useLocation();
  const fullAdmin = isSuperuser();
  const marketing = !fullAdmin && isMarketingAdmin();
  const allowedPaths = marketing
    ? new Set(['/admin/campaigns', '/admin/analytics'])
    : new Set(['/admin/usuarios']);
  const visibleNavItems: NavSection[] = fullAdmin
    ? navItems
    : navItems
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => allowedPaths.has(item.path)),
        }))
        .filter((section) => section.items.length > 0);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  // Record the team's steps inside the admin panel so problem reports
  // can include what they did before the issue.
  useEffect(() => {
    startRecorder();
    return stopRecorder;
  }, []);

  useEffect(() => {
    recordNav(location.pathname);
  }, [location.pathname]);

  const submitReport = async () => {
    const description = reportText.trim();
    if (!description) return;
    setReportSending(true);
    try {
      const { ok } = await adminApi.sendDebugReport(description, getRecordedSteps());
      if (ok) {
        setReportOpen(false);
        setReportText('');
        showSuccess('Reporte enviado. ¡Gracias!');
      } else {
        showError('Error al enviar el reporte.');
      }
    } catch {
      showError('Error de conexión.');
    } finally {
      setReportSending(false);
    }
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // On mobile we want nav clicks (and overlay clicks) to close the sidebar.
  // On desktop, the sidebar stays where the user put it.
  const closeOnMobile = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT) {
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <button
        className="admin-sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {sidebarOpen ? '×' : '☰'}
      </button>

      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={closeOnMobile} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Admin</h2>
          <p>Academy Propel</p>
        </div>

        <nav className="admin-nav">
          {visibleNavItems.map((section, sectionIdx) => (
            <div className="admin-nav-group" key={sectionIdx}>
              {section.group && (
                <div className="admin-nav-group-label">{section.group}</div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? ' active' : ''}`
                  }
                  onClick={closeOnMobile}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-link admin-report-btn" onClick={() => setReportOpen(true)}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Reportar problema
          </button>
          <NavLink to="/" className="admin-nav-link" onClick={closeOnMobile}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver al sitio
          </NavLink>
        </div>
      </aside>

      <main className="admin-main">
        {error && <div className="admin-error">{error}</div>}
        {success && <div className="admin-success">{success}</div>}
        <Outlet />
      </main>

      {reportOpen && (
        <div className="report-overlay" onClick={() => setReportOpen(false)}>
          <div className="report-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="report-title">Reportar un problema</h3>
            <p className="report-message">
              Describe qué intentabas hacer y qué salió mal. Se adjuntarán
              automáticamente tus últimos pasos en el panel (clicks, navegación
              y llamadas al servidor) para ayudar a diagnosticarlo.
            </p>
            <textarea
              className="report-textarea"
              rows={5}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Ej: Entré al curso X, hice clic en Agregar recurso y no pasó nada..."
              autoFocus
            />
            <div className="report-actions">
              <button className="report-btn cancel" onClick={() => setReportOpen(false)}>
                Cancelar
              </button>
              <button
                className="report-btn send"
                onClick={submitReport}
                disabled={reportSending || !reportText.trim()}
              >
                {reportSending ? 'Enviando...' : 'Enviar reporte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
