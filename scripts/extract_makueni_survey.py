#!/usr/bin/env python3
"""
One-off extractor: parse the Makueni institutional-cooking survey PDF into a
clean, normalised JSON list of institutions for the "Makueni County Cooking
Baseline" programme.

The source PDF is a flat Excel-exported table with no ruling lines and tightly
packed, wrapping cells (meals / population / fuel overlap). We render it with
`pdftotext -layout` (preserves 2-D column geometry as monospaced text), group
lines into records anchored on the sequential S/No (1..N), overlay each record's
wrapped lines column-by-column, then parse fields structurally by keyword/regex.

Run:   scripts/.venv/bin/python scripts/extract_makueni_survey.py
Output: scripts/data/makueni_institutions.json  (+ prints coverage / totals)

Not part of the app build; kept in-repo so the import is reproducible.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PDF = "/home/brian/Desktop/SURVEY FOR INSTITUTIONAL COOKING IN MAKUENI COUNTY .pdf"
OUT_DIR = os.path.join(HERE, "data")
OUT = os.path.join(OUT_DIR, "makueni_institutions.json")

SUBCOUNTIES = ["Kibwezi West", "Kibwezi East", "Makueni", "Mbooni", "Kilome", "Kaiti"]
LEVEL_RE = re.compile(r"(Primary/Comprehensi\w*|Secondary|Tertiary)")
TYPE_RE = re.compile(r"(Day\s*&\s*Boarding|Boarding|Day)")
# Order matters: full/partial firewood & charcoal variants (overlay often mangles
# the leading glyphs of these wrapped cells) before the loose "wood"/"coal" catch.
FUEL_RE = re.compile(
    r"([Ff]irewood|irewood|rewood|[Cc]harcoal|harcoal|L\.?P\.?G|LPG|[Gg]as\b|"
    r"[Ee]lectric|[Bb]iogas|wood|coal)"
)
NONE_RE = re.compile(r"\b(None|Nothing|No\s*cook|No\s*meal|Non\b|N/?A)\b", re.I)
COST_RE = re.compile(r"\d[\d,]*\.\d{2}")


def layout_text():
    txt = subprocess.run(
        ["pdftotext", "-layout", PDF, "-"], capture_output=True, text=True, check=True
    ).stdout
    return txt.split("\n")


def leading_int(ln):
    s = ln.replace("\x0c", " ")
    m = re.match(r"^\s*(\d{1,3})\s", s)
    return int(m.group(1)) if m else None


def is_header(ln):
    s = ln.lower()
    return any(
        k in s
        for k in (
            "name of institution", "level of school", "s/no", "physical",
            "quantity", "type of", "total cost", "populatio", "cooking",
            "institutio", "per day", "per month",
        )
    )


def group_records(lines):
    """Anchor records on the sequential S/No; append wrapped lines to current."""
    records = []
    cur = None
    expected = 1
    for raw in lines:
        ln = raw.replace("\x0c", " ")
        if not ln.strip():
            continue
        li = leading_int(ln)
        if li is not None and li == expected:
            if cur is not None:
                records.append(cur)
            cur = {"sno": expected, "lines": [ln]}
            expected += 1
        else:
            if cur is None:
                continue
            if is_header(ln):
                continue
            cur["lines"].append(ln)
    if cur is not None:
        records.append(cur)
    return records


def overlay(lines):
    width = max(len(x) for x in lines)
    out = [" "] * width
    for x in lines:
        for i, ch in enumerate(x):
            if ch != " " and out[i] == " ":
                out[i] = ch
    return "".join(out)


def clean(s):
    return re.sub(r"\s+", " ", s).strip() if s else ""


def to_num(tok):
    if not tok:
        return None
    t = tok.replace(",", "").replace(" ", "")
    try:
        return float(t) if "." in t else int(t)
    except ValueError:
        return None


def canon_subcounty(s):
    for sc in SUBCOUNTIES:  # longest ("Kibwezi ...") first via list order
        if sc.lower() in s.lower():
            return sc
    # tolerate truncations from wrapping
    low = s.lower()
    if "kibwezi w" in low:
        return "Kibwezi West"
    if "kibwezi e" in low:
        return "Kibwezi East"
    return None


def canon_level(s):
    if s.startswith("Primary/Comprehensi") or s.startswith("Primary"):
        return "Primary/Comprehensive"
    if s.startswith("Secondary"):
        return "Secondary"
    if s.startswith("Tertiary"):
        return "Tertiary/TVET"
    return None


def canon_type(s):
    s = re.sub(r"\s+", " ", s).strip()
    if "&" in s or "boarding" in s.lower() and "day" in s.lower():
        return "Day & Boarding"
    if s.lower().startswith("boarding"):
        return "Boarding"
    if s.lower().startswith("day"):
        return "Day"
    return None


def canon_fuel(raw_tail):
    m = FUEL_RE.search(raw_tail)
    if m:
        f = m.group(1).lower()
        if "wood" in f:  # firewood / irewood / rewood / wood
            return "firewood", m.start(), m.end()
        if "coal" in f:  # charcoal / harcoal / coal
            return "charcoal", m.start(), m.end()
        if "lpg" in f or "gas" in f:
            return "lpg", m.start(), m.end()
        if "electric" in f:
            return "electric", m.start(), m.end()
        if "biogas" in f:
            return "biogas", m.start(), m.end()
    # explicit "no cooking / none"
    if NONE_RE.search(raw_tail):
        nm = NONE_RE.search(raw_tail)
        return "none", nm.start(), nm.end()
    return None, -1, -1


def normalize_indent(reclines):
    """Align every record to page-1 geometry (name starts at col 10).

    Page 1 right-aligns the S/No in a wide field (name at col 10); pages 2+
    indent it by only ~1 space (name at col ~4). Fixed-column tail slicing needs
    a common origin, so we pad each record's lines by the anchor's offset.
    """
    anchor = reclines[0]
    m = re.match(r"^(\s*\d{1,3}\s+)", anchor)
    name_start = len(m.group(1)) if m else 0
    pad = 10 - name_start
    if pad > 0:
        return [(" " * pad) + l for l in reclines]
    if pad < 0:
        cut = -pad
        return [l[cut:] if l[:cut].strip() == "" else l for l in reclines]
    return reclines


def parse_record(rec):
    rec = {**rec, "lines": normalize_indent(rec["lines"])}
    s = overlay(rec["lines"])
    m = re.match(r"^\s*(\d{1,3})\s+(.*)$", s)
    if not m:
        return None
    sno = int(m.group(1))
    body = m.group(2)

    lvl_m = LEVEL_RE.search(body)
    if not lvl_m:
        return {"sno": sno, "name": clean(body)[:120], "_partial": True}
    name = clean(body[: lvl_m.start()])
    level = canon_level(lvl_m.group(1))
    after = body[lvl_m.end():]

    typ_m = TYPE_RE.search(after)
    boarding = canon_type(typ_m.group(1)) if typ_m else None
    after2 = after[typ_m.end():] if typ_m else after

    # sub-county: earliest known name in what's left
    sc = None
    sc_end = 0
    best = None
    for name_sc in SUBCOUNTIES:
        idx = after2.lower().find(name_sc.lower())
        if idx >= 0 and (best is None or idx < best[0]):
            best = (idx, name_sc, idx + len(name_sc))
    if best:
        sc, sc_end = best[1], best[2]
    else:
        sc = canon_subcounty(after2[:30])
    ward_src = after2[sc_end:] if best else after2

    # Numeric tail (population / fuel / firewood qty / cost) is rebuilt by
    # concatenating the right-hand slice of EVERY physical line of the record
    # (char >= TAIL_START), because on wrapped rows the fuel word and the
    # numbers land on separate continuation lines that a column-overlay would
    # collide. The left columns above stay overlay-based (they don't wrap into
    # this region). Meals text may leak in but is harmless (parsed fuel-relative).
    TAIL_START = 116
    tail_parts = [
        ln[TAIL_START:].strip() for ln in rec["lines"] if len(ln) > TAIL_START and ln[TAIL_START:].strip()
    ]
    tail = re.sub(r"\s+", " ", " ".join(tail_parts))

    fuel, fpos, fend = canon_fuel(tail)

    # cost: last decimal-formatted number in the tail (fallback: whole overlay)
    costs = COST_RE.findall(tail) or COST_RE.findall(s)
    cost = to_num(costs[-1]) if costs else None
    if cost is None and tail.rstrip().endswith("-"):
        cost = None  # dash = not provided

    # population: last 2-4 digit run before the fuel keyword
    pop = None
    if fpos >= 0:
        before = tail[:fpos]
        digs = re.findall(r"\d{1,4}", before)
        if digs:
            pop = to_num(digs[-1])
    # firewood qty: first number between fuel end and the cost, ton->kg
    qty = None
    if fend >= 0:
        seg = tail[fend:]
        if costs:
            ci = seg.rfind(costs[-1])
            if ci >= 0:
                seg = seg[:ci]
        um = re.search(r"([\d][\d,]*)\s*(tonnes?|tons?|kgs?)?", seg, re.I)
        if um:
            qty = to_num(um.group(1))
            unit = (um.group(2) or "").lower()
            if qty is not None and unit.startswith("ton"):
                qty *= 1000

    # "no cooking" rows carry no firewood consumption; drop any digit the tail
    # parser grabbed from the meals/population region (these rows serve no meals).
    if fuel == "none":
        qty = None

    # ward: text between sub-county and the first meals keyword / digit (raw, best-effort)
    ward = re.split(
        r"Breakfast|Lunch|Dinner|Morning|Tea|Porridge|Snack|Supper|Uji|Meal|None|\d",
        ward_src, 1, re.I,
    )[0]
    ward = clean(ward)[:60] or None

    return {
        "sno": sno,
        "name": name,
        "level": level,
        "boardingType": boarding,
        "subCounty": sc,
        "ward": ward or None,
        "population": pop,
        "fuel": fuel,
        "firewoodKgPerMonth": qty,
        "costKshPerMonth": cost,
    }


def main():
    lines = layout_text()
    records = group_records(lines)
    parsed = [parse_record(r) for r in records]
    parsed = [p for p in parsed if p]

    snos = sorted({p["sno"] for p in parsed})
    maxs = max(snos) if snos else 0
    missing = [n for n in range(1, maxs + 1) if n not in set(snos)]
    partial = [p for p in parsed if p.get("_partial")]

    print(f"records grouped : {len(records)}")
    print(f"parsed rows     : {len(parsed)}")
    print(f"S/No max        : {maxs}")
    print(f"missing S/No    : {len(missing)} -> {missing[:25]}{'...' if len(missing) > 25 else ''}")
    print(f"partial parses  : {len(partial)} -> {[p['sno'] for p in partial][:25]}")

    good = [p for p in parsed if not p.get("_partial")]
    pop_sum = sum(p["population"] or 0 for p in good)
    fw_sum = sum(p["firewoodKgPerMonth"] or 0 for p in good)
    cost_sum = sum(p["costKshPerMonth"] or 0 for p in good)
    from collections import Counter
    print("--- totals ---")
    print(f"population sum        : {pop_sum:,}")
    print(f"firewood kg/month sum : {fw_sum:,.0f}  ({fw_sum/1000:,.0f} tonnes)")
    print(f"cost KES/month sum    : {cost_sum:,.0f}")
    print("by subCounty :", dict(Counter(p["subCounty"] for p in good)))
    print("by level     :", dict(Counter(p["level"] for p in good)))
    print("by boarding  :", dict(Counter(p["boardingType"] for p in good)))
    print("by fuel      :", dict(Counter(p["fuel"] for p in good)))

    print("\n--- sample (first 6 + wrapped) ---")
    for p in good[:6]:
        print(p)
    for p in good:
        if p["sno"] in (2, 8, 89, 168, 173):
            print("W>", p)

    # dedup: drop exact repeat submissions (same name + sub-county + ward)
    seen = set()
    deduped = []
    dups = []
    for p in good:
        key = (
            re.sub(r"\s+", " ", (p["name"] or "").lower()).strip(),
            (p["subCounty"] or "").lower(),
            (p["ward"] or "").lower(),
        )
        if key in seen:
            dups.append(p)
            continue
        seen.add(key)
        deduped.append(p)
    print(f"\ndedup: removed {len(dups)} exact duplicate(s) -> {[d['sno'] for d in dups][:20]}")
    print(f"final rows: {len(deduped)}")

    if "--write" in sys.argv:
        os.makedirs(OUT_DIR, exist_ok=True)
        # drop the internal _partial flag key if any slipped through
        for p in deduped:
            p.pop("_partial", None)
        with open(OUT, "w") as f:
            json.dump(deduped, f, indent=2, ensure_ascii=False)
        print(f"Wrote {OUT}  ({len(deduped)} rows)")


if __name__ == "__main__":
    main()

# --- extra diagnostics when run with --diag ---------------------------------
if __name__ == "__main__" and "--diag" in sys.argv:
    pass
