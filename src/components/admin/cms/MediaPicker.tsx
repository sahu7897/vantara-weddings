/**
 * <MediaPicker> — reusable admin control for choosing an image or video.
 *
 * Closes the Phase-6 gap where every media field was a plain text input: an
 * admin had to upload a file in the Media tab, copy its public URL, walk back
 * to the editing panel and paste it. Now any panel can offer the same three
 * routes to a value:
 *
 *   Library  — pick an already-registered `cms_media` asset (thumbnail grid)
 *   Upload   — push a new file to the `site-media` bucket and register it
 *   URL      — record an external CDN / video URL (Cloudinary, Vimeo, …)
 *
 * The chosen value is the public URL, so it drops straight into the existing
 * CMS JSON shape and the public site needs no changes to consume it.
 *
 * Nothing here is admin-specific in principle, but it performs writes, so RLS
 * (migration 0007: only `is_admin()`) is what actually authorises it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ALL_MEDIA_ACCEPT,
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
  humanSize,
  kindOfFile,
  registerExternalMedia,
  uploadSiteMedia,
  type MediaKind,
} from '@/lib/media/siteMedia';
import type { CmsMediaRow } from '@/lib/supabase/types';

const NOT_CONFIGURED =
  'Supabase is not configured in this build — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and rebuild.';

interface MediaPickerProps {
  /** Field label rendered above the control. */
  label: string;
  /** Current value (public URL, or empty). */
  value: string;
  /** Called with the new URL (or '' when cleared). */
  onChange: (url: string) => void;
  /** Restrict to images or videos. Defaults to both. */
  expected?: MediaKind;
  /** Hint text shown under the label. */
  hint?: string;
  /** Placeholder for the manual URL input. */
  placeholder?: string;
  className?: string;
}

