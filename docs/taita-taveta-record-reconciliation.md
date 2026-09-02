# Taita Taveta roster reconciliation — 407 vs 303

**Purpose:** resolve PRD §2 / open decision #8 before any roster-derived figure goes into
Deliverable A. The roster loaded on CleanCookIQ holds **407** institutions; the Gamos proposal
describes the analysed A2CT baseline as **303** (186 schools + 5 prisons + 12 health = 203
institutional, plus ~100 commercial businesses/suppliers). This note explains the gap. **No rows were
deleted** — the difference is flagged in data, not dropped.

## What is on the platform (after dedup)

Loaded from the four KoBo exports Kitala sent on 10 Aug (2 exact repeat submissions already removed —
`Sowene secondary school`, `Baraka hotel`):

| Source file | Rows loaded | Mapped type | Segment |
|---|---:|---|---|
| Learning institutions | 196 | school | institutional |
| Correctional | 5 | prison | institutional |
| Health facilities | 12 | hospital | institutional |
| Catering outlets | 194 | hotel / restaurant | commercial |
| **Total** | **407** | | |

By the new `segment` field: **institutional = 213**, **commercial = 194**.

## 409 raw → 407 loaded (the two removed repeats)

Counting the rows in the four raw `(1)` KoBo exports directly gives **409** named institutions,
not 407 — a gap that looks like two missing records but is not. The per-file raw counts are:

| Source file | Raw named rows |
|---|---:|
| Learning institutions | 197 |
| Correctional | 5 |
| Health facilities | 12 |
| Catering outlets | 195 |
| **Total (raw)** | **409** |

The seed importer (`scripts/gen_taita_taveta_seed.cjs`) collapses true repeats — **same name AND
same location** (GPS rounded to ~1 km, else same sub-county + village) — which removes exactly
**2** rows, yielding **407**. Both removed rows are genuine repeat submissions, not distinct
institutions:

| Dropped row | Collided with (kept) | Why it's a repeat |
|---|---|---|
| `sowene secondary school` — Bomeni, village "taveta town", lat -3.3921417 / lng 37.6690167, 700 students, interviewee **mr sariko** | `Sowene secondary school` — Bomeni, "Mjini Taveta town", lat -3.3921183 / lng 37.6703283, 690 students, interviewee Gregory W Nguma | Same name, GPS ~150 m apart (both round to −3.39, 37.67). |
| `Baraka hotel` — Mata/Timbila, lat -3.3897208 / lng 37.7140746, 2 staff, interviewee **Selina Joab** | `BARAKA HOTEL` — Mata/Timbila, lat -3.3898157 / lng 37.714409, 2 staff, interviewee **Selina Joab** | Same interviewee, staff count and village; GPS ~40 m apart — an exact duplicate submission. |

The dedupe is **name + location**, not name-only: a third same-name `Baraka hotel` (Mata/**Cessi**,
lat -3.390785 / lng 37.7314866, 6 staff, interviewee **Justus Mutuku**) is a different outlet ~2 km
away and was correctly **kept**. So 409 raw − 2 duplicate submissions = **407 loaded**, and 407 is
the correct roster count.

## The gap, line by line

| | Platform | Documented baseline | Δ | Explanation |
|---|---:|---:|---:|---|
| Schools | 196 | 186 | **+10** | The raw learning export is wider than the 186 analysed in the baseline — extra ECDE/vocational/late submissions captured in the file but outside the analysed cut. |
| Prisons | 5 | 5 | 0 | Matches. |
| Health | 12 | 12 | 0 | Matches. |
| **Institutional** | **213** | **203** | **+10** | Entirely the 10 extra schools. |
| Commercial | 194 | ~100 | **+94** | The catering export is the **full enumerated** set of commercial outlets; the documented "~100 businesses and suppliers" is the **analysed/high-load subset** (and mixes in suppliers, counted elsewhere on the platform). The raw file is a superset, not a contradiction. |

## Recommended handling (no code change needed)

1. **Report by `segment`.** Deliverable A cites institutional (213) and commercial (194) separately;
   the ToR thresholds are per-segment, so this is the correct axis.
2. **Mark the analysed baseline with `verification_status`.** Field verification (Task 2) sets the 203
   analysed institutional records to `verified`; the +10 extra schools stay `unverified` until
   confirmed, so a reviewer can always separate "analysed baseline" from "full enumeration".
3. **Confirm the commercial subset with Gamos (Kitala/Valarie)** — which ~100 of the 194 are the
   analysed high-load SMEs, and whether any rows are suppliers mis-loaded as institutions. Flag those
   with `data_source` / `verification_status = flagged`.

Once (2)–(3) are done, every Deliverable-A figure traces to a defined, filterable subset of the roster.

## Addendum (2026-09-02): both dedup rows re-added — roster is now 409

Superseding the "no code change needed" recommendation above: by decision, the 2 rows the
importer collapsed are treated as **distinct records** and re-added so the roster matches the raw
file count of **409**. This is a data-only change applied by migration
`20260812120000_add_taita_taveta_missing_two.sql` (idempotent; inserts each row only when absent
and sets `target_institution_count = 409`). The re-added rows:

| Re-added row | Segment | Notes on data |
|---|---|---|
| `sowene secondary school` — Taveta/Bomeni/"taveta town", −3.3921417 / 37.6690167, 700 students, *mr sariko* | institutional | Full data recovered from the learning-institutions export. |
| `Baraka hotel` — Mata/Timbila, −3.3897208 / 37.7140746, 2 staff, *Selina Joab* | commercial | Catering source file no longer available; `current_fuel` / `contact_phone` / `ownership_type` left NULL. |

The importer (`scripts/gen_taita_taveta_seed.cjs`) and the original seed migration are left
unchanged — its name+location dedup still correctly documents the original import; the new
migration is a targeted additive patch on top.
