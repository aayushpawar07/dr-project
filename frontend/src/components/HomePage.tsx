import { useState, useEffect } from "react";
import {
  TrendingUp,
  Shield,
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

function StatCard({ icon: Icon, end, label, suffix = "" }: { icon: any; end: number; label: string; suffix?: string }) {
  const count = useCounter(end);
  return (
    <div className="text-center transform hover:scale-105 transition-transform duration-300">
      <div className="flex flex-col items-center justify-center mb-3">
        <div className="mb-3 flex items-center justify-center">
          <Icon className="w-12 h-12 md:w-14 md:h-14 text-blue-600 flex-shrink-0" strokeWidth={2.5} fill="none" stroke="currentColor" style={{ color: "#2563EB" }} />
        </div>
        <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-600 mb-1">{count.toLocaleString()}{suffix}</div>
      </div>
      <div className="text-gray-600 text-sm md:text-base font-medium">{label}</div>
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
      <section className="relative z-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-16 md:py-24 overflow-visible">
        <div className="absolute inset-0">
          <ImageWithFallback src="https://images.unsplash.com/photo-1666886573590-5815157da865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwaGVhbHRoY2FyZSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjAzNzY2MDB8MA&ixlib=rb-4.1.0&q=80&w=1080" alt="Medical professionals" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-blue-700/70 to-blue-900/70"></div>
        </div>
        <div className="absolute inset-0 overflow-hidden"><div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div><div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl mb-6 animate-fade-in-up">Find Your Dream Medical Career</h1>
            <p className="text-xl text-blue-100 mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>India's Premier Job Portal for Doctors, Nurses & Paramedical Professionals</p>
            <div className="animate-fade-in-up max-w-4xl mx-auto relative z-30" style={{ animationDelay: "0.4s" }}><SearchBar showLabels={true} /></div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-b relative z-10 overflow-visible">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10"><div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard icon={BriefcaseIcon} end={stats.totalJobs} label="Active Jobs" suffix="+" />
          <StatCard icon={Building2} end={stats.totalEmployers} label="Hospitals" suffix="+" />
          <StatCard icon={Users} end={stats.totalUsers} label="Candidates" suffix="+" />
          <StatCard icon={UserCheck} end={stats.totalApplications} label="Applications" suffix="+" />
        </div></div>
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

      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white relative overflow-hidden"><div className="container mx-auto px-4 text-center relative z-10"><h2 className="text-4xl mb-4">Ready to Start Your Medical Career?</h2><p className="text-xl text-blue-100 mb-8">Join thousands of medical professionals who found their dream jobs</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => onNavigate("register")}>Register as Candidate</Button><Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" onClick={() => onNavigate("register")}>Register as Employer</Button></div></div></section>
    </div>
  );
}
