-- ═══════════════════════════════════════════════════════════════════════════
-- Vantara Weddings — Phase 6: Dynamic Content Management System (CMS)
-- 0007_cms_schema.sql
--   site_settings  → Key-value/JSON store for global branding, logos, contacts, socials, SEO
--   cms_pages      → Editable meta, titles, subheadings, and HTML/markdown content
--   cms_sections   → Flexible section components (hero, why_better, faqs, reviews, etc.)
--   cms_menus      → Dynamic navigation menus (header, footer)
--   cms_media      → Central media repository
--   storage        → 'site-media' public bucket for images/videos
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. site_settings ──────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);

comment on table public.site_settings is
  'Global site configuration: branding, contact numbers, socials, and SEO tags.';

-- ── 2. cms_pages ─────────────────────────────────────────────────────────────
create table if not exists public.cms_pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  meta_title       text,
  meta_description text,
  og_image         text,
  headline         text,
  subheadline      text,
  content_html     text,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_cms_pages_slug on public.cms_pages (slug);

-- ── 3. cms_sections ──────────────────────────────────────────────────────────
create table if not exists public.cms_sections (
  id           uuid primary key default gen_random_uuid(),
  page_slug    text not null references public.cms_pages (slug) on delete cascade,
  section_key  text not null,
  order_index  int not null default 0,
  is_active    boolean not null default true,
  content      jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  unique (page_slug, section_key)
);

create index if not exists idx_cms_sections_lookup on public.cms_sections (page_slug, section_key);

-- ── 4. cms_menus ─────────────────────────────────────────────────────────────
create table if not exists public.cms_menus (
  id          uuid primary key default gen_random_uuid(),
  location    text not null unique check (location in ('header', 'footer', 'mobile')),
  items       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── 5. cms_media ─────────────────────────────────────────────────────────────
create table if not exists public.cms_media (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  public_url  text not null,
  storage_path text,
  media_type  text not null default 'image' check (media_type in ('image', 'video', 'document')),
  alt_text    text,
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

-- ── 6. Row Level Security (RLS) ──────────────────────────────────────────────
alter table public.site_settings enable row level security;
alter table public.cms_pages     enable row level security;
alter table public.cms_sections  enable row level security;
alter table public.cms_menus     enable row level security;
alter table public.cms_media     enable row level security;

-- Public read policies
create policy "site_settings public read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "cms_pages public read"
  on public.cms_pages for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

create policy "cms_sections public read"
  on public.cms_sections for select
  to anon, authenticated
  using (is_active = true or public.is_admin());

create policy "cms_menus public read"
  on public.cms_menus for select
  to anon, authenticated
  using (true);

create policy "cms_media public read"
  on public.cms_media for select
  to anon, authenticated
  using (true);

-- Admin write policies (CRUD)
create policy "site_settings admin write"
  on public.site_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cms_pages admin write"
  on public.cms_pages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cms_sections admin write"
  on public.cms_sections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cms_menus admin write"
  on public.cms_menus for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "cms_media admin write"
  on public.cms_media for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Table Grants (due to 0006 least-privilege) ───────────────────────────────
grant select on public.site_settings, public.cms_pages, public.cms_sections,
                public.cms_menus, public.cms_media to anon, authenticated;
grant insert, update, delete on public.site_settings, public.cms_pages, public.cms_sections,
                                public.cms_menus, public.cms_media to authenticated;

-- ── 7. Storage Bucket ('site-media') ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

create policy "site-media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'site-media');

create policy "site-media admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-media' and public.is_admin());

create policy "site-media admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin())
  with check (bucket_id = 'site-media' and public.is_admin());

create policy "site-media admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-media' and public.is_admin());

-- ── 8. Initial Seeds ──────────────────────────────────────────────────────────

-- General Site Settings
insert into public.site_settings (key, value, description)
values
(
  'general',
  '{
    "name": "Vantara Weddings",
    "shortName": "Vantara",
    "tagline": "Book Venues, End to End Wedding Services, Planners in India",
    "logoUrl": "/brand/vantara-logo.png",
    "faviconUrl": "/brand/favicon.png"
  }'::jsonb,
  'Main brand identity settings'
),
(
  'contacts',
  '{
    "phone": "+91 95381 27163",
    "telHref": "tel:+919538127163",
    "whatsappNumber": "919538127163",
    "whatsappText": "Hey, I am looking for wedding services",
    "email": "support@vantaraweddings.com",
    "address": "Delhi NCR / Bengaluru / Rajasthan"
  }'::jsonb,
  'Customer support contact channels'
),
(
  'socials',
  '{
    "instagram": "https://instagram.com/vantaraweddings",
    "facebook": "https://facebook.com/vantaraweddings",
    "youtube": "https://youtube.com/@vantaraweddings",
    "linkedin": "",
    "x": ""
  }'::jsonb,
  'Social profile links'
),
(
  'seo',
  '{
    "defaultTitle": "Vantara Weddings - Book Venues, End to End Services, Planners in India",
    "defaultDescription": "Vantara Weddings provides the best wedding services in India. Book end-to-end wedding planning services online with us and grab the best deals.",
    "defaultOgImage": "/brand/vantara-logo.png"
  }'::jsonb,
  'Global fallback SEO meta tags'
)
on conflict (key) do nothing;

