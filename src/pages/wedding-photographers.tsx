/**
 * /wedding-photographers — category directory (§13.6, fixes the nav/footer
 * 404; /wedding-photography redirects here). Approved `photography` vendors
 * grouped by city; honest empty state while the network is empty.
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

interface PhotographersProps {
  cities: CityRow[];
  vendors: VendorRow[];
  thumbs: Record<string, string>;
}

export const getStaticProps: GetStaticProps<PhotographersProps> = async () => {
  const [cities, vendors] = await Promise.all([
    fetchCities(),
    fetchApprovedVendors({ category: 'photography' }),
  ]);
  const thumbs = await fetchVendorThumbs(vendors.map((vendor) => vendor.id));
  return { props: { cities, vendors, thumbs }, revalidate: 600 };
};

export default function PhotographersPage({
  cities,
  vendors,
  thumbs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{`Wedding Photographers in Banda, Jhansi, Lucknow & Delhi NCR | ${site.name}`}</title>
        <meta
          name="description"
          content={`Wedding photographers from ${site.name}'s approved vendor network — candid, cinematic and traditional coverage across our launch cities.`}
        />
        <link rel="canonical" href={`${site.url}/wedding-photographers`} />
      </Head>
      <DirectoryLayout
        title="Wedding Photographers"
        intro="Candid, cinematic and traditional coverage from our approved network — enquire on any card below."
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Wedding Photographers' }]}
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
            title="No photographers listed yet"
            detail="We're onboarding photography partners in our launch cities — share your requirements below and we'll notify you as they're approved."
          />
        ) : (
          <VendorSections cities={cities} vendors={vendors} thumbs={thumbs} />
        )}

        <div className="mt-10">
          <LeadForm
            sourcePage="/wedding-photographers"
            service="Photography"
            heading="Planning your shoot? Get a callback"
          />
        </div>
      </DirectoryLayout>
    </>
  );
}
