import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { sendEmail, emailSupplierWelcome } from "@/lib/emailService";

export default function SupplierSetup() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;
    setLoading(true);

    try {
      // Create organisation
      const { data: org, error: orgErr } = await supabase
        .from("organisations")
        .insert({
          name: companyName.trim(),
          org_type: "supplier" as any,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
        })
        .select("id")
        .single();

      if (orgErr) throw orgErr;

      // Link profile to organisation
      await supabase
        .from("profiles")
        .update({ organisation_id: org.id })
        .eq("user_id", user.id);

      // Create provider record
      const { error: provErr } = await supabase.from("providers").insert({
        name: companyName.trim(),
        organisation_id: org.id,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        contact_person: user.user_metadata?.full_name || null,
      });
      if (provErr) throw provErr;

      await refreshProfile();

      // Send welcome email
      const recipientEmail = contactEmail || user.email;
      if (recipientEmail) {
        await sendEmail({
          to: recipientEmail,
          subject: "Welcome to cleancookIQ as a Supplier",
          html: emailSupplierWelcome(
            user.user_metadata?.full_name || "",
            companyName.trim(),
          ),
        });
      }

      toast.success("Company setup complete!");
      setTimeout(() => navigate("/supplier/dashboard"), 100);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">C</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Set Up Your Company</CardTitle>
          <CardDescription>Tell us about your supplier company to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Clean Energy Solutions Ltd" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="contact-email">Company Email</Label>
              <Input id="contact-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="info@company.co.ke" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contact-phone">Company Phone</Label>
              <Input id="contact-phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+254 7XX XXX XXX" className="mt-1" />
            </div>
            <Button type="submit" className="w-full min-h-[44px]" disabled={!companyName.trim() || loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Continue to Dashboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
