/**
 * HAND-EXTENSION (Phase 5 §13.6): featured listings on the homepage — the one
 * data-driven section on an otherwise capture-faithful page. Reads from
 * getStaticProps (ISR, see src/pages/index.tsx) and renders NOTHING when
 * Supabase has no approved rows, rather than fake cards.
 */
import VenueCard from '@/components/directory/VenueCard';
import VendorCard from '@/components/directory/VendorCard';
import type { VendorRow } from '@/lib/supabase/types';
import type { VenueWithVendor } from '@/services/publicData';

interface Props {
  venues: VenueWithVendor[];
  vendors: VendorRow[];
  thumbs: Record<string, string>;
}

export default function SectionFeaturedListings({ venues, vendors, thumbs }: Props) {
  if (venues.length === 0 && vendors.length === 0) return null;

  return (
    <section className="bg-white py-12 lg:py-16" id="featured_listings_section">
      <div className="mx-auto max-w-7xl px-5">
        <p className="text-sm font-bold uppercase tracking-wide text-appTheme">Live on Vantara</p>
        <h2 className="mt-1 font-playfair text-3xl font-bold text-black lg:text-5xl">
          Featured venues &amp; vendors
        </h2>
        <p className="mt-2 max-w-2xl text-base text-secondary">
          Straight from our approved network — capacities, pricing and teams you can enquire with
          right away.
        </p>

        {venues.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                thumb={thumbs[venue.vendors.id]}
                href={`/wedding-venues/${venue.vendors.city}/venue/${venue.id}`}
              />
            ))}
          </div>
        )}

        {vendors.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                thumb={thumbs[vendor.id]}
                // No lead form lives on the homepage — send enquiries to the
                // vendor's category directory (or contact) where one does.
                enquireHref={
                  vendor.category === 'decor'
                    ? '/wedding-decorators'
                    : vendor.category === 'photography'
                      ? '/wedding-photographers'
                      : '/contact-us'
                }
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/wedding-venues"
            className="rounded-xl bg-appTheme px-5 py-3 text-sm font-bold text-white transition hover:brightness-95"
          >
            Browse all venues
          </a>
          <a
            href="/wedding-decorators"
            className="rounded-xl border border-lightGray px-5 py-3 text-sm font-bold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
          >
            Decorators
          </a>
          <a
            href="/wedding-photographers"
            className="rounded-xl border border-lightGray px-5 py-3 text-sm font-bold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
          >
            Photographers
          </a>
        </div>
      </div>
    </section>
  );
}
