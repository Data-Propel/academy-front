import { useState } from 'react';
import { trackEvent } from '../../utils/analytics';

// Formulario público de contacto — POST /api/users/contact/ (sin auth).
// 'website' es un honeypot anti-spam: oculto por CSS, los bots lo llenan.
const ContactForm = () => {
  const [form, setForm] = useState({ nombre: '', email: '', mensaje: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    try {
      const res = await fetch('/api/users/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        trackEvent('contact_submit');
        setStatus('sent');
      } else {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(data.detail || 'No se pudo enviar el mensaje. Intenta más tarde.');
        setStatus('error');
      }
    } catch {
      setError('Error de conexión. Intenta más tarde.');
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="lp-form lp-form--success">
        <p className="lp-form__success-title">¡Gracias por escribirnos!</p>
        <p>Recibimos tu mensaje y te responderemos pronto.</p>
      </div>
    );
  }

  return (
    <form className="lp-form" onSubmit={handleSubmit}>
      <h3 className="lp-form__title">Envíanos un mensaje</h3>
      <div className="lp-form__row">
        <label className="lp-form__field">
          Nombre
          <input name="nombre" value={form.nombre} onChange={handleChange} required maxLength={120} />
        </label>
        <label className="lp-form__field">
          Correo electrónico
          <input type="email" name="email" value={form.email} onChange={handleChange} required maxLength={254} />
        </label>
      </div>
      <label className="lp-form__field">
        Mensaje
        <textarea name="mensaje" value={form.mensaje} onChange={handleChange} required maxLength={5000} rows={6} />
      </label>
      <input
        className="lp-form__hp"
        type="text"
        name="website"
        value={form.website}
        onChange={handleChange}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      {error && <p className="lp-form__error">{error}</p>}
      <button type="submit" className="lp-form__submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  );
};

export default ContactForm;
