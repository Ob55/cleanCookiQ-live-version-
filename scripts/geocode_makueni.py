#!/usr/bin/env python3
"""
Best-effort geocoder for the Makueni survey institutions (the PDF has no GPS).

Queries the public OpenStreetMap Nominatim service — respecting its usage policy
(<=1 request/second, descriptive User-Agent) — for each school by
"<name>, <ward>, <sub-county>, Makueni County, Kenya", falling back to a coarser
query without the ward. Accepts a hit only if it lands inside the Makueni County
bounding box, so a same-named place elsewhere is rejected rather than mapped
wrongly. Rural Kenyan schools are sparsely mapped in OSM, so partial coverage is
expected and reported.

Resumable: results are cached to scripts/data/makueni_coords.json, so re-running
continues where it left off. When done (or with --emit) it writes an UPDATE
migration: supabase/migrations/20260904130000_makueni_coordinates.sql

Run:  scripts/.venv/bin/python scripts/geocode_makueni.py          # geocode + emit
      scripts/.venv/bin/python scripts/geocode_makueni.py --emit   # emit from cache only
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, "data", "makueni_institutions.json")
CACHE = os.path.join(HERE, "data", "makueni_coords.json")
OUT_SQL = os.path.join(
    HERE, "..", "supabase/migrations/20260904130000_makueni_coordinates.sql"
)
PROG_NAME = "Makueni County Cooking Baseline"
UA = "CleanCookIQ-Makueni-geocoder/1.0 (bmwangi@ignis-innovation.com)"

# Makueni County bounding box (generous): lat south..north, lon west..east.
LAT_MIN, LAT_MAX = -3.10, -1.40
LON_MIN, LON_MAX = 37.00, 38.80


def load_cache():
    if os.path.exists(CACHE):
        return json.load(open(CACHE))
    return {}


def save_cache(c):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(c, open(CACHE, "w"), indent=1, ensure_ascii=False)


def _load_env():
    env = os.path.join(HERE, "..", ".env")
    if os.path.exists(env):
        for line in open(env):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))


_load_env()
GOOGLE_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")
# Provider: "google" (accurate, needs GOOGLE_MAPS_API_KEY) else OSM Nominatim.
PROVIDER = "google" if GOOGLE_KEY else "osm"


def nominatim(q):
    """Query the active provider; returns a list of {lat, lon, display_name} dicts."""
    if PROVIDER == "google":
        url = "https://maps.googleapis.com/maps/api/geocode/json?" + urllib.parse.urlencode(
            {"address": q, "region": "ke", "key": GOOGLE_KEY,
             "bounds": f"{LAT_MIN},{LON_MIN}|{LAT_MAX},{LON_MAX}"}
        )
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        out = []
        for res in data.get("results", []):
            loc = res.get("geometry", {}).get("location", {})
            if "lat" in loc and "lng" in loc:
                out.append({"lat": loc["lat"], "lon": loc["lng"], "display_name": res.get("formatted_address", "")})
        return out
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "limit": 3, "countrycodes": "ke", "addressdetails": 1}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def in_makueni(lat, lon):
    return LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX


def best_hit(results):
    """First result inside the Makueni bbox (Nominatim returns by importance)."""
    for res in results:
        try:
            lat, lon = float(res["lat"]), float(res["lon"])
        except (KeyError, ValueError):
            continue
        if in_makueni(lat, lon):
            return round(lat, 6), round(lon, 6), res.get("display_name", "")
    return None


def key_for(r):
    return f"{r['sno']}"


def geocode_all():
    rows = json.load(open(IN))
    cache = load_cache()
    total = len(rows)
    done = hits = 0
    for i, r in enumerate(rows):
        k = key_for(r)
        if k in cache:  # resume
            if cache[k].get("lat") is not None:
                hits += 1
            continue
        parts_full = [r["name"], r.get("ward"), r.get("subCounty"), "Makueni County", "Kenya"]
        parts_coarse = [r["name"], r.get("subCounty"), "Makueni County", "Kenya"]
        q_full = ", ".join(p for p in parts_full if p)
        q_coarse = ", ".join(p for p in parts_coarse if p)
        found = None
        for q in (q_full, q_coarse):
            try:
                res = nominatim(q)
            except Exception as e:  # noqa: BLE001 — network hiccup; skip this row
                print(f"  ! {r['name'][:40]}: {e}")
                res = []
            time.sleep(0.2 if PROVIDER == "google" else 1.1)  # OSM policy: max 1 req/sec
            hit = best_hit(res)
            if hit:
                found = hit
                break
        if found:
            cache[k] = {"lat": found[0], "lon": found[1], "name": r["name"],
                        "subCounty": r["subCounty"], "match": found[2]}
            hits += 1
        else:
            cache[k] = {"lat": None, "name": r["name"], "subCounty": r["subCounty"]}
        done += 1
        if done % 20 == 0:
            save_cache(cache)
            print(f"  … {i + 1}/{total} processed, {hits} located")
    save_cache(cache)
    print(f"Geocoding complete: {hits}/{total} located ({100 * hits / total:.1f}%)")
    return rows, cache


def sql_str(v):
    return "NULL" if v is None else "'" + str(v).replace("'", "''") + "'"


def emit(rows, cache):
    located = [(r, cache[key_for(r)]) for r in rows if cache.get(key_for(r), {}).get("lat") is not None]
    lines = [
        "-- ============================================================",
        "-- Makueni County Cooking Baseline — school coordinates",
        "--",
        "-- Best-effort geocodes from OpenStreetMap / Nominatim, filtered to the",
        "-- Makueni County bounding box. The source survey PDF has no GPS; rural",
        f"-- schools are sparsely mapped, so this covers {len(located)} of {len(rows)} institutions.",
        "-- Idempotent: only fills rows whose coordinates are still NULL.",
        "-- ============================================================",
        "DO $$",
        "DECLARE prog_id uuid;",
        "BEGIN",
        f"  SELECT id INTO prog_id FROM public.programmes WHERE name = {sql_str(PROG_NAME)} LIMIT 1;",
        "  IF prog_id IS NULL THEN RETURN; END IF;",
    ]
    for r, c in located:
        lines.append(
            f"  UPDATE public.institutions SET latitude = {c['lat']}, longitude = {c['lon']} "
            f"WHERE programme_id = prog_id AND name = {sql_str(r['name'])} "
            f"AND sub_county = {sql_str(r['subCounty'])} AND latitude IS NULL;"
        )
    lines += ["END $$;", ""]
    open(OUT_SQL, "w").write("\n".join(lines))
    print(f"Wrote {OUT_SQL}  ({len(located)} coordinate updates)")


if __name__ == "__main__":
    rows = json.load(open(IN))
    cache = load_cache()
    if "--emit" not in sys.argv:
        rows, cache = geocode_all()
    emit(rows, cache)
