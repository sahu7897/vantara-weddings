/**
 * /wedding-venues — public venue directory (§13.6). ISR with a 10-minute
 * revalidate so admin approvals show up without a redeploy; if Supabase is
 * unconfigured the page still builds and renders the honest empty state.
 */
import Head from 'next/head';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import DirectoryLayout from '@/components/directory/DirectoryLayout';
import EmptyState from '@/components/directory/EmptyState';
import VenueCard from '@/components/directory/VenueCard';
import LeadForm from '@/components/leads/LeadForm';
import { fetchCities, fetchVenues, fetchVendorThumbs } from '@/services/publicData';
import type { VenueWithVendor } from '@/services/publicData';
import type { CityRow } from '@/lib/supabase/types';

interface VenuesPageProps {
  cities: CityRow[];
  venues: VenueWithVendor[];
  counts: Record<string, number>;
  thumbs: Record<string, string>;
}

export const getStaticProps: GetStaticProps<VenuesPageProps> = async () => {
  const [cities, venues] = await Promise.all([fetchCities(), fetchVenues()]);
  const counts: Record<string, number> = {};
  for (const venue of venues) {
    counts[venue.vendors.city] = (counts[venue.vendors.city] ?? 0) + 1;
  }
  const thumbs = await fetchVendorThumbs([...new Set(venues.map((v) => v.vendors.id))]);
  return { props: { cities, venues, counts, thumbs }, revalidate: 600 };
};

export default function VenuesIndexPage({
  cities,
  venues,
  counts,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const title = `Wedding Venues${cities.length ? ` in ${cities.map((c) => c.name).join(', ')}` : ''} | ${site.name}`;
  const ordered = [...venues].sort((a, b) => {
    const order = cities.map((city) => city.slug);
    const rank = (slug: string) => {
      const index = order.indexOf(slug);
      return index === -1 ? order.length : index;
    };
    return rank(a.vendors.city) - rank(b.vendors.city);
  });

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta
          name="description"
          content={`Browse wedding venues shortlisted by ${site.name} — capacities, per-plate pricing and rental rates across Banda, Jhansi, Lucknow and Delhi NCR.`}
        />
        <link rel="canonical" href={`${site.url}/wedding-venues`} />
      </Head>
      <DirectoryLayout
        title="Wedding Venues"
        intro="Compare capacities, catering rates and rentals — every listing is from our approved vendor network."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Wedding Venues' }]}
      >
        {cities.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {cities.map((city) => (
              <a
                key={city.slug}
                href={`/wedding-venues/${city.slug}`}
                className="rounded-xl border border-lightGray bg-white px-4 py-2 text-sm font-semibold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
              >
                {city.name}
                <span className="ml-1.5 text-xs font-normal text-darkGrey">
                  ({counts[city.slug] ?? 0})
                </span>
              </a>
            ))}
          </div>
        )}

        {ordered.length === 0 ? (
          <EmptyState
            title="No venues listed yet"
            detail="We're onboarding venue partners in our launch cities right now. Share your date below and we'll send you options as they come in."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                thumb={thumbs[venue.vendors.id]}
                href={`/wedding-venues/${venue.vendors.city}/venue/${venue.id}`}
              />
            ))}
          </div>
        )}

        <div className="mt-10">
          <LeadForm
            sourcePage="/wedding-venues"
            service="Venue"
            heading="Tell us your date — we'll shortlist venues"
          />
        </div>
      </DirectoryLayout>
    </>
  );
}
