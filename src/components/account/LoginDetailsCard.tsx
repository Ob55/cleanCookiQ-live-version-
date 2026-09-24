import { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Change own sign-in email / password (e.g. after an admin-created login). */
export default function LoginDetailsCard() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState<"email" | "pw" | null>(null);

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/auth/login` },
    );
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Check ${email.trim()} for a confirmation link to finish the change`);
    setEmail("");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Passwords don't match"); return; }
    setBusy("pw");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Password changed");
    setPw(""); setPw2("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Login details</CardTitle>
        <CardDescription>Signed in as <span className="font-medium">{user?.email}</span></CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <form onSubmit={changeEmail} className="space-y-2">
          <Label htmlFor="new-email">New email</Label>
          <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Button type="submit" variant="outline" disabled={busy !== null || !email.trim()}>
            {busy === "email" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />} Change email
          </Button>
        </form>
        <form onSubmit={changePassword} className="space-y-2">
          <Label htmlFor="new-pw">New password</Label>
          <Input id="new-pw" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <Label htmlFor="new-pw2">Confirm new password</Label>
          <Input id="new-pw2" type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
          <Button type="submit" variant="outline" disabled={busy !== null || pw.length < 8}>
            {busy === "pw" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />} Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
