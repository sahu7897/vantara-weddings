/**
 * /wedding-venues/[city]/[slug] — locality listing (§13.6). `slug` is a
 * `public.localities.slug`; anything else 404s (venue details live under
 * /wedding-venues/[city]/venue/[id], so the static `venue` segment can never
 * collide with this dynamic one).
 *
 * Matching note: `vendors.locality` is free text, so listings match it
 * against the locality's NAME (see fetchVenues) — keep vendor admin edits in
 * step with locality names.
 */
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import DirectoryLayout from '@/components/directory/DirectoryLayout';
import EmptyState from '@/components/directory/EmptyState';
import VenueCard from '@/components/directory/VenueCard';
import LeadForm from '@/components/leads/LeadForm';
import {
  fetchCity,
  fetchCities,
  fetchLocalities,
  fetchLocality,
  fetchVenues,
  fetchVendorThumbs,
} from '@/services/publicData';
import type { VenueWithVendor } from '@/services/publicData';
import type { CityRow, LocalityRow } from '@/lib/supabase/types';

interface LocalityVenuesProps {
  city: CityRow;
  locality: LocalityRow;
  venues: VenueWithVendor[];
  thumbs: Record<string, string>;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const cities = await fetchCities();
  const groups = await Promise.all(cities.map((city) => fetchLocalities(city.slug)));
  return {
    paths: cities.flatMap((city, index) =>
      groups[index].map((locality) => ({
        params: { city: city.slug, slug: locality.slug },
      })),
    ),
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<
  LocalityVenuesProps,
  { city: string; slug: string }
> = async ({ params }) => {
  const citySlug = params?.city;
  const localitySlug = params?.slug;
  if (!citySlug || Array.isArray(citySlug) || !localitySlug || Array.isArray(localitySlug)) {
    return { notFound: true };
  }
  const [city, locality] = await Promise.all([
    fetchCity(citySlug),
    fetchLocality(citySlug, localitySlug),
  ]);
  if (!city || !locality) return { notFound: true };
  const venues = await fetchVenues({ city: citySlug, localityName: locality.name });
  const thumbs = await fetchVendorThumbs([...new Set(venues.map((v) => v.vendors.id))]);
  return { props: { city, locality, venues, thumbs }, revalidate: 600 };
};

export default function LocalityVenuesPage({
  city,
  locality,
  venues,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const title = `Wedding Venues in ${locality.name}, ${city.name} | ${site.name}`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content={`Wedding venues in ${locality.name}, ${city.name} — capacities, per-plate pricing and rentals from ${site.name}'s approved vendor network.`}
        />
        <link rel="canonical" href={`${site.url}/wedding-venues/${city.slug}/${locality.slug}`} />
      </Head>
      <DirectoryLayout
        title={`Wedding Venues in ${locality.name}`}
        intro={`${venues.length} ${venues.length === 1 ? 'venue' : 'venues'} in ${locality.name}, ${city.name}.`}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Wedding Venues', href: '/wedding-venues' },
          { label: city.name, href: `/wedding-venues/${city.slug}` },
          { label: locality.name },
        ]}
      >
        <div className="mb-8 flex flex-wrap gap-2">
          <a
            href={`/wedding-venues/${city.slug}`}
            className="rounded-xl border border-lightGray bg-white px-4 py-2 text-sm font-semibold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
          >
            ← All areas in {city.name}
          </a>
        </div>

        {venues.length === 0 ? (
          <EmptyState
            title={`No venues listed in ${locality.name} yet`}
            detail="Share your date and we'll notify you when venue partners in this area are approved."
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
            sourcePage={`/wedding-venues/${city.slug}/${locality.slug}`}
            city={city.name}
            service="Venue"
            heading={`Venue options in ${locality.name}?`}
          />
        </div>
      </DirectoryLayout>
    </>
  );
}
