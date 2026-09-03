import { Card } from './ui/card';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { BriefcaseBusiness, Building2, MapPin, SlidersHorizontal } from 'lucide-react';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
  locations: string[];
  specialities?: string[];
  departments?: string[];
  jobTypes?: string[];
  qualifications?: string[];
  states?: string[];
  cities?: string[];
  value?: FilterOptions;
  showSector?: boolean;
}

export interface FilterOptions {
  categories: string[];
  locations: string[];
  featured: boolean;
  sector?: 'government' | 'private' | '';
  speciality?: string;
  department?: string;
  jobType?: string;
  qualification?: string;
  state?: string;
  city?: string;
}

export const emptyJobFilters = (): FilterOptions => ({
  categories: [],
  locations: [],
  featured: false,
  sector: '',
  speciality: '',
  department: '',
  jobType: '',
  qualification: '',
  state: '',
  city: '',
});

const INDIAN_STATES_AND_UTS = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

const STATE_NAME_BY_NORMALIZED = new Map(INDIAN_STATES_AND_UTS.map((state) => [state.toLowerCase(), state]));

function validStates(values: string[]) {
  const result = new Map<string, string>();
  values.forEach((value) => {
    const normalized = value?.trim().toLowerCase();
    const canonical = normalized ? STATE_NAME_BY_NORMALIZED.get(normalized) : undefined;
    if (canonical) result.set(normalized!, canonical);
  });
  return [...result.values()].sort();
}

function validCities(values: string[]) {
  const result = new Map<string, string>();
  values.forEach((value) => {
    const text = value?.trim();
    const normalized = text?.toLowerCase();
    if (normalized && !STATE_NAME_BY_NORMALIZED.has(normalized)) result.set(normalized, text);
  });
  return [...result.values()].sort();
}

export function FilterSidebar({
  onFilterChange,
  categories,
  locations,
  specialities = [],
  departments = [],
  jobTypes = [],
  qualifications = [],
  states = [],
  cities = [],
  value,
  showSector = true,
}: FilterSidebarProps) {
  const filters = value || emptyJobFilters();
  const stateOptions = validStates(states);
  const cityOptions = validCities(cities);
  const citiesForState = filters.state
    ? cityOptions.filter((city) => locations.some((loc) => loc.toLowerCase().includes(city.toLowerCase()) && loc.toLowerCase().includes(filters.state!.toLowerCase())))
    : cityOptions;

  const emit = (next: FilterOptions) => onFilterChange(next);
  const toggleArray = (field: 'categories' | 'locations', item: string, checked: boolean) => {
    const current = filters[field];
    emit({ ...filters, [field]: checked ? [...current, item] : current.filter((value) => value !== item) });
  };

  return (
    <Card className="sticky top-20 overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-700" onClick={() => emit(emptyJobFilters())}>Clear all</Button>
      </div>

      <div className="space-y-5 p-5">
        {showSector && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <Label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><Building2 className="h-4 w-4 text-blue-600" />Job Sector</Label>
            <select
              className="h-10 w-full rounded-md border border-blue-200 bg-white px-3 text-sm"
              value={filters.sector || ''}
              onChange={(e) => emit({ ...filters, sector: e.target.value as FilterOptions['sector'] })}
            >
              <option value="">Government & Private</option>
              <option value="government">Government Jobs</option>
              <option value="private">Private Jobs</option>
            </select>
          </div>
        )}

        <div className="grid gap-4">
          <SelectBlock label="State" icon={MapPin} value={filters.state || ''} options={stateOptions} onChange={(state) => emit({ ...filters, state, city: '', locations: [] })} />
          <SelectBlock label="City" value={filters.city || ''} options={citiesForState} onChange={(city) => emit({ ...filters, city, locations: [] })} />
          <SelectBlock label="Speciality" value={filters.speciality || ''} options={specialities} onChange={(speciality) => emit({ ...filters, speciality })} />
          <SelectBlock label="Department" value={filters.department || ''} options={departments} onChange={(department) => emit({ ...filters, department })} />
          <SelectBlock label="Employment Type" value={filters.jobType || ''} options={jobTypes} onChange={(jobType) => emit({ ...filters, jobType })} />
          <SelectBlock label="Qualification" value={filters.qualification || ''} options={qualifications} onChange={(qualification) => emit({ ...filters, qualification })} />
        </div>

        <Separator />

        {categories.length > 0 && (
          <div>
            <Label className="mb-3 flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="h-4 w-4 text-violet-600" />Job Role</Label>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {categories.map((category) => (
                <label key={category} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={filters.categories.includes(category)} onCheckedChange={(checked) => toggleArray('categories', category, !!checked)} />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {locations.length > 0 && (
          <>
            <Separator />
            <div>
              <Label className="mb-3 block text-sm font-semibold">Location</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {locations.map((location) => (
                  <label key={location} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <Checkbox checked={filters.locations.includes(location)} onCheckedChange={(checked) => toggleArray('locations', location, !!checked)} />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={filters.featured} onCheckedChange={(checked) => emit({ ...filters, featured: !!checked })} />
          Featured jobs only
        </label>
      </div>
    </Card>
  );
}

function SelectBlock({ label, value, options, onChange, icon: Icon }: { label: string; value: string; options: string[]; onChange: (value: string) => void; icon?: any }) {
  if (!options.length) return null;
  return (
    <div>
      <Label className="mb-2 flex items-center gap-2 text-sm font-medium">{Icon && <Icon className="h-4 w-4 text-slate-500" />}{label}</Label>
      <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {label}s</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
