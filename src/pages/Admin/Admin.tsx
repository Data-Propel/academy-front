import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './AdminContext';
import AdminLayout from './AdminLayout';
import PageHead from '../../utils/PageHead';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminUsersLegacy from './pages/AdminUsersLegacy';
import AdminCourses from './pages/AdminCourses';
import AdminCourseDetail from './pages/AdminCourseDetail';
import AdminCategories from './pages/AdminCategories';
import AdminTags from './pages/AdminTags';
import AdminCampaigns from './pages/AdminCampaigns';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminWorkshops from './pages/AdminWorkshops';
import { isSuperuser, isUsersReadonly, isMarketingAdmin } from '../../services/api';
import './Admin.css';
import './AdminLayout.css';

const Admin = () => {
  const fullAdmin = isSuperuser();
  const usersReadonly = !fullAdmin && isUsersReadonly();
  const marketing = !fullAdmin && isMarketingAdmin();

  if (!fullAdmin && !usersReadonly && !marketing) {
    return <Navigate to="/" replace />;
  }

  if (usersReadonly) {
    return (
      <AdminProvider>
        <PageHead title="Admin" noIndex />
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="*" element={<Navigate to="/admin/usuarios" replace />} />
          </Route>
        </Routes>
      </AdminProvider>
    );
  }

  if (marketing) {
    return (
      <AdminProvider>
        <PageHead title="Admin" noIndex />
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="campaigns" replace />} />
            <Route path="campaigns" element={<AdminCampaigns />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="*" element={<Navigate to="/admin/campaigns" replace />} />
          </Route>
        </Routes>
      </AdminProvider>
    );
  }

  return (
    <AdminProvider>
      <PageHead title="Admin" noIndex />
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="usuarios-legacy" element={<AdminUsersLegacy />} />
          <Route path="cursos" element={<AdminCourses />} />
          <Route path="cursos/:id" element={<AdminCourseDetail />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="workshops" element={<AdminWorkshops />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminProvider>
  );
};

export default Admin;
