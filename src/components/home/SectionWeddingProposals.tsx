/**
 * SectionWeddingProposals — generated from docs/research/homepage/sections/wedding_proposals_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
  * Notes: keen auto-advance slider
 */
import { useEffect, useRef } from 'react';
import KeenSlider, { type KeenSliderInstance } from 'keen-slider';

// HAND-EXTENSION: ProposalSlider — replicates original WeddingProposalsSection
// (chunk 7168): {renderMode:'performance', initial:0, loop:true} plus the
// 2s auto-advance plugin (mouseover pauses, mouseout/drag/animation resume),
// and the prev/next arrow clicks (stopPropagation + slider.prev()/next()).
export default function SectionWeddingProposals() {
  const rootRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<KeenSliderInstance | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const container = root?.querySelector<HTMLElement>('.keen-slider');
    if (!root || !container) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;
    const clear = () => {
      if (timer) clearTimeout(timer);
    };
    const arm = () => {
      clear();
      if (!paused) timer = setTimeout(() => sliderRef.current?.next(), 2000);
    };

    const slider = new KeenSlider(container, {
      renderMode: 'performance',
      initial: 0,
      loop: true,
    });
    sliderRef.current = slider;

    const onOver = () => {
      paused = true;
      clear();
    };
    const onOut = () => {
      paused = false;
      arm();
    };
    container.addEventListener('mouseover', onOver);
    container.addEventListener('mouseout', onOut);
    slider.on('dragStarted', clear);
    slider.on('animationEnded', arm);
    slider.on('updated', arm);
    arm();

    const [prevEl, nextEl] = Array.from(
      root.querySelectorAll<HTMLElement>('div.hidden.scale-75.cursor-pointer'),
    );
    const onPrev = (e: MouseEvent) => {
      e.stopPropagation();
      sliderRef.current?.prev();
    };
    const onNext = (e: MouseEvent) => {
      e.stopPropagation();
      sliderRef.current?.next();
    };
    prevEl?.addEventListener('click', onPrev);
    nextEl?.addEventListener('click', onNext);

    return () => {
      clear();
      container.removeEventListener('mouseover', onOver);
      container.removeEventListener('mouseout', onOut);
      prevEl?.removeEventListener('click', onPrev);
      nextEl?.removeEventListener('click', onNext);
      slider.destroy();
      sliderRef.current = null;
    };
  }, []);

  return (
    <>
    <section ref={rootRef} className="relative flex w-full flex-col items-center gap-5 bg-[linear-gradient(180deg,rgba(255,239,244,0.00)_7.21%,rgba(255,239,244,0.70)_70.13%)] pt-5 lg:gap-10" id="wedding_proposals_section">
            <div className="flex items-center gap-0 lg:gap-8"><svg width="86" height="10" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className="hidden scale-[0.6] lg:block lg:scale-100"><mask id="DecorationStick_svg__b" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="86" height="10"><path transform="matrix(1 0 0 -1 .5 9.5)" fill="url(#DecorationStick_svg__a)" d="M0 0h85.069v9H0z"></path></mask><g mask="url(#DecorationStick_svg__b)"><path fill="#B38E4B" d="M86.633-.84v11.68H-.961V-.84z"></path></g><defs><pattern id="DecorationStick_svg__a" patternContentUnits="objectBoundingBox" width="1" height="1"><use xlinkHref="#DecorationStick_svg__c" transform="scale(.00145 .0137)"></use></pattern><image id="DecorationStick_svg__c" width="690" height="73" xlinkHref="/brand/inline/SectionHowItWorks-inline-1.webp"></image></defs></svg>
                <p className="font-playfair text-2xl font-semibold lg:text-5xl">Sample wedding proposal</p><svg width="86" height="10" fill="none" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className="hidden scale-[0.6] lg:block lg:scale-100"><mask id="DecorationStick_svg__b" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="86" height="10"><path transform="matrix(1 0 0 -1 .5 9.5)" fill="url(#DecorationStick_svg__a)" d="M0 0h85.069v9H0z"></path></mask><g mask="url(#DecorationStick_svg__b)"><path fill="#B38E4B" d="M86.633-.84v11.68H-.961V-.84z"></path></g><defs><pattern id="DecorationStick_svg__a" patternContentUnits="objectBoundingBox" width="1" height="1"><use xlinkHref="#DecorationStick_svg__c" transform="scale(.00145 .0137)"></use></pattern><image id="DecorationStick_svg__c" width="690" height="73" xlinkHref="/brand/inline/SectionHowItWorks-inline-1.webp"></image></defs></svg></div>
            <div className="relative flex w-full items-center gap-x-2 px-2 md:h-4/5 md:w-[55%] md:px-0">
                <div className="hidden scale-75 cursor-pointer md:block md:scale-[1.15]"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="20" fill="#333" className="fill-[#909090]"><path d="M9.125 19.1.7 10.7a.871.871 0 0 1-.212-.325A1.098 1.098 0 0 1 .425 10c0-.133.02-.258.063-.375A.872.872 0 0 1 .7 9.3L9.125.875c.233-.233.525-.35.875-.35s.65.125.9.375.375.542.375.875a1.2 1.2 0 0 1-.375.875L3.55 10l7.35 7.35c.233.233.35.52.35.862 0 .342-.125.638-.375.888a1.2 1.2 0 0 1-.875.375 1.2 1.2 0 0 1-.875-.375Z"></path></svg></div>
                <div className="keen-slider">
                    <div className="keen-slider__slide px-1 md:px-2"><img alt="Slide 0" loading="lazy" width="1920" height="1080" decoding="async" data-nimg="1" className="object-contain" style={{color: 'transparent'}} src="/media/1.28919306.webp" /></div>
                    <div className="keen-slider__slide px-1 md:px-2"><img alt="Slide 1" loading="lazy" width="1920" height="1080" decoding="async" data-nimg="1" className="object-contain" style={{color: 'transparent'}} src="/media/2.78471c2c.webp" /></div>
                    <div className="keen-slider__slide px-1 md:px-2"><img alt="Slide 2" loading="lazy" width="1920" height="1080" decoding="async" data-nimg="1" className="object-contain" style={{color: 'transparent'}} src="/media/3.2443e50a.webp" /></div>
                    <div className="keen-slider__slide px-1 md:px-2"><img alt="Slide 3" loading="lazy" width="1920" height="1080" decoding="async" data-nimg="1" className="object-contain" style={{color: 'transparent'}} src="/media/4.a93956bd.webp" /></div>
                    </div>
                    <div className="hidden scale-75 cursor-pointer md:block md:scale-[1.15]"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="20" fill="#333" className="rotate-180 fill-[#909090]"><path d="M9.125 19.1.7 10.7a.871.871 0 0 1-.212-.325A1.098 1.098 0 0 1 .425 10c0-.133.02-.258.063-.375A.872.872 0 0 1 .7 9.3L9.125.875c.233-.233.525-.35.875-.35s.65.125.9.375.375.542.375.875a1.2 1.2 0 0 1-.375.875L3.55 10l7.35 7.35c.233.233.35.52.35.862 0 .342-.125.638-.375.888a1.2 1.2 0 0 1-.875.375 1.2 1.2 0 0 1-.875-.375Z"></path></svg></div>
                    </div>
                    <p className="whitespace-pre-wrap px-4 pb-6 text-center text-base text-secondary md:px-0 md:pb-4 md:text-xl lg:w-1/3 ">This is just an example of a personalized proposal. We’ll create a new one for you as per your requirements.</p>
                    <div className="absolute inset-x-0 bottom-0 z-50 translate-y-full">
                        <div className="relative w-full scale-[-1]"><img alt="" loading="lazy" width="100" height="8" decoding="async" data-nimg="1" className="max-h-20 w-full object-cover object-top opacity-70" style={{color: 'transparent'}} src="/images/HomePage/new/pink-curve.svg" /></div>
                    </div>
        </section>
    </>
  );
}
