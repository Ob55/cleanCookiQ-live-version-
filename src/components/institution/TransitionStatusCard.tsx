import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Lightbulb, HandCoins, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { METHOD_LABELS } from "@/lib/institutionDerived";
import { cn } from "@/lib/utils";

type Inst = {
  id: string;
  verification_status?: string | null;
  recommended_solution?: string | null;
  recommendation_reason?: string | null;
};

/** The institution's own view of the admin pipeline: validation → method → funder. */
export default function TransitionStatusCard({ institution }: { institution: Inst }) {
  const { data: funded = false } = useQuery({
    queryKey: ["my-funder-allocated", institution.id],
    queryFn: async () => {
      const { count } = await supabase.from("funder_institution_links")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institution.id).eq("status", "active");
      return (count ?? 0) > 0;
    },
  });

  const status = institution.verification_status ?? "unverified";
  const method = institution.recommended_solution;
  const ready = status === "verified" && !!method && funded;

  const steps = [
    {
      done: status === "verified",
      icon: status === "flagged" ? AlertTriangle : status === "verified" ? CheckCircle2 : Clock,
      title: "Data validation",
      text: status === "verified" ? "Your institution's details have been verified."
        : status === "flagged" ? "Some details need checking — the CleanCookIQ team will contact you."
        : "Your details are waiting to be verified.",
    },
    {
      done: !!method,
      icon: Lightbulb,
      title: "Proposed cooking method",
      text: method ? `${METHOD_LABELS[method] ?? method}. ${institution.recommendation_reason ?? ""}` : "A clean cooking method will be proposed after validation.",
    },
    {
      done: funded,
      icon: HandCoins,
      title: "Funding",
      text: funded ? "A funder has been allocated to support your transition." : "No funder allocated yet.",
    },
  ];

  return (
    <Card className={cn(ready && "border-primary")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          Your transition status
          <span className={cn("text-xs font-semibold", ready ? "text-primary" : "text-muted-foreground")}>
            {ready ? "Ready for transition" : `${steps.filter((s) => s.done).length}/3 steps done`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {steps.map(({ done, icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3">
            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0",
              done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
