/**
 * SectionVendorCta — generated from docs/research/homepage/sections/are_you_a_vendor_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 
 */
import type { VendorCtaSectionContent } from '@/lib/supabase/types';
import { DEFAULT_VENDOR_CTA_CONTENT } from '@/services/cmsData';

/** Copy + CTA target come from the home/vendor_cta CMS section. */
export default function SectionVendorCta({
  content,
}: {
  content?: VendorCtaSectionContent;
} = {}) {
  const headline = content?.headline || 'Are you a vendor?';
  const subheadline = content?.subheadline || 'Want to list your venue or wedding services here? Join us today!';
  const buttonText = content?.buttonText || 'Join us';
  const buttonLink = content?.buttonLink || DEFAULT_VENDOR_CTA_CONTENT.buttonLink || '/lp/partner-onboarding-form';
  return (
    <>
    <section className="relative mt-20 overflow-x-hidden px-3 pb-10 pt-2 md:px-0 md:py-12" id="are_you_a_vendor_section"><img alt="Mandala bg pattern" loading="lazy" width="400" height="400" decoding="async" data-nimg="1" className="absolute z-0 aspect-square w-[200px] -translate-x-1/2 md:w-[400px]" style={{color: 'transparent'}} src="/images/HomePage/new/big-mandala.webp" /><img alt="Mandala bg pattern" loading="lazy" width="400" height="400" decoding="async" data-nimg="1" className="absolute right-0 z-0 w-[200px] translate-x-1/2  md:w-[400px]" style={{color: 'transparent'}} src="/images/HomePage/new/big-mandala.webp" />
            <div className="relative z-10 mx-auto grid max-w-screen-lg grid-cols-2 gap-6 md:gap-y-16 ">
                <div className="col-span-full flex flex-col items-center justify-center gap-y-4 pt-10 md:col-span-1 md:items-start md:justify-start md:gap-y-8">
                    <p className="font-playfair text-3xl font-semibold md:text-5xl">{headline}</p>
                    <p className="whitespace-pre-wrap text-center text-base text-secondary md:text-start md:text-xl">{subheadline}</p><a className="group flex w-max items-center gap-x-2 rounded-2xl border-2 border-TWCPrimaryTheme px-10 py-3 text-lg font-bold text-TWCPrimaryTheme md:px-12 md:text-xl" id="hp-join-vendor" target="_blank" href={buttonLink}><span>{buttonText}</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-500 group-hover:translate-x-[20%]"><path d="m9 18 6-6-6-6"></path></svg></a></div>
                <div className="col-span-full hidden md:col-span-1 md:block">
                    <div className="flex h-full items-center justify-center md:py-10 pr-0">
                        <div className="relative h-[280px] w-[400px]"><img alt="vendor-1" loading="lazy" decoding="async" data-nimg="fill" className="rounded-2xl object-cover" style={{position: 'absolute', height: '100%', width: '100%', left: '0', top: '0', right: '0', bottom: '0', color: 'transparent'}} src="/images/HomePage/new/vendor-1.webp" />
                            <div className="absolute -left-8 -top-8">
                                <div className="relative aspect-square h-[170px]"><img alt="vendor-2" loading="lazy" decoding="async" data-nimg="fill" className="rounded-2xl border-4 border-white object-cover" style={{position: 'absolute', height: '100%', width: '100%', left: '0', top: '0', right: '0', bottom: '0', color: 'transparent'}} src="/images/HomePage/new/vendor-2.webp" /></div>
                            </div>
                            <div className="absolute -bottom-14 -right-10">
                                <div className="relative aspect-square h-[220px]  "><img alt="vendor-3" loading="lazy" decoding="async" data-nimg="fill" className="rounded-2xl border-4 border-white object-cover" style={{position: 'absolute', height: '100%', width: '100%', left: '0', top: '0', right: '0', bottom: '0', color: 'transparent'}} src="/images/HomePage/new/vendor-3.webp" /></div>
                            </div>
                        </div>
                    </div>
            </div>
            </div>
        </section>
    </>
  );
}