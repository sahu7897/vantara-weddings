/**
 * Admin → Site Settings (Phase 6 CMS): Global Brand, Contacts, Socials, and SEO.
 * Allows managing all global parameters without code touches.
 */
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  ContactSettings,
  GeneralSettings,
  SeoSettings,
  SocialSettings,
} from '@/lib/supabase/types';
import MediaPicker from './MediaPicker';
import {
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_SEO_SETTINGS,
  DEFAULT_SOCIAL_SETTINGS,
} from '@/services/cmsData';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function SiteSettingsPanel() {
  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [contacts, setContacts] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [socials, setSocials] = useState<SocialSettings>(DEFAULT_SOCIAL_SETTINGS);
  const [seo, setSeo] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      if (!isSupabaseConfigured()) {
        setError(NOT_CONFIGURED);
        setLoading(false);
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: fetchErr } = await supabase.from('site_settings').select('*');

        if (fetchErr) {
          setError(fetchErr.message);
        } else if (data) {
          const map = new Map(data.map((r) => [r.key, r.value]));
          if (map.has('general')) setGeneral({ ...DEFAULT_GENERAL_SETTINGS, ...(map.get('general') as GeneralSettings) });
          if (map.has('contacts')) setContacts({ ...DEFAULT_CONTACT_SETTINGS, ...(map.get('contacts') as ContactSettings) });
          if (map.has('socials')) setSocials({ ...DEFAULT_SOCIAL_SETTINGS, ...(map.get('socials') as SocialSettings) });
          if (map.has('seo')) setSeo({ ...DEFAULT_SEO_SETTINGS, ...(map.get('seo') as SeoSettings) });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setSaving(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const rows = [
        { key: 'general', value: general, updated_at: new Date().toISOString() },
        { key: 'contacts', value: contacts, updated_at: new Date().toISOString() },
        { key: 'socials', value: socials, updated_at: new Date().toISOString() },
        { key: 'seo', value: seo, updated_at: new Date().toISOString() },
      ];

      const { error: saveErr } = await supabase.from('site_settings').upsert(rows);

      if (saveErr) {
        setError(`Failed to save settings: ${saveErr.message}`);
      } else {
        setNotice('Site settings updated successfully! Changes reflect across all pages.');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading site settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {notice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Brand Identity */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Brand Identity & Logos</h2>
        <p className="mt-1 text-xs text-gray-500">
          Controls the primary brand name, logos, and header representations.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Full Brand Name</label>
            <input
              type="text"
              value={general.name}
              onChange={(e) => setGeneral({ ...general, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Short Name</label>
            <input
              type="text"
              value={general.shortName}
              onChange={(e) => setGeneral({ ...general, shortName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700">Brand Tagline</label>
            <input
              type="text"
              value={general.tagline}
              onChange={(e) => setGeneral({ ...general, tagline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <MediaPicker
            label="Logo Image"
            hint="Header and footer logo. A wide transparent PNG/SVG/WebP works best."
            expected="image"
            value={general.logoUrl}
            onChange={(url) => setGeneral({ ...general, logoUrl: url })}
            placeholder="/brand/vantara-logo.png"
          />

          <MediaPicker
            label="Favicon"
            hint="Browser-tab icon. Square, 32x32 or larger."
            expected="image"
            value={general.faviconUrl}
            onChange={(url) => setGeneral({ ...general, faviconUrl: url })}
            placeholder="/brand/favicon.png"
          />
        </div>
      </div>

      {/* Contact & WhatsApp */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Contact Details & WhatsApp</h2>
        <p className="mt-1 text-xs text-gray-500">
          Used across the sticky footer CTA, header contact links, and contact page.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Phone Number (Display)</label>
            <input
              type="text"
              value={contacts.phone}
              onChange={(e) => setContacts({ ...contacts, phone: e.target.value })}
              placeholder="+91 95381 27163"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Phone Tel Link (Href)</label>
            <input
              type="text"
              value={contacts.telHref}
              onChange={(e) => setContacts({ ...contacts, telHref: e.target.value })}
              placeholder="tel:+917355191261"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">WhatsApp Number (e.g. 917355191261)</label>
            <input
              type="text"
              value={contacts.whatsappNumber}
              onChange={(e) => setContacts({ ...contacts, whatsappNumber: e.target.value })}
              placeholder="917355191261"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Default WhatsApp Greeting Message</label>
            <input
              type="text"
              value={contacts.whatsappText}
              onChange={(e) => setContacts({ ...contacts, whatsappText: e.target.value })}
              placeholder="Hey, I am looking for wedding services"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Support Email</label>
            <input
              type="email"
              value={contacts.email}
              onChange={(e) => setContacts({ ...contacts, email: e.target.value })}
              placeholder="support@vantaraweddings.com"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Address / Operational Cities</label>
            <input
              type="text"
              value={contacts.address}
              onChange={(e) => setContacts({ ...contacts, address: e.target.value })}
              placeholder="Delhi NCR / Bengaluru / Rajasthan"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Social Profiles */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Social Media Profiles</h2>
        <p className="mt-1 text-xs text-gray-500">Links rendered in the footer and contact sections.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Instagram URL</label>
            <input
              type="url"
              value={socials.instagram}
              onChange={(e) => setSocials({ ...socials, instagram: e.target.value })}
              placeholder="https://instagram.com/..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Facebook URL</label>
            <input
              type="url"
              value={socials.facebook}
              onChange={(e) => setSocials({ ...socials, facebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">YouTube Channel URL</label>
            <input
              type="url"
              value={socials.youtube}
              onChange={(e) => setSocials({ ...socials, youtube: e.target.value })}
              placeholder="https://youtube.com/..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">LinkedIn URL</label>
            <input
              type="url"
              value={socials.linkedin}
              onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
              placeholder="https://linkedin.com/..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Global SEO */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Global SEO & Social Share (OG)</h2>
        <p className="mt-1 text-xs text-gray-500">Default fallback metadata for search engines and social cards.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Default Meta Title</label>
            <input
              type="text"
              value={seo.defaultTitle}
              onChange={(e) => setSeo({ ...seo, defaultTitle: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Default Meta Description</label>
            <textarea
              rows={3}
              value={seo.defaultDescription}
              onChange={(e) => setSeo({ ...seo, defaultDescription: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <MediaPicker
            label="Default OG Social Image"
            hint="Preview image when a page is shared on WhatsApp / Facebook. 1200x630."
            expected="image"
            value={seo.defaultOgImage}
            onChange={(url) => setSeo({ ...seo, defaultOgImage: url })}
            placeholder="/brand/vantara-logo.png"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#7B0242] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#5f0133] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </form>
  );
}
