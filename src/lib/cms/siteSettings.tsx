/**
 * Effective site settings for the public site (Phase 6 CMS wiring).
 *
 * The admin panel has always been able to edit branding/contacts/socials/SEO
 * into `site_settings`, but nothing read it back — the CMS was write-only, so
 * every save was a silent no-op for visitors. `_app.getInitialProps` now loads
 * the rows server-side (falling back to src/config/site.ts when Supabase is
 * absent or erroring) and publishes them here; header/footer/CTA components
 * read them through `useSiteSettings()`.
 *
 * The fallback is deliberately layer-by-layer: a CMS row that is missing or
 * partial never blanks out a footer field.
 */
import { createContext, useContext, type ReactNode } from 'react';
import siteConfig from '@/config/site';
import type {
  ContactSettings,
  GeneralSettings,
  SeoSettings,
  SocialSettings,
} from '@/lib/supabase/types';

export interface SiteSettings {
  general: GeneralSettings;
  contacts: ContactSettings;
  socials: SocialSettings;
  seo: SeoSettings;
}

/**
 * Static defaults (src/config/site.ts). Kept free of webpack-env references so
 * it is safe to import from both the server and the client.
 */
export const FALLBACK_SITE_SETTINGS: SiteSettings = {
  general: {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    tagline: 'Book Venues, End to End Wedding Services, Planners in India',
    logoUrl: siteConfig.logo.transparent,
    faviconUrl: siteConfig.logo.favicon,
  },
  contacts: {
    phone: siteConfig.contacts.phone,
    telHref: siteConfig.contacts.telHref,
    whatsappNumber: siteConfig.contacts.whatsappNumber,
    whatsappText: siteConfig.contacts.whatsappText,
    email: siteConfig.contacts.email,
    address: siteConfig.contacts.address,
  },
  socials: {
    instagram: siteConfig.socials.instagram,
    facebook: siteConfig.socials.facebook,
    youtube: siteConfig.socials.youtube,
    linkedin: siteConfig.socials.linkedin,
    x: siteConfig.socials.x,
  },
  seo: {
    defaultTitle: siteConfig.title,
    defaultDescription: siteConfig.description,
    defaultOgImage: siteConfig.ogImage,
  },
};

const SiteSettingsContext = createContext<SiteSettings>(FALLBACK_SITE_SETTINGS);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value?: SiteSettings;
  children: ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={value ?? FALLBACK_SITE_SETTINGS}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/**
 * Effective settings for the current render. Falls back to the static config
 * when no provider is mounted (e.g. pages rendered in isolation by tests).
 */
export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