-- Core Pages
insert into public.cms_pages (slug, title, headline, subheadline, meta_title, meta_description, content_html)
values
(
  'home',
  'Home',
  'Crafting Unforgettable Weddings',
  'India’s premier wedding planning network connecting couples to dream venues and verified artists.',
  'Vantara Weddings - Book Venues, Planners & Decorators',
  'Book end-to-end wedding services, verified wedding venues, photographers, and decorators.',
  ''
),
(
  'about-us',
  'About Us',
  'About Vantara Weddings',
  'Creating timeless celebrations across India.',
  'About Us | Vantara Weddings',
  'Learn more about Vantara Weddings, our mission, and our verified wedding vendor network.',
  '<p>At Vantara Weddings, we believe that your wedding day should be nothing short of magical. As a premier wedding planning company in India, we have made it our mission to turn your wedding dreams into reality.</p><p>With hundreds of successful weddings organized across Delhi NCR, Bangalore, Rajasthan, and Goa, our expert planners ensure complete peace of mind from recce to reception.</p>'
),
(
  'wedding-services',
  'Wedding Services',
  'Comprehensive End-to-End Wedding Services',
  'Everything you need under one roof with transparent pricing and verified quality.',
  'Wedding Services | Vantara Weddings',
  'Explore end-to-end wedding planning, catering, decor, makeup, and photography services.',
  '<p>Explore our wide range of services including venue selection, bespoke themes, luxury decor, candid cinematography, and personalized hospitality.</p>'
),
(
  'contact-us',
  'Contact Us',
  'Get in Touch with our Planning Team',
  'Our dedicated wedding concierges are available 7 days a week.',
  'Contact Us | Vantara Weddings',
  'Reach out to Vantara Weddings for inquiries, quotes, or consultation sessions.',
  '<p>Have questions about planning your wedding or interested in listing your venue? Contact our team directly.</p>'
),
(
  'careers',
  'Careers',
  'Join the Vantara Weddings Family',
  'Build the future of celebration technology and event planning.',
  'Careers | Vantara Weddings',
  'Explore open job opportunities and careers at Vantara Weddings.',
  '<p>We are always on the lookout for passionate planners, designers, and software engineers to help craft unforgettable weddings.</p>'
),
(
  'privacy-policy',
  'Privacy Policy',
  'Privacy Policy',
  'How we handle, protect, and respect your data.',
  'Privacy Policy | Vantara Weddings',
  'Read the Vantara Weddings privacy policy.',
  '<p>This Privacy Policy outlines how Vantara Weddings collects, uses, and safeguards information when you use our website and services.</p>'
),
(
  'terms',
  'Terms of Service',
  'Terms and Conditions',
  'Client terms and conditions for booking venues and vendor services.',
  'Terms of Service | Vantara Weddings',
  'Terms and Conditions for Vantara Weddings platform and services.',
  '<p>By using Vantara Weddings, you agree to these terms governing bookings, payments, and cancellations.</p>'
)
on conflict (slug) do nothing;

