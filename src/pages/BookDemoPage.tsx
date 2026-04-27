import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s\-().]{6,}$/;

type Errors = Partial<Record<"name" | "email" | "phone", string>>;

export default function BookDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {submitted ? (
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
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
                Book a Demo
              </h1>
              <p className="text-muted-foreground font-body">
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
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
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
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
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
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
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
          </>
        )}
      </div>
    </div>
  );
}
