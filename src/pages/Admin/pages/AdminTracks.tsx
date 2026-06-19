import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  adminApi,
  tracksApi,
  type Track,
  type TrackEmail,
  type TrackEngagement,
  type TrackWritePayload,
  type MailchimpTemplate,
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

// Heading that opens the "advanced" group of collapsible sections.
const advancedGroupHeading: React.CSSProperties = {
  margin: '24px 0 4px',
  fontSize: 13,
  color: C.textFaint,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontWeight: 700,
};

const advancedSummary: React.CSSProperties = { cursor: 'pointer', fontWeight: 600, color: C.accent, fontSize: 14 };

// Small numbered badge so each step is obvious at a glance.
const StepHeading = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 8px', color: C.text, fontFamily: 'Libre Franklin, sans-serif', fontSize: '1.05rem' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
      {n}
    </span>
    {children}
  </h3>
);

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

// Hitos de la ruta → etiqueta que la plataforma agrega sola en Mailchimp («Propel
// Contacts»), sincronizada cada 2 h por el cron (apps/workshops/mailchimp_sync.py,
// fuente de verdad de estos nombres). El correo lo manda un Customer Journey de
// Mailchimp con disparador «se agregó la etiqueta». Solo a quienes asistieron.
const RUTA_TAGS: { key: string; hito: string; tag: string }[] = [
  { key: 'curso_1', hito: 'Cuando termina el curso 1', tag: '[MKT&COMM] Registros Ruta Lidera con un IA mindset Q2 2026 - Curso 1 (completado)' },
  { key: 'curso_2', hito: 'Cuando termina el curso 2', tag: '[MKT&COMM] Registros Ruta Lidera con un IA mindset Q2 2026 - Curso 2 (completado)' },
  { key: 'curso_3', hito: 'Cuando termina el curso 3', tag: '[MKT&COMM] Registros Ruta Lidera con un IA mindset Q2 2026 - Curso 3 (completado)' },
  { key: 'ruta_completa', hito: 'Cuando termina toda la ruta', tag: '[MKT&COMM] Ruta Lidera con un IA Mindset Completada (Q2.26)' },
];

