/**
 * SectionClientReviews — generated from docs/research/homepage/sections/client_reviews.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
  * Notes: tagembed widgets — D7 deferred
 */
import { useEffect } from 'react';

// HAND-EXTENSION: tagembed loader — replicates original TagembedWidget effect
// (chunk 7168): inject https://widget.tagembed.com/embed.min.js once
// (id="tagembed-script-embeded", async, appended to body). The script
// hydrates the three .tagembed-widget divs below (widget IDs 307493 /
// 307492 / 306842 — same public widgets the original site serves).
export default function SectionClientReviews() {
  useEffect(() => {
    if (document.getElementById('tagembed-script-embeded')) return;
    const s = document.createElement('script');
    s.id = 'tagembed-script-embeded';
    s.src = 'https://widget.tagembed.com/embed.min.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <>

        <section className="space-y-16 bg-[#fffaf0] py-20">
            <div className="space-y-8">
                <div className="space-y-2 px-5">
                    <p className="font-moisette text-center text-2xl font-semibold lg:text-4xl">Our Clients’ Reviews &amp; Experiences</p>
                    <p className="font-plus-jakarta-sans text-center text-sm">Hear it from our happy couples and families</p>
                </div>
                <div className="mx-auto w-full lg:w-[88%]">
                    <div className="tagembed-widget" data-widget-id="307493" data-website="1"></div>
                </div>
            </div>
            <div className="space-y-8">
                <div className="space-y-2 px-5">
                    <p className="hidden">💖✨😍</p>
                    <p className="font-moisette text-center text-[24px] font-semibold whitespace-pre-line lg:text-[36px]">A Glimpse Into Our Recently Executed Weddings</p>
                </div>
                <div className="mx-auto w-full lg:w-[88%]">
                    <div className="tagembed-widget" data-widget-id="307492" data-website="1"></div>
                </div>
            </div>
            <div className="space-y-7">
                <div className="space-y-2 px-5">
                    <p className="font-moisette text-center text-[28px] font-semibold lg:text-[36px]">Our Google Reviews</p>
                </div>
                <div className="mx-auto w-full lg:w-[88%]">
                    <div className="tagembed-widget" data-widget-id="306842" data-website="1"></div>
                </div>
            </div>
        </section>
    
    </>
  );
}
