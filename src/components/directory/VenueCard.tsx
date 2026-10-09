/**
 * Venue listing card (§13.6). Renders a real `venues` row joined with its
 * approved vendor; `thumb` is the vendor's first media image when one exists
 * (honest placeholder otherwise — no fake stock imagery).
 */
import type { VenueWithVendor } from '@/services/publicData';

interface Props {
  venue: VenueWithVendor;
  href: string;
  thumb?: string;
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function VenueCard({ venue, href, thumb }: Props) {
  const vendor = venue.vendors;
  const capacity =
    venue.capacity_max != null
      ? venue.capacity_min != null
        ? `${venue.capacity_min}–${venue.capacity_max} guests`
        : `up to ${venue.capacity_max} guests`
      : null;

  return (
    <a
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-lightGray bg-white transition-shadow hover:shadow-[0px_4px_16px_0px_rgba(0,0,0,0.10)]"
    >
      {thumb ? (
        // Public-read bucket (§13.5) — plain <img>: images.unoptimized is set.
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
        <p className="font-plus-jakarata-sans font-bold text-black group-hover:text-appThemeNew">
          {vendor.business_name}
        </p>
        <p className="text-sm text-secondary">
          {[venue.address ?? vendor.locality, vendor.city].filter(Boolean).join(', ')}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {capacity && (
            <span className="rounded-lg bg-lightPink px-2 py-1 text-xs font-semibold text-appThemeNew">
              {capacity}
            </span>
          )}
          {venue.price_per_plate_veg != null && (
            <span className="rounded-lg bg-lightPink px-2 py-1 text-xs font-semibold text-appThemeNew">
              {inr.format(Number(venue.price_per_plate_veg))}/plate (veg)
            </span>
          )}
          {venue.rental_price != null && (
            <span className="rounded-lg bg-lightPink px-2 py-1 text-xs font-semibold text-appThemeNew">
              {inr.format(Number(venue.rental_price))} rental
            </span>
          )}
          {venue.indoor_outdoor && (
            <span className="rounded-lg bg-lighterGray px-2 py-1 text-xs font-semibold text-filterTextColor">
              {venue.indoor_outdoor === 'both' ? 'Indoor + outdoor' : venue.indoor_outdoor}
            </span>
          )}
        </div>
        <span className="mt-3 text-sm font-bold text-appTheme">View details →</span>
      </div>
    </a>
  );
}
