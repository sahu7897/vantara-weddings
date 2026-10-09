/**
 * SectionIndustryPartners — generated from docs/research/homepage/sections/industry_partners_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
  * Notes: keen autoplay logo strip
 */
import { useEffect, useRef } from 'react';
import KeenSlider from 'keen-slider';
import { useIsMobile } from '@/lib/useIsMobile';

// HAND-EXTENSION: auto-advancing logo strip — replicates original
// PartnerIndustrySection (chunk 7168): {renderMode:'performance', loop:true,
// mode:'free', slides:{perView:isMobile?3:5, spacing:30}} with a15s ease-linear
// moveToIdx(+5) on created/updated/animationEnded (data =5 logos x2 copies).
const PARTNER_ANIM = { duration: 15000, easing: (t: number) => t };

export default function SectionIndustryPartners() {
  const isMobile = useIsMobile();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = rootRef.current?.querySelector<HTMLElement>('.keen-slider');
    if (!container) return;
    const slider = new KeenSlider(container, {
      renderMode: 'performance',
      loop: true,
      mode: 'free',
      slides: { perView: isMobile ? 3 : 5, spacing: 30 },
      created(s) {
        s.moveToIdx(5, true, PARTNER_ANIM);
      },
      updated(s) {
        s.moveToIdx(s.track.details.abs + 5, true, PARTNER_ANIM);
      },
      animationEnded(s) {
        s.moveToIdx(s.track.details.abs + 5, true, PARTNER_ANIM);
      },
    });
    return () => slider.destroy();
  }, [isMobile]);

  return (
    <>
    <div className="w-full space-y-4 py-6 lg:space-y-6 lg:py-16" id="industry_partners_section" ref={rootRef}>
                        <p className="text-center text-base font-bold lg:text-3xl">Partnered with the best in the industry</p>
                        <div className="keen-slider flex items-center">
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="399" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-taj.cca019c4.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="1188" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-le-meridian.eb0700d2.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="524" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-leela.a8e74c58.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="913" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-ramada.672cfe9c.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="807" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-sara.e6ec524b.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="399" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-taj.cca019c4.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="1188" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-le-meridian.eb0700d2.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="524" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-leela.a8e74c58.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="913" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-ramada.672cfe9c.webp" /></div>
                            <div className="keen-slider__slide flex items-center justify-center"><img alt="" loading="lazy" width="807" height="396" decoding="async" data-nimg="1" className="aspect-auto h-20 object-contain" style={{color: 'transparent'}} src="/media/hotel-sara.e6ec524b.webp" /></div>
                        </div>
                    </div>
    </>
  );
}
