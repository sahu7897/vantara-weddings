/**
 * Typed row shapes for the Phase 5 tables created in Stage 2
 * (supabase/migrations/0001_schema.sql). supabase-js is called untyped at the
 * call sites; these interfaces describe what `data` actually contains so the
 * dashboards never invent columns.
 */

export type VendorCategory =
  | 'venue'
  | 'decor'
  | 'photography'
  | 'catering'
  | 'makeup'
  | 'dj'
  | 'other';

export type VendorStatus = 'pending' | 'approved' | 'rejected';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'booked' | 'lost';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface VendorRow {
  id: string;
  owner_user_id: string | null;
  business_name: string;
  category: VendorCategory;
  city: string;
  locality: string | null;
  description: string | null;
  price_min: number | null;
  price_max: number | null;
  status: VendorStatus;
  created_at: string;
}

export interface VenueRow {
  id: string;
  vendor_id: string;
  capacity_min: number | null;
  capacity_max: number | null;
  price_per_plate_veg: number | null;
  price_per_plate_nonveg: number | null;
  rental_price: number | null;
  indoor_outdoor: 'indoor' | 'outdoor' | 'both' | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface VendorMediaRow {
  id: string;
  vendor_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface LeadRow {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  city: string | null;
  event_date: string | null;
  budget_range: string | null;
  guest_count: number | null;
  services_needed: string[] | null;
  source_page: string | null;
  status: LeadStatus;
  assigned_vendor_id: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  lead_id: string | null;
  vendor_id: string;
  event_date: string;
  amount: number;
  commission_percent: number;
  commission_amount: number;
  status: BookingStatus;
  created_at: string;
}

export interface CityRow {
  slug: string;
  name: string;
  state: string | null;
  is_active: boolean;
}

export interface LocalityRow {
  id: string;
  city_slug: string;
  slug: string;
  name: string;
  created_at: string;
}

// ── CMS Types (Phase 6) ───────────────────────────────────────────────────────

export interface SiteSettingsRow<T = unknown> {
  key: string;
  value: T;
  description: string | null;
  updated_at: string;
}

export interface GeneralSettings {
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
}

export interface ContactSettings {
  phone: string;
  telHref: string;
  whatsappNumber: string;
  whatsappText: string;
  email: string;
  address: string;
}

export interface SocialSettings {
  instagram: string;
  facebook: string;
  youtube: string;
  linkedin: string;
  x: string;
}

export interface SeoSettings {
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
}

export interface CmsPageRow {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  headline: string | null;
  subheadline: string | null;
  content_html: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeroSlide {
  id: number | string;
  coupleName: string;
  city: string;
  date: string;
  mobileUrl: string;
  desktopUrl: string;
  posterUrl: string;
}

export interface HeroSectionContent {
  headline?: string;
  subheadline?: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  slides: HeroSlide[];
}

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface FaqSectionContent {
  headline?: string;
  subheadline?: string;
  items: FaqItem[];
}

export interface WhyBetterItem {
  title: string;
  description: string;
  vantaraAdvantage: string;
  traditionalDrawback: string;
}

export interface WhyBetterSectionContent {
  headline?: string;
  subheadline?: string;
  items: WhyBetterItem[];
}

export interface VendorCtaSectionContent {
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonLink?: string;
  badgeText?: string;
}

export interface CmsSectionRow<T = unknown> {
  id: string;
  page_slug: string;
  section_key: string;
  order_index: number;
  is_active: boolean;
  content: T;
  updated_at: string;
}

export interface CmsMediaRow {
  id: string;
  filename: string;
  public_url: string;
  storage_path: string | null;
  media_type: 'image' | 'video' | 'document';
  alt_text: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface CmsMenuItem {
  label: string;
  href: string;
  isExternal?: boolean;
  badge?: string;
  children?: { label: string; href: string }[];
}

export interface CmsMenuRow {
  id: string;
  location: 'header' | 'footer' | 'mobile';
  items: CmsMenuItem[];
  updated_at: string;
}
