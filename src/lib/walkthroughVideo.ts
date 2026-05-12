/**
 * Convert a video share URL (Loom, YouTube, Vimeo) into an embeddable URL.
 * Returns null if the URL is empty or unrecognised — the caller renders
 * a "coming soon" placeholder instead of a broken iframe.
 */
export function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Loom: https://www.loom.com/share/<id>  ->  https://www.loom.com/embed/<id>
  const loom = trimmed.match(/loom\.com\/(?:share|embed)\/([a-f0-9-]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;

  // YouTube: youtu.be/<id> or youtube.com/watch?v=<id>  ->  youtube.com/embed/<id>
  const ytShort = trimmed.match(/youtu\.be\/([\w-]+)/);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  const ytLong = trimmed.match(/youtube\.com\/watch\?[^#]*v=([\w-]+)/);
  if (ytLong) return `https://www.youtube.com/embed/${ytLong[1]}`;
  const ytEmbed = trimmed.match(/youtube\.com\/embed\/([\w-]+)/);
  if (ytEmbed) return `https://www.youtube.com/embed/${ytEmbed[1]}`;

  // Vimeo: https://vimeo.com/<id>  ->  https://player.vimeo.com/video/<id>
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  // Already an embed-style URL? Return as-is.
  if (/\/embed\//.test(trimmed) || /player\./.test(trimmed)) return trimmed;
  return null;
}
