import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import propelLogo from '../../assets/register/propel-logo.png';
import './ShareProgressModal.css';

// "Compartir avance" popup (S6-04): renders a branded share image on a
// canvas (template + real course thumbnail + real progress), offers
// download / native share, social share links and a copy-the-course-link
// row. Fully client-side; no sensitive data — only course title + %.

interface ShareProgressModalProps {
  courseTitle: string;
  courseUrl: string;
  /** Candidate thumbnail URLs, tried in order until one loads. */
  thumbnailUrls: Array<string | null | undefined>;
  progressPercent: number;
  onClose: () => void;
}

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundedPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Paints the 1080×1080 branded template with the course thumbnail. */
const drawShareImage = async (
  canvas: HTMLCanvasElement,
  courseTitle: string,
  thumbnailUrls: Array<string | null | undefined>,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const S = 1080;
  canvas.width = S;
  canvas.height = S;

  const FF = '"Libre Franklin", "Segoe UI", sans-serif';
  try {
    await Promise.all([
      document.fonts.load(`400 54px ${FF}`),
      document.fonts.load(`600 54px ${FF}`),
      document.fonts.load(`700 54px ${FF}`),
    ]);
  } catch { /* fall back to whatever is available */ }

  // Background + bottom band (matches the Figma share template)
  ctx.fillStyle = '#F5F5F3';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#F2A65E';
  ctx.fillRect(0, 905, S, S - 905);
  const favicon = await loadImage('/favicon.jpg');
  if (favicon) {
    ctx.drawImage(favicon, S - 175, 905, 175, S - 905);
  } else {
    ctx.fillStyle = '#FF5A2F';
    ctx.fillRect(S - 175, 905, 175, S - 905);
  }

  // Logo
  const logo = await loadImage(propelLogo);
  if (logo) {
    const w = 470;
    const h = w * (logo.height / logo.width);
    ctx.drawImage(logo, 100, 88, w, h);
  }

  // Heading
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#333333';
  ctx.font = `400 56px ${FF}`;
  ctx.fillText('Estoy aprendiendo en la', 100, 268);
  ctx.font = `700 56px ${FF}`;
  ctx.fillStyle = '#0E4B43';
  ctx.fillText('Nonprofit Academy', 100, 344);
  const boldWidth = ctx.measureText('Nonprofit Academy').width;
  ctx.font = `400 56px ${FF}`;
  ctx.fillStyle = '#333333';
  ctx.fillText(' de Propel', 100 + boldWidth, 344);

  // Course thumbnail (cover-cropped, rounded) — first candidate that loads
  let thumb: HTMLImageElement | null = null;
  for (const candidate of thumbnailUrls) {
    if (!candidate) continue;
    thumb = await loadImage(candidate);
    if (thumb) break;
  }
  const tw = 470, th = 290, tx = (S - tw) / 2, ty = 420;
  if (thumb) {
    ctx.save();
    roundedPath(ctx, tx, ty, tw, th, 0);
    ctx.clip();
    const scale = Math.max(tw / thumb.width, th / thumb.height);
    const dw = thumb.width * scale, dh = thumb.height * scale;
    ctx.drawImage(thumb, tx + (tw - dw) / 2, ty + (th - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.save();
    roundedPath(ctx, tx, ty, tw, th, 0);
    ctx.fillStyle = '#0E4B43';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 40px ${FF}`;
    ctx.textAlign = 'center';
    const words = courseTitle.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > tw - 60 && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, S / 2, ty + 90 + i * 52));
    ctx.textAlign = 'left';
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0E4B43';
  ctx.font = `400 32px ${FF}`;
  ctx.fillText('propelacademy.org', S / 2, 765);
  ctx.textAlign = 'left';
};

const ShareProgressModal = ({ courseTitle, courseUrl, thumbnailUrls, progressPercent, onClose }: ShareProgressModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const shareText = `¡Estoy aprendiendo «${courseTitle}» en la Nonprofit Academy de Propel!`;

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>('button, input');
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
  }, [close]);

  const downloadImage = async () => {
    if (!canvasRef.current) return;
    await drawShareImage(canvasRef.current, courseTitle, thumbnailUrls);
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'mi-avance-nonprofit-academy.png';
    a.click();
  };

  // Facebook and Instagram have no way to prefill post text, so we copy it
  // to the clipboard for the user to paste. LinkedIn's feed composer does
  // accept pre-filled text via ?shareActive.
  const copyShareText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${courseUrl}`);
      return true;
    } catch {
      return false;
    }
  };

  /** Renders the branded card and returns it as a PNG File (null on failure). */
  const buildImageFile = async (): Promise<File | null> => {
    if (!canvasRef.current) return null;
    await drawShareImage(canvasRef.current, courseTitle, thumbnailUrls);
    const blob = await new Promise<Blob | null>(resolve => canvasRef.current!.toBlob(resolve, 'image/png'));
    return blob ? new File([blob], 'mi-avance-nonprofit-academy.png', { type: 'image/png' }) : null;
  };

  // LinkedIn/Facebook/Instagram intents can't attach an image (the shared
  // post was a bare link), so those buttons share the branded card instead:
  // on touch devices with file-capable Web Share the OS sheet opens with the
  // image attached; on desktop the image downloads — with the text prefilled
  // (LinkedIn) or copied to the clipboard (Facebook/Instagram) — ready for
  // the user to attach to their post.
  const shareImageTo = (network: 'linkedin' | 'facebook' | 'instagram') => {
    const canShareFiles =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'probe.png', { type: 'image/png' })] });
    if (canShareFiles && window.matchMedia('(pointer: coarse)').matches) {
      void (async () => {
        const file = await buildImageFile();
        if (!file) return;
        try {
          await navigator.share({ files: [file], text: `${shareText} ${courseUrl}` });
        } catch { /* user closed the sheet */ }
      })();
      return;
    }
    // Desktop: the clipboard needs focus and popup blockers need the click's
    // own tick — copy first, open the composer synchronously, download alongside.
    const copying = network === 'linkedin' ? Promise.resolve(true) : copyShareText();
    if (network === 'linkedin') {
      window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}%20${encodeURIComponent(courseUrl)}`, '_blank', 'noopener');
    } else if (network === 'facebook') {
      // sharer.php only makes link posts — open the composer for an image post.
      window.open('https://www.facebook.com/', '_blank', 'noopener');
    }
    void downloadImage();
    void copying.then(ok => {
      if (network === 'linkedin') {
        setNote('Imagen descargada ✓ Adjúntala a tu publicación de LinkedIn.');
      } else if (network === 'facebook') {
        setNote(ok
          ? 'Imagen descargada y texto copiado ✓ Adjunta la imagen a una publicación de Facebook y pega el texto.'
          : 'Imagen descargada ✓ Adjúntala a una publicación de Facebook.');
      } else {
        setNote(ok
          ? 'Imagen descargada y texto copiado ✓ Pégalo como pie de tu publicación de Instagram.'
          : 'Imagen descargada: súbela a tu historia o publicación de Instagram.');
      }
    });
  };

  const shareTo = (network: 'linkedin' | 'instagram' | 'facebook' | 'whatsapp') => {
    if (network === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(courseUrl)}`, '_blank', 'noopener');
      return;
    }
    shareImageTo(network);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setNote('No se pudo copiar. Selecciona el enlace y cópialo manualmente.');
    }
  };

  const heading = progressPercent >= 100
    ? '¡Felicidades! Terminaste el curso 🚀'
    : '¡Muy bien! Estás más cerca de terminar 🚀';

  return createPortal(
    <div className="spm-overlay" onClick={close}>
      <div
        ref={dialogRef}
        className="spm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="spm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="spm-close" onClick={close} aria-label="Cerrar">✕</button>
        <h2 id="spm-title" className="spm-title">{heading}</h2>

        <p className="spm-subtitle">Comparte tu avance en redes</p>
        <div className="spm-networks">
          <button
            className="spm-network"
            onClick={() => { void downloadImage().then(() => setNote('Imagen descargada ✓')); }}
            aria-label="Descargar imagen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <button className="spm-network" onClick={() => shareTo('linkedin')} aria-label="Compartir en LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>
          </button>
          <button className="spm-network" onClick={() => shareTo('instagram')} aria-label="Compartir en Instagram (descarga la imagen)">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.15A4 4 0 1116 12a4 4 0 01-4 4zm7.85-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/></svg>
          </button>
          <button className="spm-network" onClick={() => shareTo('facebook')} aria-label="Compartir en Facebook">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07z"/></svg>
          </button>
          <button className="spm-network" onClick={() => shareTo('whatsapp')} aria-label="Compartir en WhatsApp">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47a8.95 8.95 0 01-1.65-2.05c-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.58-.35zM12.05 21.79h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 016.99 2.9 9.82 9.82 0 012.9 7 9.9 9.9 0 01-9.9 9.87zm8.42-18.29A11.82 11.82 0 0012.05 0C5.5 0 .16 5.33.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.31-1.65a11.88 11.88 0 005.68 1.44h.01c6.55 0 11.89-5.33 11.89-11.89a11.82 11.82 0 00-3.48-8.4z"/></svg>
          </button>
        </div>

        {note && <p className="spm-note" role="status">{note}</p>}

        <p className="spm-subtitle">Sugiere este curso a otras personas</p>
        <div className="spm-copy-row">
          <input
            type="text"
            readOnly
            value={courseUrl.replace(/^https?:\/\//, '')}
            onFocus={(e) => e.target.select()}
            aria-label="Enlace del curso"
          />
          <button className="spm-btn spm-btn--primary" onClick={copyLink}>
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>

        <button className="spm-skip" onClick={close}>
          Saltar
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        {/* Rendered on demand when a share needs the branded image */}
        <canvas ref={canvasRef} className="spm-canvas" aria-hidden="true" />
      </div>
    </div>,
    document.body
  );
};

export default ShareProgressModal;
