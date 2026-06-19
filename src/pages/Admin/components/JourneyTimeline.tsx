import { useEffect, useRef, useState } from 'react';
import {
  type JourneySendPreview,
  type JourneySendResult,
  type TrackJourneyStep,
} from '../../../services/api';

// Visual timeline of the campaign email signals (cronograma del journey).
// Generic over storage: the host page passes `persist`, which saves the full
// list (Track.journey_steps or Workshop.journey_steps) and returns ok.
// When the host also passes `sender` (workshop journeys), señales with
// audience_key + subject + body can be sent from the platform.

export interface JourneySender {
  preview: (stepId: string) => Promise<{ ok: boolean; data: JourneySendPreview }>;
  test: (stepId: string) => Promise<{ ok: boolean; data: { detail: string } }>;
  send: (stepId: string) => Promise<{ ok: boolean; data: JourneySendResult }>;
  exportCsv: (stepId: string) => Promise<{ ok: boolean; blob: Blob | null }>;
}

// Mirrors AUDIENCES in apps/workshops/journey_send.py.
const AUDIENCE_OPTIONS: { key: string; label: string }[] = [
  { key: 'todos', label: 'Todos los registrados' },
  { key: 'asistentes', label: 'Asistentes al workshop' },
  { key: 'no_asistentes', label: 'Registrados que NO asistieron' },
  { key: 'con_cuenta', label: 'Registrados con cuenta en Academy' },
  { key: 'sin_cuenta', label: 'Registrados sin cuenta' },
  { key: 'asistentes_con_cuenta', label: 'Asistentes con cuenta en Academy' },
  { key: 'sin_avance', label: 'Con cuenta · sin cursos completados' },
  { key: 'en_progreso', label: 'Con cuenta · ruta en progreso' },
  { key: 'completaron_ruta', label: 'Con cuenta · completaron toda la ruta' },
  { key: 'curso_1_completado', label: 'Asistentes · completaron el curso 1' },
  { key: 'curso_2_completado', label: 'Asistentes · completaron el curso 2' },
  { key: 'curso_3_completado', label: 'Asistentes · completaron el curso 3' },
];

const hasAudience = (s: TrackJourneyStep) =>
  s.kind !== 'milestone' && !!s.audience_key;

const detailOf = (d: unknown): string | null =>
  d && typeof d === 'object' && 'detail' in d ? String((d as { detail: unknown }).detail) : null;

const KIND_META: Record<TrackJourneyStep['kind'], { label: string; bg: string; color: string }> = {
  auto: { label: 'Automático', bg: '#E7F0EE', color: '#16625b' },
  manual: { label: 'Mailchimp', bg: '#FFF4D6', color: '#8a6d1a' },
  milestone: { label: 'Hito', bg: '#FFE9E1', color: '#B33A14' },
};

const newStepId = () => crypto.randomUUID();

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
};

