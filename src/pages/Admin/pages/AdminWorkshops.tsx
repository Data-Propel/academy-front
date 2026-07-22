import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  tracksApi,
  type TrackEngagement,
  type TrackEngagementUser,
} from '../../../services/api';
import { useAdmin } from '../AdminContext';
import PageHeader from '../components/PageHeader';

interface WorkshopOption {
  slug: string;
  name: string;
  event_date: string;
  track_slug: string | null;
}

interface CourseProgress {
  slug: string;
  title: string;
  enrolled: boolean;
  progress: number;
  completed: boolean;
}

interface Registration {
  id: number;
  full_name: string;
  nombre: string;
  apellido: string;
  email: string;
  pais: string;
  organizacion: string;
  tipo_organizacion: string;
  como_te_enteraste: string;
  newsletter: boolean;
  registered_at: string;
  attended_at: string | null;
  user_id: number | null;
  user_email: string | null;
  account_created_at: string | null;
  course_progress: CourseProgress[];
  certificate_issued_at: string | null;
  stage: number;
  // Stamped client-side at load time — the API returns registrations per
  // workshop, so each row carries its cohort for the combined view.
  workshop_slug: string;
  workshop_name: string;
  workshop_date: string;
}

interface ZoomParticipant {
  name: string;
  email: string;
  duration: number; // seconds
  join_time: string | null;
  leave_time: string | null;
  matched: boolean;
  staff: boolean;
}

interface ZoomAttendance {
  instance: { uuid: string; start_time: string } | null;
  count: number;
  matched: number;
  staff: number;
  walkins: number;
  participants: ZoomParticipant[];
}

interface PathCourse {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  thumbnail_url: string;
  release_date: string | null;
}

interface CourseOption {
  id: number;
  slug: string;
  title: string;
}

const STAGE_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Registrado', color: '#9aa5a1' },
  2: { label: 'Cuenta creada', color: '#5b8def' },
  3: { label: 'Inscrito', color: '#f8b81f' },
  4: { label: 'Completado', color: '#A3C94A' },
  5: { label: 'Certificado', color: '#0E4B43' },
};

// Paid-ads leads were imported with this exact `como_te_enteraste` value
// (Mailchimp meta_ads segment) — it's the durable marker for the cohort.
const PAID_SOURCE = 'Meta Ads';

// Combined selector options merge only workshops that share ~the same name
// (same series, different dates). Value scheme: 'group:<normalized name>'.
const GROUP_PREFIX = 'group:';
const normalizeGroup = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')   // drop "(25 jun)"-style suffixes
    .replace(/[^a-z ]+/g, ' ')    // drop digits/dates/punctuation
    .replace(/\s+/g, ' ').trim();
// Display name for a group: the shortest member name, sans parentheticals.
const groupDisplay = (members: WorkshopOption[]) =>
  members.reduce((a, b) => (a.name.length <= b.name.length ? a : b))
    .name.replace(/\s*\([^)]*\)\s*$/, '').trim();

