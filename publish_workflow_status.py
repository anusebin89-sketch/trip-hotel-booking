import os
"""
publish_workflow_status.py
Publishes the final SDLC workflow status table to Confluence.
"""

import sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

DOMAIN    = "anusebin89.atlassian.net"
EMAIL     = os.environ.get("CONFLUENCE_EMAIL", "anusebin89@gmail.com")
API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
SPACE_ID  = "3407877"

PAGE_TITLE = "StayRed – SDLC Workflow Status"

BASE_URL = f"https://{DOMAIN}/wiki/rest/api"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}

run_at = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

ROWS = [
    # (stage, step, details, status)
    ("1. Planning",          "Sprint Backlog CSV",                  "userstories/sprint_backlog.csv — 8 tickets",                          "Done"),
    ("",                     "Jira Tickets Created",                "KAN-3 to KAN-10 on anusebin89.atlassian.net",                         "Done"),
    ("2. Implementation",    "EPMCDMETST-55140",                    "Centralized error-handling middleware",                                "Done"),
    ("",                     "EPMCDMETST-55141",                    "Session &amp; cookie hardening",                                       "Done"),
    ("",                     "EPMCDMETST-55142",                    "Production CORS policy",                                               "Done"),
    ("",                     "EPMCDMETST-55143",                    "Jest + Supertest test setup",                                          "Done"),
    ("",                     "EPMCDMETST-55144",                    "Pino structured logging",                                              "Done"),
    ("",                     "EPMCDMETST-55145",                    "Repository abstraction layer",                                         "Done"),
    ("",                     "EPMCDMETST-55146",                    "Atomic booking conflict detection",                                    "Done"),
    ("",                     "EPMCDMETST-55147",                    "Helmet security headers + CSP",                                        "Done"),
    ("3. Code Review &amp; PRs", "PR #8 — EPMCDMETST-55140",       "Merged to main",                                                       "Merged"),
    ("",                     "PR #9 — EPMCDMETST-55141",            "Merged to main",                                                       "Merged"),
    ("",                     "PR #10 — EPMCDMETST-55142",           "Merged to main",                                                       "Merged"),
    ("",                     "PR #11 — EPMCDMETST-55143",           "Merged to main",                                                       "Merged"),
    ("",                     "PR #12 — EPMCDMETST-55144",           "Merged to main",                                                       "Merged"),
    ("",                     "PR #13 — EPMCDMETST-55145",           "Merged to main",                                                       "Merged"),
    ("",                     "PR #14 — EPMCDMETST-55146",           "Merged to main",                                                       "Merged"),
    ("",                     "PR #15 — EPMCDMETST-55147",           "Merged to main",                                                       "Merged"),
    ("4. Unit Testing",      "Jest + Supertest",                    "18 / 18 tests passing",                                                "Done"),
    ("",                     "Bug Fix",                             "auth.js method names aligned to repository interface",                  "Done"),
    ("",                     "Pushed to main",                      "Commit d135563",                                                       "Done"),
    ("5. Functional Testing","Playwright E2E",                      "23 / 23 tests passing",                                                "Done"),
    ("",                     "auth.spec.js",                        "6 tests — register, login, logout flows",                              "Done"),
    ("",                     "hotels.spec.js",                      "4 tests — listing, filtering, 404",                                    "Done"),
    ("",                     "bookings.spec.js",                    "13 tests — booking CRUD, security headers, error handler",             "Done"),
    ("",                     "PR #16 — e2e-automation",             "Merged to main",                                                       "Merged"),
    ("6. Documentation",     "FRD — Confluence",                    "StayRed – Functional Requirements Document",                           "Published"),
    ("",                     "Unit Test Results — Confluence",      "StayRed – Unit Test Results (18/18)",                                  "Published"),
    ("",                     "Functional Test Results — Confluence","Test execution summary - Functional Tests (23/23)",                     "Published"),
    ("",                     "QA Sign-off",                         "GOOD TO GO",                                                           "Signed Off"),
    ("7. Jira Closure",      "KAN-3 to KAN-10",                    "All 8 tickets transitioned to Done",                                   "Done"),
    ("",                     "Test Results Comment",                "Added to each ticket with Confluence link",                            "Done"),
]

STATUS_COLOR = {
    "Done":       "#36B37E",
    "Merged":     "#0052CC",
    "Published":  "#6554C0",
    "Signed Off": "#36B37E",
}

def status_badge(s):
    color = STATUS_COLOR.get(s, "#36B37E")
    return f'<span style="background:{color};color:#fff;padding:2px 10px;border-radius:4px;font-size:0.85em;font-weight:bold;">{s}</span>'

table_rows = ""
for i, (stage, step, details, status) in enumerate(ROWS):
    bg = "#F4F5F7" if i % 2 == 0 else "#ffffff"
    stage_cell = f'<td style="padding:8px 12px;font-weight:bold;white-space:nowrap;background:{bg};">{stage}</td>' if stage else f'<td style="padding:8px 12px;background:{bg};"></td>'
    table_rows += f"""
    <tr>
      {stage_cell}
      <td style="padding:8px 12px;background:{bg};white-space:nowrap;">{step}</td>
      <td style="padding:8px 12px;background:{bg};">{details}</td>
      <td style="padding:8px 12px;background:{bg};text-align:center;">{status_badge(status)}</td>
    </tr>"""

html_body = f"""
<h2>SDLC Workflow Status — StayRed Hotel Booking</h2>
<p>Generated: <strong>{run_at}</strong></p>

<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:0.95em;">
  <thead>
    <tr style="background:#0052CC;color:#ffffff;">
      <th style="padding:10px 12px;text-align:left;width:18%;">Stage</th>
      <th style="padding:10px 12px;text-align:left;width:22%;">Step</th>
      <th style="padding:10px 12px;text-align:left;">Details</th>
      <th style="padding:10px 12px;text-align:center;width:12%;">Status</th>
    </tr>
  </thead>
  <tbody>{table_rows}</tbody>
</table>

<br/>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;">
  <thead>
    <tr style="background:#172B4D;color:#fff;">
      <th style="padding:10px 16px;text-align:center;" colspan="4">FINAL SUMMARY</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background:#F4F5F7;">
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Stages</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Stories</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">PRs Merged</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Tests Passing</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#0052CC;">7</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#0052CC;">8</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#0052CC;">9</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#36B37E;">41 ✅</td>
    </tr>
    <tr style="background:#F4F5F7;">
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Confluence Pages</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Jira Tickets</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Unit Tests</td>
      <td style="padding:10px 16px;text-align:center;font-weight:bold;">Functional Tests</td>
    </tr>
    <tr>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#6554C0;">3</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#36B37E;">8 Done</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#36B37E;">18 / 18</td>
      <td style="padding:10px 16px;text-align:center;font-size:1.4em;font-weight:bold;color:#36B37E;">23 / 23</td>
    </tr>
  </tbody>
</table>
"""

def resolve_space_key():
    if not SPACE_ID.isdigit():
        return SPACE_ID
    resp = requests.get(f"{BASE_URL}/space", auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    for space in resp.json().get("results", []):
        if str(space.get("id")) == SPACE_ID:
            return space["key"]
    raise ValueError(f"No space found with id={SPACE_ID}")

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
        print("Page updated.")
    else:
        result = create_page(space_key)
        print("Page created.")
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
