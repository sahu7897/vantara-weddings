/**
 * SiteHeader — generated from docs/research/homepage/sections/header_nav.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 * Notes: app shell nav
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Variants } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { useSiteSettings } from '@/lib/cms/siteSettings';
import { buildWhatsappUrl } from '@/lib/site/whatsapp';

/**
 * HAND-EXTENSION: More-dropdown + mobile drawer data and behaviour.
 * Sources: original chunk chunks__7168 (HomePageDesktopNavbar `eo`,
 * HomePageMobileNavbar `eA`) and chunk 506 module 53931 (dropdown panel
 * variants + classes). Label copy brand-swapped; routes unchanged.
 */
type MoreItem = { label: string; href?: string; isHeader?: boolean; testId?: string };

const MORE_ITEMS: MoreItem[] = [
  { label: 'Other Services', isHeader: true, testId: 'header_other_services' },
  { label: 'Vantara Ideas', href: '/wedding-ideas', testId: 'sublink_wedding_ideas' },
  { label: 'Vantara Photographers', href: '/wedding-photographers', testId: 'sublink_wedding_photographers' },
  { label: 'Invitation Cards', href: '/wedding-invitation-card', testId: 'sublink_invitation_card' },
  { label: 'End-to-end Vantara Services', href: '/wedding-services', testId: 'link_end_to_end_wedding_services' },
  { label: 'Exclusive Brand Deals', href: '/twc-exclusive/deals', testId: 'sublink_exclusive_brand_deals' },
  { label: 'More', isHeader: true, testId: 'header_about' },
  { label: 'Refund Policy', href: '/refund-policy', testId: 'sublink_refund_policy' },
  { label: 'Service Payment Plan', href: '/wedding-payment-plan', testId: 'sublink_service_payment_plan' },
  { label: 'Vantara Client Terms', href: '/twc-client-terms', testId: 'sublink_twc_client_terms' },
  { label: 'Integrity Program', href: '/integrity-program', testId: 'sublink_integrity_program' },
];

const MOBILE_SECTIONS: { title: string; items: { label: string; href?: string }[] }[] = [
  {
    title: 'Main Navigation',
    items: [
      { label: 'Home', href: '/' },
      { label: 'Vantara Venues', href: '/wedding-venues' },
      { label: 'Price Beat Challenge', href: '/price-beat-challenge' },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Vantara Ideas', href: '/wedding-ideas' },
      { label: 'Vantara Photographers', href: '/wedding-photographers' },
      { label: 'Invitation Cards', href: '/wedding-invitation-card' },
      { label: 'End-to-end Vantara Services', href: '/wedding-services' },
      { label: 'Exclusive Brand Deals', href: '/twc-exclusive/deals' },
      { label: 'Refund Policy', href: '/refund-policy' },
      { label: 'Service Payment Plan', href: '/wedding-payment-plan' },
      { label: 'Vantara Client Terms', href: '/twc-client-terms' },
      { label: 'Integrity Program', href: '/integrity-program' },
    ],
  },
];

// NOTE: the WhatsApp href is built inside the component from the effective
// site settings (see `useSiteSettings()`). It previously hardcoded the original
// "The Wedding Company" number as a fallback, so the mobile drawer CTA pointed
// at another business whenever `site.contacts.whatsappNumber` was unset.

/**
 * HAND-EXTENSION (Stage 4): header wrapper variants observed across the
 * original site. Identical nav content; only the wrapper <div> classes differ:
 *  - sticky   — homepage + app-shell content pages (h-14, sticky top-0)
 *  - relative — directory listings (h-16, in-flow)
 *  - fixed    — services / blog / detail pages (h-16, fixed + backdrop blur)
 * Class strings verbatim from captured raw pages.
 */
