/**
 * Admin → Media Library (Phase 6 CMS): Manage site-wide imagery and video assets.
 * Supports:
 *   1. Direct upload of images/thumbnails to Supabase Storage ('site-media' bucket).
 *   2. Adding external CDN links (Cloudinary / YouTube / Vimeo) to protect against 5 GB Supabase egress exhaustion.
 *   3. Instant 1-click URL copying for pasting into Hero slides, pages, or settings.
 */
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
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

  // External URL modal / inline form
  const [externalUrl, setExternalUrl] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalType, setExternalType] = useState<'image' | 'video'>('video');

  const load = async () => {
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
        .from('cms_media')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
      } else if (data) {
        setMediaList(data as CmsMediaRow[]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5 MB. Please compress images before uploading to save bandwidth.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `uploads/${Date.now()}_${cleanName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('site-media')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from('site-media').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // 3. Register in cms_media
      const mediaType = file.type.startsWith('video') ? 'video' : 'image';
      const { error: insertErr } = await supabase.from('cms_media').insert({
        filename: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: mediaType,
        size_bytes: file.size,
        alt_text: file.name.replace(`.${ext}`, ''),
      });

      if (insertErr) throw insertErr;

      setNotice(`File "${file.name}" uploaded successfully!`);
      await load();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upload media file.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddExternalMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl.trim() || !externalName.trim()) return;

    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: insertErr } = await supabase.from('cms_media').insert({
        filename: externalName.trim(),
        storage_path: null,
        public_url: externalUrl.trim(),
        media_type: externalType,
        size_bytes: null,
        alt_text: externalName.trim(),
      });

      if (insertErr) throw insertErr;

      setNotice(`External media "${externalName}" registered successfully!`);
      setExternalUrl('');
      setExternalName('');
      await load();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to register external media.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (media: CmsMediaRow) => {
    if (!confirm(`Are you sure you want to remove "${media.filename}"?`)) return;
    if (!isSupabaseConfigured()) {
      setError(NOT_CONFIGURED);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      if (media.storage_path) {
        await supabase.storage.from('site-media').remove([media.storage_path]);
      }

      await supabase.from('cms_media').delete().eq('id', media.id);
      setNotice(`"${media.filename}" deleted.`);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  const copyToClipboard = (url: string) => {
    void navigator.clipboard.writeText(url);
    alert('Public URL copied to clipboard! You can now paste it into Hero slides or settings.');
  };

  return (
    <div className="space-y-8">
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

      {/* Upload and External Link Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload directly */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Upload to Storage (Images & Thumbs)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Files stored in the public <code className="font-mono">site-media</code> bucket (max 5 MB).
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-6 transition hover:border-[#7B0242]">
            <span className="text-xs font-bold text-[#7B0242]">
              {uploading ? 'Uploading...' : '+ Select image or video file'}
            </span>
            <span className="mt-1 text-[11px] text-gray-400">WebP, PNG, JPG up to 5 MB</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              accept="image/*,video/mp4"
              className="hidden"
            />
          </label>
        </div>

        {/* Add external CDN URL */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Add External Media (CDN / Video)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Recommended for heavy videos (Cloudinary, Vimeo, YouTube) to avoid Supabase 5 GB bandwidth limits.
          </p>

          <form onSubmit={handleAddExternalMedia} className="mt-4 space-y-3">
            <div>
              <input
                type="text"
                placeholder="Asset Label (e.g. Goa Destination Video)"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#7B0242] focus:outline-none"
                required
              />
            </div>
            <div>
              <input
                type="url"
                placeholder="External CDN / Video URL (https://...)"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:border-[#7B0242] focus:outline-none"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <select
                value={externalType}
                onChange={(e) => setExternalType(e.target.value as 'image' | 'video')}
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
        <h2 className="text-base font-bold text-gray-900">Media Library ({mediaList.length})</h2>

        {loading ? (
          <div className="py-10 text-center text-xs text-gray-400">Loading media library...</div>
        ) : mediaList.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400">
            No media uploaded yet. Use the upload or external link box above.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {mediaList.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-gray-200 overflow-hidden flex items-center justify-center">
                  {item.media_type === 'video' ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <span className="text-2xl">🎬</span>
                      <span className="text-[10px] mt-1 font-semibold uppercase">Video Asset</span>
                    </div>
                  ) : (
                    <img
                      src={item.public_url}
                      alt={item.alt_text ?? item.filename}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                    {item.media_type}
                  </span>
                </div>

                <div className="p-3">
                  <div className="truncate text-xs font-bold text-gray-800" title={item.filename}>
                    {item.filename}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-400">
                    <span>{item.size_bytes ? `${Math.round(item.size_bytes / 1024)} KB` : 'External CDN'}</span>
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.public_url)}
                      className="flex-1 rounded-lg bg-white border border-gray-200 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(item)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition"
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
