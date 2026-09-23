import React from 'react';
import { Sparkles, FileText } from 'lucide-react';

interface RecruitmentViewSwitcherProps {
  viewMode: 'explorer' | 'standard';
  setViewMode: (mode: 'explorer' | 'standard') => void;
  totalVacancies?: number | string;
  specialtiesCount?: number | string;
  selectedPosition?: string;
  onPositionChange?: (position: string) => void;
  availablePositions?: string[];
}

export function RecruitmentViewSwitcher({
  viewMode,
  setViewMode,
  totalVacancies,
  specialtiesCount,
  selectedPosition = 'All Positions',
  onPositionChange,
  availablePositions = [],
}: RecruitmentViewSwitcherProps) {
  const displayTotal = totalVacancies ?? 0;
  const displaySpecialties = specialtiesCount ?? 0;

  const positions = availablePositions && availablePositions.length > 0
    ? availablePositions
    : ['Professor', 'Associate Professor', 'Assistant Professor'];

  return (
    <div className="w-full bg-white border-b border-slate-200 px-3 sm:px-4 py-1.5 sm:py-2 shadow-xs">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">View:</span>
            <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('explorer')}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-[5px] text-[11px] sm:text-xs font-semibold transition-all ${
                  viewMode === 'explorer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span><span className="hidden sm:inline">Department </span>Explorer ({displaySpecialties})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('standard')}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-[5px] text-[11px] sm:text-xs font-semibold transition-all ${
                  viewMode === 'standard'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span><span className="hidden sm:inline">Standard </span>Notice View</span>
              </button>
            </div>
          </div>

          {onPositionChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Position:</span>
              <select
                value={selectedPosition}
                onChange={(e) => onPositionChange(e.target.value)}
                className="text-[11px] sm:text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
                aria-label="Filter by position or designation"
              >
                <option value="All Positions">All Positions</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-500 font-medium">
          <span>{displayTotal} Total Vacancies</span>
          <span>•</span>
          <span>{displaySpecialties} Specialties</span>
        </div>
      </div>
    </div>
  );
}
