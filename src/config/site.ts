/**
 * Central brand + site configuration (BLUEPRINT §8 — brand swap layer).
 * Every "The Wedding Company" reference in the recreation reads from here,
 * so the Vantara brand kit can be dropped in by editing this file only.
 *
 * TODO-VANTARA: values marked TODO are placeholders pending the brand kit
 * (logo, real phone/WhatsApp/email, socials, domain).
 */
export const site = {
  name: 'Vantara Weddings',
  shortName: 'Vantara',
  /** SEO title pattern mirrors the original, brand-swapped (D9). */
  title: 'Vantara Weddings - Book Venues, End to End Vantara Services, Planners in India',
  description:
    'Vantara Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals for your wedding, engagement, reception, and other events.',
  /** TODO-VANTARA: replace with the production domain. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vantaraweddings.example.com',
  /** Local mirror of the hero art (public/gcpimages/…) — no runtime hotlink
   *  to any third-party CDN. Swap to a Vantara OG image with the brand kit. */
  ogImage: '/gcpimages/weddings/assets/HeroSectionBackgroundImageoptimised.webp',
  twitterHandle: '@VantaraWeddings', // TODO-VANTARA
  locale: 'en-US',

  /** Brand kit (partial — dropped in capture /logo folder, D3). */
  logo: {
    /** Official Vantara Weddings logo (client-provided PNG; green-key cleaned). */
    transparent: '/brand/vantara-logo.png',
    /** Same official asset until a dark-background variant is delivered. */
    dark: '/brand/vantara-logo.png',
    /** Monogram crop of the official logo. */
    favicon: '/brand/favicon.png',
  },

  /**
   * Real Vantara Weddings contact details (client-supplied). These are the
   * FALLBACK/seed values: at runtime the `contacts` row in `site_settings`
   * (editable from Admin → Site Settings) overrides them through
   * `useSiteSettings()`. Never hardcode a phone/email/WhatsApp number in a
   * component — read from here or from that hook.
   */
  contacts: {
    phone: '+91 73551 91261',
    telHref: 'tel:+917355191261',
    /** Digits only, country code first — what WhatsApp click-to-chat expects. */
    whatsappNumber: '917355191261',
    whatsappText: 'Hey, I am looking for wedding services',
    email: 'bookings@vantaraweddings.com',
    address:
      'B Block, 1325/31, Nahar Road, Awas Vikas Colony, Indira Nagar, Banda, Uttar Pradesh 210001',
  },

  socials: {
    instagram: 'https://www.instagram.com/vantaraweddings/',
    facebook: 'https://www.facebook.com/share/1DQbAP4Qb3/',
    youtube: 'https://youtube.com/@vantaraweddings',
    linkedin: 'https://www.linkedin.com/in/vantara-weddings-ba36a2407',
    x: '',
  },

  /** Header navigation — original: [Wedding Venues] [Price Beat Challenge] [More ▾] */
  nav: {
    venues: { label: 'Vantara Venues', href: '/wedding-venues' },
    priceBeat: { label: 'Price Beat Challenge', href: '/price-beat-challenge' },
    moreLabel: 'More',
    /** "More" dropdown items are client-rendered in the original — verified in Stage 3. */
    moreItems: [] as { label: string; href: string }[],
  },

  cta: {
    primaryLabel: 'Start my wedding planning',
    whatsappLabel: 'Chat with us',
  },
} as const;

export default site;
