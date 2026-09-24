import { describe, it, expect } from "vitest";
import {
  validateInstitutions, normaliseName, canonicalCounty, missingFields,
  type ValidatableInstitution,
} from "@/lib/institutionValidation";

// A clean Makueni school (Wote area).
const good = (over: Partial<ValidatableInstitution> = {}): ValidatableInstitution => ({
  id: "a", name: "Wote Boys Secondary School", institution_type: "school", county: "Makueni",
  latitude: -1.78, longitude: 37.63, current_fuel: "firewood",
  meals_per_day: 900, number_of_students: 300, number_of_staff: 20,
  contact_phone: "0712345678", contact_email: "head@wote.ac.ke", ...over,
});
const codes = (r: Map<string, { code: string }[]>, id = "a") => (r.get(id) ?? []).map((i) => i.code);

describe("validateInstitutions", () => {
  it("passes a clean record", () => {
    expect(codes(validateInstitutions([good()]))).toEqual([]);
  });

  it("lists missing required fields", () => {
    const r = validateInstitutions([good({ county: null, current_fuel: null })]);
    const msg = r.get("a")!.find((i) => i.code === "missing_field")!.message;
    expect(msg).toContain("county");
    expect(msg).toContain("current fuel");
  });

  it("does not flag a missing contact (shown as missing info instead)", () => {
    expect(codes(validateInstitutions([good({ contact_phone: null, contact_email: null })]))).toEqual([]);
  });

  it("flags placeholder / junk names", () => {
    expect(codes(validateInstitutions([good({ name: "test" })]))).toContain("bad_name");
    expect(codes(validateInstitutions([good({ name: "12345" })]))).toContain("bad_name");
  });

  it("flags unknown counties but accepts spelling variants", () => {
    expect(codes(validateInstitutions([good({ county: "Atlantis" })]))).toContain("unknown_county");
    expect(canonicalCounty("taita taveta county")).toBe("Taita-Taveta");
    expect(canonicalCounty("MURANGA")).toBe("Murang'a");
  });

  it("flags missing, out-of-Kenya and wrong-county coordinates", () => {
    expect(codes(validateInstitutions([good({ latitude: null })]))).toContain("no_coordinates");
    expect(codes(validateInstitutions([good({ latitude: 0, longitude: 0 })]))).toContain("no_coordinates");
    expect(codes(validateInstitutions([good({ latitude: 51.5, longitude: -0.12 })]))).toContain("outside_kenya");
    // Nairobi CBD coordinates on a "Makueni" school.
    expect(codes(validateInstitutions([good({ latitude: -1.286, longitude: 36.817 })]))).toContain("outside_county");
  });

  it("checks the registry only for counties it covers", () => {
    const reg = [{ name_norm: normaliseName("Wote Boys Secondary School"), county: "Makueni", latitude: -1.78, longitude: 37.63 }];
    expect(codes(validateInstitutions([good()], [], reg))).toEqual([]);
    expect(codes(validateInstitutions([good({ name: "Ghost Academy" })], [], reg))).toContain("not_in_registry");
    const far = [{ ...reg[0], latitude: -1.9, longitude: 37.8 }];
    expect(codes(validateInstitutions([good()], [], far))).toContain("registry_location");
    // Registry for another county doesn't affect Makueni rows.
    const other = [{ name_norm: "x", county: "Nairobi", latitude: null, longitude: null }];
    expect(codes(validateInstitutions([good({ name: "Ghost Academy" })], [], other))).toEqual([]);
  });

  it("matches registry names despite abbreviations", () => {
    expect(normaliseName("Wote Boys Sec. Sch")).toBe(normaliseName("Wote Boys Secondary School"));
  });

  it("validates phone and email format", () => {
    expect(codes(validateInstitutions([good({ contact_phone: "+254 712 345 678" })]))).toEqual([]);
    expect(codes(validateInstitutions([good({ contact_phone: "12345" })]))).toContain("bad_phone");
    expect(codes(validateInstitutions([good({ contact_email: "not-an-email" })]))).toContain("bad_email");
  });

  it("flags implausible numbers", () => {
    expect(codes(validateInstitutions([good({ meals_per_day: 5000 })]))).toContain("implausible_numbers");
    expect(codes(validateInstitutions([good({ number_of_students: 0, number_of_staff: 0, meals_per_day: 0 })]))).toContain("implausible_numbers");
  });

  it("flags BOTH sides of a same-name duplicate, including an existing roster record", () => {
    const existing = good({ id: "old", institution_code: "CCQ-S-0001" });
    const r = validateInstitutions([good({ id: "new" })], [existing]);
    expect(r.get("new")!.find((i) => i.code === "duplicate")!.message).toContain("CCQ-S-0001");
    expect(codes(r, "old")).toEqual(["duplicate"]);
  });

  it("flags nearby records with similar names as duplicates", () => {
    const r = validateInstitutions([
      good({ id: "x", name: "Wote Boys" }),
      good({ id: "y", name: "Wote Boys High", latitude: -1.7802, longitude: 37.6301 }),
    ]);
    expect(codes(r, "x")).toContain("duplicate");
    expect(codes(r, "y")).toContain("duplicate");
  });

  it("validates 5,000 rows against a 5,000 roster quickly", () => {
    const mk = (p: string, n: number) => Array.from({ length: n }, (_, k) =>
      good({ id: `${p}${k}`, name: `School ${p} ${k}`, latitude: -1.6 - (k % 100) / 100, longitude: 37.3 + Math.floor(k / 100) / 100 }));
    const t = performance.now();
    validateInstitutions(mk("r", 5000), mk("o", 5000));
    expect(performance.now() - t).toBeLessThan(1000);
  });

  it("does not return untouched roster rows", () => {
    const r = validateInstitutions([good()], [good({ id: "z", name: "Kibwezi Girls", latitude: -2.4, longitude: 37.96 })]);
    expect(r.has("z")).toBe(false);
  });
});

describe("missingFields", () => {
  it("lists empty profile fields", () => {
    const m = missingFields({ contact_person: "Jane", contact_phone: "", latitude: null, number_of_students: 0 });
    expect(m).toContain("Phone");
    expect(m).toContain("GPS location");
    expect(m).toContain("Students");
    expect(m).not.toContain("Contact person");
  });
});
