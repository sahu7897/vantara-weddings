/**
 * Public and server-side CMS data fetcher (Phase 6).
 * Follows the pattern of src/services/publicData.ts:
 *   - Uses the anon client with RLS for public read
 *   - Fails soft with sensible fallback constants so next build / pages never crash
 *
 * Site-level fallbacks live in `src/lib/cms/siteSettings.ts` (single source of
 * truth shared with the public-site provider). This module only owns the
 * page-section defaults below.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FALLBACK_SITE_SETTINGS, type SiteSettings } from '@/lib/cms/siteSettings';
import type {
  CmsPageRow,
  ContactSettings,
  FaqSectionContent,
  GeneralSettings,
  HeroSectionContent,
  SeoSettings,
  SocialSettings,
  VendorCtaSectionContent,
  WhyBetterItem,
  WhyBetterSectionContent,
} from '@/lib/supabase/types';

let cachedClient: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cachedClient = url && anonKey ? createClient(url, anonKey) : null;
  return cachedClient;
}

// ── Default Fallback Constants ────────────────────────────────────────────────
// Site-level settings are re-exported from the shared fallback so the public
// provider and the CMS fetcher can never drift apart (they previously held two
// different phone numbers, which is how the original TWC number reached the
// live WhatsApp CTA).

export const DEFAULT_GENERAL_SETTINGS = FALLBACK_SITE_SETTINGS.general;
export const DEFAULT_CONTACT_SETTINGS = FALLBACK_SITE_SETTINGS.contacts;
export const DEFAULT_SOCIAL_SETTINGS = FALLBACK_SITE_SETTINGS.socials;
export const DEFAULT_SEO_SETTINGS = FALLBACK_SITE_SETTINGS.seo;

export const DEFAULT_HERO_CONTENT: HeroSectionContent = {
  headline: 'Crafting Unforgettable Weddings',
  subheadline: 'Book verified venues, decorators, and photographers with guaranteed best rates.',
  primaryCtaText: 'Start my wedding planning',
  primaryCtaLink: '/?leadform=true',
  secondaryCtaText: 'Explore Venues',
  secondaryCtaLink: '/wedding-venues',
  slides: [
    {
      id: 1,
      mobileUrl: '/gcpimages/weddings/assets/goa-new-ph-potrait.mp4',
      desktopUrl: '/gcpimages/weddings/assets/goa-new-ph.mp4',
      coupleName: 'Anjali & Apurav',
      city: 'Goa',
      date: 'May ‘25',
      posterUrl:
        '/gcpimages/weddings/d0e26332-36c0-4d65-b839-b18d17c0494e/admin_uploads/d2bfa004-e6c1-41e5-830e-16ce72835de5_thumbnail.jpg',
    },
    {
      id: 2,
      mobileUrl:
        '/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/d8401edd-e0e6-4256-b47f-6babc33ad026.mp4',
      desktopUrl:
        '/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/3d17561e-7b23-4497-9d0f-fe386cca76bf.mp4',
      coupleName: 'Ishita & Shubh',
      city: 'Bangalore',
      date: 'Apr ‘24',
      posterUrl:
        '/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp',
    },
    {
      id: 3,
      mobileUrl: '/gcpimages/weddings/assets/ashish_mobile.mp4',
      desktopUrl: '/gcpimages/weddings/assets/ashish_web.mp4',
      coupleName: 'Shivika & Ashish',
      city: 'Udaipur',
      date: 'Feb ‘25',
      posterUrl:
        '/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/64fcf724-1472-4c08-afe3-d3167091920d.webp',
    },
    {
      id: 4,
      mobileUrl: '/gcpimages/weddings/assets/ishita_mobile.mp4',
      desktopUrl: '/gcpimages/weddings/assets/Ishita_desktop.mp4',
      coupleName: 'Ishita & Akshay',
      city: 'Jaipur',
      date: 'Feb ‘25',
      posterUrl:
        '/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/0d828b4b-34a0-4f32-88b7-01790e6e33a1.webp',
    },
  ],
};

export const DEFAULT_FAQ_CONTENT: FaqSectionContent = {
  headline: 'Frequently Asked Questions',
  subheadline: 'Everything you need to know about planning with Vantara Weddings.',
  items: [
    {
      id: ':R35956:',
      q: 'Do you offer customisable packages to suit different budgets?',
      a: 'Yes, we are committed to provide you all the services tailored to your budget and requirements. Our dedicated planners ensure to turn your dream wedding into reality without turning it heavy on your pockets.',
    },
    {
      id: ':R55956:',
      q: 'Can you assist with destination weddings or events in different locations?',
      a: 'Absolutely, we specialize in destination weddings, ensuring you fully enjoy your special day while we handle everything else.',
    },
    {
      id: ':R75956:',
      q: 'How early should we book your services for our wedding?',
      a: 'Ideally, the venue recce and booking of the services should be done 9-12 months in advance as all the services sell out fast, especially for auspicious dates.',
    },
    {
      id: ':R95956:',
      q: 'Are there additional costs we should be aware of beyond the initial service fee?',
      a: 'We guarantee transparent pricing with no hidden fees. Committed to delivering the best wedding experience, we tailor our services to fit your budget without any extra costs.',
    },
  ],
};

/**
 * Fallback copy for the `home/why_better` CMS section. These are the three
 * benefit cards the captured homepage actually renders (title/body/icon);
 * `vantaraAdvantage`/`traditionalDrawback` stay part of the type because the
 * seed row in migration 0007 carries the comparison copy.
 */
