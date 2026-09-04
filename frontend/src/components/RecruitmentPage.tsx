import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlarmClock,
  Baby,
  Bone,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Cross,
  Ear,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartPulse,
  IndianRupee,
  MapPin,
  Microscope,
  ScanLine,
  Scissors,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  fetchPublishedRecruitment,
  Recruitment,
  VacancyRecord,
} from '../api/recruitments';

const PAGE_STYLES = `
  .recruit-page {
    min-height: 100vh;
    background: #f8fafc;
    color: #111827;
    padding-bottom: 96px;
  }

  .recruit-shell {
    width: min(1380px, calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 32px;
  }

  .recruit-top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 14px;
    align-items: stretch;
  }

  .recruit-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  }

  .recruit-hero {
    min-height: auto;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    border-color: #c9dcff;
    background: linear-gradient(120deg, #f0f6ff 0%, #f8fbff 55%, #ffffff 100%);
  }

  .recruit-hero.private {
    border-color: #bcebd8;
    background: linear-gradient(120deg, #ecfdf5 0%, #f6fdf9 55%, #ffffff 100%);
  }

  .recruit-badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .recruit-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .sector-badge, .official-badge, .tiny-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 7px;
    font-weight: 700;
    white-space: nowrap;
  }

  .sector-badge {
    padding: 5px 10px;
    font-size: 11.5px;
    color: #ffffff;
    background: #1463ff;
    box-shadow: 0 2px 6px rgba(20, 99, 255, .15);
  }

  .sector-badge.private { background: #059669; }

  .official-badge {
    padding: 5px 9px;
    font-size: 11.5px;
    color: #15803d;
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
  }

  .recruit-bookmark {
    width: 34px;
    height: 34px;
    border: 1px solid #dbe4ef;
    border-radius: 8px;
    background: #ffffff;
    color: #64748b;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all .15s ease;
  }
  .recruit-bookmark:hover { border-color: #93c5fd; color: #1d4ed8; }

  .recruit-hero-main {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 16px;
    align-items: center;
    margin-top: 14px;
  }

  .org-seal {
    width: 86px;
    height: 86px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #ffffff;
    border: 4px solid #f1c34f;
    box-shadow: 0 4px 12px rgba(15,23,42,.08);
  }

  .org-seal-inner {
    width: 70px;
    height: 70px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    text-align: center;
    background: linear-gradient(145deg, #0745a8 0%, #092f79 100%);
    border: 2px solid #174da4;
    color: #ffd85b;
  }

  .org-seal.private { border-color: #a7e6cf; }
  .org-seal.private .org-seal-inner {
    background: linear-gradient(145deg, #059669 0%, #087f6e 100%);
    border-color: #34c79d;
    color: #ffffff;
  }

  .seal-icon { margin-bottom: 2px; }
  .seal-name { font-size: 11px; line-height: 1; font-weight: 900; letter-spacing: .5px; }

  .recruit-title {
    margin: 0;
    color: #0f172a;
    font-size: clamp(20px, 2.2vw, 27px);
    line-height: 1.25;
    letter-spacing: -.3px;
    font-weight: 800;
  }

  .recruit-org {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #1463ff;
    font-size: 15px;
    font-weight: 700;
  }

  .private .recruit-org { color: #059669; }

  .recruit-location {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 13px;
  }

  .recruit-meta-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
  }

  .recruit-meta-item {
    min-width: 140px;
    padding-right: 14px;
    border-right: 1px solid #e2e8f0;
  }

  .recruit-meta-item:last-child { border-right: 0; }
  .meta-label { color: #64748b; font-size: 11px; font-weight: 500; }
  .meta-value { margin-top: 2px; color: #0f172a; font-size: 13.5px; font-weight: 800; }
  .meta-value.deadline { color: #ef4444; }

  .action-panel {
    padding: 16px;
    border-color: #ffc7c7;
    background: linear-gradient(180deg, #fff8f8 0%, #ffffff 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .deadline-box {
    border: 1px solid #fecdd3;
    border-radius: 8px;
    padding: 8px 10px;
    background: #fff1f2;
    color: #e11d48;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .action-copy {
    margin: 8px 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  .action-stack { display: grid; gap: 8px; }

  .action-btn {
    width: 100%;
    min-height: 38px;
    padding: 8px 12px;
    border-radius: 7px;
    border: 1px solid #dbe4ef;
    background: #ffffff;
    color: #1f2937;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    transition: all .15s ease;
  }

  .action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(15,23,42,.07); border-color: #bfd2ef; }
  .action-btn.primary { background: #1463ff; border-color: #1463ff; color: #ffffff; }
  .action-btn.primary:hover { background: #0b51de; }
  .action-btn.private-primary { background: #059669; border-color: #059669; color: #ffffff; }
  .action-btn.share { color: #1463ff; }

  /* Summary Section: compact, sleek 5-grid */
  .summary-shell { margin-top: 14px; padding: 12px 16px; }
  .section-eyebrow { margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #0f172a; }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .summary-item {
    min-height: 58px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid #eef2f6;
    border-radius: 8px;
    background: #f8fafc;
  }

  .summary-icon { width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 8px; }
  .icon-blue { background: #eff6ff; color: #1463ff; }
  .icon-green { background: #f0fdf4; color: #16a34a; }
  .icon-purple { background: #faf5ff; color: #7c3aed; }
  .icon-orange { background: #fff7ed; color: #ea580c; }
  .icon-rose { background: #fff1f2; color: #e11d48; }
  .icon-indigo { background: #eef2ff; color: #4f46e5; }
  .icon-teal { background: #f0fdfa; color: #0d9488; }

  .summary-label { color: #64748b; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
  .summary-value { color: #0f172a; font-size: 13px; font-weight: 800; line-height: 1.25; margin-top: 1px; }
  .summary-helper { margin-top: 1px; color: #94a3b8; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Explorer: 2-pane on desktop, top-selector on tablet/mobile */
  .explorer-shell {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
    overflow: hidden;
  }

  .department-pane {
    padding: 14px 16px;
    border-right: 1px solid #e2e8f0;
    background: #ffffff;
  }

  .explore-title { font-size: 14px; font-weight: 800; color: #0f172a; }
  .explore-subtitle { margin-top: 2px; font-size: 11px; color: #64748b; }

  .department-controls {
    margin-top: 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 95px;
    gap: 8px;
  }

  .search-wrap { position: relative; }
  .search-wrap svg { position: absolute; left: 10px; top: 9px; color: #94a3b8; }
  .department-search, .post-select, .post-label {
    width: 100%;
    height: 34px;
    border: 1px solid #dbe4ef;
    border-radius: 7px;
    background: #ffffff;
    color: #334155;
    font-size: 11.5px;
    outline: none;
  }
  .department-search { padding: 0 8px 0 30px; }
  .post-select { padding: 0 6px; font-weight: 650; }
  .post-label { display: grid; place-items: center; font-weight: 700; color: #64748b; }
  .department-search:focus, .post-select:focus { border-color: #93c5fd; box-shadow: 0 0 0 2px rgba(20,99,255,.08); }

  .department-list {
    margin-top: 10px;
    display: grid;
    gap: 6px;
    max-height: 480px;
    overflow: auto;
    padding-right: 2px;
  }

  .department-row {
    width: 100%;
    min-height: 52px;
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 9px;
    text-align: left;
    cursor: pointer;
    transition: all .15s ease;
  }

  .department-row:hover { border-color: #93c5fd; background: #f8fafc; }
  .department-row.selected { border: 1.5px solid #1463ff; background: #eff6ff; box-shadow: 0 2px 8px rgba(20,99,255,.08); }

  .department-icon { width: 36px; height: 36px; flex-shrink: 0; display: grid; place-items: center; border-radius: 8px; }
  .department-text { min-width: 0; flex: 1; }
  .department-name { font-size: 12.5px; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  .department-sub { margin-top: 1px; font-size: 10.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
  .department-count {
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #eff6ff;
    color: #1463ff;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .department-row.selected .department-count { background: #1463ff; color: #ffffff; }

  /* Vacancy Details Pane: compact, space-efficient */
  .vacancy-pane { padding: 16px 18px 20px; background: #ffffff; min-width: 0; }
  .vacancy-head {
    display: grid;
    grid-template-columns: 50px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .vacancy-head-icon {
    width: 50px;
    height: 50px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1463ff;
    flex-shrink: 0;
  }

  .vacancy-title { margin: 0; color: #0f172a; font-size: 20px; font-weight: 850; line-height: 1.2; }
  .vacancy-subtitle { margin-top: 2px; color: #475467; font-size: 12px; font-weight: 600; }
  .vacancy-meta { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px 12px; color: #64748b; font-size: 11px; }
  .vacancy-meta span { display: inline-flex; align-items: center; gap: 4px; }

  .vacancy-count-box {
    min-height: 50px;
    padding: 0 12px;
    border: 1px solid #bfdbfe;
    border-radius: 9px;
    background: #eff6ff;
    color: #1463ff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .vacancy-count-num { font-size: 20px; font-weight: 900; line-height: 1; }
  .vacancy-count-label { margin-top: 1px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; }

  .vacancy-chips { margin-top: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
  .tiny-chip { padding: 3px 8px; font-size: 10px; border-radius: 6px; border: 1px solid transparent; font-weight: 700; }
  .chip-green { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
  .chip-purple { background: #faf5ff; color: #7c3aed; border-color: #e9d5ff; }
  .chip-orange { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }

  /* Sleek Specifications Grid (Cuts height by >50%) */
  .spec-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .spec-box {
    padding: 8px 10px;
    border: 1px solid #eef2f6;
    border-radius: 8px;
    background: #f8fafc;
    min-width: 0;
  }

  .spec-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .spec-header svg { flex-shrink: 0; }

  .spec-value {
    margin-top: 3px;
    color: #0f172a;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    word-break: break-word;
  }

  .spec-extra {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid #eef2f6;
    border-radius: 8px;
    background: #f8fafc;
  }
  .spec-extra-title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: .4px;
  }
  .spec-extra-content {
    margin-top: 3px;
    color: #334155;
    font-size: 11.5px;
    line-height: 1.4;
  }

  /* Compact Important Dates strip - NEVER clips text */
  .dates-strip {
    margin-top: 12px;
    padding: 8px 12px;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
  }
  .dates-title { display: flex; align-items: center; gap: 6px; color: #1e3a8a; font-size: 11.5px; font-weight: 800; }
  .dates-title svg { color: #1463ff; }
  .dates-grid {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
  }
  .date-item { min-width: 110px; flex: 1; }
  .date-label { color: #64748b; font-size: 9.5px; font-weight: 600; text-transform: uppercase; }
  .date-value { margin-top: 1px; color: #0f172a; font-size: 11.5px; font-weight: 800; white-space: normal; }
  .date-value.highlight { color: #dc2626; }

  /* In-card vacancy actions: ALWAYS visible on all screen sizes! */
  .vacancy-actions {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .vacancy-action {
    min-height: 40px;
    border-radius: 8px;
    border: 1px solid #dbe4ef;
    background: #ffffff;
    color: #1463ff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 800;
    cursor: pointer;
    transition: all .15s ease;
  }
  .vacancy-action:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(15,23,42,.07); }
  .vacancy-action.primary { color: #ffffff; border-color: #1463ff; background: #1463ff; }
  .vacancy-action.primary:hover { background: #0b51de; }
  .vacancy-action.private-primary { color: #ffffff; border-color: #059669; background: #059669; }

  /* Floating mobile bar: refined, proper spacing, doesn't hide footer */
  .mobile-cta { display: none; }

  /* Tablet / iPad responsive view (768px - 1024px) */
  @media (max-width: 1024px) {
    .recruit-shell { width: calc(100% - 24px); padding: 12px 0 32px; }
    .recruit-top { grid-template-columns: 1fr; }
    .action-panel { min-height: auto; }
    .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .explorer-shell { grid-template-columns: 1fr; }
    .department-pane { border-right: 0; border-bottom: 1px solid #e2e8f0; padding: 12px 14px; }
    .department-list {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      max-height: none;
      padding: 4px 2px 10px;
      gap: 10px;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }
    .department-row {
      flex: 0 0 auto;
      min-width: 220px;
      max-width: 260px;
      width: auto;
      scroll-snap-align: start;
    }
    .department-icon { flex-shrink: 0; }
    .vacancy-pane { padding: 14px 16px; }
    .dates-grid { display: flex; flex-wrap: wrap; gap: 8px 16px; }
  }

  /* Mobile responsive view (<640px) */
  @media (max-width: 640px) {
    .recruit-page { padding-bottom: 90px; }
    .recruit-shell { width: calc(100% - 16px); padding-top: 8px; }
    .recruit-card { border-radius: 10px; }
    .recruit-hero { padding: 12px 14px; }
    .recruit-hero-main { grid-template-columns: 60px minmax(0, 1fr); gap: 10px; margin-top: 10px; }
    .org-seal { width: 56px; height: 56px; border-width: 3px; }
    .org-seal-inner { width: 46px; height: 46px; }
    .seal-icon { width: 18px; height: 18px; }
    .seal-name { font-size: 8px; }
    .recruit-title { font-size: 18px; }
    .recruit-org { font-size: 13px; }
    .recruit-location { font-size: 11.5px; }
    .recruit-meta-row { margin-top: 10px; gap: 8px; }
    .recruit-meta-item { min-width: 0; flex: 1 1 110px; padding-right: 8px; }
    .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .department-controls { grid-template-columns: 1fr; }
    .department-row { min-width: 190px; max-width: 220px; }
    .vacancy-head { grid-template-columns: 42px minmax(0, 1fr) auto; gap: 9px; }
    .vacancy-head-icon { width: 42px; height: 42px; }
    .vacancy-title { font-size: 17px; }
    .spec-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
    .spec-box { padding: 6px 8px; }
    .dates-grid { display: flex; flex-direction: column; gap: 6px; }
    .date-item { width: 100%; }

    /* IN-CARD actions: Visible on mobile! */
    .vacancy-actions { display: grid; grid-template-columns: 1fr; gap: 8px; }

    /* Floating sticky action bar: sleek, blurred, safe */
    .mobile-cta {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 40;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 8px));
      background: rgba(255,255,255,0.95);
      border-top: 1px solid #e2e8f0;
      box-shadow: 0 -4px 16px rgba(15,23,42,0.09);
      backdrop-filter: blur(12px);
    }
  }
`;

