import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, isAuthenticated } from '../../services/api';
import PageHead from '../../utils/PageHead';
import './Profile.css';
import './ProfilePhoto.css';
import uploadIcon from '../../assets/profile/upload.svg';
import cameraBadge from '../../assets/profile/camera-badge.svg';

// Profile-picture page (Figma S6-03 "Configuración de perfil"): profile hero +
// "Sube una foto o elige tu avatar" band with an upload circle and the four
// predefined Propel avatars. Presets save immediately; uploaded photos first go
// through an adjust step (drag + zoom inside a circular mask) and the cropped
// square is what gets uploaded.

const PRESETS = ['/avatars/propel-1.png', '/avatars/propel-2.png', '/avatars/propel-3.png', '/avatars/propel-4.png'];

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  created_at: string;
  avatar: string | null;
}

const GRADIENTS = [
  'linear-gradient(135deg, #FD6A44, #e55a36)',
  'linear-gradient(135deg, #0E4B43, #22c55e)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
];

const getInitials = (firstName: string, lastName: string) => {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return f + l || '?';
};

const formatMemberSince = (dateStr: string) => {
  if (!dateStr) return '';
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const d = new Date(dateStr);
  return `Miembro desde ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Output size of the cropped avatar uploaded to the backend.
const CROP_OUTPUT = 512;

const clampOffset = (x: number, y: number, dispW: number, dispH: number, view: number) => {
  const maxX = Math.max(0, (dispW - view) / 2);
  const maxY = Math.max(0, (dispH - view) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
};

const ProfilePhoto = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Crop step state: set when a file was picked and is being adjusted
  const [cropSrc, setCropSrc] = useState('');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [viewSize, setViewSize] = useState(320);

  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc); }, [cropSrc]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    authApi.getProfile().then(({ ok, data }) => {
      if (ok) setUser(data);
    });
  }, [navigate]);

  const choosePreset = async (preset: string) => {
    if (saving) return;
    setSaving(true);
    setError('');
    const { ok, data } = await authApi.setAvatarPreset(preset);
    if (ok) {
      navigate('/profile');
    } else {
      setError(data?.preset || data?.detail || 'No se pudo guardar el avatar. Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || saving) return;
    setError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
    setViewSize(Math.min(320, window.innerWidth - 72));
    setCropSrc(URL.createObjectURL(file));
  };

  // Base scale makes the shorter image side exactly cover the viewport; zoom
  // multiplies on top of it, so the circle is always fully covered.
  const baseScale = natural.w && natural.h ? viewSize / Math.min(natural.w, natural.h) : 1;
  const dispW = natural.w * baseScale * zoom;
  const dispH = natural.h * baseScale * zoom;

  const onCropImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
  };

  const onCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(clampOffset(
      drag.baseX + (e.clientX - drag.startX),
      drag.baseY + (e.clientY - drag.startY),
      dispW, dispH, viewSize,
    ));
  };

  const onCropPointerUp = () => { dragRef.current = null; };

  const onZoomChange = (value: number) => {
    setZoom(value);
    const w = natural.w * baseScale * value;
    const h = natural.h * baseScale * value;
    setOffset((prev) => clampOffset(prev.x, prev.y, w, h, viewSize));
  };

  const cancelCrop = () => {
    setCropSrc('');
    setError('');
  };

  const saveCrop = async () => {
    const img = cropImgRef.current;
    if (!img || !natural.w || saving) return;
    setSaving(true);
    setError('');
    const scale = baseScale * zoom;
    const srcSize = viewSize / scale;
    const cx = natural.w / 2 - offset.x / scale;
    const cy = natural.h / 2 - offset.y / scale;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT;
    canvas.height = CROP_OUTPUT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CROP_OUTPUT, CROP_OUTPUT);
    ctx.drawImage(img, cx - srcSize / 2, cy - srcSize / 2, srcSize, srcSize, 0, 0, CROP_OUTPUT, CROP_OUTPUT);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) {
      setError('No se pudo procesar la imagen. Inténtalo de nuevo.');
      setSaving(false);
      return;
    }
    const { ok, data } = await authApi.uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    if (ok) {
      navigate('/profile');
    } else {
      setError(data?.file || data?.detail || 'No se pudo subir la imagen. Inténtalo de nuevo.');
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <PageHead title="Foto de perfil" noIndex />
      <div className="profile-hero-band">
        <div className="profile-container profile-hero">
          <div
            className="profile-avatar"
            style={{ background: user ? GRADIENTS[user.id % GRADIENTS.length] : GRADIENTS[0] }}
          >
            {user?.avatar ? (
              <img className="profile-avatar-img" src={user.avatar} alt="" />
            ) : (
              <span className="profile-avatar-initials">
                {getInitials(user?.first_name || '', user?.last_name || '')}
              </span>
            )}
            <img className="pphoto-avatar-camera" src={cameraBadge} alt="" aria-hidden="true" />
          </div>
          <div className="profile-hero-info">
            <h1 className="profile-hero-name">
              {user?.display_name || `${user?.first_name || ''} ${user?.last_name || ''}`}
            </h1>
            <p className="profile-hero-email">{user?.email}</p>
            {user?.created_at && (
              <p className="profile-hero-since">{formatMemberSince(user.created_at)}</p>
            )}
          </div>
          <button className="profile-hero-edit" onClick={() => navigate('/profile')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Volver a tu perfil
          </button>
        </div>
      </div>

      <div className="pphoto-band">
        <div className="profile-container">
          <h2 className="pphoto-title">Sube una foto o elige tu avatar</h2>
          <div className="pphoto-options">
            <button
              type="button"
              className="pphoto-circle pphoto-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              aria-label="Subir una foto"
            >
              <img className="pphoto-upload-icon" src={uploadIcon} alt="" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFileChange}
              hidden
            />
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`pphoto-circle pphoto-preset${user?.avatar === preset ? ' pphoto-preset--selected' : ''}`}
                onClick={() => choosePreset(preset)}
                disabled={saving}
                aria-label="Elegir este avatar"
              >
                <img src={preset} alt="" />
              </button>
            ))}
          </div>
          {error && !cropSrc && <p className="pphoto-error">{error}</p>}
        </div>
      </div>

      {cropSrc && (
        <div className="pphoto-crop-overlay" role="dialog" aria-label="Ajusta tu foto">
          <div className="pphoto-crop-card">
            <h3 className="pphoto-crop-title">Ajusta tu foto</h3>
            <p className="pphoto-crop-hint">Arrastra la imagen para encajarla en el círculo.</p>
            <div
              className="pphoto-crop-viewport"
              style={{ width: viewSize, height: viewSize }}
              onPointerDown={onCropPointerDown}
              onPointerMove={onCropPointerMove}
              onPointerUp={onCropPointerUp}
              onPointerCancel={onCropPointerUp}
            >
              <img
                ref={cropImgRef}
                className="pphoto-crop-img"
                src={cropSrc}
                alt=""
                draggable={false}
                onLoad={onCropImgLoad}
                style={natural.w ? {
                  width: dispW,
                  height: dispH,
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                } : { visibility: 'hidden' }}
              />
              <div className="pphoto-crop-mask" />
            </div>
            <label className="pphoto-crop-zoom">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
              />
            </label>
            {error && <p className="pphoto-error">{error}</p>}
            <div className="pphoto-crop-actions">
              <button type="button" className="pphoto-crop-cancel" onClick={cancelCrop} disabled={saving}>
                Cancelar
              </button>
              <button type="button" className="pphoto-crop-save" onClick={saveCrop} disabled={saving || !natural.w}>
                {saving ? 'Guardando…' : 'Guardar foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhoto;
