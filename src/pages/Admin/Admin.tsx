import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './AdminContext';
import AdminLayout from './AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminCourses from './pages/AdminCourses';
import AdminCourseDetail from './pages/AdminCourseDetail';
import AdminCategories from './pages/AdminCategories';
import './Admin.css';
import './AdminLayout.css';

const Admin = () => {
  return (
    <AdminProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="cursos" element={<AdminCourses />} />
          <Route path="cursos/:id" element={<AdminCourseDetail />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AdminProvider>
  );
};

export default Admin;
