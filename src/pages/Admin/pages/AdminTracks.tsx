import { useEffect, useState } from 'react';
import { tracksApi, type Track, type TrackEngagement } from '../../../services/api';

const fieldRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = { width: 200, color: '#444', fontSize: 14 };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
};

const TrackConfigEditor = ({ track, onSaved }: { track: Track; onSaved: (t: Track) => void }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [medalFile, setMedalFile] = useState<File | null>(null);
  const [nameX, setNameX] = useState(track.cert_name_x);
  const [nameY, setNameY] = useState(track.cert_name_y);
  const [fontSize, setFontSize] = useState(track.cert_name_font_size);
  const [color, setColor] = useState(track.cert_name_color);
  const [emailSubject, setEmailSubject] = useState(track.completion_email_subject || '');
  const [emailBody, setEmailBody] = useState(track.completion_email_body || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('cert_name_x', String(nameX));
    fd.append('cert_name_y', String(nameY));
    fd.append('cert_name_font_size', String(fontSize));
    fd.append('cert_name_color', color);
    fd.append('completion_email_subject', emailSubject);
    fd.append('completion_email_body', emailBody);
    if (certFile) fd.append('certificate_template', certFile);
    if (medalFile) fd.append('medal_image', medalFile);

    const res = await tracksApi.updateConfig(track.slug, fd);
    setSaving(false);
    if (res.ok) {
      setMsg('Guardado.');
      setCertFile(null);
      setMedalFile(null);
      onSaved(res.data.track as Track);
    } else {
      setMsg('Error al guardar.');
    }
  };

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 16 }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#16625b', fontSize: 14 }}>
        Configuración de certificación (certificado, medalla, email)
      </summary>

      <form onSubmit={handleSave} style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
          Certificado
        </h3>
        <div style={fieldRow}>
          <span style={labelStyle}>Plantilla (PNG)</span>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
          {track.certificate_template_url && (
            <a href={track.certificate_template_url} target="_blank" rel="noreferrer" style={{ color: '#16625b' }}>
              Ver actual
            </a>
          )}
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Posición X del nombre</span>
          <input style={inputStyle} type="number" value={nameX} onChange={(e) => setNameX(Number(e.target.value))} />
          <span style={{ color: '#888', fontSize: 13 }}>px desde la izquierda (centro del texto)</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Posición Y del nombre</span>
          <input style={inputStyle} type="number" value={nameY} onChange={(e) => setNameY(Number(e.target.value))} />
          <span style={{ color: '#888', fontSize: 13 }}>px desde arriba (centro del texto)</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Tamaño de fuente</span>
          <input style={inputStyle} type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          <span style={{ color: '#888', fontSize: 13 }}>px</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Color del nombre</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 60, height: 36 }} />
          <input style={{ ...inputStyle, width: 100 }} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <h3 style={{ fontSize: 14, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 12px' }}>
          Medalla
        </h3>
        <div style={fieldRow}>
          <span style={labelStyle}>Imagen</span>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => setMedalFile(e.target.files?.[0] || null)} />
          {track.medal_image_url && (
            <img src={track.medal_image_url} alt="" style={{ height: 60, borderRadius: 4 }} />
          )}
        </div>

        <h3 style={{ fontSize: 14, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 12px' }}>
          Email de finalización
        </h3>
        <div style={fieldRow}>
          <span style={labelStyle}>Asunto</span>
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="¡Felicidades {{ user_name }}! Completaste {{ track_name }}"
          />
        </div>
        <div style={{ ...fieldRow, alignItems: 'flex-start' }}>
          <span style={labelStyle}>Cuerpo (HTML)</span>
          <textarea
            style={{ ...inputStyle, flex: 1, minHeight: 160, fontFamily: 'monospace', fontSize: 13 }}
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Hola {{ user_name }}, has completado {{ track_name }}..."
          />
        </div>
        <p style={{ color: '#888', fontSize: 13, marginLeft: 212 }}>
          Variables: <code>{'{{ user_name }}'}</code> y <code>{'{{ track_name }}'}</code>.
          El envío automático no está activado; este template se guarda para usarse después.
        </p>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: '#16625b', color: '#fff', border: 'none', padding: '10px 28px',
              borderRadius: 4, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
          {msg && <span style={{ color: msg.startsWith('Error') ? '#c33' : '#16625b' }}>{msg}</span>}
        </div>
      </form>
    </details>
  );
};

const Bar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ width: 140, color: '#444', fontSize: 14 }}>{label}</span>
      <div style={{ flex: 1, background: '#eee', height: 24, borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ width: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#222', fontWeight: 600 }}>
        {value} ({pct}%)
      </span>
    </div>
  );
};

