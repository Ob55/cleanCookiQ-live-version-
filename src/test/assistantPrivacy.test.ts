import { describe, it, expect } from "vitest";
import { getAnswer, getPersona } from "@/lib/assistant";

describe("assistant — role-aware privacy guard", () => {
  it("institution asking for funder details is deflected to the admin", async () => {
    const p = getPersona("institution")!;
    const r = await getAnswer("who is my funder and what are their financials?", p);
    expect(r.text).toMatch(/can't share/i);
    expect(r.text).toMatch(/funder details/i);
    expect(r.text).toContain("/institution/support");
  });

  it("institution privacy question is answered reassuringly, not deflected", async () => {
    const p = getPersona("institution")!;
    const r = await getAnswer("who can see my data?", p);
    expect(r.text).not.toMatch(/can't share/i);
    expect(r.text).toMatch(/role-based/i);
  });

  it("funder asking to approve accounts (admin-only) is deflected", async () => {
    const p = getPersona("funder")!;
    const r = await getAnswer("can you approve account access for a new user?", p);
    expect(r.text).toMatch(/can't share/i);
    expect(r.text).toContain("/funder/support");
  });

  it("funder asking about their own portfolio answers normally", async () => {
    const p = getPersona("funder")!;
    const r = await getAnswer("what's in my portfolio?", p);
    expect(r.matched).toBe(true);
    expect(r.text).not.toMatch(/can't share/i);
  });

  it("admin is never guarded", async () => {
    const p = getPersona("admin")!;
    const r = await getAnswer("who is the funder for this project?", p);
    expect(r.text).not.toMatch(/can't share/i);
  });

  it("every role knows what CleanCookIQ is and the fuels", async () => {
    for (const id of ["institution", "funder", "supplier", "kplc", "csr", "researcher"] as const) {
      const p = getPersona(id)!;
      const overview = await getAnswer("what is cleancookiq?", p);
      expect(overview.matched).toBe(true);
      expect(overview.text).toMatch(/clean-cooking/i);
      const fuels = await getAnswer("what cooking options are there?", p);
      expect(fuels.matched).toBe(true);
      expect(fuels.text).toMatch(/lpg/i);
    }
  });
});
