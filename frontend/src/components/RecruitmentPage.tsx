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
    min-width: 0;
    background: #f7f9fc;
    color: #111827;
    padding-bottom: 28px;
    overflow-x: clip;
  }

  .recruit-shell {
    width: min(1400px, calc(100% - 36px));
    margin: 0 auto;
    padding: 14px 0 28px;
    min-width: 0;
  }

  .recruit-top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 390px;
    gap: 12px;
    align-items: stretch;
  }

  .recruit-card {
    background: #ffffff;
    border: 1px solid #dfe7f2;
    border-radius: 14px;
    box-shadow: 0 7px 24px rgba(15, 23, 42, 0.045);
  }

  .recruit-hero {
    min-height: 210px;
    padding: 16px 18px 16px;
    position: relative;
    overflow: hidden;
    border-color: #c9dcff;
    background:
      radial-gradient(circle at 88% 12%, rgba(255,255,255,.95) 0 22%, transparent 23%),
      linear-gradient(118deg, #edf5ff 0%, #f8fbff 52%, #ffffff 100%);
  }

  .recruit-hero.private {
    border-color: #bcebd8;
    background:
      radial-gradient(circle at 88% 12%, rgba(255,255,255,.95) 0 22%, transparent 23%),
      linear-gradient(118deg, #ecfdf5 0%, #f5fffb 52%, #ffffff 100%);
  }

  .recruit-badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
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
    gap: 6px;
    border-radius: 8px;
    font-weight: 700;
    white-space: nowrap;
  }

  .sector-badge {
    padding: 7px 11px;
    font-size: 12px;
    color: #ffffff;
    background: #1463ff;
    box-shadow: 0 4px 10px rgba(20, 99, 255, .18);
  }

  .sector-badge.private { background: #059669; }

  .official-badge {
    padding: 6px 10px;
    font-size: 12px;
    color: #15803d;
    border: 1px solid #bbebc8;
    background: #ecfdf3;
  }

  .recruit-bookmark {
    width: 36px;
    height: 36px;
    border: 1px solid #dbe4ef;
    border-radius: 10px;
    background: rgba(255,255,255,.9);
    color: #64748b;
    display: grid;
    place-items: center;
  }

  .recruit-hero-main {
    display: grid;
    grid-template-columns: 144px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    margin-top: 12px;
  }

  .org-seal {
    width: 126px;
    height: 126px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #ffffff;
    border: 5px solid #f1c34f;
    box-shadow: 0 5px 16px rgba(15,23,42,.11);
  }

  .org-seal-inner {
    width: 105px;
    height: 105px;
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
  .seal-name { font-size: 13px; line-height: 1; font-weight: 900; letter-spacing: .7px; }

  .recruit-title {
    margin: 0;
    color: #0f172a;
    font-size: clamp(25px, 2vw, 31px);
    line-height: 1.22;
    letter-spacing: -.45px;
    font-weight: 800;
  }

  .recruit-org {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 7px;
    color: #1463ff;
    font-size: 16px;
    font-weight: 650;
  }

  .private .recruit-org { color: #059669; }

  .recruit-location {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 7px;
    color: #667085;
    font-size: 14px;
  }

  .recruit-meta-row {
    margin-top: 18px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 18px;
  }

  .recruit-meta-item {
    min-width: 160px;
    padding-right: 18px;
    border-right: 1px solid #dbe4ef;
  }

  .recruit-meta-item:last-child { border-right: 0; }
  .meta-label { color: #64748b; font-size: 12px; }
  .meta-value { margin-top: 3px; color: #0f172a; font-size: 14px; font-weight: 800; }
  .meta-value.deadline { color: #ef4444; }

  .action-panel {
    min-height: 210px;
    padding: 14px;
    border-color: #ffc7c7;
    background: linear-gradient(180deg, #fff8f8 0%, #ffffff 100%);
  }

  .deadline-box {
    border: 1px solid #ffb9bd;
    border-radius: 9px;
    padding: 10px 12px;
    background: #fff1f2;
    color: #ef3340;
    font-size: 14px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-copy {
    margin: 12px 0;
    color: #667085;
    font-size: 12px;
    line-height: 1.45;
  }

  .action-stack { display: grid; gap: 9px; }

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
    gap: 8px;
    cursor: pointer;
    transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  }

  .action-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 13px rgba(15,23,42,.08); border-color: #bfd2ef; }
  .action-btn.primary { background: #1463ff; border-color: #1463ff; color: #ffffff; }
  .action-btn.private-primary { background: #059669; border-color: #059669; color: #ffffff; }
  .action-btn.share { color: #1463ff; }

  .summary-shell { margin-top: 12px; padding: 12px 14px; }
  .section-eyebrow { margin: 0 0 11px; font-size: 12px; font-weight: 800; color: #0f172a; }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-item {
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 11px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #ffffff;
  }

  .summary-icon, .detail-icon, .department-icon {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 10px;
  }

  .summary-icon { width: 44px; height: 44px; }
  .icon-blue { background: #eef5ff; color: #1463ff; }
  .icon-green { background: #edf9f1; color: #16a34a; }
  .icon-purple { background: #f4edff; color: #7c3aed; }
  .icon-orange { background: #fff3e8; color: #f97316; }
  .icon-rose { background: #fff0f2; color: #fb4b5c; }
  .icon-indigo { background: #eef2ff; color: #4f46e5; }
  .icon-teal { background: #ecfdf8; color: #0f9f8f; }

  .summary-label { color: #667085; font-size: 11px; }
  .summary-value { color: #101828; font-size: 14px; font-weight: 800; line-height: 1.25; }
  .summary-helper { margin-top: 2px; color: #7b8797; font-size: 10.5px; }

  .explorer-shell {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 480px minmax(0, 1fr);
    overflow: hidden;
    min-width: 0;
  }

  .department-pane {
    padding: 13px 14px 14px;
    border-right: 1px solid #e2e8f0;
    background: #ffffff;
    min-width: 0;
  }

  .explore-title { font-size: 14px; font-weight: 800; color: #101828; }
  .explore-subtitle { margin-top: 2px; font-size: 11px; color: #7b8797; }

  .department-controls {
    margin-top: 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 95px;
    gap: 8px;
  }

  .search-wrap { position: relative; }
  .search-wrap svg { position: absolute; left: 10px; top: 9px; color: #98a2b3; }
  .department-search, .post-select, .post-label {
    width: 100%;
    height: 34px;
    border: 1px solid #dbe4ef;
    border-radius: 7px;
    background: #ffffff;
    color: #344054;
    font-size: 11px;
    outline: none;
  }
  .department-search { padding: 0 9px 0 31px; }
  .post-select { padding: 0 8px; font-weight: 650; }
  .post-label { display: grid; place-items: center; font-weight: 700; }
  .department-search:focus, .post-select:focus { border-color: #8ab4ff; box-shadow: 0 0 0 2px rgba(20,99,255,.09); }

  .department-list {
    margin-top: 10px;
    display: grid;
    gap: 7px;
    max-height: 474px;
    overflow: auto;
    padding-right: 3px;
    min-width: 0;
  }

  .department-row {
    width: 100%;
    min-height: 58px;
    padding: 8px 9px;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    background: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease;
  }

  .department-row:hover { border-color: #b8cdf5; transform: translateY(-1px); box-shadow: 0 3px 9px rgba(15,23,42,.05); }
  .department-row.selected { border: 1.5px solid #1463ff; background: #f8fbff; box-shadow: 0 0 0 2px rgba(20,99,255,.06); }

  .department-icon { width: 40px; height: 40px; }
  .department-text { min-width: 0; flex: 1; }
  .department-name { font-size: 12.5px; font-weight: 800; color: #101828; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .department-sub { margin-top: 2px; font-size: 10.5px; color: #667085; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .department-count {
    min-width: 25px;
    height: 25px;
    padding: 0 7px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: #edf4ff;
    color: #1463ff;
    font-size: 11px;
    font-weight: 800;
  }
  .department-row.selected .department-count { background: #1463ff; color: #ffffff; }

  .vacancy-pane { padding: 12px 14px 13px; background: #ffffff; min-width: 0; }
  .vacancy-panel { display: flex; flex-direction: column; min-width: 0; }
  .vacancy-intro { min-width: 0; }
  .vacancy-head {
    display: grid;
    grid-template-columns: 58px minmax(0, 1fr) 76px;
    gap: 11px;
    align-items: center;
  }

  .vacancy-head-icon {
    width: 58px;
    height: 58px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: #eff6ff;
    border: 1px solid #cfe0ff;
    color: #1463ff;
  }

  .vacancy-title {
    margin: 0;
    color: #101828;
    font-size: 21px;
    font-weight: 850;
    line-height: 1.15;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .vacancy-subtitle {
    margin-top: 2px;
    color: #344054;
    font-size: 12px;
    font-weight: 750;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .vacancy-meta { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 6px 12px; color: #667085; font-size: 10.5px; min-width: 0; }
  .vacancy-meta span { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow-wrap: anywhere; }

  .vacancy-count-box {
    min-height: 58px;
    border: 1px solid #c8dcff;
    border-radius: 10px;
    background: #eef5ff;
    color: #1463ff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .vacancy-count-num { font-size: 23px; font-weight: 900; line-height: 1; }
  .vacancy-count-label { margin-top: 2px; font-size: 10px; }

  .vacancy-chips { margin-top: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
  .tiny-chip { padding: 4px 7px; font-size: 9.5px; border: 1px solid transparent; max-width: 100%; }
  .chip-green { background: #effaf2; color: #15803d; border-color: #ccefd6; }
  .chip-purple { background: #f6f0ff; color: #7c3aed; border-color: #e6d6ff; }
  .chip-orange { background: #fff5e9; color: #e96508; border-color: #ffd9b0; }

  .detail-grid {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .detail-card {
    min-height: 74px;
    padding: 9px;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    background: #ffffff;
    display: flex;
    gap: 9px;
    align-items: flex-start;
  }
  .detail-icon { width: 34px; height: 34px; }
  .detail-copy { min-width: 0; flex: 1; }
  .detail-label { color: #344054; font-size: 10px; font-weight: 800; }
  .detail-value {
    margin-top: 4px;
    color: #475467;
    font-size: 10.2px;
    line-height: 1.4;
    overflow-wrap: anywhere;
    word-break: break-word;
    white-space: normal;
  }

  .dates-strip {
    margin-top: 10px;
    padding: 9px 11px 10px;
    border: 1px solid #bed7ff;
    border-radius: 9px;
    background: linear-gradient(180deg, #f5f9ff 0%, #edf5ff 100%);
  }
  .dates-title { display: flex; align-items: center; gap: 6px; color: #344054; font-size: 11px; font-weight: 800; }
  .dates-title svg { color: #1463ff; }
  .dates-grid { margin-top: 7px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; text-align: center; }
  .dates-grid > * { min-width: 0; }
  .date-label { color: #667085; font-size: 9.5px; overflow-wrap: anywhere; }
  .date-value { margin-top: 2px; color: #101828; font-size: 10.5px; font-weight: 850; overflow-wrap: anywhere; }

  .vacancy-actions { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .vacancy-action {
    min-height: 38px;
    border-radius: 7px;
    border: 1px solid #dbe4ef;
    background: #ffffff;
    color: #1463ff;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    overflow-wrap: normal;
    word-break: normal;
  }
  .vacancy-action.primary { color: #ffffff; border-color: #1463ff; background: #1463ff; }
  .vacancy-action.private-primary { color: #ffffff; border-color: #059669; background: #059669; }

  .mobile-cta { display: none; }

  @media (max-width: 1080px) {
    .recruit-shell { width: min(100% - 28px, 980px); }
    .recruit-top { grid-template-columns: 1fr 330px; }
    .recruit-hero-main { grid-template-columns: 118px minmax(0, 1fr); }
    .org-seal { width: 108px; height: 108px; }
    .org-seal-inner { width: 88px; height: 88px; }
    .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .explorer-shell { grid-template-columns: 365px minmax(0, 1fr); }
    .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 900px) {
    .recruit-page { padding-bottom: 24px; }
    .recruit-shell { width: calc(100% - 24px); }
    .recruit-top { grid-template-columns: 1fr; }
    .action-panel { min-height: auto; }
    .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .explorer-shell { grid-template-columns: minmax(0, 1fr); }
    .department-pane { border-right: 0; border-bottom: 1px solid #e2e8f0; }
    .department-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
    .department-row { min-width: 0; }
    .department-name, .department-sub {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }
    .vacancy-pane { padding-bottom: 16px; }
    .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); order: 3; }
    .detail-card { min-height: 0; }
    .dates-grid {
      grid-template-columns: minmax(0, 1fr);
      text-align: left;
      gap: 6px;
    }
    .dates-grid > div {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .date-value { margin-top: 0; text-align: right; }
    .vacancy-intro { order: 1; }
    .vacancy-actions {
      order: 2;
      position: sticky;
      top: 64px;
      z-index: 20;
      margin-top: 10px;
      margin-bottom: 2px;
      padding: 8px 0;
      background: #ffffff;
    }
    .dates-strip { order: 4; }
    .mobile-cta { display: none !important; }
  }

  @media (max-width: 640px) {
    .recruit-page { padding-bottom: 20px; }
    .recruit-shell { width: calc(100% - 18px); padding-top: 10px; }
    .recruit-card { border-radius: 12px; }
    .recruit-hero { padding: 14px; min-height: auto; }
    .recruit-hero-main { grid-template-columns: 72px minmax(0, 1fr); gap: 11px; margin-top: 12px; }
    .org-seal { width: 68px; height: 68px; border-width: 3px; }
    .org-seal-inner { width: 56px; height: 56px; }
    .seal-icon { width: 22px; height: 22px; }
    .seal-name { font-size: 9px; }
    .recruit-title { font-size: 20px; }
    .recruit-org { font-size: 13px; }
    .recruit-location { font-size: 12px; }
    .recruit-meta-row { margin-top: 12px; gap: 10px; }
    .recruit-meta-item { min-width: 0; flex: 1 1 120px; padding-right: 10px; }
    .summary-item { min-height: 64px; }
    .department-controls { grid-template-columns: 1fr; }
    .department-list {
      display: flex;
      width: 100%;
      min-width: 0;
      overflow-x: auto;
      overflow-y: hidden;
      max-height: none;
      padding: 2px 2px 10px;
      gap: 8px;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x proximity;
    }
    .department-row {
      min-width: min(232px, 78vw);
      flex: 0 0 auto;
      scroll-snap-align: start;
    }
    .department-name, .department-sub {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .vacancy-head { grid-template-columns: 48px minmax(0, 1fr) 62px; }
    .vacancy-head-icon { width: 48px; height: 48px; }
    .vacancy-title { font-size: 18px; }
    .detail-card { min-height: 0; padding: 8px; gap: 7px; }
  }

  @media (max-width: 639px) {
    .vacancy-actions { top: 56px; }
  }

  @media (max-width: 420px) {
    .summary-grid { grid-template-columns: minmax(0, 1fr); }
    .detail-grid { grid-template-columns: minmax(0, 1fr); }
    .vacancy-actions { grid-template-columns: 1fr; }
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

function VacancyPanel({ vacancy, recruitment, isGovernment, onViewJob }: { vacancy: VacancyRecord; recruitment: Recruitment; isGovernment: boolean; onViewJob: () => void }) {
  const department = vacancy.department || vacancy.speciality || vacancy.postName;
  const DepartmentIcon = getDepartmentIcon(department);
  const details: Array<{ icon: LucideIcon; label: string; value: string; tone: string }> = [
    { icon: GraduationCap, label: 'Qualification', value: vacancy.qualification || 'See notification', tone: 'icon-blue' },
    { icon: Stethoscope, label: 'Experience', value: vacancy.experience || 'As per notification', tone: 'icon-indigo' },
    { icon: IndianRupee, label: 'Salary / Pay', value: vacancy.salary || vacancy.payScale || vacancy.payLevel || 'See notification', tone: 'icon-teal' },
    { icon: Users, label: 'Age Limit', value: vacancy.ageLimit || 'As per notification', tone: 'icon-purple' },
    { icon: ShieldCheck, label: 'Other Eligibility', value: vacancy.otherEligibilityRequirements || 'See official notification', tone: 'icon-orange' },
    { icon: BriefcaseBusiness, label: 'Selection Process', value: recruitment.selectionProcess || 'As per notification', tone: 'icon-indigo' },
  ];

  return (
    <div className="vacancy-panel">
      <div className="vacancy-intro">
        <div className="vacancy-head">
          <div className="vacancy-head-icon"><DepartmentIcon size={31} strokeWidth={2} /></div>
          <div style={{ minWidth: 0 }}>
            <h2 className="vacancy-title">{department}</h2>
            <div className="vacancy-subtitle">{vacancy.qualification || vacancy.speciality || vacancy.postName}</div>
            <div className="vacancy-meta">
              {vacancy.location && <span><MapPin size={13} />{vacancy.location}</span>}
              {vacancy.jobType && <span><BriefcaseBusiness size={13} />{vacancy.jobType}</span>}
            </div>
          </div>
          <div className="vacancy-count-box"><div className="vacancy-count-num">{vacancy.numberOfVacancies}</div><div className="vacancy-count-label">Vacancies</div></div>
        </div>

        <div className="vacancy-chips">
          <span className="tiny-chip chip-green"><Users size={11} />{vacancy.postName} Role</span>
          <span className="tiny-chip chip-purple"><Stethoscope size={11} />Clinical Department</span>
          {vacancy.jobType && <span className="tiny-chip chip-orange"><BriefcaseBusiness size={11} />{vacancy.jobType}</span>}
        </div>
      </div>

      <div className="detail-grid">
        {details.map((item) => <DetailCard key={item.label} {...item} />)}
      </div>

      <div className="dates-strip">
        <div className="dates-title"><CalendarDays size={15} />Important Dates</div>
        <div className="dates-grid">
          <DateItem label="Notification Date" value={recruitment.verificationDate ? formatDate(recruitment.verificationDate) : 'Not specified'} />
          <DateItem label="Application Start Date" value={recruitment.applicationStartDate ? formatDate(recruitment.applicationStartDate) : 'Not specified'} />
          <DateItem label="Last Date to Apply" value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'Not specified'} />
        </div>
      </div>

      <div className="vacancy-actions">
        <button className="vacancy-action" onClick={onViewJob}><BriefcaseBusiness size={15} />{isGovernment ? 'View Details' : 'View & Apply'}</button>
        {recruitment.officialApplicationUrl && (
          <button className={`vacancy-action ${isGovernment ? 'primary' : 'private-primary'}`} onClick={() => openExternal(recruitment.officialApplicationUrl)}>
            <ExternalLink size={15} />{isGovernment ? 'Official Apply' : 'Apply Now'}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, tone, label, value, helper }: { icon: LucideIcon; tone: 'blue' | 'green' | 'purple' | 'orange' | 'rose'; label: string; value: string; helper: string }) {
  return (
    <div className="summary-item">
      <div className={`summary-icon icon-${tone}`}><Icon size={21} strokeWidth={2} /></div>
      <div style={{ minWidth: 0 }}>
        <div className="summary-label">{label}</div>
        <div className="summary-value">{value}</div>
        <div className="summary-helper">{helper}</div>
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <div className="detail-card">
      <div className={`detail-icon ${tone}`}><Icon size={18} strokeWidth={2} /></div>
      <div className="detail-copy">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{value}</div>
      </div>
    </div>
  );
}

function DateItem({ label, value }: { label: string; value: string }) {
  return <div><div className="date-label">{label}</div><div className="date-value">{value}</div></div>;
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