export type WhyBetterItemWithIcon = WhyBetterItem & { icon?: string };

export const DEFAULT_WHY_BETTER_CONTENT: WhyBetterSectionContent & {
  items: WhyBetterItemWithIcon[];
} = {
  headline: 'Why are we better?',
  subheadline: 'Because we bring our years of experience in planning your wedding.',
  items: [
    {
      title: 'Exclusive Deals',
      description: 'Best deals made only for you tailored to your preferences.',
      icon: '/images/HomePageRevamp/benefits/gift.webp',
      vantaraAdvantage: 'Best deals tailored to your preferences',
      traditionalDrawback: 'Generic packages with no flexibility',
    },
    {
      title: 'Expert Insights',
      description: 'Our wedding experts know how to craft the best for you.',
      icon: '/images/HomePageRevamp/benefits/bulb.webp',
      vantaraAdvantage: 'Dedicated wedding experts on every booking',
      traditionalDrawback: 'Advice from unverified freelancers',
    },
    {
      title: 'Stress-free Experience',
      description: 'From venue recce to last second of your wedding, we’ll be with you.',
      icon: '/images/HomePageRevamp/benefits/lady.webp',
      vantaraAdvantage: 'One point of contact end to end',
      traditionalDrawback: 'Multiple uncoordinated vendor calls',
    },
  ],
};

export const DEFAULT_VENDOR_CTA_CONTENT: VendorCtaSectionContent = {
  headline: 'Are You a Wedding Vendor or Venue Owner?',
  subheadline: 'Partner with Vantara Weddings to grow your bookings and reach verified wedding clients across India.',
  buttonText: 'Register as Partner',
  buttonLink: '/lp/partner-onboarding-form',
  badgeText: 'Partner Network',
};

// ── Data Accessors ────────────────────────────────────────────────────────────

/**
 * Loads every `site_settings` row and layers each one over the static fallback.
 * Returns the same shape the public-site provider publishes, so callers
 * (the admin CMS panels and `_app.getInitialProps`) share one code path.
 */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const supabase = getClient();
  if (!supabase) return FALLBACK_SITE_SETTINGS;

  const { data, error } = await supabase.from('site_settings').select('*');
  if (error || !data) return FALLBACK_SITE_SETTINGS;

  const map = new Map(data.map((row) => [row.key, row.value]));
  return {
    general: { ...FALLBACK_SITE_SETTINGS.general, ...(map.get('general') as GeneralSettings) },
    contacts: { ...FALLBACK_SITE_SETTINGS.contacts, ...(map.get('contacts') as ContactSettings) },
    socials: { ...FALLBACK_SITE_SETTINGS.socials, ...(map.get('socials') as SocialSettings) },
    seo: { ...FALLBACK_SITE_SETTINGS.seo, ...(map.get('seo') as SeoSettings) },
  };
}

export async function fetchCmsSections(pageSlug: string): Promise<Record<string, unknown>> {
  const supabase = getClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('cms_sections')
    .select('section_key, content')
    .eq('page_slug', pageSlug)
    .eq('is_active', true);

  if (error || !data) return {};

  const result: Record<string, unknown> = {};
  for (const row of data as { section_key: string; content: unknown }[]) {
    result[row.section_key] = row.content;
  }
  return result;
}

export async function fetchCmsPage(slug: string): Promise<CmsPageRow | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) return null;
  return data as CmsPageRow | null;
}

export async function fetchAllCmsPages(): Promise<CmsPageRow[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('is_published', true)
    .order('title', { ascending: true });

  if (error || !data) return [];
  return data as CmsPageRow[];
}
