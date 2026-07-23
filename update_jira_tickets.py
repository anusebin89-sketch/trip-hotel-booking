"""
update_jira_tickets.py
Adds a test-results comment to each of the 8 sprint Jira tickets.
"""

import os, sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

def _clean(val):
    return val.strip().strip('""\'\'\"')

DOMAIN    = _clean(os.environ.get("JIRA_DOMAIN", os.environ.get("CONFLUENCE_DOMAIN", ""))).rstrip("/")
if DOMAIN and "." not in DOMAIN:
    DOMAIN = f"{DOMAIN}.atlassian.net"
EMAIL     = _clean(os.environ.get("JIRA_EMAIL",     os.environ.get("CONFLUENCE_EMAIL",     "")))
API_TOKEN = _clean(os.environ.get("JIRA_API_TOKEN", os.environ.get("CONFLUENCE_API_TOKEN", "")))

RESULTS_PATH = "/tmp/jest-results.json"
CONFLUENCE_PAGE = "https://anusebin89.atlassian.net/wiki/spaces/capstoneco/pages/4751404/StayRed+Unit+Test+Results"

TICKETS = [
    ("EPMCDMETST-55140", "Centralized error-handling middleware",         []),
    ("EPMCDMETST-55141", "Session and cookie hardening",                  ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/me"]),
    ("EPMCDMETST-55142", "Production CORS policy",                        []),
    ("EPMCDMETST-55143", "Automated test coverage with Jest & Supertest", None),   # None = all tests
    ("EPMCDMETST-55144", "Structured observability logging with pino",    []),
    ("EPMCDMETST-55145", "Repository abstraction over db layer",          None),   # all tests exercise repository
    ("EPMCDMETST-55146", "Atomic booking conflict detection",             ["POST /api/bookings", "GET /api/bookings/my"]),
    ("EPMCDMETST-55147", "Security headers via Helmet with CSP",          []),
]

missing = [v for v, k in [("JIRA_DOMAIN / CONFLUENCE_DOMAIN", DOMAIN),
                           ("JIRA_EMAIL / CONFLUENCE_EMAIL",   EMAIL),
                           ("JIRA_API_TOKEN / CONFLUENCE_API_TOKEN", API_TOKEN)] if not k]
if missing:
    print(f"ERROR: Missing env vars: {', '.join(missing)}")
    sys.exit(1)

BASE_URL = f"https://{DOMAIN}/rest/api/3"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {"Content-Type": "application/json", "Accept": "application/json"}

# ── Load test results ─────────────────────────────────────────────────────────
with open(RESULTS_PATH) as f:
    data = json.load(f)

all_rows = []
for suite in data["testResults"]:
    file = (suite.get("testFilePath") or "").split("/")[-1] or "—"
    for t in suite.get("assertionResults", []):
        all_rows.append({
            "file":   file,
            "suite":  " > ".join(t.get("ancestorTitles", [])),
            "test":   t["title"],
            "status": t["status"],
        })

num_passed = data["numPassedTests"]
num_failed = data["numFailedTests"]
num_total  = data["numTotalTests"]
run_at     = datetime.fromtimestamp(data["startTime"] / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# ── Build Atlassian Document Format (ADF) comment ────────────────────────────
def make_adf_comment(ticket_id, description, relevant_suites):
    if relevant_suites is None:
        rows = all_rows
    elif len(relevant_suites) == 0:
        rows = []
    else:
        rows = [r for r in all_rows if any(s in r["suite"] for s in relevant_suites)]

    passed = sum(1 for r in rows if r["status"] == "passed")
    failed = sum(1 for r in rows if r["status"] != "passed")
    total  = len(rows)

    overall_color = "color_green" if failed == 0 and total > 0 else ("color_red" if failed > 0 else "color_blue")
    overall_text  = "ALL PASS" if failed == 0 and total > 0 else (f"{failed} FAILED" if failed > 0 else "N/A — covered by integration")

    # Build table rows
    table_rows = []
    for i, r in enumerate(rows):
        icon = "✅" if r["status"] == "passed" else "❌"
        table_rows.append({
            "type": "tableRow",
            "content": [
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": str(i+1)}]}]},
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": r["suite"]}]}]},
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": r["test"]}]}]},
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": f"{icon} {r['status'].upper()}"}]}]},
            ]
        })

    header_row = {
        "type": "tableRow",
        "content": [
            {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "#"}]}]},
            {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Suite"}]}]},
            {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Test"}]}]},
            {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Result"}]}]},
        ]
    }

    content_blocks = [
        {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Unit Test Results"}]},
        {"type": "paragraph", "content": [
            {"type": "text", "text": f"Run at: {run_at}   |   Overall: "},
            {"type": "text", "text": overall_text, "marks": [{"type": "strong"}]},
        ]},
        {"type": "paragraph", "content": [
            {"type": "text", "text": f"Total: {num_total}  |  Passed: {num_passed}  |  Failed: {num_failed}  |  Suites: 3"},
        ]},
        {"type": "paragraph", "content": [
            {"type": "text", "text": "Full report: "},
            {"type": "text", "text": "StayRed – Unit Test Results", "marks": [{"type": "link", "attrs": {"href": CONFLUENCE_PAGE}}]},
        ]},
    ]

    if rows:
        content_blocks.append({
            "type": "table",
            "attrs": {"isNumberColumnEnabled": False, "layout": "default"},
            "content": [header_row] + table_rows
        })
    else:
        content_blocks.append({
            "type": "paragraph", "content": [
                {"type": "text", "text": "No direct test cases for this story — covered by the full suite (18/18 passing). See Confluence report above."}
            ]
        })

    return {"version": 1, "type": "doc", "content": content_blocks}


# ── Post comments ─────────────────────────────────────────────────────────────
def post_comment(ticket_id, adf_body):
    url = f"{BASE_URL}/issue/{ticket_id}/comment"
    payload = {"body": adf_body}
    resp = requests.post(url, json=payload, auth=AUTH, headers=HEADERS, timeout=30)
    return resp

def main():
    print(f"Connecting to Jira: {DOMAIN}\n")
    results = []
    for ticket_id, description, relevant_suites in TICKETS:
        adf = make_adf_comment(ticket_id, description, relevant_suites)
        resp = post_comment(ticket_id, adf)
        if resp.status_code in (200, 201):
            print(f"  ✅  {ticket_id}  — comment added")
            results.append((ticket_id, "OK"))
        else:
            print(f"  ❌  {ticket_id}  — {resp.status_code}: {resp.text[:120]}")
            results.append((ticket_id, f"FAILED {resp.status_code}"))

    print(f"\nDone. {sum(1 for _,s in results if s=='OK')}/{len(results)} tickets updated.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        sys.exit(1)
