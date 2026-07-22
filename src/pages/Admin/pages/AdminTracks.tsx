import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import TrackFunnel from '../../Dashboard/TrackFunnel';
import {
  adminApi,
  tracksApi,
  type Track,
  type TrackCourse,
  type TrackEmail,
  type TrackEmailPayload,
  type TrackEmailRecipients,
  type TrackEmailTrigger,
  type TrackEngagement,
  type TrackEngagementUser,
  type TrackEvolution,
  type TrackWritePayload,
} from '../../../services/api';
import PageHeader from '../components/PageHeader';

interface CourseOption {
  id: number;
  title: string;
}

// Dark admin theme tokens, matching the other admin tabs (.admin-content,
// .admin-form, PageHeader): light text on the teal gradient, translucent
// surfaces/inputs, orange accent.
const C = {
  text: '#F2F2F2',
  textMuted: 'rgba(242, 242, 242, 0.75)',
  textFaint: 'rgba(242, 242, 242, 0.5)',
  border: '#656565',
  borderSoft: 'rgba(101, 101, 101, 0.4)',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceSoft: 'rgba(255, 255, 255, 0.03)',
  inputBg: 'rgba(255, 255, 255, 0.1)',
  accent: '#FD6A44',
  green: '#A3C94A',
  danger: '#ff8a8a',
  dangerBorder: 'rgba(255, 138, 138, 0.4)',
};
// <option> popups ignore translucent backgrounds, so give them a solid one.
const optionStyle: React.CSSProperties = { background: '#043A37', color: C.text };

const fieldRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = { width: 200, color: C.textMuted, fontSize: 14 };
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
  background: C.inputBg,
  color: C.text,
};

// One bordered section per track / per form, sitting inside the .admin-content
// panel like the rest of the admin tabs.
const cardStyle: React.CSSProperties = {
  background: C.surfaceSoft,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 8,
  padding: 24,
  marginBottom: 16,
};

const badge = (fg: string, bg: string): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: fg,
  background: bg,
  borderRadius: 999,
  padding: '2px 10px',
  whiteSpace: 'nowrap',
});

const advancedSummary: React.CSSProperties = { cursor: 'pointer', fontWeight: 600, color: C.accent, fontSize: 14 };

const fmtSent = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
};

