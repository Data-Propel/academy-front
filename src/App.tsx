import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar/Topbar';
import Footer from './components/Footer/Footer';
import GradualBlur from './components/GradualBlur/GradualBlur';
import Login from './pages/Login/Login';
import NotFound from './pages/NotFound/NotFound';
import { isAuthenticated } from './services/api';
import { captureAttribution } from './utils/attribution';

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
const WorkshopLanding = lazy(() => import('./pages/WorkshopLanding/WorkshopLanding'));

import './App.css';

export function AppContent() {
  const location = useLocation();

  useEffect(() => {
    captureAttribution();
  }, []);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !isAuthenticated()) {
        window.location.replace('/login');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location.pathname, location.search]);

  const isLearnerRoute =
    /^\/courses\/[^/]+\/lessons\/\d+/.test(location.pathname) ||
    /^\/courses\/[^/]+\/topics\/\d+/.test(location.pathname);
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFormRoute = location.pathname.startsWith('/forms/');
  const isWorkshopRoute = location.pathname === '/lidera-con-ia-mindset';
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app">
      {!isAdminRoute && !isFormRoute && <Topbar hideHamburger={isLearnerRoute} />}
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
          <Route path="/cursos" element={<Dashboard />} />
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
          <Route path="/lidera-con-ia-mindset" element={<WorkshopLanding />} />
          <Route path="/admin/*" element={isAuthenticated() ? <Admin /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!isLearnerRoute && !isAdminRoute && !isFormRoute && !isWorkshopRoute && !isAuthRoute && <Footer />}
      {!isAdminRoute && !isFormRoute && !isWorkshopRoute && !isAuthRoute && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '3rem', pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <GradualBlur position="bottom" height="3rem" strength={2} divCount={6} curve="bezier" />
          </div>
        </div>
      )}
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
