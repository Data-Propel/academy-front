import { lazy, Suspense, useEffect, useReducer } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar/Topbar';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import NotFound from './pages/NotFound/NotFound';
import { isAuthenticated, canAccessAdmin, getProfileComplete } from './services/api';
import { captureAttribution } from './utils/attribution';

const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const CourseDetail = lazy(() => import('./pages/CourseDetail/CourseDetail'));
const CourseLearner = lazy(() => import('./pages/CourseLearner/CourseLearner'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Register = lazy(() => import('./pages/Register/Register'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile/CompleteProfile'));
const ResetPassword = lazy(() => import('./pages/ResetPassword/ResetPassword'));
const AutoLogin = lazy(() => import('./pages/AutoLogin/AutoLogin'));
const FormPage = lazy(() => import('./pages/FormPage/FormPage'));
const CourseEvaluation = lazy(() => import('./pages/CourseEvaluation/CourseEvaluation'));
const WorkshopLanding = lazy(() => import('./pages/WorkshopLanding/WorkshopLanding'));
const Home = lazy(() => import('./pages/Home/Home'));

import './App.css';

export function AppContent() {
  const location = useLocation();

  // Re-render the gate whenever the profile-completeness flag changes (set by
  // getProfile / Google sign-in), so a user who becomes "incomplete" mid-session
  // is gated without waiting for the next navigation.
  const [, refreshGate] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onFlag = () => refreshGate();
    window.addEventListener('profile-flag', onFlag);
    return () => window.removeEventListener('profile-flag', onFlag);
  }, []);

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
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/completar-perfil';
  const isHomeRoute = location.pathname === '/';
  const isCatalogRoute = location.pathname === '/cursos';
  const isCourseDetailRoute = /^\/courses\/[^/]+$/.test(location.pathname);

  // A learner who signed in (e.g. with Google) but hasn't filled the required
  // profile fields is held on /completar-perfil — every other route redirects
  // there so the step can't be skipped via the "Mi perfil" link or a typed URL.
  // Admins are exempt (their accounts aren't learner profiles).
  const profileGated =
    isAuthenticated() &&
    !canAccessAdmin() &&
    getProfileComplete() === false &&
    location.pathname !== '/completar-perfil' &&
    location.pathname !== '/auto-login';

  return (
    <div className={`app${isHomeRoute ? ' app--home' : ''}${isCatalogRoute ? ' app--catalog' : ''}${isCourseDetailRoute ? ' app--coursedetail' : ''}`}>
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
        {profileGated ? (
          <Navigate to="/completar-perfil" replace />
        ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cursos" element={<Dashboard />} />
          <Route path="/courses/:slug" element={<CourseDetail />} />
          <Route path="/courses/:slug/lessons/:lessonId" element={<CourseLearner />} />
          <Route path="/courses/:slug/topics/:topicId" element={<CourseLearner />} />
          <Route path="/courses/:slug/evaluate" element={<CourseEvaluation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/completar-perfil" element={<CompleteProfile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auto-login" element={<AutoLogin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/forms/:slug" element={<FormPage />} />
          <Route path="/lidera-con-ia-mindset" element={<WorkshopLanding />} />
          <Route path="/admin/*" element={isAuthenticated() ? <Admin /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        )}
      </Suspense>
      {!isLearnerRoute && !isAdminRoute && !isFormRoute && !isWorkshopRoute && !isAuthRoute && !isHomeRoute && <Footer />}
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
