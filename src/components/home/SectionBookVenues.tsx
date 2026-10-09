/**
 * SectionBookVenues — generated from docs/research/homepage/sections/book_venues_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 */
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function SectionBookVenues() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  // HAND-EXTENSION: scroll-linked golden-border mask reveal — the capture
  // froze this section at mask-size 400px (compact arch card with the copy
  // clipped), i.e. the animation's start frame. The mask now opens with the
  // scroll (400px arch card -> full-bleed video + fully visible copy by the
  // time the section is centred) and closes again as the section exits.
  const maskSize = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ['400px 400px', '3000px 3000px', '600px 600px'],
  );
  // Dark overlay fades out as the mask opens so the black copy stays legible
  // on the full-bleed video; back to 30% while the arch closes on exit.
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.3, 0.04, 0.3]);

  return (
    <>
    <motion.div
      ref={ref}
      className="relative h-screen BookVenueSection_mask__hgol5"
      id="book_venues_section"
      style={{ maskSize, WebkitMaskSize: maskSize }}
    >
      {/* HAND-EXTENSION: captured ::before black overlay (opacity .3), now a
          real child so its opacity can follow the scroll (fades as the mask opens). */}
      <motion.div
        aria-hidden="true"
        className="absolute left-0 top-0 z-10 h-full w-full bg-black"
        style={{ opacity: overlayOpacity }}
      /><video className="relative h-full w-full object-cover" playsInline autoPlay muted loop><source src="/gcpimages/weddings/assets/amitarasaVenue.mp4" type="video/mp4" /></video>
            <div className="absolute left-1/2 top-1/2 z-20 w-full -translate-x-1/2 -translate-y-1/2 space-y-6 text-center lg:space-y-10">
                <div className="space-y-2 lg:space-y-6">
                    <p className="font-playfair text-3xl font-bold lg:text-7xl" style={{color: '#000000'}}>Book your venue</p>
                    <p className="whitespace-pre-wrap text-base  lg:text-xl" style={{color: '#000000'}}>Pick your date. Set your budget.
                        {/* */}
                        {/* */}Choose your venue.</p>
                {/* HAND-EXTENSION: CTA was a dead static button; now opens the real venue directory. */}
                </div><a href="/wedding-venues" className="group mx-auto flex w-full max-w-[75%] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-TWCPrimaryTheme px-10 py-4 text-base font-semibold text-white shadow-[0px_4px_10px_0px_rgba(0,0,0,0.10)] lg:w-fit lg:gap-5  lg:px-20 lg:py-4 lg:text-xl" id="venues-check-availability">Check availability<svg width="8" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-white transition-transform duration-500 group-hover:translate-x-[60%] lg:scale-125"><path d="M7.595 7.595a.842.842 0 0 0 0-1.19L2.24 1.049a.842.842 0 0 0-1.19 1.19L5.809 7l-4.76 4.761a.842.842 0 1 0 1.19 1.19l5.356-5.356ZM6 7.842h1V6.158H6v1.684Z"></path></svg></a></div>
        </motion.div>
    </>
  );
}
