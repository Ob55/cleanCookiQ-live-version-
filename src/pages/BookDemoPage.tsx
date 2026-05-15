import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, PlayCircle, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sbAny } from "@/lib/sbAny";
import { toEmbedUrl } from "@/lib/walkthroughVideo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{6,}$/;

type Errors = Partial<Record<"name" | "email" | "phone", string>>;

interface WalkthroughVideo {
  id: string;
  role_key: string;
  title: string;
  description: string | null;
  video_url: string | null;
  display_order: number;
}

export default function BookDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeVideo, setActiveVideo] = useState<WalkthroughVideo | null>(null);

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["walkthrough-videos"],
    queryFn: async () => {
      const { data, error } = await sbAny
        .from("walkthrough_videos")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as WalkthroughVideo[];
    },
  });

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = "Please enter your full name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    if (!phone.trim()) next.phone = "Please enter your phone number.";
    else if (!PHONE_RE.test(phone.trim())) next.phone = "Enter a valid phone number.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("book-demo", {
        body: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      });
      if (error || (data && (data as any).error)) {
        const msg = (data as any)?.error || error?.message || "Something went wrong.";
        toast.error(msg);
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const activeEmbed = activeVideo ? toEmbedUrl(activeVideo.video_url) : null;

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-10 pb-8 px-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={2.25} />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Demo Booked!
              </h1>
              <p className="text-sm text-muted-foreground mb-8 font-body leading-relaxed">
                Thanks! We've received your request and will reach out shortly.
              </p>
              <Link to="/">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-amber-light font-semibold">
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="px-4 pt-16 pb-10 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-5">
            <Video className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Watch a walkthrough first</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            See CleanCookIQ for your role
          </h1>
          <p className="text-muted-foreground font-body leading-relaxed">
            Pick the walkthrough that matches you below — most questions get answered in the video.
            Still need a live conversation? Book a demo at the bottom of this page.
          </p>
        </div>
      </section>

      {/* Walkthrough tiles */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          {videosLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => {
                const hasVideo = !!toEmbedUrl(v.video_url);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => hasVideo && setActiveVideo(v)}
                    disabled={!hasVideo}
                    className={`text-left bg-card border rounded-xl p-5 transition-all
                      ${hasVideo
                        ? "border-border/60 hover:border-primary/40 hover:shadow-md cursor-pointer"
                        : "border-border/40 opacity-70 cursor-not-allowed"}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center
                        ${hasVideo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <PlayCircle className="h-5 w-5" />
                      </div>
                      <h3 className="font-display font-semibold text-foreground">{v.title}</h3>
                    </div>
                    {v.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                    )}
                    <p className={`text-xs mt-3 font-medium
                      ${hasVideo ? "text-primary" : "text-muted-foreground/70"}`}>
                      {hasVideo ? "▶ Watch walkthrough" : "Video coming soon"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-4 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
            Didn't find what you need?
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </div>

      {/* Book a demo form */}
      <section className="px-4 pb-20 pt-6">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Book a Demo
            </h2>
            <p className="text-sm text-muted-foreground font-body">
              Tell us how to reach you and we'll get in touch within 24 hours.
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="pt-8 pb-8 px-8">
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="demo-name">Full name</Label>
                  <Input
                    id="demo-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={!!errors.name}
                    disabled={submitting}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-email">Email</Label>
                  <Input
                    id="demo-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    disabled={submitting}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-phone">Phone number</Label>
                  <Input
                    id="demo-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254 700 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    aria-invalid={!!errors.phone}
                    disabled={submitting}
                  />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent text-accent-foreground hover:bg-amber-light font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Book Demo"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Video modal */}
      <Dialog
        open={!!activeVideo}
        onOpenChange={(v) => { if (!v) setActiveVideo(null); }}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="font-display">
              {activeVideo?.title}
            </DialogTitle>
            {activeVideo?.description && (
              <p className="text-sm text-muted-foreground">{activeVideo.description}</p>
            )}
          </DialogHeader>
          {activeEmbed ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={activeEmbed}
                title={activeVideo?.title}
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
          ) : (
            <div className="px-6 pb-6 text-sm text-muted-foreground">Video coming soon.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
