/**
 * Admin → Media Library (Phase 6 CMS): the site-wide image and video store.
 *
 * Three ways in, all funnelling through `src/lib/media/siteMedia.ts`:
 *   1. Upload a file to the public `site-media` bucket and register a `cms_media` row.
 *   2. Register an external CDN / video URL (Cloudinary, Vimeo, S3) — nothing is
 *      uploaded, which matters because Supabase's free egress is finite.
 *   3. Copy an asset's public URL for any field that still takes a raw path.
 *
 * Fixed here: the previous inline implementation enforced a **5 MB** cap and
 * advertised "WebP, PNG, JPG", so uploading a hero video was impossible even
 * though the file input hinted at `video/mp4`. Limits now come from one shared
 * module (40 MB upload / 500 MB absolute) and videos get an inline preview
 * instead of a 🎬 placeholder.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ALL_MEDIA_ACCEPT,
  deleteSiteMedia,
  fetchSiteMedia,
  humanSize,
  registerExternalMedia,
  uploadSiteMedia,
  type MediaKind,
} from '@/lib/media/siteMedia';
import type { CmsMediaRow } from '@/lib/supabase/types';

/** Shown instead of an unhandled throw when the build has no Supabase keys. */
const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

export default function MediaLibraryPanel() {
  const [mediaList, setMediaList] = useState<CmsMediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | MediaKind>('all');
  const [copied, setCopied] = useState<string | null>(null);

  // External URL form
  const [externalUrl, setExternalUrl] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalType, setExternalType] = useState<MediaKind>('video');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setLoading(false);
      return;
    }
    try {
      setMediaList(await fetchSiteMedia(getSupabaseBrowserClient()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => (filter === 'all' ? mediaList : mediaList.filter((m) => m.media_type === filter)),
    [mediaList, filter],
  );

  const counts = useMemo(
    () => ({
      all: mediaList.length,
      image: mediaList.filter((m) => m.media_type === 'image').length,
      video: mediaList.filter((m) => m.media_type === 'video').length,
    }),
    [mediaList],
  );

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      setUploading(false);
      return;
    }
    try {
      const supabase = getSupabaseBrowserClient();
      const done: string[] = [];
      for (const file of files) {
        // uploadSiteMedia validates size/type and rolls storage back on failure
        await uploadSiteMedia(supabase, file);
        done.push(file.name);
      }
      setNotice(`Uploaded ${done.length} file${done.length === 1 ? '' : 's'}: ${done.join(', ')}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload media file.');
      await load();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddExternalMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const row = await registerExternalMedia(getSupabaseBrowserClient(), {
        filename: externalName,
        url: externalUrl,
        mediaType: externalType,
      });
      setNotice(`Registered "${row.filename}" (external URL).`);
      setExternalUrl('');
      setExternalName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register external media.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (media: CmsMediaRow) => {
    if (!window.confirm(`Remove "${media.filename}" from the library?`)) return;
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }
    setError(null);
    try {
      await deleteSiteMedia(getSupabaseBrowserClient(), media);
      setNotice(`"${media.filename}" deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not access the clipboard — copy the URL manually from the field.');
    }
  };

  return (
    <div className="space-y-8">
      {notice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload directly */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Upload images &amp; videos</h2>
          <p className="mt-1 text-xs text-gray-500">
            Stored in the public <code className="font-mono">site-media</code> bucket. Multiple files allowed.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6 transition hover:border-[#7B0242]">
            <span className="text-xs font-bold text-[#7B0242]">
              {uploading ? 'Uploading…' : '+ Select image or video files'}
            </span>
            <span className="mt-1 text-center text-[11px] text-gray-400">
              WebP · JPG · PNG · GIF · AVIF — and MP4 · WebM · MOV
              <br />
              up to 40 MB each (larger videos → use an external URL)
            </span>
            <input
              type="file"
              multiple
              onChange={handleFiles}
              disabled={uploading}
              accept={ALL_MEDIA_ACCEPT}
              className="hidden"
            />
          </label>
        </div>

        {/* Add external CDN URL */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Add external media (CDN / video)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Recommended for heavy videos (Cloudinary, Vimeo, your own CDN) to avoid Supabase bandwidth limits.
          </p>
          <form onSubmit={handleAddExternalMedia} className="mt-4 space-y-3">
            <input
              type="text"
              placeholder="Asset label (e.g. Goa Destination Video)"
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#7B0242] focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="https://…mp4 or /gcpimages/…webp"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#7B0242] focus:outline-none"
              required
            />
            <div className="flex items-center justify-between">
              <select
                value={externalType}
                onChange={(e) => setExternalType(e.target.value as MediaKind)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-[#7B0242] focus:outline-none"
              >
                <option value="video">Type: Video</option>
                <option value="image">Type: Image</option>
              </select>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-[#7B0242] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#5f0133] disabled:opacity-50"
              >
                + Register URL
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Media Grid */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900">Media Library ({mediaList.length})</h2>
          <div className="flex gap-1">
            {(['all', 'image', 'video'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                  filter === f ? 'bg-[#7B0242] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f} ({counts[f]})
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          Tip: every media field in the CMS (hero slides, logo, OG image) has its own
          <strong> Choose / Upload</strong> button, so you rarely need to copy URLs by hand.
        </p>

        {loading ? (
          <div className="py-10 text-center text-xs text-gray-400">Loading media library…</div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400">
            {mediaList.length === 0
              ? 'No media uploaded yet. Use the upload or external link box above.'
              : `No ${filter} assets in the library.`}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
              >
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gray-200">
                  {item.media_type === 'video' ? (
                    <video
                      src={item.public_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.public_url}
                      alt={item.alt_text ?? item.filename}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                    {item.media_type}
                  </span>
                </div>

                <div className="p-3">
                  <div className="truncate text-xs font-bold text-gray-800" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{humanSize(item.size_bytes)}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void copyUrl(item.public_url)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      {copied === item.public_url ? '✓ Copied' : 'Copy URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteMedia(item)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100"
                      aria-label={`Delete ${item.filename}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
