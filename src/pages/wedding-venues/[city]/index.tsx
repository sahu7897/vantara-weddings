/**
 * /wedding-venues/[city] — city venue listing (§13.6). ISR: city paths are
 * generated from `public.cities` at build, `fallback: 'blocking'` covers cities
 * added later (generated on first request, then cached).
 */
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import DirectoryLayout from '@/components/directory/DirectoryLayout';
import EmptyState from '@/components/directory/EmptyState';
import VenueCard from '@/components/directory/VenueCard';
import LeadForm from '@/components/leads/LeadForm';
import {
  fetchCities,
  fetchCity,
  fetchLocalities,
  fetchVenues,
  fetchVendorThumbs,
} from '@/services/publicData';
import type { VenueWithVendor } from '@/services/publicData';
import type { CityRow, LocalityRow } from '@/lib/supabase/types';

interface CityVenuesProps {
  city: CityRow;
  localities: LocalityRow[];
  venues: VenueWithVendor[];
  thumbs: Record<string, string>;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const cities = await fetchCities();
  return {
    paths: cities.map((city) => ({ params: { city: city.slug } })),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<CityVenuesProps, { city: string }> = async ({
  params,
}) => {
  const citySlug = params?.city;
  if (!citySlug || Array.isArray(citySlug)) return { notFound: true };
  const [city, localities, venues] = await Promise.all([
    fetchCity(citySlug),
    fetchLocalities(citySlug),
    fetchVenues({ city: citySlug }),
  ]);
  if (!city) return { notFound: true };
  const thumbs = await fetchVendorThumbs([...new Set(venues.map((v) => v.vendors.id))]);
  return { props: { city, localities, venues, thumbs }, revalidate: 600 };
};

export default function CityVenuesPage({
  city,
  localities,
  venues,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const title = `Wedding Venues in ${city.name} | ${site.name}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content={`Wedding venues in ${city.name}${city.state ? `, ${city.state}` : ''} — capacities, per-plate pricing and rentals from ${site.name}'s approved vendor network.`}
        />
        <link rel="canonical" href={`${site.url}/wedding-venues/${city.slug}`} />
      </Head>
      <DirectoryLayout
        title={`Wedding Venues in ${city.name}`}
        intro={`${venues.length} ${venues.length === 1 ? 'venue' : 'venues'} in ${city.name}${city.state ? `, ${city.state}` : ''}.`}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Wedding Venues', href: '/wedding-venues' },
          { label: city.name },
        ]}
      >
        {localities.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {localities.map((locality) => (
              <a
                key={locality.id}
                href={`/wedding-venues/${city.slug}/${locality.slug}`}
                className="rounded-xl border border-lightGray bg-white px-4 py-2 text-sm font-semibold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
              >
                {locality.name}
              </a>
            ))}
          </div>
        )}

        {venues.length === 0 ? (
          <EmptyState
            title={`No venues listed in ${city.name} yet`}
            detail="Venue partners are being onboarded — share your date and we'll reach out with options as they're approved."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                thumb={thumbs[venue.vendors.id]}
                href={`/wedding-venues/${city.slug}/venue/${venue.id}`}
              />
            ))}
          </div>
        )}

        <div className="mt-10">
          <LeadForm
            sourcePage={`/wedding-venues/${city.slug}`}
            city={city.name}
            service="Venue"
            heading={`Looking for a venue in ${city.name}?`}
          />
        </div>
      </DirectoryLayout>
    </>
  );
}
