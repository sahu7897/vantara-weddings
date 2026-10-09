/**
 * Admin → FAQ Section Manager (Phase 6 CMS): Manage Homepage FAQs.
 * Allows adding, editing, reordering, and deleting frequently asked questions.
 */
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { FaqItem, FaqSectionContent } from '@/lib/supabase/types';
import { DEFAULT_FAQ_CONTENT } from '@/services/cmsData';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function FaqSectionPanel() {
  const [content, setContent] = useState<FaqSectionContent>(DEFAULT_FAQ_CONTENT);
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
          .eq('section_key', 'faqs')
          .maybeSingle();

        if (fetchErr) {
          setError(fetchErr.message);
        } else if (data?.content) {
          setContent({ ...DEFAULT_FAQ_CONTENT, ...(data.content as FaqSectionContent) });
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
          section_key: 'faqs',
          order_index: 5,
          is_active: true,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'page_slug,section_key' }
      );

      if (upsertErr) {
        setError(`Failed to save FAQ section: ${upsertErr.message}`);
      } else {
        setNotice('FAQ section updated successfully!');
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = (index: number, patch: Partial<FaqItem>) => {
    const updated = [...content.items];
    updated[index] = { ...updated[index], ...patch };
    setContent({ ...content, items: updated });
  };

  const handleAddItem = () => {
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      q: 'New Question',
      a: 'Detailed answer for your clients.',
    };
    setContent({ ...content, items: [...content.items, newItem] });
  };

  const handleDeleteItem = (index: number) => {
    const updated = content.items.filter((_, i) => i !== index);
    setContent({ ...content, items: updated });
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= content.items.length) return;
    const updated = [...content.items];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setContent({ ...content, items: updated });
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-500">Loading FAQ section...</div>;
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

      {/* Headings */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">FAQ Section Header</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700">Section Title</label>
            <input
              type="text"
              value={content.headline ?? ''}
              onChange={(e) => setContent({ ...content, headline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700">Section Subtitle</label>
            <textarea
              rows={2}
              value={content.subheadline ?? ''}
              onChange={(e) => setContent({ ...content, subheadline: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* FAQ Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">FAQ Items ({content.items.length})</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="rounded-xl border border-[#7B0242] px-4 py-2 text-xs font-bold text-[#7B0242] hover:bg-pink-50"
          >
            + Add FAQ
          </button>
        </div>

        {content.items.map((item, idx) => (
          <div key={item.id ?? idx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-gray-800">Question #{idx + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveItem(idx, 'up')}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  disabled={idx === content.items.length - 1}
                  onClick={() => handleMoveItem(idx, 'down')}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  ↓ Down
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(idx)}
                  className="rounded px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Question</label>
                <input
                  type="text"
                  value={item.q}
                  onChange={(e) => handleUpdateItem(idx, { q: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Answer</label>
                <textarea
                  rows={3}
                  value={item.a}
                  onChange={(e) => handleUpdateItem(idx, { a: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#7B0242] focus:outline-none"
                  required
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
          {saving ? 'Saving...' : 'Save FAQ Section'}
        </button>
      </div>
    </form>
  );
}
