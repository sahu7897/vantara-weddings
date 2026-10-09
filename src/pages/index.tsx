import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import site from '@/config/site';
import SectionHero from '@/components/home/SectionHero';
import SectionClientReviews from '@/components/home/SectionClientReviews';
import SectionHowItWorks from '@/components/home/SectionHowItWorks';
import SectionBookVenues from '@/components/home/SectionBookVenues';
import SectionFeaturedListings from '@/components/home/SectionFeaturedListings';
import SectionVenuesBlock from '@/components/home/SectionVenuesBlock';
import SectionIndustryPartners from '@/components/home/SectionIndustryPartners';
import SectionEndToEndServices from '@/components/home/SectionEndToEndServices';
import SectionWeddingProposals from '@/components/home/SectionWeddingProposals';
import SectionWeddingIdeas from '@/components/home/SectionWeddingIdeas';
import SectionWhyBetter from '@/components/home/SectionWhyBetter';
import SectionFaq from '@/components/home/SectionFaq';
import SectionVendorCta from '@/components/home/SectionVendorCta';
import SectionAbout from '@/components/home/SectionAbout';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import StickyCtaBar from '@/components/layout/StickyCtaBar';
import LeadForm from '@/components/leads/LeadForm';
import { fetchApprovedVendors, fetchVenues, fetchVendorThumbs } from '@/services/publicData';
import type { VenueWithVendor } from '@/services/publicData';
import { fetchCmsSections } from '@/services/cmsData';
import type {
  FaqSectionContent,
  HeroSectionContent,
  VendorCtaSectionContent,
  VendorRow,
  WhyBetterSectionContent,
} from '@/lib/supabase/types';

/**
 * Homepage — section order and DOM mirror the captured index.html exactly
 * (docs/research/homepage/manifest + BLUEPRINT §Stage 3).
 * SEO meta: original copy, brand-swapped via src/config/site.ts (D9).
 *
 * HAND-EXTENSION (§13.6): SectionFeaturedListings is fed by ISR data.
 *
 * HAND-EXTENSION (Phase 6 CMS): the hero, FAQs, why-better and vendor-CTA
 * sections are fed from their `cms_sections` rows for page `home`, so the
 * admin panel's section editors actually change the live homepage. The
 * fetch is fail-soft (missing env/outage -> `{}`), in which case each section
 * falls back to its captured copy.
 */
interface HomeProps {
  featuredVenues: VenueWithVendor[];
  featuredVendors: VendorRow[];
  featuredThumbs: Record<string, string>;
  hero: HeroSectionContent | null;
  faqs: FaqSectionContent | null;
  whyBetter: WhyBetterSectionContent | null;
  vendorCta: VendorCtaSectionContent | null;
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const [venues, vendors, sections] = await Promise.all([
    fetchVenues({ limit: 6 }),
    fetchApprovedVendors(),
    fetchCmsSections('home'),
  ]);
  const featuredVendors = vendors.filter((vendor) => vendor.category !== 'venue').slice(0, 6);
  const thumbIds = [
    ...new Set(
      [...venues.map((v) => v.vendors.id), ...featuredVendors.map((v) => v.id)],
    ),
  ];
  const featuredThumbs = await fetchVendorThumbs(thumbIds);
  return {
    props: {
      featuredVenues: venues,
      featuredVendors,
      featuredThumbs,
      hero: (sections.hero as HeroSectionContent) ?? null,
      faqs: (sections.faqs as FaqSectionContent) ?? null,
      whyBetter: (sections.why_better as WhyBetterSectionContent) ?? null,
      vendorCta: (sections.vendor_cta as VendorCtaSectionContent) ?? null,
    },
    revalidate: 300,
  };
}

export default function HomePage({
  featuredVenues,
  featuredVendors,
  featuredThumbs,
  hero,
  faqs,
  whyBetter,
  vendorCta,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();

  // HAND-EXTENSION: lead-form view — original openLeadFormView() funnel
  // (router query leadform=true -> LeadForm host renders). Opened by every
  // "Start my wedding planning" CTA on the page (hero x2 + sticky bar).
  const leadOpen = router.isReady && router.query.leadform === 'true';
  const closeLeadForm = () => {
    router.push({ pathname: '/', query: {} }, undefined, { shallow: true });
  };
  useEffect(() => {
    if (!leadOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLeadForm();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadOpen]);

  return (
    <>
      <Head>
        <title>{site.title}</title>
        <meta name="description" content={site.description} />
        <link rel="canonical" href={`${site.url}/`} />
        <meta property="og:title" content={site.title} />
        <meta property="og:description" content={site.description} />
        <meta
          property="og:image"
          content={site.ogImage.startsWith('http') ? site.ogImage : `${site.url}${site.ogImage}`}
        />
        <meta property="og:url" content={`${site.url}/`} />
        <meta property="og:type" content="website" />
        {/* Preloads from the capture <head>. The capture lists the video pair
            twice (once per VideoCarousel instance); one pair is functionally
            identical, so we render it once. */}
        <link rel="preload" as="image" href={site.logo.transparent} fetchPriority="high" />
        <link
          rel="preload"
          as="video"
          href="/gcpimages/weddings/assets/goa-new-ph-potrait.mp4"
          media="(max-width: 768px)"
        />
        <link rel="preload" as="video" href="/gcpimages/weddings/assets/goa-new-ph.mp4" media="(min-width: 769px)" />
        <link rel="preload" as="image" href="/flowerbg.webp" fetchPriority="high" />
      </Head>
      <SiteHeader />
      <SectionHero content={hero ?? undefined} />
      <SectionClientReviews />
      <SectionHowItWorks />
      <SectionBookVenues />
      <SectionFeaturedListings
        venues={featuredVenues}
        vendors={featuredVendors}
        thumbs={featuredThumbs}
      />
      <SectionVenuesBlock>
        <SectionIndustryPartners />
        <SectionEndToEndServices />
      </SectionVenuesBlock>
      <SectionWeddingProposals />
      <SectionWeddingIdeas />
      <SectionWhyBetter content={whyBetter ?? undefined} />
      <SectionFaq content={faqs ?? undefined} />
      <SectionVendorCta content={vendorCta ?? undefined} />
      <SectionAbout />
      <SiteFooter />
      <StickyCtaBar />

      {/* HAND-EXTENSION: lead-form overlay (?leadform=true) — mirrors the
          original MFE leadform view (docs/research/outlines/mfe__leadform*.json). */}
      {leadOpen && (
        <div
          className="fixed inset-0 z-[300] overflow-y-auto bg-black/60 p-4 py-10 backdrop-blur-[2px]"
          onClick={closeLeadForm}
          role="dialog"
          aria-modal="true"
          aria-label="Start my wedding planning"
        >
          <div
            className="relative mx-auto w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close lead form"
              onClick={closeLeadForm}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-gray-500 shadow-md transition hover:text-gray-800"
            >
              ×
            </button>
            <LeadForm sourcePage="/" heading="Start my wedding planning" />
          </div>
        </div>
      )}
    </>
  );
}
