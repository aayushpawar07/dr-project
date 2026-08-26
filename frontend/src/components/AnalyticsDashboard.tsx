
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Briefcase, Eye, MousePointer, Calendar } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { fetchAnalyticsOverview, fetchJobsByCategory, fetchJobsByLocation, fetchTopJobs, fetchRecentActivity, fetchUserTrends, fetchVisitorStats } from '../api/analytics';

interface AnalyticsDashboardProps {
  userRole: 'admin' | 'employer';
  userId?: string;
}

// Data is fetched dynamically from backend analytics APIs

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function AnalyticsDashboard({ userRole, userId }: AnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState('views');
  const [overview, setOverview] = useState<{ 
    totalJobs: number; 
    totalApplications: number; 
    totalUsers: number; 
    totalEmployers: number;
    totalViews?: number;
    conversionRate?: number;
    avgResponseDays?: number;
    jobsGrowth?: number;
    appsGrowth?: number;
    usersGrowth?: number;
    employersGrowth?: number;
    totalVisitors?: number;
    todayVisitors?: number;
  } | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [topJobs, setTopJobs] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [userTrends, setUserTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [visitorStats, setVisitorStats] = useState<{ totalVisitors: number; todayVisitors: number }>({ totalVisitors: 0, todayVisitors: 0 });

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [ov, cats, locs, tops, activity, trends, visitors] = await Promise.all([
          fetchAnalyticsOverview(),
          fetchJobsByCategory(),
          fetchJobsByLocation(),
          fetchTopJobs(),
          fetchRecentActivity(),
          fetchUserTrends(),
          fetchVisitorStats().catch(() => ({ totalVisitors: 0, todayVisitors: 0 })),
        ]);
        setOverview(ov);
        setCategoryData(Array.isArray(cats) ? cats : []);
        setLocationData(Array.isArray(locs) ? locs : []);
        setTopJobs(Array.isArray(tops) ? tops : []);
        setRecentActivity(Array.isArray(activity) ? activity : []);
        setUserTrends(Array.isArray(trends) ? trends : []);
        // Prefer visitor counts from /overview if available (already fetched), else use /visitors
        if (ov?.totalVisitors !== undefined) {
          setVisitorStats({ totalVisitors: ov.totalVisitors ?? 0, todayVisitors: ov.todayVisitors ?? 0 });
        } else {
          setVisitorStats(visitors);
        }
      } catch (e) {
        setOverview({ totalJobs: 0, totalApplications: 0, totalUsers: 0, totalEmployers: 0, totalViews: 0, conversionRate: 0, avgResponseDays: 0, jobsGrowth: 0, appsGrowth: 0, usersGrowth: 0, employersGrowth: 0 });
        setCategoryData([]);
        setLocationData([]);
        setTopJobs([]);
        setRecentActivity([]);
        setUserTrends([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalJobs = isAdmin ? (overview?.totalJobs ?? 0) : undefined;
  const totalApplications = isAdmin ? (overview?.totalApplications ?? 0) : undefined;
  const totalUsers = isAdmin ? (overview?.totalUsers ?? 0) : undefined;
  const totalEmployers = isAdmin ? (overview?.totalEmployers ?? 0) : undefined;
  const totalViews = overview?.totalViews ?? 0;
  
  // Dynamic values from API
  const avgResponseDaysValue = overview?.avgResponseDays ?? 0;
  const avgResponseTime = avgResponseDaysValue > 0 ? `${avgResponseDaysValue} days` : 'N/A';
  const conversionRateValue = overview?.conversionRate ?? 0;
  const conversionRate = `${conversionRateValue}%`;
  
  // Dynamic growth percentages
  const jobsGrowth = overview?.jobsGrowth ?? 0;
  const appsGrowth = overview?.appsGrowth ?? 0;
  const usersGrowth = overview?.usersGrowth ?? 0;
  const employersGrowth = overview?.employersGrowth ?? 0;

  const topPerformingJobs = topJobs;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">
              {isAdmin ? 'Platform Analytics' : 'Job Performance Analytics'}
            </h1>
            <p className="text-gray-600">
              {isAdmin 
                ? 'Comprehensive insights into platform performance and user engagement'
                : 'Track your job postings performance and candidate engagement'
              }
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Jobs</p>
                <p className="text-3xl text-gray-900">{(totalJobs ?? 0).toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {jobsGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${jobsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {jobsGrowth >= 0 ? '+' : ''}{jobsGrowth}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Applications</p>
                <p className="text-3xl text-gray-900">{(totalApplications ?? 0).toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {appsGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${appsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {appsGrowth >= 0 ? '+' : ''}{appsGrowth}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          {isAdmin && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Users</p>
                    <p className="text-3xl text-gray-900">{(totalUsers ?? 0).toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      {usersGrowth >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {usersGrowth >= 0 ? '+' : ''}{usersGrowth}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Active Employers</p>
                    <p className="text-3xl text-gray-900">{(totalEmployers ?? 0)}</p>
                    <div className="flex items-center mt-1">
                      {employersGrowth >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${employersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {employersGrowth >= 0 ? '+' : ''}{employersGrowth}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>

              {/* Total Visitors */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Visitors</p>
                    <p className="text-3xl text-gray-900">{visitorStats.totalVisitors.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">All-time unique visitors</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <Eye className="w-6 h-6 text-teal-600" />
                  </div>
                </div>
              </Card>

              {/* Today's Visitors */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Today's Visitors</p>
                    <p className="text-3xl text-gray-900">{visitorStats.todayVisitors.toLocaleString()}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">Unique visitors today</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </Card>
            </>
          )}

          {!isAdmin && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Avg. Response Time</p>
                    <p className="text-3xl text-gray-900">{avgResponseTime}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">Based on processed applications</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
                    <p className="text-3xl text-gray-900">{conversionRate}</p>
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-gray-500">Applications / Views</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <MousePointer className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto">
              <TabsTrigger value="overview" className="whitespace-nowrap text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="jobs" className="whitespace-nowrap text-xs sm:text-sm">Jobs Performance</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap text-xs sm:text-sm">Users & Engagement</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Job Views & Applications Chart */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg text-gray-900">Job Views & Applications</h3>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">Views</SelectItem>
                      <SelectItem value="applications">Applications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  {/* Using jobs-by-location as dynamic series; X=location; Y=views/applications approximated */}
                  <LineChart data={locationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric === 'views' ? 'jobs' : 'applications'} 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Job Categories Distribution */}
              <Card className="p-6">
                <h3 className="text-lg text-gray-900 mb-6">Jobs by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Top Performing Jobs */}
            <Card className="p-6 mt-6">
              <h3 className="text-lg text-gray-900 mb-6">Top Performing Jobs</h3>
              <div className="space-y-4">
                {topPerformingJobs.map((job, index) => (
                  <div key={index} className="relative p-4 bg-gray-50 rounded-lg">
                    {/* Rank Badge - Top Right Corner */}
                    <Badge className="absolute top-2 right-2 bg-green-100 text-green-700 border-green-200 text-xs px-2 py-0.5">
                      #{index + 1}
                    </Badge>
                    <div className="pr-12">
                      <h4 className="text-gray-900 font-medium">{job.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {job.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {job.applications} applications
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {job.conversion}% conversion
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Jobs by Location */}
              <Card className="p-6">
                <h3 className="text-lg text-gray-900 mb-6">Jobs by Location</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={locationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="jobs" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Applications by Location */}
              <Card className="p-6">
                <h3 className="text-lg text-gray-900 mb-6">Applications by Location</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={locationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="location" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            {isAdmin ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg text-gray-900 mb-6">User Registration Trends (Last 7 Days)</h3>
                  {userTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} name="New Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No user registration data available</p>
                    </div>
                  )}
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg text-gray-900 mb-6">Recent Activity</h3>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            activity.type === 'job' ? 'bg-blue-500' :
                            activity.type === 'application' ? 'bg-green-500' :
                            activity.type === 'user' ? 'bg-purple-500' : 'bg-yellow-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{activity.action}</p>
                            <p className="text-xs text-gray-600 truncate">{activity.user}</p>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{activity.time}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent activity</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-6">
                <h3 className="text-lg text-gray-900 mb-6">Candidate Engagement</h3>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Candidate engagement analytics will be available here</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


