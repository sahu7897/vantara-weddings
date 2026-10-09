/**
 * SiteFooter — generated from docs/research/homepage/sections/footer_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 * Notes: app shell footer
 *
 * HAND-EXTENSION (Phase 6 CMS): every brand value here — logo, phone, email,
 * business address and the five social links — now reads from the effective
 * site settings (Admin → Site Settings, falling back to src/config/site.ts).
 * Before this, the footer shipped the ORIGINAL wedding-company phone, support
 * email, Bengaluru office address and four TWC social accounts, so the
 * rebranded site was still sending visitors to another business.
 */
import { useSiteSettings } from '@/lib/cms/siteSettings';

type SocialKey = 'instagram' | 'facebook' | 'youtube' | 'linkedin' | 'x';

const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'Youtube',
  linkedin: 'LinkedIn',
  x: 'X',
};

const SOCIAL_ORDER: SocialKey[] = ['instagram', 'facebook', 'youtube', 'linkedin', 'x'];

/** Social brand glyphs, kept verbatim from the captured footer markup. */
function SocialIcon({ kind }: { kind: SocialKey }) {
  const common = { xmlns: 'http://www.w3.org/2000/svg', fill: 'none', className: 'scale-75 lg:scale-100' };
  switch (kind) {
    case 'instagram':
      return (
        <svg {...common} width="37" height="37">
          <path
            fill="#333"
            fillRule="evenodd"
            d="M18.48 0C8.274 0 0 8.274 0 18.48c0 10.206 8.274 18.48 18.48 18.48 10.206 0 18.48-8.274 18.48-18.48C36.96 8.274 28.686 0 18.48 0Zm-4.865 6.436h9.57c3.948 0 7.178 3.23 7.178 7.177v9.57c0 3.948-3.23 7.177-7.178 7.177h-9.57c-3.948 0-7.178-3.23-7.178-7.177v-9.57c0-3.948 3.23-7.177 7.178-7.177Zm9.57 21.652c2.632 0 4.905-2.154 4.905-4.905v-9.57c0-2.632-2.154-4.905-4.905-4.905h-9.57c-2.632 0-4.905 2.154-4.905 4.905v9.57c0 2.632 2.154 4.905 4.905 4.905h9.57Zm1.553-17.227c-.717 0-1.435.598-1.435 1.436 0 .837.598 1.435 1.435 1.435.838 0 1.436-.598 1.436-1.435-.12-.838-.718-1.436-1.436-1.436Zm-6.337 1.793a5.871 5.871 0 0 0-5.862 5.862 5.871 5.871 0 0 0 5.862 5.862 5.871 5.871 0 0 0 5.861-5.862c.12-3.23-2.512-5.862-5.861-5.862Zm0 9.69c-2.034 0-3.828-1.675-3.828-3.828 0-2.034 1.674-3.828 3.828-3.828 2.033 0 3.828 1.675 3.828 3.828 0 2.153-1.675 3.828-3.828 3.828Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common} width="37" height="37">
          <path
            fill="#333"
            d="M18.48 0C8.274 0 0 8.274 0 18.48c0 10.206 8.274 18.48 18.48 18.48 10.206 0 18.48-8.274 18.48-18.48C36.96 8.274 28.686 0 18.48 0Zm1.53 10.61h-2.35c-.62 0-1.24.53-1.24 1.18v2.03h3.59l-.53 3.1h-3.06V27h-3.28v-10.08H10.4v-3.1h2.74v-2.3c0-2.39 1.5-4.42 4.03-4.42h2.84v3.51Z"
          />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common} width="37" height="38">
          <path
            fill="#333"
            fillRule="evenodd"
            d="M18.48.396C8.274.396 0 8.669 0 18.876c0 10.206 8.274 18.48 18.48 18.48 10.206 0 18.48-8.274 18.48-18.48 0-10.207-8.274-18.48-18.48-18.48Zm3.685 18.809L16.172 22.4v-6.392l5.993 3.196Zm7.679-3.122c-.07-.852-.174-1.523-.324-2.024-.288-.959-.958-1.577-1.997-1.843-1.19-.298-4.204-.469-9.042-.469l-1.836.064c-1.27 0-2.644.032-4.146.107-1.524.064-2.517.16-3.06.298-1.039.266-1.709.884-1.997 1.843-.324 1.097-.508 2.813-.508 5.146l.069.895c0 .639.035 1.374.115 2.226.07.853.174 1.524.324 2.024.288.96.958 1.577 1.997 1.844 1.19.298 4.204.468 9.042.468l1.836-.063c1.27 0 2.644-.032 4.145-.107 1.525-.064 2.518-.16 3.06-.298 1.04-.267 1.71-.885 1.998-1.843.324-1.098.508-2.813.508-5.146l-.069-.895c0-.64-.035-1.374-.115-2.227Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common} width="37" height="37">
          <path
            fill="#333"
            fillRule="evenodd"
            d="M12.446 9.61c-.031-1.412-1.04-2.487-2.676-2.487-1.637 0-2.706 1.075-2.706 2.488 0 1.381 1.037 2.486 2.643 2.486h.03c1.67 0 2.709-1.105 2.709-2.486Zm16.938 10.595c0-4.422-2.36-6.48-5.508-6.48-2.54 0-3.676 1.396-4.312 2.377v-2.039h-4.785c.062 1.351 0 14.397 0 14.397h4.784v-8.04c0-.43.03-.86.157-1.168.346-.86 1.134-1.75 2.456-1.75 1.731 0 2.424 1.321 2.424 3.256v7.702h4.784v-8.255Zm-17.254-6.14H7.346V28.46h4.784V14.064ZM18.48 0C8.274 0 0 8.274 0 18.48c0 10.206 8.274 18.48 18.48 18.48 10.206 0 18.48-8.274 18.48-18.48C36.96 8.274 28.686 0 18.48 0Z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} width="37" height="37">
          <path
            fill="#333"
            fillRule="evenodd"
            d="M18.48 0C8.274 0 0 8.274 0 18.48c0 10.206 8.274 18.48 18.48 18.48 10.206 0 18.48-8.274 18.48-18.48C36.96 8.274 28.686 0 18.48 0Zm-6.438 11L23.49 26h1.468L13.51 11h-1.468ZM14.5 9l4.71 6.172L24.5 9H28l-1.778 2-4.866 5.475-.62.697L27.474 26 29 28h-6.5l-5.125-6.715-.271.31L11.5 28H8l1.778-2 6.024-6.777L9.526 11 8 9h6.5Z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
}

export default function SiteFooter() {
  const { general, contacts, socials } = useSiteSettings();

  // Only render accounts that actually exist — an unconfigured network renders
  // no icon rather than a link to a dead or foreign profile.
  const socialLinks = SOCIAL_ORDER.filter((key) => Boolean(socials[key])).map((key) => ({
    key,
    href: socials[key],
    label: SOCIAL_LABEL[key],
  }));

  return (
    <>
    <footer className="px-8 pb-20 pt-6 md:px-20 md:pt-10 bg-white text-black mx-auto max-w-screen-2xl" id="footer_section">
            <section className="mb-10 flex flex-col items-center justify-center lg:mb-12"><img alt={`${general.shortName} logo`} loading="lazy" width="1684" height="686" decoding="async" data-nimg="1" className="hidden w-72 lg:block" style={{color: 'transparent'}} src={general.logoUrl} /><img alt={`${general.shortName} logo`} loading="lazy" width="1684" height="686" decoding="async" data-nimg="1" className="w-64 lg:hidden" style={{color: 'transparent'}} src={general.logoUrl} /></section>
            <section className="mb-10 lg:mb-12">
                <p className="mb-4 font-playfair font-semibold lg:text-[26px] text-primaryTextColor">Plan Your Dream Wedding With Us</p>
                <p className="text-sm lg:text-base text-secondary">Vantara is your ultimate destination for end-to-end wedding planning because we make it super easy. From selecting the ideal wedding venues to knowing the latest wedding trends, we help you in every aspect of your wedding. Let
                    our team handle everything and make your wedding day unforgettable.</p>
            </section>
            <section className="grid grid-cols-4 gap-4">
                <div className="col-span-full flex cursor-pointer flex-col gap-4 md:col-span-2 lg:col-span-1" id="company_links_container">
                    <p className="mb-2 text-xl text-darkGrey">Company</p><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_careers" href="/careers">Careers</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_register_as_partner" href="/partner-onboarding-form">Register as Partner</a>
                    <a target="_blank" className="hover:text-appTheme text-black" id="footer_link_terms_and_conditions" href="/twc-client-terms">Client Terms</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_vendor_terms" href="/twc-vendor-terms">Vendor Terms</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_privacy_policy" href="/twc-privacy-policy">Privacy Policy</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_refund_policy" href="/twc-refund-policy">Refund Policy</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_account_deletion" href="/account-deletion">Account Deletion</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding-payment-plan" href="/wedding-payment-plan">Service Payment Plan</a>
                        <a target="_blank" className="hover:text-appTheme text-black" id="footer_link_about_us" href="/about-us">About Us</a>
                </div>
                <div className="col-span-full flex cursor-pointer flex-col gap-4 md:col-span-2 lg:col-span-1" id="explore_links_container">
                    <p className="mb-2 text-xl text-darkGrey">Explore</p><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_ideas" href="/wedding-ideas">Vantara Ideas</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_venues" href="/wedding-venues">Vantara Venues</a>
                    <a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_decorators" href="/wedding-decorators">Vantara Decorators</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_photography" href="/wedding-photography">Vantara Photographers</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_services" href="/wedding-services">Vantara Services</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_wedding_invitation_card" href="/wedding-invitation-card">Vantara Invitation Card</a><a target="_blank" className="hover:text-appTheme text-black" id="footer_link_price-beat-challenge" href="/price-beat-challenge">Price Beat Challenge</a></div>
                <div className="col-span-full flex cursor-pointer flex-col gap-4 md:col-span-2 lg:col-span-1" id="contact_us_links_container"><a target="_blank" className="mb-2 text-xl hover:text-appTheme text-darkGrey" href="/contact-us">Contact Us</a>
                    <p className="cursor-default text-sm font-semibold text-secondary lg:text-base ">For Vantara Services</p><a target="_blank" className=" hover:text-appTheme lg:pl-0 text-black" id="footer_link_wedding_services_telephone" href={contacts.telHref}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> {contacts.phone}</a>
                    <p className="cursor-default text-sm font-semibold text-secondary lg:text-base ">For Customer Support</p><a target="_blank" className="text-black hover:text-appTheme" href={`mailto:${contacts.email}`}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 inline-block"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg> {/* */}{contacts.email}</a>
                        <p className="cursor-default text-sm font-semibold text-secondary lg:text-base ">Business address / operating address</p>
                            <p>{contacts.address}</p>
                </div>
                <div className="col-span-full flex flex-col gap-4 md:col-span-2 lg:col-span-1" id="social_media_and_download_links_container">
                    <p className="mb-2 text-xl text-footerGrey">Follow Us On</p>
                    {socialLinks.map(({ key, href, label }) => (
                      <a key={key} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-base hover:text-appTheme lg:gap-2 text-black" id={`footer_${key}_icon_link`} href={href} aria-label={`Vantara Weddings on ${label}`}>
                        <SocialIcon kind={key} />
                        <span id={`footer_${key}_icon_label`}>{label}</span>
                      </a>
                    ))}
                </div>
            </section>
            <div className="mt-6 grid grid-cols-2 items-end gap-4">
                <div className="-order-1 col-span-full md:order-[0] md:col-span-2">
                    <p className="text-sm text-darkGrey ">Disclaimer: To make your experience better we might use your details for marketing purposes. Our wedding experts might contact to understand your need and help you get high quality wedding services.</p>
                </div>
            </div>
        </footer>
    </>
  );
}
