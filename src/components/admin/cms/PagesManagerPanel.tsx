/**
 * Admin → Pages Manager (Phase 6 CMS): Edit marketing & legal pages.
 * Supports editing titles, headings, SEO metadata, and rich HTML body content.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { CmsPageRow } from '@/lib/supabase/types';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function PagesManagerPanel() {
  const [pages, setPages] = useState<CmsPageRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('about-us');
  const [selectedPage, setSelectedPage] = useState<Partial<CmsPageRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read the live selection inside the memoised `load` without making it a
  // dependency: a re-created `load` would re-fetch on every page switch and
  // discard an unsaved new page.
  const selectedSlugRef = useRef(selectedSlug);
  useEffect(() => {
    selectedSlugRef.current = selectedSlug;
  }, [selectedSlug]);

  const load = useCallback(async () => {
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
        .from('cms_pages')
        .select('*')
        .order('title', { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else if (data) {
        setPages(data as CmsPageRow[]);
        const initial = data.find((p) => p.slug === selectedSlugRef.current) || data[0];
        if (initial) {
          setSelectedSlug(initial.slug);
          setSelectedPage(initial);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectPage = (slug: string) => {
    setSelectedSlug(slug);
    const page = pages.find((p) => p.slug === slug);
    if (page) {
      setSelectedPage({ ...page });
    }
    setNotice(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage.slug || !selectedPage.title) {
      setError('Page title and slug are required.');
      return;
    }
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
      const { error: saveErr } = await supabase.from('cms_pages').upsert(
        {
          slug: selectedPage.slug,
          title: selectedPage.title,
          headline: selectedPage.headline ?? null,
          subheadline: selectedPage.subheadline ?? null,
          meta_title: selectedPage.meta_title ?? null,
          meta_description: selectedPage.meta_description ?? null,
          og_image: selectedPage.og_image ?? null,
          content_html: selectedPage.content_html ?? null,
          is_published: selectedPage.is_published ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      );

      if (saveErr) {
        setError(`Failed to save page: ${saveErr.message}`);
      } else {
        setNotice(`Page "${selectedPage.title}" updated successfully!`);
        await load();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewPage = () => {
    const slug = prompt('Enter URL slug for the new page (e.g. "team" or "faq"):');
    if (!slug) return;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const newPage: Partial<CmsPageRow> = {
      slug: cleanSlug,
      title: 'New Page',
      headline: 'Page Headline',
      subheadline: 'Subheadline describing this page',
      meta_title: 'New Page | Vantara Weddings',
      meta_description: 'Page description',
      content_html: '<p>Write your page content here...</p>',
      is_published: true,
    };
    setSelectedSlug(cleanSlug);
    setSelectedPage(newPage);
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading pages...</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Page list column */}
      <div className="lg:col-span-1">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-sm font-bold text-gray-900">All Pages ({pages.length})</h2>
            <button
              type="button"
              onClick={handleCreateNewPage}
              className="rounded-lg bg-pink-50 px-2.5 py-1 text-xs font-bold text-[#7B0242] hover:bg-pink-100"
            >
              + New
            </button>
          </div>

          <nav className="mt-2 space-y-1">
            {pages.map((page) => (
              <button
                key={page.slug}
                type="button"
                onClick={() => handleSelectPage(page.slug)}
                className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  selectedSlug === page.slug
                    ? 'bg-[#7B0242] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="truncate">{page.title}</div>
                <div className={`text-[10px] ${selectedSlug === page.slug ? 'text-pink-100' : 'text-gray-400'}`}>
                  /{page.slug}
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Editor column */}
      <div className="lg:col-span-3">
        <form onSubmit={handleSave} className="space-y-6">
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

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Editing: {selectedPage.title ?? 'Untitled'}
                </h2>
                <p className="text-xs text-gray-400">Route: /{selectedPage.slug}</p>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedPage.is_published ?? true}
                  onChange={(e) => setSelectedPage({ ...selectedPage, is_published: e.target.checked })}
                  className="rounded text-[#7B0242] focus:ring-[#7B0242]"
                />
                Published
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Page Title</label>
                <input
                  type="text"
                  value={selectedPage.title ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">URL Slug</label>
                <input
                  type="text"
                  value={selectedPage.slug ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, slug: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Main Headline</label>
                <input
                  type="text"
                  value={selectedPage.headline ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, headline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Subheadline</label>
                <textarea
                  rows={2}
                  value={selectedPage.subheadline ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, subheadline: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Meta Title (SEO)</label>
                <input
                  type="text"
                  value={selectedPage.meta_title ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, meta_title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Meta Description (SEO)</label>
                <textarea
                  rows={2}
                  value={selectedPage.meta_description ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, meta_description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700">Page Body Content (HTML)</label>
                <p className="text-[11px] text-gray-400 mb-1">
                  Supports standard HTML tags (e.g. &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;).
                </p>
                <textarea
                  rows={10}
                  value={selectedPage.content_html ?? ''}
                  onChange={(e) => setSelectedPage({ ...selectedPage, content_html: e.target.value })}
                  className="font-mono text-xs w-full rounded-lg border border-gray-200 p-3 focus:border-[#7B0242] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#7B0242] px-6 py-2.5 text-sm font-bold text-white shadow transition hover:bg-[#5f0133] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
