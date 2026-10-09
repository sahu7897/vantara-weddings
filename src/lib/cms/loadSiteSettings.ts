/**
 * Server-side loader for the effective public site settings.
 *
 * Imported lazily (and server-side only) by `_app.getInitialProps` so the
 * Supabase client never enters the client bundle for visitors who never open
 * an authenticated page.
 *
 * Two deliberate behaviours:
 *  1. Fail-soft: any transport/config error returns the static fallback rather
 *     than throwing, so a Supabase outage can never take down the marketing
 *     site.
 *  2. Blank-string guard: a saved CMS row that omits a field (or stores `''`)
 *     must not blank out a footer field — e.g. clearing every social URL would
 *     otherwise erase the real links a visitor can still use. Empty values are
 *     ignored and the fallback wins.
 */
import { FALLBACK_SITE_SETTINGS, type SiteSettings } from './siteSettings';

/** Drop empty/whitespace-only values so they never overwrite a real default. */
function withoutBlanks<T extends object>(override: Partial<T> | undefined): Partial<T> {
  if (!override || typeof override !== 'object') return {};
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'string' && value.trim() === '') continue;
    if (value === null || value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned as Partial<T>;
}

/** Merge a fetched settings object over the static defaults, group by group. */
export function mergeSiteSettings(fetched: Partial<SiteSettings> | null): SiteSettings {
  if (!fetched) return FALLBACK_SITE_SETTINGS;
  return {
    general: { ...FALLBACK_SITE_SETTINGS.general, ...withoutBlanks(fetched.general) },
    contacts: { ...FALLBACK_SITE_SETTINGS.contacts, ...withoutBlanks(fetched.contacts) },
    socials: { ...FALLBACK_SITE_SETTINGS.socials, ...withoutBlanks(fetched.socials) },
    seo: { ...FALLBACK_SITE_SETTINGS.seo, ...withoutBlanks(fetched.seo) },
  };
}

/** Load + merge in one step. Never throws. */
export async function loadEffectiveSiteSettings(): Promise<SiteSettings> {
  try {
    const { fetchSiteSettings } = await import('@/services/cmsData');
    return mergeSiteSettings(await fetchSiteSettings());
  } catch {
    return FALLBACK_SITE_SETTINGS;
  }
}
