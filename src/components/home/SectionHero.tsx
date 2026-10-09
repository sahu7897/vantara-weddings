/**
 * SectionHero — generated from docs/research/homepage/sections/home-page-revamp.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
  * Notes: hero + video carousels (keen)
 *
 * REGEN NOTE: the capture froze the hero mid-render (VideoCarousel mounts
 * videos lazily — only slides 0-1 were present; slides 2-4 were empty divs).
 * The Dots component, per-slide badge and lazy activeSet mounting below are
 * ported verbatim from the original `VideoCarousel` (chunk 7168); the slide
 * dataset itself now lives in DEFAULT_HERO_CONTENT (src/services/cmsData.ts,
 * mirrored by the `hero` row in cms_sections) — keep these when merging
 * regeneration output.
 */
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/router';
import KeenSlider, { type KeenSliderInstance } from 'keen-slider';
import type { HeroSectionContent } from '@/lib/supabase/types';
import { DEFAULT_HERO_CONTENT } from '@/services/cmsData';
import { useSiteSettings } from '@/lib/cms/siteSettings';
import { buildWhatsappUrl } from '@/lib/site/whatsapp';

type Variant = 0 | 1;

// HAND-EXTENSION: video carousels — replicates original `VideoCarousel`
// (chunk 7168): options {initial:0, slides:{perView:1}, loop, drag, mode:'snap'};
// slideChanged sets the active index, grows the lazy-mount activeSet
// (t and (t+1)%len), plays the active slide's video and pauses the others;
// a video that ends advances the slider (handleVideoEnded -> slider.next());
// Dots render slider.slides.length buttons, click -> slider.moveToIdx(i).
// State is per variant (mobile = 0, desktop = 1) because the original page
// mounts two independent VideoCarousel instances.
export default function SectionHero({ content }: { content?: HeroSectionContent } = {}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slidersRef = useRef<KeenSliderInstance[]>([]);
  const router = useRouter();

  const slides = content?.slides && content.slides.length > 0 ? content.slides : DEFAULT_HERO_CONTENT.slides;

  // CMS-overridable copy + the effective WhatsApp target. This hero previously
  // hardcoded the original wedding-company WhatsApp number in both CTAs.
  const { contacts } = useSiteSettings();
  const whatsappUrl = buildWhatsappUrl(contacts.whatsappNumber, contacts.whatsappText);
  const ctaLabel =
    content?.primaryCtaText || DEFAULT_HERO_CONTENT.primaryCtaText || 'Start my wedding planning';

  // HAND-EXTENSION: "Start my wedding planning" (ids desktop/mobile-go-to-
  // planning-section) opens the lead-form view — original openLeadFormView()
  // (router query leadform=true -> homepage LeadForm overlay host).
  const openLeadForm = () => {
    const targetLink = content?.primaryCtaLink || '/?leadform=true';
    if (targetLink.startsWith('/?')) {
      router.push({ pathname: '/', query: { leadform: 'true' } }, undefined, { shallow: true });
    } else {
      router.push(targetLink);
    }
  };
  const [activeIdxs, setActiveIdxs] = useState<[number, number]>([0, 0]);
  const [activeSets, setActiveSets] = useState<[Set<number>, Set<number>]>(() => [
    new Set([0, 1]),
    new Set([0, 1]),
  ]);
  // undefined => renders 1 dot (original SSR: slider?.slides.length === undefined
  // -> Array(undefined) is a 1-element array); set to slider.slides.length after init.
  const [dotsCount, setDotsCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const instances: KeenSliderInstance[] = [];
    Array.from(root.querySelectorAll<HTMLElement>('.keen-slider')).forEach((el, variant) => {
      const slider = new KeenSlider(el, {
        initial: 0,
        slides: { perView: 1 },
        loop: true,
        drag: true,
        mode: 'snap',
        slideChanged(s) {
          const rel = s.track.details.rel;
          setActiveIdxs((prev) => {
            const next: [number, number] = [prev[0], prev[1]];
            next[variant] = rel;
            return next;
          });
          setActiveSets((prev) => {
            const next: [Set<number>, Set<number>] = [new Set(prev[0]), new Set(prev[1])];
            next[variant].add(rel);
            next[variant].add((rel + 1) % slides.length);
            return next;
          });
          el.querySelectorAll<HTMLElement>('.keen-slider__slide').forEach((slide, i) => {
            const v = slide.querySelector('video');
            if (!v) return;
            if (i === rel) void v.play().catch(() => undefined);
            else v.pause();
          });
        },
      });
      instances.push(slider);
      setDotsCount(slider.slides.length);
    });
    slidersRef.current = instances;
    return () => {
      instances.forEach((s) => s.destroy());
      slidersRef.current = [];
    };
  }, [slides.length]);

  const handleEnded = (e: SyntheticEvent<HTMLVideoElement>) => {
    const container = e.currentTarget.closest('.keen-slider');
    if (!container) return;
    const containers = Array.from(rootRef.current?.querySelectorAll('.keen-slider') ?? []);
    const idx = containers.indexOf(container);
    if (idx >= 0) slidersRef.current[idx]?.next();
  };

  const renderSlides = (variant: Variant) =>
    slides.map((slide, i) => (
      <div className="keen-slider__slide flex !min-w-full" key={slide.id}>
        {(i === 0 || activeSets[variant].has(i)) && (
          <video
            className="h-full w-full object-cover"
            playsInline
            autoPlay
            muted
            poster={slide.posterUrl}
            onEnded={handleEnded}
          >
            <source src={`${slide.mobileUrl}#t=0.01`} type="video/mp4" media="(max-width: 768px)" />
            <source src={`${slide.desktopUrl}#t=0.01`} type="video/mp4" media="(min-width: 769px)" />
          </video>
        )}
      </div>
    ));

  const renderBadge = (variant: Variant) => {
    const slide = slides[activeIdxs[variant]] || slides[0];
    if (!slide) return null;
    return (
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center px-4 pb-7 md:bottom-[42%] md:translate-y-1/2">
        <div className="flex items-center gap-2 rounded-lg bg-[#00000080] px-3 py-2 font-plus-jakarata-sans text-[12px] tracking-wide text-white md:text-[14px]">
          <p>{slide.coupleName}</p>
          <span className="h-1.5 w-1.5 rounded-full bg-white opacity-80"></span>
          <p>{slide.city}</p>
          <span className="h-1.5 w-1.5 rounded-full bg-white opacity-80"></span>
          <p>{slide.date}</p>
        </div>
      </div>
    );
  };

  // original `Dots` component (chunk 7168), verbatim classes
  const renderDots = (variant: Variant) => {
    const indexes =
      dotsCount === undefined ? [0] : Array.from({ length: dotsCount }, (_, i) => i);
    return (
      <div className="absolute bottom-0 left-2/4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-t-[4px] py-1 pb-2 md:bottom-[38%]">
        {indexes.map((i) => (
          <button
            key={i}
            onClick={() => slidersRef.current[variant]?.moveToIdx(i)}
            className={`h-1.5 w-1.5 rounded-full border border-white transition-transform${
              i === activeIdxs[variant] ? ' scale-125 bg-white' : ''
            }`}
          ></button>
        ))}
      </div>
    );
  };

  return (
    <>
    <div id="home-page-revamp" ref={rootRef}>
                        <div className="flex h-[calc(100dvh-56px)] w-full flex-col space-y-2 bg-planMyWeddingForm px-4 pb-2 pt-4 transition-[height] duration-300 ease-linear md:hidden md:space-y-0 ">
                            <div className="relative flex-1 overflow-scroll">
                                <div className="mx-auto h-full w-full md:mt-1">
                                    <div className="keen-slider h-full overflow-hidden rounded-xl md:h-[calc(100vh-60px)] md:rounded-none">
                                        {renderSlides(0)}
                                <div className="absolute inset-0 h-full md:bg-[linear-gradient(180deg,rgba(18,9,9,0.00)_0%,rgba(18,9,9,0.00)_45.31%,rgba(18,9,9,0.40)_58.58%,rgba(18,9,9,0.50)_63.86%,rgba(18,9,9,0.60)_100%)]"></div>
                            </div>
                        </div>
                        {renderBadge(0)}
                        {renderDots(0)}
                    </div>
                    <div className="relative shrink-0 overflow-hidden"><img alt="Decorative background pattern" fetchPriority="high" width="500" height="500" decoding="async" data-nimg="1" className="absolute bottom-0 right-0 -z-0 object-contain " style={{color: 'transparent'}} src="/flowerbg.webp" />
                        <div className="font-playfair text-center text-[2.2rem] font-medium leading-tight xs:text-[2.5rem]"><span className="inline whitespace-nowrap md:text-4xl lg:text-5xl ">Crafting Memorable</span> <span className="md:relative md:inline-block">Weddings{/* */} </span></div>
                        <div className="flex mt-3 flex-col gap-3 xs:gap-6">
                            <div className="grid grid-cols-3 gap-0">
                                <div className="text-center md:text-start">
                                    <div className="font-moisette font-semibold md:mb-2 text-[#1A1A1A] text-xl md:text-[28px]">1,043+</div>
                                    <div className="text-xs md:text-sm text-[#1C2431] font-plus-jakarata-sans tracking-wide">weddings done</div>
                                </div>
                                <div className="text-center md:text-start">
                                    <div className="font-moisette font-semibold md:mb-2 text-[#1A1A1A] text-xl md:text-[28px]">4.8/5</div>
                                    <div className="text-xs md:text-sm text-[#1C2431] font-plus-jakarata-sans tracking-wide">google rating</div>
                                </div>
                                <div className="text-center md:text-start">
                                    <div className="font-moisette font-semibold md:mb-2 text-[#1A1A1A] text-xl md:text-[28px]">28,363+</div>
                                    <div className="text-xs md:text-sm text-[#1C2431] font-plus-jakarata-sans tracking-wide">venue partners</div>
                                </div>
                            </div>
                            <div className="flex w-full items-stretch gap-[9px]"><button onClick={openLeadForm} className="z-10 w-full bg-[linear-gradient(to_right,#9A2157,#A1285E,#BC2D6D,#A1285E,#9A2157)] font-plus-jakarata-sans font-semibold text-white transition-colors duration-200 hover:bg-[#7D2049] rounded-2xl py-4 text-base" id="mobile-go-to-planning-section"><div className="flex items-center justify-center gap-2">{<span>{ctaLabel}</span>}</div></button>
                                <a href={whatsappUrl ?? undefined} aria-disabled={whatsappUrl ? undefined : true} target="_blank" rel="noopener noreferrer" id="homepage-mobile-hero-whatsapp-cta" aria-label="Chat with us on WhatsApp" className="z-10 flex shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#01C03D_0%,#008B32_100%)] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] w-[3.375rem]"><svg width="29" height="29" viewBox="0 0 28.9865 29.1164" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0.618515 14.4335C0.617835 16.888 1.25916 19.2846 2.47863 21.397L0.50189 28.6144L7.88801 26.6777C9.93092 27.7898 12.2198 28.3726 14.5458 28.3727H14.552C22.2306 28.3727 28.4811 22.1245 28.4844 14.4445C28.4859 10.723 27.0379 7.22358 24.4071 4.5908C21.7768 1.95823 18.2787 0.507665 14.5514 0.505966C6.8719 0.505966 0.621799 6.75391 0.618628 14.4335" fill="url(#:Rla9956:-green)"></path><path d="M0.121154 14.4271C0.120362 16.9699 0.784673 19.4522 2.04762 21.6402L0 29.1164L7.65096 27.1103C9.75905 28.2597 12.1325 28.8657 14.5477 28.8666H14.5539C22.508 28.8666 28.9831 22.3935 28.9865 14.4387C28.9878 10.5835 27.4878 6.95823 24.7631 4.23112C22.038 1.50435 18.4147 0.0015852 14.5539 0C6.5985 0 0.124325 6.47214 0.121154 14.4271ZM4.67758 21.2634L4.39191 20.8099C3.191 18.9004 2.55715 16.6938 2.55806 14.428C2.56055 7.81605 7.94162 2.43668 14.5585 2.43668C17.7628 2.43804 20.7743 3.68717 23.0393 5.95355C25.3042 8.22016 26.5505 11.2332 26.5497 14.4378C26.5468 21.0497 21.1656 26.4298 14.5539 26.4298H14.5492C12.3964 26.4287 10.285 25.8505 8.44367 24.758L8.00548 24.4981L3.46524 25.6885L4.67758 21.2634Z" fill="url(#:Rla9956:-white)"></path><path d="M10.9464 8.40083C10.6763 7.80038 10.3919 7.78826 10.135 7.77773C9.92465 7.76867 9.68415 7.76935 9.44388 7.76935C9.20339 7.76935 8.81263 7.85982 8.48235 8.22045C8.15172 8.58143 7.22008 9.45374 7.22008 11.2279C7.22008 13.0021 8.51235 14.7168 8.6925 14.9577C8.87287 15.198 11.1873 18.9554 14.8527 20.4009C17.899 21.6021 18.5189 21.3632 19.1801 21.303C19.8413 21.243 21.3137 20.4309 21.6141 19.5888C21.9148 18.7469 21.9148 18.0251 21.8246 17.8743C21.7345 17.7241 21.494 17.6338 21.1334 17.4536C20.7727 17.2733 18.9997 16.4008 18.6692 16.2804C18.3385 16.1601 18.0982 16.1001 17.8577 16.4612C17.6172 16.8217 16.9266 17.6338 16.7161 17.8743C16.5058 18.1154 16.2953 18.1454 15.9348 17.965C15.574 17.7841 14.4126 17.4037 13.0347 16.1753C11.9627 15.2194 11.2389 14.039 11.0285 13.678C10.8181 13.3174 11.006 13.122 11.1868 12.9423C11.3488 12.7807 11.5476 12.5212 11.728 12.3107C11.9078 12.1001 11.9679 11.9499 12.0881 11.7094C12.2085 11.4686 12.1482 11.258 12.0582 11.0777C11.9679 10.8973 11.2671 9.11383 10.9464 8.40083Z" fill="white"></path><defs><linearGradient id=":Rla9956:-green" x1="14.4931" y1="28.6144" x2="14.4931" y2="0.505966" gradientUnits="userSpaceOnUse"><stop stopColor="#1FAF38"></stop><stop offset="1" stopColor="#60D669"></stop></linearGradient><linearGradient id=":Rla9956:-white" x1="14.4932" y1="29.1164" x2="14.4932" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#F9F9F9"></stop><stop offset="1" stopColor="white"></stop></linearGradient></defs></svg></a>
                            </div>
                        </div>
                        <div className="flex w-full justify-center"><img alt="Scroll for more content" loading="lazy" width="40" height="40" decoding="async" data-nimg="1" style={{color: 'transparent'}} src="/arrows_more_down.svg" /></div>
                    </div>
            </div>
            <div className="relative hidden h-[100dvh-56px] w-full bg-homepageGradientBackground md:block">
                <div className="mx-auto h-full w-full md:mt-1">
                    <div className="keen-slider h-full overflow-hidden rounded-xl md:h-[calc(100vh-60px)] md:rounded-none">
                        {renderSlides(1)}
                <div className="absolute inset-0 h-full md:bg-[linear-gradient(180deg,rgba(18,9,9,0.00)_0%,rgba(18,9,9,0.00)_45.31%,rgba(18,9,9,0.40)_58.58%,rgba(18,9,9,0.50)_63.86%,rgba(18,9,9,0.60)_100%)]"></div>
            </div>
        </div>
        {renderBadge(1)}
        {renderDots(1)}
        <div className="absolute top-[68%] w-full pt-4 lg:px-48 ">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"></div>
            <div className="relative flex items-start  justify-center gap-24 px-8">
                <div className="font-playfair relative flex max-w-[600px] flex-col gap-3 text-5xl text-white lg:text-[5rem]"><span className="inline whitespace-nowrap md:text-4xl lg:text-5xl ">Crafting Memorable</span> <span className="md:relative md:inline-block">Weddings{/* */} <span className="absolute -top-0 right-[0.7em] h-6 w-6"><img alt="alt" loading="lazy" decoding="async" data-nimg="fill" className="object-contain" style={{position: 'absolute', height: '100%', width: '100%', left: '0', top: '0', right: '0', bottom: '0', color: 'transparent'}} src="/sparkle.svg" /></span>
                    <span className="absolute right-[0.6em] top-5 h-4 w-4"><img alt="alt" loading="lazy" decoding="async" data-nimg="fill" className="object-contain" style={{position: 'absolute', height: '100%', width: '100%', left: '0', top: '0', right: '0', bottom: '0', color: 'transparent'}} src="/sparkle.svg" /></span>
                        </span>
                </div>
                <div className="flex min-w-[400px] flex-col items-center gap-6">
                    <div className="grid grid-cols-3 gap-8">
                        <div className="text-center md:text-start">
                            <div className="font-moisette font-semibold md:mb-2 text-white text-xl md:text-[28px]">1,043+</div>
                            <div className="text-xs md:text-sm text-white font-plus-jakarata-sans tracking-wide">weddings done</div>
                        </div>
                        <div className="text-center md:text-start">
                            <div className="font-moisette font-semibold md:mb-2 text-white text-xl md:text-[28px]">4.8/5</div>
                            <div className="text-xs md:text-sm text-white font-plus-jakarata-sans tracking-wide">google rating</div>
                        </div>
                        <div className="text-center md:text-start">
                            <div className="font-moisette font-semibold md:mb-2 text-white text-xl md:text-[28px]">28,363+</div>
                            <div className="text-xs md:text-sm text-white font-plus-jakarata-sans tracking-wide">venue partners</div>
                        </div>
                    </div>
                    <div className="flex w-full items-stretch gap-3"><button onClick={openLeadForm} className="z-10 w-full bg-[linear-gradient(to_right,#9A2157,#A1285E,#BC2D6D,#A1285E,#9A2157)] font-plus-jakarata-sans text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7D2049] rounded-2xl py-4" id="desktop-go-to-planning-section"><div className="flex items-center justify-center gap-2">{<span>{ctaLabel}</span>}<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"></path></svg></div></button>
                        <a href={whatsappUrl ?? undefined} aria-disabled={whatsappUrl ? undefined : true} target="_blank" rel="noopener noreferrer" id="homepage-desktop-hero-whatsapp-cta" aria-label="Chat with us on WhatsApp" className="z-10 flex shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#01C03D_0%,#008B32_100%)] shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] w-[3.875rem]"><svg width="29" height="29" viewBox="0 0 28.9865 29.1164" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0.618515 14.4335C0.617835 16.888 1.25916 19.2846 2.47863 21.397L0.50189 28.6144L7.88801 26.6777C9.93092 27.7898 12.2198 28.3726 14.5458 28.3727H14.552C22.2306 28.3727 28.4811 22.1245 28.4844 14.4445C28.4859 10.723 27.0379 7.22358 24.4071 4.5908C21.7768 1.95823 18.2787 0.507665 14.5514 0.505966C6.8719 0.505966 0.621799 6.75391 0.618628 14.4335" fill="url(#:Rlah956:-green)"></path><path d="M0.121154 14.4271C0.120362 16.9699 0.784673 19.4522 2.04762 21.6402L0 29.1164L7.65096 27.1103C9.75905 28.2597 12.1325 28.8657 14.5477 28.8666H14.5539C22.508 28.8666 28.9831 22.3935 28.9865 14.4387C28.9878 10.5835 27.4878 6.95823 24.7631 4.23112C22.038 1.50435 18.4147 0.0015852 14.5539 0C6.5985 0 0.124325 6.47214 0.121154 14.4271ZM4.67758 21.2634L4.39191 20.8099C3.191 18.9004 2.55715 16.6938 2.55806 14.428C2.56055 7.81605 7.94162 2.43668 14.5585 2.43668C17.7628 2.43804 20.7743 3.68717 23.0393 5.95355C25.3042 8.22016 26.5505 11.2332 26.5497 14.4378C26.5468 21.0497 21.1656 26.4298 14.5539 26.4298H14.5492C12.3964 26.4287 10.285 25.8505 8.44367 24.758L8.00548 24.4981L3.46524 25.6885L4.67758 21.2634Z" fill="url(#:Rlah956:-white)"></path><path d="M10.9464 8.40083C10.6763 7.80038 10.3919 7.78826 10.135 7.77773C9.92465 7.76867 9.68415 7.76935 9.44388 7.76935C9.20339 7.76935 8.81263 7.85982 8.48235 8.22045C8.15172 8.58143 7.22008 9.45374 7.22008 11.2279C7.22008 13.0021 8.51235 14.7168 8.6925 14.9577C8.87287 15.198 11.1873 18.9554 14.8527 20.4009C17.899 21.6021 18.5189 21.3632 19.1801 21.303C19.8413 21.243 21.3137 20.4309 21.6141 19.5888C21.9148 18.7469 21.9148 18.0251 21.8246 17.8743C21.7345 17.7241 21.494 17.6338 21.1334 17.4536C20.7727 17.2733 18.9997 16.4008 18.6692 16.2804C18.3385 16.1601 18.0982 16.1001 17.8577 16.4612C17.6172 16.8217 16.9266 17.6338 16.7161 17.8743C16.5058 18.1154 16.2953 18.1454 15.9348 17.965C15.574 17.7841 14.4126 17.4037 13.0347 16.1753C11.9627 15.2194 11.2389 14.039 11.0285 13.678C10.8181 13.3174 11.006 13.122 11.1868 12.9423C11.3488 12.7807 11.5476 12.5212 11.728 12.3107C11.9078 12.1001 11.9679 11.9499 12.0881 11.7094C12.2085 11.4686 12.1482 11.258 12.0582 11.0777C11.9679 10.8973 11.2671 9.11383 10.9464 8.40083Z" fill="white"></path><defs><linearGradient id=":Rlah956:-green" x1="14.4931" y1="28.6144" x2="14.4931" y2="0.505966" gradientUnits="userSpaceOnUse"><stop stopColor="#1FAF38"></stop><stop offset="1" stopColor="#60D669"></stop></linearGradient><linearGradient id=":Rlah956:-white" x1="14.4932" y1="29.1164" x2="14.4932" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#F9F9F9"></stop><stop offset="1" stopColor="white"></stop></linearGradient></defs></svg></a>
                    </div>
                </div>
            </div>
            <div className="flex w-full justify-center"><img alt="Scroll for more content" loading="lazy" width="60" height="60" decoding="async" data-nimg="1" style={{color: 'transparent'}} src="/arrows_more_down.svg" /></div>
        </div>
        </div>
        </div>
    </>
  );
}
