import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoUploaderProps {
  /** Storage bucket — defaults to the existing supplier-assets bucket. */
  bucket?: string;
  /** Path prefix inside the bucket (no trailing slash). */
  pathPrefix?: string;
  /** Existing URLs (controlled). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Max number of photos. Defaults to 5. */
  max?: number;
}

/**
 * Multi-photo uploader using Supabase Storage. Returns public URLs to the
 * caller via `onChange`. Failures are toast'd; the component never throws.
 */
export function PhotoUploader({
  bucket = "supplier-assets",
  pathPrefix = "uploads",
  value,
  onChange,
  max = 5,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    if (value.length + files.length > max) {
      toast.error(`Up to ${max} photos.`);
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      onChange([...value, ...uploaded]);
      toast.success(`Uploaded ${uploaded.length} photo${uploaded.length === 1 ? "" : "s"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={url} className="relative h-20 w-20 rounded-md overflow-hidden border bg-muted group">
            <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5 opacity-0 group-hover:opacity-100 transition"
              aria-label={`Remove photo ${i + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-20 w-20 flex-col gap-1"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span className="text-[10px]">Add</span>
          </Button>
        )}
      </div>
      <Badge variant="outline" className="text-[10px]">{value.length} / {max} photos</Badge>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
        capture="environment"
      />
    </div>
  );
}