export function RecruitmentPage() {
  const { recruitmentId } = useParams<{ recruitmentId: string }>();
  const navigate = useNavigate();
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activePost, setActivePost] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState('');

  useEffect(() => {
    if (!recruitmentId) return;
    setLoading(true);
    fetchPublishedRecruitment(recruitmentId)
      .then((data) => {
        setRecruitment(data);
        setActivePost(data.vacancies?.[0]?.postName || '');
        setSelectedVacancyId(data.vacancies?.[0]?.id || '');
      })
      .catch(() => setRecruitment(null))
      .finally(() => setLoading(false));
  }, [recruitmentId]);

  const postGroups = useMemo(() => {
    const groups = new Map<string, VacancyRecord[]>();
    for (const vacancy of recruitment?.vacancies || []) {
      const rows = groups.get(vacancy.postName) || [];
      rows.push(vacancy);
      groups.set(vacancy.postName, rows);
    }
    return [...groups.entries()].map(([name, rows]) => ({
      name,
      total: rows.reduce((sum, row) => sum + Number(row.numberOfVacancies || 0), 0),
    }));
  }, [recruitment]);

  const visibleVacancies = useMemo(() => {
    if (!recruitment) return [];
    const q = query.trim().toLowerCase();
    return recruitment.vacancies.filter((vacancy) => {
      if (activePost && vacancy.postName !== activePost) return false;
      if (!q) return true;
      return [vacancy.department, vacancy.speciality, vacancy.qualification, vacancy.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [recruitment, activePost, query]);

  useEffect(() => {
    if (!visibleVacancies.length) {
      setSelectedVacancyId('');
      return;
    }
    if (!visibleVacancies.some((vacancy) => vacancy.id === selectedVacancyId)) {
      setSelectedVacancyId(visibleVacancies[0].id);
    }
  }, [visibleVacancies, selectedVacancyId]);

  const selectedVacancy = useMemo(
    () => visibleVacancies.find((vacancy) => vacancy.id === selectedVacancyId) || visibleVacancies[0] || null,
    [visibleVacancies, selectedVacancyId],
  );

  const departmentCount = useMemo(
    () => new Set((recruitment?.vacancies || []).map((v) => v.department || v.speciality).filter(Boolean)).size,
    [recruitment],
  );

  if (loading) {
    return (
      <div className="recruit-page" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <Stethoscope size={34} color="#1463ff" />
          <div style={{ marginTop: 10, fontWeight: 800 }}>Loading recruitment...</div>
        </div>
      </div>
    );
  }

  if (!recruitment) {
    return (
      <div className="recruit-page" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Recruitment not found</h2>
          <button className="action-btn primary" onClick={() => navigate('/jobs')}>Browse Jobs</button>
        </div>
      </div>
    );
  }

  const isGovernment = recruitment.sector === 'government';
  const daysLeft = recruitment.applicationLastDate
    ? Math.ceil((parseRecruitmentDate(recruitment.applicationLastDate).getTime() - Date.now()) / 86400000)
    : null;
  const applicationMode = recruitment.officialApplicationUrl ? 'Online' : 'As notified';
  const primaryPost = activePost || postGroups[0]?.name || 'Multiple Posts';

  const handleShare = async () => {
    const data = {
      title: recruitment.title,
      text: `${recruitment.title} - ${recruitment.organisationName}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(data);
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      // User cancelled sharing.
    }
  };

  const openSelectedJob = () => {
    if (selectedVacancy?.publishedJobId) navigate(`/job-detail/${selectedVacancy.publishedJobId}`);
  };

  return (
    <div className="recruit-page">
      <style>{PAGE_STYLES}</style>
      <div className="recruit-shell">
        <div className="recruit-top">
          <RecruitmentHero recruitment={recruitment} isGovernment={isGovernment} />
          <ApplicationPanel
            recruitment={recruitment}
            isGovernment={isGovernment}
            daysLeft={daysLeft}
            onShare={handleShare}
          />
        </div>

        <section className="recruit-card summary-shell">
          <h2 className="section-eyebrow">Recruitment Summary</h2>
          <div className="summary-grid">
            <SummaryCard icon={Users} tone="blue" label="Total Vacancies" value={String(recruitment.totalVacancies)} helper={`Across ${departmentCount} Departments`} />
            <SummaryCard icon={Building2} tone="green" label="Departments" value={String(departmentCount)} helper="Medical Specialties" />
            <SummaryCard icon={BriefcaseBusiness} tone="purple" label="Job Role" value={primaryPost} helper={selectedVacancy?.jobType || 'Full Time'} />
            <SummaryCard icon={CalendarDays} tone="orange" label="Application Mode" value={applicationMode} helper="Through Official Portal" />
            <SummaryCard icon={AlarmClock} tone="rose" label="Apply By" value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See Notification'} helper={daysLeft != null && daysLeft > 0 ? `${daysLeft} days remaining` : 'Check dates'} />
          </div>
        </section>

        <section className="recruit-card explorer-shell">
          <aside className="department-pane">
            <div className="explore-title">Explore Departments</div>
            <div className="explore-subtitle">Select a department to view its vacancy details.</div>

            <div className="department-controls">
              <div className="search-wrap">
                <Search size={16} />
                <input className="department-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search department or specialty..." />
              </div>
              {postGroups.length > 1 ? (
                <select className="post-select" value={activePost} onChange={(e) => { setActivePost(e.target.value); setQuery(''); }}>
                  {postGroups.map((group) => <option key={group.name} value={group.name}>{group.name}</option>)}
                </select>
              ) : (
                <div className="post-label">All ({departmentCount})</div>
              )}
            </div>

            <div className="department-list">
              {visibleVacancies.map((vacancy, index) => {
                const selected = vacancy.id === selectedVacancy?.id;
                const name = vacancy.department || vacancy.speciality || vacancy.postName;
                const DepartmentIcon = getDepartmentIcon(name);
                const tone = getDepartmentTone(index);
                return (
                  <button key={vacancy.id} className={`department-row ${selected ? 'selected' : ''}`} onClick={() => setSelectedVacancyId(vacancy.id)}>
                    <span className={`department-icon ${tone}`}><DepartmentIcon size={20} strokeWidth={2} /></span>
                    <span className="department-text">
                      <span className="department-name">{name}</span>
                      <span className="department-sub">{vacancy.qualification || vacancy.speciality || vacancy.postName}</span>
                    </span>
                    <span className="department-count">{vacancy.numberOfVacancies}</span>
                    <ChevronRight size={16} color={selected ? '#1463ff' : '#98a2b3'} />
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="vacancy-pane">
            {selectedVacancy ? (
              <VacancyPanel vacancy={selectedVacancy} recruitment={recruitment} isGovernment={isGovernment} onViewJob={openSelectedJob} />
            ) : (
              <div style={{ minHeight: 420, display: 'grid', placeItems: 'center', color: '#667085' }}>Select a department to view details.</div>
            )}
          </main>
        </section>
      </div>

      {selectedVacancy && (
        <div className="mobile-cta">
          <button className="vacancy-action" onClick={openSelectedJob}>{isGovernment ? 'View Details' : 'View & Apply'}</button>
          {recruitment.officialApplicationUrl && (
            <button className={`vacancy-action ${isGovernment ? 'primary' : 'private-primary'}`} onClick={() => openExternal(recruitment.officialApplicationUrl)}>
              {isGovernment ? 'Official Apply' : 'Apply Now'} <ExternalLink size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RecruitmentHero({ recruitment, isGovernment }: { recruitment: Recruitment; isGovernment: boolean }) {
  return (
    <section className={`recruit-card recruit-hero ${isGovernment ? '' : 'private'}`}>
      <div className="recruit-badge-row">
        <div className="recruit-badges">
          <span className={`sector-badge ${isGovernment ? '' : 'private'}`}>
            {isGovernment ? <Shield size={15} /> : <BriefcaseBusiness size={15} />}
            {isGovernment ? 'Government Recruitment' : 'Private Recruitment'}
          </span>
          {recruitment.officialSourceVerified && <span className="official-badge"><ShieldCheck size={14} />Official Source</span>}
        </div>
        <button className="recruit-bookmark" aria-label="Save recruitment"><FileText size={17} /></button>
      </div>

      <div className="recruit-hero-main">
        <OrganisationSeal name={recruitment.organisationName} isGovernment={isGovernment} />
        <div>
          <h1 className="recruit-title">{recruitment.title}</h1>
          <div className="recruit-org"><Building2 size={19} />{recruitment.organisationName}</div>
          {recruitment.location && <div className="recruit-location"><MapPin size={16} />{recruitment.location}</div>}
          <div className="recruit-meta-row">
            {recruitment.advertisementNumber && (
              <div className="recruit-meta-item">
                <div className="meta-label">Advertisement No.</div>
                <div className="meta-value">{recruitment.advertisementNumber}</div>
              </div>
            )}
            <div className="recruit-meta-item">
              <div className="meta-label">Apply by</div>
              <div className="meta-value deadline">{recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See Notification'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ApplicationPanel({ recruitment, isGovernment, daysLeft, onShare }: { recruitment: Recruitment; isGovernment: boolean; daysLeft: number | null; onShare: () => void }) {
  return (
    <aside className="recruit-card action-panel">
      {daysLeft != null && daysLeft > 0 && <div className="deadline-box"><AlarmClock size={17} />Only {daysLeft} days left to apply!</div>}
      <p className="action-copy">Don't miss this opportunity. {isGovernment ? 'Apply through the official recruitment process before the last date.' : 'Review the vacancy and apply through the available route.'}</p>
      <div className="action-stack">
        {recruitment.officialApplicationUrl && (
          <button className={`action-btn ${isGovernment ? 'primary' : 'private-primary'}`} onClick={() => openExternal(recruitment.officialApplicationUrl)}>
            <ExternalLink size={15} />{isGovernment ? 'Official Apply Link' : 'Apply Now'}
          </button>
        )}
        {recruitment.officialNotificationUrl && <button className="action-btn" onClick={() => openExternal(recruitment.officialNotificationUrl)}><FileText size={15} />View Notification</button>}
        {recruitment.officialWebsite && <button className="action-btn" onClick={() => openExternal(recruitment.officialWebsite)}><Building2 size={15} />Official Website</button>}
        <button className="action-btn share" onClick={onShare}><Share2 size={15} />Share Recruitment</button>
      </div>
    </aside>
  );
}

function VacancyPanel({
  vacancy,
  recruitment,
  isGovernment,
  onViewJob,
}: {
  vacancy: VacancyRecord;
  recruitment: Recruitment;
  isGovernment: boolean;
  onViewJob: () => void;
}) {
  const department = vacancy.department || vacancy.speciality || vacancy.postName;
  const DepartmentIcon = getDepartmentIcon(department);

  return (
    <div>
      <div className="vacancy-head">
        <div className="vacancy-head-icon">
          <DepartmentIcon size={26} strokeWidth={2} />
        </div>
        <div>
          <h2 className="vacancy-title">{department}</h2>
          <div className="vacancy-subtitle">
            {vacancy.qualification || vacancy.speciality || vacancy.postName}
          </div>
          <div className="vacancy-meta">
            {vacancy.location && (
              <span>
                <MapPin size={12} />
                {vacancy.location}
              </span>
            )}
            {vacancy.jobType && (
              <span>
                <BriefcaseBusiness size={12} />
                {vacancy.jobType}
              </span>
            )}
          </div>
        </div>
        <div className="vacancy-count-box">
          <div className="vacancy-count-num">{vacancy.numberOfVacancies}</div>
          <div className="vacancy-count-label">Vacancies</div>
        </div>
      </div>

      <div className="vacancy-chips">
        <span className="tiny-chip chip-green">
          <Users size={11} />
          {vacancy.postName} Role
        </span>
        <span className="tiny-chip chip-purple">
          <Stethoscope size={11} />
          Clinical Department
        </span>
        {vacancy.jobType && (
          <span className="tiny-chip chip-orange">
            <BriefcaseBusiness size={11} />
            {vacancy.jobType}
          </span>
        )}
      </div>

      {/* Sleek 2-column key specifications grid (Cuts vertical height by >50%) */}
      <div className="spec-grid">
        <SpecBox
          icon={GraduationCap}
          label="Qualification"
          value={vacancy.qualification || 'See notification'}
          color="#1463ff"
        />
        <SpecBox
          icon={IndianRupee}
          label="Salary / Pay"
          value={vacancy.salary || vacancy.payScale || vacancy.payLevel || 'See notification'}
          color="#0d9488"
        />
        <SpecBox
          icon={Stethoscope}
          label="Experience"
          value={vacancy.experience || 'As per notification'}
          color="#4f46e5"
        />
        <SpecBox
          icon={Users}
          label="Age Limit"
          value={vacancy.ageLimit || 'As per notification'}
          color="#7c3aed"
        />
      </div>

      {/* Other Eligibility & Selection Process: compact inline callouts */}
      {(vacancy.otherEligibilityRequirements || recruitment.selectionProcess) && (
        <div className="spec-extra">
          {vacancy.otherEligibilityRequirements && (
            <div style={{ marginBottom: recruitment.selectionProcess ? 6 : 0 }}>
              <div className="spec-extra-title">
                <ShieldCheck size={12} color="#ea580c" />
                <span>Other Eligibility</span>
              </div>
              <div className="spec-extra-content">
                {vacancy.otherEligibilityRequirements}
              </div>
            </div>
          )}
          {recruitment.selectionProcess && (
            <div>
              <div className="spec-extra-title">
                <BriefcaseBusiness size={12} color="#4f46e5" />
                <span>Selection Process</span>
              </div>
              <div className="spec-extra-content">
                {recruitment.selectionProcess}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Important Dates strip - NEVER clips on iPad or mobile */}
      <div className="dates-strip">
        <div className="dates-title">
          <CalendarDays size={14} />
          <span>Important Dates</span>
        </div>
        <div className="dates-grid">
          <DateItem
            label="Notification Date"
            value={recruitment.verificationDate ? formatDate(recruitment.verificationDate) : 'Not specified'}
          />
          <DateItem
            label="Application Start Date"
            value={recruitment.applicationStartDate ? formatDate(recruitment.applicationStartDate) : 'Not specified'}
          />
          <DateItem
            label="Last Date to Apply"
            value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'Not specified'}
            highlight={true}
          />
        </div>
      </div>

      {/* In-Card Action Buttons: ALWAYS directly visible on all screen sizes */}
      <div className="vacancy-actions">
        <button className="vacancy-action" onClick={onViewJob}>
          <BriefcaseBusiness size={15} />
          {isGovernment ? 'View Vacancy Details' : 'View & Apply'}
        </button>
        {recruitment.officialApplicationUrl && (
          <button
            className={`vacancy-action ${isGovernment ? 'primary' : 'private-primary'}`}
            onClick={() => openExternal(recruitment.officialApplicationUrl)}
          >
            <ExternalLink size={15} />
            {isGovernment ? 'Official Apply Link' : 'Apply Now'}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, tone, label, value, helper }: { icon: LucideIcon; tone: 'blue' | 'green' | 'purple' | 'orange' | 'rose'; label: string; value: string; helper: string }) {
  return (
    <div className="summary-item">
      <div className={`summary-icon icon-${tone}`}><Icon size={20} strokeWidth={2} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="summary-label">{label}</div>
        <div className="summary-value">{value}</div>
        <div className="summary-helper">{helper}</div>
      </div>
    </div>
  );
}

function SpecBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="spec-box">
      <div className="spec-header" style={{ color }}>
        <Icon size={13} strokeWidth={2.2} />
        <span>{label}</span>
      </div>
      <div className="spec-value" title={value}>{value}</div>
    </div>
  );
}

function DateItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="date-item">
      <div className="date-label">{label}</div>
      <div className={`date-value ${highlight ? 'highlight' : ''}`}>{value}</div>
    </div>
  );
}

function OrganisationSeal({ name, isGovernment }: { name: string; isGovernment: boolean }) {
  return (
    <div className={`org-seal ${isGovernment ? '' : 'private'}`}>
      <div className="org-seal-inner">
        <div>
          <Stethoscope className="seal-icon" size={34} strokeWidth={1.7} />
          <div className="seal-name">{buildAcronym(name)}</div>
        </div>
      </div>
    </div>
  );
}

function getDepartmentIcon(name: string): LucideIcon {
  const value = name.toLowerCase();
  if (value.includes('orthop')) return Bone;
  if (value.includes('anaesth')) return Activity;
  if (value.includes('surgery')) return Scissors;
  if (value.includes('obstetric') || value.includes('gyn')) return Baby;
  if (value.includes('paedi') || value.includes('pedi')) return Baby;
  if (value.includes('radio')) return ScanLine;
  if (value.includes('psychi')) return Brain;
  if (value.includes('emergency') || value.includes('trauma')) return HeartPulse;
  if (value.includes('ent') || value.includes('otorhino')) return Ear;
  if (value.includes('dermat')) return Microscope;
  if (value.includes('micro')) return Microscope;
  if (value.includes('medicine')) return Stethoscope;
  if (value.includes('critical')) return Cross;
  return Stethoscope;
}

function getDepartmentTone(index: number) {
  return ['icon-blue', 'icon-indigo', 'icon-green', 'icon-orange', 'icon-purple', 'icon-rose'][index % 6];
}

function buildAcronym(value: string) {
  if (/\bAIIMS\b/i.test(value)) return 'AIIMS';
  const words = value.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  return words.slice(0, 3).map((word) => word[0]?.toUpperCase()).join('') || 'ORG';
}

function formatDate(value: string) {
  const date = parseRecruitmentDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function parseRecruitmentDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (year && month && day) return new Date(Date.UTC(year, month - 1, day));
  return new Date(value);
}

function openExternal(url?: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