// What each funnel card counts. Cumulative: each stage includes everyone who
// reached it or went further, so every card is ≤ the previous one.
const FUNNEL_STEPS = [
  { label: 'Registrados', desc: 'Llenaron el formulario del workshop' },
  { label: 'Cuenta creada', desc: 'Además crearon su cuenta en la plataforma' },
  { label: 'Inscritos', desc: 'Además entraron a al menos un curso de la ruta' },
  { label: 'Completaron la ruta', desc: 'Terminaron todos los cursos — también quienes vieron la grabación o llegaron directo a los cursos' },
  { label: 'Certificados', desc: 'Completaron todo y además asistieron al workshop en vivo' },
];

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminWorkshops() {
  const { showError } = useAdmin();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<number | ''>('');
  // Cumulative stage filter set by clicking a funnel card: keeps only rows with
  // stage >= threshold, so the row count matches the card's number. Mutually
  // exclusive with the exact-stage dropdown (both are stage filters).
  const [funnelFilter, setFunnelFilter] = useState<number | ''>('');
  const [boxFilter, setBoxFilter] = useState<'attended' | 'not_attended' | 'paid' | 'paid_attended' | ''>('');
  const [showStats, setShowStats] = useState(false);
  const [zoom, setZoom] = useState<ZoomAttendance | null>(null);
  const [zoomLoading, setZoomLoading] = useState(false);
  const [zoomErr, setZoomErr] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [path, setPath] = useState<PathCourse[]>([]);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [courseToAdd, setCourseToAdd] = useState<number | ''>('');
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);
  const [workshopSlug, setWorkshopSlug] = useState<string>('');
  const isAll = workshopSlug.startsWith(GROUP_PREFIX);
  const groupMembers = useMemo(
    () => isAll
      ? workshops.filter((w) => normalizeGroup(w.name) === workshopSlug.slice(GROUP_PREFIX.length))
      : [],
    [isAll, workshops, workshopSlug],
  );
  // Series with more than one date get a combined "todas las fechas" option.
  const groups = useMemo(() => {
    const m = new Map<string, WorkshopOption[]>();
    for (const w of workshops) {
      const k = normalizeGroup(w.name);
      const arr = m.get(k);
      if (arr) arr.push(w); else m.set(k, [w]);
    }
    return [...m.entries()].filter(([, ws]) => ws.length > 1);
  }, [workshops]);
  // Mirror track of the current selection — the source of truth for
  // route-level numbers (same source as the Rutas tab).
  const trackSlug = useMemo(() => {
    const w = isAll ? groupMembers[0] : workshops.find((x) => x.slug === workshopSlug);
    return w?.track_slug ?? null;
  }, [isAll, groupMembers, workshops, workshopSlug]);
  const [routeStats, setRouteStats] = useState<TrackEngagement | null>(null);
  const [routePeople, setRoutePeople] = useState<TrackEngagementUser[] | null>(null);
  const [routePeopleOpen, setRoutePeopleOpen] = useState(false);
  const [routePeopleLoading, setRoutePeopleLoading] = useState(false);

  useEffect(() => {
    setRouteStats(null); setRoutePeople(null); setRoutePeopleOpen(false);
    if (!trackSlug) return;
    (async () => {
      const res = await tracksApi.getEngagement(trackSlug);
      if (res.ok) setRouteStats(res.data as TrackEngagement);
    })();
  }, [trackSlug]);

  const routeCompleted = routeStats
    ? (routeStats.buckets[String(routeStats.total_courses)] ?? 0)
    : null;

  const toggleRoutePeople = async () => {
    if (routePeopleOpen) { setRoutePeopleOpen(false); return; }
    setRoutePeopleOpen(true);
    if (!routePeople && trackSlug && routeStats) {
      setRoutePeopleLoading(true);
      const res = await tracksApi.engagementUsers(trackSlug, routeStats.total_courses);
      setRoutePeopleLoading(false);
      if (res.ok && res.data) setRoutePeople(res.data.users);
    }
  };

  // Guided "Crear nueva ruta" flow: workshop + Zoom + courses, all from one
  // form. `creating` toggles the panel; the rest are form fields, with
  // `formCourseIds` collecting the 3-or-so courses tied to the ruta.
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formSlugTouched, setFormSlugTouched] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formZoomId, setFormZoomId] = useState('');
  const [formCertName, setFormCertName] = useState('Certificación en IA');
  const [formCourseIds, setFormCourseIds] = useState<number[]>([]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
     .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);

  const resetCreateForm = () => {
    setFormName(''); setFormSlug(''); setFormSlugTouched(false);
    setFormDate(''); setFormZoomId(''); setFormCertName('Certificación en IA');
    setFormCourseIds([]);
  };

  // Load the workshop list + global course catalog once. The selector reads
  // from `workshops`; default to the most-recent workshop (first in the list,
  // which is ordered by -event_date server-side).
  useEffect(() => {
    (async () => {
      const [w, c] = await Promise.all([
        adminApi.getWorkshops(),
        adminApi.getCourses(),
      ]);
      if (w.ok) {
        const list = w.data as WorkshopOption[];
        setWorkshops(list);
        if (list.length > 0 && !workshopSlug) {
          // Default: the most recent workshop's series, combined if it has
          // more than one date; otherwise just that workshop.
          const key = normalizeGroup(list[0].name);
          const members = list.filter((w) => normalizeGroup(w.name) === key);
          setWorkshopSlug(members.length > 1 ? GROUP_PREFIX + key : list[0].slug);
        }
      } else {
        showError('No se pudieron cargar los workshops.');
      }
      if (c.ok) setAllCourses((c.data as CourseOption[]).map((x) => ({ id: x.id, slug: x.slug, title: x.title })));
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Registrations — refetched whenever the admin switches the selector. The
  // combined view ("Todos los workshops") fetches every workshop's list in
  // parallel and stamps each row with its cohort; a single workshop also
  // loads its learning path.
  useEffect(() => {
    if (!workshopSlug) return;
    (async () => {
      setLoading(true);
      // Reset so the previous selection's data doesn't flash while loading.
      setRegs([]); setPath([]); setExpanded(null);
      setZoom(null); setZoomErr('');
      const tag = (rows: Registration[], w: WorkshopOption) =>
        rows.map((x) => ({ ...x, workshop_slug: w.slug, workshop_name: w.name, workshop_date: w.event_date }));
      if (workshopSlug.startsWith(GROUP_PREFIX)) {
        const key = workshopSlug.slice(GROUP_PREFIX.length);
        const members = workshops.filter((w) => normalizeGroup(w.name) === key);
        const results = await Promise.all(
          members.map(async (w) => ({ w, res: await adminApi.getWorkshopRegistrations(w.slug) })),
        );
        setLoading(false);
        const merged: Registration[] = [];
        for (const { w, res } of results) {
          if (res.ok) merged.push(...tag(res.data as Registration[], w));
          else showError(`No se pudieron cargar las inscripciones de ${w.name}.`);
        }
        merged.sort((a, b) => +new Date(b.registered_at) - +new Date(a.registered_at));
        setRegs(merged);
      } else {
        const w = workshops.find((x) => x.slug === workshopSlug)
          ?? { slug: workshopSlug, name: '', event_date: '', track_slug: null };
        const [r, p] = await Promise.all([
          adminApi.getWorkshopRegistrations(workshopSlug),
          adminApi.getWorkshopPath(workshopSlug),
        ]);
        setLoading(false);
        if (r.ok) setRegs(tag(r.data as Registration[], w));
        else showError('No se pudieron cargar las inscripciones.');
        if (p.ok) setPath(p.data as PathCourse[]);
      }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [workshopSlug, workshops]);

  // Courses available to add = all courses minus those already on the path.
  const availableCourses = useMemo(() => {
    const taken = new Set(path.map((p) => p.id));
    return allCourses.filter((c) => !taken.has(c.id));
  }, [allCourses, path]);

  const addCourseToPath = async () => {
    if (courseToAdd === '') return;
    const id = Number(courseToAdd);
    const res = await adminApi.addWorkshopPathCourse(workshopSlug, id);
    if (!res.ok) { showError('No se pudo agregar el curso.'); return; }
    setPath((cur) => [...cur, res.data as PathCourse]);
    setCourseToAdd('');
  };

  const removeFromPath = async (id: number) => {
    const res = await adminApi.removeWorkshopPathCourse(workshopSlug, id);
    if (!res.ok) { showError('No se pudo quitar el curso.'); return; }
    setPath((cur) => cur.filter((p) => p.id !== id));
  };

  // Persist the Fecha shown on a ruta card. Optimistic — reverts on failure.
  const setPathDate = async (id: number, value: string) => {
    const next = value || null;
    const prev = path;
    setPath((cur) => cur.map((p) => p.id === id ? { ...p, release_date: next } : p));
    const res = await adminApi.setWorkshopPathDate(workshopSlug, id, next);
    if (!res.ok) { setPath(prev); showError('No se pudo guardar la fecha.'); }
  };

  // Toggle the registrant's workshop-attended flag. Optimistic — reverts on
  // failure so the table doesn't lie if the network drops.
  const toggleAttendance = async (reg: Registration) => {
    const next = !reg.attended_at;
    setRegs((cur) => cur.map((r) => r.id === reg.id ? { ...r, attended_at: next ? new Date().toISOString() : null } : r));
    const res = await adminApi.setWorkshopAttendance(reg.workshop_slug, reg.id, next);
    if (!res.ok) {
      setRegs((cur) => cur.map((r) => r.id === reg.id ? { ...r, attended_at: reg.attended_at } : r));
      showError('No se pudo actualizar la asistencia.');
    }
  };

  // Pull the live Zoom participant list for the selected workshop on demand.
  const loadZoom = async () => {
    setZoomLoading(true); setZoomErr('');
    const res = await adminApi.getWorkshopZoomAttendance(workshopSlug);
    setZoomLoading(false);
    if (res.ok) setZoom(res.data as ZoomAttendance);
    else {
      const d = res.data as { detail?: string };
      setZoomErr(d?.detail || 'No se pudo cargar la asistencia de Zoom.');
    }
  };

  const submitCreate = async () => {
    if (!formName.trim() || !formSlug.trim() || !formDate) {
      showError('Nombre, slug y fecha son obligatorios.');
      return;
    }
    setCreateBusy(true);
    // Browser's datetime-local gives "YYYY-MM-DDTHH:MM"; backend accepts that
    // as a naive datetime in DRF's default parser.
    const wRes = await adminApi.createWorkshop({
      name: formName.trim(),
      slug: formSlug.trim(),
      event_date: formDate,
      zoom_meeting_id: formZoomId.trim() || undefined,
      certification_name: formCertName.trim() || undefined,
    });
    if (!wRes.ok) {
      setCreateBusy(false);
      const detail = wRes.data && typeof wRes.data === 'object' && 'detail' in wRes.data
        ? String((wRes.data as { detail: unknown }).detail) : 'No se pudo crear el workshop.';
      showError(detail);
      return;
    }
    const created = wRes.data as { slug: string; name: string; event_date: string };

    // Attach courses sequentially (the path endpoint appends one at a time and
    // backfills enrollments; sequential keeps order_index deterministic).
    for (const id of formCourseIds) {
      await adminApi.addWorkshopPathCourse(created.slug, id);
    }

    // Refresh the selector list and switch to the new ruta — its data fetches
    // automatically via the [workshopSlug] effect.
    const wList = await adminApi.getWorkshops();
    if (wList.ok) setWorkshops(wList.data as WorkshopOption[]);
    setWorkshopSlug(created.slug);
    setCreating(false);
    resetCreateForm();
    setCreateBusy(false);
  };

  // Swap two cards locally, persist the new order. Roll back on failure so the
  // UI never diverges from the server.
  const movePath = async (id: number, dir: -1 | 1) => {
    const idx = path.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= path.length) return;
    const next = [...path];
    [next[idx], next[target]] = [next[target], next[idx]];
    const prev = path;
    setPath(next);
    const res = await adminApi.reorderWorkshopPath(workshopSlug, next.map((p) => p.id));
    if (!res.ok) { setPath(prev); showError('No se pudo reordenar.'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter((r) => {
      if (stageFilter !== '' && r.stage !== stageFilter) return false;
      if (funnelFilter !== '' && r.stage < funnelFilter) return false;
      const isPaid = r.como_te_enteraste?.trim() === PAID_SOURCE;
      if (boxFilter === 'attended' && !r.attended_at) return false;
      if (boxFilter === 'not_attended' && r.attended_at) return false;
      if (boxFilter === 'paid' && !isPaid) return false;
      if (boxFilter === 'paid_attended' && !(isPaid && r.attended_at)) return false;
      if (!q) return true;
      return (
        r.email.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        r.organizacion.toLowerCase().includes(q) ||
        r.pais.toLowerCase().includes(q)
      );
    });
  }, [regs, search, stageFilter, funnelFilter, boxFilter]);

  // Zoom minutes per registration email (a participant may rejoin, so sum the
  // sessions). Null until the admin loads the Zoom attendance.
  const zoomByEmail = useMemo(() => {
    if (!zoom) return null;
    const m = new Map<string, number>();
    for (const p of zoom.participants) {
      const em = p.email.trim().toLowerCase();
      if (!em) continue;
      m.set(em, (m.get(em) ?? 0) + p.duration);
    }
    return m;
  }, [zoom]);

  // Attendance / paid-ads counts for the clickable square boxes. Computed from
  // the full list so they read as totals, independent of search/stage filters.
  const attendStats = useMemo(() => {
    let attended = 0, paid = 0, paidAttended = 0;
    for (const r of regs) {
      const isPaid = r.como_te_enteraste?.trim() === PAID_SOURCE;
      const att = !!r.attended_at;
      if (att) attended++;
      if (isPaid) paid++;
      if (isPaid && att) paidAttended++;
    }
    return { attended, notAttended: regs.length - attended, paid, paidAttended };
  }, [regs]);

  // Registrations grouped by country, sorted desc. Based on the full list so
  // it reads as a total breakdown, independent of the search/stage filters.
  const byCountry = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of regs) {
      const key = r.pais.trim() || 'Sin especificar';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([pais, count]) => ({ pais, count }))
      .sort((a, b) => b.count - a.count);
  }, [regs]);

  const maxCountry = byCountry[0]?.count ?? 1;

  // Cumulative funnel (each stage includes everyone who reached it or beyond),
  // computed from the loaded rows so it works for one workshop or all combined
  // and always matches the table counts.
  // Card 4 ("Completaron la ruta") shows the route-wide number — the same
  // source the Rutas tab uses — because the route also includes people who
  // came via the recording or straight to the courses. The rest of the cards
  // are the registrant funnel. Falls back to the registrant count while the
  // track data loads (or if the workshop has no mirror track).
  const funnel = useMemo(
    () => FUNNEL_STEPS.map((s, i) => ({
      ...s,
      value: i === 3 && routeCompleted !== null
        ? routeCompleted
        : regs.filter((r) => r.stage >= i + 1).length,
    })),
    [regs, routeCompleted],
  );

  const exportCsv = () => {
    const headers = [
      ...(isAll ? ['Workshop'] : []),
      'Nombre', 'Apellido', 'Email', 'País', 'Organización', 'Tipo de organización',
      'Cómo se enteró', 'Newsletter', 'Registrado', 'Asistió', 'Etapa', 'Cuenta', 'Certificado',
    ];
    const rows = filtered.map((r) => [
      ...(isAll ? [`${r.workshop_name} — ${fmtDate(r.workshop_date)}`] : []),
      r.nombre, r.apellido, r.email, r.pais, r.organizacion, r.tipo_organizacion,
      r.como_te_enteraste, r.newsletter ? 'Sí' : 'No', fmtDate(r.registered_at),
      r.attended_at ? 'Sí' : 'No',
      STAGE_META[r.stage]?.label ?? r.stage,
      r.account_created_at ? fmtDate(r.account_created_at) : '',
      r.certificate_issued_at ? fmtDate(r.certificate_issued_at) : '',
    ]);
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscripciones-${isAll ? workshopSlug.slice(GROUP_PREFIX.length).replace(/ /g, '-') : workshopSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        .wk-funnel { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
        @media (max-width: 900px) { .wk-funnel { grid-template-columns: repeat(2, 1fr); } }
        .wk-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 16px; }
        button.wk-card { cursor: pointer; font: inherit; text-align: left; width: 100%; transition: border-color 0.15s; }
        button.wk-card:hover:not(:disabled) { border-color: rgba(255,255,255,0.28); }
        button.wk-card:disabled { cursor: default; opacity: 0.6; }
        .wk-card--active { border-color: #FD6A44; background: rgba(253,106,68,0.12); }
        .wk-count { font-family: 'Libre Franklin', sans-serif; font-size: 0.85rem; color: rgba(242,242,242,0.7); white-space: nowrap; }
        .wk-card-value { font-family: 'Libre Franklin', sans-serif; font-size: 32px; font-weight: 700; color: #F2F2F2; line-height: 1; }
        .wk-card-label { font-family: 'Libre Franklin', sans-serif; font-size: 0.8rem; color: rgba(242,242,242,0.7); margin-top: 6px; }
        .wk-card-desc { font-family: 'Libre Franklin', sans-serif; font-size: 0.72rem; color: rgba(242,242,242,0.5); margin-top: 4px; line-height: 1.35; }
        .wk-bar { height: 4px; border-radius: 2px; margin-top: 12px; background: #FD6A44; }
        .wk-stats-toggle { background: none; border: none; color: #FD6A44; font-family: 'Libre Franklin', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 18px; }
        .wk-stats-toggle:hover { text-decoration: underline; }
        .wk-stats { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 28px; }
        .wk-stats-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .wk-stats-head h3 { font-family: 'Libre Franklin', sans-serif; font-size: 1.05rem; color: #F2F2F2; margin: 0; }
        .wk-stats-head span { font-family: 'Libre Franklin', sans-serif; font-size: 0.78rem; color: rgba(242,242,242,0.6); }
        .wk-stats-bars { display: flex; flex-direction: column; gap: 8px; }
        .wk-stat-row { display: flex; align-items: center; gap: 12px; }
        .wk-stat-label { flex: 0 0 140px; font-family: 'Libre Franklin', sans-serif; font-size: 0.85rem; color: #F2F2F2; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wk-stat-track { flex: 1; height: 16px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
        .wk-stat-fill { height: 100%; background: #FD6A44; border-radius: 4px; min-width: 2px; }
        .wk-stat-count { flex: 0 0 36px; font-family: 'Libre Franklin', sans-serif; font-size: 0.9rem; font-weight: 600; color: #F2F2F2; }
        @media (max-width: 700px) { .wk-stat-label { flex-basis: 96px; } }
        .wk-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
        .wk-toolbar input, .wk-toolbar select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Libre Franklin', sans-serif; font-size: 0.9rem; }
        .wk-toolbar input { flex: 1; min-width: 220px; }
        .wk-export { background: #FD6A44; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-family: 'Libre Franklin', sans-serif; }
        .wk-export:hover { background: #e55a36; }
        .wk-badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #fff; }
        .wk-detail { background: rgba(255,255,255,0.03); padding: 16px 20px; }
        .wk-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px; }
        .wk-detail-grid .k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(242,242,242,0.5); }
        .wk-detail-grid .v { font-size: 0.9rem; color: #F2F2F2; margin-top: 2px; }
        .wk-course { display: flex; align-items: center; gap: 10px; margin: 6px 0; font-size: 0.85rem; color: #F2F2F2; }
        .wk-course-bar { flex: 1; max-width: 200px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; }
        .wk-course-fill { height: 100%; background: #A3C94A; }
        .wk-link { color: #FD6A44; text-decoration: none; }
        .wk-path-section { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 18px 20px; margin-bottom: 28px; }
        .wk-path-title { font-family: 'Libre Franklin', sans-serif; font-size: 1.05rem; color: #F2F2F2; margin: 0 0 4px; }
        .wk-path-sub { font-family: 'Libre Franklin', sans-serif; font-size: 0.78rem; color: rgba(242,242,242,0.6); margin: 0 0 14px; }
        .wk-path-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .wk-path-item { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px; }
        .wk-path-thumb { width: 56px; height: 40px; object-fit: cover; border-radius: 4px; background: rgba(255,255,255,0.06); }
        .wk-path-name { flex: 1; font-size: 0.9rem; color: #F2F2F2; }
        .wk-path-date { display: flex; flex-direction: column; gap: 2px; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(242,242,242,0.5); }
        .wk-path-date input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 5px 8px; border-radius: 5px; font-family: 'Libre Franklin', sans-serif; font-size: 0.8rem; color-scheme: dark; }
        .wk-path-actions { display: flex; gap: 4px; }
        .wk-path-btn { background: rgba(255,255,255,0.08); color: #F2F2F2; border: none; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
        .wk-path-btn:hover { background: rgba(255,255,255,0.14); }
        .wk-path-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .wk-path-btn--danger:hover { background: rgba(252,92,58,0.6); }
        .wk-path-add { display: flex; gap: 10px; align-items: center; }
        .wk-path-add select { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Libre Franklin', sans-serif; font-size: 0.9rem; }
        .wk-path-add button { background: #FD6A44; color: #fff; border: none; padding: 9px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-family: 'Libre Franklin', sans-serif; }
        .wk-path-add button:disabled { opacity: 0.4; cursor: not-allowed; }
        .wk-path-empty { font-size: 0.85rem; color: rgba(242,242,242,0.5); margin-bottom: 14px; }
        .wk-create-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .wk-create-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; color: rgba(242,242,242,0.7); }
        .wk-create-grid label input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #F2F2F2; padding: 9px 12px; border-radius: 6px; font-family: 'Libre Franklin', sans-serif; font-size: 0.9rem; }
        .wk-create-grid__full { grid-column: 1 / -1; }
        .wk-create-subhead { font-family: 'Libre Franklin', sans-serif; font-size: 0.95rem; color: #F2F2F2; margin: 4px 0 6px; }
        .wk-create-actions { display: flex; gap: 10px; margin-top: 18px; }
        @media (max-width: 700px) { .wk-create-grid { grid-template-columns: 1fr; } }
        .wk-scope-note { font-family: 'Libre Franklin', sans-serif; font-size: 0.82rem; color: rgba(242,242,242,0.6); margin: 0 0 14px; max-width: 720px; line-height: 1.5; }
      `}</style>

      <PageHeader
        title="Workshops"
        subtitle={
          isAll && groupMembers.length > 0
            ? `${groupDisplay(groupMembers)} — todas las fechas combinadas`
            : workshops.find((w) => w.slug === workshopSlug)?.name
              ?? 'Inscripciones y embudo de certificación'
        }
      />

      <div className="admin-content">
        <div className="wk-toolbar" style={{ marginBottom: 18 }}>
          <label style={{ fontSize: '0.85rem', color: 'rgba(242,242,242,0.7)' }}>
            Workshop:
          </label>
          <select
            value={workshopSlug}
            onChange={(e) => setWorkshopSlug(e.target.value)}
            disabled={workshops.length === 0}
          >
            {workshops.length === 0 && <option value="">— Sin workshops —</option>}
            {groups.map(([key, ws]) => (
              <option key={GROUP_PREFIX + key} value={GROUP_PREFIX + key}>
                {groupDisplay(ws)} — todas las fechas ({ws.length})
              </option>
            ))}
            {workshops.map((w) => (
              <option key={w.slug} value={w.slug}>{w.name} — {fmtDate(w.event_date)}</option>
            ))}
          </select>
          <button className="wk-export" onClick={() => setCreating(true)}>
            + Crear nueva ruta
          </button>
        </div>

        {creating && (
          <section className="wk-path-section">
            <h2 className="wk-path-title">Nueva ruta</h2>
            <p className="wk-path-sub">
              Crea el workshop con su Zoom y elige los cursos que forman la ruta de aprendizaje.
            </p>

            <div className="wk-create-grid">
              <label>
                <span>Nombre del workshop *</span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formSlugTouched) setFormSlug(slugify(e.target.value));
                  }}
                  placeholder="Lidera con un IA mindset"
                />
              </label>
              <label>
                <span>Slug (URL) *</span>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => { setFormSlug(slugify(e.target.value)); setFormSlugTouched(true); }}
                  placeholder="lidera-ia"
                />
              </label>
              <label>
                <span>Fecha y hora del evento *</span>
                <input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label>
                <span>Zoom Meeting ID</span>
                <input
                  type="text"
                  value={formZoomId}
                  onChange={(e) => setFormZoomId(e.target.value.replace(/\s+/g, ''))}
                  placeholder="123 4567 8901"
                />
              </label>
              <label className="wk-create-grid__full">
                <span>Nombre de la certificación</span>
                <input
                  type="text"
                  value={formCertName}
                  onChange={(e) => setFormCertName(e.target.value)}
                />
              </label>
            </div>

            <h3 className="wk-create-subhead">Cursos de la ruta</h3>
            <p className="wk-path-sub">
              Selecciona los cursos que el participante debe completar para obtener la certificación. Pueden ser tres o más.
            </p>
            {formCourseIds.length > 0 && (
              <div className="wk-path-list">
                {formCourseIds.map((cid, i) => {
                  const c = allCourses.find((x) => x.id === cid);
                  return (
                    <div className="wk-path-item" key={cid}>
                      <div className="wk-path-thumb" />
                      <div className="wk-path-name">{i + 1}. {c?.title ?? `Curso #${cid}`}</div>
                      <div className="wk-path-actions">
                        <button
                          className="wk-path-btn wk-path-btn--danger"
                          onClick={() => setFormCourseIds((ids) => ids.filter((x) => x !== cid))}
                          aria-label="Quitar"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wk-path-add">
              <select
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id) setFormCourseIds((ids) => ids.includes(id) ? ids : [...ids, id]);
                }}
              >
                <option value="">Agregar curso…</option>
                {allCourses
                  .filter((c) => !formCourseIds.includes(c.id))
                  .map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            <div className="wk-create-actions">
              <button
                className="wk-export"
                onClick={submitCreate}
                disabled={createBusy}
              >
                {createBusy ? 'Creando…' : 'Crear ruta'}
              </button>
              <button
                className="wk-path-btn"
                style={{ width: 'auto', padding: '9px 14px' }}
                onClick={() => { setCreating(false); resetCreateForm(); }}
                disabled={createBusy}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
        {!isAll && (
        <section className="wk-path-section">
          <h2 className="wk-path-title">Ruta de aprendizaje</h2>
          <p className="wk-path-sub">
            Cursos que aparecen en la sección "Certificación en IA" del landing y que el participante debe completar para certificarse.
          </p>

          {path.length === 0 ? (
            <p className="wk-path-empty">Aún no hay cursos en la ruta.</p>
          ) : (
            <div className="wk-path-list">
              {path.map((c, i) => (
                <div className="wk-path-item" key={c.id}>
                  {c.thumbnail_url
                    ? <img className="wk-path-thumb" src={c.thumbnail_url} alt="" />
                    : <div className="wk-path-thumb" />}
                  <div className="wk-path-name">
                    {i + 1}. {c.title}
                  </div>
                  <label className="wk-path-date" title="Fecha mostrada en la tarjeta del landing">
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={c.release_date ?? ''}
                      onChange={(e) => setPathDate(c.id, e.target.value)}
                    />
                  </label>
                  <div className="wk-path-actions">
                    <button
                      className="wk-path-btn"
                      onClick={() => movePath(c.id, -1)}
                      disabled={i === 0}
                      aria-label="Subir"
                    >↑</button>
                    <button
                      className="wk-path-btn"
                      onClick={() => movePath(c.id, 1)}
                      disabled={i === path.length - 1}
                      aria-label="Bajar"
                    >↓</button>
                    <button
                      className="wk-path-btn wk-path-btn--danger"
                      onClick={() => removeFromPath(c.id)}
                      aria-label="Quitar"
                    >✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="wk-path-add">
            <select
              value={courseToAdd}
              onChange={(e) => setCourseToAdd(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Selecciona un curso…</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <button onClick={addCourseToPath} disabled={courseToAdd === ''}>
              Agregar
            </button>
          </div>
        </section>
        )}

        <p className="wk-scope-note">
          {isAll
            ? 'Estas cifras combinan todas las fechas de este workshop. '
            : 'Estas cifras incluyen solo a quienes se registraron a esta fecha del workshop. '}
          Cada tarjeta del embudo es acumulativa: incluye también a quienes avanzaron a etapas
          posteriores, por eso cada número es menor o igual que el anterior. La excepción es
          «Completaron la ruta», que usa la misma fuente que la pestaña Rutas: toda la comunidad
          de los cursos, incluidas las personas que llegaron por la grabación o por su cuenta
          sin registrarse al workshop.
        </p>

        <div className="wk-funnel">
          {funnel.map((f, i) => (
            <button
              type="button"
              className={`wk-card${funnelFilter === i + 1 || (i === 3 && routePeopleOpen) ? ' wk-card--active' : ''}`}
              key={f.label}
              title={i === 3 && routeCompleted !== null
                ? 'Ver a las personas que terminaron toda la ruta'
                : 'Ver a estas personas en la tabla'}
              disabled={regs.length === 0}
              onClick={() => {
                if (i === 3 && routeCompleted !== null) { toggleRoutePeople(); return; }
                setFunnelFilter((cur) => (cur === i + 1 ? '' : i + 1));
                setStageFilter('');
              }}
            >
              <div className="wk-card-value">{f.value}</div>
              <div className="wk-card-label">{f.label}</div>
              <div className="wk-card-desc">{f.desc}</div>
              <div
                className="wk-bar"
                style={{
                  width:
                    funnel[0].value > 0
                      ? `${Math.round((f.value / funnel[0].value) * 100)}%`
                      : '0%',
                  opacity: 1 - i * 0.12,
                }}
              />
            </button>
          ))}
        </div>

        {routePeopleOpen && (
          <section className="wk-stats">
            <div className="wk-stats-head">
              <h3>Terminaron toda la ruta</h3>
              <span>
                misma cifra que la pestaña Rutas — incluye a quienes llegaron por la
                grabación o directo a los cursos, sin registrarse al workshop
              </span>
            </div>
            {routePeopleLoading ? (
              <div style={{ color: 'rgba(242,242,242,0.6)', fontSize: '0.85rem' }}>Cargando…</div>
            ) : (
              <div className="admin-table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr><th>Email</th><th>Nombre</th><th>Cursos</th></tr>
                  </thead>
                  <tbody>
                    {(routePeople ?? []).map((u) => (
                      <tr key={u.email}>
                        <td>{u.email}</td>
                        <td>{u.first_name} {u.last_name}</td>
                        <td>{u.completed}/{routeStats?.total_courses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <div className="wk-squares">
          {([
            { key: 'attended', label: 'Asistieron', value: attendStats.attended },
            { key: 'not_attended', label: 'No asistieron', value: attendStats.notAttended },
            { key: 'paid', label: 'Vinieron de Meta Ads', value: attendStats.paid },
            { key: 'paid_attended', label: 'Meta Ads que asistieron', value: attendStats.paidAttended },
          ] as const).map((b) => (
            <button
              key={b.key}
              type="button"
              className={`wk-square${boxFilter === b.key ? ' wk-square--active' : ''}`}
              onClick={() => setBoxFilter((cur) => (cur === b.key ? '' : b.key))}
              disabled={regs.length === 0}
            >
              <span className="wk-square-value">{b.value}</span>
              <span className="wk-square-label">{b.label}</span>
            </button>
          ))}
        </div>

        {!isAll && (
        <div className="wk-zoom">
          <button
            className="wk-stats-toggle"
            onClick={loadZoom}
            disabled={zoomLoading || !workshopSlug}
          >
            {zoomLoading
              ? 'Cargando asistencia de Zoom…'
              : zoom ? 'Actualizar asistencia de Zoom ⟳' : 'Ver asistencia de Zoom (en vivo) ▼'}
          </button>
          {zoomErr && (
            <div style={{ color: '#c0392b', marginTop: 8 }}>{zoomErr}</div>
          )}
          {zoom && (
            <section className="wk-stats">
              <div className="wk-stats-head">
                <h3>Asistencia de Zoom{zoom.instance ? ` — ${fmtDate(zoom.instance.start_time)}` : ''}</h3>
                <span>
                  {zoom.count} en la sesión · {zoom.matched} registrados · {zoom.walkins} walk-ins · {zoom.staff} staff
                </span>
              </div>
              <p className="wk-path-sub" style={{ marginBottom: 10 }}>
                Los registrados que estuvieron en la sesión aparecen en la tabla de inscripciones
                (columna «Zoom»). Aquí solo se listan quienes entraron sin registrarse y el staff.
              </p>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Min</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {zoom.participants.filter((p) => !p.matched).map((p, i) => (
                      <tr key={p.email || `${p.name}-${i}`}>
                        <td>{p.name || '—'}</td>
                        <td>{p.email || '—'}</td>
                        <td>{Math.round(p.duration / 60)}</td>
                        <td>{p.staff ? 'Staff' : 'Walk-in'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
        )}

        <button
          className="wk-stats-toggle"
          onClick={() => setShowStats((s) => !s)}
          disabled={regs.length === 0}
        >
          {showStats ? 'Ocultar estadísticas ▲' : 'Mostrar estadísticas ▼'}
        </button>

        {showStats && (
          <section className="wk-stats">
            <div className="wk-stats-head">
              <h3>Registrados por país</h3>
              <span>{regs.length} registros · {byCountry.length} países</span>
            </div>
            <div className="wk-stats-bars">
              {byCountry.map(({ pais, count }) => (
                <div className="wk-stat-row" key={pais}>
                  <span className="wk-stat-label" title={pais}>{pais}</span>
                  <div className="wk-stat-track">
                    <div
                      className="wk-stat-fill"
                      style={{ width: `${(count / maxCountry) * 100}%` }}
                    />
                  </div>
                  <span className="wk-stat-count">{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="wk-toolbar">
          <input
            type="text"
            placeholder="Buscar por email, nombre, organización o país…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value === '' ? '' : Number(e.target.value));
              setFunnelFilter('');
            }}
          >
            <option value="">Todas las etapas</option>
            {Object.entries(STAGE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <span className="wk-count">
            {filtered.length === regs.length
              ? `${regs.length} inscripciones`
              : `${filtered.length} de ${regs.length} inscripciones`}
          </span>
          <button className="wk-export" onClick={exportCsv} disabled={filtered.length === 0}>
            Exportar CSV
          </button>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div className="admin-loading-overlay">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">No hay inscripciones que coincidan.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>País</th>
                  <th>Organización</th>
                  <th>Registrado</th>
                  {isAll && <th>Workshop</th>}
                  <th>Asistió</th>
                  {zoomByEmail && <th>Zoom</th>}
                  <th>Etapa</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const meta = STAGE_META[r.stage] ?? STAGE_META[1];
                  const isOpen = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : r.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{i + 1}</td>
                        <td>{r.email}</td>
                        <td>{r.full_name}</td>
                        <td>{r.pais}</td>
                        <td>{r.organizacion}</td>
                        <td>{fmtDate(r.registered_at)}</td>
                        {isAll && <td title={r.workshop_name}>{fmtDate(r.workshop_date)}</td>}
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!!r.attended_at}
                            onChange={() => toggleAttendance(r)}
                            aria-label={r.attended_at ? 'Marcado como asistió' : 'Marcar asistencia'}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        {zoomByEmail && (
                          <td>
                            {(() => {
                              const secs = zoomByEmail.get(r.email.trim().toLowerCase());
                              return secs !== undefined ? `${Math.round(secs / 60)} min` : '—';
                            })()}
                          </td>
                        )}
                        <td>
                          <span className="wk-badge" style={{ background: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8 + (isAll ? 1 : 0) + (zoomByEmail ? 1 : 0)} style={{ padding: 0 }}>
                            <div className="wk-detail">
                              <div className="wk-detail-grid">
                                <div>
                                  <div className="k">Tipo de organización</div>
                                  <div className="v">{r.tipo_organizacion || '—'}</div>
                                </div>
                                <div>
                                  <div className="k">Cómo se enteró</div>
                                  <div className="v">{r.como_te_enteraste || '—'}</div>
                                </div>
                                <div>
                                  <div className="k">Newsletter</div>
                                  <div className="v">{r.newsletter ? 'Sí' : 'No'}</div>
                                </div>
                                <div>
                                  <div className="k">Cuenta en plataforma</div>
                                  <div className="v">
                                    {r.user_id
                                      ? `Sí · ${fmtDate(r.account_created_at)}`
                                      : 'No creada'}
                                  </div>
                                </div>
                                <div>
                                  <div className="k">Certificado</div>
                                  <div className="v">
                                    {r.certificate_issued_at ? fmtDate(r.certificate_issued_at) : 'No emitido'}
                                  </div>
                                </div>
                              </div>

                              {r.course_progress.length > 0 ? (
                                <div>
                                  <div className="k" style={{ marginBottom: 6, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(242,242,242,0.5)' }}>
                                    Progreso de cursos
                                  </div>
                                  {r.course_progress.map((c) => (
                                    <div className="wk-course" key={c.slug}>
                                      <span style={{ minWidth: 200 }}>{c.title}</span>
                                      <div className="wk-course-bar">
                                        <div className="wk-course-fill" style={{ width: `${c.progress}%` }} />
                                      </div>
                                      <span style={{ minWidth: 90 }}>
                                        {c.completed ? '✓ Completado' : c.enrolled ? `${c.progress}%` : 'No inscrito'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="v" style={{ fontSize: '0.85rem', color: 'rgba(242,242,242,0.6)' }}>
                                  Sin cursos de certificación configurados o sin cuenta vinculada.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
