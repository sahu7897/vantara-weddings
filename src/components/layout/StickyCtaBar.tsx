/**
 * StickyCtaBar — generated from docs/research/homepage/sections/sticky_cta_bar.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
  * Notes: floating WhatsApp + CTA
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useSiteSettings } from '@/lib/cms/siteSettings';
import { buildWhatsappUrl } from '@/lib/site/whatsapp';

// HAND-EXTENSION: reveal behaviour — original WPTFloatingCTAHomePage
// (chunks__pages__index): `show={!inView}` from a useInView(ref on
// #home-page-revamp, initialInView:true) + framer-motion y 100%→0% linear,
// i.e. the bar stays hidden while the hero is on screen and slides up
// once the hero scrolls out of view. Implemented with IntersectionObserver.
// HAND-EXTENSION (was TODO-VANTARA Stage 7): onClick -> openLeadFormView()
// (router query leadform=true -> homepage LeadForm overlay host).
export default function StickyCtaBar() {
  const [show, setShow] = useState(false);
  const router = useRouter();
  // Effective (CMS-overridable) WhatsApp target — was hardcoded to the original
  // wedding-company number.
  const { contacts } = useSiteSettings();
  const whatsappUrl = buildWhatsappUrl(contacts.whatsappNumber, contacts.whatsappText);

  const openLeadForm = () => {
    router.push({ pathname: '/', query: { leadform: 'true' } }, undefined, { shallow: true });
  };

  useEffect(() => {
    const hero = document.getElementById('home-page-revamp');
    if (!hero) return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting));
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <>

        <motion.div initial={{ y: '100%' }} animate={{ y: show ? '0%' : '100%' }} transition={{ type: 'tween', ease: 'linear' }} className="fixed bottom-0 left-0 right-0 z-50 flex h-16 flex-row-reverse justify-center gap-[9px] bg-white bg-opacity-50 px-4 py-0 pb-2 md:gap-3 lg:h-20 lg:gap-4 lg:py-3"><a href={whatsappUrl ?? undefined} aria-disabled={whatsappUrl ? undefined : true} target="_blank" rel="noopener noreferrer" id="sticky_whatsapp" aria-label="Chat with us on WhatsApp" className="flex h-full w-[3.375rem] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#01C03D_0%,#008B32_100%)] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] md:w-60 md:gap-4 md:rounded-2xl md:bg-[#1FAF38] md:bg-none md:text-xl md:font-bold md:text-white md:shadow-[0px_6px_15px_0px_rgba(0,0,0,0.20)]"><svg width="29" height="29" viewBox="0 0 28.9865 29.1164" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:hidden" aria-hidden="true"><path d="M0.618515 14.4335C0.617835 16.888 1.25916 19.2846 2.47863 21.397L0.50189 28.6144L7.88801 26.6777C9.93092 27.7898 12.2198 28.3726 14.5458 28.3727H14.552C22.2306 28.3727 28.4811 22.1245 28.4844 14.4445C28.4859 10.723 27.0379 7.22358 24.4071 4.5908C21.7768 1.95823 18.2787 0.507665 14.5514 0.505966C6.8719 0.505966 0.621799 6.75391 0.618628 14.4335" fill="url(#:R5n956:-green)"></path><path d="M0.121154 14.4271C0.120362 16.9699 0.784673 19.4522 2.04762 21.6402L0 29.1164L7.65096 27.1103C9.75905 28.2597 12.1325 28.8657 14.5477 28.8666H14.5539C22.508 28.8666 28.9831 22.3935 28.9865 14.4387C28.9878 10.5835 27.4878 6.95823 24.7631 4.23112C22.038 1.50435 18.4147 0.0015852 14.5539 0C6.5985 0 0.124325 6.47214 0.121154 14.4271ZM4.67758 21.2634L4.39191 20.8099C3.191 18.9004 2.55715 16.6938 2.55806 14.428C2.56055 7.81605 7.94162 2.43668 14.5585 2.43668C17.7628 2.43804 20.7743 3.68717 23.0393 5.95355C25.3042 8.22016 26.5505 11.2332 26.5497 14.4378C26.5468 21.0497 21.1656 26.4298 14.5539 26.4298H14.5492C12.3964 26.4287 10.285 25.8505 8.44367 24.758L8.00548 24.4981L3.46524 25.6885L4.67758 21.2634Z" fill="url(#:R5n956:-white)"></path><path d="M10.9464 8.40083C10.6763 7.80038 10.3919 7.78826 10.135 7.77773C9.92465 7.76867 9.68415 7.76935 9.44388 7.76935C9.20339 7.76935 8.81263 7.85982 8.48235 8.22045C8.15172 8.58143 7.22008 9.45374 7.22008 11.2279C7.22008 13.0021 8.51235 14.7168 8.6925 14.9577C8.87287 15.198 11.1873 18.9554 14.8527 20.4009C17.899 21.6021 18.5189 21.3632 19.1801 21.303C19.8413 21.243 21.3137 20.4309 21.6141 19.5888C21.9148 18.7469 21.9148 18.0251 21.8246 17.8743C21.7345 17.7241 21.494 17.6338 21.1334 17.4536C20.7727 17.2733 18.9997 16.4008 18.6692 16.2804C18.3385 16.1601 18.0982 16.1001 17.8577 16.4612C17.6172 16.8217 16.9266 17.6338 16.7161 17.8743C16.5058 18.1154 16.2953 18.1454 15.9348 17.965C15.574 17.7841 14.4126 17.4037 13.0347 16.1753C11.9627 15.2194 11.2389 14.039 11.0285 13.678C10.8181 13.3174 11.006 13.122 11.1868 12.9423C11.3488 12.7807 11.5476 12.5212 11.728 12.3107C11.9078 12.1001 11.9679 11.9499 12.0881 11.7094C12.2085 11.4686 12.1482 11.258 12.0582 11.0777C11.9679 10.8973 11.2671 9.11383 10.9464 8.40083Z" fill="white"></path><defs><linearGradient id=":R5n956:-green" x1="14.4931" y1="28.6144" x2="14.4931" y2="0.505966" gradientUnits="userSpaceOnUse"><stop stopColor="#1FAF38"></stop><stop offset="1" stopColor="#60D669"></stop></linearGradient><linearGradient id=":R5n956:-white" x1="14.4932" y1="29.1164" x2="14.4932" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#F9F9F9"></stop><stop offset="1" stopColor="white"></stop></linearGradient></defs></svg><svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="hidden scale-125 md:block"><path fillRule="evenodd" clipRule="evenodd" d="M29.8 6.1C16-7.3-5.7 9.3 3.7 26.1l-2.4 8.7 8.8-2.3C27 41.4 43.1 19.8 29.8 6Z" fill="#fff"></path><path fillRule="evenodd" clipRule="evenodd" d="M18 32c-2.7 0-5.3-.9-7.6-2.3L5 31l1.5-5.2A14.1 14.1 0 0 1 28 7.9c8.8 8.8 2.5 24-10 24Z" fill="#66E066"></path><path fillRule="evenodd" clipRule="evenodd" d="m25.8 21.4-3-1.4c-.3-.1-.6-.2-.9.2L20.6 22c-.3.3-.5.3-1 .1-.8.1-5.5-3.8-5.7-5-.2-.4 0-.7.2-.9.4-.4.8-.9 1-1.4.2-.3.1-.6 0-.8l-1.3-3.1c-.3-.7-.6-.7-1-.7-.6 0-1.2-.2-1.9.5-2.5 2.4-1.3 5.8.3 7.9.2.3 2.9 4.7 7.2 6.4 3.6 1.4 4.3 1.1 5 1 .9 0 2.6-1 3-2 .3-1 .3-1.8.2-2-.1-.2-.4-.3-.8-.5Z" fill="#fff"></path></svg><span className="hidden md:inline">Chat with us</span></a>
            {/* HAND-EXTENSION: opens the lead-form view (was a dead static button). */}
            <button id="wpt-sticky-cta-homepage-desktop" onClick={openLeadForm} className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl bg-[linear-gradient(to_right,#9A2157,#A1285E,#BC2D6D,#A1285E,#9A2157)] py-7 text-center font-plus-jakarata-sans text-sm font-semibold text-white shadow-[0px_6px_15px_0px_rgba(0,0,0,0.20)] lg:w-1/4 lg:flex-none lg:text-lg lg:font-bold">Start my wedding planning</button>
        </motion.div>
    
    </>
  );
}
