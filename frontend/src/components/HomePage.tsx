import { useState, useEffect } from "react";
import {
  TrendingUp,
  Shield,
  ShieldCheck,
  Users,
  ChevronRight,
  Briefcase as BriefcaseIcon,
  Building2,
  UserCheck,
  Calendar,
  Landmark,
  GraduationCap,
  AlarmClock,
  Sparkles,
  Newspaper,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { JobCard } from "./JobCard";
import SearchBar from "./SearchBar";
import { fetchJobs, fetchJobsMeta } from "../api/jobs";
import { fetchHomepageNews, PulseUpdate } from "../api/news";
import { fetchAnalyticsOverview } from "../api/analytics";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface HomePageProps {
  onNavigate: (page: string, jobId?: string) => void;
}

function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

function StatCard({
  icon: Icon,
  end,
  label,
  suffix = "",
  iconBg = "bg-blue-50 text-blue-600",
}: {
  icon: any;
  end: number;
  label: string;
  suffix?: string;
  iconBg?: string;
}) {
  const count = useCounter(end);
  return (
    <div className="text-center group transition-transform duration-300 hover:-translate-y-1">
      <div className="flex flex-col items-center justify-center">
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-3 shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" strokeWidth={2.2} />
        </div>
        <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
          {count.toLocaleString()}{suffix}
        </div>
        <div className="text-xs sm:text-sm font-medium text-slate-500">
          {label}
        </div>
      </div>
    </div>
  );
}

function toPlainNewsText(value?: string) {
  if (!value) return "";
  const container = document.createElement("div");
  container.innerHTML = value;
  return (container.textContent || container.innerText || "").replace(/\s+/g, " ").trim();
}

function getNewsExcerpt(update: PulseUpdate, max = 220) {
  const plain = toPlainNewsText(update.fullStory);
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const cut = plain.lastIndexOf(" ", max - 1);
  return `${plain.slice(0, cut > max / 2 ? cut : max - 1).trim()}…`;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [governmentJobs, setGovernmentJobs] = useState<any[]>([]);
  const [privateJobs, setPrivateJobs] = useState<any[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<PulseUpdate[]>([]);
  const [copiedNewsId, setCopiedNewsId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalJobs: 0, totalEmployers: 0, totalUsers: 0, totalApplications: 0 });

  const handleShareNews = async (e: React.MouseEvent, update: PulseUpdate) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/api/share/news/${update.id}`;
    const excerpt = getNewsExcerpt(update);
    const shareText = [`*${update.title}*`, excerpt, shareUrl].filter(Boolean).join("\n\n");
    const shareData = {
      title: `${update.title} | MedExJob News`,
      text: excerpt || update.title,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedNewsId(update.id);
      setTimeout(() => setCopiedNewsId(null), 2500);
    } catch (err) {
      console.error("Failed to copy news link", err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [feat, latest, all, gov, priv, meta, news, overview] = await Promise.all([
          fetchJobs({ featured: true, size: 6, status: "active" }).then((r) => r.content ?? []),
          fetchJobs({ size: 6, sort: "createdAt,desc", status: "active" }).then((r) => r.content ?? []),
          fetchJobs({ size: 10, sort: "createdAt,desc", status: "active" }).then((r) => r.content ?? []),
          fetchJobs({ sector: "government", size: 10, status: "active" }).then((r) => r.content ?? []),
          fetchJobs({ sector: "private", size: 10, status: "active" }).then((r) => r.content ?? []),
          fetchJobsMeta(),
          fetchHomepageNews(),
          fetchAnalyticsOverview().catch(() => null),
        ]);

        if (overview) {
          setStats({
            totalJobs: overview.totalJobs ?? 0,
            totalEmployers: overview.totalEmployers ?? 0,
            totalUsers: overview.totalUsers ?? 0,
            totalApplications: overview.totalApplications ?? 0,
          });
        }

        const featuredArray = Array.isArray(feat) ? feat : [];
        const latestArray = Array.isArray(latest) ? latest : [];
        const jobMap = new Map();
        featuredArray.forEach((job) => { if (job.id) jobMap.set(job.id, job); });
        latestArray.forEach((job) => { if (job.id && jobMap.size < 6) jobMap.set(job.id, job); });
        setFeaturedJobs(Array.from(jobMap.values()).slice(0, 6));
        setAllJobs(Array.isArray(all) ? all.slice(0, 10) : []);
        setGovernmentJobs(Array.isArray(gov) ? gov.filter((job) => (job.sector?.toLowerCase() || "") === "government").slice(0, 3) : []);
        setPrivateJobs(Array.isArray(priv) ? priv.filter((job) => (job.sector?.toLowerCase() || "") === "private").slice(0, 3) : []);
        setNewsUpdates(Array.isArray(news) ? news.slice(0, 6) : []);
      } catch (e) {
        setFeaturedJobs([]);
        setAllJobs([]);
        setGovernmentJobs([]);
        setPrivateJobs([]);
        setNewsUpdates([]);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Light Medical Hero Section */}
      <section className="relative z-20 bg-gradient-to-b from-[#eaf3fa] via-[#f4f9fd] to-white pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 overflow-hidden">
        {/* Soft Background Medical Watermarks */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {/* Subtle medical cross watermarks matching reference */}
          <svg className="absolute -top-10 right-1/4 w-64 h-64 text-cyan-200/35 blur-[0.5px]" viewBox="0 0 100 100" fill="currentColor">
            <rect x="40" y="10" width="20" height="80" rx="6" />
            <rect x="10" y="40" width="80" height="20" rx="6" />
          </svg>
          <svg className="absolute top-1/3 left-4 w-36 h-36 text-blue-200/25 blur-[0.5px]" viewBox="0 0 100 100" fill="currentColor">
            <rect x="40" y="15" width="20" height="70" rx="5" />
            <rect x="15" y="40" width="70" height="20" rx="5" />
          </svg>
          {/* Soft ambient radial tints */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-cyan-100/35 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Heading, Subtitle & SearchBar */}
            <div className="lg:col-span-7 text-left relative z-20">
              {/* Kicker tag with teal accent underline matching Image 2 */}
              <div className="inline-flex flex-col items-start mb-3">
                <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-slate-500 uppercase">
                  YOUR CAREER <span className="text-slate-300 mx-1.5 font-normal">|</span> OUR MISSION
                </span>
                <div className="h-1 w-12 bg-teal-500 rounded-full mt-1.5" />
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.12] tracking-tight mb-3">
                Find Your Dream{" "}
                <span className="text-blue-600 block sm:inline">Medical Career</span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
                India's Premier Job Portal for Doctors, Nurses &amp; Paramedical Professionals
              </p>

              {/* Search Bar */}
              <div className="max-w-2xl relative z-30">
                <SearchBar showLabels={false} />
              </div>
            </div>

            {/* Right Column (Desktop): Doctor Portrait */}
            <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center">
              <div className="relative w-full max-w-sm">
                {/* Decorative background glow & cross */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-400/15 via-teal-300/15 to-transparent rounded-3xl blur-2xl transform rotate-2 pointer-events-none" />
                <svg className="absolute -top-6 -right-6 w-24 h-24 text-teal-400/40 pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="40" y="10" width="20" height="80" rx="6" />
                  <rect x="10" y="40" width="80" height="20" rx="6" />
                </svg>

                {/* Doctor Image Container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border-4 border-white bg-white">
                  <img
                    src="/hero-doctor.jpg"
                    alt="Female Doctor - MedExJob"
                    className="w-full h-auto object-cover max-h-[460px] transform hover:scale-102 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Verified Trust Badge overlay */}
                <div className="absolute -bottom-4 -left-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">100% Verified</p>
                    <p className="text-[11px] text-slate-500">Healthcare Jobs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile View: Doctor positioned gracefully at top-right */}
        <div className="lg:hidden absolute top-4 right-1 w-32 h-44 sm:w-44 sm:h-56 pointer-events-none select-none overflow-hidden rounded-2xl opacity-90 z-0">
          <img
            src="/hero-doctor.jpg"
            alt=""
            className="w-full h-full object-cover object-top"
            style={{
              WebkitMaskImage: "radial-gradient(ellipse at 70% 30%, black 50%, transparent 85%)",
              maskImage: "radial-gradient(ellipse at 70% 30%, black 50%, transparent 85%)",
            }}
          />
        </div>
      </section>

      {/* Stats Section matching Image 2 */}
      <section className="py-12 bg-white border-b border-slate-100 relative z-10">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* 4 Stats on Desktop / 2 Stats on Mobile */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 items-center justify-center">
              <StatCard
                icon={BriefcaseIcon}
                end={stats.totalJobs || 529}
                label="Active Jobs"
                suffix="+"
                iconBg="bg-blue-50 text-blue-600"
              />
              <StatCard
                icon={Building2}
                end={stats.totalEmployers || 119}
                label="Hospitals"
                suffix="+"
                iconBg="bg-teal-50 text-teal-600"
              />
              <StatCard
                icon={Users}
                end={stats.totalUsers || 18000}
                label="Candidates"
                suffix="+"
                iconBg="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                icon={UserCheck}
                end={stats.totalApplications || 45000}
                label="Applications"
                suffix="+"
                iconBg="bg-purple-50 text-purple-600"
              />
            </div>

            {/* Trust Pill Banner matching Image 2 */}
            <div className="mt-8 max-w-md mx-auto bg-[#f4f8fc] border border-blue-100/70 rounded-2xl px-5 py-3.5 flex items-center justify-center gap-3.5 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-teal-100/60 flex items-center justify-center text-teal-600 shrink-0">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                  Trusted by <span className="font-bold text-blue-600">18,000+</span> Doctors
                </p>
                <p className="text-[11px] text-slate-400">Your Career, Our Priority</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8"><div><h2 className="text-3xl text-gray-900 mb-2">Latest Jobs</h2><p className="text-gray-600">Latest job opportunities for you</p></div><Button variant="outline" onClick={() => onNavigate("jobs")} className="group hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300">View All<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></Button></div>
          {featuredJobs.length > 0 ? <div className="grid md:grid-cols-3 gap-6">{featuredJobs.map((job, index) => <div key={job.id} className="animate-fade-in-up h-full flex flex-col" style={{ animationDelay: `${index * 0.1}s` }}><JobCard job={job} onViewDetails={(jobId) => onNavigate("job-detail", jobId)} /></div>)}</div> : <Card className="p-12 text-center"><BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold text-gray-900 mb-2">No Jobs Available Yet</h3><p className="text-gray-600 mb-6">Check back soon for latest job opportunities</p><Button onClick={() => onNavigate("jobs")} variant="outline">Browse All Jobs</Button></Card>}
        </div>
      </section>

      {allJobs.length > 0 && <section className="py-16 bg-white relative"><div className="container mx-auto px-4"><div className="flex items-center justify-between mb-8"><div><h2 className="text-3xl text-gray-900 mb-2">All Jobs</h2><p className="text-gray-600">Browse every open position across healthcare</p></div><Button variant="outline" onClick={() => onNavigate("jobs")} className="group hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300">View All<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></Button></div><div className="grid md:grid-cols-3 gap-6">{allJobs.map((job, index) => <div key={job.id} className="animate-fade-in-up h-full flex flex-col" style={{ animationDelay: `${index * 0.08}s` }}><JobCard job={job} onViewDetails={(jobId) => onNavigate("job-detail", jobId)} /></div>)}</div></div></section>}

      {governmentJobs.length > 0 && <section className="py-16 bg-gray-50 relative"><div className="container mx-auto px-4"><div className="flex items-center justify-between mb-8"><div><h2 className="text-3xl text-gray-900 mb-2 flex items-center"><span className="w-1.5 h-8 bg-blue-600 rounded-full mr-3 inline-block"></span>Government Jobs</h2><p className="text-gray-600 ml-5">Official government vacancies</p></div><Button variant="outline" onClick={() => onNavigate("govt-jobs")} className="group border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300">View All<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></Button></div><div className="grid md:grid-cols-3 gap-6">{governmentJobs.map((job, index) => <div key={job.id} className="animate-fade-in-up h-full flex flex-col" style={{ animationDelay: `${index * 0.1}s` }}><JobCard job={job} onViewDetails={(jobId) => onNavigate("job-detail", jobId)} /></div>)}</div></div></section>}

      {privateJobs.length > 0 && <section className="py-16 bg-white relative"><div className="container mx-auto px-4"><div className="flex items-center justify-between mb-8"><div><h2 className="text-3xl text-gray-900 mb-2 flex items-center"><span className="w-1.5 h-8 bg-green-600 rounded-full mr-3 inline-block"></span>Private Jobs</h2><p className="text-gray-600 ml-5">Top hospitals & healthcare providers</p></div><Button variant="outline" onClick={() => onNavigate("private-jobs")} className="group border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300">View All<ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" /></Button></div><div className="grid md:grid-cols-3 gap-6">{privateJobs.map((job, index) => <div key={job.id} className="animate-fade-in-up h-full flex flex-col" style={{ animationDelay: `${index * 0.1}s` }}><JobCard job={job} onViewDetails={(jobId) => onNavigate("job-detail", jobId)} /></div>)}</div></div></section>}

      {newsUpdates.length > 0 && (
        <section className="relative py-20 bg-gradient-to-br from-white via-gray-50/50 to-white overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="mb-12"><div className="space-y-3"><div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-200">Breaking News</div><h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">Latest News & Updates</h2><p className="text-lg text-gray-600 max-w-2xl">Stay informed with the latest medical notifications, exam updates, and industry news</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsUpdates.slice(0, 4).map((update, index) => {
                const iconMap: Record<string, any> = { GOVT: Landmark, EXAM: GraduationCap, PRIVATE: BriefcaseIcon, DEADLINE: AlarmClock, UPDATE: Sparkles };
                const Icon = iconMap[update.type] || Sparkles;
                const isBreaking = update.breaking;
                const isGreen = index % 2 === 0;
                const borderColor = isBreaking ? "#ef4444" : isGreen ? "#10b981" : "#2563eb";
                const badgeBg = isBreaking ? "linear-gradient(to right, #dc2626, #b91c1c)" : isGreen ? "linear-gradient(to right, #10b981, #059669)" : "linear-gradient(to right, #2563eb, #1d4ed8)";
                const buttonBg = badgeBg;
                const headlineColor = isBreaking ? "#dc2626" : isGreen ? "#059669" : "#1d4ed8";
                const excerpt = getNewsExcerpt(update);
                const formattedDate = update.date ? new Date(update.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
                return (
                  <Card key={update.id} className="relative h-full cursor-pointer overflow-hidden rounded-2xl border-2 p-5 md:p-6 shadow-md transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl group" style={{ background: "#ffffff", borderColor }} onClick={() => update.fullStory ? onNavigate(`news/${update.id}`) : onNavigate("news")}>
                    <div className="relative flex h-full flex-col gap-4">
                      <div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0 space-y-2"><div className="flex items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="shadow-md px-4 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 rounded-md inline-flex text-white" style={{ background: badgeBg }}><Icon className="w-3.5 h-3.5" />{update.type || "Update"}</span>{isBreaking && <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-xs font-semibold">BREAKING</Badge>}</div><Button size="icon" variant="ghost" title={copiedNewsId === update.id ? "Link Copied!" : "Share News"} className="h-8 w-8 rounded-full border shrink-0" onClick={(e) => handleShareNews(e, update)}>{copiedNewsId === update.id ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}</Button></div><h3 className="text-lg md:text-xl font-bold line-clamp-2" style={{ color: headlineColor }}>{update.title}</h3></div></div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-700"><span className="inline-flex items-center gap-2 bg-blue-100/90 border border-blue-200 text-blue-700 rounded-full px-3 py-1.5"><Calendar className="w-4 h-4" />{formattedDate}</span><span className="inline-flex items-center gap-2 bg-purple-100/90 border border-purple-200 text-purple-700 rounded-full px-3 py-1.5"><Icon className="w-4 h-4" />{update.type || "Update"}</span></div>
                      {excerpt && <div className="flex-1"><p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{excerpt}</p></div>}
                      <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-center md:justify-between"><span className="text-xs text-gray-500">Tap to read full story</span><div className="flex items-center gap-2"><Button size="sm" variant="ghost" title={copiedNewsId === update.id ? "Link Copied!" : "Share News"} className="h-8 w-8 p-0 rounded-full" onClick={(e) => handleShareNews(e, update)}>{copiedNewsId === update.id ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}</Button><Button size="sm" onClick={(e) => { e.stopPropagation(); update.fullStory ? onNavigate(`news/${update.id}`) : onNavigate("news"); }} className="inline-flex min-w-[140px] items-center justify-center gap-2 text-white shadow-lg" style={{ background: buttonBg }}>View Full Story<ChevronRight className="w-4 h-4" /></Button></div></div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-white"><div className="container mx-auto px-4"><div className="text-center mb-12"><h2 className="text-3xl text-gray-900 mb-3">Why Choose MedExJob.com?</h2><p className="text-gray-600">Your trusted partner in medical career advancement</p></div><div className="grid md:grid-cols-3 gap-8"><Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-blue-600"><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-blue-600" /></div><h3 className="text-xl text-gray-900 mb-2">Verified Employers</h3><p className="text-gray-600">All employers are verified to ensure authentic job postings</p></Card><Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-green-600"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-8 h-8 text-green-600" /></div><h3 className="text-xl text-gray-900 mb-2">Latest Opportunities</h3><p className="text-gray-600">Get instant alerts for the latest government and private jobs</p></Card><Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-purple-600"><div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-purple-600" /></div><h3 className="text-xl text-gray-900 mb-2">Direct Applications</h3><p className="text-gray-600">Apply directly and track your application status in real-time</p></Card></div></div></section>

      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Start Your Medical Career?</h2>
          <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">Join thousands of medical professionals who found their dream jobs</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30" onClick={() => onNavigate("register")}>Register as Candidate</Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" onClick={() => onNavigate("register")}>Register as Employer</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
