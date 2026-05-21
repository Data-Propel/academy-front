import PageHead from '../../utils/PageHead';
import './NotFound.css';

const NotFound = () => {
  console.log('[NotFound]');
  return (
    <div className="notfound-page">
      <PageHead title="Página no encontrada" noIndex />
      <div className="notfound-container">
        <h1 className="notfound-code">¡Ups!</h1>
        <h2 className="notfound-title">Parece que esta página no existe</h2>
        <p className="notfound-message">
          No te preocupes, a veces los enlaces se pierden. Te ayudamos a volver al camino.
        </p>
        <a href="/" className="notfound-button">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
