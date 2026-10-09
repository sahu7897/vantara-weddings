/**
 * Admin → Hero Section Manager (Phase 6 CMS): Manage Homepage Hero Carousel & Video Slides.
 * Fully controls video slides, text badges, poster thumbnails, and CTA links.
 */
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { HeroSectionContent, HeroSlide } from '@/lib/supabase/types';
import { DEFAULT_HERO_CONTENT } from '@/services/cmsData';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function HeroSectionPanel() {
  const [content, setContent] = useState<HeroSectionContent>(DEFAULT_HERO_CONTENT);
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
        const { data, error: fetchErr } = await supabase
          .from('cms_sections')
          .select('content')
          .eq('page_slug', 'home')
          .eq('section_key', 'hero')
          .maybeSingle();

        if (fetchErr) {
          setError(fetchErr.message);
        } else if (data?.content) {
          setContent({ ...DEFAULT_HERO_CONTENT, ...(data.content as HeroSectionContent) });
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
      const { error: upsertErr } = await supabase.from('cms_sections').upsert(
        {
          page_slug: 'home',
          section_key: 'hero',
          order_index: 0,
          is_active: true,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'page_slug,section_key' }
      );

      if (upsertErr) {
        setError(`Failed to save hero section: ${upsertErr.message}`);
      } else {
        setNotice('Hero section and slides updated successfully!');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSlide = (index: number, patch: Partial<HeroSlide>) => {
    const updated = [...content.slides];
    updated[index] = { ...updated[index], ...patch };
    setContent({ ...content, slides: updated });
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now(),
      coupleName: 'New Couple',
      city: 'Delhi NCR',
      date: 'Dec ‘25',
      mobileUrl: '/gcpimages/weddings/assets/goa-new-ph-potrait.mp4',
      desktopUrl: '/gcpimages/weddings/assets/goa-new-ph.mp4',
      posterUrl: '/brand/vantara-logo.png',
    };
    setContent({ ...content, slides: [...content.slides, newSlide] });
  };

  const handleDeleteSlide = (index: number) => {
    if (content.slides.length <= 1) {
      alert('You must keep at least 1 hero slide.');
      return;
    }
    const updated = content.slides.filter((_, i) => i !== index);
    setContent({ ...content, slides: updated });
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= content.slides.length) return;
    const updated = [...content.slides];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setContent({ ...content, slides: updated });
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading hero section...</div>;
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

      {/* Hero Headings & CTAs */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Hero Headings & CTAs</h2>
        <p className="mt-1 text-xs text-gray-500">Main headline, subheadline, and action buttons.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700">Headline</label>
            <input
              type="text"
              value={content.headline ?? ''}
              onChange={(e) => setContent({ ...content, headline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700">Subheadline</label>
            <textarea
              rows={2}
              value={content.subheadline ?? ''}
              onChange={(e) => setContent({ ...content, subheadline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Primary CTA Label</label>
            <input
              type="text"
              value={content.primaryCtaText ?? ''}
              onChange={(e) => setContent({ ...content, primaryCtaText: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Primary CTA Link</label>
            <input
              type="text"
              value={content.primaryCtaLink ?? ''}
              onChange={(e) => setContent({ ...content, primaryCtaLink: e.target.value })}
              placeholder="/?leadform=true"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Secondary CTA Label</label>
            <input
              type="text"
              value={content.secondaryCtaText ?? ''}
              onChange={(e) => setContent({ ...content, secondaryCtaText: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Secondary CTA Link</label>
            <input
              type="text"
              value={content.secondaryCtaLink ?? ''}
              onChange={(e) => setContent({ ...content, secondaryCtaLink: e.target.value })}
              placeholder="/wedding-venues"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Video Carousel Slides */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Hero Video Slides ({content.slides.length})</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Each slide features an autoplaying video (desktop & mobile) with a couple badge.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSlide}
            className="rounded-xl border border-[#7B0242] px-4 py-2 text-xs font-bold text-[#7B0242] hover:bg-pink-50"
          >
            + Add Slide
          </button>
        </div>

        {content.slides.map((slide, idx) => (
          <div key={slide.id ?? idx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-gray-800">
                Slide #{idx + 1}: {slide.coupleName || 'Untitled'} ({slide.city})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveSlide(idx, 'up')}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  disabled={idx === content.slides.length - 1}
                  onClick={() => handleMoveSlide(idx, 'down')}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↓ Down
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlide(idx)}
                  className="rounded px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Couple / Client Name</label>
                <input
                  type="text"
                  value={slide.coupleName}
                  onChange={(e) => handleUpdateSlide(idx, { coupleName: e.target.value })}
                  placeholder="e.g. Anjali & Apurav"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">City / Destination</label>
                <input
                  type="text"
                  value={slide.city}
                  onChange={(e) => handleUpdateSlide(idx, { city: e.target.value })}
                  placeholder="e.g. Goa"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Event Date Badge</label>
                <input
                  type="text"
                  value={slide.date}
                  onChange={(e) => handleUpdateSlide(idx, { date: e.target.value })}
                  placeholder="e.g. May ‘25"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700">Desktop Video URL (.mp4 or CDN)</label>
                <input
                  type="text"
                  value={slide.desktopUrl}
                  onChange={(e) => handleUpdateSlide(idx, { desktopUrl: e.target.value })}
                  placeholder="/gcpimages/weddings/... or Cloudinary URL"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700">Mobile Video URL (.mp4 or CDN)</label>
                <input
                  type="text"
                  value={slide.mobileUrl}
                  onChange={(e) => handleUpdateSlide(idx, { mobileUrl: e.target.value })}
                  placeholder="/gcpimages/weddings/... or Cloudinary URL"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-700">Poster Thumbnail Image URL</label>
                <input
                  type="text"
                  value={slide.posterUrl}
                  onChange={(e) => handleUpdateSlide(idx, { posterUrl: e.target.value })}
                  placeholder="/gcpimages/weddings/... or WebP thumbnail"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#7B0242] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#5f0133] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Hero Section'}
        </button>
      </div>
    </form>
  );
}
