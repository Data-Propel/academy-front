// Eventos de conversión para GA4 / Google Ads (Ad Grants exige reportar
// al menos 1 conversión al mes). gtag se define globalmente en index.html;
// si el usuario bloquea analytics, la llamada simplemente no hace nada.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, string | boolean | undefined>) {
  window.gtag?.('event', name, params);
}
