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

export const PAGE_META: Record<'home' | 'register' | 'workshop', PageMeta> = {
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
  workshop: {
    title: 'Lidera con un IA mindset | Propel Nonprofit Academy',
    description: 'Obtén tu certificación en IA en la Nonprofit Academy. Desarrolla un AI mindset, domina herramientas prácticas y lidera el cambio en tu organización social.',
    ogDescription: 'Certifícate en IA y lidera el cambio en tu organización social.',
    ogImage: '/og/workshop.jpg',
    canonicalPath: '/lidera-con-ia-mindset',
  },
};
