import { supabase } from './supabase';

export type Bucket = 'evidence' | 'reports' | 'avatars';

export async function uploadFile(
  bucket: Bucket,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e: unknown) {
    return { url: null, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

export async function deleteFile(
  bucket: Bucket,
  path: string
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { error: null };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Delete failed' };
  }
}

export async function listFiles(
  bucket: Bucket,
  folder: string
): Promise<{ files: string[]; error: string | null }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    if (error) throw error;
    return { files: (data ?? []).map(f => f.name), error: null };
  } catch (e: unknown) {
    return { files: [], error: e instanceof Error ? e.message : 'List failed' };
  }
}

export function getPublicUrl(bucket: Bucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
