import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar/Topbar';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import NotFound from './pages/NotFound/NotFound';

const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const CourseDetail = lazy(() => import('./pages/CourseDetail/CourseDetail'));
const CourseLearner = lazy(() => import('./pages/CourseLearner/CourseLearner'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Register = lazy(() => import('./pages/Register/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword/ResetPassword'));
const AutoLogin = lazy(() => import('./pages/AutoLogin/AutoLogin'));
const FormPage = lazy(() => import('./pages/FormPage/FormPage'));
const CourseEvaluation = lazy(() => import('./pages/CourseEvaluation/CourseEvaluation'));

import './App.css';

function AppContent() {
  const location = useLocation();
  const isLearnerRoute =
    /^\/courses\/[^/]+\/lessons\/\d+/.test(location.pathname) ||
    /^\/courses\/[^/]+\/topics\/\d+/.test(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFormRoute = location.pathname.startsWith('/forms/');

  return (
    <div className="app">
      {!isAdminRoute && !isFormRoute && <Topbar />}
      <Suspense fallback={
        <div className="page-loading">
          <div className="page-loading__block page-loading__title" />
          <div className="page-loading__block page-loading__subtitle" />
          <div className="page-loading__cards">
            <div className="page-loading__block page-loading__card" />
            <div className="page-loading__block page-loading__card" />
            <div className="page-loading__block page-loading__card" />
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/courses/:slug/lessons/:lessonId" element={<CourseLearner />} />
          <Route path="/courses/:slug/topics/:topicId" element={<CourseLearner />} />
          <Route path="/courses/:slug/evaluate" element={<CourseEvaluation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auto-login" element={<AutoLogin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forms/:slug" element={<FormPage />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isLearnerRoute && !isAdminRoute && !isFormRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
