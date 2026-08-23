import React from "react";

const categories = [
  { label: "Doctors", icon: "👨‍⚕️" },
  { label: "Dental", icon: "🦷" },
  { label: "AYUSH", icon: "🌿" },
  { label: "Nursing", icon: "👩‍⚕️" },
  { label: "Paramedical", icon: "🧪" },
  { label: "Allied Health", icon: "🦵" },
  { label: "Pharmacy", icon: "💊" },
  { label: "Hospital Administration", icon: "🏥" },
];

interface JobCategoryButtonsProps {
  onCategoryClick?: (category: string) => void;
}

export function JobCategoryButtons({
  onCategoryClick,
}: JobCategoryButtonsProps) {
  return (
    <div className="w-full mt-5">
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((cat) => (
          <button
            key={cat.label}
            onClick={() => onCategoryClick?.(cat.label)}
            className="
              flex items-center gap-2
              px-4 py-2
              rounded-lg
              bg-white/10
              border border-white/25
              text-white text-sm font-medium
              transition-all duration-200
              hover:bg-white/20
              hover:border-white/40
            "
            aria-label={cat.label}
          >
            <span className="text-sm">{cat.icon}</span>
            <span className="whitespace-nowrap">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default JobCategoryButtons;
