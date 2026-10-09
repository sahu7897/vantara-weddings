/**
 * Vendor listing card for the category directories (decorators, photographers,
 * §13.6). Non-venue vendors have no public detail page yet (Stage 5 adds the
 * vendor panel first), so the CTA anchors to the on-page enquiry form instead
 * of a route that would 404.
 */
import type { VendorRow } from '@/lib/supabase/types';

interface Props {
  vendor: VendorRow;
  thumb?: string;
  /** Hash target of the LeadForm on the same page (default #lead-form). */
  enquireHref?: string;
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const CATEGORY_LABEL: Record<string, string> = {
  venue: 'Venue',
  decor: 'Decoration',
  photography: 'Photography',
  catering: 'Catering',
  makeup: 'Makeup',
  dj: 'DJ / Sound',
  other: 'Other',
};

export default function VendorCard({ vendor, thumb, enquireHref = '#lead-form' }: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-lightGray bg-white transition-shadow hover:shadow-[0px_4px_16px_0px_rgba(0,0,0,0.10)]">
      {thumb ? (
        <img
          src={thumb}
          alt={vendor.business_name}
          loading="lazy"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-lightPink text-xs font-semibold uppercase tracking-wide text-darkGrey">
          Photo coming soon
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="w-fit rounded-lg bg-lightPink px-2 py-1 text-xs font-semibold text-appThemeNew">
          {CATEGORY_LABEL[vendor.category] ?? vendor.category}
        </span>
        <p className="font-plus-jakarata-sans font-bold text-black">{vendor.business_name}</p>
        <p className="text-sm text-secondary">
          {[vendor.locality, vendor.city].filter(Boolean).join(', ')}
        </p>
        {vendor.description && (
          <p className="mt-1 line-clamp-2 text-sm text-textDescription">{vendor.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-semibold text-primaryTextColor">
            {vendor.price_min != null && vendor.price_max != null
              ? `${inr.format(Number(vendor.price_min))} – ${inr.format(Number(vendor.price_max))}`
              : 'Pricing on request'}
          </span>
          <a
            href={enquireHref}
            className="rounded-xl bg-appTheme px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-95"
          >
            Enquire
          </a>
        </div>
      </div>
    </div>
  );
}
