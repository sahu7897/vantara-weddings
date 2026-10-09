/**
 * City-grouped vendor sections for the category directories (§13.6).
 * Cities come from `public.cities` (launch order), so Banda leads; cities with
 * no approved vendors show an honest one-liner instead of fake cards.
 */
import VendorCard from '@/components/directory/VendorCard';
import type { CityRow, VendorRow } from '@/lib/supabase/types';

interface Props {
  cities: CityRow[];
  vendors: VendorRow[];
  thumbs: Record<string, string>;
  /** Slug of a city to render first / anchor to. */
  highlightCity?: string;
}

export default function VendorSections({ cities, vendors, thumbs, highlightCity }: Props) {
  const known = new Set(cities.map((city) => city.slug));
  const extras = [
    ...new Set(vendors.map((vendor) => vendor.city).filter((slug) => !known.has(slug))),
  ];
  const ordered = [
    ...cities.map((city) => ({ slug: city.slug, name: city.name })),
    ...extras.map((slug) => ({ slug, name: slug })),
  ];

  return (
    <div className="space-y-10">
      {ordered.map((city) => {
        const list = vendors.filter((vendor) => vendor.city === city.slug);
        if (list.length === 0 && vendors.length > 0) return null;
        return (
          <section key={city.slug} id={city.slug} className="scroll-mt-24">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="font-plus-jakarata-sans text-2xl font-extrabold text-black">
                {highlightCity === city.slug ? `In ${city.name}` : city.name}
              </h2>
              <span className="text-sm text-darkGrey">
                {list.length} {list.length === 1 ? 'vendor' : 'vendors'}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-lightGray bg-greyWhite px-5 py-6 text-sm text-secondary">
                No approved vendors here yet — add your enquiry below and we&apos;ll notify you as they
                join.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((vendor) => (
                  <VendorCard key={vendor.id} vendor={vendor} thumb={thumbs[vendor.id]} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