const HEADER_VARIANTS = {
  sticky:
    'z-[100] flex h-16 translate-y-0 justify-between bg-[rgba(255,255,255,0.80)] px-4 py-2 lg:px-14 sticky top-0',
  relative:
    'z-[100] flex translate-y-0 justify-between bg-[rgba(255,255,255,0.80)] px-4 py-2 lg:px-14 relative h-16',
  fixed:
    'flex translate-y-0 justify-between px-4 py-2 lg:px-14 fixed inset-x-0 top-0 z-[100] bg-[rgba(255,255,255,0.80)] backdrop-blur-[2px] transition-transform duration-500 shadow-header h-16',
} as const;

export type HeaderVariant = keyof typeof HEADER_VARIANTS;

// Dropdown motion variants — verbatim from original module 53931 (chunk 506).
const panelVariants: Variants = {
  hidden: { clipPath: 'inset(10% 50% 90% 50% round 10px)' },
  visible: {
    clipPath: 'inset(0% 0% 0% 0% round 10px)',
    transition: { when: 'beforeChildren', staggerChildren: 0.05 },
  },
  exit: { clipPath: 'inset(10% 50% 90% 50% round 10px)' },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: -50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', duration: 0.5, bounce: 0.2 } },
};

export default function SiteHeader({ variant = 'sticky' }: { variant?: HeaderVariant } = {}) {
  // Brand + contact values come from the CMS-backed settings provider (falls
  // back to src/config/site.ts), so Admin → Site Settings controls them live.
  const { general, contacts } = useSiteSettings();
  const whatsappUrl = buildWhatsappUrl(contacts.whatsappNumber, contacts.whatsappText);
  // HAND-EXTENSION: state for More dropdown + mobile drawer + outside-click close.
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [moreOpen]);

  return (
    <>
      <div className={HEADER_VARIANTS[variant]}>
        <Link href="/">
          <img
            alt={`${general.shortName} logo`}
            fetchPriority="high"
            width={1684}
            height={686}
            decoding="async"
            data-nimg="1"
            className="h-14 w-fit self-center object-contain"
            style={{ color: 'transparent' }}
            src={general.logoUrl}
          />
        </Link>
        {/* HAND-EXTENSION: hamburger opens the mobile drawer (original
            HomePageMobileNavbar — right slide-in panel, chunk 7168). */}
        <button className="lg:hidden" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
          <svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="4" width="22" height="2" rx="1" fill="#333"></rect>
            <rect x="1" y="11" width="22" height="2" rx="1" fill="#333"></rect>
            <rect x="1" y="18" width="22" height="2" rx="1" fill="#333"></rect>
          </svg>
        </button>
        <ul className="hidden flex-1 items-center justify-end gap-16 text-primaryTextColor lg:flex">
          <li
            className="relative flex h-full cursor-pointer select-none items-center gap-1"
            id="link_wedding_venues_container"
          >
            <a id="link_wedding_venues" target="_blank" href="/wedding-venues">
              Vantara Venues
            </a>
          </li>
          <li
            className="relative flex h-full cursor-pointer select-none items-center gap-1"
            id="link_refund_policy_container"
          >
            <a id="link_refund_policy" target="_blank" href="/price-beat-challenge">
              Price Beat Challenge
            </a>
          </li>
          {/* HAND-EXTENSION: More li toggles the dropdown (original handleToggleNavbar). */}
          <li
            ref={moreRef}
            className="relative flex h-full cursor-pointer select-none items-center gap-1"
            id="other_services_dropdown_container"
            onClick={() => setMoreOpen((o) => !o)}
          >
            <span id="other_services_dropdown">More</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="20"
              fill="#333"
              className={`-rotate-90 scale-[0.6] transition-transform duration-200 ease-linear ${moreOpen ? 'rotate-90' : ''}`}
            >
              <path d="M9.125 19.1.7 10.7a.871.871 0 0 1-.212-.325A1.098 1.098 0 0 1 .425 10c0-.133.02-.258.063-.375A.872.872 0 0 1 .7 9.3L9.125.875c.233-.233.525-.35.875-.35s.65.125.9.375.375.542.375.875a1.2 1.2 0 0 1-.375.875L3.55 10l7.35 7.35c.233.233.35.52.35.862 0 .342-.125.638-.375.888a1.2 1.2 0 0 1-.875.375 1.2 1.2 0 0 1-.875-.375Z"></path>
            </svg>
            {/* HAND-EXTENSION: dropdown panel — classes are the tailwind-merge result
                of original base + outerClassName (module 53931 / chunk 7168):
                base `absolute right-0 top-12 flex w-[250px] ... bg-white ...` merged with
                `w-fit bg-[rgba(255,255,255,0.80)] backdrop-blur-[2px] mt-1`
                (later utilities win: w-fit, translucent bg). */}
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  variants={panelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 top-12 z-20 flex w-fit flex-col overflow-hidden rounded-[10px] border border-gray-200 bg-[rgba(255,255,255,0.80)] py-2 font-plus-jakarata-sans backdrop-blur-[2px] mt-1"
                >
                  {MORE_ITEMS.map((item) => (
                    <motion.div
                      key={item.testId ?? item.label}
                      variants={itemVariants}
                      id={item.testId}
                      className={
                        item.isHeader
                          ? 'whitespace-nowrap px-4 cursor-default py-1 text-left text-xs !font-bold text-[#737985]'
                          : 'whitespace-nowrap px-4 py-2 text-left ml-3 cursor-pointer text-sm font-medium text-[#414B58] hover:bg-lightPink hover:text-appTheme'
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!item.isHeader && item.href) {
                          // original behaviour: window.open(href, '_blank') for all items
                          window.open(item.href, '_blank');
                        }
                        setMoreOpen(false);
                      }}
                    >
                      {item.label}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        </ul>
      </div>

      {/* HAND-EXTENSION: mobile drawer (original HomePageMobileNavbar, chunk 7168 —
          w-[90vw] right panel with cream gradient, nav lists + WhatsApp/Quote CTAs).
          TODO-VANTARA: verify backdrop/animation against original in Stage 4 pass;
          "Get free Quote" opens the lead form (router query leadform=true) — wired
          together with the funnel (Stage 7). */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 z-[200] flex h-full w-[90vw] flex-col bg-[linear-gradient(180deg,rgba(255,253,232,0.00)_0.05%,rgba(249,242,176,0.36)_99.95%)]"
          >
            <div className="flex justify-between px-4 py-4">
              <Link href="/">
                <img
                  alt={`${general.shortName} logo`}
                  className="h-14 w-fit self-center object-contain"
                  src={general.logoUrl}
                />
              </Link>
              <button aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="stroke-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-between px-4 py-6">
              <div>
                {MOBILE_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <ul className="flex flex-col gap-5">
                      <li className="text-[15px] text-secondary">{section.title}</li>
                      <ul className="space-y-4 px-3">
                        {section.items.map((item) => (
                          <li key={item.label} className="text-base">
                            {item.href ? (
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setDrawerOpen(false)}
                              >
                                {item.label}
                              </a>
                            ) : (
                              <span>{item.label}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </ul>
                    <div className="my-4 h-[1.5px] w-full bg-desertSand opacity-20" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 px-3">
                  <a
                    href={whatsappUrl ?? undefined}
                    aria-disabled={whatsappUrl ? undefined : true}
                    className="flex basis-1/2 items-center justify-center gap-2 rounded-full border-2 border-[#24B43B] bg-[#24B43B] py-2.5 text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                    id="menu-whatsapp-cta"
                  >
                    Whatsapp
                  </a>
                  <button
                    id="menu-proposal-cta"
                    className="flex basis-1/2 items-center justify-center gap-2 rounded-full border-2 border-TWCPrimaryTheme bg-TWCPrimaryTheme py-2.5 text-white"
                  >
                    Get free Quote
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
