#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
import urllib.error

# Load .env file if token not already in environment
def _load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"'))
_load_env()

TOKEN = os.environ.get("SUPABASE_MGMT_TOKEN", "")
if not TOKEN:
    sys.exit("Error: add SUPABASE_MGMT_TOKEN=<token> to your .env file.")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "bnbhattryqbterblybzw")
MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "supabase", "migrations")
URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def run_sql(sql: str):
    payload = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "python-urllib/3.10",
            "Accept": "application/json",
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
