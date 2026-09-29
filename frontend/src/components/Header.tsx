import {
  BarChart3,
  Bell,
  Building2,
  User,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUnreadCount } from '../api/notifications';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isAuthenticated: boolean;
  userRole?: 'admin' | 'employer' | 'candidate' | string;
}

const publicNavItems = [
  { label: 'Home', page: 'home' },
  { label: 'All Jobs', page: 'jobs' },
  { label: 'Government Jobs', page: 'govt-jobs' },
  { label: 'Private Jobs', page: 'private-jobs' },
  { label: 'News', page: 'news' },
  { label: 'About', page: 'about' },
  { label: 'Post a Job', page: 'post-job' },
];

const mobileQuickCategories = [
  {
    label: 'Home',
    page: 'home',
    isActive: (page: string) => page === 'home' || page === '',
  },
  {
    label: 'Govt. Jobs',
    page: 'govt-jobs',
    isActive: (page: string) => page === 'govt-jobs',
  },
  {
    label: 'Private Jobs',
    page: 'private-jobs',
    isActive: (page: string) => page === 'private-jobs',
  },
  {
    label: 'All Jobs',
    page: 'jobs',
    isActive: (page: string) =>
      page === 'jobs' &&
      !window.location.search.includes('paramedical') &&
      !window.location.search.includes('nursing'),
  },
  {
    label: 'Paramedical',
    page: 'jobs?category=paramedical',
    isActive: (page: string) => page === 'jobs' && window.location.search.includes('paramedical'),
  },
  {
    label: 'Nursing',
    page: 'jobs?category=nursing',
    isActive: (page: string) => page === 'jobs' && window.location.search.includes('nursing'),
  },
];

