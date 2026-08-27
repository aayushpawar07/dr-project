// AI assisted development
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Newspaper, Clock, Landmark, Briefcase, GraduationCap, Timer, Sparkles, Share2, Copy, Check, MessageCircle, Mail, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { fetchNewsById } from '../api/news';

interface NewsDetailPageProps {
  onNavigate: (page: string) => void;
}

const typeLabels: Record<string, string> = {
  GOVT: 'Government',
  PRIVATE: 'Private',
  EXAM: 'Exam',
  DEADLINE: 'Deadline',
  UPDATE: 'Update',
};

const typeIcons: Record<string, JSX.Element> = {
  GOVT: <Landmark className="w-5 h-5" />,
  PRIVATE: <Briefcase className="w-5 h-5" />,
  EXAM: <GraduationCap className="w-5 h-5" />,
  DEADLINE: <Timer className="w-5 h-5" />,
  UPDATE: <Sparkles className="w-5 h-5" />,
};

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  GOVT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  PRIVATE: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  EXAM: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  DEADLINE: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  UPDATE: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function toPlainText(value?: string) {
  if (!value) return '';
  const container = document.createElement('div');
  container.innerHTML = value;
  return (container.textContent || container.innerText || '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max = 220) {
  if (value.length <= max) return value;
  const cut = value.lastIndexOf(' ', max - 1);
  return `${value.slice(0, cut > max / 2 ? cut : max - 1).trim()}…`;
}

export function NewsDetailPage({ onNavigate }: NewsDetailPageProps) {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const [news, setNews] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareExcerpt = useMemo(() => {
    if (!news) return '';
    const story = toPlainText(news.fullStory);
    return truncate(story || news.title || '');
  }, [news]);

  // This backend-rendered URL is intentionally shared instead of the SPA URL.
  // Social crawlers receive the article's dynamic title/content/image metadata;
  // human visitors are immediately redirected to /news/{id}.
  const getShareUrl = () => {
    return `${window.location.origin}/api/share/news/${newsId || news?.id}`;
  };

  const getArticleUrl = () => {
    return `${window.location.origin}/news/${newsId || news?.id}`;
  };

  const getShareText = () => {
    if (!news) return '';
    return shareExcerpt ? `${news.title}\n\n${shareExcerpt}` : news.title;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  const handleNativeShare = async () => {
    if (!news) return;
    const shareData = {
      title: news.title,
      text: getShareText(),
      url: getShareUrl(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User may have cancelled the native share sheet; open our share dialog as fallback.
      }
    }
    setShowShareDialog(true);
  };

  const shareToWhatsApp = () => {
    const lines = [
      `*${news?.title || ''}*`,
      shareExcerpt,
      `Read full story: ${getShareUrl()}`,
    ].filter(Boolean);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(lines.join('\n\n'))}`, '_blank', 'noopener,noreferrer');
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(truncate(`${news?.title || ''}${shareExcerpt ? ` - ${shareExcerpt}` : ''}`, 220));
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(news?.title || 'Medical News');
    const body = encodeURIComponent(`${getShareText()}\n\nRead full story: ${getShareUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  useEffect(() => {
    (async () => {
      if (!newsId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchNewsById(newsId);
        if (data) {
          setNews(data);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [newsId]);

  useEffect(() => {
    if (!news) return;
    document.title = `${news.title} | MedExJob News`;
    return () => {
      document.title = "MedExJob - India's Premier Medical Job Portal for Doctors & Healthcare Professionals";
    };
  }, [news]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading news...</p>
        </div>
      </div>
    );
  }

  if (notFound || !news) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">News Not Found</h1>
          <p className="text-gray-600 mb-4">The news article you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/news')}>Back to News</Button>
        </div>
      </div>
    );
  }

  const type = news.type?.toUpperCase() || 'UPDATE';
  const typeColor = typeColors[type] || typeColors.UPDATE;
  const typeLabel = typeLabels[type] || 'Update';
  const typeIcon = typeIcons[type] || <Sparkles className="w-5 h-5" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate('/news')} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to News</span>
            <span className="sm:hidden">Back</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNativeShare}
            className="flex items-center gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 shrink-0"
          >
            <Share2 className="w-4 h-4" />
            Share Story
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8 max-w-4xl">
        {news.imageUrl && (
          <div className="mb-5 sm:mb-6 rounded-lg sm:rounded-xl overflow-hidden shadow-lg bg-white">
            <img
              src={news.imageUrl}
              alt={news.title}
              className="w-full object-cover h-44 sm:h-64 md:h-80 lg:h-96 transition-all duration-300"
              loading="lazy"
            />
          </div>
        )}

        <Card className="p-4 sm:p-6 md:p-8 mb-5 sm:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge className={`${typeColor.bg} ${typeColor.text} ${typeColor.border} border flex items-center gap-2 px-3 py-1`}>
                {typeIcon}
                {typeLabel}
              </Badge>
              {news.breaking && (
                <Badge className="bg-red-100 text-red-700 border-red-200 border px-3 py-1">Breaking</Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNativeShare}
              className="flex items-center gap-1.5 text-gray-700 hover:text-blue-600 hover:bg-blue-50 border-gray-200"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight break-words">
            {news.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{formatDate(news.date)}</span>
            </div>
            {news.createdAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Published {new Date(news.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            )}
          </div>
        </Card>

        {news.fullStory ? (
          <Card className="p-4 sm:p-6 md:p-8 overflow-hidden">
            <div
              className="prose prose-sm sm:prose-base md:prose-lg max-w-none break-words [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: news.fullStory }}
            />
          </Card>
        ) : (
          <Card className="p-4 sm:p-6 md:p-8">
            <div className="text-center py-8 sm:py-12">
              <Newspaper className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-base sm:text-lg">Full story content is not available for this news article.</p>
            </div>
          </Card>
        )}

        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="w-[calc(100vw-24px)] sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-gray-900">
                <Share2 className="w-5 h-5 text-blue-600" />
                Share this News Story
              </DialogTitle>
              <DialogDescription>
                The shared preview uses this article's live title, story content and real image when available.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-gray-50 border p-3">
                <p className="text-sm font-semibold text-gray-900 break-words">{news.title}</p>
                {shareExcerpt && <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-4">{shareExcerpt}</p>}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input readOnly value={getShareUrl()} className="flex-1 bg-gray-50 text-xs sm:text-sm text-gray-700 select-all min-w-0" />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  className={copiedLink ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                >
                  {copiedLink ? <><Check className="w-4 h-4 mr-1" />Copied</> : <><Copy className="w-4 h-4 mr-1" />Copy Link</>}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button variant="outline" onClick={shareToWhatsApp} className="flex items-center justify-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-11">
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp
                </Button>
                <Button variant="outline" onClick={shareToLinkedIn} className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 h-11">
                  <Briefcase className="w-4 h-4 text-blue-600" /> LinkedIn
                </Button>
                <Button variant="outline" onClick={shareToTwitter} className="flex items-center justify-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 h-11">
                  <Send className="w-4 h-4 text-slate-600" /> Twitter / X
                </Button>
                <Button variant="outline" onClick={shareToEmail} className="flex items-center justify-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 h-11">
                  <Mail className="w-4 h-4 text-purple-600" /> Email
                </Button>
              </div>

              <p className="text-[11px] text-gray-400 break-all">Article: {getArticleUrl()}</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
