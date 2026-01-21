import './Topbar.css';

const Topbar = () => {
  return (
    <header className="topbar">
      <div className="topbar-container">
        <a href="/" className="topbar-logo">
          <img
            src="https://www.academy.wepropel.org/wp-content/uploads/2025/04/Logotipo_Propel_Horizontal-02-removebg-preview-e1745455801946.png"
            alt="Propel Logo"
            className="topbar-logo-img"
          />
        </a>
        <nav className="topbar-nav">
          {/* Navigation items can be added here */}
        </nav>
      </div>
    </header>
  );
};

export default Topbar;
