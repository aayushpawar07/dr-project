// AI assisted development
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
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
  { label: 'Pricing', page: 'pricing' },
];

export function Header({ currentPage, onNavigate, isAuthenticated }: HeaderProps) {
  const { user, logout, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (isAuthenticated && user && token) {
        try {
          const count = await getUnreadCount(token);
          setUnreadCount(count);
        } catch (error) {
          console.error('Error fetching unread count:', error);
          setUnreadCount(0);
        }
      } else {
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, token]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  const navigateAndClose = (page: string) => {
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    onNavigate('logout');
  };

  return (
    <header className="medex-site-header sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
          <div
            className="flex items-center cursor-pointer flex-shrink-0 px-1 sm:px-2 hover:opacity-95 transition-opacity"
            onClick={() => navigateAndClose('home')}
            aria-label="MedExJob Home"
          >
            <h1
              className="text-[19px] sm:text-[24px] md:text-[28px] lg:text-[30px] font-bold leading-none tracking-tight"
              style={{
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                letterSpacing: '-0.02em'
              }}
            >
              <span style={{ color: '#2A3F6B' }}>MEDEX</span>
              <span style={{ color: '#4299D4' }}>JOB</span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-3 lg:gap-5 xl:gap-6 min-w-0">
            {publicNavItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`text-[13px] lg:text-sm font-medium transition-colors whitespace-nowrap ${
                  currentPage === item.page ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-blue-50/80 transition-all duration-200 h-9 w-9 sm:h-10 sm:w-10"
                  onClick={() => onNavigate('notifications')}
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-blue-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold leading-none rounded-full border border-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate('dashboard')}
                  title="Dashboard"
                  aria-label="Dashboard"
                  className="h-9 w-9 sm:h-10 sm:w-10"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-9 px-3 gap-1.5"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="outline" onClick={() => onNavigate('login')} className="h-9 px-3 lg:px-4 text-sm">
                  Login
                </Button>
                <Button onClick={() => onNavigate('register')} className="bg-blue-600 hover:bg-blue-700 h-9 px-3 lg:px-4 text-sm">
                  Register
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <>
          <button
            className="medex-mobile-nav-overlay fixed inset-x-0 bottom-0 top-14 sm:top-16 bg-slate-950/35 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
          <div className="medex-mobile-nav absolute left-0 right-0 top-full md:hidden bg-white border-t border-gray-100 shadow-xl max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <nav className="container mx-auto px-3 sm:px-4 py-3 grid grid-cols-1 gap-1">
              {publicNavItems.map((item) => (
                <button
                  key={item.page}
                  onClick={() => navigateAndClose(item.page)}
                  className={`w-full text-left rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    currentPage === item.page
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2 sm:hidden">
                {isAuthenticated ? (
                  <>
                    <button onClick={() => navigateAndClose('dashboard')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Dashboard
                    </button>
                    <button onClick={() => navigateAndClose('notifications')} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Notifications{unreadCount > 0 ? ` (${unreadCount > 99 ? '99+' : unreadCount})` : ''}
                    </button>
                    <button onClick={handleLogout} className="w-full text-left rounded-lg px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50">
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 px-1">
                    <Button variant="outline" onClick={() => navigateAndClose('login')} className="w-full">Login</Button>
                    <Button onClick={() => navigateAndClose('register')} className="w-full bg-blue-600 hover:bg-blue-700">Register</Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
