import { Loader2 } from "lucide-react";

// Lightweight in-content loader for lazy route chunks. Unlike BrandedLoader
// (a full-screen takeover), this only fills the content area, so the layout
// shell (sidebar + header) stays put while the next page's chunk loads —
// navigation feels instant instead of blanking the whole screen.
export default function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
