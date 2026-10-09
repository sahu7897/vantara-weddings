/**
 * /wedding-decorators — category directory (§13.6, fixed the nav/footer
 * 404). Approved `decor` vendors grouped by city; honest empty state when the
 * network is still empty.
 */
import Head from 'next/head';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import DirectoryLayout from '@/components/directory/DirectoryLayout';
import EmptyState from '@/components/directory/EmptyState';
import VendorSections from '@/components/directory/VendorSections';
import LeadForm from '@/components/leads/LeadForm';
import { fetchApprovedVendors, fetchCities, fetchVendorThumbs } from '@/services/publicData';
import type { CityRow, VendorRow } from '@/lib/supabase/types';

interface DecoratorsProps {
  cities: CityRow[];
  vendors: VendorRow[];
  thumbs: Record<string, string>;
}

export const getStaticProps: GetStaticProps<DecoratorsProps> = async () => {
  const [cities, vendors] = await Promise.all([
    fetchCities(),
    fetchApprovedVendors({ category: 'decor' }),
  ]);
  const thumbs = await fetchVendorThumbs(vendors.map((vendor) => vendor.id));
  return { props: { cities, vendors, thumbs }, revalidate: 600 };
};

export default function DecoratorsPage({
  cities,
  vendors,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{`Wedding Decorators in Banda, Jhansi, Lucknow & Delhi NCR | ${site.name}`}</title>
        <meta
          name="description"
          content={`Wedding decorators from ${site.name}'s approved vendor network — mandap, floral and theme décor across our launch cities.`}
        />
        <link rel="canonical" href={`${site.url}/wedding-decorators`} />
      </Head>
      <DirectoryLayout
        title="Wedding Decorators"
        intro="Mandap, floral and theme décor from our approved network — enquire on any card below."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Wedding Decorators' }]}
      >
        {cities.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {cities.map((city) => (
              <a
                key={city.slug}
                href={`#${city.slug}`}
                className="rounded-xl border border-lightGray bg-white px-4 py-2 text-sm font-semibold text-primaryTextColor transition hover:border-appTheme hover:text-appTheme"
              >
                {city.name}
              </a>
            ))}
          </div>
        )}

        {vendors.length === 0 ? (
          <EmptyState
            title="No decorators listed yet"
            detail="We're onboarding décor partners in our launch cities — share your requirements below and we'll notify you as they're approved."
          />
        ) : (
          <VendorSections cities={cities} vendors={vendors} thumbs={thumbs} />
        )}

        <div className="mt-10">
          <LeadForm
            sourcePage="/wedding-decorators"
            service="Decoration"
            heading="Tell us your theme — we'll match decorators"
          />
        </div>
      </DirectoryLayout>
    </>
  );
}