export function Header({ currentPage, onNavigate, isAuthenticated }: HeaderProps) {
  const { user, logout, token, isImpersonating, exitImpersonation } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let intervalId: any = null;

    const fetchUnreadCount = async () => {
      if (isAuthenticated && user && token) {
        try {
          const count = await getUnreadCount(token);
          if (!isCancelled) {
            setUnreadCount(count);
          }
        } catch (error: any) {
          if (!isCancelled) {
            setUnreadCount(0);
          }
          // Stop hammering the server if unauthorized or token expired
          if (intervalId && error?.message?.includes('401')) {
            clearInterval(intervalId);
          }
        }
      } else {
        if (!isCancelled) {
          setUnreadCount(0);
        }
      }
    };

    fetchUnreadCount();
    intervalId = setInterval(fetchUnreadCount, 30000);
    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, user, token]);

  useEffect(() => { setMobileMenuOpen(false); }, [currentPage]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  const navigateAndClose = (page: string) => { setMobileMenuOpen(false); onNavigate(page); };
  const handleLogout = () => { setMobileMenuOpen(false); logout(); onNavigate('logout'); };
  const handleExitView = () => {
    setMobileMenuOpen(false);
    exitImpersonation();
    onNavigate(localStorage.getItem('admin_return_page') || 'admin-users');
  };

  return (
    <header className="medex-site-header w-full border-b bg-white">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          <div className="flex items-center cursor-pointer flex-shrink-0 px-1 sm:px-2 hover:opacity-95 transition-opacity" onClick={() => navigateAndClose('home')} aria-label="MedExJob Home">
            <h1 className="text-[19px] sm:text-[24px] md:text-[28px] lg:text-[30px] font-bold leading-none tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#2A3F6B' }}>MEDEX</span><span style={{ color: '#4299D4' }}>JOB</span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-2 md:gap-3 lg:gap-5 xl:gap-6 min-w-0">
            {publicNavItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`text-[13px] lg:text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === item.page
                    ? 'text-blue-600 font-semibold'
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <>
                    <Button variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9 sm:h-10 sm:w-10 text-blue-600 hover:bg-blue-50" onClick={() => onNavigate('admin-employer-insights')} title="Employer Insights" aria-label="Employer Insights">
                      <Building2 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9 sm:h-10 sm:w-10 text-violet-600 hover:bg-violet-50" onClick={() => onNavigate('admin-candidate-insights')} title="Candidate Insights" aria-label="Candidate Insights">
                      <BarChart3 className="w-5 h-5" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="relative hover:bg-blue-50/80 transition-all duration-200 h-9 w-9 sm:h-10 sm:w-10" onClick={() => onNavigate('notifications')} title="Notifications" aria-label="Notifications">
                  <Bell className="w-5 h-5 text-blue-600" />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold leading-none rounded-full border border-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onNavigate('dashboard')} title="Dashboard" aria-label="Dashboard" className="h-9 w-9 sm:h-10 sm:w-10"><User className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                {isImpersonating ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitView}
                    className="hidden sm:inline-flex text-amber-900 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border-amber-300 h-9 px-3 gap-1.5 font-bold cursor-pointer shadow-xs"
                    title="Exit view and return to admin"
                  >
                    <LogOut className="w-4 h-4 text-amber-700" />
                    <span className="hidden md:inline">Exit User View</span>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:inline-flex text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9 px-3 gap-1.5" title="Logout"><LogOut className="w-4 h-4" /><span className="hidden md:inline">Logout</span></Button>
                )}
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2"><Button variant="outline" onClick={() => onNavigate('login')} className="h-9 px-3 lg:px-4 text-sm">Login</Button><Button onClick={() => onNavigate('register')} className="bg-blue-600 hover:bg-blue-700 h-9 px-3 lg:px-4 text-sm">Register</Button></div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 sm:h-10 sm:w-10 text-slate-700 hover:text-blue-600"
              onClick={() => onNavigate('jobs')}
              title="Search Jobs"
              aria-label="Search Jobs"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="md:hidden h-9 w-9 sm:h-10 sm:w-10" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>
          </div>
        </div>
      </div>

      {/* Mobile Quick Category Navigation Bar (visible in mobile view only, non-admin pages) */}
      {!currentPage.startsWith('admin') && (
        <div className="md:hidden w-full border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar scroll-smooth">
            {mobileQuickCategories.map((cat) => {
              const active = cat.isActive(currentPage);
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => onNavigate(cat.page)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer font-medium ${
                    active
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  aria-label={cat.label}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <>
          <button className="medex-mobile-nav-overlay fixed inset-x-0 bottom-0 top-14 sm:top-16 bg-slate-950/35 z-[1001] md:hidden" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu" />
          <div className="medex-mobile-nav absolute left-0 right-0 top-full z-[1002] md:hidden bg-white border-t border-gray-100 shadow-xl max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <nav className="container mx-auto px-3 sm:px-4 py-3 grid grid-cols-1 gap-1">
              {publicNavItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => navigateAndClose(item.page)}
                  className={`w-full text-left rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    currentPage === item.page
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2 sm:hidden">
                {isAuthenticated ? (
                  <>
                    {user?.role === 'admin' && (
                      <>
                        <button onClick={() => navigateAndClose('admin-employer-insights')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50">Employer Insights</button>
                        <button onClick={() => navigateAndClose('admin-candidate-insights')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-violet-700 bg-violet-50">Candidate Insights</button>
                      </>
                    )}
                    <button onClick={() => navigateAndClose('dashboard')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Dashboard</button>
                    <button onClick={() => navigateAndClose('notifications')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Notifications{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}</button>
                    {isImpersonating ? (
                      <button onClick={handleExitView} className="w-full text-left rounded-lg px-4 py-3 text-sm font-bold text-amber-900 bg-amber-50 border border-amber-200 flex items-center justify-between">
                        <span>Exit User View (Back to Admin)</span>
                        <ArrowLeft className="w-4 h-4 text-amber-700" />
                      </button>
                    ) : (
                      <button onClick={handleLogout} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 px-1"><Button variant="outline" onClick={() => navigateAndClose('login')} className="w-full">Login</Button><Button onClick={() => navigateAndClose('register')} className="w-full bg-blue-600 hover:bg-blue-700">Register</Button></div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}