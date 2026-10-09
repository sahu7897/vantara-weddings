/**
 * SectionWeddingIdeas — generated from docs/research/homepage/sections/explore_wedding_ideas_section.html by scripts/html2tsx.py.
 * Source of truth = captured DOM. Hand extensions (interactivity) are allowed but
 * must be marked with `// HAND-EXTENSION:` comments so regeneration can be merged.
 
 */
export default function SectionWeddingIdeas() {
  return (
    <>
    <section className="relative mt-20 w-full overflow-hidden px-3 pb-10 pt-2 md:px-0 md:py-12" id="explore_wedding_ideas_section"><img alt="Mandala bg pattern" loading="lazy" width="400" height="400" decoding="async" data-nimg="1" className="absolute left-0 top-1/2 z-0 aspect-square w-[200px] -translate-x-1/2 -translate-y-1/2 object-contain md:w-[400px]" style={{color: 'transparent'}} src="/images/HomePage/new/big-mandala.webp" /><img alt="Mandala bg pattern" loading="lazy" width="400" height="400" decoding="async" data-nimg="1" className="absolute right-0 top-1/2 z-0 w-[200px] -translate-y-1/2 translate-x-1/2 object-contain md:w-[400px]" style={{color: 'transparent'}} src="/images/HomePage/new/big-mandala.webp" />
            <div className="flex flex-col items-center">
                <div>
                    <p className="pb-2 font-playfair text-3xl font-semibold text-[#121212] md:pb-4 lg:text-5xl">Explore Vantara ideas</p>
                    <p className="mt-2 whitespace-pre-wrap text-center text-secondary md:text-xl">10,000+ unique wedding ideas for your
                        {/* */}
                        {/* */}special day. Create your ideabook!</p>
                </div>
                <div className="no-scrollbar z-10 flex w-full justify-start gap-6 overflow-x-scroll px-0 py-6 md:mx-auto md:w-full md:justify-center md:py-12">
                    <a target="_blank" className="flex flex-col items-center justify-center gap-2.5 md:gap-4" id="hp-wedding-ideas" href="/wedding-ideas">
                        <div className="flex w-full flex-col items-center justify-center rounded-full border-4 border-white bg-TWCPrimaryTheme text-base text-white shadow aspect-square h-[70px] md:h-20 lg:h-28"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-9 w-9"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"></path></svg></div>
                        <span className="text-center text-xs font-medium text-TWCPrimaryTheme md:text-sm lg:text-lg">and more</span>
                    </a>
                </div><a className="group flex w-max items-center gap-x-2 rounded-2xl border-2 border-TWCPrimaryTheme px-8 py-3 text-lg font-bold text-TWCPrimaryTheme md:text-xl" id="hp-wedding-ideas" target="_blank" href="/wedding-ideas"><span>View all</span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-500 group-hover:translate-x-[20%]"><path d="m9 18 6-6-6-6"></path></svg></a></div>
        </section>
    </>
  );
}
