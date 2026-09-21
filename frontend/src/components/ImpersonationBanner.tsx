import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, ArrowLeft, Building2, Stethoscope, Shield } from 'lucide-react';

interface ImpersonationBannerProps {
  onNavigate?: (page: string) => void;
}

export function ImpersonationBanner({ onNavigate }: ImpersonationBannerProps) {
  const { user, isImpersonating, impersonatorAdmin, exitImpersonation } = useAuth();

  if (!isImpersonating || !user) return null;

  const roleLower = String(user.role || '').toLowerCase();
  const isCandidate = roleLower === 'candidate';
  const isEmployer = roleLower === 'employer';
  const roleLabel = isCandidate
    ? 'Doctor / Candidate'
    : isEmployer
    ? 'Healthcare HR / Employer'
    : 'Admin User';

  const handleExit = () => {
    exitImpersonation();
    const returnPage = localStorage.getItem('admin_return_page') || 'admin-users';
    if (onNavigate) {
      onNavigate(returnPage);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: '#fffbeb',
        borderBottom: '2px solid #f59e0b',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.18)',
      }}
      className="impersonation-active px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-sans"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-xs"
          style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
        >
          <Eye className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
            <span>Viewing as</span>
            <span className="underline decoration-amber-500 font-black">{user.name || user.email}</span>
          </span>
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1"
            style={{
              backgroundColor: isCandidate ? '#e0f2fe' : isEmployer ? '#ede9fe' : '#f1f5f9',
              color: isCandidate ? '#0369a1' : isEmployer ? '#4338ca' : '#334155',
              border: isCandidate ? '1px solid #bae6fd' : isEmployer ? '1px solid #ddd6fe' : '1px solid #cbd5e1',
            }}
          >
            {isCandidate ? <Stethoscope size={12} /> : isEmployer ? <Building2 size={12} /> : <Shield size={12} />}
            {roleLabel}
          </span>
          <span className="text-amber-800/80 font-mono text-xs hidden md:inline">
            ({user.email})
          </span>
          {impersonatorAdmin && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded text-amber-900 hidden lg:inline"
              style={{ backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}
            >
              Admin: <strong>{impersonatorAdmin.name || impersonatorAdmin.email}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold shadow-sm transition-all text-xs cursor-pointer hover:opacity-95"
          style={{
            backgroundColor: '#0f2942',
            color: '#ffffff',
            border: '1px solid #1e3a8a',
          }}
          title="Exit impersonation and return directly to Admin Directory"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit User View / Back to Admin</span>
        </button>
      </div>
    </div>
  );
}
