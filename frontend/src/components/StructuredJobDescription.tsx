import { isOrganisationLabel, parseStructuredJobDescription } from '../utils/extractedFieldDisplay';
import { OrganisationHighlight } from './OrganisationHighlight';

export function StructuredJobDescription({ text }: { text: string }) {
  const sections = parseStructuredJobDescription(text);

  if (!sections.length) {
    return <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{text}</p>;
  }

  return (
    <div className="medex-structured-description space-y-5">
      {sections.map((section) => (
        <section key={`${section.key}-${section.label}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-800">{section.label}</h3>
          {section.rows.length > 0 && (
            <dl className="grid gap-2 sm:grid-cols-2">
              {section.rows.map((row) => (
                <div
                  key={`${section.key}-${row.label}-${row.value}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{row.label}</dt>
                  <dd className="mt-1 text-sm font-medium leading-6 text-slate-900">
                    {isOrganisationLabel(row.label) ? (
                      <OrganisationHighlight name={row.value} size="sm" />
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {section.paragraphs.length > 0 && (
            <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {section.paragraphs.map((paragraph) => (
                <p key={`${section.key}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