// Cronograma base de la campaña de la ruta (señales 1-24 + workshops).
const CAMPAIGN_TEMPLATE: Omit<TrackJourneyStep, 'id' | 'mounted' | 'sent'>[] = [
  { kind: 'auto', date_label: '25 de mayo al 17 de junio', title: 'Correo inicio de ruta', audience: 'Nuevos usuarios Academy (Lead Gen · Paid Ad)' },
  { kind: 'manual', date_label: '28 de mayo al 18 de junio', title: '1era. convocatoria de ruta de parte de aliados', audience: 'Audiencia de aliado' },
  { kind: 'auto', date_label: '28 de mayo al 26 de junio', title: 'Confirmación: Ya eres parte', audience: 'Nuevos usuarios registrados desde el landing de la ruta' },
  { kind: 'manual', date_label: '17 de junio', title: 'Recordatorio 1 día antes del workshop', audience: 'Registrados al workshop' },
  { kind: 'manual', date_label: '18 de junio', title: 'Recordatorio 10 min antes', audience: 'Registrados al workshop' },
  { kind: 'milestone', date_label: '18 de junio', title: 'Workshop: Lidera con un IA Mindset', audience: '' },
  { kind: 'auto', date_label: '18 de junio al 24 de junio', title: 'Correo inicio de ruta · nueva fecha de workshop', audience: 'Nuevos usuarios Academy (Lead Gen · Paid Ad)' },
  { kind: 'manual', date_label: '18 de junio', title: 'Post-workshop · Empieza los cursos', audience: 'Asistentes al workshop con cuenta en el Academy' },
  { kind: 'manual', date_label: '19 de junio', title: 'Invitación al siguiente workshop (no pudieron asistir)', audience: 'Registrados NO asistentes al workshop' },
  { kind: 'manual', date_label: '18 de junio al 24 de junio', title: '[Correo + Post + WhatsApp] 2nda. convocatoria de aliados', audience: 'Audiencia de aliado' },
  { kind: 'manual', date_label: '24 de junio', title: 'Recordatorio 1 día antes del workshop', audience: 'Registrados al workshop' },
  { kind: 'manual', date_label: '25 de junio', title: 'Recordatorio 10 min antes', audience: 'Registrados al workshop' },
  { kind: 'milestone', date_label: '25 de junio', title: 'Workshop: Lidera con un IA Mindset', audience: '' },
  { kind: 'manual', date_label: '25 de junio', title: 'Post-workshop · Empieza los cursos', audience: 'Asistentes al workshop con cuenta en el Academy' },
  { kind: 'manual', date_label: '26 de junio', title: 'Post-workshop · Sigue aprendiendo', audience: 'No registrados: asistieron y no asistieron' },
  { kind: 'manual', date_label: '30 de junio', title: 'Curso: Crea tu asistente con IA', audience: 'Asistentes al workshop con cuenta en el Academy' },
  { kind: 'auto', date_label: '3 días después del inicio de su curso', title: 'Refuerzo cierre curso 1', audience: 'Quienes no terminaron el curso 1' },
  { kind: 'auto', date_label: 'Al completar el curso 1', title: '¡Felicidades! Continúa con los 2 cursos', audience: 'Terminaron 1 curso' },
  { kind: 'manual', date_label: '16 de julio', title: 'Define tus metas con IA', audience: 'Asistentes al workshop con cuenta en el Academy' },
  { kind: 'auto', date_label: '3 días después del inicio de su curso', title: 'Refuerzo cierre curso 2', audience: 'Quienes no terminaron el curso 2' },
  { kind: 'auto', date_label: 'Al completar el curso 2', title: '¡Felicidades! Continúa con 1 curso más', audience: 'Terminaron 2 cursos' },
  { kind: 'manual', date_label: '23 de julio', title: 'Data para el impacto social', audience: 'Asistentes al workshop con cuenta en el Academy' },
  { kind: 'auto', date_label: '3 días después del inicio de su curso', title: 'Refuerzo cierre curso 3', audience: 'Quienes no terminaron el curso 3' },
  { kind: 'auto', date_label: 'Al completar la ruta', title: '¡Felicidades! Descarga tu certificado y súbelo a redes', audience: 'Completaron la ruta' },
  { kind: 'manual', date_label: '24 de julio', title: 'Refuerzo de ruta', audience: 'Quienes solo han llevado 1 curso' },
  { kind: 'manual', date_label: '31 de julio', title: 'Cierre', audience: 'Asistentes al workshop con cuenta en el Academy' },
];

const campaignTemplate = (): TrackJourneyStep[] =>
  CAMPAIGN_TEMPLATE.map((s) => ({ ...s, id: newStepId(), mounted: false, sent: false }));

