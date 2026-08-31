import { useState } from 'react';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

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
}

export interface FilterOptions {
  categories: string[];
  locations: string[];
  featured: boolean;
  speciality?: string;
  department?: string;
  jobType?: string;
  qualification?: string;
  state?: string;
  city?: string;
}

const emptyFilters = (): FilterOptions => ({
  categories: [],
  locations: [],
  featured: false,
  speciality: '',
  department: '',
  jobType: '',
  qualification: '',
  state: '',
  city: '',
});

const INDIAN_STATES_AND_UTS = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

const STATE_NAME_BY_NORMALIZED = new Map(
  INDIAN_STATES_AND_UTS.map((state) => [state.toLowerCase(), state]),
);

function getValidJobStates(states: string[]) {
  const uniqueStates = new Map<string, string>();

  states.forEach((state) => {
    const normalized = state?.trim().toLowerCase();
    if (!normalized) return;

    const canonicalState = STATE_NAME_BY_NORMALIZED.get(normalized);
    if (canonicalState) {
      uniqueStates.set(normalized, canonicalState);
    }
  });

  return Array.from(uniqueStates.values()).sort((a, b) => a.localeCompare(b));
}

function getValidJobCities(cities: string[]) {
  const uniqueCities = new Map<string, string>();

  cities.forEach((city) => {
    const trimmedCity = city?.trim();
    const normalized = trimmedCity?.toLowerCase();
    if (!normalized) return;

    // City metadata remains dynamic from available jobs, but state/UT names
    // are excluded so they cannot accidentally appear in the City dropdown.
    if (!STATE_NAME_BY_NORMALIZED.has(normalized)) {
      uniqueCities.set(normalized, trimmedCity);
    }
  });

  return Array.from(uniqueCities.values()).sort((a, b) => a.localeCompare(b));
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
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterOptions>(emptyFilters());
  const validStates = getValidJobStates(states);
  const validCities = getValidJobCities(cities);

  const emit = (next: FilterOptions) => {
    setFilters(next);
    onFilterChange(next);
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    emit({ ...filters, categories: newCategories });
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    const newLocations = checked
      ? [...filters.locations, location]
      : filters.locations.filter(l => l !== location);
    emit({ ...filters, locations: newLocations });
  };

  const citiesForState = filters.state
    ? validCities.filter((city) => {
        const match = locations.find((loc) => loc.toLowerCase().includes(city.toLowerCase()) && loc.toLowerCase().includes(filters.state!.toLowerCase()));
        return Boolean(match);
      })
    : validCities;

  return (
    <Card className="p-6 sticky top-20">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Filters</h3>
          <Button variant="ghost" size="sm" onClick={() => emit(emptyFilters())}>
            Clear All
          </Button>
        </div>

        <Separator />

        <SelectBlock label="State" value={filters.state || ''} options={validStates} onChange={(state) => emit({ ...filters, state, city: '' })} />
        <SelectBlock label="City" value={filters.city || ''} options={citiesForState} onChange={(city) => emit({ ...filters, city })} />
        <SelectBlock label="Speciality" value={filters.speciality || ''} options={specialities} onChange={(speciality) => emit({ ...filters, speciality })} />
        <SelectBlock label="Department" value={filters.department || ''} options={departments} onChange={(department) => emit({ ...filters, department })} />
        <SelectBlock label="Job Type" value={filters.jobType || ''} options={jobTypes} onChange={(jobType) => emit({ ...filters, jobType })} />
        <SelectBlock label="Qualification" value={filters.qualification || ''} options={qualifications} onChange={(qualification) => emit({ ...filters, qualification })} />

        <Separator />

        <div>
          <Label className="mb-3 block">Job Category</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={category}
                  checked={filters.categories.includes(category)}
                  onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
                />
                <label htmlFor={category} className="text-sm cursor-pointer">{category}</label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label className="mb-3 block">Location</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {locations.map((location) => (
              <div key={location} className="flex items-center space-x-2">
                <Checkbox
                  id={location}
                  checked={filters.locations.includes(location)}
                  onCheckedChange={(checked) => handleLocationChange(location, !!checked)}
                />
                <label htmlFor={location} className="text-sm cursor-pointer">{location}</label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={filters.featured}
              onCheckedChange={(checked) => emit({ ...filters, featured: !!checked })}
            />
            <label htmlFor="featured" className="text-sm cursor-pointer">Featured Jobs Only</label>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SelectBlock({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  if (!options.length) return null;
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <select className="w-full h-10 border rounded-md px-3 bg-white text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All {label}s</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
