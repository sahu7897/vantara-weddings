/**
 * WeddingIdeasPage — /wedding-ideas.
 *
 * Was a deferred 404 by design (§13.6); built now on request. Adaptation notes:
 *  - Copy: captured h1 ("Ideas & inspiration for your wedding") + ideabook
 *    blurb from the captured home-section/outlines (docs/research/outlines/
 *    wedding-ideas*.json). Categories = docs/research/api_fixtures/
 *    ideabook/category.json (18 PRIMARY_CATEGORIES names).
 *  - Imagery: local wedding photographs only (public/webflow/img, captured
 *    with the portfolio page). The original page hotlinked remote ideabook
 *    photos off imageswedding.vantaraweddings.com — runtime calls to TWC
 *    hosts are prohibited by §13.11 (O2/no-TWC-endpoints), so those stay out.
 *    To restore the real ideabook shots later, drop files into
 *    public/ideabook/ and swap the GALLERY srcs.
 *  - Subroutes (/wedding-ideas/[category], /idea/[slug], search, ideabook
 *    save-to-profile) remain out of scope; category pills are display-only
 *    so nothing links to a route that 404s.
 */
import Head from 'next/head';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

/** ideabook PRIMARY_CATEGORIES cover labels (fixture, local research data). */
const CATEGORIES = [
  'Bridal Lehengas',
  'Wedding Dresses',
  'Blouse Designs',
  'Sarees',
  'Mehendi Designs',
  'Jewellery',
  'Makeup',
  'Hairstyles',
  'Decoration Ideas',
  'Photoshoot Poses',
  'Pre Wedding Shoot',
  'Groom Dresses',
  'Invitations',
  'Accessories',
  'Wedding Cakes',
  'Wedding Themes',
  'Venue Ideas',
  'Wedding Gifts',
];

/** Local wedding photographs (responsive -p-800/-p-1080 variants where available). */
const GALLERY = [
  '/webflow/img/655b5b721c0b3d1a006ad521_Thumbnail-min-p-1080.jpg',
  '/webflow/img/655ee847002b9d4547afdc43_084A2150-min-p-800.jpg',
  '/webflow/img/65d5f6b8565ef7b4640eba0a_0W8A0899-p-800.jpg',
  '/webflow/img/65df26518b598195754fa1b5_RJ-52-p-800.jpg',
  '/webflow/img/65f2f6b5d5597bb31a7599c5_IMG_4571.JPG',
  '/webflow/img/65f2f796c248438d683b1910_IMG_4550.JPG',
  '/webflow/img/660ce6c79ce365bee4b5d297_6c758643-39d8-4870-aa57-0271e0a18981_rw_1920.webp',
  '/webflow/img/660ce6c9ba548eb5b45f6a71_410830fc-f3d3-448c-a602-751a2ee62668_rw_1920.jpeg',
  '/webflow/img/660ce6cb9ce365bee4b5d63b_7e2ad081-60b2-470b-a39a-0c2e71eefcf5_rw_1920.jpeg',
  '/webflow/img/660ce6cc4ed630afbfab550b_073d28b8-4351-478a-b689-9677f6b7c023_rw_1920.webp',
  '/webflow/img/661f699b5e3a8e7d837f0277_HSP_YASHIKA_SHREYAS_WEDDING-613.webp',
  '/webflow/img/661f9a89cc8130fee8ceebdc_HSP_MRUNMAYEE_AAKASH_HALDI_WEDDING--24.webp',
];

const GALLERY_ALT = (i: number): string =>
  i === 11
    ? 'Haldi ceremony moments from an Indian wedding'
    : 'Wedding inspiration photograph from a real Indian wedding';

export default function WeddingIdeasPage() {
  return (
    <>
      <Head>
        <title>Wedding Ideas &amp; Inspiration for Your Wedding | Vantara Weddings</title>
        <meta
          name="description"
          content="Explore wedding ideas and inspiration — bridal fashion, mehendi, decor, photoshoot poses and more. Browse by category and start building your ideabook with Vantara Weddings."
        />
        <link rel="canonical" href="/wedding-ideas" />
      </Head>

      <SiteHeader variant="sticky" />

      <main>
        {/* Breadcrumb + H1 band (captured h1 copy). */}
        <section className="bg-lightPink py-8 lg:py-14" id="wedding_ideas_section">
          <div className="mx-auto max-w-6xl px-5">
            <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-appTheme lg:text-sm">
              <a className="hover:underline" href="/">
                Home
              </a>
              <span aria-hidden="true">&gt;</span>
              <span aria-current="page">Wedding Ideas</span>
            </nav>
            <h1 className="mt-4 font-plus-jakarata-sans text-3xl font-extrabold text-black lg:text-[40px] lg:leading-[48px]">
              Ideas &amp; inspiration for your wedding
            </h1>
            <p className="mt-3 max-w-2xl text-base text-secondary lg:text-lg">
              10,000+ unique wedding ideas for your special day. Browse the categories below and start
              collecting inspiration for your big day.
            </p>
          </div>
        </section>

        {/* Category browse (display-only pills — subroutes are out of scope). */}
        <section className="bg-white py-10 lg:py-14" id="wedding_ideas_categories">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="font-playfair text-2xl font-bold text-black lg:text-4xl">
              Explore by category
            </h2>
            <ul className="mt-6 flex flex-wrap gap-3">
              {CATEGORIES.map((category) => (
                <li
                  key={category}
                  className="rounded-full border border-lightGray bg-white px-5 py-2.5 text-sm font-semibold text-primaryTextColor shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)] lg:text-base"
                >
                  {category}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Inspiration gallery (local imagery — see header note). */}
        <section className="bg-[#FFFEF8] py-10 lg:py-14" id="wedding_ideas_gallery">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-playfair text-2xl font-bold text-black lg:text-4xl">
                Fresh from the ideabook
              </h2>
              <p className="text-sm text-secondary lg:text-base">
                Real weddings, hand-picked for you.
              </p>
            </div>
            <div className="mt-6 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {GALLERY.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={GALLERY_ALT(i)}
                  loading="lazy"
                  className="mb-5 w-full break-inside-avoid rounded-2xl border border-lightGray object-cover shadow-[0px_4px_16px_0px_rgba(0,0,0,0.06)]"
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