const TrackEngagementCard = ({ track: initialTrack }: { track: Track }) => {
  const [track, setTrack] = useState<Track>(initialTrack);
  const [stats, setStats] = useState<TrackEngagement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.getEngagement(track.slug);
      if (cancelled) return;
      if (res.ok) setStats(res.data as TrackEngagement);
      else setError('No se pudo cargar la analítica.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  return (
    <section
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <header style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0E4B43', fontFamily: 'Libre Franklin, sans-serif' }}>{track.name}</h2>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
            {track.total_count} cursos · slug: <code>{track.slug}</code>{' '}
            {track.is_featured && <span style={{ background: '#FD6A44', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>Destacado</span>}
          </p>
        </div>
      </header>

      {loading && <p style={{ color: '#888' }}>Cargando…</p>}
      {error && <p style={{ color: '#c33' }}>{error}</p>}

      {stats && (
        <>
          <div style={{ display: 'flex', gap: 24, marginBottom: 20, color: '#0E4B43' }}>
            <div>
              <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Usuarios inscritos</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.enrolled_users}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Cursos en track</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total_courses}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Completaron todo</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#A3C94A' }}>
                {stats.buckets[String(stats.total_courses)] ?? 0}
              </div>
            </div>
          </div>
          <h3 style={{ margin: '12px 0 12px', fontSize: 14, color: '#444', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Distribución por número de cursos completados
          </h3>
          {Array.from({ length: stats.total_courses + 1 }).map((_, n) => {
            const count = stats.buckets[String(n)] ?? 0;
            const label =
              n === 0 ? '0 cursos · enrollados sin avance'
              : n === stats.total_courses ? `${n} cursos · completaron todo`
              : `${n} curso${n > 1 ? 's' : ''} completado${n > 1 ? 's' : ''}`;
            const color = n === stats.total_courses ? '#A3C94A' : n === 0 ? '#bbb' : '#FD6A44';
            return <Bar key={n} label={label} value={count} max={stats.enrolled_users} color={color} />;
          })}
        </>
      )}

      <TrackConfigEditor track={track} onSaved={setTrack} />
    </section>
  );
};

const AdminTracks = () => {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await tracksApi.listAdmin();
      if (res.ok) setTracks(res.data);
      else setError('No se pudieron cargar los tracks.');
    })();
  }, []);

  return (
    <div>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, color: '#0E4B43', fontFamily: 'Libre Franklin, sans-serif' }}>Tracks</h1>
        <p style={{ margin: '6px 0 0', color: '#666' }}>
          Engagement de las certificaciones (rutas de cursos). Los tracks se editan en el admin de Django.
        </p>
      </header>
      {error && <p style={{ color: '#c33' }}>{error}</p>}
      {tracks === null && !error && <p style={{ color: '#888' }}>Cargando…</p>}
      {tracks && tracks.length === 0 && <p style={{ color: '#888' }}>No hay tracks definidos.</p>}
      {tracks && tracks.map((t) => <TrackEngagementCard key={t.id} track={t} />)}
    </div>
  );
};

export default AdminTracks;
