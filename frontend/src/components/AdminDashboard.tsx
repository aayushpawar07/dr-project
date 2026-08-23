// AI assisted development
import { BarChart, Briefcase, Users, Building2, Bell, Settings, Newspaper, DollarSign, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount, fetchNotifications } from '../api/notifications';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  // Fetch admin notifications
  useEffect(() => {
    const loadAdminNotifications = async () => {
      if (!token) return;

      try {
        // Fetch unread count
        const count = await getUnreadCount(token);
        setUnreadCount(count);

        // Fetch recent notifications
        const notificationsData = await fetchNotifications({ page: 0, size: 5 }, token);
        setRecentNotifications(notificationsData.content || []);
      } catch (error) {
        console.error('Error fetching admin notifications:', error);
      }
    };

    loadAdminNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadAdminNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);
  const adminCards = [
    {
      title: 'Manage Jobs',
      description: 'View, create, edit, and delete job postings.',
      icon: <Briefcase className="w-8 h-8 text-blue-600" />,
      action: () => onNavigate('admin-jobs'),
    },
    {
      title: 'AI Bulk Job Uploader',
      description: 'Extract large recruitment PDFs into reviewable, searchable vacancy records.',
      icon: <Sparkles className="w-8 h-8 text-blue-600" />,
      action: () => onNavigate('admin-ai-bulk-upload'),
    },
    {
      title: 'Manage Admins',
      description: 'Add, edit, and remove admin accounts.',
      icon: <Users className="w-8 h-8 text-green-600" />,
      action: () => onNavigate('admin-users'),
    },
    {
      title: 'Employer Verification',
      description: 'Review and approve employer verification requests.',
      icon: <Building2 className="w-8 h-8 text-purple-600" />,
      action: () => onNavigate('admin-employer-verification'), // Placeholder
    },
    {
      title: 'Manage Applications',
      description: 'Review and manage job applications from candidates.',
      icon: <Briefcase className="w-8 h-8 text-purple-600" />,
      action: () => onNavigate('admin-applications'),
    },
    {
      title: 'Site Analytics',
      description: 'Monitor platform performance and job statistics.',
      icon: <BarChart className="w-8 h-8 text-orange-600" />,
      action: () => onNavigate('analytics'),
    },
    {
      title: 'Manage News',
      description: 'Create, edit, and delete news updates and announcements.',
      icon: <Newspaper className="w-8 h-8 text-indigo-600" />,
      action: () => onNavigate('admin-news'),
    },
    {
      title: 'Pricing Management',
      description: 'Manage subscription plan pricing, discounts, and availability.',
      icon: <DollarSign className="w-8 h-8 text-emerald-600" />,
      action: () => onNavigate('admin-pricing'),
    },
    {
      title: 'Notifications & Alerts',
      description: 'Send global notifications or manage system alerts.',
      icon: <Bell className="w-8 h-8 text-red-600" />,
      action: () => onNavigate('notifications'),
    },
    {
      title: 'Settings',
      description: 'Configure platform-wide settings and parameters.',
      icon: <Settings className="w-8 h-8 text-gray-600" />,
      action: () => onNavigate('profile'), // Navigates to the admin's profile page
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome, Administrator! Manage your MedExJob.com platform here.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Notifications Badge */}
            <Button 
              variant="outline" 
              onClick={() => onNavigate('notifications')}
              className="relative hover:border-blue-300 transition-all duration-200 w-full justify-center"
            >
              <Bell className="w-5 h-5 mr-2 text-blue-600 stroke-[2] fill-none" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold leading-none rounded-full shadow-[0_2px_6px_rgba(239,68,68,0.4),0_1px_2px_rgba(0,0,0,0.1)] border border-red-600/20">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="outline" onClick={() => onNavigate('home')} className="w-full justify-center">
              Back to Home
            </Button>
          </div>
        </div>

        {/* Recent Notifications Section */}
        {recentNotifications.length > 0 && (
          <Card className="mb-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">{unreadCount} unread</Badge>
                )}
              </h2>
              <Button variant="link" onClick={() => onNavigate('notifications')}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentNotifications.slice(0, 3).map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-lg border ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCards.map((card, index) => (
            <Card key={index} className="p-6 flex flex-col items-start hover:shadow-lg transition-shadow duration-200">
              <div className="mb-4">{card.icon}</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h2>
              <p className="text-gray-600 mb-4 flex-grow">{card.description}</p>
              <Button onClick={card.action} className="mt-auto">
                Go to {card.title}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}