/**
 * Client helpers for the media routes. Thin wrappers over `fetch` that normalise
 * the `{ ok, id } | { ok: false, errors }` shape the routes return, so callers
 * (MediaUpload, MediaDetail) don't hand-roll request plumbing. After a success a
 * component calls `router.refresh()` to pull the new dataset into context.
 */
"use client";

export type MediaMutationResult =
  | { ok: true; id?: string }
  | { ok: false; errors: Record<string, string> };

/** Upload a file + metadata. `form` must carry `file` and the metadata fields. */
export async function uploadMedia(form: FormData): Promise<MediaMutationResult> {
  try {
    const res = await fetch("/api/media", { method: "POST", body: form });
    const data = (await res.json().catch(() => null)) as MediaMutationResult | null;
    if (data) return data;
    return { ok: false, errors: { form: "Upload failed. Please try again." } };
  } catch {
    return { ok: false, errors: { form: "Network error. Please try again." } };
  }
}

/** Edit an existing item's metadata + person links (the file is left untouched). */
export interface MediaEditInput {
  title: string;
  type: string;
  year: string | number;
  description: string;
  personIds: string[];
}

export async function updateMedia(id: string, input: MediaEditInput): Promise<MediaMutationResult> {
  try {
    const res = await fetch(`/api/media/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as MediaMutationResult | null;
    if (data) return data;
    return { ok: false, errors: { form: "Save failed. Please try again." } };
  } catch {
    return { ok: false, errors: { form: "Network error. Please try again." } };
  }
}

export async function deleteMedia(id: string): Promise<MediaMutationResult> {
  try {
    const res = await fetch(`/api/media/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as MediaMutationResult | null;
    if (data) return data;
    return { ok: false, errors: { form: "Delete failed. Please try again." } };
  } catch {
    return { ok: false, errors: { form: "Network error. Please try again." } };
  }
}
