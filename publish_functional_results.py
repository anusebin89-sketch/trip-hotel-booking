"""
publish_functional_results.py
Publishes Playwright E2E test results to Confluence as
"Test execution summary - Functional Tests".
"""

import os, sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

DOMAIN    = "anusebin89.atlassian.net"
EMAIL     = os.environ.get("CONFLUENCE_EMAIL", "anusebin89@gmail.com")
API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
SPACE_ID  = "3407877"

RESULTS_PATH = "/tmp/playwright-results.json"
PAGE_TITLE   = "Test execution summary - Functional Tests"

BASE_URL = f"https://{DOMAIN}/wiki/rest/api"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}

with open(RESULTS_PATH) as f:
    data = json.load(f)

STORY_MAP = {
    "EPMCDMETST-55140": "Add centralized error-handling middleware",
    "EPMCDMETST-55141": "Harden session and cookie configuration",
    "EPMCDMETST-55142": "Add production CORS policy with origins allowlist",
    "EPMCDMETST-55143": "Add automated test coverage with Jest and Supertest",
    "EPMCDMETST-55144": "Add structured observability logging with pino",
    "EPMCDMETST-55145": "Introduce repository abstraction over db layer",
    "EPMCDMETST-55146": "Add atomic booking conflict detection",
    "EPMCDMETST-55147": "Add security headers via Helmet with CSP",
}

rows = []
# Playwright JSON: data.suites = file suites → .suites = describe blocks → .specs = tests
for file_suite in data.get("suites", []):
    for describe in file_suite.get("suites", []):
        suite_title = describe.get("title", "")
        jira_id = next((k for k in STORY_MAP if k in suite_title), "")
        for spec in describe.get("specs", []):
            ok     = spec.get("ok", False)
            status = "PASSED" if ok else "FAILED"
            rows.append({"suite": suite_title, "jira_id": jira_id, "test": spec.get("title", ""), "status": status})

num_total  = len(rows)
num_passed = sum(1 for r in rows if r["status"] == "PASSED")
num_failed = num_total - num_passed
run_at     = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
sign_off_color = "#36B37E" if num_failed == 0 else "#FF5630"
sign_off_text  = "GOOD TO GO ✅" if num_failed == 0 else "NOT GOOD TO GO ❌"

# Per-story summary
story_status = {}
for r in rows:
    jid = r["jira_id"]
    if jid:
        if jid not in story_status:
            story_status[jid] = "PASSED"
        if r["status"] == "FAILED":
            story_status[jid] = "FAILED"

story_rows = ""
for i, (jid, desc) in enumerate(STORY_MAP.items(), 1):
    st = story_status.get(jid, "N/A")
    color = "#36B37E" if st == "PASSED" else ("#FF5630" if st == "FAILED" else "#6554C0")
    story_rows += f"""
    <tr style="background:{'#fff' if i%2==0 else '#F4F5F7'};">
      <td style="padding:8px 12px;text-align:center;">{i}</td>
      <td style="padding:8px 12px;font-weight:bold;">{jid}</td>
      <td style="padding:8px 12px;">{desc}</td>
      <td style="padding:8px 12px;text-align:center;color:{color};font-weight:bold;">{st}</td>
    </tr>"""

test_rows = ""
for i, r in enumerate(rows, 1):
    icon = "✅" if r["status"] == "PASSED" else "❌"
    bg   = "#fff" if i % 2 == 0 else "#F4F5F7"
    test_rows += f"""
    <tr style="background:{bg};">
      <td style="padding:8px 12px;text-align:center;">{i}</td>
      <td style="padding:8px 12px;">{r['suite']}</td>
      <td style="padding:8px 12px;">{r['test']}</td>
      <td style="padding:8px 12px;text-align:center;">{icon} {r['status']}</td>
    </tr>"""

html_body = f"""
<h2>Summary</h2>
<p>Run at: <strong>{run_at}</strong> &nbsp;&nbsp; Tool: <strong>Playwright (Chromium)</strong></p>
<table style="border-collapse:collapse;width:320px;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:8px 16px;text-align:left;">Metric</th>
      <th style="padding:8px 16px;text-align:left;">Value</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px 16px;font-weight:bold;">Total Tests</td><td style="padding:8px 16px;font-weight:bold;color:#0052CC;">{num_total}</td></tr>
    <tr style="background:#F4F5F7;"><td style="padding:8px 16px;font-weight:bold;">Passed</td><td style="padding:8px 16px;font-weight:bold;color:#36B37E;">{num_passed}</td></tr>
    <tr><td style="padding:8px 16px;font-weight:bold;">Failed</td><td style="padding:8px 16px;font-weight:bold;color:#FF5630;">{num_failed}</td></tr>
    <tr style="background:#F4F5F7;"><td style="padding:8px 16px;font-weight:bold;">Spec Files</td><td style="padding:8px 16px;font-weight:bold;color:#6554C0;">3</td></tr>
  </tbody>
</table>

<h2>User Story Coverage</h2>
<table style="border-collapse:collapse;width:100%;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:8px 12px;">Sl No.</th>
      <th style="padding:8px 12px;text-align:left;">User Story</th>
      <th style="padding:8px 12px;text-align:left;">Title</th>
      <th style="padding:8px 12px;">Status</th>
    </tr>
  </thead>
  <tbody>{story_rows}</tbody>
</table>

<h2>Detailed Test Results</h2>
<table style="border-collapse:collapse;width:100%;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:8px 12px;">Sl No.</th>
      <th style="padding:8px 12px;text-align:left;">Suite</th>
      <th style="padding:8px 12px;text-align:left;">Test</th>
      <th style="padding:8px 12px;">Result</th>
    </tr>
  </thead>
  <tbody>{test_rows}</tbody>
</table>

<h2>QA Sign-off</h2>
<p style="font-size:1.2em;font-weight:bold;padding:12px 20px;background:{sign_off_color};color:#fff;display:inline-block;border-radius:6px;">
  {sign_off_text}
</p>
<p>All {num_total} functional tests executed via Playwright against a live server instance.
{'No failures detected. The build is approved for release.' if num_failed == 0 else f'{num_failed} test(s) failed. Do not proceed to release without remediation.'}</p>
"""

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
    resp.raise_for_status()
    return resp.json()["key"]

def get_existing_page(space_key):
    resp = requests.get(f"{BASE_URL}/content",
                        params={"spaceKey": space_key, "title": PAGE_TITLE, "expand": "version"},
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

def main():
    print(f"Connecting to {DOMAIN} …")
    space_key = resolve_space_key()
    print(f"Space key: {space_key}")
    existing = get_existing_page(space_key)
    if existing:
        result = update_page(existing["id"], existing["version"]["number"])
    else:
        result = create_page(space_key)
    page_url = f"https://{DOMAIN}/wiki{result['_links']['webui']}"
    print(f"Published: {page_url}")

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
