import type { Timestamp } from 'firebase/firestore';

export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('/src/assets/images/')) {
    return url;
  }
  return null;
}

export function timestampToIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as Timestamp).toDate === 'function') {
    return (ts as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function uploadItemImage(file: File, firebaseIdToken: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
    },
    body: formData,
  });

  const data = (await response.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
  if (!response.ok || !data.imageUrl) {
    throw new Error(data.error || 'Unable to upload photograph.');
  }
  return data.imageUrl;
}
