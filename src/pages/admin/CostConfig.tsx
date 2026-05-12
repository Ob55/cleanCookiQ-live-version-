import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from "lucide-react";

/**
 * Deprecated. Technology Profiles + the Financing Designer are now the single
 * source of truth for per-technology cost data, so this admin screen no longer
 * edits live values — it just routes admins to the right place.
 *
 * Closes methodology gap (b): the platform previously stored per-student cost
 * parameters here AND per-technology profiles in `technology_profiles`. Nothing
 * reconciled the two. This page is retained as a redirect so any bookmarked
 * link still lands somewhere sensible.
 */
export default function CostConfig() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Cost Table Configuration</h1>
        <p className="text-sm text-muted-foreground">
          This screen has been retired.
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-5 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-medium">Per-technology costs now live in Technology Profiles.</p>
          <p className="text-muted-foreground">
            The Financing Designer reads from the <code>technology_profiles</code> table — capex
            range, lifetime, maintenance, salvage, install cost and efficiency are all editable
            there. The previous per-student values stored here are no longer consulted by any
            calculation.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <Link to="/admin/financing">
            Go to Financing Designer <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
