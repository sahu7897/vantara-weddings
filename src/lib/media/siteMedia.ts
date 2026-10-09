/**
 * Site media (CMS) uploads — Phase 6.
 *
 * Powers the admin panel's media library and the reusable <MediaPicker>:
 *   upload a file -> Supabase Storage `site-media` (public read) -> register a
 *   `cms_media` row -> hand back the public URL to store in a CMS field.
 *
 * Why this module exists: MediaLibraryPanel used to own this logic inline with
 * a hard 5 MB cap that made video uploads impossible, and no other panel could
 * read the library at all — so "change the hero video" meant hand-copying a
 * public URL out of the media grid and pasting it into a text box.
 *
 * Size policy (deliberate, three tiers):
 *   <= 40 MB  upload to Supabase Storage      (works out of the box)
 *   <= 500 MB allowed by the UI at all        (larger must be an external URL)
 *   >  500 MB reject                          (not a sensible web asset)
 * Supabase's own `site-media` bucket limit is 50 MB (documented default); 40 MB
 * leaves headroom and the error message tells the admin what to do instead.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CmsMediaRow } from '@/lib/supabase/types';

export const SITE_MEDIA_BUCKET = 'site-media';

/** Largest file we will push through Supabase Storage. */
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // 40 MB
/** Largest file we consider a sane web asset at all (external URLs allowed). */
export const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB

export const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'] as const;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export const IMAGE_ACCEPT = 'image/webp,image/jpeg,image/png,image/gif,image/avif';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';
export const ALL_MEDIA_ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

export type MediaKind = 'image' | 'video';

export function humanSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return 'external';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Best-effort classification for a picked file. */
export function kindOfFile(file: File): MediaKind {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  // Fall back to the extension when the browser reports no MIME type.
  return /\.(mp4|webm|mov)$/i.test(file.name) ? 'video' : 'image';
}

/**
 * Validates a picked file. Returns an error message, or null when valid.
 * `expected` lets a picker bound to a video-only field refuse an image.
 */
export function validateSiteMediaFile(file: File, expected?: MediaKind): string | null {
  const kind = kindOfFile(file);
  if (expected && kind !== expected) {
    return `This field expects ${expected === 'video' ? 'a video (mp4/webm/mov)' : 'an image (webp/jpg/png)'} — "${file.name}" looks like ${kind === 'video' ? 'a video' : 'an image'}.`;
  }
  const allowed: readonly string[] = kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
  const extOk = kind === 'video' ? /\.(mp4|webm|mov)$/i.test(file.name) : /\.(webp|jpe?g|png|gif|avif)$/i.test(file.name);
  if (!allowed.includes(file.type) && !extOk) {
    return `Unsupported ${kind} format "${file.type || file.name}". Allowed: ${allowed.join(', ')}.`;
  }
  if (file.size > MAX_TOTAL_BYTES) {
    return `"${file.name}" is ${humanSize(file.size)} — over the ${humanSize(MAX_TOTAL_BYTES)} limit. Use a shorter clip or an external CDN URL.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is ${humanSize(file.size)}. Supabase Storage uploads are capped at ${humanSize(MAX_UPLOAD_BYTES)} here — register it as an external CDN URL instead (Cloudinary / Vimeo / your own CDN), or compress it.`;
  }
  return null;
}

function safeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '') || 'media';
}

export interface UploadedMedia {
  row: CmsMediaRow;
  publicUrl: string;
}

/**
 * Uploads one file and registers it in `cms_media`.
 * Throws with an actionable message on failure.
 */
export async function uploadSiteMedia(
  supabase: SupabaseClient,
  file: File,
  expected?: MediaKind,
): Promise<UploadedMedia> {
  const invalid = validateSiteMediaFile(file, expected);
  if (invalid) throw new Error(invalid);

  const kind = kindOfFile(file);
  const path = `${kind}s/${Date.now()}-${safeName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '3600', upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from('cms_media')
    .insert({
      filename: file.name,
      storage_path: path,
      public_url: publicUrl,
      media_type: kind,
      size_bytes: file.size,
      alt_text: file.name.replace(/\.[^.]+$/, ''),
    })
    .select('*')
    .single();

  if (error || !data) {
    // Roll the orphaned object back so the bucket stays clean.
    await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path]);
    throw new Error(`Uploaded, but could not record it in the media library: ${error?.message ?? 'no row returned'}`);
  }
  return { row: data as CmsMediaRow, publicUrl };
}

/** Registers an external CDN / video URL without uploading anything. */
export async function registerExternalMedia(
  supabase: SupabaseClient,
  input: { filename: string; url: string; mediaType: MediaKind; altText?: string },
): Promise<CmsMediaRow> {
  const filename = input.filename.trim();
  const url = input.url.trim();
  if (!filename) throw new Error('Give the asset a label so it can be found later.');
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) {
    throw new Error('Enter a full https:// URL (or a site-relative /path).');
  }
  const { data, error } = await supabase
    .from('cms_media')
    .insert({
      filename,
      storage_path: null,
      public_url: url,
      media_type: input.mediaType,
      size_bytes: null,
      alt_text: input.altText?.trim() || filename,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not register the URL.');
  return data as CmsMediaRow;
}

export async function fetchSiteMedia(supabase: SupabaseClient): Promise<CmsMediaRow[]> {
  const { data, error } = await supabase
    .from('cms_media')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CmsMediaRow[];
}

/** Deletes the `cms_media` row first, then the storage object (if any). */
export async function deleteSiteMedia(supabase: SupabaseClient, row: CmsMediaRow): Promise<void> {
  const { error } = await supabase.from('cms_media').delete().eq('id', row.id);
  if (error) throw new Error(error.message);
  if (row.storage_path) {
    await supabase.storage.from(SITE_MEDIA_BUCKET).remove([row.storage_path]);
  }
}
