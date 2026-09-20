import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, ArrowLeft, UserCheck, LayoutDashboard, User } from 'lucide-react';

interface ImpersonationBannerProps {
  onNavigate?: (page: string) => void;
}

export function ImpersonationBanner({ onNavigate }: ImpersonationBannerProps) {
  const { user, isImpersonating, impersonatorAdmin, exitImpersonation } = useAuth();

  if (!isImpersonating || !user) return null;

  const handleExit = () => {
    exitImpersonation();
    if (onNavigate) {
      onNavigate('dashboard/admin');
    }
  };

  const handleGoDashboard = () => {
    if (onNavigate) {
      if (user.role === 'employer') onNavigate('dashboard/employer');
      else if (user.role === 'candidate') onNavigate('dashboard/candidate');
      else onNavigate('dashboard');
    }
  };

  const handleGoProfile = () => {
    if (onNavigate) {
      onNavigate('profile');
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-white font-bold">
          <Eye className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="font-semibold">Admin View Mode:</span>{' '}
          <span className="opacity-90">
            Viewing as <strong className="underline underline-offset-2">{user.name}</strong> ({user.role.toUpperCase()} &bull; {user.email})
          </span>
          {impersonatorAdmin && (
            <span className="hidden md:inline ml-2 text-white/80 text-xs">
              [Admin: {impersonatorAdmin.name}]
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleGoDashboard}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white font-medium transition text-xs"
          title="Open this user's dashboard"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          onClick={handleGoProfile}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white font-medium transition text-xs"
          title="Open this user's profile"
        >
          <User className="h-3.5 w-3.5" />
          <span>Profile</span>
        </button>
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-white text-amber-900 font-bold hover:bg-amber-50 shadow-sm transition text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit View As</span>
        </button>
      </div>
    </div>
  );
}
