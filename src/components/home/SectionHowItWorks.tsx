/**
 * SectionHowItWorks — generated from docs/research/homepage/sections/how_it_works_outer_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 
 */
import { useEffect, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';

// HAND-EXTENSION: scroll-driven step machine — the captured DOM froze the
// section at "step 1 active" (titles/descriptions/circles/images hardcoded).
// The original drives these states from scroll progress through the 200dvh
// outer section (inner sticky panel stays pinned for 100dvh): progress is
// split into thirds and the active step's copy/image crossfades in.
export default function SectionHowItWorks() {
  const outerRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  });

  const applyProgress = (v: number) => {
    const next: 1 | 2 | 3 = v < 1 / 3 ? 1 : v < 2 / 3 ? 2 : 3;
    setStep((prev) => (prev === next ? prev : next));
  };
  useMotionValueEvent(scrollYProgress, 'change', applyProgress);
  useEffect(() => {
    applyProgress(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Active/inactive class shorthands (captured states, now dynamic). */
  const titleCls = (active: boolean) =>
    `transition-all duration-500 ease-in-out font-playfair ${
      active
        ? 'mb-2 font-semibold text-xl text-neutral-900 lg:mb-5 lg:text-[40px] lg:leading-10'
        : 'font-semibold text-sm text-secondary lg:text-xl'
    }`;
  const descCls = (active: boolean) =>
    `transition-opacity duration-300 ease-linear text-base text-primaryTextColor lg:w-3/4 lg:text-xl ${
      active ? 'opacity-100' : 'opacity-0'
    }`;
  const dotCls = (active: boolean) =>
    `absolute left-0 top-0 z-10 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium transition-[background-color,color] duration-300 ease-linear lg:h-9 lg:w-9 lg:text-xl ${
      active ? 'bg-TWCPrimaryTheme text-white' : 'bg-footerGrey text-disabledColor'
    }`;

  return (
    <>
    <section className="h-[200dvh]" id="how_it_works_outer_section" ref={outerRef}>
            <section className="sticky top-0 flex h-[100dvh] flex-col items-center bg-[linear-gradient(180deg,#FFFEF8_0%,#FCF9D9_100%)] px-6 py-20 lg:py-14">
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-3 lg:gap-8"><svg width="86" height="10" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className="scale-[0.6] lg:scale-100"><mask id="DecorationStick_svg__b" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="86" height="10"><path transform="matrix(1 0 0 -1 .5 9.5)" fill="url(#DecorationStick_svg__a)" d="M0 0h85.069v9H0z"></path></mask><g mask="url(#DecorationStick_svg__b)"><path fill="#B38E4B" d="M86.633-.84v11.68H-.961V-.84z"></path></g><defs><pattern id="DecorationStick_svg__a" patternContentUnits="objectBoundingBox" width="1" height="1"><use xlinkHref="#DecorationStick_svg__c" transform="scale(.00145 .0137)"></use></pattern><image id="DecorationStick_svg__c" width="690" height="73" xlinkHref="/brand/inline/SectionHowItWorks-inline-1.webp"></image></defs></svg>
                        <p className="whitespace-nowrap text-center font-playfair text-2xl font-semibold lg:text-6xl">How it works</p><svg width="86" height="10" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className="scale-[0.6] lg:scale-100"><mask id="DecorationStick_svg__b" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="86" height="10"><path transform="matrix(1 0 0 -1 .5 9.5)" fill="url(#DecorationStick_svg__a)" d="M0 0h85.069v9H0z"></path></mask><g mask="url(#DecorationStick_svg__b)"><path fill="#B38E4B" d="M86.633-.84v11.68H-.961V-.84z"></path></g><defs><pattern id="DecorationStick_svg__a" patternContentUnits="objectBoundingBox" width="1" height="1"><use xlinkHref="#DecorationStick_svg__c" transform="scale(.00145 .0137)"></use></pattern><image id="DecorationStick_svg__c" width="690" height="73" xlinkHref="/brand/inline/SectionHowItWorks-inline-1.webp"></image></defs></svg></div>
                    <p className="whitespace-pre-wrap text-center text-base text-secondary lg:pt-2 lg:text-xl">Book your wedding service in 3 easy steps</p>
                </div>
                <div className="mx-auto mt-4 flex w-11/12 max-w-screen-xl flex-1 flex-col items-center justify-between gap-5 self-stretch lg:mt-12 lg:flex-row lg:gap-24">
                    <div className="relative my-auto aspect-square h-[220px] flex-shrink-0 decoration-blue-300 lg:h-[480px] lg:p-12"><img alt="" loading="lazy" width="678" height="679" decoding="async" data-nimg="1" className="absolute left-0 top-0 z-[-1] hidden h-full w-full opacity-70 lg:block" style={{color: 'transparent'}} src="/media/flower-pattern.420d88dc.webp" />
                        <div className="h-full w-full rounded-full bg-gradient-to-t from-[#FDF6EA] to-desertSand p-[1.5px] shadow-[0px_12.833px_102.664px_#fff]">
                            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#FCF7C8]">
                                {/* HAND-EXTENSION: images are absolutely stacked + crossfaded by
                                    scroll step (captured DOM had them in flow, so only step 1
                                    could ever show). pt on step 2 preserved from the capture. */}
                                <img src="/media/weddingStep1.a532ad30.webp" alt="" className={`absolute left-0 top-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${step === 1 ? 'opacity-100' : 'opacity-0'}`} />
                                <img src="/media/weddingStep2.9d688910.webp" alt="" className={`absolute left-0 top-0 h-full w-full object-cover pt-14 transition-opacity duration-500 ease-in-out lg:pt-[88px] ${step === 2 ? 'opacity-100' : 'opacity-0'}`} />
                                <img src="/media/weddingStep3.e7bf9f67.webp" alt="" className={`absolute left-0 top-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${step === 3 ? 'opacity-100' : 'opacity-0'}`} />
                            </div>
                        </div>
                    </div>
                    <div className="flex basis-1/2 flex-col items-center justify-center lg:-order-1">
                        <div className="relative border-neutral-900 pl-6 lg:pl-12 bg-[linear-gradient(to_bottom,#121212_50%,transparent_0%)] bg-[length:1px_12px] bg-left-bottom bg-repeat-y lg:bg-[length:1px_18px] pb-8 lg:pb-12">
                            <p className={titleCls(step === 1)}>Share your requirements</p>
                            <p className={descCls(step === 1)}>Tell us your event date, budget, location, type of venue, guest count, etc.</p>
                            <div className={dotCls(step === 1)} style={{transform: 'translateX(-18px) translateZ(0)'}}>1</div>
                            <div className={`absolute left-0 top-0 -z-10 h-7 w-7 rounded-full bg-TWCPrimaryTheme/30 transition-opacity duration-300 lg:h-9 lg:w-9 ${step === 1 ? 'opacity-100' : 'opacity-0'}`} style={{transform: 'translateX(-18px) scale(1.4) translateZ(0)'}}></div>
                        </div>
                        <div className="relative border-neutral-900 pl-6 lg:pl-12 bg-[linear-gradient(to_bottom,#121212_50%,transparent_0%)] bg-[length:1px_12px] bg-left-bottom bg-repeat-y lg:bg-[length:1px_18px]">
                            <p className={titleCls(step === 2)}>Get a personalised proposal</p>
                            <p className={descCls(step === 2)}>Get the best deals on venue, catering, and decor as per your preferences.</p>
                            <div className={dotCls(step === 2)} style={{transform: 'translateX(-18px) translateZ(0)'}}>2</div>
                            <div className={`absolute left-0 top-0 -z-10 h-7 w-7 rounded-full bg-TWCPrimaryTheme/30 transition-opacity duration-300 lg:h-9 lg:w-9 ${step === 2 ? 'opacity-100' : 'opacity-0'}`} style={{transform: 'translateX(-18px) scale(1.4) translateZ(0)'}}></div>
                        </div>
                        <div className="relative border-neutral-900 pl-6 lg:pl-12">
                            <p className={titleCls(step === 3)}>Confirm and book</p>
                            <p className={descCls(step === 3)}>Pay a minimum amount &amp; lock the deal within 7 days. Leave the rest to us.</p>
                            <div className={dotCls(step === 3)} style={{transform: 'translateX(-18px) translateZ(0)'}}>3</div>
                            <div className={`absolute left-0 top-0 -z-10 h-7 w-7 rounded-full bg-TWCPrimaryTheme/30 transition-opacity duration-300 lg:h-9 lg:w-9 ${step === 3 ? 'opacity-100' : 'opacity-0'}`} style={{transform: 'translateX(-18px) scale(1.4) translateZ(0)'}}></div>
                        </div>
                    </div>
                </div>
            </section>
        </section>
    </>
  );
}
