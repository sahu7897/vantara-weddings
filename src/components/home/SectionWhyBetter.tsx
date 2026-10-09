/**
 * SectionWhyBetter — generated from docs/research/homepage/sections/why_are_we_better_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 
 */
import type { WhyBetterSectionContent } from '@/lib/supabase/types';
import { DEFAULT_WHY_BETTER_CONTENT, type WhyBetterItemWithIcon } from '@/services/cmsData';

/**
 * Cards are rendered from the home/why_better CMS section (Admin -> Pages /
 * section editors); DEFAULT_WHY_BETTER_CONTENT holds the captured copy as the
 * fallback. Previously all three cards were hardcoded here, so admin edits had
 * no effect on the homepage.
 */
export default function SectionWhyBetter({ content }: { content?: WhyBetterSectionContent } = {}) {
  const items: WhyBetterItemWithIcon[] =
    content?.items && content.items.length > 0
      ? content.items
      : DEFAULT_WHY_BETTER_CONTENT.items;
  const headline = content?.headline || DEFAULT_WHY_BETTER_CONTENT.headline;
  const subheadline = content?.subheadline || DEFAULT_WHY_BETTER_CONTENT.subheadline;
  return (
    <>
    <section className="mb-8 w-full" id="why_are_we_better_section">
            <div><img alt="Green curve" loading="lazy" width="360" height="30" decoding="async" data-nimg="1" className="max-h-24 w-full rotate-180 object-cover object-bottom" style={{color: 'transparent'}} src="/images/HomePage/new/green-curve.svg" /></div>
            <div className="flex flex-col items-center bg-[#F0F7F4] px-5 pb-8 md:px-0 md:pb-12">
                <div>
                    <p className="pb-2 text-center font-playfair text-3xl font-semibold text-[#121212] md:pb-4 lg:text-5xl">{headline}</p>
                    <p className="mb-4 mt-2 whitespace-pre-wrap text-center text-base text-secondary md:text-xl ">{subheadline}</p>
                </div>
                <div className="grid grid-cols-1 gap-y-4 py-4 md:grid-cols-2 md:gap-x-4 md:py-7 lg:grid-cols-3 lg:gap-x-10 2xl:gap-x-12">
                    {items.map((item, i) => (
                      <div
                        key={`${item.title}-${i}`}
                        className="flex items-center rounded-r-xl py-4 shadow-[0_15px_30px_0_#A1C8B733] md:max-w-[320px] md:flex-col md:rounded-b-xl md:rounded-tr-none md:px-4 md:bg-[linear-gradient(180deg,#F0F7F4_0%,#FFF_100%)] bg-[linear-gradient(90deg,#F0F7F4_11.36%,#FFFFFF_100%)]"
                      >
                        <div><img alt={item.title} loading="lazy" width="90" height="90" decoding="async" data-nimg="1" className="md:h-[145px] md:w-[145px]" style={{color: 'transparent'}} src={item.icon || '/images/HomePageRevamp/benefits/gift.webp'} /></div>
                        <div className="flex flex-col px-4 md:items-center md:px-2">
                            <p className="text-lg font-bold md:pb-1 md:text-2xl">{item.title}</p>
                            <p className="pb-4 text-base text-secondary md:text-center md:text-lg">{item.description}</p>
                        </div>
                      </div>
                    ))}                </div>
            </div>
        </section>
    </>
  );
}