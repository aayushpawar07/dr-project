type ShareableNews = {
  id: string;
  title: string;
  breaking?: boolean;
  fullStory?: string;
};

export type ShareableJob = {
  id: string;
  title: string;
  description?: string;
  organization?: string;
  location?: string;
  qualification?: string;
  salary?: string;
  salaryRange?: string;
  experience?: string;
  numberOfPosts?: number | string;
  sector?: string;
  category?: string;
  lastDate?: string;
};

function formatShareDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function toPlainText(value?: string) {
  if (!value) return '';

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = value;
    return (container.textContent || container.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return value
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, max = 220) {
  const clean = value.trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(' ', max - 1);
  return `${clean.slice(0, cut > max / 2 ? cut : max - 1).trim()}…`;
}

function origin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/$/, '');
}

export function getNewsShareUrl(id: string) {
  return `${origin()}/api/share/news/${id}`;
}

export function getJobShareUrl(id: string) {
  return `${origin()}/api/share/job/${id}`;
}

export function buildNewsShareText(news: ShareableNews, shareUrl = getNewsShareUrl(news.id)) {
  const heading = `${news.breaking ? 'Breaking: ' : ''}${news.title}`.trim();
  const excerpt = truncate(toPlainText(news.fullStory), 220);
  return [heading, excerpt, shareUrl].filter(Boolean).join('\n\n');
}

export function buildJobShareText(job: ShareableJob, shareUrl = getJobShareUrl(job.id)) {
  const lines: string[] = [];

  const sectorBadge = job.sector?.toLowerCase() === 'government' ? '🏛️ Government Job' : '💼 Private Job';
  lines.push(`${sectorBadge}: *${job.title.trim()}*`);

  if (job.organization?.trim()) {
    lines.push(`🏥 *Hospital/Org:* ${job.organization.trim()}`);
  }

  if (job.location?.trim()) {
    lines.push(`📍 *Location:* ${job.location.trim()}`);
  }

  if (job.numberOfPosts != null && String(job.numberOfPosts).trim()) {
    const count = Number(job.numberOfPosts);
    const postLabel = !isNaN(count) && count === 1 ? '1 Post' : `${job.numberOfPosts} Posts`;
    lines.push(`👥 *Vacancies:* ${postLabel}`);
  }

  if (job.qualification?.trim()) {
    lines.push(`🎓 *Qualification:* ${job.qualification.trim()}`);
  }

  if (job.experience?.trim()) {
    lines.push(`⏳ *Experience:* ${job.experience.trim()}`);
  }

  const salaryVal = (job.salary || job.salaryRange || '').trim();
  if (salaryVal) {
    lines.push(`💰 *Salary:* ${salaryVal}`);
  }

  if (job.lastDate) {
    const formatted = formatShareDate(job.lastDate);
    if (formatted) {
      lines.push(`📅 *Apply By:* ${formatted}`);
    }
  }

  lines.push(`\n🔗 *Apply on MedExJob:* ${shareUrl}`);

  return lines.join('\n');
}

export function shareTextWithoutUrl(fullText: string, shareUrl: string) {
  return fullText.endsWith(shareUrl)
    ? fullText.slice(0, -shareUrl.length).trimEnd()
    : fullText;
}
