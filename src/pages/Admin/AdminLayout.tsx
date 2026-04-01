import { useState, useCallback } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdmin } from './AdminContext';
import './AdminLayout.css';

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
    ],
  },
  {
    group: 'Personas',
    items: [
      {
        label: 'Usuarios',
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
    ],
  },
];

export default function AdminLayout() {
  const { error, success } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="admin-layout">
      <button className="admin-sidebar-toggle" onClick={toggleSidebar} aria-label="Abrir menú">
        ☰
      </button>

      {sidebarOpen && <div className="admin-sidebar-overlay" onClick={closeSidebar} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>Admin</h2>
          <p>Academy Propel</p>
        </div>

        <nav className="admin-nav">
          {navItems.map((section, sectionIdx) => (
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
                  onClick={closeSidebar}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="admin-nav-link" onClick={closeSidebar}>
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
    </div>
  );
}
