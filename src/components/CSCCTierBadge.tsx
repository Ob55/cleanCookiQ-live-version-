import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { csccTierDescription, csccTierLabel, type CSCCTier } from "@/lib/marketplace";
import { cn } from "@/lib/utils";

const STYLES: Record<CSCCTier, string> = {
  tier_1: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  tier_2: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  tier_3: "bg-red-100 text-red-800 hover:bg-red-100",
  unrated: "bg-muted text-muted-foreground hover:bg-muted",
};

const ICONS: Record<CSCCTier, React.ElementType> = {
  tier_1: ShieldCheck,
  tier_2: Shield,
  tier_3: ShieldAlert,
  unrated: ShieldQuestion,
};

export function CSCCTierBadge({ tier, className }: { tier: CSCCTier; className?: string }) {
  const Icon = ICONS[tier];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${csccTierLabel(tier)} — click for details`}
          className={cn("inline-flex", className)}
        >
          <Badge className={cn("gap-1 cursor-help", STYLES[tier])}>
            <Icon className="h-3 w-3" />
            {csccTierLabel(tier)}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm space-y-2">
        <p className="font-medium">{csccTierLabel(tier)}</p>
        <p className="text-xs text-muted-foreground">{csccTierDescription(tier)}</p>
        <p className="text-xs text-muted-foreground italic">
          CSCC = Clean Cooking Supplier Certification (KEBS / EPRA / business compliance).
        </p>
      </PopoverContent>
    </Popover>
  );
}
