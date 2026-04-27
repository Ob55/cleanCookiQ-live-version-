/**
 * Onboarding wizard primitives (Workstream 8).
 *
 * The Wizard component takes a `steps` array and a `data` object. Each
 * step declares a `validate(data)` function that returns either null
 * (ok) or a list of issues. Pure helpers here keep the navigation logic
 * unit-testable.
 */

export interface WizardStep<T = Record<string, unknown>> {
  id: string;
  title: string;
  description?: string;
  /** Returns issues to display, or null/[] if the step is valid. */
  validate?: (data: T) => string[] | null;
}

export interface NavigationState {
  /** Current step index, 0-based. */
  index: number;
  /** Total number of steps. */
  total: number;
  /** Whether the user can advance to the next step. */
  canNext: boolean;
  /** Whether the user can go back to the previous step. */
  canBack: boolean;
  /** Issues from validating the current step. */
  issues: string[];
  /** True if on the last step AND it validates. */
  canFinish: boolean;
  /** 0..1 progress through the wizard. */
  progress: number;
}

export function navigationState<T>(
  steps: WizardStep<T>[],
  index: number,
  data: T,
): NavigationState {
  const total = steps.length;
  const safeIndex = clamp(index, 0, Math.max(total - 1, 0));
  const current = steps[safeIndex];
  const issues = current?.validate?.(data) ?? [];
  const valid = issues.length === 0;
  const isLast = safeIndex === total - 1;
  return {
    index: safeIndex,
    total,
    canBack: safeIndex > 0,
    canNext: !isLast && valid,
    issues,
    canFinish: isLast && valid,
    progress: total === 0 ? 0 : (safeIndex + (valid ? 1 : 0)) / total,
  };
}

/** Move forward one step, clamped to the last step. Pure. */
export function advance(currentIndex: number, total: number): number {
  return clamp(currentIndex + 1, 0, Math.max(total - 1, 0));
}

/** Move back one step, clamped to 0. Pure. */
export function rewind(currentIndex: number): number {
  return Math.max(currentIndex - 1, 0);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

// ============================================================
// Common validators (small composable building blocks)
// ============================================================

export function required<T>(field: keyof T, label: string) {
  return (data: T): string[] => {
    const v = data[field];
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      return [`${label} is required.`];
    }
    return [];
  };
}

export function minLength<T>(field: keyof T, n: number, label: string) {
  return (data: T): string[] => {
    const v = data[field];
    if (typeof v === "string" && v.length < n) {
      return [`${label} must be at least ${n} characters.`];
    }
    return [];
  };
}

export function email<T>(field: keyof T, label: string) {
  return (data: T): string[] => {
    const v = data[field];
    if (typeof v === "string" && v.length > 0 && !/.+@.+\..+/.test(v)) {
      return [`${label} must be a valid email address.`];
    }
    return [];
  };
}

/** Combine multiple validators into one. */
export function combineValidators<T>(...validators: Array<(d: T) => string[]>) {
  return (data: T): string[] => validators.flatMap((v) => v(data));
}
