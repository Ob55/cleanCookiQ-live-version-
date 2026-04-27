import { describe, it, expect } from "vitest";
import {
  advance, combineValidators, email, minLength,
  navigationState, required, rewind,
  type WizardStep,
} from "@/lib/onboarding";

interface TestData {
  name: string;
  email: string;
  fuels: string[];
}

const steps: WizardStep<TestData>[] = [
  { id: "name", title: "Name", validate: required("name", "Name") },
  { id: "email", title: "Email",
    validate: combineValidators(required("email", "Email"), email("email", "Email")) },
  { id: "fuels", title: "Fuels", validate: required("fuels", "Fuels") },
];

describe("navigationState", () => {
  it("blocks Next when current step is invalid", () => {
    const out = navigationState(steps, 0, { name: "", email: "", fuels: [] });
    expect(out.canNext).toBe(false);
    expect(out.issues).toEqual(["Name is required."]);
  });

  it("allows Next when current step is valid", () => {
    const out = navigationState(steps, 0, { name: "Acme Funder", email: "", fuels: [] });
    expect(out.canNext).toBe(true);
    expect(out.issues).toEqual([]);
  });

  it("blocks Back on the first step", () => {
    const out = navigationState(steps, 0, { name: "Acme", email: "", fuels: [] });
    expect(out.canBack).toBe(false);
  });

  it("allows Back on later steps", () => {
    const out = navigationState(steps, 1, { name: "Acme", email: "x@y.z", fuels: [] });
    expect(out.canBack).toBe(true);
  });

  it("canFinish only on the last step + valid", () => {
    const incomplete = navigationState(steps, 2, { name: "Acme", email: "x@y.z", fuels: [] });
    expect(incomplete.canFinish).toBe(false);
    const complete = navigationState(steps, 2, { name: "Acme", email: "x@y.z", fuels: ["lpg"] });
    expect(complete.canFinish).toBe(true);
    expect(complete.canNext).toBe(false);
  });

  it("progress increases with steps + validity", () => {
    const a = navigationState(steps, 0, { name: "", email: "", fuels: [] });
    const b = navigationState(steps, 0, { name: "Acme", email: "", fuels: [] });
    const c = navigationState(steps, 1, { name: "Acme", email: "x@y.z", fuels: [] });
    expect(b.progress).toBeGreaterThan(a.progress);
    expect(c.progress).toBeGreaterThan(b.progress);
  });

  it("clamps out-of-range index", () => {
    const out = navigationState(steps, 99, { name: "", email: "", fuels: [] });
    expect(out.index).toBe(2);
  });
});

describe("advance / rewind", () => {
  it("advance clamps to last step", () => {
    expect(advance(0, 3)).toBe(1);
    expect(advance(2, 3)).toBe(2);
    expect(advance(99, 3)).toBe(2);
  });

  it("rewind clamps at 0", () => {
    expect(rewind(2)).toBe(1);
    expect(rewind(0)).toBe(0);
    expect(rewind(-5)).toBe(0);
  });
});

describe("validators", () => {
  it("required catches empty strings, null, and empty arrays", () => {
    expect(required<TestData>("name", "Name")({ name: "", email: "", fuels: [] }))
      .toEqual(["Name is required."]);
    expect(required<TestData>("fuels", "Fuels")({ name: "x", email: "x", fuels: [] }))
      .toEqual(["Fuels is required."]);
    expect(required<TestData>("name", "Name")({ name: "x", email: "", fuels: [] }))
      .toEqual([]);
  });

  it("minLength enforces character length", () => {
    expect(minLength<TestData>("name", 5, "Name")({ name: "abc", email: "", fuels: [] }))
      .toEqual(["Name must be at least 5 characters."]);
    expect(minLength<TestData>("name", 5, "Name")({ name: "abcdef", email: "", fuels: [] }))
      .toEqual([]);
  });

  it("email rejects malformed addresses", () => {
    expect(email<TestData>("email", "Email")({ name: "", email: "not-an-email", fuels: [] }))
      .toEqual(["Email must be a valid email address."]);
    expect(email<TestData>("email", "Email")({ name: "", email: "x@y.z", fuels: [] }))
      .toEqual([]);
    // Empty string passes — combine with `required` if that's not desired
    expect(email<TestData>("email", "Email")({ name: "", email: "", fuels: [] }))
      .toEqual([]);
  });

  it("combineValidators concatenates issues from each validator", () => {
    const v = combineValidators(
      required<TestData>("name", "Name"),
      email<TestData>("email", "Email"),
    );
    expect(v({ name: "", email: "bad", fuels: [] }))
      .toEqual(["Name is required.", "Email must be a valid email address."]);
  });
});
