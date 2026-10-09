/**
 * SectionFaq — generated from docs/research/homepage/sections/frequently_asked_questions_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 * Notes: accordion — hand-extended
 */
import { useState } from 'react';
import type { FaqSectionContent } from '@/lib/supabase/types';
import { DEFAULT_FAQ_CONTENT } from '@/services/cmsData';

// HAND-EXTENSION: accordion behaviour. Original uses @szhsin/react-accordion with
// NO package CSS in the stylesheet — panels are captured as display:none + a
// `transition-[height] duration-300` class, i.e. a 300ms height slide. We keep the
// captured classes/ids and toggle state locally:
//   - item status class suffix exited/entered (cosmetic — no CSS depends on it)
//   - aria-expanded on the button
//   - content panel: maxHeight 0 <-> 24rem slide (class swapped [height]→[max-height]
//     so the transition actually targets the animated property — invisible change)
//   - chevron rotate-180 while open (the svg carries transition-transform in the
//     capture; original rotation source unverified — Stage 4 pixel pass)
// FAQ copy now comes from the home/faqs CMS section (Admin -> FAQs);
// DEFAULT_FAQ_CONTENT preserves the previous captured copy as the fallback.

export default function SectionFaq({ content }: { content?: FaqSectionContent } = {}) {
  const items = content?.items && content.items.length > 0 ? content.items : DEFAULT_FAQ_CONTENT.items;
  // HAND-EXTENSION: single-open accordion (szh default allowMultiple=false).
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <section
        className="maskFaded relative flex flex-col items-center justify-center gap-y-8  bg-[#D1E9DE]/30 py-8 md:gap-y-12 md:p-16"
        id="frequently_asked_questions_section"
      >
        <img
          alt="FAQ Icon"
          loading="lazy"
          width={300}
          height={300}
          decoding="async"
          data-nimg="1"
          className="pointer-events-none absolute right-0 top-0 hidden object-contain mix-blend-difference md:block"
          style={{ color: 'transparent' }}
          src="/images/HomePage/new/flower-pattern.png"
        />
        <img
          alt="FAQ Icon"
          loading="lazy"
          width={300}
          height={300}
          decoding="async"
          data-nimg="1"
          className="pointer-events-none absolute bottom-0 left-0 hidden rotate-180 object-contain mix-blend-difference md:block"
          style={{ color: 'transparent' }}
          src="/images/HomePage/new/flower-pattern.png"
        />
        <div className="flex flex-col items-center justify-center gap-y-2 md:gap-y-4 ">
          <p className="font-playfair text-2xl font-semibold md:text-[44px]">
            <span className="hidden md:block">Frequently asked questions</span>
            <span className="md:hidden ">FAQs</span>
          </p>
        </div>
        <div
          data-szh-adn=""
          className="szh-accordion max-w-xl space-y-2 px-4 text-primaryTextColor lg:space-y-[10px]"
        >
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <div
                key={item.id}
                translate="yes"
                className={`szh-accordion__item szh-accordion__item--status-${open ? 'entered' : 'exited'} text- rounded-lg border border-gray-100 bg-white p-4`}
              >
                <p style={{ margin: '0' }} className="szh-accordion__item-heading">
                  <button
                    id={item.id}
                    aria-controls={`${item.id}-`}
                    aria-expanded={open}
                    data-szh-adn-btn=""
                    className="szh-accordion__item-btn w-full"
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    <div className="flex w-full justify-between gap-2">
                      <p className="text-left text-[15px] lg:text-base lg:font-medium">
                        {item.q}
                      </p>
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
                        className={`mt-1 flex-shrink-0 opacity-70 transition-transform duration-300 ease-linear ${open ? 'rotate-180' : ''}`}
                      >
                        <path d="m6 9 6 6 6-6"></path>
                      </svg>
                    </div>
                  </button>
                </p>
                <div
                  className="szh-accordion__item-content transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: open ? '24rem' : 0, overflow: 'hidden' }}
                >
                  <div
                    id={`${item.id}-`}
                    aria-labelledby={item.id}
                    role="region"
                    className="szh-accordion__item-panel"
                  >
                    <p className=" pt-1.5  text-sm text-gray-500 lg:pt-4 lg:text-base">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-x-0 bottom-1 z-50 translate-y-full">
          <div className="relative">
            <img
              alt=" "
              loading="lazy"
              width={100}
              height={8}
              decoding="async"
              data-nimg="1"
              className="max-h-24 w-full object-cover object-bottom"
              style={{ color: 'transparent' }}
              src="/images/HomePage/new/green-curve.svg"
            />
          </div>
        </div>
      </section>
    </>
  );
}