const TrackTagsPanel = ({ track }: { track: Track }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [templates, setTemplates] = useState<MailchimpTemplate[]>([]);
  const [assigned, setAssigned] = useState<Record<string, { id: number; name: string }>>({});
  const [tplError, setTplError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tpls, mts] = await Promise.all([
        tracksApi.listMailchimpTemplates(),
        tracksApi.listMilestoneTemplates(track.slug),
      ]);
      if (cancelled) return;
      if (tpls.ok) setTemplates(tpls.data);
      else setTplError('No se pudieron cargar las plantillas de Mailchimp.');
      if (mts.ok) {
        const map: Record<string, { id: number; name: string }> = {};
        mts.data.forEach((m) => {
          if (m.template_id) map[m.milestone] = { id: m.template_id, name: m.template_name };
        });
        setAssigned(map);
      }
    })();
    return () => { cancelled = true; };
  }, [track.slug]);

  const copy = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopied(tag);
    } catch {
      /* clipboard no disponible */
    }
  };

  const choose = async (key: string, templateId: number) => {
    setSavingKey(key);
    const tpl = templates.find((t) => t.id === templateId);
    const res = await tracksApi.setMilestoneTemplate(track.slug, {
      milestone: key,
      template_id: templateId,
      template_name: tpl?.name || '',
    });
    setSavingKey(null);
    if (!res.ok) return;
    setAssigned((prev) => {
      const next = { ...prev };
      if (templateId) next[key] = { id: templateId, name: tpl?.name || '' };
      else delete next[key];
      return next;
    });
    if (!templateId && previewKey === key) closePreview();
  };

  const closePreview = () => {
    setPreviewKey(null);
    setPreviewHtml('');
    setPreviewUrl('');
    setPreviewErr(null);
  };

  const preview = async (key: string) => {
    const tpl = assigned[key];
    if (!tpl) return;
    setPreviewKey(key);
    setPreviewHtml('');
    setPreviewUrl('');
    setPreviewErr(null);
    setPreviewLoading(true);
    const res = await tracksApi.previewMailchimpTemplate(tpl.id);
    setPreviewLoading(false);
    if (!res.ok) {
      setPreviewErr(res.data?.detail || 'No se pudo cargar la vista previa.');
      return;
    }
    setPreviewHtml(res.data.html || '');
    setPreviewUrl(res.data.mailchimp_url || '');
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: 16 }}>
      <p style={{ margin: '0 0 14px', color: C.textMuted, fontSize: 14, lineHeight: 1.6 }}>
        Cuando alguien termina un curso, <strong>la plataforma le pone sola una etiqueta en
        Mailchimp</strong>. Crea el correo <strong>una sola vez</strong> en Mailchimp, elige aquí qué
        plantilla usaste para cada hito y copia la etiqueta para pegarla allí.
      </p>
      {tplError && <p style={{ color: C.danger, fontSize: 13, margin: '0 0 10px' }}>{tplError}</p>}
      {RUTA_TAGS.map(({ key, hito, tag }) => {
        const sel = assigned[key];
        return (
          <div key={key} style={{ background: C.surfaceSoft, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 150, color: C.text, fontSize: 14, fontWeight: 600 }}>{hito}</span>
              <span style={{ color: C.textMuted, fontSize: 13 }}>Plantilla:</span>
              <select
                value={sel?.id ?? ''}
                disabled={savingKey === key || !!tplError}
                onChange={(e) => choose(key, Number(e.target.value))}
                style={{ flex: '0 1 260px', minWidth: 180, padding: '6px 8px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 13, background: C.inputBg, color: C.text }}
              >
                <option value="" style={optionStyle}>— Sin plantilla —</option>
                {sel && !templates.some((t) => t.id === sel.id) && (
                  <option value={sel.id} style={optionStyle}>{sel.name || `Plantilla ${sel.id}`}</option>
                )}
                {templates.map((t) => (
                  <option key={t.id} value={t.id} style={optionStyle}>{t.name}</option>
                ))}
              </select>
              <button
                onClick={() => preview(key)}
                disabled={!sel}
                style={{ border: `1px solid ${sel ? C.accent : C.borderSoft}`, background: 'none', color: sel ? C.accent : C.textFaint, borderRadius: 4, padding: '6px 14px', cursor: sel ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Vista previa
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ flex: 1, minWidth: 0, background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 8px', fontSize: 12, color: C.text, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {tag}
              </code>
              <button
                onClick={() => copy(tag)}
                style={{ border: 'none', background: C.accent, color: '#fff', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {copied === tag ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            {previewKey === key && (
              <div style={{ marginTop: 12 }}>
                {previewLoading ? (
                  <p style={{ color: C.textFaint, fontSize: 13 }}>Generando vista previa…</p>
                ) : previewErr ? (
                  <p style={{ color: C.danger, fontSize: 13 }}>{previewErr}</p>
                ) : previewHtml ? (
                  <iframe
                    title={`Vista previa: ${hito}`}
                    srcDoc={previewHtml}
                    sandbox=""
                    style={{ width: '100%', height: 480, border: `1px solid ${C.borderSoft}`, borderRadius: 6, background: '#fff' }}
                  />
                ) : (
                  <div style={{ background: C.surfaceSoft, border: `1px solid ${C.borderSoft}`, borderRadius: 6, padding: 16, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
                    Esta plantilla se creó en el editor nuevo de Mailchimp, que no permite mostrar
                    una vista previa aquí.
                    {previewUrl && (
                      <>
                        {' '}
                        Búscala{sel?.name ? <> como «<strong>{sel.name}</strong>»</> : null} en{' '}
                        <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: C.accent, fontWeight: 600 }}>
                          tus plantillas de Mailchimp
                        </a>.
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={closePreview}
                  style={{ marginTop: 6, border: 'none', background: 'none', color: C.accent, cursor: 'pointer', fontSize: 13 }}
                >
                  Cerrar vista previa
                </button>
              </div>
            )}
          </div>
        );
      })}
      <p style={{ margin: '12px 0 0', color: C.textFaint, fontSize: 12.5, lineHeight: 1.5 }}>
        El correo puede tardar hasta 2 horas en salir. Solo le llega a quien asistió al workshop.
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
      </div>

      <details>
      <summary style={advancedSummary}>Ver vista previa del correo (datos de ejemplo)</summary>
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

const Bar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
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

const TrackStats = ({ stats, error }: { stats: TrackEngagement | null; error: string | null }) => {
  if (error) return <p style={{ color: C.danger }}>{error}</p>;
  if (!stats) return <p style={{ color: C.textFaint }}>Cargando…</p>;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 20, color: C.text }}>
        <div>
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
      <h4 style={{ margin: '12px 0 12px', fontSize: 14, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Cuántas personas terminaron cada número de cursos
      </h4>
      {Array.from({ length: stats.total_courses + 1 }).map((_, n) => {
        const count = stats.buckets[String(n)] ?? 0;
        const label =
          n === 0 ? '0 cursos · sin empezar'
          : n === stats.total_courses ? `${n} cursos · terminaron todo`
          : `${n} curso${n > 1 ? 's' : ''} terminado${n > 1 ? 's' : ''}`;
        const color = n === stats.total_courses ? C.green : n === 0 ? 'rgba(255,255,255,0.3)' : C.accent;
        return <Bar key={n} label={label} value={count} max={stats.enrolled_users} color={color} />;
      })}
    </div>
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
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 28 }}>
            <StepHeading n={1}>Cursos de esta ruta</StepHeading>
            <TrackCoursesEditor track={track} catalog={catalog} onSaved={setTrack} />
          </div>

          <div>
            <StepHeading n={2}>Correos automáticos</StepHeading>

            <h4 style={subLabel}>Cuando entra a la ruta · correo de bienvenida</h4>
            <EnrollEmailPanel track={track} />

            <h4 style={{ ...subLabel, marginTop: 24 }}>Cuando avanza · termina cursos (por Mailchimp)</h4>
            <TrackTagsPanel track={track} />
          </div>

          <h3 style={advancedGroupHeading}>Configuración avanzada</h3>

          <details style={{ borderTop: `1px solid ${C.borderSoft}`, paddingTop: 16 }}>
            <summary style={advancedSummary}>Ver cuántas personas van avanzando</summary>
            <TrackStats stats={engagement} error={engError} />
          </details>

          <details style={{ marginTop: 12, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 16 }}>
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
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
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
    </div>
  );
};

export default AdminTracks;
