import React from 'react';
import { Sparkles, FileText } from 'lucide-react';

interface RecruitmentViewSwitcherProps {
  viewMode: 'explorer' | 'standard';
  setViewMode: (mode: 'explorer' | 'standard') => void;
  totalVacancies?: number | string;
  specialtiesCount?: number | string;
}

export function RecruitmentViewSwitcher({
  viewMode,
  setViewMode,
  totalVacancies,
  specialtiesCount,
}: RecruitmentViewSwitcherProps) {
  const displayTotal = totalVacancies ?? 0;
  const displaySpecialties = specialtiesCount ?? 0;

  return (
    <div className="w-full bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">View Mode:</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('explorer')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'explorer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Department Explorer ({displaySpecialties})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Standard Notice View</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>{displayTotal} Total Vacancies</span>
          <span>•</span>
          <span>{displaySpecialties} Specialties</span>
        </div>
      </div>
    </div>
  );
}