-- Home Page Sections
insert into public.cms_sections (page_slug, section_key, order_index, is_active, content)
values
(
  'home',
  'hero',
  0,
  true,
  '{
    "headline": "Crafting Unforgettable Weddings",
    "subheadline": "Book verified venues, decorators, and photographers with guaranteed best rates.",
    "primaryCtaText": "Start my wedding planning",
    "primaryCtaLink": "/?leadform=true",
    "secondaryCtaText": "Explore Venues",
    "secondaryCtaLink": "/wedding-venues",
    "slides": [
      {
        "id": 1,
        "coupleName": "Anjali & Apurav",
        "city": "Goa",
        "date": "May ‘25",
        "mobileUrl": "/gcpimages/weddings/assets/goa-new-ph-potrait.mp4",
        "desktopUrl": "/gcpimages/weddings/assets/goa-new-ph.mp4",
        "posterUrl": "/gcpimages/weddings/d0e26332-36c0-4d65-b839-b18d17c0494e/admin_uploads/d2bfa004-e6c1-41e5-830e-16ce72835de5_thumbnail.jpg"
      },
      {
        "id": 2,
        "coupleName": "Ishita & Shubh",
        "city": "Bangalore",
        "date": "Apr ‘24",
        "mobileUrl": "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/d8401edd-e0e6-4256-b47f-6babc33ad026.mp4",
        "desktopUrl": "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/3d17561e-7b23-4497-9d0f-fe386cca76bf.mp4",
        "posterUrl": "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/8a77d481-66fd-443a-a8f5-e9833d9bb536.webp"
      },
      {
        "id": 3,
        "coupleName": "Shivika & Ashish",
        "city": "Udaipur",
        "date": "Feb ‘25",
        "mobileUrl": "/gcpimages/weddings/assets/ashish_mobile.mp4",
        "desktopUrl": "/gcpimages/weddings/assets/ashish_web.mp4",
        "posterUrl": "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/64fcf724-1472-4c08-afe3-d3167091920d.webp"
      },
      {
        "id": 4,
        "coupleName": "Ishita & Akshay",
        "city": "Jaipur",
        "date": "Feb ‘25",
        "mobileUrl": "/gcpimages/weddings/assets/ishita_mobile.mp4",
        "desktopUrl": "/gcpimages/weddings/assets/Ishita_desktop.mp4",
        "posterUrl": "/gcpimages/weddings/574a86ee-cc45-4a2c-bfb1-d23ef44b7ec2/admin_uploads/0d828b4b-34a0-4f32-88b7-01790e6e33a1.webp"
      }
    ]
  }'::jsonb
),
(
  'home',
  'faqs',
  5,
  true,
  '{
    "headline": "Frequently Asked Questions",
    "subheadline": "Everything you need to know about planning with Vantara Weddings.",
    "items": [
      {
        "id": "faq-1",
        "q": "Do you offer customisable packages to suit different budgets?",
        "a": "Yes, we provide end-to-end services tailored to your budget and specific requirements. Our planners ensure you get maximum value without compromise."
      },
      {
        "id": "faq-2",
        "q": "Can you assist with destination weddings or events in different locations?",
        "a": "Absolutely! We specialize in destination weddings across Goa, Rajasthan, Himachal, and international venues."
      },
      {
        "id": "faq-3",
        "q": "How early should we book your services for our wedding?",
        "a": "Ideally, venue selection and planner onboarding should begin 6-12 months in advance, especially for auspicious dates."
      },
      {
        "id": "faq-4",
        "q": "Are there additional costs beyond the initial service fee?",
        "a": "We guarantee 100% transparent pricing with zero hidden vendor markups."
      }
    ]
  }'::jsonb
),
(
  'home',
  'why_better',
  3,
  true,
  '{
    "headline": "Why Choose Vantara Weddings?",
    "subheadline": "Here is how we deliver an effortless wedding experience compared to traditional planners.",
    "items": [
      {
        "title": "Transparent Pricing",
        "description": "Zero hidden markups with direct venue contract pricing.",
        "vantaraAdvantage": "Guaranteed lowest price with price-beat protection",
        "traditionalDrawback": "Unclear commissions and inflated vendor rates"
      },
      {
        "title": "Verified Partners",
        "description": "Every decorator, photographer, and caterer is vetted and quality-checked.",
        "vantaraAdvantage": "Strict quality benchmarks and SLA guarantees",
        "traditionalDrawback": "Inconsistent quality and unverified freelancers"
      },
      {
        "title": "Dedicated Concierge",
        "description": "A single point of contact from your initial recce to the farewell.",
        "vantaraAdvantage": "Professional wedding manager assigned on day one",
        "traditionalDrawback": "Multiple uncoordinated vendor calls"
      }
    ]
  }'::jsonb
),
(
  'home',
  'vendor_cta',
  10,
  true,
  '{
    "headline": "Are You a Wedding Vendor or Venue Owner?",
    "subheadline": "Partner with Vantara Weddings to grow your bookings and reach verified wedding clients across India.",
    "buttonText": "Register as Partner",
    "buttonLink": "/lp/partner-onboarding-form",
    "badgeText": "Partner Network"
  }'::jsonb
)
on conflict (page_slug, section_key) do nothing;