const JourneyPill = ({
  on,
  label,
  title,
  onBg,
  onColor,
  onClick,
}: {
  on: boolean;
  label: string;
  title: string;
  onBg: string;
  onColor?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      border: `1px solid ${on ? 'transparent' : '#ccc'}`,
      background: on ? onBg : '#fff',
      color: on ? (onColor ?? '#fff') : '#999',
      borderRadius: 999,
      padding: '4px 12px',
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {on ? '✓ ' : '○ '}{label}
  </button>
);

const JourneyStepForm = ({
  initial,
  onSave,
  onCancel,
  withEmail,
}: {
  initial: TrackJourneyStep | null;
  onSave: (s: TrackJourneyStep) => void;
  onCancel: () => void;
  withEmail: boolean;
}) => {
  const [form, setForm] = useState<TrackJourneyStep>(
    initial ?? { id: newStepId(), kind: 'manual', date_label: '', title: '', audience: '', mounted: false, sent: false },
  );

  const set = <K extends keyof TrackJourneyStep>(key: K, value: TrackJourneyStep[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: '#f8f9f8', border: '1px solid #e5e9e7', borderRadius: 8,
        padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select style={inputStyle} value={form.kind} onChange={(e) => set('kind', e.target.value as TrackJourneyStep['kind'])}>
          <option value="manual">Mailchimp (manual)</option>
          <option value="auto">Automático</option>
          <option value="milestone">Hito 🎉 (workshop)</option>
        </select>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 160 }}
          placeholder="Fecha (ej. 17 de junio)"
          value={form.date_label}
          onChange={(e) => set('date_label', e.target.value)}
        />
      </div>
      <input
        style={inputStyle}
        placeholder="Acción (ej. Recordatorio 1 día antes del workshop)"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
      />
      {form.kind !== 'milestone' && (
        <input
          style={inputStyle}
          placeholder="Audiencia (ej. Registrados al workshop)"
          value={form.audience}
          onChange={(e) => set('audience', e.target.value)}
        />
      )}
      {withEmail && form.kind !== 'milestone' && (
        <div style={{ borderTop: '1px dashed #d8dedb', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16625b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Envío desde la plataforma
          </span>
          <select
            style={inputStyle}
            value={form.audience_key ?? ''}
            onChange={(e) => set('audience_key', e.target.value || undefined)}
          >
            <option value="">— No se envía desde la plataforma —</option>
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
          {form.audience_key && (
            <>
              <input
                style={inputStyle}
                placeholder='Tag de Mailchimp — ej. [MKT&COMM] Registros Workshop Ruta 18.06 (Q2.26)'
                value={form.mailchimp_tag ?? ''}
                onChange={(e) => set('mailchimp_tag', e.target.value)}
                title="Va en la columna Tags del CSV: al importarlo, Mailchimp aplica este tag y los segmentos del equipo siguen funcionando."
              />
              <input
                style={inputStyle}
                placeholder="Asunto (solo para enviar desde la plataforma) — ej. Mañana es el workshop, {{ user_name }}"
                value={form.subject ?? ''}
                onChange={(e) => set('subject', e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 120, fontFamily: 'monospace', fontSize: 13 }}
                placeholder="Cuerpo HTML (solo para enviar desde la plataforma) — ej. <p>Nos vemos en {{ workshop_name }}.</p>"
                value={form.body ?? ''}
                onChange={(e) => set('body', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, flex: 1, minWidth: 140 }}
                  placeholder="Texto del botón (opcional)"
                  value={form.cta_label ?? ''}
                  onChange={(e) => set('cta_label', e.target.value)}
                />
                <input
                  style={{ ...inputStyle, flex: 2, minWidth: 200 }}
                  placeholder="URL del botón (vacío = portada; admite {{ zoom_join_url }})"
                  value={form.cta_url ?? ''}
                  onChange={(e) => set('cta_url', e.target.value)}
                />
              </div>
              <span style={{ fontSize: 12, color: '#888' }}>
                Variables: <code>{'{{ user_name }}'}</code>, <code>{'{{ workshop_name }}'}</code>,{' '}
                <code>{'{{ zoom_join_url }}'}</code> (link personal de Zoom de cada registrado).
              </span>
            </>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          style={{ background: '#16625b', color: '#fff', border: 'none', padding: '6px 18px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
        >
          Guardar señal
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: 'none', border: '1px solid #ccc', padding: '6px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

const JourneySendPanel = ({
  step,
  sender,
  beforeSend,
  onAllSent,
  onClose,
}: {
  step: TrackJourneyStep;
  sender: JourneySender;
  beforeSend: () => Promise<void>; // flush pending journey edits first
  onAllSent: () => void; // every pending recipient reached → mark señal sent
  onClose: () => void;
}) => {
  const stepId = step.id;
  // Platform sending needs subject/body; the Mailchimp CSV only needs the
  // audience, so the export is always available here.
  const canSend = !!step.subject?.trim() && !!step.body?.trim();
  const [preview, setPreview] = useState<JourneySendPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const load = async () => {
    const res = await sender.preview(stepId);
    if (res.ok) setPreview(res.data);
    else setError(detailOf(res.data) ?? 'No se pudo cargar la audiencia.');
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  const downloadCsv = async () => {
    setBusy(true); setMsg(null); setError(null);
    await beforeSend();
    const res = await sender.exportCsv(stepId);
    setBusy(false);
    if (!res.ok || !res.blob) { setError('No se pudo generar el CSV.'); return; }
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailchimp-${step.audience_key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('CSV descargado. En Mailchimp: Audience → Import contacts → el tag de la columna Tags se aplica automáticamente.');
  };

  const sendTest = async () => {
    setBusy(true); setMsg(null); setError(null);
    await beforeSend();
    const res = await sender.test(stepId);
    setBusy(false);
    if (res.ok) setMsg(res.data.detail);
    else setError(detailOf(res.data) ?? 'Error al enviar la prueba.');
  };

  const sendAll = async () => {
    if (!preview) return;
    if (!window.confirm(`¿Enviar este correo a ${preview.pending} personas (${preview.audience_label})?`)) return;
    setBusy(true); setMsg(null); setError(null); setProgress(0);
    await beforeSend();
    let sent = 0;
    let failed = 0;
    let pending = preview.pending;
    // Batched: each POST sends up to 25; loop until done or a batch sends 0
    // (everything left is failing) so we never spin forever.
    for (let guard = 0; guard < 50 && pending > 0; guard++) {
      const res = await sender.send(stepId);
      if (!res.ok) { setError(detailOf(res.data) ?? 'Error al enviar.'); break; }
      sent += res.data.sent;
      failed += res.data.failed;
      pending = res.data.pending;
      setProgress(sent);
      if (res.data.sent === 0) break;
    }
    setBusy(false);
    setProgress(null);
    setMsg(`Enviados: ${sent}${failed ? ` · fallidos: ${failed} (reintenta con "Enviar")` : ''}`);
    if (pending <= 0 && sent > 0) onAllSent();
    void load();
  };

  return (
    <div style={{ background: '#f3f7f6', border: '1px solid #d6e3e0', borderRadius: 8, padding: 12, marginTop: 8 }}>
      {error && <p style={{ margin: '0 0 8px', color: '#c33', fontSize: 13 }}>{error}</p>}
      {!preview && !error && <p style={{ margin: 0, color: '#888', fontSize: 13 }}>Cargando audiencia…</p>}
      {preview && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#16625b' }}>
            <strong>{preview.audience_label}</strong> · {preview.total} personas
            {preview.already_sent > 0 && ` · ${preview.already_sent} ya recibieron`}
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={downloadCsv}
            disabled={busy || preview.total === 0}
            style={{ background: '#FD6A44', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: preview.total === 0 ? 0.5 : 1 }}
          >
            ⬇ CSV para Mailchimp ({preview.total})
          </button>
          {canSend && (
            <>
              <button
                onClick={sendTest}
                disabled={busy}
                style={{ background: 'none', border: '1px solid #16625b', color: '#16625b', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Enviarme prueba
              </button>
              <button
                onClick={sendAll}
                disabled={busy || preview.pending === 0}
                style={{ background: 'none', border: '1px solid #FD6A44', color: '#FD6A44', borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: preview.pending === 0 ? 0.5 : 1 }}
              >
                {progress !== null ? `Enviando… ${progress}/${preview.pending}` : `Enviar desde la plataforma (${preview.pending})`}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            disabled={busy}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }}
            title="Cerrar"
          >✕</button>
        </div>
      )}
      {msg && <p style={{ margin: '8px 0 0', color: '#3a7d44', fontSize: 13 }}>{msg}</p>}
    </div>
  );
};

const JourneyTimeline = ({
  initialSteps,
  persist,
  sender,
}: {
  initialSteps: TrackJourneyStep[];
  persist: (steps: TrackJourneyStep[]) => Promise<boolean>;
  sender?: JourneySender;
}) => {
  const [steps, setSteps] = useState<TrackJourneyStep[]>(initialSteps);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [sendingFor, setSendingFor] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle');
  const stepsRef = useRef(steps);
  const timerRef = useRef<number | null>(null);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const mutate = (next: TrackJourneyStep[]) => {
    setSteps(next);
    stepsRef.current = next;
    setSaveState('pending');
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null;
      const ok = await persistRef.current(stepsRef.current);
      setSaveState(ok ? 'saved' : 'error');
    }, 700);
  };

  useEffect(
    () => () => {
      // flush a pending save if the section is collapsed / tab switched
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        void persistRef.current(stepsRef.current);
      }
    },
    [],
  );

  // Force a pending debounced save through before sending, so the backend
  // reads the señal exactly as the admin last edited it.
  const flush = async () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      const ok = await persistRef.current(stepsRef.current);
      setSaveState(ok ? 'saved' : 'error');
    }
  };

  const markSent = (id: string) =>
    mutate(stepsRef.current.map((s) => (s.id === id ? { ...s, sent: true } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    mutate(next);
  };

  const toggle = (id: string, key: 'mounted' | 'sent') =>
    mutate(steps.map((s) => (s.id === id ? { ...s, [key]: !s[key] } : s)));

  const remove = (id: string) => {
    const step = steps.find((s) => s.id === id);
    if (!window.confirm(`¿Eliminar la señal "${step?.title}"?`)) return;
    mutate(steps.filter((s) => s.id !== id));
    if (editing === id) setEditing(null);
  };

  const emailSteps = steps.filter((s) => s.kind !== 'milestone');
  const mountedCount = emailSteps.filter((s) => s.mounted).length;
  const sentCount = emailSteps.filter((s) => s.sent).length;

  const chipStyle = (bg: string, color: string): React.CSSProperties => ({
    background: bg, color, fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
  });
  const iconBtn: React.CSSProperties = {
    border: '1px solid #d8dedb', background: '#fff', borderRadius: 4,
    cursor: 'pointer', padding: '2px 7px', fontSize: 12, color: '#555',
  };

  let stepNumber = 0;

  return (
    <div style={{ marginTop: 16 }}>
      {steps.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={chipStyle('#FFF4D6', '#8a6d1a')}>Mailchimp: {mountedCount}/{emailSteps.length} montados</span>
          <span style={chipStyle('#E7F0EE', '#16625b')}>Enviados: {sentCount}/{emailSteps.length}</span>
          <span style={{ flex: 1 }} />
          {saveState === 'pending' && <span style={{ fontSize: 13, color: '#888' }}>Guardando…</span>}
          {saveState === 'saved' && <span style={{ fontSize: 13, color: '#3a7d44' }}>Guardado ✓</span>}
          {saveState === 'error' && <span style={{ fontSize: 13, color: '#c33' }}>Error al guardar</span>}
        </div>
      )}

      {steps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#888' }}>
          <p style={{ marginTop: 0 }}>Aún no hay señales en el cronograma.</p>
          <button
            onClick={() => mutate(campaignTemplate())}
            style={{ background: '#FD6A44', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
          >
            Cargar cronograma de la campaña (24 señales + workshops)
          </button>
        </div>
      )}

      {steps.map((s, i) => {
        const isMilestone = s.kind === 'milestone';
        const num = isMilestone ? null : ++stepNumber;
        const actions = (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={iconBtn} title="Subir">↑</button>
            <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} style={iconBtn} title="Bajar">↓</button>
            <button onClick={() => setEditing(editing === s.id ? null : s.id)} style={iconBtn} title="Editar">✎</button>
            <button onClick={() => remove(s.id)} style={{ ...iconBtn, color: '#c33', borderColor: '#e0b4b4' }} title="Eliminar">✕</button>
          </div>
        );
        return (
          <div key={s.id} style={{ display: 'flex' }}>
            <div style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ width: 2, height: 6, background: i === 0 ? 'transparent' : '#dfe7e4' }} />
              <div
                style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...(isMilestone
                    ? { background: '#FFE9E1', fontSize: 15 }
                    : s.sent
                      ? { background: '#16625b', color: '#fff', fontWeight: 700, fontSize: 13 }
                      : { background: '#fff', border: '2px solid #cfdbd7', color: '#16625b', fontWeight: 700, fontSize: 13 }),
                }}
              >
                {isMilestone ? '🎉' : num}
              </div>
              <div style={{ width: 2, flex: 1, background: i === steps.length - 1 ? 'transparent' : '#dfe7e4' }} />
            </div>

            <div style={{ flex: 1, padding: '0 0 14px 8px', minWidth: 0 }}>
              {isMilestone ? (
                <div style={{ background: '#FFF1EC', border: '1px solid #FFD9CC', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#B33A14', fontSize: 15 }}>{s.title}</strong>
                  <span style={{ color: '#b36a50', fontSize: 13 }}>{s.date_label}</span>
                  <span style={{ flex: 1 }} />
                  {actions}
                </div>
              ) : (
                <div style={{ background: s.sent ? '#fafbf8' : '#fff', border: '1px solid #e5e9e7', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#8a948f' }}>
                          {s.date_label || 'Sin fecha'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, background: KIND_META[s.kind].bg, color: KIND_META[s.kind].color, padding: '2px 8px', borderRadius: 4 }}>
                          {KIND_META[s.kind].label}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#222', margin: '4px 0 2px' }}>{s.title}</div>
                      {s.audience && <div style={{ fontSize: 13, color: '#777' }}>Audiencia: {s.audience}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {sender && hasAudience(s) && (
                        <button
                          type="button"
                          onClick={() => setSendingFor(sendingFor === s.id ? null : s.id)}
                          title="Exportar la audiencia a Mailchimp o enviar desde la plataforma"
                          style={{
                            border: '1px solid #FD6A44', background: sendingFor === s.id ? '#FD6A44' : '#fff',
                            color: sendingFor === s.id ? '#fff' : '#FD6A44', borderRadius: 999,
                            padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          ✉️ Audiencia
                        </button>
                      )}
                      <JourneyPill
                        on={s.mounted}
                        label="Mailchimp"
                        title="¿Montado en Mailchimp?"
                        onBg="#FFE01B"
                        onColor="#3a3a1f"
                        onClick={() => toggle(s.id, 'mounted')}
                      />
                      <JourneyPill
                        on={s.sent}
                        label="Enviado"
                        title="¿Enviado?"
                        onBg="#3a7d44"
                        onClick={() => toggle(s.id, 'sent')}
                      />
                    </div>
                    {actions}
                  </div>
                </div>
              )}
              {sender && sendingFor === s.id && (
                <JourneySendPanel
                  step={s}
                  sender={sender}
                  beforeSend={flush}
                  onAllSent={() => markSent(s.id)}
                  onClose={() => setSendingFor(null)}
                />
              )}
              {editing === s.id && (
                <JourneyStepForm
                  initial={s}
                  onSave={(updated) => { mutate(steps.map((x) => (x.id === s.id ? updated : x))); setEditing(null); }}
                  onCancel={() => setEditing(null)}
                  withEmail={!!sender}
                />
              )}
            </div>
          </div>
        );
      })}

      {editing === 'new' ? (
        <JourneyStepForm
          initial={null}
          onSave={(created) => { mutate([...steps, created]); setEditing(null); }}
          onCancel={() => setEditing(null)}
          withEmail={!!sender}
        />
      ) : (
        <button
          onClick={() => setEditing('new')}
          style={{ background: 'none', border: '1px dashed #16625b', color: '#16625b', padding: '8px 22px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}
        >
          + Agregar señal
        </button>
      )}
    </div>
  );
};

export default JourneyTimeline;