const inputClass =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-xs text-gray-800 outline-none focus:border-[#7B0242] focus:ring-1 focus:ring-[#7B0242]';

export default function MediaPicker({
  label,
  value,
  onChange,
  expected,
  hint,
  placeholder,
  className,
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload' | 'url'>('library');
  const [items, setItems] = useState<CmsMediaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | MediaKind>(expected ?? 'all');

  // upload tab state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // url tab state
  const [urlLabel, setUrlLabel] = useState('');
  const [urlValue, setUrlValue] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const accept = expected === 'video' ? VIDEO_ACCEPT : expected === 'image' ? IMAGE_ACCEPT : ALL_MEDIA_ACCEPT;

  const loadLibrary = useCallback(async () => {
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
      if (fetchErr) throw new Error(fetchErr.message);
      setItems((data ?? []) as CmsMediaRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === 'library') void loadLibrary();
  }, [open, tab, loadLibrary]);

  // Revoke the object URL when the chosen file changes or the modal closes.
  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((m) => m.media_type === filter)),
    [items, filter],
  );

  const pick = (url: string) => {
    onChange(url);
    setOpen(false);
    setError(null);
  };

  const doUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { publicUrl } = await uploadSiteMedia(supabase, file, expected);
      pick(publicUrl);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const doRegisterUrl = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const kind: MediaKind = expected ?? (/\.(mp4|webm|mov)(\?|$)/i.test(urlValue) ? 'video' : 'image');
      const row = await registerExternalMedia(supabase, {
        filename: urlLabel || urlValue.split('/').pop() || 'external asset',
        url: urlValue,
        mediaType: kind,
      });
      pick(row.public_url);
      setUrlLabel('');
      setUrlValue('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const isVideoValue = /\.(mp4|webm|mov)(\?|$)/i.test(value);

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      {hint && <p className="mb-1 text-[11px] text-gray-400">{hint}</p>}

      <div className="flex items-start gap-2">
        {/* live preview */}
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {value ? (
            isVideoValue ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="text-[10px] text-gray-400">none</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            className={inputClass}
            value={value}
            placeholder={placeholder ?? (expected === 'video' ? '/path/or https://… .mp4' : '/path/or https://… .webp')}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => { setOpen(true); setTab('library'); setFilter(expected ?? 'all'); }}
              className="rounded-lg bg-[#7B0242] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#5f0133]"
            >
              📁 Choose / Upload
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── modal ─────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[400] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Choose media for ${label}`}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">{label}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close">✕</button>
            </div>

            {/* tabs */}
            <div className="mt-3 flex gap-1 rounded-xl bg-gray-100 p-1 text-xs font-semibold">
              {([
                ['library', '📁 Library'],
                ['upload', '⬆️ Upload new'],
                ['url', '🔗 External URL'],
              ] as const).map(([id, text]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-lg py-1.5 transition ${tab === id ? 'bg-white text-[#7B0242] shadow' : 'text-gray-500'}`}
                >
                  {text}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] text-rose-700">{error}</div>
            )}

            {/* LIBRARY */}
            {tab === 'library' && (
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-500">
                    {loading ? 'Loading…' : `${visible.length} asset${visible.length === 1 ? '' : 's'}`}
                  </p>
                  {!expected && (
                    <div className="flex gap-1">
                      {(['all', 'image', 'video'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilter(f)}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${filter === f ? 'bg-[#7B0242] text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!loading && visible.length === 0 ? (
                  <p className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-500">
                    Nothing here yet. Use <strong>Upload new</strong> to add a file, or <strong>External URL</strong> to point at a CDN.
                  </p>
                ) : (
                  <ul className="mt-3 grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
                    {visible.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => pick(item.public_url)}
                          className="group w-full overflow-hidden rounded-xl border border-gray-200 text-left hover:border-[#7B0242]"
                        >
                          <div className="relative flex aspect-video items-center justify-center bg-gray-100">
                            {item.media_type === 'video' ? (
                              <video src={item.public_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.public_url} alt={item.alt_text ?? item.filename} className="h-full w-full object-cover" />
                            )}
                            <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                              {item.media_type}
                            </span>
                          </div>
                          <div className="p-1.5">
                            <div className="truncate text-[11px] font-semibold text-gray-700" title={item.filename}>
                              {item.filename}
                            </div>
                            <div className="text-[10px] text-gray-400">{humanSize(item.size_bytes)}</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* UPLOAD */}
            {tab === 'upload' && (
              <div className="mt-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-6 transition hover:border-[#7B0242]">
                  <span className="text-xs font-bold text-[#7B0242]">
                    {busy ? 'Uploading…' : file ? file.name : `Select ${expected ?? 'image or video'} file`}
                  </span>
                  <span className="mt-1 text-[11px] text-gray-400">
                    {expected === 'video'
                      ? 'MP4 / WebM / MOV · up to 40 MB'
                      : expected === 'image'
                        ? 'WebP / JPG / PNG / GIF / AVIF · up to 40 MB'
                        : 'Images up to 40 MB · videos up to 40 MB (bigger → use External URL)'}
                  </span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
                  />
                </label>

                {filePreview && file && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                    <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {kindOfFile(file) === 'video' ? (
                        <video src={filePreview} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={filePreview} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-[11px]">
                      <div className="truncate font-semibold text-gray-800">{file.name}</div>
                      <div className="text-gray-400">{humanSize(file.size)} · {kindOfFile(file)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!file || busy}
                  onClick={() => void doUpload()}
                  className="mt-3 w-full rounded-xl bg-[#7B0242] py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy ? 'Uploading…' : 'Upload & use this file'}
                </button>
              </div>
            )}

            {/* EXTERNAL URL */}
            {tab === 'url' && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-gray-500">
                  Register a CDN / hosted file (Cloudinary, Vimeo, S3, your own server). Nothing is uploaded — the URL is
                  stored and saved into the library for reuse.
                </p>
                <input
                  className={inputClass}
                  placeholder="Asset label (e.g. Goa Hero Video)"
                  value={urlLabel}
                  onChange={(e) => setUrlLabel(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="https://…mp4 or /gcpimages/…mp4 or https://…webp"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!urlValue.trim() || busy}
                  onClick={() => void doRegisterUrl()}
                  className="w-full rounded-xl bg-[#7B0242] py-2 text-xs font-bold text-white disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Register & use this URL'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
