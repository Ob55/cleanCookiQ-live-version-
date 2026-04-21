import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, User, CheckCircle, TrendingUp, BarChart3, PieChart } from "lucide-react";

export default function MarketingAnalysis() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("newsletter_subscribers" as any)
      .insert({ full_name: name.trim(), email: email.trim().toLowerCase() } as any);
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("This email is already subscribed");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      return;
    }
    setSubmitted(true);
    toast.success("Successfully subscribed!");
  };

  return (
    <div>
      {/* Hero */}
      <section className="py-20 lg:py-28 bg-gradient-hero text-primary-foreground">
        <div className="container text-center">
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
            Market Insights
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Clear, data-backed insights into Kenya's clean cooking sector.
          </p>
        </div>
      </section>

      {/* Insights */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <TrendingUp className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Market Growth</h3>
                <p className="text-sm text-muted-foreground">Kenya's institutional clean cooking market is set to grow 340% by 2030, pushed by government policy and carbon finance.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <BarChart3 className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Pipeline Analytics</h3>
                <p className="text-sm text-muted-foreground">Live data on 2,847+ institutions across 47 counties, covering fuel usage, readiness to switch, and financing needs.</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-6">
                <PieChart className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Sector Breakdown</h3>
                <p className="text-sm text-muted-foreground">A detailed view by type: schools, hospitals, prisons, and commercial sites, each with its own recommended path to clean cooking.</p>
              </CardContent>
            </Card>
          </div>

          {/* Subscribe */}
          <div className="max-w-lg mx-auto">
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-xl font-display">Subscribe for Market Updates</CardTitle>
                <CardDescription>Get monthly reports on clean cooking market trends and opportunities.</CardDescription>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-6">
                    <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h3 className="font-display font-bold text-lg mb-1">You're Subscribed!</h3>
                    <p className="text-sm text-muted-foreground">Thank you for subscribing. You'll receive our next market report.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Full Name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-amber-light" disabled={loading}>
                      {loading ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
