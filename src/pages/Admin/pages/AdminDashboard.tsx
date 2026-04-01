import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';

const fontHeading = "'Libre Franklin', 'Libre Franklin Fallback', 'Poppins', 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const fontBody = "'Poppins', 'Poppins Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export default function AdminDashboard() {
  const { courses, lessons, categories } = useAdmin();
  const navigate = useNavigate();

  const stats = [
    { label: 'Total Cursos', value: courses.length, icon: 'book' },
    { label: 'Total Lecciones', value: lessons.length, icon: 'file' },
    { label: 'Total Categorías', value: categories.length, icon: 'folder' },
  ];

  const quickActions = [
    { label: 'Crear Curso', path: '/admin/cursos', state: { openCreate: true } },
    { label: 'Crear Categoría', path: '/admin/categorias', state: { openCreate: true } },
    { label: 'Crear Usuario', path: '/admin/usuarios', state: { openCreate: true } },
  ];

  const recentCourses = [...courses].slice(-5).reverse();

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'book':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        );
      case 'file':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'folder':
        return (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        @media (max-width: 900px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 560px) {
          .dashboard-stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .dashboard-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(101, 101, 101, 0.3);
          border-radius: 12px;
          padding: 24px;
          transition: transform 0.2s ease, border-color 0.2s ease;
          cursor: default;
        }
        .dashboard-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(78, 205, 196, 0.4);
        }
        .dashboard-stat-icon {
          margin-bottom: 12px;
          opacity: 0.9;
        }
        .dashboard-stat-value {
          font-family: ${fontHeading};
          font-size: 2.5rem;
          font-weight: 700;
          color: #F2F2F2;
          line-height: 1;
          margin-bottom: 6px;
        }
        .dashboard-stat-label {
          font-family: ${fontBody};
          font-size: 0.9rem;
          color: rgba(242, 242, 242, 0.7);
        }
        .dashboard-section-title {
          font-family: ${fontHeading};
          font-size: 1.3rem;
          font-weight: 600;
          color: #F2F2F2;
          margin: 0 0 16px 0;
        }
        .dashboard-quick-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .dashboard-quick-btn {
          background: transparent;
          border: 1px solid rgba(101, 101, 101, 0.5);
          color: #F2F2F2;
          padding: 10px 20px;
          border-radius: 6px;
          font-family: ${fontBody};
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-quick-btn:hover {
          border-color: #FD6A44;
          color: #FD6A44;
          background: rgba(253, 106, 68, 0.08);
        }
        .dashboard-recent-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dashboard-recent-item {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(101, 101, 101, 0.25);
          border-radius: 8px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dashboard-recent-item:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(78, 205, 196, 0.3);
        }
        .dashboard-recent-title {
          font-family: ${fontBody};
          font-size: 0.95rem;
          color: #F2F2F2;
          font-weight: 500;
        }
        .dashboard-recent-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
      `}</style>

      <PageHeader title="Dashboard" subtitle="Vista general de la plataforma" />

      {/* Stats Grid */}
      <div className="dashboard-stats-grid">
        {stats.map((stat) => (
          <div className="dashboard-stat-card" key={stat.label}>
            <div className="dashboard-stat-icon">{renderIcon(stat.icon)}</div>
            <div className="dashboard-stat-value">{stat.value}</div>
            <div className="dashboard-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="dashboard-section-title">Acciones rápidas</h2>
      <div className="dashboard-quick-actions">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="dashboard-quick-btn"
            onClick={() => navigate(action.path, { state: action.state })}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Recent Courses */}
      <h2 className="dashboard-section-title">Cursos recientes</h2>
      {recentCourses.length === 0 ? (
        <p style={{ color: 'rgba(242, 242, 242, 0.6)', fontFamily: fontBody, fontSize: '0.9rem' }}>
          No hay cursos registrados.
        </p>
      ) : (
        <div className="dashboard-recent-list">
          {recentCourses.map((course) => (
            <div
              key={course.id}
              className="dashboard-recent-item"
              onClick={() => navigate(`/admin/cursos/${course.id}`)}
            >
              <span className="dashboard-recent-title">{course.title}</span>
              <div className="dashboard-recent-meta">
                {course.level && (
                  <span className="status-badge">
                    {levelLabels[course.level] || course.level}
                  </span>
                )}
                <span className={`status-badge ${course.is_published ? 'active' : 'inactive'}`}>
                  {course.is_published ? 'Publicado' : 'Borrador'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
