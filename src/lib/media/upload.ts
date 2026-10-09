/**
 * Vendor media uploads (Phase 5 §13.5).
 *
 * Validation happens client-side FIRST — ≤1 MB, webp/jpg/png only — then the
 * file goes to the `vendor-media` bucket under the `<vendor_id>/…` path
 * convention that storage RLS (migration 0003) enforces, and a matching
 * `public.vendor_media` row records it. Every call runs through the signed-in
 * admin/vendor session; the service role key never reaches the browser.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { VendorMediaRow } from '@/lib/supabase/types';

export const VENDOR_MEDIA_BUCKET = 'vendor-media';
export const MAX_MEDIA_BYTES = 1024 * 1024; // 1 MB
export const ACCEPTED_MEDIA_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
export const ACCEPTED_MEDIA_ATTR = 'image/webp,image/jpeg,image/png';

/** Returns an error message, or null when the file passes §13.5 rules. */
export function validateMediaFile(file: File): string | null {
  if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return 'Only webp, jpg or png images are allowed.';
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return 'Image must be 1 MB or smaller.';
  }
  return null;
}

function safeName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'image';
}

/** Uploads one image and inserts its `vendor_media` row. Throws on failure. */
export async function uploadVendorMedia(
  supabase: SupabaseClient,
  vendorId: string,
  file: File,
): Promise<VendorMediaRow> {
  const invalid = validateMediaFile(file);
  if (invalid) throw new Error(invalid);

  const path = `${vendorId}/${Date.now()}-${safeName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(VENDOR_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data, error } = await supabase
    .from('vendor_media')
    .insert({ vendor_id: vendorId, storage_path: path, alt_text: file.name })
    .select('*')
    .single();
  if (error || !data) {
    // Roll the orphaned object back so the bucket stays clean.
    await supabase.storage.from(VENDOR_MEDIA_BUCKET).remove([path]);
    throw new Error(`Could not record media row: ${error?.message ?? 'no row returned'}`);
  }
  return data as VendorMediaRow;
}

/** Deletes the `vendor_media` row first, then the storage object. */
export async function deleteVendorMedia(
  supabase: SupabaseClient,
  row: Pick<VendorMediaRow, 'id' | 'storage_path'>,
): Promise<void> {
  const { error } = await supabase.from('vendor_media').delete().eq('id', row.id);
  if (error) throw new Error(`Could not delete media row: ${error.message}`);
  await supabase.storage.from(VENDOR_MEDIA_BUCKET).remove([row.storage_path]);
}

/** Public URL of an object inside the public-read `vendor-media` bucket. */
export function publicMediaUrl(supabase: SupabaseClient, storagePath: string): string {
  return supabase.storage.from(VENDOR_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}
