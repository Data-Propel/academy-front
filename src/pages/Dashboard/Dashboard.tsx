import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { coursesApi, isAuthenticated, authApi } from '../../services/api';
import './Dashboard.css';

interface User {
  first_name: string;
  last_name: string;
  email: string;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  thumbnail: string;
  level: string;
  duration_hours: number;
  category: {
    name: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, coursesRes] = await Promise.all([
          authApi.getProfile(),
          coursesApi.list(),
        ]);

        if (profileRes.ok) {
          setUser(profileRes.data);
        }

        if (coursesRes.ok) {
          setCourses(coursesRes.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const getLevelLabel = (level: string) => {
    const levels: Record<string, string> = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado',
    };
    return levels[level] || level;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-welcome">
            <h1 className="dashboard-title">
              ¡Hola, {user?.first_name || 'Usuario'}!
            </h1>
            <p className="dashboard-subtitle">
              Continúa tu aprendizaje y escala con IA.
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="courses-section">
          <h2 className="section-title">Cursos disponibles</h2>

          {courses.length === 0 ? (
            <div className="no-courses">
              <p>No hay cursos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  className="course-card"
                >
                  {course.thumbnail && (
                    <div className="course-thumbnail">
                      <img src={course.thumbnail} alt={course.title} />
                    </div>
                  )}
                  <div className="course-content">
                    {course.category && (
                      <span className="course-category">{course.category.name}</span>
                    )}
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-description">{course.short_description}</p>
                    <div className="course-meta">
                      <span className="course-level">{getLevelLabel(course.level)}</span>
                      <span className="course-duration">{course.duration_hours}h</span>
                    </div>
                    <span className="course-button">Ver curso</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
