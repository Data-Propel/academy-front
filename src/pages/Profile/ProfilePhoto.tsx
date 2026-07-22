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
// predefined Propel avatars. Picking either saves immediately and returns to
// the profile.

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

const ProfilePhoto = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || saving) return;
    setSaving(true);
    setError('');
    const { ok, data } = await authApi.uploadAvatar(file);
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
          {error && <p className="pphoto-error">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProfilePhoto;
