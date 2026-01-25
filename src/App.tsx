import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar/Topbar';
import Footer from './components/Footer/Footer';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ResetPassword from './pages/ResetPassword/ResetPassword';

import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Topbar />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/restablecer-contrasena" element={<ResetPassword />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
