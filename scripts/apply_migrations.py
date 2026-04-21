#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.error

TOKEN = "sbp_278b85e1e9661505def695807df42c2b7bbe0e64"
PROJECT_REF = "bnbhattryqbterblybzw"
MIGRATIONS_DIR = "/home/brian/Desktop/clean-cook-iq/supabase/migrations"
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def run_sql(sql: str):
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (supabase-mgmt-client)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

files = sorted(f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql"))
for fname in files:
    path = os.path.join(MIGRATIONS_DIR, fname)
    with open(path) as fp:
        sql = fp.read()
    status, body = run_sql(sql)
    if status >= 300:
        print(f"FAIL {fname}  HTTP {status}")
        print(body[:2000])
        sys.exit(1)
    print(f"OK   {fname}")
print("\nAll migrations applied.")
