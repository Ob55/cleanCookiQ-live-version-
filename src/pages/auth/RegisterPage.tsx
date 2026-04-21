import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Building2, Factory, Banknote, FlaskConical, HelpCircle, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { sendEmail, emailOtherInterest } from "@/lib/emailService";

const orgTypes = [
  { value: "institution", label: "Institution", desc: "School, hospital, prison, factory", icon: Building2 },
  { value: "supplier", label: "Supplier / Provider", desc: "Equipment, installation, maintenance", icon: Factory },
  { value: "funder", label: "Funder / Financing Partner", desc: "Finance partner or investor", icon: Banknote },
  { value: "researcher", label: "Researcher", desc: "Academic or independent researcher", icon: FlaskConical },
  { value: "other", label: "Other Organisation", desc: "Other organisations interested in the platform", icon: HelpCircle },
];

const fundingTypes = [
  { value: "grant", label: "Grant" },
  { value: "loan", label: "Loan" },
  { value: "equity", label: "Equity" },
  { value: "csr_donation", label: "CSR Donation" },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [orgType, setOrgType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fundingType, setFundingType] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isSupplier = orgType === "supplier";
  const isFunder = orgType === "funder";
  const isOther = orgType === "other";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (isSupplier && !termsAccepted) { toast.error("You must accept the terms"); return; }
    if (isFunder && !fundingType) { toast.error("Please select your funding type"); return; }
    setLoading(true);

    const roleMap: Record<string, string> = {
      institution: "institution_admin",
      supplier: "ta_provider",
      funder: "financing_partner",
      csr: "viewer",
      researcher: "viewer",
      other: "viewer",
    };

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${import.meta.env.VITE_APP_URL || window.location.origin}/auth/login`,
        data: {
          full_name: fullName,
          org_type: orgType,
          org_name: orgName,
          phone,
          requested_role: roleMap[orgType] || "viewer",
        },
      },
    });

    if (error) {
      setLoading(false);
      if (error.message?.toLowerCase().includes("sending confirmation email")) {
        // User was created but Supabase couldn't send the verification email — navigate anyway
        toast.warning("Account created! The confirmation email is delayed — check your inbox in a few minutes or contact info@ignis-innovation.com.");
        navigate("/auth/verify-email");
      } else {
        toast.error(error.message);
      }
      return;
    }

    if (signUpData.user) {
      // Store email, org_name, description in profiles
      await supabase.from("profiles").update({ email, org_name: orgName, description: description || null }).eq("user_id", signUpData.user.id);

      // If funder, create funder_profiles record
      if (isFunder) {
        await supabase.from("funder_profiles").insert({
          user_id: signUpData.user.id,
          organisation_name: orgName,
          full_name: fullName,
          funding_type: fundingType,
          email,
          phone,
        });
      }

      // If other, send interest email
      if (isOther) {
        await sendEmail({
          to: email,
          subject: "Thank you for your interest in CleanCook IQ",
          html: emailOtherInterest(fullName, orgName),
        });
      }
    }

    setLoading(false);
    navigate(isOther ? "/auth/pending" : "/auth/verify-email");
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">C</span>
            </div>
            <span className="font-display font-bold text-xl">
              CleanCook<span className="text-accent">IQ</span>
            </span>
          </Link>
          <h1 className="text-2xl font-display font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1 ? "Select your organisation type" : "Enter your details"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-card">
          {step === 1 ? (
            <div className="space-y-3">
              {orgTypes.map((org) => (
                <button
                  key={org.value}
                  onClick={() => { setOrgType(org.value); setStep(2); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                    orgType === org.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    orgType === org.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <org.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{org.label}</p>
                    <p className="text-xs text-muted-foreground">{org.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
                <ArrowLeft className="h-3 w-3" /> Back
              </button>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-2">
                {(() => {
                  const org = orgTypes.find(o => o.value === orgType);
                  if (!org) return null;
                  return (
                    <>
                      <org.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{org.label}</span>
                    </>
                  );
                })()}
              </div>

              <div>
                <Label htmlFor="orgName">{isSupplier ? "Company Name" : "Organisation Name"}</Label>
                <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder={isSupplier ? "e.g. Clean Energy Solutions Ltd" : "e.g. Nairobi Primary School"} className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.co.ke" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" className="pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isOther && (
                <div>
                  <Label htmlFor="description">Brief Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell us about your organisation and what you're looking for..."
                    className="mt-1 min-h-[80px]"
                    required
                  />
                </div>
              )}

              {isFunder && (
                <div>
                  <Label htmlFor="fundingType">Type of Funding You Offer *</Label>
                  <select
                    id="fundingType"
                    value={fundingType}
                    onChange={e => setFundingType(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select funding type</option>
                    {fundingTypes.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {isSupplier && (
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-3">
                    By registering as a Supplier/Provider, you agree to CleanCookIQ's terms of service, including compliance with quality standards, timely delivery of products and services, and adherence to our partner code of conduct. You acknowledge that your profile and product listings will be visible to institutions and administrators on the platform.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    />
                    <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                      I accept the terms and conditions
                    </label>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary text-primary-foreground" disabled={loading || (isSupplier && !termsAccepted) || (isFunder && !fundingType) || (isOther && !description)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
