import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-page">
      <div className="notfound-container">
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Página no encontrada</h2>
        <p className="notfound-message">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <a href="/" className="notfound-button">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
