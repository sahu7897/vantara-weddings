import type { NextConfig } from 'next';

/**
 * Phase 5 §13.1 (O1): Vercel hosting — static export is dropped; API routes,
 * getServerSideProps/ISR and middleware are all in use. TS + Tailwind unchanged.
 *
 * Original-site asset behavior (raw images/videos, no optimizer) is preserved.
 */
// Original-TWC city slugs referenced by captured homepage copy/tiles; see the
// redirects() note below.
const legacyCitySlugs = ['bengaluru', 'mumbai', 'goa', 'noida', 'gurugram', 'jaipur', 'udaipur'];
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  // Legacy paths verified on the live site (200 -> redirect target):
  //   /twc-refund-policy -> /refund-policy
  //   /wedding-photography -> /wedding-photographers
  //   /partner-onboarding-form -> /lp/partner-onboarding-form
  // Original-TWC city URLs (homepage city tiles + captured copy link to them).
  // Live city set = `public.cities` (seed: banda, delhi-ncr, lucknow, jhansi):
  //   - `delhi` maps onto our real `delhi-ncr` city,
  //   - the remaining original-site cities fall back to the city index until
  //     those cities are onboarded. Temporary 307s (drop when the row exists).
  /**
   * Deferred-route redirects.
   *
   * The blog family (`/wedding`, `/wedding/[blogSlug]`) is explicitly out of
   * scope in BLUEPRINT §13.6 and no real post content exists locally (only two
   * thin research outlines with no body copy), so the routes were never built.
   * The links to them have been removed from the header/footer — these
   * redirects exist so any externally-shared or bookmarked `/wedding` URL
   * lands on a real page instead of a 404. Drop them when the blog ships.
   */
  async redirects() {
    return [
      { source: '/wedding', destination: '/wedding-ideas', permanent: false },
      { source: '/wedding/:slug', destination: '/wedding-ideas', permanent: false },
      { source: '/twc-refund-policy', destination: '/refund-policy', permanent: true },
      { source: '/wedding-photography', destination: '/wedding-photographers', permanent: true },
      {
        source: '/partner-onboarding-form',
        destination: '/lp/partner-onboarding-form',
        permanent: true,
      },
      {
        source: '/wedding-venues/delhi',
        destination: '/wedding-venues/delhi-ncr',
        permanent: false,
      },
      ...legacyCitySlugs.map((slug) => ({
        source: `/wedding-venues/${slug}`,
        destination: '/wedding-venues',
        permanent: false,
      })),
      {
        source: '/wedding-venues/noida/:path*',
        destination: '/wedding-venues',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
