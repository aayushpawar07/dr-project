type OrganisationHighlightProps = {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'px-2 py-0.5 text-sm',
  md: 'px-2.5 py-0.5 text-base',
  lg: 'px-2.5 py-0.5 text-lg',
};

export function OrganisationHighlight({ name, size = 'md', className = '' }: OrganisationHighlightProps) {
  const value = String(name ?? '').trim();
  if (!value) return null;

  return (
    <span
      className={`inline-block max-w-full truncate rounded-md bg-amber-100 font-semibold text-amber-900 ${SIZE_CLASS[size]} ${className}`.trim()}
    >
      {value}
    </span>
  );
}
