import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExternalLinkGuard.css';

// Exit-intent guard (S6-07): intercepts clicks on external links inside
// course content and asks for confirmation before leaving the platform.
// Skips internal/relative links, hash links, mailto/tel, and anything
// marked with the `download` attribute so PDF/resource downloads keep
// working untouched.

const isExternalAnchor = (anchor: HTMLAnchorElement): boolean => {
  if (anchor.hasAttribute('download')) return false;
  const rawHref = anchor.getAttribute('href') || '';
  if (!rawHref || rawHref.startsWith('#')) return false;
  if (!/^https?:/i.test(anchor.href)) return false; // mailto:, tel:, blob:, data:
  try {
    return new URL(anchor.href).host !== window.location.host;
  } catch {
    return false;
  }
};

const ExternalLinkGuard = ({ className, children }: {
  className?: string;
  children: React.ReactNode;
}) => {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleClickCapture = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || !isExternalAnchor(anchor)) return;
    e.preventDefault();
    e.stopPropagation();
    triggerRef.current = anchor;
    setPendingUrl(anchor.href);
  };

  const close = useCallback(() => {
    setPendingUrl(null);
    triggerRef.current?.focus();
  }, []);

  const proceed = () => {
    if (pendingUrl) window.open(pendingUrl, '_blank', 'noopener');
    close();
  };

  // Keyboard: Escape cancels, Tab stays inside the dialog.
  useEffect(() => {
    if (!pendingUrl) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [pendingUrl, close]);

  let host = '';
  if (pendingUrl) {
    try { host = new URL(pendingUrl).host; } catch { host = pendingUrl; }
  }

  return (
    <div className={className} onClickCapture={handleClickCapture}>
      {children}
      {pendingUrl && createPortal(
        <div className="elg-overlay" onClick={close}>
          <div
            ref={dialogRef}
            className="elg-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elg-title"
            aria-describedby="elg-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="elg-close" onClick={close} aria-label="Cerrar">✕</button>
            <div className="elg-icon" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 id="elg-title" className="elg-title">Estás a punto de salir de Nonprofit Academy</h2>
            <p id="elg-desc" className="elg-text">
              Este enlace te llevará a un sitio externo: <span className="elg-host">{host}</span>
            </p>
            <div className="elg-actions">
              <button ref={cancelRef} className="elg-btn elg-btn--secondary" onClick={close}>
                Cancelar
              </button>
              <button className="elg-btn elg-btn--primary" onClick={proceed}>
                Continuar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExternalLinkGuard;
