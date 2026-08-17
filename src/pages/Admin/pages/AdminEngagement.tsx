import { useEffect, useState } from 'react';
import {
  tracksApi,
  type EngagementSlot,
  type EngagementConversion,
  type EngagementConversionRow,
} from '../../../services/api';
import PageHeader from '../components/PageHeader';

// Dark admin theme tokens, matching the other admin tabs (see AdminTracks).
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
  danger: '#ff8a8a',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  fontSize: 14,
  fontFamily: 'inherit',
  background: C.inputBg,
  color: C.text,
};

const cardStyle: React.CSSProperties = {
  background: C.surfaceSoft,
  border: `1px solid ${C.borderSoft}`,
  borderRadius: 8,
  padding: 24,
  marginBottom: 16,
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

type BucketKey = EngagementSlot['bucket'];

const BUCKETS: { key: BucketKey; label: string; goal: string; desc: string }[] = [
  {
    key: 'activacion',
    label: 'Activación',
    goal: 'Registrado → inició un curso',
    desc: 'Registrado, sin curso iniciado. El mayor momento de intención es justo después del registro.',
  },
  {
    key: 'engagement',
    label: 'Engagement',
    goal: 'Inició → completó el 1er curso',
    desc: 'Curso iniciado, no completado. ~80% de los que terminan lo hacen dentro de los 10 días.',
  },
  {
    key: 'retencion',
    label: 'Retención',
    goal: '1er curso → 2do curso',
    desc: 'Curso completado, sin continuar. 80% de los que empiezan el 2do en 2 días lo terminan.',
  },
  {
    key: 'inactivo',
    label: 'Inactivo',
    goal: 'Reactivación',
    desc: 'Sin actividad en la plataforma.',
  },
];

interface Draft {
  subject: string;
  preview_text: string;
  body: string;
  is_active: boolean;
}

export default function AdminEngagement() {
  const [slots, setSlots] = useState<EngagementSlot[] | undefined>(undefined);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDay, setNewDay] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<Record<string, string>>({});
  const [busyBucket, setBusyBucket] = useState<string | null>(null);
  const [conversion, setConversion] = useState<EngagementConversion | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [slotsRes, convRes] = await Promise.all([
        tracksApi.getEngagementSlots(),
        tracksApi.getEngagementConversion(),
      ]);
      if (cancelled) return;
      if (slotsRes.ok) {
        setSlots(slotsRes.data);
        const next: Record<number, Draft> = {};
        for (const s of slotsRes.data) {
          next[s.id] = {
            subject: s.subject,
            preview_text: s.preview_text,
            body: s.body,
            is_active: s.is_active,
          };
        }
        setDrafts(next);
      } else {
        setSlots([]);
      }
      if (convRes.ok) setConversion(convRes.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchDraft = (id: number, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setSavedId(null);
  };

  const isDirty = (s: EngagementSlot): boolean => {
    const d = drafts[s.id];
    if (!d) return false;
    return (
      d.subject !== s.subject ||
      d.preview_text !== s.preview_text ||
      d.body !== s.body ||
      d.is_active !== s.is_active
    );
  };

  const save = async (s: EngagementSlot) => {
    const d = drafts[s.id];
    if (!d) return;
    setSavingId(s.id);
    setError(null);
    const res = await tracksApi.updateEngagementSlot(s.id, {
      subject: d.subject,
      preview_text: d.preview_text,
      body: d.body,
      is_active: d.is_active,
    });
    setSavingId(null);
    if (res.ok) {
      setSlots((prev) => prev?.map((x) => (x.id === s.id ? res.data : x)));
      // Mirror server-cleaned values (Mailchimp tags stripped) into the draft.
      setDrafts((prev) => ({
        ...prev,
        [s.id]: {
          subject: res.data.subject,
          preview_text: res.data.preview_text,
          body: res.data.body,
          is_active: res.data.is_active,
        },
      }));
      setSavedId(s.id);
    } else {
      setError('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');
    }
  };

  const addDay = async (bucket: BucketKey) => {
    const raw = (newDay[bucket] ?? '').trim();
    const day = Number(raw);
    if (raw === '' || !Number.isInteger(day) || day < 0) {
      setAddError((p) => ({ ...p, [bucket]: 'Ingresa un número de día válido (0 o más).' }));
      return;
    }
    if (slots?.some((s) => s.bucket === bucket && s.day_offset === day)) {
      setAddError((p) => ({ ...p, [bucket]: `El día ${day} ya existe en esta etapa.` }));
      return;
    }
    setBusyBucket(bucket);
    setAddError((p) => ({ ...p, [bucket]: '' }));
    const res = await tracksApi.createEngagementSlot(bucket, day);
    setBusyBucket(null);
    if (res.ok && res.data) {
      const created = res.data;
      setSlots((prev) => (prev ? [...prev, created] : [created]));
      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          subject: created.subject,
          preview_text: created.preview_text,
          body: created.body,
          is_active: created.is_active,
        },
      }));
      setNewDay((p) => ({ ...p, [bucket]: '' }));
    } else {
      setAddError((p) => ({ ...p, [bucket]: res.error || 'No se pudo agregar el día.' }));
    }
  };

  const removeSlot = async (s: EngagementSlot) => {
    if (s.sent_count > 0) return; // guarded in the UI; deleting would drop send history
    if (!window.confirm(`¿Eliminar el correo del día ${s.day_offset}?`)) return;
    const res = await tracksApi.deleteEngagementSlot(s.id);
    if (res.ok) {
      setSlots((prev) => prev?.filter((x) => x.id !== s.id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
    } else {
      setError('No se pudo eliminar el día. Inténtalo de nuevo.');
    }
  };

  if (slots === undefined) {
    return (
      <div className="admin-content">
        <PageHeader title="Engagement" subtitle="Correos de ciclo de vida" />
        <p style={{ color: C.textMuted }}>Cargando…</p>
      </div>
    );
  }

  const convBySlot = new Map<number, EngagementConversionRow>();
  for (const r of conversion?.slots ?? []) {
    if (r.slot_id != null) convBySlot.set(r.slot_id, r);
  }
  const pct = (n: number, d: number): number => (d > 0 ? Math.round((100 * n) / d) : 0);

  return (
    <div className="admin-content">
      <PageHeader
        title="Engagement"
        subtitle="Correos automáticos por etapa del embudo, enviados desde la plataforma. Cada día el sistema clasifica a cada persona y le envía el correo del paso que le corresponde. Cada persona recibe como máximo un correo por día y nunca dos veces el mismo paso. Solo se envían los pasos con contenido HTML y marcados «Activo»."
      />
      {error && <p style={{ color: C.danger }}>{error}</p>}
      {BUCKETS.map((b) => {
        const rows = slots
          .filter((s) => s.bucket === b.key)
          .sort((x, y) => x.day_offset - y.day_offset);
        const overall = b.key === 'activacion' ? conversion?.overall ?? null : null;
        return (
          <div key={b.key} style={cardStyle}>
            <div style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>{b.label}</h3>
              <p style={{ margin: '6px 0 0', color: C.textMuted, fontSize: 13 }}>{b.desc}</p>
              <p style={{ margin: '2px 0 0', color: C.textFaint, fontSize: 12 }}>Meta: {b.goal}</p>
            </div>
            {b.key === 'activacion' &&
              (overall && overall.recipients > 0 ? (
                <div
                  style={{
                    margin: '0 0 10px',
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: 'rgba(163, 201, 74, 0.12)',
                    border: '1px solid rgba(163, 201, 74, 0.4)',
                    color: C.text,
                    fontSize: 13,
                  }}
                >
                  <strong>{overall.started_ever}</strong> de <strong>{overall.recipients}</strong> personas (
                  {pct(overall.started_ever, overall.recipients)}%) iniciaron un curso después del correo de
                  activación
                  <span style={{ color: C.textMuted }}>
                    {' '}
                    · en 7 días: {overall.started_7d} ({pct(overall.started_7d, overall.recipients)}%) · en 30
                    días: {overall.started_30d} ({pct(overall.started_30d, overall.recipients)}%)
                  </span>
                </div>
              ) : (
                <p style={{ margin: '0 0 10px', color: C.textFaint, fontSize: 12, fontStyle: 'italic' }}>
                  Aún sin envíos — cuando se envíen correos de activación, aquí verás cuántas de las personas que
                  los recibieron iniciaron un curso después.
                </p>
              ))}
            {b.key === 'engagement' && (
              <p style={{ margin: '0 0 10px', color: C.textMuted, fontSize: 12 }}>
                En el HTML puedes usar <code style={{ color: C.accent }}>{'{{ course_title }}'}</code> (título del
                último curso iniciado), <code style={{ color: C.accent }}>{'{{ cta_url }}'}</code> (enlace a ese
                curso) y <code style={{ color: C.accent }}>{'{{ course_image_url }}'}</code> (imagen de ese curso).
                Cada persona recibe el recordatorio de su último curso iniciado.
              </p>
            )}
            {b.key === 'retencion' && (
              <p style={{ margin: '0 0 10px', color: C.textMuted, fontSize: 12 }}>
                En el HTML puedes usar <code style={{ color: C.accent }}>{'{{ course_title }}'}</code> (curso
                completado), <code style={{ color: C.accent }}>{'{{ recommended_course }}'}</code> (curso
                recomendado), <code style={{ color: C.accent }}>{'{{ cta_url }}'}</code> (enlace al recomendado) y{' '}
                <code style={{ color: C.accent }}>{'{{ course_image_url }}'}</code> (imagen del recomendado).
              </p>
            )}
            {rows.map((s) => {
              const d = drafts[s.id];
              const dirty = isDirty(s);
              const conv = convBySlot.get(s.id);
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 0',
                    borderTop: `1px solid ${C.borderSoft}`,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ width: 64, color: C.text, fontSize: 14, fontWeight: 600 }}>
                    Día {s.day_offset}
                  </span>
                  <span
                    title={d?.body ? 'Con contenido' : 'Sin contenido — no se envía'}
                    style={{
                      width: 9, height: 9, borderRadius: '50%', flex: '0 0 auto',
                      background: d?.body ? '#A3C94A' : C.textFaint,
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Asunto"
                    value={d?.subject ?? ''}
                    onChange={(e) => patchDraft(s.id, { subject: e.target.value })}
                    style={{ ...inputStyle, flex: '1 1 200px', minWidth: 0 }}
                  />
                  <input
                    type="text"
                    placeholder="Texto de vista previa (preheader)"
                    value={d?.preview_text ?? ''}
                    onChange={(e) => patchDraft(s.id, { preview_text: e.target.value })}
                    style={{ ...inputStyle, flex: '1 1 200px', minWidth: 0 }}
                  />
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.textMuted, fontSize: 13 }}
                  >
                    <input
                      type="checkbox"
                      checked={d?.is_active ?? false}
                      onChange={(e) => patchDraft(s.id, { is_active: e.target.checked })}
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => save(s)}
                    disabled={!dirty || savingId === s.id}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: dirty ? 'pointer' : 'default',
                      background: dirty ? C.accent : C.surface,
                      color: dirty ? '#fff' : C.textFaint,
                    }}
                  >
                    {savingId === s.id ? 'Guardando…' : savedId === s.id ? 'Guardado ✓' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSlot(s)}
                    disabled={s.sent_count > 0}
                    title={
                      s.sent_count > 0
                        ? 'No se puede eliminar: ya se enviaron correos en este paso'
                        : 'Eliminar este día'
                    }
                    style={{
                      padding: '8px 10px',
                      border: `1px solid ${C.borderSoft}`,
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      cursor: s.sent_count > 0 ? 'not-allowed' : 'pointer',
                      background: 'transparent',
                      color: s.sent_count > 0 ? C.textFaint : C.danger,
                    }}
                  >
                    ✕
                  </button>
                  {(s.sent_count > 0 || s.is_active) && (
                    <div style={{ flexBasis: '100%', color: C.textFaint, fontSize: 12 }}>
                      {s.sent_count > 0
                        ? `Enviados: ${s.sent_count}${
                            s.last_sent_at ? ` · último envío: ${fmtDate(s.last_sent_at)}` : ''
                          }`
                        : s.body
                          ? 'Activo · aún sin enviar'
                          : 'Activo · sin contenido HTML — no se enviará nada hasta que lo pegues'}
                      {conv && conv.recipients > 0 && (
                        <span style={{ color: C.text }}>
                          {' · '}iniciaron un curso: {conv.started_ever} (
                          {pct(conv.started_ever, conv.recipients)}%)
                        </span>
                      )}
                    </div>
                  )}
                  <details style={{ flexBasis: '100%' }}>
                    <summary style={{ cursor: 'pointer', color: C.accent, fontSize: 13, fontWeight: 600 }}>
                      Contenido (HTML){d?.body ? '' : ' — pendiente'}
                    </summary>
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        value={d?.body ?? ''}
                        onChange={(e) => patchDraft(s.id, { body: e.target.value })}
                        placeholder="Pega aquí el HTML del correo (por ejemplo, exportado de Mailchimp — sus etiquetas se limpian al guardar)…"
                        style={{ ...inputStyle, width: '100%', minHeight: 140, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                        <label style={{ color: C.textMuted, fontSize: 12 }}>
                          …o sube un archivo .html:{' '}
                          <input
                            type="file"
                            accept=".html,text/html"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => patchDraft(s.id, { body: String(reader.result || '') });
                              reader.readAsText(file);
                              e.target.value = '';
                            }}
                            style={{ color: C.textMuted, fontSize: 12 }}
                          />
                        </label>
                        <span style={{ color: C.textFaint, fontSize: 12 }}>
                          Usa {'{{ user_name }}'} para el nombre. Guarda para aplicar los cambios.
                        </span>
                      </div>
                      {d?.body && (
                        <iframe
                          title={`Vista previa día ${s.day_offset}`}
                          sandbox=""
                          srcDoc={d.body.replace(/\{\{\s*user_name\s*\}\}/g, 'María')}
                          style={{ width: '100%', maxWidth: 620, height: 420, marginTop: 10, border: '1px solid #e2e2e2', borderRadius: 8, background: '#fff', display: 'block' }}
                        />
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingTop: 12,
                borderTop: `1px solid ${C.borderSoft}`,
                flexWrap: 'wrap',
              }}
            >
              <input
                type="number"
                min={0}
                placeholder="Día"
                value={newDay[b.key] ?? ''}
                onChange={(e) => setNewDay((p) => ({ ...p, [b.key]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addDay(b.key);
                }}
                style={{ ...inputStyle, width: 90 }}
              />
              <button
                type="button"
                onClick={() => addDay(b.key)}
                disabled={busyBucket === b.key}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${C.accent}`,
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: busyBucket === b.key ? 'default' : 'pointer',
                  background: 'transparent',
                  color: C.accent,
                }}
              >
                {busyBucket === b.key ? 'Agregando…' : '+ Agregar día'}
              </button>
              {addError[b.key] && (
                <span style={{ color: C.danger, fontSize: 12 }}>{addError[b.key]}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
