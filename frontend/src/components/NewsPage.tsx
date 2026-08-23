import { useEffect, useState } from 'react';
import { fetchPulseUpdates, PulseUpdate } from '../api/news';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, Calendar, Newspaper, Filter, RefreshCw, Landmark, Briefcase, GraduationCap, Timer, Sparkles, ChevronRight, Share2, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface NewsPageProps {
  onNavigate: (page: string, id?: string) => void;
}

const canonicalTypeOrder = ['GOVT', 'PRIVATE', 'EXAM', 'DEADLINE', 'UPDATE'] as const;
type CanonicalType = typeof canonicalTypeOrder[number];

const typeLabels: Record<string, string> = {
  GOVT: 'Government',
  PRIVATE: 'Private',
  EXAM: 'Exam',
  DEADLINE: 'Deadline',
  UPDATE: 'Update',
  govt: 'Government',
  private: 'Private',
  exam: 'Exam',
  deadline: 'Deadline',
  update: 'Update',
};

const typeMeta: Record<CanonicalType, { icon: JSX.Element; accent: string; sub: string }> = {
  GOVT: { icon: <Landmark className="w-4 h-4" />, accent: 'text-blue-700', sub: 'Govt notice' },
  PRIVATE: { icon: <Briefcase className="w-4 h-4" />, accent: 'text-emerald-700', sub: 'Private sector' },
  EXAM: { icon: <GraduationCap className="w-4 h-4" />, accent: 'text-purple-700', sub: 'Exam update' },
  DEADLINE: { icon: <Timer className="w-4 h-4" />, accent: 'text-amber-700', sub: 'Deadline alert' },
  UPDATE: { icon: <Sparkles className="w-4 h-4" />, accent: 'text-cyan-700', sub: 'General update' },
};

const cardThemes: Record<CanonicalType, { bg: string; border: string; hover: string; badge: string; ring: string; glow: string; hoverBg: string }> = {
  GOVT: { bg: 'bg-gradient-to-br from-blue-50 to-white', border: 'border-l-4 border-l-blue-500 border border-blue-100', hover: 'hover:shadow-blue-200', badge: 'bg-blue-600 text-white', ring: 'ring-blue-100', glow: 'group-hover:shadow-[0_20px_48px_-24px_rgba(37,99,235,0.55)] group-hover:ring-2 group-hover:ring-blue-200 group-hover:ring-offset-1', hoverBg: 'group-hover:from-blue-100 group-hover:to-blue-50' },
  PRIVATE: { bg: 'bg-gradient-to-br from-emerald-50 to-white', border: 'border-l-4 border-l-emerald-500 border border-emerald-100', hover: 'hover:shadow-emerald-200', badge: 'bg-blue-600 text-white', ring: 'ring-emerald-100', glow: 'group-hover:shadow-[0_20px_48px_-24px_rgba(5,150,105,0.55)] group-hover:ring-2 group-hover:ring-emerald-200 group-hover:ring-offset-1', hoverBg: 'group-hover:from-emerald-100 group-hover:to-emerald-50' },
  EXAM: { bg: 'bg-gradient-to-br from-purple-50 to-white', border: 'border-l-4 border-l-purple-500 border border-purple-100', hover: 'hover:shadow-purple-200', badge: 'bg-blue-600 text-white', ring: 'ring-purple-100', glow: 'group-hover:shadow-[0_20px_48px_-24px_rgba(109,40,217,0.55)] group-hover:ring-2 group-hover:ring-purple-200 group-hover:ring-offset-1', hoverBg: 'group-hover:from-purple-100 group-hover:to-purple-50' },
  DEADLINE: { bg: 'bg-gradient-to-br from-amber-50 to-white', border: 'border-l-4 border-l-amber-500 border border-amber-100', hover: 'hover:shadow-amber-200', badge: 'bg-blue-600 text-white', ring: 'ring-amber-100', glow: 'group-hover:shadow-[0_20px_48px_-24px_rgba(245,158,11,0.55)] group-hover:ring-2 group-hover:ring-amber-200 group-hover:ring-offset-1', hoverBg: 'group-hover:from-amber-100 group-hover:to-amber-50' },
  UPDATE: { bg: 'bg-gradient-to-br from-cyan-50 to-white', border: 'border-l-4 border-l-cyan-500 border border-cyan-100', hover: 'hover:shadow-cyan-200', badge: 'bg-blue-600 text-white', ring: 'ring-cyan-100', glow: 'group-hover:shadow-[0_20px_48px_-24px_rgba(8,145,178,0.55)] group-hover:ring-2 group-hover:ring-cyan-200 group-hover:ring-offset-1', hoverBg: 'group-hover:from-cyan-100 group-hover:to-cyan-50' },
};

