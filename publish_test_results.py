"""
publish_test_results.py
Publishes the Jest unit test results to a new Confluence page.
"""

import os, sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

def _clean(val):
    return val.strip().strip('""\'\'\"')

DOMAIN    = _clean(os.environ.get("CONFLUENCE_DOMAIN", "")).rstrip("/")
if DOMAIN and "." not in DOMAIN:
    DOMAIN = f"{DOMAIN}.atlassian.net"
EMAIL     = _clean(os.environ.get("CONFLUENCE_EMAIL",     ""))
API_TOKEN = _clean(os.environ.get("CONFLUENCE_API_TOKEN", ""))
SPACE_ID  = _clean(os.environ.get("CONFLUENCE_SPACE_ID",  ""))

RESULTS_PATH = "/tmp/jest-results.json"
PAGE_TITLE   = "StayRed – Unit Test Results"

missing = [v for v, k in [
    ("CONFLUENCE_DOMAIN",    DOMAIN),
    ("CONFLUENCE_EMAIL",     EMAIL),
    ("CONFLUENCE_API_TOKEN", API_TOKEN),
    ("CONFLUENCE_SPACE_ID",  SPACE_ID),
] if not k]
if missing:
    print(f"ERROR: Missing env vars: {', '.join(missing)}")
    sys.exit(1)

BASE_URL = f"https://{DOMAIN}/wiki/rest/api"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}

# ── Load results ──────────────────────────────────────────────────────────────
with open(RESULTS_PATH) as f:
    data = json.load(f)

rows        = []
suite_files = {"auth": "auth.test.js", "bookings": "bookings.test.js", "hotels": "hotels.test.js"}
for suite in data["testResults"]:
    file = (suite.get("testFilePath") or "").split("/")[-1] or "—"
    for t in suite.get("assertionResults", []):
        rows.append({
            "file":   file,
            "suite":  " > ".join(t.get("ancestorTitles", [])),
            "test":   t["title"],
            "status": t["status"],
        })

num_passed = data["numPassedTests"]
num_failed = data["numFailedTests"]
num_total  = data["numTotalTests"]
run_at     = datetime.fromtimestamp(data["startTime"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# ── Build HTML ────────────────────────────────────────────────────────────────
status_badge = (
    '<span style="background:#36B37E;color:#fff;padding:3px 10px;border-radius:4px;font-weight:bold;">ALL PASS</span>'
    if num_failed == 0 else
    f'<span style="background:#FF5630;color:#fff;padding:3px 10px;border-radius:4px;font-weight:bold;">{num_failed} FAILED</span>'
)

summary_rows = ""
for label, count, color in [
    ("Total Tests", num_total, "#0052CC"),
    ("Passed", num_passed, "#36B37E"),
    ("Failed", num_failed, "#FF5630"),
    ("Test Suites", 3, "#6554C0"),
]:
    summary_rows += f"""
    <tr>
      <td style="padding:8px 16px;font-weight:bold;">{label}</td>
      <td style="padding:8px 16px;color:{color};font-weight:bold;font-size:1.1em;">{count}</td>
    </tr>"""

test_rows = ""
for i, r in enumerate(rows, 1):
    icon   = "✅" if r["status"] == "passed" else "❌"
    bg     = "#fff" if i % 2 == 0 else "#F4F5F7"
    test_rows += f"""
    <tr style="background:{bg};">
      <td style="padding:8px 12px;text-align:center;">{i}</td>
      <td style="padding:8px 12px;">{r['file']}</td>
      <td style="padding:8px 12px;">{r['suite']}</td>
      <td style="padding:8px 12px;">{r['test']}</td>
      <td style="padding:8px 12px;text-align:center;">{icon} {r['status'].upper()}</td>
    </tr>"""

html_body = f"""
<h2>Summary</h2>
<p>Run at: <strong>{run_at}</strong> &nbsp;&nbsp; Overall status: {status_badge}</p>
<table style="border-collapse:collapse;width:300px;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:8px 16px;text-align:left;">Metric</th>
      <th style="padding:8px 16px;text-align:left;">Value</th>
    </tr>
  </thead>
  <tbody>{summary_rows}</tbody>
</table>

<h2>Test Results</h2>
<table style="border-collapse:collapse;width:100%;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:8px 12px;">#</th>
      <th style="padding:8px 12px;text-align:left;">File</th>
      <th style="padding:8px 12px;text-align:left;">Suite</th>
      <th style="padding:8px 12px;text-align:left;">Test</th>
      <th style="padding:8px 12px;">Result</th>
    </tr>
  </thead>
  <tbody>{test_rows}</tbody>
</table>
"""

# ── Confluence helpers ────────────────────────────────────────────────────────
def resolve_space_key():
    if not SPACE_ID.isdigit():
        return SPACE_ID
    resp = requests.get(f"{BASE_URL}/space/{SPACE_ID}", auth=AUTH, headers=HEADERS, timeout=30)
    if resp.status_code == 404:
        all_resp = requests.get(f"{BASE_URL}/space", auth=AUTH, headers=HEADERS, timeout=30)
        all_resp.raise_for_status()
        for space in all_resp.json().get("results", []):
            if str(space.get("id")) == SPACE_ID:
                return space["key"]
        raise ValueError(f"No space with id={SPACE_ID}")
    resp.raise_for_status()
    return resp.json()["key"]

def get_existing_page(space_key):
    resp = requests.get(f"{BASE_URL}/content", params={"spaceKey": space_key, "title": PAGE_TITLE, "expand": "version"},
                        auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None

def create_page(space_key):
    payload = {"type": "page", "title": PAGE_TITLE, "space": {"key": space_key},
               "body": {"storage": {"value": html_body, "representation": "storage"}}}
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.post(f"{BASE_URL}/content", data=body, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()

def update_page(page_id, version):
    payload = {"type": "page", "title": PAGE_TITLE, "version": {"number": version + 1},
               "body": {"storage": {"value": html_body, "representation": "storage"}}}
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.put(f"{BASE_URL}/content/{page_id}", data=body, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"Connecting to {DOMAIN} …")
    space_key = resolve_space_key()
    print(f"Space key: {space_key}")

    existing = get_existing_page(space_key)
    if existing:
        page_id = existing["id"]
        version = existing["version"]["number"]
        print(f"Updating existing page (id={page_id}, v{version}) …")
        result = update_page(page_id, version)
    else:
        print("Creating new page …")
        result = create_page(space_key)

    page_url = f"https://{DOMAIN}/wiki{result['_links']['webui']}"
    print(f"\nPublished: {page_url}\n")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP error: {e}")
        try: print(e.response.json())
        except: print(e.response.text)
        sys.exit(1)
    except Exception as e:
        traceback.print_exc()
        sys.exit(1)
