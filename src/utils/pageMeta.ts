// Per-route meta for social/SEO. MIRRORS the backend crawler source of truth at
// academy-back/apps/courses/seo_views.py (PAGE_META). The backend is what
// WhatsApp/Facebook actually read (they don't run JS); this file keeps the
// browser/Google view in sync. EDIT BOTH when changing copy.
//
// `description` is the long meta description (Google); `ogDescription` is the
// short Open Graph card text.

export const SITE_URL = 'https://propelacademy.org';

export interface PageMeta {
  title: string;
  description: string;
  ogDescription: string;
  ogImage: string;
  canonicalPath: string;
}

export const PAGE_META: Record<'home' | 'cursos' | 'register' | 'login' | 'profile' | 'workshop' | 'workshopCo' | 'workshopEvent' | 'about' | 'privacy' | 'terms' | 'contact', PageMeta> = {
  home: {
    title: 'Propel Nonprofit Academy | Cursos para organizaciones sociales',
    description: 'Explora los cursos de la Nonprofit Academy. Capacítate junto a tu equipo en IA y herramientas digitales para aumentar el impacto de tu organización social.',
    ogDescription: 'Descubre la Nonprofit Academy. Cursos de IA para organizaciones para el impacto social.',
    ogImage: '/og/home.jpg',
    canonicalPath: '/',
  },
  register: {
    title: 'Registro | Propel Nonprofit Academy',
    description: 'Te damos la bienvenida a la Nonprofit Academy. Accede a tus cursos de IA, retoma lecciones y gestiona tu avance al ingresar con tu correo electrónico.',
    ogDescription: 'Ingresa con tu correo y accede a cursos de IA.',
    ogImage: '/og/register.jpg',
    canonicalPath: '/register',
  },
  cursos: {
    title: 'Cursos para líderes sociales | Propel Nonprofit Academy',
    description: 'Explora nuestros cursos de IA para organizaciones sociales. Desde recaudación de fondos hasta estrategia: encuentra capacitaciones para crecer.',
    ogDescription: 'Explora los cursos de la Nonprofit Academy y capacita a tu equipo en IA.',
    ogImage: '/og/cursos.jpg',
    canonicalPath: '/cursos',
  },
  login: {
    title: 'Ingresa a tu cuenta | Propel Nonprofit Academy',
    description: 'Te damos la bienvenida a la Nonprofit Academy. Accede a cursos de IA y gestiona tu perfil al ingresar con tu correo.',
    ogDescription: 'Ingresa con tu correo y accede a cursos de IA.',
    ogImage: '/og/login.jpg',
    canonicalPath: '/login',
  },
  profile: {
    title: 'Mi perfil | Propel Nonprofit Academy',
    description: 'La Nonprofit Academy equipa a organizaciones sociales para usar IA, con cursos en línea para potenciar sus habilidades digitales y escalar su impacto.',
    ogDescription: 'Conoce cómo la Nonprofit Academy equipa a organizaciones con IA.',
    ogImage: '/og/profile.jpg',
    canonicalPath: '/profile',
  },
  workshop: {
    title: 'Lidera con un IA mindset | Propel Nonprofit Academy',
    description: 'Obtén tu certificación en IA en la Nonprofit Academy. Desarrolla un AI mindset, domina herramientas prácticas y lidera el cambio en tu organización social.',
    ogDescription: 'Certifícate en IA y lidera el cambio en tu organización social.',
    ogImage: '/og/workshop.jpg',
    canonicalPath: '/certificación-ia-pe',
  },
  workshopCo: {
    title: 'Lidera con un IA mindset | Propel Nonprofit Academy',
    description: 'Obtén tu certificación en IA en la Nonprofit Academy. Desarrolla un AI mindset, domina herramientas prácticas y lidera el cambio en tu organización social.',
    ogDescription: 'Certifícate en IA y lidera el cambio en tu organización social.',
    ogImage: '/og/workshop.jpg',
    canonicalPath: '/certificación-ia-co',
  },
  workshopEvent: {
    title: 'Workshop: Mide tu impacto con IA | Propel Nonprofit Academy',
    description: 'Workshop gratuito de Propel: aprende qué, cómo y cuándo medir el impacto de tu organización social con IA. 20 de agosto, vía Zoom. Inscríbete gratis.',
    ogDescription: 'Mide el impacto de tu organización con IA. 20 de agosto, vía Zoom.',
    ogImage: '/og/workshop-evento.jpg',
    canonicalPath: '/workshop',
  },
  about: {
    title: 'Sobre nosotros | Propel Nonprofit Academy',
    description: 'La Nonprofit Academy es la plataforma educativa de Propel: fortalecemos las capacidades digitales del sector social de América Latina con formación práctica en tecnología e IA.',
    ogDescription: 'Conoce la Nonprofit Academy: capacidades digitales para el sector social de América Latina.',
    ogImage: '/og/sobre-nosotros.jpg',
    canonicalPath: '/sobre-nosotros',
  },
  privacy: {
    title: 'Política de Privacidad | Propel Nonprofit Academy',
    description: 'Conoce cómo la Nonprofit Academy de Propel recopila, usa y protege tus datos personales, y los derechos que tienes sobre tu información.',
    ogDescription: 'Política de privacidad de la Nonprofit Academy de Propel.',
    ogImage: '/og/home.jpg',
    canonicalPath: '/politica-de-privacidad',
  },
  terms: {
    title: 'Términos y Condiciones | Propel Nonprofit Academy',
    description: 'Términos y condiciones de uso de la Nonprofit Academy de Propel: cuentas, cursos, propiedad intelectual y responsabilidades al usar la plataforma.',
    ogDescription: 'Términos y condiciones de uso de la Nonprofit Academy de Propel.',
    ogImage: '/og/home.jpg',
    canonicalPath: '/terminos-y-condiciones',
  },
  contact: {
    title: 'Contacto | Propel Nonprofit Academy',
    description: 'Contáctanos: soporte de la plataforma Nonprofit Academy (cuenta, certificados, cursos) y alianzas, prensa o colaboraciones con Propel.',
    ogDescription: 'Escríbenos: soporte de la Nonprofit Academy y alianzas con Propel.',
    ogImage: '/og/home.jpg',
    canonicalPath: '/contacto',
  },
};
