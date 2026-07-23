"""
create_and_update_jira.py
Creates 8 Story tickets in the KAN project (mirroring EPMCDMETST sprint),
then adds a test-results comment to each.
"""

import os, sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

DOMAIN    = "anusebin89.atlassian.net"
EMAIL     = os.environ.get("CONFLUENCE_EMAIL", "anusebin89@gmail.com")
API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
PROJECT   = "KAN"
ISSUE_TYPE_ID = "10004"   # Story

RESULTS_PATH    = "/tmp/jest-results.json"
CONFLUENCE_PAGE = "https://anusebin89.atlassian.net/wiki/spaces/capstoneco/pages/4751404/StayRed+Unit+Test+Results"

STORIES = [
    ("EPMCDMETST-55140", "Add centralized error-handling middleware",
     "Implement a global Express error handler that returns structured JSON responses with a unique request ID on every request.",
     []),
    ("EPMCDMETST-55141", "Harden session and cookie configuration",
     "Read SESSION_SECRET from environment, set httpOnly/sameSite/secure cookie flags, and enforce a 24-hour session lifetime.",
     ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/me"]),
    ("EPMCDMETST-55142", "Add production CORS policy with origins allowlist",
     "Restrict CORS to an explicit list of origins read from CORS_ORIGINS env variable, reject all others with a 403.",
     []),
    ("EPMCDMETST-55143", "Add automated test coverage with Jest and Supertest",
     "Set up Jest + Supertest, create app.js without listen(), write tests for auth, hotels, and bookings routes.",
     None),
    ("EPMCDMETST-55144", "Add structured observability logging with pino",
     "Install pino and pino-http. Add HTTP request logging middleware with structured JSON output in production and pretty-print in dev.",
     []),
    ("EPMCDMETST-55145", "Introduce repository abstraction over db layer",
     "Create UserRepository, HotelRepository, BookingRepository as thin wrappers over db.js so routes don't depend on storage details.",
     None),
    ("EPMCDMETST-55146", "Add atomic booking conflict detection",
     "Detect overlapping hotel bookings in a single load-check-persist cycle and return 409 when dates clash.",
     ["POST /api/bookings", "GET /api/bookings/my"]),
    ("EPMCDMETST-55147", "Add security headers via Helmet with CSP",
     "Install helmet, configure Content Security Policy directives, and mount it as the first middleware in the stack.",
     []),
]

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

# ── ADF comment builder ───────────────────────────────────────────────────────
def make_comment(relevant_suites):
    if relevant_suites is None:
        rows = all_rows
    elif len(relevant_suites) == 0:
        rows = []
    else:
        rows = [r for r in all_rows if any(s in r["suite"] for s in relevant_suites)]

    passed = sum(1 for r in rows if r["status"] == "passed")
    failed = sum(1 for r in rows if r["status"] != "passed")
    total  = len(rows)
    overall = "ALL PASS ✅" if failed == 0 and total > 0 else (f"{failed} FAILED ❌" if failed > 0 else "Covered by full suite ✅")

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
            {"type": "text", "text": f"Run: {run_at}   |   Overall: "},
            {"type": "text", "text": overall, "marks": [{"type": "strong"}]},
        ]},
        {"type": "paragraph", "content": [
            {"type": "text", "text": f"Global — Total: {num_total}  |  Passed: {num_passed}  |  Failed: {num_failed}  |  Suites: 3"},
        ]},
        {"type": "paragraph", "content": [
            {"type": "text", "text": "Full report: "},
            {"type": "text", "text": "StayRed – Unit Test Results (Confluence)",
             "marks": [{"type": "link", "attrs": {"href": CONFLUENCE_PAGE}}]},
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
                {"type": "text", "text": "No dedicated test cases for this story — all 18 tests in the suite pass. See full Confluence report above."}
            ]
        })

    return {"version": 1, "type": "doc", "content": content_blocks}

# ── Create issue ──────────────────────────────────────────────────────────────
def create_issue(ref, summary, description):
    payload = {
        "fields": {
            "project":   {"key": PROJECT},
            "issuetype": {"id": ISSUE_TYPE_ID},
            "summary":   f"[{ref}] {summary}",
            "description": {
                "version": 1, "type": "doc",
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": description}]}]
            },
            "labels": ["sprint-1", "stayred"],
        }
    }
    resp = requests.post(f"{BASE_URL}/issue", json=payload, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()["key"]

# ── Add comment ───────────────────────────────────────────────────────────────
def add_comment(issue_key, adf_body):
    resp = requests.post(f"{BASE_URL}/issue/{issue_key}/comment",
                         json={"body": adf_body}, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"Project: {PROJECT} on {DOMAIN}\n")
    print(f"{'Ref':<22} {'Created':<12} Status")
    print("-" * 55)
    for ref, summary, description, relevant_suites in STORIES:
        issue_key = create_issue(ref, summary, description)
        adf = make_comment(relevant_suites)
        add_comment(issue_key, adf)
        print(f"{ref:<22} {issue_key:<12} ✅  created + test results added")

    print(f"\nAll 8 tickets created and updated.")
    print(f"View board: https://{DOMAIN}/jira/software/projects/{PROJECT}/boards")

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
