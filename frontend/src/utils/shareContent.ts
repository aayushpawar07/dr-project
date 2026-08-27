type ShareableNews = {
  id: string;
  title: string;
  breaking?: boolean;
  fullStory?: string;
};

type ShareableJob = {
  id: string;
  title: string;
  description?: string;
  organization?: string;
  location?: string;
  qualification?: string;
  salary?: string;
  experience?: string;
  numberOfPosts?: number;
};

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
  const description = toPlainText(job.description);
  const dynamicFallback = [
    job.organization,
    job.location,
    job.qualification,
    job.salary,
    job.experience,
    job.numberOfPosts ? `${job.numberOfPosts} posts` : '',
  ]
    .filter(Boolean)
    .join(' • ');

  const excerpt = truncate(description || dynamicFallback, 220);
  return [job.title, excerpt, shareUrl].filter(Boolean).join('\n\n');
}

export function shareTextWithoutUrl(fullText: string, shareUrl: string) {
  return fullText.endsWith(shareUrl)
    ? fullText.slice(0, -shareUrl.length).trimEnd()
    : fullText;
}
