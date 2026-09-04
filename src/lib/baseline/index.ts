/**
 * Baseline resolver + public surface for the programme-detail baseline feature.
 *
 * Each county baseline lives in its own module (a static, survey-derived
 * ProgrammeBaseline) with a name matcher. getProgrammeBaseline() picks the first
 * one whose matcher accepts the programme name, or null for programmes without a
 * baseline (which fall back to the generic programme views).
 *
 * To add another county: create ./<county>.ts exporting `<COUNTY>_BASELINE` and
 * `matches<County>(name)`, then add one entry to REGISTRY below.
 */
import type { ProgrammeBaseline } from "@/lib/baseline/types";
import { TAITA_TAVETA_BASELINE, matchesTaita } from "@/lib/baseline/taitaTaveta";
import { MAKUENI_BASELINE, matchesMakueni } from "@/lib/baseline/makueni";

export type { BaselineGroup, ProgrammeBaseline } from "@/lib/baseline/types";

const REGISTRY: { matches: (n: string | null | undefined) => boolean; baseline: ProgrammeBaseline }[] = [
  { matches: matchesTaita, baseline: TAITA_TAVETA_BASELINE },
  { matches: matchesMakueni, baseline: MAKUENI_BASELINE },
];

/** Returns the baseline for a programme by name, or null if none applies. */
export function getProgrammeBaseline(name: string | null | undefined): ProgrammeBaseline | null {
  return REGISTRY.find((r) => r.matches(name))?.baseline ?? null;
}
