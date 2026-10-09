/**
 * WhatsApp click-to-chat URL builder.
 *
 * Every WhatsApp CTA on the site (header, hero ×2, sticky bar) previously
 * hardcoded the original "The Wedding Company" number — including a fallback
 * in SiteHeader that silently won because `site.contacts.whatsappNumber` was
 * empty. All of them now build their href from the effective site settings
 * (CMS `site_settings.contacts` row, falling back to src/config/site.ts), so
 * changing the number in Admin → Site Settings changes every CTA at once.
 */

/** Strip formatting so `+91 73551 91261` and `917355191261` behave the same. */
export function normalizeWhatsappNumber(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Returns a wa.me deep link, or null when no usable number is configured so
 * callers can render the CTA as a non-link instead of a dead/foreign chat.
 */
export function buildWhatsappUrl(number: string, text?: string): string | null {
  const digits = normalizeWhatsappNumber(number);
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}
