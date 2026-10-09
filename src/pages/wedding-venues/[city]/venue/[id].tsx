/**
 * /wedding-venues/[city]/venue/[id] — venue detail (§13.6). ISR with
 * `fallback: 'blocking'` so admin-created venues appear on first request.
 * Guard rails: the id must be a uuid and the venue's vendor must live in the
 * [city] segment (canonical URL discipline → otherwise 404).
 */
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import DirectoryLayout from '@/components/directory/DirectoryLayout';
import EmptyState from '@/components/directory/EmptyState';
import VenueCard from '@/components/directory/VenueCard';
import LeadForm from '@/components/leads/LeadForm';
import { fetchCity, fetchVenue, fetchVenues, fetchVendorThumbs } from '@/services/publicData';
import type { VenueWithVendor } from '@/services/publicData';
import type { CityRow } from '@/lib/supabase/types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VenueDetailProps {
  city: CityRow;
  venue: VenueWithVendor;
  similar: VenueWithVendor[];
  thumbs: Record<string, string>;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const venues = await fetchVenues();
  return {
    paths: venues.map((venue) => ({
      params: { city: venue.vendors.city, id: venue.id },
    })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<VenueDetailProps, { city: string; id: string }> =
  async ({ params }) => {
    const citySlug = params?.city;
    const venueId = params?.id;
    if (!citySlug || Array.isArray(citySlug) || !venueId || Array.isArray(venueId)) {
      return { notFound: true };
    }
    if (!UUID_RE.test(venueId)) return { notFound: true };

    const [city, venue] = await Promise.all([fetchCity(citySlug), fetchVenue(venueId)]);
    if (!city || !venue || venue.vendors.city !== citySlug) return { notFound: true };

    const allInCity = await fetchVenues({ city: citySlug });
    const similar = allInCity.filter((row) => row.id !== venue.id).slice(0, 3);
    const thumbIds = [...new Set([venue, ...similar].map((row) => row.vendors.id))];
    const thumbs = await fetchVendorThumbs(thumbIds);
    return { props: { city, venue, similar, thumbs }, revalidate: 600 };
  };

const chip = 'rounded-lg bg-lightPink px-2.5 py-1.5 text-sm font-semibold text-appThemeNew';

export default function VenueDetailPage({
  city,
  venue,
  similar,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const vendor = venue.vendors;
  const title = `${vendor.business_name} — Wedding Venue in ${city.name} | ${site.name}`;
  const mapsHref =
    venue.lat != null && venue.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`
      : null;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content={`${vendor.business_name} in ${city.name} — capacity, pricing and details, from ${site.name}'s approved vendor network.`}
        />
        <link
          rel="canonical"
          href={`${site.url}/wedding-venues/${city.slug}/venue/${venue.id}`}
        />
      </Head>
      <DirectoryLayout
        title={vendor.business_name}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Wedding Venues', href: '/wedding-venues' },
          { label: city.name, href: `/wedding-venues/${city.slug}` },
          { label: vendor.business_name },
        ]}
      >
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            {thumbs[vendor.id] ? (
              <img
                src={thumbs[vendor.id]}
                alt={vendor.business_name}
                className="h-72 w-full rounded-2xl border border-lightGray object-cover lg:h-96"
              />
            ) : (
              <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-lightGray bg-lightPink text-sm font-semibold uppercase tracking-wide text-darkGrey lg:h-96">
                Photo coming soon
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {venue.capacity_max != null && (
                <span className={chip}>
                  {venue.capacity_min != null
                    ? `${venue.capacity_min}–${venue.capacity_max} guests`
                    : `Up to ${venue.capacity_max} guests`}
                </span>
              )}
              {venue.price_per_plate_veg != null && (
                <span className={chip}>
                  Veg ₹{Number(venue.price_per_plate_veg).toLocaleString('en-IN')} per plate
                </span>
              )}
              {venue.price_per_plate_nonveg != null && (
                <span className={chip}>
                  Non-veg ₹{Number(venue.price_per_plate_nonveg).toLocaleString('en-IN')} per plate
                </span>
              )}
              {venue.rental_price != null && (
                <span className={chip}>
                  Rental ₹{Number(venue.rental_price).toLocaleString('en-IN')}
                </span>
              )}
              {venue.indoor_outdoor && (
                <span className={chip}>
                  {venue.indoor_outdoor === 'both'
                    ? 'Indoor + outdoor'
                    : venue.indoor_outdoor === 'indoor'
                      ? 'Indoor'
                      : 'Outdoor'}
                </span>
              )}
            </div>

            {venue.address && (
              <div className="rounded-2xl border border-lightGray bg-white p-5">
                <h2 className="font-plus-jakarata-sans text-lg font-bold text-black">Address</h2>
                <p className="mt-1 text-sm text-secondary">{venue.address}</p>
                {mapsHref && (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-appTheme hover:underline"
                  >
                    View on map →
                  </a>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-lightGray bg-white p-5">
              <h2 className="font-plus-jakarata-sans text-lg font-bold text-black">
                About {vendor.business_name}
              </h2>
              <p className="mt-1 text-sm text-secondary">
                {vendor.description ?? 'Details will be added soon — enquire below for availability.'}
              </p>
              <p className="mt-2 text-sm text-darkGrey">
                Listed in {[vendor.locality, city.name].filter(Boolean).join(', ')}
                {vendor.price_min != null && vendor.price_max != null && (
                  <>
                    {' · '}
                    Budget range ₹{Number(vendor.price_min).toLocaleString('en-IN')}–
                    {Number(vendor.price_max).toLocaleString('en-IN')}
                  </>
                )}
              </p>
            </div>
          </div>

          <div>
            <LeadForm
              sourcePage={`/wedding-venues/${city.slug}/venue/${venue.id}`}
              city={city.name}
              service="Venue"
              heading={`Check availability — ${vendor.business_name}`}
            />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="mb-4 font-plus-jakarata-sans text-2xl font-extrabold text-black">
            More venues in {city.name}
          </h2>
          {similar.length === 0 ? (
            <EmptyState
              title="No other venues here yet"
              detail={`We're onboarding more venue partners in ${city.name} — check the full directory soon.`}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((row) => (
                <VenueCard
                  key={row.id}
                  venue={row}
                  thumb={thumbs[row.vendors.id]}
                  href={`/wedding-venues/${city.slug}/venue/${row.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </DirectoryLayout>
    </>
  );
}