const normalizeType = (type?: string): CanonicalType => {
  if (!type) return 'UPDATE';
  const normalized = type.toString().trim().toUpperCase();

  if (normalized.includes('GOV')) return 'GOVT';
  if (normalized.includes('PRIV')) return 'PRIVATE';
  if (normalized.includes('EXAM')) return 'EXAM';
  if (normalized.includes('DEAD')) return 'DEADLINE';
  if (normalized.includes('UPDAT')) return 'UPDATE';

  return 'UPDATE';
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function NewsPage({ onNavigate }: NewsPageProps) {
  const [updates, setUpdates] = useState<PulseUpdate[]>([]);
  const [filteredUpdates, setFilteredUpdates] = useState<PulseUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [copiedNewsId, setCopiedNewsId] = useState<string | null>(null);

  const handleShareNews = async (e: React.MouseEvent, update: PulseUpdate) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/news/${update.id}`;
    const shareData = {
      title: `${update.title} | MedExJob News`,
      text: `${update.title} - Read the full update on MedExJob`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedNewsId(update.id);
      setTimeout(() => setCopiedNewsId(null), 2500);
    } catch (err) {
      console.error('Failed to copy news link', err);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  useEffect(() => {
    filterUpdates();
  }, [updates, searchQuery, selectedType]);

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const data = await fetchPulseUpdates();
      setUpdates(data);
    } catch {
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUpdates = () => {
    let filtered = [...updates];
    
    if (searchQuery) {
      filtered = filtered.filter(update => 
        update.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedType && selectedType !== 'all') {
      filtered = filtered.filter(update => update.type === selectedType);
    }
    
    setFilteredUpdates(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
              <Newspaper className="w-5 h-5" />
              <span className="text-sm font-medium">Medical News & Updates</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Latest Medical News
            </h1>
            <p className="text-xl text-orange-100">
              Stay updated with the latest government notifications, exam updates, and healthcare news
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 bg-white border-b sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-xl relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search news by title..."
                className="pl-10 transition-all focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 items-center">
              <Filter className="w-5 h-5 text-gray-500 hidden sm:block" />
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="GOVT">Government</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="EXAM">Exam</SelectItem>
                  <SelectItem value="DEADLINE">Deadline</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={loadUpdates} 
                disabled={loading}
                className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                title="Refresh news"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">All Updates</h2>
              <p className="text-gray-600">
                {filteredUpdates.length === 0 
                  ? 'No updates found' 
                  : `${filteredUpdates.length} ${filteredUpdates.length === 1 ? 'update' : 'updates'} found`}
              </p>
            </div>
            {filteredUpdates.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Sorted by:</span>
                <span className="font-medium text-gray-700">Latest First</span>
              </div>
            )}
          </div>

          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-6 animate-pulse max-w-5xl mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-32 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full ml-auto"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                    <div className="h-8 w-24 bg-gray-200 rounded"></div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredUpdates.length === 0 && (
            <div className="text-center py-20">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
                <Newspaper className="w-24 h-24 text-gray-300 mx-auto relative" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery || selectedType !== 'all' 
                  ? 'No news found matching your criteria' 
                  : 'No news updates yet'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {searchQuery || selectedType !== 'all'
                  ? 'Try adjusting your search terms or filter options to find what you\'re looking for.'
                  : 'Check back soon for the latest medical news and updates. Admin will be adding news shortly.'}
              </p>
              {(searchQuery || selectedType !== 'all') && (
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button onClick={loadUpdates}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          )}

          {!loading && filteredUpdates.length > 0 && (
            <div className="space-y-4">
              {filteredUpdates.map((update, index) => {
                const normalizedType = normalizeType(update.type);
                const colors = cardThemes[normalizedType];
                const label = typeLabels[normalizedType] || (update.type ? update.type : 'Update');
                const meta = typeMeta[normalizedType];
                
                return (
                  <Card
                    key={update.id}
                    className={`relative overflow-hidden p-5 md:p-6 ${colors.bg} ${colors.hoverBg} ${colors.border} hover:shadow-2xl ${colors.hover} ${colors.glow} hover:-translate-y-1 transition-all duration-300 cursor-pointer group rounded-2xl ring-1 ${colors.ring} max-w-5xl mx-auto`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                    onClick={() => update.fullStory ? onNavigate(`news/${update.id}`) : onNavigate('news')}
                  >
                    <div className="absolute inset-0 pointer-events-none opacity-60">
                      <div className="absolute -right-10 -top-16 w-40 h-40 bg-white/50 blur-3xl" />
                      <div className="absolute right-6 top-6 w-16 h-16 rounded-full bg-white/60" />
                    </div>

                    <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${colors.badge} px-3 py-1 text-xs font-semibold`}>{label}</Badge>
                        <span className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white/70 border border-white/60 rounded-full px-3 py-1 shadow-sm">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/80 border border-white/70 text-slate-700">
                            {meta.icon}
                          </span>
                          {meta.sub}
                        </span>
                        {update.breaking && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-70" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                            Breaking
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 bg-white/80 border border-white/60 rounded-full px-3 py-1.5 shadow-sm">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          Updated {formatDate(update.date)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={copiedNewsId === update.id ? 'Link Copied!' : 'Share News'}
                          className={`h-8 w-8 rounded-full border bg-white/80 transition-all ${
                            copiedNewsId === update.id
                              ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                              : 'text-gray-500 hover:text-blue-600 hover:bg-white border-white/60 shadow-sm'
                          }`}
                          onClick={(e) => handleShareNews(e, update)}
                        >
                          {copiedNewsId === update.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="relative mt-4">
                      <div className="space-y-3 min-w-0">
                        <h3 
                          className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-tight"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                        >
                          {update.title}
                        </h3>
                        <p className="text-sm md:text-base text-slate-600 leading-relaxed line-clamp-3">
                          Stay informed with the latest medical updates, policy changes, and critical notifications affecting healthcare professionals.
                        </p>
                        
                        {/* CTA Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
                          <span className="text-xs text-gray-500 font-medium">
                            {update.fullStory ? 'Tap to read full story' : 'View on news page'}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              title={copiedNewsId === update.id ? 'Link Copied!' : 'Share News'}
                              className={`h-8 w-8 p-0 rounded-full transition-colors ${
                                copiedNewsId === update.id
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                              onClick={(e) => handleShareNews(e, update)}
                            >
                              {copiedNewsId === update.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Share2 className="w-4 h-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              className={`h-9 px-4 font-semibold gap-2 group-hover:gap-3 transition-all ${meta.accent}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (update.fullStory) {
                                  onNavigate(`news/${update.id}`);
                                } else {
                                  onNavigate('news');
                                }
                              }}
                            >
                              {update.fullStory ? 'View Full Story' : 'View Story'}
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}