import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { advance, navigationState, rewind, type WizardStep } from "@/lib/onboarding";

export interface WizardProps<T> {
  steps: WizardStep<T>[];
  data: T;
  /** Render the input UI for the step at the given index. */
  renderStep: (index: number, data: T, setData: (d: T) => void) => ReactNode;
  /** Called when the user finishes the last step and clicks Finish. */
  onFinish: (data: T) => void | Promise<void>;
  setData: (d: T) => void;
  finishLabel?: string;
}

/**
 * Generic multi-step wizard. Drives navigation + validation; the host
 * page supplies the field UI per step via `renderStep`.
 */
export function Wizard<T>({ steps, data, setData, renderStep, onFinish, finishLabel = "Finish" }: WizardProps<T>) {
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const nav = navigationState(steps, index, data);
  const current = steps[nav.index];

  const handleFinish = async () => {
    if (!nav.canFinish) return;
    setSubmitting(true);
    try {
      await onFinish(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{current?.title}</CardTitle>
            {current?.description && <CardDescription>{current.description}</CardDescription>}
          </div>
          <span className="text-xs text-muted-foreground">
            Step {nav.index + 1} of {nav.total}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(nav.progress * 100)}%` }}
            role="progressbar"
            aria-valuenow={Math.round(nav.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderStep(nav.index, data, setData)}

        {nav.issues.length > 0 && (
          <ul className="text-sm text-destructive space-y-1" role="alert">
            {nav.issues.map((i) => (
              <li key={i}>• {i}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIndex(rewind(index))}
            disabled={!nav.canBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {nav.canFinish ? (
            <Button size="sm" onClick={handleFinish} disabled={submitting}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {submitting ? "Saving..." : finishLabel}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIndex(advance(index, nav.total))}
              disabled={!nav.canNext}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
