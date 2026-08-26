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

// Custom hook for animated counter
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
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
}: {
  icon: any;
  end: number;
  label: string;
  suffix?: string;
}) {
  const count = useCounter(end);

  return (
    <div className="text-center transform hover:scale-105 transition-transform duration-300">
      <div className="flex flex-col items-center justify-center mb-3">
        {/* Icon with explicit styling for visibility */}
        <div className="mb-3 flex items-center justify-center">
          <Icon
            className="w-12 h-12 md:w-14 md:h-14 text-blue-600 flex-shrink-0"
            strokeWidth={2.5}
            fill="none"
            stroke="currentColor"
            style={{ color: "#2563EB" }}
          />
        </div>
        {/* Number */}
        <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-600 mb-1">
          {count.toLocaleString()}
          {suffix}
        </div>
      </div>
      {/* Label */}
      <div className="text-gray-600 text-sm md:text-base font-medium">
        {label}
      </div>
    </div>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [featuredJobs, setFeaturedJobs] = useState<any[]>([]);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [governmentJobs, setGovernmentJobs] = useState<any[]>([]);
  const [privateJobs, setPrivateJobs] = useState<any[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<PulseUpdate[]>([]);
  const [copiedNewsId, setCopiedNewsId] = useState<string | null>(null);
  // Dynamic stats from analytics API
  const [stats, setStats] = useState({ totalJobs: 0, totalEmployers: 0, totalUsers: 0, totalApplications: 0 });

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
      console.error("Failed to copy news link", err);
    }
  };

  useEffect(() => {
    // Load featured, latest, government, private jobs, news, and job options
    (async () => {
      try {
        const [feat, latest, all, gov, priv, meta, news, overview] = await Promise.all([
          fetchJobs({ featured: true, size: 6, status: "active" }).then(
            (r) => r.content ?? [],
          ),
          fetchJobs({
            size: 6,
            sort: "createdAt,desc",
            status: "active",
          }).then((r) => r.content ?? []),
          fetchJobs({
            size: 10,
            sort: "createdAt,desc",
            status: "active",
          }).then((r) => r.content ?? []),
          fetchJobs({
            sector: "government",
            size: 10,
            status: "active",
          }).then((r) => r.content ?? []),
          fetchJobs({ sector: "private", size: 10, status: "active" }).then(
            (r) => r.content ?? [],
          ),
          fetchJobsMeta(),
          fetchHomepageNews(),
          fetchAnalyticsOverview().catch(() => null),
        ]);

        // Update analytics stats (fall back to 0 if unavailable)
        if (overview) {
          setStats({
            totalJobs: overview.totalJobs ?? 0,
            totalEmployers: overview.totalEmployers ?? 0,
            totalUsers: overview.totalUsers ?? 0,
            totalApplications: overview.totalApplications ?? 0,
          });
        }

        // Combine featured and latest jobs, removing duplicates, limit to 6
        const featuredArray = Array.isArray(feat) ? feat : [];
        const latestArray = Array.isArray(latest) ? latest : [];

        // Create a map to track job IDs to avoid duplicates
        const jobMap = new Map();

        // First add featured jobs
        featuredArray.forEach((job) => {
          if (job.id) jobMap.set(job.id, job);
        });

        // Then add latest jobs (up to 6 total)
        latestArray.forEach((job) => {
          if (job.id && jobMap.size < 6) {
            jobMap.set(job.id, job);
          }
        });

        // Convert map to array and limit to 6
        const combinedJobs = Array.from(jobMap.values()).slice(0, 6);
        setFeaturedJobs(combinedJobs);

        // All Jobs section â€” latest 10 jobs
        setAllJobs(Array.isArray(all) ? all.slice(0, 10) : []);

        // Filter government jobs - ensure only government sector jobs are included
        const filteredGovJobs = Array.isArray(gov)
          ? gov
              .filter((job) => {
                const jobSector = job.sector?.toLowerCase() || "";
                return jobSector === "government";
              })
              .slice(0, 3)
          : [];
        setGovernmentJobs(filteredGovJobs);

        // Filter private jobs - ensure only private sector jobs are included
        const filteredPrivateJobs = Array.isArray(priv)
          ? priv
              .filter((job) => {
                const jobSector = job.sector?.toLowerCase() || "";
                return jobSector === "private";
              })
              .slice(0, 3)
          : [];
        setPrivateJobs(filteredPrivateJobs);
        setNewsUpdates(Array.isArray(news) ? news.slice(0, 6) : []);
      } catch (e) {
        // Set empty arrays on error, no mock data fallback
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
      {/* Hero Section with Better Visible Background */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white py-16 md:py-24 overflow-visible">
        {/* Background Image with Better Visibility */}
        <div className="absolute inset-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1666886573590-5815157da865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwaGVhbHRoY2FyZSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NjAzNzY2MDB8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Medical professionals"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-blue-700/70 to-blue-900/70"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* <div className="inline-block mb-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 animate-fade-in">
              <span className="text-sm"></span>
            </div> */}

            <h1 className="text-5xl md:text-6xl mb-6 animate-fade-in-up">
              Find Your Dream Medical Career
            </h1>
            <p
              className="text-xl text-blue-100 mb-10 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              India's Premier Job Portal for Doctors, Nurses & Paramedical
              Professionals
            </p>

            {/* Job Search Bar */}
            <div
              className="animate-fade-in-up max-w-4xl mx-auto"
              style={{ animationDelay: "0.4s" }}
            >
              <SearchBar showLabels={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="py-16 bg-white border-b relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard
              icon={BriefcaseIcon}
              end={stats.totalJobs}
              label="Active Jobs"
              suffix="+"
            />
            <StatCard
              icon={Building2}
              end={stats.totalEmployers}
              label="Hospitals"
              suffix="+"
            />
            <StatCard icon={Users} end={stats.totalUsers} label="Candidates" suffix="+" />
            <StatCard
              icon={UserCheck}
              end={stats.totalApplications}
              label="Applications"
              suffix="+"
            />
          </div>
        </div>
      </section>

      {/* Latest Jobs with Animations */}
      <section className="py-16 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl text-gray-900 mb-2">Latest Jobs</h2>
              <p className="text-gray-600">Latest job opportunities for you</p>
            </div>
            <Button
              variant="outline"
              onClick={() => onNavigate("jobs")}
              className="group hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {featuredJobs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="animate-fade-in-up h-full flex flex-col"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <JobCard
                    job={job}
                    onViewDetails={(jobId) => onNavigate("job-detail", jobId)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Jobs Available Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Check back soon for latest job opportunities
              </p>
              <Button onClick={() => onNavigate("jobs")} variant="outline">
                Browse All Jobs
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* All Jobs Section â€” 2-column with rotating accent colors */}
      {allJobs.length > 0 && (
        <section className="py-16 bg-white relative">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl text-gray-900 mb-2">All Jobs</h2>
                <p className="text-gray-600">Browse every open position across healthcare</p>
              </div>
              <Button
                variant="outline"
                onClick={() => onNavigate("jobs")}
                className="group hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* 2-column grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {allJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="animate-fade-in-up h-full flex flex-col"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <JobCard
                    job={job}
                    onViewDetails={(jobId) => onNavigate("job-detail", jobId)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Government Jobs Section */}
      {governmentJobs.length > 0 && (
        <section className="py-16 bg-gray-50 relative">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl text-gray-900 mb-2 flex items-center">
                  <span className="w-1.5 h-8 bg-blue-600 rounded-full mr-3 inline-block"></span>
                  Government Jobs
                </h2>
                <p className="text-gray-600 ml-5">Official government vacancies</p>
              </div>
              <Button
                variant="outline"
                onClick={() => onNavigate("govt-jobs")}
                className="group border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {governmentJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="animate-fade-in-up h-full flex flex-col"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <JobCard
                    job={job}
                    onViewDetails={(jobId) => onNavigate("job-detail", jobId)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Private Jobs Section */}
      {privateJobs.length > 0 && (
        <section className="py-16 bg-white relative">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl text-gray-900 mb-2 flex items-center">
                  <span className="w-1.5 h-8 bg-green-600 rounded-full mr-3 inline-block"></span>
                  Private Jobs
                </h2>
                <p className="text-gray-600 ml-5">Top hospitals &amp; healthcare providers</p>
              </div>
              <Button
                variant="outline"
                onClick={() => onNavigate("private-jobs")}
                className="group border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {privateJobs.map((job, index) => (
                <div
                  key={job.id}
                  className="animate-fade-in-up h-full flex flex-col"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <JobCard
                    job={job}
                    onViewDetails={(jobId) => onNavigate("job-detail", jobId)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= PREMIUM EDITORIAL NEWS SECTION ================= */}
      {newsUpdates.length > 0 && (
        <section className="relative py-20 bg-gradient-to-br from-white via-gray-50/50 to-white overflow-hidden">
          {/* Subtle background patterns */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            {/* Premium Editorial Header */}
            <div className="mb-12">
              <div className="mb-8">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-700 bg-blue-50 px-4 py-2 rounded-full border-2 border-blue-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                    </span>
                    Breaking News
                  </div>
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight leading-tight">
                    Latest News & Updates
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl">
                    Stay informed with the latest medical notifications, exam
                    updates, and industry news
                  </p>
                </div>
              </div>
            </div>

            {/* News Cards - Job Cards Style with Equal Space */}
            {newsUpdates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  // Get all news (breaking + regular) - max 4 cards, all equal size
                  const allNews = newsUpdates.slice(0, 4);

                  const formatDate = (dateStr: string) => {
                    if (!dateStr) return "";
                    const d = new Date(dateStr);
                    if (Number.isNaN(d.getTime())) return dateStr;
                    return d.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                  };

                  const getIcon = (type: string) => {
                    const iconMap: Record<string, any> = {
                      GOVT: Landmark,
                      EXAM: GraduationCap,
                      PRIVATE: BriefcaseIcon,
                      DEADLINE: AlarmClock,
                      UPDATE: Sparkles,
                    };
                    return iconMap[type] || Sparkles;
                  };

                  return allNews.map((update, index) => {
                    const Icon = getIcon(update.type);
                    const isBreaking = update.breaking;

                    // Alternate between green and blue, but red for breaking
                    let borderColor,
                      badgeBg,
                      badgeText,
                      iconColor,
                      buttonBg,
                      headlineColor;

                    if (isBreaking) {
                      // Red for breaking
                      borderColor = "#ef4444";
                      badgeBg = "linear-gradient(to right, #dc2626, #b91c1c)";
                      badgeText = "Breaking";
                      iconColor = "#dc2626";
                      buttonBg = "linear-gradient(to right, #dc2626, #b91c1c)";
                      headlineColor = "#dc2626";
                    } else {
                      // Alternate green and blue
                      const isGreen = index % 2 === 0;
                      if (isGreen) {
                        borderColor = "#10b981";
                        badgeBg = "linear-gradient(to right, #10b981, #059669)";
                        badgeText =
                          update.type === "PRIVATE"
                            ? "Vacancies"
                            : update.type || "Update";
                        iconColor = "#10b981";
                        buttonBg =
                          "linear-gradient(to right, #10b981, #059669)";
                        headlineColor = "#059669";
                      } else {
                        borderColor = "#2563eb";
                        badgeBg = "linear-gradient(to right, #2563eb, #1d4ed8)";
                        badgeText =
                          update.type === "GOVT"
                            ? "Government"
                            : update.type || "Update";
                        iconColor = "#2563eb";
                        buttonBg =
                          "linear-gradient(to right, #2563eb, #1d4ed8)";
                        headlineColor = "#1d4ed8";
                      }
                    }

                    return (
                      <Card
                        key={update.id}
                        className="relative h-full cursor-pointer overflow-hidden rounded-2xl border-2 p-5 md:p-6 shadow-md transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl hover:shadow-xl focus-visible:-translate-y-2 focus-visible:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-200 group"
                        style={{
                          background: "#ffffff",
                          borderColor: borderColor,
                          boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
                        }}
                        onClick={() =>
                          update.fullStory
                            ? onNavigate(`news/${update.id}`)
                            : onNavigate("news")
                        }
                      >
                        <div className="relative flex h-full flex-col gap-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="!border-0 shadow-md hover:shadow-lg transition-all duration-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 rounded-md inline-flex text-white"
                                    style={{ background: badgeBg }}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    {badgeText}
                                  </span>
                                  {isBreaking && (
                                    <Badge className="bg-red-600 text-white border-0 px-3 py-1 text-xs font-semibold">
                                      BREAKING
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title={copiedNewsId === update.id ? "Link Copied!" : "Share News"}
                                  className={`h-8 w-8 rounded-full border shrink-0 transition-all ${
                                    copiedNewsId === update.id
                                      ? "text-green-600 bg-green-50 border-green-200 shadow-sm"
                                      : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-gray-200 shadow-sm"
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
                              <div className="flex items-center gap-3">
                                <h3
                                  className="text-lg md:text-xl font-bold group-hover:opacity-80 transition-opacity line-clamp-2"
                                  style={{ color: headlineColor }}
                                >
                                  {update.title}
                                </h3>
                              </div>
                            </div>
                          </div>

                          {/* Meta pills - Colorful */}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                            <span className="inline-flex items-center gap-2 bg-blue-100/90 border border-blue-200 text-blue-700 rounded-full px-3 py-1.5 shadow-sm hover:bg-blue-200 transition-colors">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              {formatDate(update.date)}
                            </span>
                            <span className="inline-flex items-center gap-2 bg-purple-100/90 border border-purple-200 text-purple-700 rounded-full px-3 py-1.5 shadow-sm hover:bg-purple-200 transition-colors">
                              <Icon className="w-4 h-4 text-purple-600" />
                              {update.type || "Update"}
                            </span>
                          </div>

                          {/* Description */}
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                              Stay informed with the latest medical updates,
                              policy changes, and critical notifications
                              affecting healthcare professionals.
                            </p>
                          </div>

                          {/* Footer */}
                          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 md:flex-row md:items-center md:justify-between">
                            <span className="text-xs text-gray-500">
                              Tap to read full story
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                title={copiedNewsId === update.id ? "Link Copied!" : "Share News"}
                                className={`h-8 w-8 p-0 rounded-full transition-colors ${
                                  copiedNewsId === update.id
                                    ? "text-green-600 bg-green-50"
                                    : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
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
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (update.fullStory) {
                                    onNavigate(`news/${update.id}`);
                                  } else {
                                    onNavigate("news");
                                  }
                                }}
                                className="inline-flex min-w-[140px] items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl transition-all"
                                style={{ background: buttonBg }}
                              >
                                View Full Story
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  });
                })()}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No News Updates Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Check back soon for the latest medical news and updates
                </p>
                <Button variant="outline" onClick={() => onNavigate("news")}>
                  View News Page
                </Button>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Why Choose Us - More Interactive */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl text-gray-900 mb-3">
              Why Choose MedExJob.com?
            </h2>
            <p className="text-gray-600">
              Your trusted partner in medical career advancement
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-blue-600">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300">
                <Shield className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                Verified Employers
              </h3>
              <p className="text-gray-600">
                All employers are verified to ensure authentic job postings
              </p>
            </Card>

            <Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-green-600">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-green-600 transition-all duration-300">
                <TrendingUp className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                Latest Opportunities
              </h3>
              <p className="text-gray-600">
                Get instant alerts for the latest government and private jobs
              </p>
            </Card>

            <Card className="p-8 text-center group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-t-4 border-t-purple-600">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-purple-600 transition-all duration-300">
                <Users className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                Direct Applications
              </h3>
              <p className="text-gray-600">
                Apply directly and track your application status in real-time
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section with Animation */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl mb-4 animate-fade-in-up">
            Ready to Start Your Medical Career?
          </h2>
          <p
            className="text-xl text-blue-100 mb-8 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            Join thousands of medical professionals who found their dream jobs
          </p>
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
            style={{ animationDelay: "0.4s" }}
          >
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              onClick={() => onNavigate("register")}
            >
              Register as Candidate
            </Button>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
              onClick={() => onNavigate("register")}
            >
              Register as Employer
            </Button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fade-in-left {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-fade-in-right {
          animation: fade-in-right 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-fade-in-left {
          animation: fade-in-left 0.6s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