// Who the next daily run would email, fetched on demand. Shows the exact list
// the cron command would send to (same audience logic), so the admin can check
// recipients before activating. Re-fetches on each open to stay current.
const RecipientsPreview = ({ slug, emailId }: { slug: string; emailId: number }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackEmailRecipients | null>(null);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    const res = await tracksApi.emailRecipients(slug, emailId);
    setData(res.ok ? res.data : null);
    setLoading(false);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={toggle} style={{ ...advancedSummary, background: 'none', border: 'none', padding: 0 }}>
        {open ? '▴' : '▾'} Ver destinatarios del próximo envío
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {loading && <p style={{ color: C.textFaint, fontSize: 13, margin: 0 }}>Cargando…</p>}
          {!loading && data?.event_based && (
            <p style={{ color: C.textFaint, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Este correo se envía automáticamente cuando ocurre el evento (al inscribirse o completar);
              no hay una lista previa de destinatarios.
            </p>
          )}
          {!loading && data && !data.event_based && (
            data.count === 0 ? (
              <p style={{ color: C.textFaint, fontSize: 13, margin: 0 }}>
                Ahora mismo nadie cumple las condiciones para recibirlo.
              </p>
            ) : (
              <>
                <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 8px' }}>
                  {data.count} {data.count === 1 ? 'persona lo recibiría' : 'personas lo recibirían'} en la próxima revisión diaria:
                </p>
                <div style={{ maxHeight: 260, overflowY: 'auto', border: `1px solid ${C.borderSoft}`, borderRadius: 6 }}>
                  {data.recipients.map((r, i) => (
                    <div key={r.email} style={{ display: 'flex', gap: 10, padding: '6px 12px', fontSize: 13, background: i % 2 ? C.surface : 'transparent', borderBottom: i < data.recipients.length - 1 ? `1px solid ${C.borderSoft}` : 'none' }}>
                      <span style={{ color: C.text, minWidth: 0, flex: '0 0 45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                      <span style={{ color: C.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};

// One collapsible section inside an expanded track card. Progressive disclosure:
// every section starts closed so the card opens to a calm list, not a wall.
const sectionStyle: React.CSSProperties = { marginTop: 12, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 16 };
const subSummary: React.CSSProperties = { cursor: 'pointer', fontWeight: 600, color: C.textMuted, fontSize: 14 };

const TrackConfigEditor = ({ track, onSaved }: { track: Track; onSaved: (t: Track) => void }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [medalFile, setMedalFile] = useState<File | null>(null);
  const [nameX, setNameX] = useState(track.cert_name_x);
  const [nameY, setNameY] = useState(track.cert_name_y);
  const [fontSize, setFontSize] = useState(track.cert_name_font_size);
  const [color, setColor] = useState(track.cert_name_color);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const fd = new FormData();
    fd.append('cert_name_x', String(nameX));
    fd.append('cert_name_y', String(nameY));
    fd.append('cert_name_font_size', String(fontSize));
    fd.append('cert_name_color', color);
    if (certFile) fd.append('certificate_template', certFile);
    if (svgFile) fd.append('certificate_svg', svgFile);
    if (medalFile) fd.append('medal_image', medalFile);

    const res = await tracksApi.updateConfig(track.slug, fd);
    setSaving(false);
    if (res.ok) {
      setMsg('Guardado.');
      setCertFile(null);
      setSvgFile(null);
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
      style={{ marginTop: 12, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 16 }}
    >
      <summary style={advancedSummary}>
        Certificado y medalla de la ruta
      </summary>

      <form onSubmit={handleSave} style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 12px' }}>
          Certificado
        </h3>
        <div style={fieldRow}>
          <span style={labelStyle}>Plantilla (SVG)</span>
          <input type="file" accept="image/svg+xml,.svg" onChange={(e) => setSvgFile(e.target.files?.[0] || null)} />
          {track.certificate_svg_url && (
            <a href={track.certificate_svg_url} target="_blank" rel="noreferrer" style={{ color: C.accent }}>
              Ver actual
            </a>
          )}
        </div>
        <p style={{ color: C.textFaint, fontSize: 13, margin: '0 0 12px' }}>
          Usa <code>{'{{NAME}}'}</code> en el SVG donde debe ir el nombre. Si subes un SVG, tiene
          prioridad sobre el PNG y los campos de posición/fuente/color de abajo se ignoran
          (vienen del propio SVG). Incrusta las fuentes en el SVG para que el nombre se vea bien.
        </p>
        <div style={fieldRow}>
          <span style={labelStyle}>Plantilla (PNG)</span>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
          {track.certificate_template_url && (
            <a href={track.certificate_template_url} target="_blank" rel="noreferrer" style={{ color: C.accent }}>
              Ver actual
            </a>
          )}
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Posición X del nombre</span>
          <input style={inputStyle} type="number" value={nameX} onChange={(e) => setNameX(Number(e.target.value))} />
          <span style={{ color: C.textFaint, fontSize: 13 }}>px desde la izquierda (centro del texto)</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Posición Y del nombre</span>
          <input style={inputStyle} type="number" value={nameY} onChange={(e) => setNameY(Number(e.target.value))} />
          <span style={{ color: C.textFaint, fontSize: 13 }}>px desde arriba (centro del texto)</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Tamaño de fuente</span>
          <input style={inputStyle} type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          <span style={{ color: C.textFaint, fontSize: 13 }}>px</span>
        </div>
        <div style={fieldRow}>
          <span style={labelStyle}>Color del nombre</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 60, height: 36 }} />
          <input style={{ ...inputStyle, width: 100 }} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <h3 style={{ fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, margin: '24px 0 12px' }}>
          Medalla
        </h3>
        <div style={fieldRow}>
          <span style={labelStyle}>Imagen</span>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => setMedalFile(e.target.files?.[0] || null)} />
          {track.medal_image_url && (
            <img src={track.medal_image_url} alt="" style={{ height: 60, borderRadius: 4 }} />
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: C.accent, color: '#fff', border: 'none', padding: '10px 28px',
              borderRadius: 4, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {msg && <span style={{ color: msg.startsWith('Error') ? C.danger : C.green }}>{msg}</span>}
        </div>
      </form>
    </details>
  );
};

const TrackDetailsForm = ({
  track,
  onSaved,
  onCancel,
}: {
  track: Track | null;
  onSaved: (t: Track) => void;
  onCancel?: () => void;
}) => {
  const [form, setForm] = useState<TrackWritePayload>({
    name: track?.name ?? '',
    slug: track?.slug ?? '',
    subtitle: track?.subtitle ?? '',
    cta_heading: track?.cta_heading ?? '',
    description: track?.description ?? '',
    is_published: track?.is_published ?? true,
    is_featured: track?.is_featured ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof TrackWritePayload>(key: K, value: TrackWritePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = track
      ? { ...form, slug: undefined } // slug is fixed after creation
      : { ...form, slug: form.slug?.trim() || slugify(form.name) };
    const res = track
      ? await tracksApi.updateTrack(track.slug, payload)
      : await tracksApi.createTrack(payload);
    setSaving(false);
    if (res.ok) onSaved(res.data);
    else setError('Error al guardar. ¿Slug duplicado?');
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, padding: 16, borderRadius: 6, marginTop: 12 }}>
      <div style={fieldRow}>
        <span style={labelStyle}>Nombre</span>
        <input style={{ ...inputStyle, flex: 1 }} value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>
      {!track && (
        <div style={fieldRow}>
          <span style={labelStyle}>Slug (URL)</span>
          <input style={{ ...inputStyle, flex: 1 }} value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="se genera del nombre si lo dejas vacío" />
        </div>
      )}
      <div style={fieldRow}>
        <span style={labelStyle}>Subtítulo</span>
        <input style={{ ...inputStyle, flex: 1 }} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
      </div>
      <div style={fieldRow}>
        <span style={labelStyle}>Encabezado CTA</span>
        <input style={{ ...inputStyle, flex: 1 }} value={form.cta_heading} onChange={(e) => set('cta_heading', e.target.value)} placeholder='Ej. "Continúa con tu certificación en IA"' />
      </div>
      <div style={{ ...fieldRow, alignItems: 'flex-start' }}>
        <span style={labelStyle}>Descripción</span>
        <textarea style={{ ...inputStyle, flex: 1, minHeight: 80 }} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div style={fieldRow}>
        <span style={labelStyle}>Publicado</span>
        <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
        <span style={{ ...labelStyle, width: 'auto' }}>Destacado (hero del dashboard)</span>
        <input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
      </div>
      {error && <p style={{ color: C.danger, marginLeft: 212 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          type="submit"
          disabled={saving}
          style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 22px', borderRadius: 4, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Guardando…' : track ? 'Guardar cambios' : 'Crear ruta'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ background: 'none', border: `1px solid ${C.border}`, color: C.text, padding: '8px 22px', borderRadius: 4, cursor: 'pointer' }}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

const TrackCoursesEditor = ({
  track,
  catalog,
  onSaved,
}: {
  track: Track;
  catalog: CourseOption[];
  onSaved: (t: Track) => void;
}) => {
  const [items, setItems] = useState(
    [...track.courses]
      .sort((a, b) => a.order_index - b.order_index)
      .map((c) => ({ course_id: c.course_id, title: c.title, deadline_label: c.deadline_label })),
  );
  const [addId, setAddId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const addCourse = () => {
    const id = Number(addId);
    const course = catalog.find((c) => c.id === id);
    if (!course || items.some((it) => it.course_id === id)) return;
    setItems([...items, { course_id: id, title: course.title, deadline_label: '' }]);
    setAddId('');
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await tracksApi.setCourses(
      track.slug,
      items.map(({ course_id, deadline_label }) => ({ course_id, deadline_label })),
    );
    setSaving(false);
    if (res.ok) {
      setMsg('Guardado.');
      onSaved(res.data);
    } else {
      setMsg('Error al guardar.');
    }
  };

  const available = catalog.filter((c) => !items.some((it) => it.course_id === c.id));

  // When a Workshop owns this ruta, the workshop path is the source of truth:
  // show the courses read-only and point the admin to /admin/workshops.
  if (track.managed_by_workshop) {
    const w = track.managed_by_workshop;
    const ordered = [...track.courses].sort((a, b) => a.order_index - b.order_index);
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ background: 'rgba(253,106,68,0.08)', border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
          Los cursos de esta ruta se administran desde <strong style={{ color: C.text }}>Workshops → {w.name} → Ruta de aprendizaje</strong>. Aquí se muestran solo para referencia (se usan en los correos automáticos).
        </div>
        {ordered.length === 0 ? (
          <p style={{ color: C.textFaint }}>Sin cursos.</p>
        ) : ordered.map((c, i) => (
          <div key={c.course_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 24, textAlign: 'right', color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
            <span style={{ flex: 1, color: C.text }}>{c.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      {items.length === 0 && <p style={{ color: C.textFaint }}>Esta ruta todavía no tiene cursos. Agrega el primero abajo.</p>}
      {items.map((it, i) => (
        <div key={it.course_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 24, textAlign: 'right', color: C.textFaint, fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
          <button onClick={() => move(i, -1)} disabled={i === 0} title="Subir" style={{ border: `1px solid ${C.border}`, color: C.text, background: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>↑</button>
          <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Bajar" style={{ border: `1px solid ${C.border}`, color: C.text, background: 'none', borderRadius: 4, cursor: 'pointer', padding: '2px 8px' }}>↓</button>
          <span style={{ flex: 1, color: C.text }}>{it.title}</span>
          <input
            style={{ ...inputStyle, width: 240 }}
            value={it.deadline_label}
            placeholder='Fecha límite, ej. "Antes del 30 de junio"'
            onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, deadline_label: e.target.value } : x)))}
          />
          <button onClick={() => setItems(items.filter((_, j) => j !== i))} title="Quitar de la ruta" style={{ border: `1px solid ${C.dangerBorder}`, color: C.danger, background: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 10px' }}>
            Quitar
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <select style={inputStyle} value={addId} onChange={(e) => setAddId(e.target.value)}>
          <option value="" style={optionStyle}>— Elegir un curso para agregar —</option>
          {available.map((c) => (
            <option key={c.id} value={c.id} style={optionStyle}>{c.title}</option>
          ))}
        </select>
        <button onClick={addCourse} disabled={!addId} style={{ border: `1px solid ${C.border}`, color: C.text, background: 'none', borderRadius: 4, cursor: 'pointer', padding: '8px 14px' }}>
          Agregar a la ruta
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={save}
          disabled={saving}
          style={{ background: C.accent, color: '#fff', border: 'none', padding: '8px 22px', borderRadius: 4, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Guardando…' : 'Guardar cursos'}
        </button>
        {msg && <span style={{ color: msg.startsWith('Error') ? C.danger : C.green }}>{msg}</span>}
      </div>
      <p style={{ color: C.textFaint, fontSize: 13, marginTop: 8 }}>
        El orden de arriba es el orden de la ruta: la persona desbloquea el siguiente curso al terminar el anterior.
      </p>
    </div>
  );
};


const subLabel: React.CSSProperties = { margin: '16px 0 8px', fontSize: 14, color: C.text, fontWeight: 700 };

// Rellena los placeholders {{ ... }} con datos de ejemplo, solo para la vista previa.
const fillSample = (s: string, track: Track, firstCourse: string, total: number) =>
  (s || '')
    .replace(/\{\{\s*track_name\s*\}\}/g, track.name)
    .replace(/\{\{\s*user_name\s*\}\}/g, 'María')
    .replace(/\{\{\s*next_course_title\s*\}\}/g, firstCourse)
    .replace(/\{\{\s*course_title\s*\}\}/g, firstCourse)
    .replace(/\{\{\s*total\s*\}\}/g, String(total))
    .replace(/\{\{\s*completed\s*\}\}/g, '0');

// --- Línea de tiempo de los correos automáticos ----------------------------
// Read-only summary of every TrackEmail in journey order: qué lo dispara,
// cuándo se envía exactamente, estado y envíos. Los editores de abajo siguen
// siendo donde se cambia el contenido.

const TRIGGER_LABEL: Record<TrackEmailTrigger, string> = {
  track_enrolled: 'Al entrar a la ruta',
  workshop_attended: 'Al asistir al workshop',
  course_not_started: 'Curso habilitado sin iniciar',
  course_inactive: 'Curso iniciado sin terminar',
  course_completed: 'Al completar un curso',
  track_completed: 'Al completar toda la ruta',
};

const plural = (n: number) => (n === 1 ? 'día' : 'días');

// Exact send semantics, mirroring the backend: track_enrolled /
// course_completed / track_completed send instantly from signals;
// workshop_attended / course_not_started / course_inactive are picked up by
// the hourly cron and delivered at 10 AM in the user's local timezone.
const timingOf = (e: TrackEmail): string => {
  switch (e.trigger) {
    case 'track_enrolled':
      return 'Inmediato, en cuanto la persona entra a la ruta.';
    case 'workshop_attended':
      return 'A las 10 AM (hora local de la persona) después de marcarse su asistencia.';
    case 'course_not_started':
      return `${e.days_after} ${plural(e.days_after)} después de habilitarse el curso sin haberlo iniciado, a las 10 AM (hora local).`;
    case 'course_inactive':
      return `${e.days_after} ${plural(e.days_after)} después de iniciar el curso sin haberlo terminado, a las 10 AM (hora local).`;
    case 'course_completed':
      return 'Inmediato, en cuanto la persona completa el curso.';
    case 'track_completed':
      return 'Inmediato, en cuanto la persona completa toda la ruta.';
  }
};

const TrackEmailTimeline = ({ track }: { track: Track }) => {
  const [emails, setEmails] = useState<TrackEmail[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.listEmails(track.slug);
      if (cancelled) return;
      setEmails(res.ok ? res.data : []);
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  if (emails === undefined) return <p style={{ color: C.textFaint, fontSize: 13 }}>Cargando…</p>;
  if (emails.length === 0) return <p style={{ color: C.textFaint, fontSize: 13 }}>Esta ruta no tiene correos configurados.</p>;

  // Chronological order of the journey: welcome → workshop → per-course
  // (recordatorio de inicio → refuerzo → felicitaciones) → cierre de ruta.
  const courseRank = new Map<number, number>();
  [...track.courses].sort((a, b) => a.order_index - b.order_index)
    .forEach((c, i) => courseRank.set(c.course_id, i));
  const key = (e: TrackEmail): number => {
    const cr = e.course != null ? (courseRank.get(e.course) ?? 98) : -1;
    switch (e.trigger) {
      case 'track_enrolled': return 0;
      case 'workshop_attended': return 1;
      case 'course_not_started': return 1000 + (cr + 1) * 10;
      case 'course_inactive': return 1001 + (cr + 1) * 10;
      case 'course_completed': return 1002 + (cr + 1) * 10;
      case 'track_completed': return 100000;
    }
  };
  const sorted = [...emails].sort((a, b) => key(a) - key(b));

  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ margin: '0 0 12px', color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
        Recorrido completo de los correos, en el orden en que le llegan a una persona.
        Cada quien recibe cada correo una sola vez; los que dicen «10 AM (hora local)» se
        revisan cada hora y se entregan a esa hora según el país de la persona.
      </p>
      <div style={{ paddingLeft: 18, borderLeft: `2px solid ${C.borderSoft}` }}>
        {sorted.map((e) => (
          <div key={e.id} style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{
              position: 'absolute', left: -25, top: 3, width: 11, height: 11,
              borderRadius: '50%', background: e.is_active ? C.green : 'rgba(255,255,255,0.25)',
            }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={badge(C.textMuted, 'rgba(255,255,255,0.08)')}>{TRIGGER_LABEL[e.trigger]}</span>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{e.name}</span>
              {e.course_title && <span style={{ color: C.textMuted, fontSize: 13 }}>· {e.course_title}</span>}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: e.is_active ? C.green : C.textFaint }}>
                {e.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <span style={{ fontSize: 12, color: C.textFaint }}>· enviado a {e.sent_count}</span>
              {e.last_sent_at && (
                <span style={{ fontSize: 12, color: C.textFaint }}>· último {fmtSent(e.last_sent_at)}</span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: C.textFaint, lineHeight: 1.5 }}>
              {timingOf(e)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Interruptor on/off del correo de bienvenida (track_enrolled) + vista previa.
const EnrollEmailPanel = ({ track }: { track: Track }) => {
  const [email, setEmail] = useState<TrackEmail | null | undefined>(undefined); // undefined = cargando
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.listEmails(track.slug);
      if (cancelled) return;
      setEmail(res.ok ? (res.data.find((e) => e.trigger === 'track_enrolled') ?? null) : null);
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  if (email === undefined) return <p style={{ color: C.textFaint, fontSize: 13 }}>Cargando…</p>;
  if (email === null) return <p style={{ color: C.textFaint, fontSize: 13 }}>Esta ruta no tiene configurado un correo de bienvenida.</p>;

  const firstCourse = [...track.courses].sort((a, b) => a.order_index - b.order_index)[0]?.title || 'tu primer curso';
  const total = track.courses.length || track.total_count;
  const subject = fillSample(email.subject, track, firstCourse, total);
  const bodyHtml = DOMPurify.sanitize(fillSample(email.body, track, firstCourse, total));
  const ctaLabel = email.cta_label || 'Empezar';
  const isFullDoc = /^\s*(<!doctype|<html)/i.test(email.body || '');
  const filledDoc = fillSample(email.body, track, firstCourse, total);

  const toggle = async () => {
    setSaving(true);
    setMsg(null);
    const next = !email.is_active;
    const res = await tracksApi.updateEmail(track.slug, email.id, { is_active: next });
    setSaving(false);
    if (res.ok) {
      setEmail(res.data);
      setMsg(next ? 'Activado.' : 'Desactivado.');
    } else {
      setMsg('No se pudo guardar.');
    }
  };

  return (
    <div>
      <div style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: saving ? 'wait' : 'pointer', flexWrap: 'wrap' }}>
          <input type="checkbox" checked={email.is_active} disabled={saving} onChange={toggle} style={{ width: 20, height: 20 }} />
          <span style={{ fontWeight: 700, color: email.is_active ? C.green : C.text }}>
            {email.is_active ? 'Activado' : 'Desactivado'}
          </span>
          <span style={{ color: C.textMuted }}>— enviar este correo solo, cuando alguien entra a la ruta</span>
          {saving && <span style={{ color: C.textFaint, fontSize: 13 }}>guardando…</span>}
          {msg && <span style={{ color: C.green, fontSize: 13 }}>{msg}</span>}
        </label>
        <p style={{ margin: '10px 0 0', color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
          Solo afecta a quienes entren de ahora en adelante. A quienes ya están inscritos no les llega solo.
        </p>
        <p style={{ margin: '8px 0 0', color: C.textFaint, fontSize: 13 }}>
          Enviado a {email.sent_count}{email.last_sent_at ? ` · último envío ${fmtSent(email.last_sent_at)}` : ''}
        </p>
      </div>

      <details open>
      <summary style={advancedSummary}>Vista previa del correo (datos de ejemplo)</summary>
      <div style={{ marginTop: 12 }}>
      {isFullDoc ? (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: '#0E4B43', color: '#fff', padding: '12px 16px', fontSize: 14, fontWeight: 600, borderRadius: '8px 8px 0 0' }}>
            Asunto: {subject}
          </div>
          <iframe
            title="Vista previa del correo"
            sandbox=""
            srcDoc={filledDoc}
            style={{ width: '100%', height: 780, border: '1px solid #e2e2e2', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#fff', display: 'block' }}
          />
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e2e2', borderRadius: 8, overflow: 'hidden', maxWidth: 560 }}>
          <div style={{ background: '#0E4B43', color: '#fff', padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
            Asunto: {subject}
          </div>
          <div style={{ padding: 20, background: '#fff' }}>
            <p style={{ margin: '0 0 14px', color: '#222', fontSize: 14 }}>Hola María,</p>
            <div style={{ color: '#333', fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            <div style={{ marginTop: 18 }}>
              <span style={{ display: 'inline-block', background: '#FD6A44', color: '#fff', padding: '10px 20px', borderRadius: 4, fontWeight: 600, fontSize: 14 }}>
                {ctaLabel}
              </span>
            </div>
          </div>
        </div>
      )}
      </div>
      </details>
    </div>
  );
};

// --- Correos de refuerzo (course_inactive) ---------------------------------
// Se envían "N días después de empezar un curso sin terminarlo". El admin pega
// o sube el HTML de una plantilla de Mailchimp; el backend limpia las etiquetas
// de Mailchimp al guardar. Una fila por curso de la ruta.

const RefuerzoCourseRow = ({
  track, course, index, email, onSaved,
}: {
  track: Track;
  course: TrackCourse;
  index: number;
  email: TrackEmail | null;
  onSaved: (e: TrackEmail) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(email?.subject ?? '');
  const [previewText, setPreviewText] = useState(email?.preview_text ?? '');
  const [body, setBody] = useState(email?.body ?? '');
  const [daysAfter, setDaysAfter] = useState<number>(email?.days_after ?? 3);
  const [active, setActive] = useState(email?.is_active ?? false);
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const payload: TrackEmailPayload = {
      trigger: 'course_inactive',
      course: course.course_id,
      days_after: Number(daysAfter) || 3,
      name: `Refuerzo cierre: ${course.title}`,
      subject,
      preview_text: previewText,
      body,
      cta_label: email?.cta_label ?? '',
      is_active: active,
    };
    const res = email
      ? await tracksApi.updateEmail(track.slug, email.id, payload)
      : await tracksApi.createEmail(track.slug, payload);
    setSaving(false);
    if (res.ok) {
      // Mirror the saved (and server-cleaned) values back into the form so the
      // preview/dirty state reflect what will actually be sent.
      onSaved(res.data);
      setSubject(res.data.subject);
      setPreviewText(res.data.preview_text);
      setBody(res.data.body);
      setDaysAfter(res.data.days_after);
      setActive(res.data.is_active);
      setMsg('Guardado.');
    } else {
      setMsg('No se pudo guardar.');
    }
  };

  const sendTest = async () => {
    if (!email) return;
    setTesting(true);
    setMsg(null);
    const res = await tracksApi.testEmail(track.slug, email.id, testTo.trim() || undefined);
    setTesting(false);
    setMsg(res.data?.detail || (res.ok ? 'Correo de prueba enviado.' : 'No se pudo enviar la prueba.'));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBody(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  };

  const total = track.courses.length || track.total_count;
  const subjectPreview = fillSample(subject, track, course.title, total);
  const filledBody = fillSample(body, track, course.title, total);
  const isFullDoc = /^\s*(<!doctype|<html)/i.test(body || '');
  const dirty =
    !email ||
    subject !== email.subject ||
    previewText !== email.preview_text ||
    body !== email.body ||
    Number(daysAfter) !== email.days_after ||
    active !== email.is_active;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 0, textAlign: 'left' }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: active ? C.green : C.textFaint, flex: '0 0 auto' }} />
        <span style={{ fontWeight: 700 }}>Curso {index + 1} · {course.title}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: active ? C.green : C.textFaint }}>{active ? 'Activo' : 'Inactivo'}</span>
        {email && <span style={{ fontSize: 12, color: C.textFaint }}>· enviado a {email.sent_count}</span>}
        {email?.last_sent_at && <span style={{ fontSize: 12, color: C.textFaint }}>· último envío {fmtSent(email.last_sent_at)}</span>}
        <span style={{ color: C.textFaint }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {body ? (
            <div style={{ maxWidth: 620 }}>
              <div style={{ background: '#0E4B43', color: '#fff', padding: '12px 16px', fontSize: 14, fontWeight: 600, borderRadius: '8px 8px 0 0' }}>
                Asunto: {subjectPreview}
              </div>
              {isFullDoc ? (
                <iframe title="Vista previa" sandbox="" srcDoc={filledBody}
                  style={{ width: '100%', height: 780, border: '1px solid #e2e2e2', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#fff', display: 'block' }} />
              ) : (
                <div style={{ padding: 20, background: '#fff', border: '1px solid #e2e2e2', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                  <p style={{ margin: '0 0 14px', color: '#222', fontSize: 14 }}>Hola María,</p>
                  <div style={{ color: '#333', fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(filledBody) }} />
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: C.textFaint, fontSize: 13 }}>Sin plantilla todavía. Abre «Editar contenido» para agregar el HTML.</p>
          )}

          {email && <RecipientsPreview slug={track.slug} emailId={email.id} />}

          <details style={{ marginTop: 14 }}>
            <summary style={subSummary}>Editar contenido</summary>
            <div style={{ marginTop: 12 }}>
              <div style={fieldRow}>
                <label style={labelStyle}>Asunto</label>
                <input style={{ ...inputStyle, flex: 1 }} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{{ user_name }}, te faltó poco…" />
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Texto de vista previa</label>
                <input style={{ ...inputStyle, flex: 1 }} value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Se muestra en la bandeja tras el asunto (opcional)" />
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Enviar a los … días</label>
                <input type="number" min={1} style={{ ...inputStyle, width: 90 }} value={daysAfter} onChange={(e) => setDaysAfter(Number(e.target.value))} />
                <span style={{ color: C.textFaint, fontSize: 13 }}>de empezar el curso sin terminarlo</span>
              </div>

              <p style={subLabel}>Plantilla (HTML de Mailchimp)</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['paste', 'file'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ border: `1px solid ${mode === m ? C.accent : C.borderSoft}`, background: 'none', color: mode === m ? C.accent : C.textFaint, borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {m === 'paste' ? 'Pegar HTML' : 'Subir .html'}
                  </button>
                ))}
              </div>
              {mode === 'paste' ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Pega aquí el código HTML de tu plantilla de Mailchimp…"
                  style={{ ...inputStyle, width: '100%', minHeight: 160, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              ) : (
                <input type="file" accept=".html,text/html" onChange={onFile} style={{ color: C.textMuted, fontSize: 13 }} />
              )}
              <p style={{ margin: '8px 0 0', color: C.textFaint, fontSize: 12, lineHeight: 1.5 }}>
                Usa <code>{'{{ user_name }}'}</code> para el nombre y <code>{'{{ cta_url }}'}</code> como enlace del botón para continuar el curso. Las etiquetas de Mailchimp (<code>*|FNAME|*</code>, pie de página, etc.) se limpian al guardar.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                  <span style={{ color: active ? C.green : C.text, fontWeight: 600 }}>Activo (se envía automáticamente)</span>
                </label>
                <span style={{ flex: 1 }} />
                <button onClick={save} disabled={saving || !subject || !body}
                  style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: saving ? 'wait' : 'pointer', fontWeight: 600, opacity: (!subject || !body) ? 0.5 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="correo de prueba (vacío = a ti)"
                  style={{ ...inputStyle, width: 230 }}
                />
                <button onClick={sendTest} disabled={!email || testing || dirty} title={dirty ? 'Guarda primero' : (testTo.trim() ? `Enviar prueba a ${testTo.trim()}` : 'Te enviamos una prueba a tu correo')}
                  style={{ background: 'none', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 16px', cursor: (!email || dirty) ? 'not-allowed' : 'pointer', opacity: (!email || dirty) ? 0.5 : 1 }}>
                  {testing ? 'Enviando…' : 'Enviar prueba'}
                </button>
              </div>
              {msg && <p style={{ margin: '10px 0 0', color: C.green, fontSize: 13 }}>{msg}</p>}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

const RefuerzoEmailsPanel = ({ track }: { track: Track }) => {
  const [emails, setEmails] = useState<TrackEmail[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.listEmails(track.slug);
      if (cancelled) return;
      setEmails(res.ok ? res.data.filter((e) => e.trigger === 'course_inactive') : []);
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  if (emails === undefined) return <p style={{ color: C.textFaint, fontSize: 13 }}>Cargando…</p>;

  const courses = [...track.courses].sort((a, b) => a.order_index - b.order_index);
  if (courses.length === 0) {
    return <p style={{ color: C.textFaint, fontSize: 13 }}>Agrega cursos a la ruta para configurar sus correos de refuerzo.</p>;
  }

  const byCourse = new Map<number, TrackEmail>();
  for (const e of emails) if (e.course != null) byCourse.set(e.course, e);

  const onSaved = (saved: TrackEmail) => {
    setEmails((cur) => [...(cur ?? []).filter((e) => e.id !== saved.id), saved]);
  };

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
        Se envía solo, unos días después de que la persona empieza un curso y no lo termina
        (revisión diaria · cada quien lo recibe una sola vez).
      </p>
      {courses.map((c, i) => (
        <RefuerzoCourseRow key={c.course_id} track={track} course={c} index={i}
          email={byCourse.get(c.course_id) ?? null} onSaved={onSaved} />
      ))}
    </div>
  );
};

// --- Correos de contenido de la ruta --------------------------------------
// Inicio (al asistir al workshop), recordatorio de inicio del siguiente curso,
// felicitaciones al completar y cierre de ruta. Cada registro ya existe; aquí el
// admin pega el HTML de su plantilla de Mailchimp, lo activa y envía una prueba.
// El backend limpia las etiquetas de Mailchimp (incluido el enlace de baja) al
// guardar.

const JourneyEmailRow = ({ track, email, onSaved }: {
  track: Track;
  email: TrackEmail;
  onSaved: (e: TrackEmail) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(email.subject);
  const [previewText, setPreviewText] = useState(email.preview_text);
  const [body, setBody] = useState(email.body);
  const [daysAfter, setDaysAfter] = useState<number>(email.days_after);
  const [active, setActive] = useState(email.is_active);
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const isStartReminder = email.trigger === 'course_not_started';

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const payload: Partial<TrackEmailPayload> = {
      subject,
      preview_text: previewText,
      body,
      is_active: active,
      ...(isStartReminder ? { days_after: Number(daysAfter) || 3 } : {}),
    };
    const res = await tracksApi.updateEmail(track.slug, email.id, payload);
    setSaving(false);
    if (res.ok) {
      onSaved(res.data);
      setSubject(res.data.subject);
      setPreviewText(res.data.preview_text);
      setBody(res.data.body);
      setDaysAfter(res.data.days_after);
      setActive(res.data.is_active);
      setMsg('Guardado.');
    } else {
      setMsg('No se pudo guardar.');
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setMsg(null);
    const res = await tracksApi.testEmail(track.slug, email.id, testTo.trim() || undefined);
    setTesting(false);
    setMsg(res.data?.detail || (res.ok ? 'Correo de prueba enviado.' : 'No se pudo enviar la prueba.'));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBody(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  };

  const total = track.courses.length || track.total_count;
  const sampleCourse = email.course_title
    || [...track.courses].sort((a, b) => a.order_index - b.order_index)[0]?.title
    || 'tu curso';
  const subjectPreview = fillSample(subject, track, sampleCourse, total);
  const filledBody = fillSample(body, track, sampleCourse, total);
  const isFullDoc = /^\s*(<!doctype|<html)/i.test(body || '');
  const dirty =
    subject !== email.subject ||
    previewText !== email.preview_text ||
    body !== email.body ||
    active !== email.is_active ||
    (isStartReminder && Number(daysAfter) !== email.days_after);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 0, textAlign: 'left' }}
      >
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: active ? C.green : C.textFaint, flex: '0 0 auto' }} />
        <span style={{ fontWeight: 700 }}>{email.name}</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: active ? C.green : C.textFaint }}>{active ? 'Activo' : 'Inactivo'}</span>
        <span style={{ fontSize: 12, color: C.textFaint }}>· enviado a {email.sent_count}</span>
        {email.last_sent_at && <span style={{ fontSize: 12, color: C.textFaint }}>· último envío {fmtSent(email.last_sent_at)}</span>}
        <span style={{ color: C.textFaint }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {body ? (
            <div style={{ maxWidth: 620 }}>
              <div style={{ background: '#0E4B43', color: '#fff', padding: '12px 16px', fontSize: 14, fontWeight: 600, borderRadius: '8px 8px 0 0' }}>
                Asunto: {subjectPreview}
              </div>
              {isFullDoc ? (
                <iframe title="Vista previa" sandbox="" srcDoc={filledBody}
                  style={{ width: '100%', height: 780, border: '1px solid #e2e2e2', borderTop: 'none', borderRadius: '0 0 8px 8px', background: '#fff', display: 'block' }} />
              ) : (
                <div style={{ padding: 20, background: '#fff', border: '1px solid #e2e2e2', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                  <p style={{ margin: '0 0 14px', color: '#222', fontSize: 14 }}>Hola María,</p>
                  <div style={{ color: '#333', fontSize: 14, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(filledBody) }} />
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: C.textFaint, fontSize: 13 }}>Sin plantilla todavía. Abre «Editar contenido» para agregar el HTML.</p>
          )}

          <RecipientsPreview slug={track.slug} emailId={email.id} />

          <details style={{ marginTop: 14 }}>
            <summary style={subSummary}>Editar contenido</summary>
            <div style={{ marginTop: 12 }}>
              <div style={fieldRow}>
                <label style={labelStyle}>Asunto</label>
                <input style={{ ...inputStyle, flex: 1 }} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div style={fieldRow}>
                <label style={labelStyle}>Texto de vista previa</label>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Se muestra en la bandeja tras el asunto (opcional)"
                />
              </div>
              {isStartReminder && (
                <div style={fieldRow}>
                  <label style={labelStyle}>Enviar a los … días</label>
                  <input type="number" min={1} style={{ ...inputStyle, width: 90 }} value={daysAfter} onChange={(e) => setDaysAfter(Number(e.target.value))} />
                  <span style={{ color: C.textFaint, fontSize: 13 }}>de habilitarse el curso sin empezarlo</span>
                </div>
              )}

              <p style={subLabel}>Plantilla (HTML de Mailchimp)</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {(['paste', 'file'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ border: `1px solid ${mode === m ? C.accent : C.borderSoft}`, background: 'none', color: mode === m ? C.accent : C.textFaint, borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {m === 'paste' ? 'Pegar HTML' : 'Subir .html'}
                  </button>
                ))}
              </div>
              {mode === 'paste' ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Pega aquí el código HTML de tu plantilla de Mailchimp…"
                  style={{ ...inputStyle, width: '100%', minHeight: 160, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                />
              ) : (
                <input type="file" accept=".html,text/html" onChange={onFile} style={{ color: C.textMuted, fontSize: 13 }} />
              )}
              <p style={{ margin: '8px 0 0', color: C.textFaint, fontSize: 12, lineHeight: 1.5 }}>
                Usa <code>{'{{ user_name }}'}</code> para el nombre. Las etiquetas de Mailchimp (<code>*|FNAME|*</code>, script de seguimiento, enlace de baja) se limpian al guardar.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                  <span style={{ color: active ? C.green : C.text, fontWeight: 600 }}>Activo (se envía automáticamente)</span>
                </label>
                <span style={{ flex: 1 }} />
                <button onClick={save} disabled={saving || !subject || !body}
                  style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: saving ? 'wait' : 'pointer', fontWeight: 600, opacity: (!subject || !body) ? 0.5 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="correo de prueba (vacío = a ti)"
                  style={{ ...inputStyle, width: 230 }}
                />
                <button onClick={sendTest} disabled={testing || dirty} title={dirty ? 'Guarda primero' : (testTo.trim() ? `Enviar prueba a ${testTo.trim()}` : 'Te enviamos una prueba a tu correo')}
                  style={{ background: 'none', color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 16px', cursor: dirty ? 'not-allowed' : 'pointer', opacity: dirty ? 0.5 : 1 }}>
                  {testing ? 'Enviando…' : 'Enviar prueba'}
                </button>
              </div>
              {msg && <p style={{ margin: '10px 0 0', color: C.green, fontSize: 13 }}>{msg}</p>}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

const JourneyContentEmailsPanel = ({ track }: { track: Track }) => {
  const [emails, setEmails] = useState<TrackEmail[] | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.listEmails(track.slug);
      if (cancelled) return;
      const wanted = new Set<TrackEmailTrigger>(['workshop_attended', 'course_not_started', 'course_completed', 'track_completed']);
      setEmails(res.ok ? res.data.filter((e) => wanted.has(e.trigger)) : []);
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  if (emails === undefined) return <p style={{ color: C.textFaint, fontSize: 13 }}>Cargando…</p>;
  if (emails.length === 0) return <p style={{ color: C.textFaint, fontSize: 13 }}>Esta ruta no tiene estos correos configurados.</p>;

  const courseRank = new Map<number, number>();
  [...track.courses].sort((a, b) => a.order_index - b.order_index).forEach((c, i) => courseRank.set(c.course_id, i));
  const rank = (e: TrackEmail) => {
    const cr = e.course != null ? (courseRank.get(e.course) ?? 9) : 0;
    if (e.trigger === 'workshop_attended') return 0;
    if (e.trigger === 'course_not_started') return 100 + cr;
    if (e.trigger === 'course_completed') return 200 + cr;
    return 900; // track_completed
  };
  const sorted = [...emails].sort((a, b) => rank(a) - rank(b));
  const onSaved = (saved: TrackEmail) => setEmails((cur) => (cur ?? []).map((e) => (e.id === saved.id ? saved : e)));

  return (
    <div>
      <p style={{ margin: '0 0 12px', color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
        Pega el HTML de cada plantilla de Mailchimp, actívala y envíate una prueba. Se envían solos
        según el avance de cada persona (revisión diaria · cada quien lo recibe una sola vez).
      </p>
      {sorted.map((e) => <JourneyEmailRow key={e.id} track={track} email={e} onSaved={onSaved} />)}
    </div>
  );
};

const Bar = ({ label, value, max, color, onClick, active }: {
  label: string; value: number; max: number; color: string;
  onClick?: () => void; active?: boolean;
}) => {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      onClick={onClick}
      title={onClick ? 'Ver las personas de este grupo' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10,
        cursor: onClick ? 'pointer' : undefined,
        padding: '2px 6px', borderRadius: 4,
        background: active ? 'rgba(253, 106, 68, 0.12)' : undefined,
        outline: active ? `1px solid ${C.accent}` : undefined,
      }}
    >
      <span style={{ width: 200, color: C.textMuted, fontSize: 14 }}>{label}</span>
      <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.12)', height: 24, borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ width: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.text, fontWeight: 600 }}>
        {value} ({pct}%)
      </span>
    </div>
  );
};

const bucketLabel = (n: number, total: number) =>
  n === 0 ? '0 cursos · sin empezar'
  : n === total ? `${n} cursos · terminaron todo`
  : `${n} curso${n > 1 ? 's' : ''} terminado${n > 1 ? 's' : ''}`;

const TrackStats = ({ slug, stats, error }: { slug: string; stats: TrackEngagement | null; error: string | null }) => {
  const [bucket, setBucket] = useState<string>('all');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState<string | null>(null);
  // Drill-down: the people behind the clicked bar ('all' | '0'..'N'), fetched
  // on demand. peopleBucket === null means no bar is selected.
  const [peopleBucket, setPeopleBucket] = useState<string | null>(null);
  const [people, setPeople] = useState<TrackEngagementUser[] | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');

  if (error) return <p style={{ color: C.danger }}>{error}</p>;
  if (!stats) return <p style={{ color: C.textFaint }}>Cargando…</p>;

  const showPeople = async (b: string) => {
    if (peopleBucket === b) { setPeopleBucket(null); setPeople(null); return; }
    setPeopleBucket(b);
    setBucket(b); // keep the CSV selector in sync with what's on screen
    setPeopleFilter('');
    setPeopleLoading(true);
    const res = await tracksApi.engagementUsers(slug, b === 'all' ? 'all' : Number(b));
    setPeopleLoading(false);
    setPeople(res.ok && res.data ? res.data.users : null);
  };

  const downloadCsv = async () => {
    setDownloading(true); setDlError(null);
    const res = await tracksApi.downloadEngagementCsv(slug, bucket === 'all' ? 'all' : Number(bucket));
    setDownloading(false);
    if (!res.ok || !res.blob) { setDlError('No se pudo generar el CSV.'); return; }
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailchimp-${slug}-${bucket === 'all' ? 'todos' : `${bucket}-cursos`}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 20, color: C.text }}>
        <div
          onClick={() => showPeople('all')}
          title="Ver a todas las personas inscritas"
          style={{
            cursor: 'pointer', padding: '2px 8px', borderRadius: 4,
            background: peopleBucket === 'all' ? 'rgba(253, 106, 68, 0.12)' : undefined,
            outline: peopleBucket === 'all' ? `1px solid ${C.accent}` : undefined,
          }}
        >
          <div style={{ fontSize: 12, color: C.textFaint, textTransform: 'uppercase' }}>Personas inscritas</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.enrolled_users}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textFaint, textTransform: 'uppercase' }}>Cursos en la ruta</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.total_courses}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textFaint, textTransform: 'uppercase' }}>Terminaron toda la ruta</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>
            {stats.buckets[String(stats.total_courses)] ?? 0}
          </div>
        </div>
      </div>
      <h4 style={{ margin: '12px 0 4px', fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Cuántas personas terminaron cada número de cursos
      </h4>
      <p style={{ margin: '0 0 12px', color: C.textFaint, fontSize: 13 }}>
        Haz clic en una barra para ver a las personas de ese grupo.
      </p>
      {Array.from({ length: stats.total_courses + 1 }).map((_, n) => {
        const count = stats.buckets[String(n)] ?? 0;
        const color = n === stats.total_courses ? C.green : n === 0 ? 'rgba(255,255,255,0.3)' : C.accent;
        return (
          <Bar
            key={n}
            label={bucketLabel(n, stats.total_courses)}
            value={count}
            max={stats.enrolled_users}
            color={color}
            onClick={() => showPeople(String(n))}
            active={peopleBucket === String(n)}
          />
        );
      })}
      {peopleBucket !== null && (
        <div style={{ margin: '16px 0 4px' }}>
          {peopleLoading && <p style={{ color: C.textFaint, fontSize: 13, margin: 0 }}>Cargando personas…</p>}
          {!peopleLoading && people === null && (
            <p style={{ color: C.danger, fontSize: 13, margin: 0 }}>No se pudo cargar la lista.</p>
          )}
          {!peopleLoading && people && (() => {
            const q = peopleFilter.trim().toLowerCase();
            const shown = q
              ? people.filter((u) =>
                  u.email.toLowerCase().includes(q) ||
                  `${u.first_name} ${u.last_name}`.toLowerCase().includes(q))
              : people;
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>
                    {shown.length}{q ? ` de ${people.length}` : ''} persona{shown.length === 1 ? '' : 's'}
                    {' · '}
                    {peopleBucket === 'all' ? 'todas las inscritas' : bucketLabel(Number(peopleBucket), stats.total_courses)}
                  </span>
                  <input
                    style={{ ...inputStyle, width: 260 }}
                    value={peopleFilter}
                    onChange={(e) => setPeopleFilter(e.target.value)}
                    placeholder="Filtrar por nombre o email…"
                  />
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto', border: `1px solid ${C.borderSoft}`, borderRadius: 6 }}>
                  {shown.map((u, i) => (
                    <div key={u.email} style={{ display: 'flex', gap: 10, padding: '6px 12px', fontSize: 13, alignItems: 'center', background: i % 2 ? C.surface : 'transparent' }}>
                      <span style={{ color: C.text, flex: '0 0 45%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                      <span style={{ color: C.textMuted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.first_name} {u.last_name}</span>
                      <span style={{ color: u.completed === stats.total_courses ? C.green : C.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {u.completed}/{stats.total_courses} cursos
                      </span>
                    </div>
                  ))}
                  {shown.length === 0 && (
                    <p style={{ color: C.textFaint, fontSize: 13, margin: 0, padding: '10px 12px' }}>Nadie coincide con el filtro.</p>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <select style={inputStyle} value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option style={optionStyle} value="all">Todas las personas inscritas</option>
          {Array.from({ length: stats.total_courses + 1 }).map((_, n) => (
            <option key={n} style={optionStyle} value={String(n)}>{bucketLabel(n, stats.total_courses)}</option>
          ))}
        </select>
        <button
          onClick={downloadCsv}
          disabled={downloading}
          style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 4, padding: '8px 20px', cursor: downloading ? 'wait' : 'pointer', fontWeight: 600 }}
        >
          {downloading ? 'Generando…' : 'Descargar CSV'}
        </button>
        {dlError && <span style={{ color: C.danger, fontSize: 13 }}>{dlError}</span>}
      </div>
    </div>
  );
};

// --- Evolución y resultados -------------------------------------------------
// Weekly cumulative chart + per-cohort conversion + email impact, all from the
// evolution endpoint. Ordered single-hue ramp (dark→light = early→final stage),
// validated for the dark teal surface.
const EVO_RAMP = ['#2a78d6', '#5598e7', '#86b6ef', '#b7d3f6', '#e2eefc'];

const fmtWeek = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short' });

const EvolutionChart = ({ data }: { data: TrackEvolution }) => {
  const [hover, setHover] = useState<number | null>(null);
  // The chart reads funnel stages over time: entered + completions. The
  // "started" series stays available in the data table below.
  const series = data.series.filter((s) => !s.key.startsWith('started:'));
  const weeks = data.weeks;
  const W = 760, H = 280, ML = 46, MR = 58, MT = 14, MB = 30;
  const maxV = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => ML + (i / Math.max(1, weeks.length - 1)) * (W - ML - MR);
  const y = (v: number) => MT + (1 - v / maxV) * (H - MT - MB);
  const color = (i: number) => EVO_RAMP[Math.min(i, EVO_RAMP.length - 1)];
  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => Math.round(maxV * f));
  const tickIdx = weeks.length <= 6
    ? weeks.map((_, i) => i)
    : [0, 1, 2, 3, 4].map((k) => Math.round((k * (weeks.length - 1)) / 4));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - ML) / (W - ML - MR)) * (weeks.length - 1));
    setHover(i >= 0 && i < weeks.length ? i : null);
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Personas acumuladas por etapa de la ruta, por semana"
      >
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.08)" />
            <text x={ML - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="rgba(242,242,242,0.5)">{v}</text>
          </g>
        ))}
        <line x1={ML} x2={W - MR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.2)" />
        {tickIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(242,242,242,0.5)">
            {fmtWeek(weeks[i])}
          </text>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={MT} y2={y(0)} stroke="rgba(255,255,255,0.3)" />
        )}
        {series.map((s, si) => (
          <path
            key={s.key}
            d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={color(si)}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {hover !== null && series.map((s, si) => (
          <circle key={s.key} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill={color(si)} />
        ))}
        {/* Direct labels on the two headline lines: context (entraron) and outcome (ruta). */}
        {[0, series.length - 1].map((si) => (
          <text
            key={si}
            x={x(weeks.length - 1) + 6}
            y={y(series[si].values[weeks.length - 1]) + 3}
            fontSize="11"
            fontWeight="600"
            fill="rgba(242,242,242,0.85)"
          >
            {series[si].values[weeks.length - 1]}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div style={{
          position: 'absolute',
          left: `${(x(hover) / W) * 100}%`,
          top: 0,
          transform: x(hover) > W * 0.6 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
          background: '#043A37', border: `1px solid ${C.borderSoft}`, borderRadius: 6,
          padding: '8px 12px', pointerEvents: 'none', zIndex: 2, whiteSpace: 'nowrap',
        }}>
          <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 4 }}>Semana del {fmtWeek(weeks[hover])}</div>
          {series.map((s, si) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color(si) }} />
              <span style={{ color: C.textMuted }}>{s.label}:</span> {s.values[hover]}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 8 }}>
        {series.map((s, si) => (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color(si) }} />
            {s.label}
          </span>
        ))}
      </div>
      <details style={{ marginTop: 10 }}>
        <summary style={{ ...subSummary, fontSize: 13 }}>Ver datos (tabla)</summary>
        <div style={{ maxHeight: 260, overflowY: 'auto', marginTop: 8, border: `1px solid ${C.borderSoft}`, borderRadius: 6 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, color: C.text }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 10px', color: C.textFaint }}>Semana</th>
                {data.series.map((s) => (
                  <th key={s.key} style={{ textAlign: 'right', padding: '4px 10px', color: C.textFaint }}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => (
                <tr key={w} style={{ background: i % 2 ? C.surfaceSoft : 'transparent' }}>
                  <td style={{ padding: '3px 10px' }}>{fmtWeek(w)}</td>
                  {data.series.map((s) => (
                    <td key={s.key} style={{ textAlign: 'right', padding: '3px 10px', fontVariantNumeric: 'tabular-nums' }}>
                      {s.values[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};

const EvolutionCohorts = ({ slug, data }: { slug: string; data: TrackEvolution }) => {
  const [sel, setSel] = useState<{ stage: string; cohort: string; label: string } | null>(null);
  const [people, setPeople] = useState<TrackEngagementUser[] | null>(null);
  const [loading, setLoading] = useState(false);

  const stages = data.cohorts[0]?.stages ?? [];
  const shortLabel = (i: number) =>
    i === 0 ? 'Entraron' : i === stages.length - 1 ? 'Ruta completa' : `Curso ${i}`;

  const pick = async (stage: string, cohort: string, label: string) => {
    if (sel && sel.stage === stage && sel.cohort === cohort) { setSel(null); setPeople(null); return; }
    setSel({ stage, cohort, label });
    setPeople(null);
    setLoading(true);
    const res = await tracksApi.evolutionPeople(slug, stage, cohort);
    setLoading(false);
    setPeople(res.ok && res.data ? (res.data.users as TrackEngagementUser[]) : null);
  };

  const cellBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    color: C.text, fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: C.textFaint, fontWeight: 600 }}>Cohorte</th>
              {stages.map((st, i) => (
                <th key={st.key} style={{ textAlign: 'right', padding: '6px 10px', color: C.textFaint, fontWeight: 600 }}
                    title={st.label}>
                  {shortLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((co, ci) => (
              <tr key={co.key} style={{ background: ci % 2 ? C.surfaceSoft : 'transparent', borderTop: `1px solid ${C.borderSoft}` }}>
                <td style={{ padding: '8px 10px', color: co.key === 'all' ? C.text : C.textMuted, fontWeight: co.key === 'all' ? 700 : 400 }}>
                  {co.label}
                </td>
                {co.stages.map((st) => (
                  <td key={st.key} style={{ textAlign: 'right', padding: '8px 10px', verticalAlign: 'top' }}>
                    <button
                      style={{
                        ...cellBtn,
                        textDecoration: sel && sel.stage === st.key && sel.cohort === co.key ? 'underline' : 'none',
                        color: sel && sel.stage === st.key && sel.cohort === co.key ? C.accent : C.text,
                      }}
                      title="Ver a estas personas"
                      onClick={() => pick(st.key, co.key, `${co.label} · ${st.label}`)}
                    >
                      {st.count}
                    </button>
                    {st.rate !== null && (
                      <div style={{ fontSize: 11, color: C.textFaint }}>
                        {st.rate}%{st.median_days !== null ? ` · ~${st.median_days}d` : ''}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '8px 0 0', color: C.textFaint, fontSize: 12, lineHeight: 1.5 }}>
        Porcentaje = conversión desde la etapa anterior · ~d = mediana de días entre etapas.
        Haz clic en un número para ver a las personas.
      </p>
      {sel && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: '0 0 6px', color: C.textMuted, fontSize: 13, fontWeight: 700 }}>{sel.label}</p>
          {loading && <p style={{ color: C.textFaint, fontSize: 13, margin: 0 }}>Cargando…</p>}
          {!loading && people && (
            <div style={{ maxHeight: 240, overflowY: 'auto', border: `1px solid ${C.borderSoft}`, borderRadius: 6 }}>
              {people.map((u, i) => (
                <div key={u.email} style={{ display: 'flex', gap: 10, padding: '5px 12px', fontSize: 13, background: i % 2 ? C.surface : 'transparent' }}>
                  <span style={{ color: C.text, flex: '0 0 45%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
                  <span style={{ color: C.textMuted, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.first_name} {u.last_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EvolutionEmails = ({ data }: { data: TrackEvolution }) => (
  <div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            {['Correo', 'Enviados', 'Acción esperada', `La hicieron en ≤${data.window_days} días`].map((h, i) => (
              <th key={h} style={{ textAlign: i === 0 || i === 2 ? 'left' : 'right', padding: '6px 10px', color: C.textFaint, fontWeight: 600 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.emails.map((e, i) => (
            <tr key={e.id} style={{ background: i % 2 ? C.surfaceSoft : 'transparent', borderTop: `1px solid ${C.borderSoft}` }}>
              <td style={{ padding: '7px 10px', color: C.text }}>{e.name}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>{e.sent}</td>
              <td style={{ padding: '7px 10px', color: C.textMuted }}>{e.action_label ?? '—'}</td>
              <td style={{ padding: '7px 10px', textAlign: 'right', color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                {e.acted === null ? '—' : `${e.acted} (${e.rate}%)`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p style={{ margin: '8px 0 0', color: C.textFaint, fontSize: 12, lineHeight: 1.5 }}>
      Mide reactivación (quién hizo la acción tras recibir el correo), no causalidad.
    </p>
  </div>
);

const EvolutionSection = ({ track }: { track: Track }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TrackEvolution | null | undefined>(undefined);

  useEffect(() => {
    if (!open || data !== undefined) return;
    let cancelled = false;
    (async () => {
      const res = await tracksApi.getEvolution(track.slug);
      if (!cancelled) setData(res.ok ? res.data : null);
    })();
    return () => { cancelled = true; };
  }, [open, data, track.slug]);

  return (
    <details style={sectionStyle} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary style={advancedSummary}>Evolución y resultados · ¿está funcionando la ruta?</summary>
      <div style={{ marginTop: 16 }}>
        {open && data === undefined && <p style={{ color: C.textFaint, fontSize: 13 }}>Cargando…</p>}
        {open && data === null && <p style={{ color: C.danger, fontSize: 13 }}>No se pudo cargar.</p>}
        {open && data && data.weeks.length > 0 && (
          <>
            <h4 style={{ margin: '0 0 10px', fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Evolución semanal (acumulado)
            </h4>
            <EvolutionChart data={data} />
            <h4 style={{ margin: '24px 0 10px', fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Conversión por cohorte
            </h4>
            <EvolutionCohorts slug={track.slug} data={data} />
            <h4 style={{ margin: '24px 0 10px', fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Impacto de los correos automáticos
            </h4>
            <EvolutionEmails data={data} />
          </>
        )}
        {open && data && data.weeks.length === 0 && (
          <p style={{ color: C.textFaint, fontSize: 13 }}>Sin datos todavía.</p>
        )}
      </div>
    </details>
  );
};

const TrackCard = ({
  track: initialTrack,
  catalog,
  onDeleted,
  defaultExpanded,
}: {
  track: Track;
  catalog: CourseOption[];
  onDeleted: () => void;
  defaultExpanded: boolean;
}) => {
  const [track, setTrack] = useState<Track>(initialTrack);
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Lifted up from TrackStats so the collapsed header can show "N inscritos"
  // without a second request — and so collapsed cards still load the count.
  const [engagement, setEngagement] = useState<TrackEngagement | null>(null);
  const [engError, setEngError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await tracksApi.getEngagement(track.slug);
      if (cancelled) return;
      if (res.ok) setEngagement(res.data as TrackEngagement);
      else setEngError('No se pudo cargar.');
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar la ruta "${track.name}"? Los cursos no se borran.`)) return;
    const res = await tracksApi.deleteTrack(track.slug);
    if (res.ok) onDeleted();
    else window.alert('No se pudo eliminar la ruta.');
  };

  const courseCount = track.courses.length;
  const enrolled = engagement?.enrolled_users;

  return (
    <section style={cardStyle}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ color: C.accent, fontSize: 14, transition: 'transform 0.15s', transform: expanded ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>▶</span>
        <h2 style={{ margin: 0, color: C.text, fontFamily: 'Libre Franklin, sans-serif', fontSize: '1.3rem' }}>
          {track.name}
        </h2>
        <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 500 }}>
          {courseCount} curso{courseCount === 1 ? '' : 's'}
          {enrolled !== undefined && ` · ${enrolled} inscrito${enrolled === 1 ? '' : 's'}`}
        </span>
        <span style={{ flex: 1 }} />
        {!track.is_published && <span style={badge('#8a6d00', '#fdf0c8')}>Borrador</span>}
        {track.is_featured && <span style={badge('#0E4B43', '#e7f0d4')}>Destacada</span>}
      </button>

      {expanded && (
        <div style={{ marginTop: 8 }}>
          {/* Progressive disclosure: every section starts collapsed, so the card
              opens to a calm list of sections instead of everything at once. */}
          <details style={sectionStyle}>
            <summary style={advancedSummary}>Cursos de esta ruta</summary>
            <div style={{ marginTop: 16 }}>
              <TrackCoursesEditor track={track} catalog={catalog} onSaved={setTrack} />
            </div>
          </details>

          <details style={sectionStyle}>
            <summary style={advancedSummary}>Correos automáticos</summary>
            <div style={{ marginTop: 8, paddingLeft: 14 }}>
              <div style={{ marginTop: 12 }}>
                <TrackEmailTimeline track={track} />
              </div>
              <details style={{ marginTop: 8 }}>
                <summary style={subSummary}>Cuando entra a la ruta · bienvenida</summary>
                <div style={{ marginTop: 12 }}><EnrollEmailPanel track={track} /></div>
              </details>
              <details style={{ marginTop: 14 }}>
                <summary style={subSummary}>Cuando no termina · refuerzo del curso</summary>
                <div style={{ marginTop: 12 }}><RefuerzoEmailsPanel track={track} /></div>
              </details>
              <details style={{ marginTop: 14 }}>
                <summary style={subSummary}>Contenido de la ruta · inicio, siguiente curso, felicitaciones y cierre</summary>
                <div style={{ marginTop: 12 }}><JourneyContentEmailsPanel track={track} /></div>
              </details>
            </div>
          </details>

          <details style={sectionStyle}>
            <summary style={advancedSummary}>Estadísticas · cuántas personas van avanzando</summary>
            <div style={{ marginTop: 16 }}>
              <TrackStats slug={track.slug} stats={engagement} error={engError} />
            </div>
          </details>

          <EvolutionSection track={track} />

          <details style={sectionStyle}>
            <summary style={advancedSummary}>Editar nombre y descripción de la ruta</summary>
            <TrackDetailsForm track={track} onSaved={setTrack} />
            <button
              onClick={handleDelete}
              style={{ marginTop: 12, background: 'none', border: `1px solid ${C.dangerBorder}`, color: C.danger, borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontSize: 13 }}
            >
              Eliminar ruta
            </button>
          </details>

          <TrackConfigEditor track={track} onSaved={setTrack} />
        </div>
      )}
    </section>
  );
};

const AdminTracks = () => {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [catalog, setCatalog] = useState<CourseOption[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await tracksApi.listAdmin();
      if (res.ok) setTracks(res.data);
      else setError('No se pudieron cargar las rutas.');
      const coursesRes = await adminApi.getCourses();
      if (coursesRes.ok) setCatalog(coursesRes.data as CourseOption[]);
    })();
  }, []);

  return (
    <div className="admin-content">
      <PageHeader
        title="Rutas de aprendizaje"
        subtitle="Agrupa cursos en una secuencia y administra los correos automáticos de la ruta."
        action={!creating ? { label: '+ Nueva ruta', onClick: () => setCreating(true) } : undefined}
      />
      <p style={{ margin: '0 0 24px', color: C.textMuted, maxWidth: 640, lineHeight: 1.5 }}>
        Una ruta es un grupo de cursos en orden. Aquí eliges <strong>qué cursos la forman</strong> y
        ves <strong>qué etiqueta de Mailchimp</strong> recibe cada persona cuando avanza, para mandarle un correo.
      </p>

      {/* Live funnel of the ruta (registrations → attendance → courses →
          certified), one card per track that maps to a workshop cohort. */}
      {tracks && tracks.map((t) => (
        <div key={`funnel-${t.id}`} style={{ marginBottom: 24 }}>
          <TrackFunnel trackName={t.name} workshopSlug={t.slug} />
        </div>
      ))}

      {creating && (
        <section style={cardStyle}>
          <h2 style={{ margin: '0 0 4px', color: C.text, fontFamily: 'Libre Franklin, sans-serif' }}>Nueva ruta</h2>
          <TrackDetailsForm
            track={null}
            onSaved={(t) => { setTracks((prev) => [t, ...(prev ?? [])]); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        </section>
      )}
      {error && <p style={{ color: C.danger }}>{error}</p>}
      {tracks === null && !error && <p style={{ color: C.textFaint }}>Cargando…</p>}
      {tracks && tracks.length === 0 && !creating && <p style={{ color: C.textFaint }}>No hay rutas todavía. Crea la primera.</p>}
      {tracks && tracks.map((t, i) => (
        <TrackCard
          key={t.id}
          track={t}
          catalog={catalog}
          defaultExpanded={i === 0}
          onDeleted={() => setTracks((prev) => (prev ?? []).filter((x) => x.id !== t.id))}
        />
      ))}
    </div>
  );
};

export default AdminTracks;
