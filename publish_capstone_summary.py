import os
"""
publish_capstone_summary.py
Updates the "Capstone-Codemie- Summary" page with the Jira tickets table
and the Confluence pages table in a single page.
"""

import sys, json, traceback
from datetime import datetime, timezone
import requests
from requests.auth import HTTPBasicAuth

DOMAIN    = "anusebin89.atlassian.net"
EMAIL     = os.environ.get("CONFLUENCE_EMAIL", "anusebin89@gmail.com")
API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]
SPACE_KEY = "capstoneco"
PAGE_ID   = "4751363"   # existing "Capstone-Codemie- Summary"
PAGE_TITLE = "Capstone-Codemie-Summary"

BASE_WIKI = f"https://{DOMAIN}/wiki/rest/api"
BASE_JIRA = f"https://{DOMAIN}/rest/api/3"
AUTH      = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS   = {"Content-Type": "application/json; charset=utf-8", "Accept": "application/json"}

run_at = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

# ── Fetch Jira tickets ────────────────────────────────────────────────────────
jira_resp = requests.post(
    f"{BASE_JIRA}/search/jql",
    json={"jql": "project=KAN ORDER BY created ASC", "fields": ["summary", "status", "issuetype", "labels"], "maxResults": 20},
    auth=AUTH, headers=HEADERS, timeout=30
)
jira_resp.raise_for_status()
jira_issues = jira_resp.json().get("issues", [])

# ── Fetch Confluence pages ────────────────────────────────────────────────────
conf_resp = requests.get(
    f"{BASE_WIKI}/content",
    params={"spaceKey": SPACE_KEY, "expand": "version", "limit": 50},
    auth=AUTH, headers=HEADERS, timeout=30
)
conf_resp.raise_for_status()
conf_pages = conf_resp.json().get("results", [])

# ── Build Jira table ──────────────────────────────────────────────────────────
def status_badge(s):
    color = "#36B37E" if s == "Done" else ("#0052CC" if s == "In Progress" else "#6554C0")
    return f'<span style="background:{color};color:#fff;padding:2px 10px;border-radius:4px;font-size:0.85em;font-weight:bold;">{s}</span>'

jira_rows = ""
for i, issue in enumerate(jira_issues, 1):
    f = issue["fields"]
    labels = ", ".join(f.get("labels", [])) or "—"
    status = f["status"]["name"]
    itype  = f["issuetype"]["name"]
    bg     = "#fff" if i % 2 == 0 else "#F4F5F7"
    jira_rows += f"""
    <tr style="background:{bg};">
      <td style="padding:8px 12px;text-align:center;">{i}</td>
      <td style="padding:8px 12px;font-weight:bold;white-space:nowrap;">{issue['key']}</td>
      <td style="padding:8px 12px;">{f['summary']}</td>
      <td style="padding:8px 12px;text-align:center;">{itype}</td>
      <td style="padding:8px 12px;">{labels}</td>
      <td style="padding:8px 12px;text-align:center;">{status_badge(status)}</td>
    </tr>"""

# ── Build Confluence pages table ──────────────────────────────────────────────
conf_rows = ""
for i, p in enumerate(conf_pages, 1):
    url  = f"https://{DOMAIN}/wiki{p['_links']['webui']}"
    ver  = p["version"]["number"]
    bg   = "#fff" if i % 2 == 0 else "#F4F5F7"
    conf_rows += f"""
    <tr style="background:{bg};">
      <td style="padding:8px 12px;text-align:center;">{i}</td>
      <td style="padding:8px 12px;">{p['id']}</td>
      <td style="padding:8px 12px;"><a href="{url}">{p['title']}</a></td>
      <td style="padding:8px 12px;text-align:center;">v{ver}</td>
      <td style="padding:8px 12px;"><a href="{url}">{url}</a></td>
    </tr>"""

# ── Assemble full page ────────────────────────────────────────────────────────
html_body = f"""
<p><em>Last updated: {run_at}</em></p>

<h2>Jira Tickets</h2>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:0.95em;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:10px 12px;text-align:center;">#</th>
      <th style="padding:10px 12px;text-align:left;">Ticket</th>
      <th style="padding:10px 12px;text-align:left;">Summary</th>
      <th style="padding:10px 12px;text-align:center;">Type</th>
      <th style="padding:10px 12px;text-align:left;">Labels</th>
      <th style="padding:10px 12px;text-align:center;">Status</th>
    </tr>
  </thead>
  <tbody>{jira_rows}</tbody>
</table>

<h2>Confluence Pages</h2>
<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:0.95em;">
  <thead>
    <tr style="background:#0052CC;color:#fff;">
      <th style="padding:10px 12px;text-align:center;">#</th>
      <th style="padding:10px 12px;text-align:left;">Page ID</th>
      <th style="padding:10px 12px;text-align:left;">Title</th>
      <th style="padding:10px 12px;text-align:center;">Version</th>
      <th style="padding:10px 12px;text-align:left;">URL</th>
    </tr>
  </thead>
  <tbody>{conf_rows}</tbody>
</table>
"""

# ── Create or update page ─────────────────────────────────────────────────────
def get_existing():
    resp = requests.get(f"{BASE_WIKI}/content",
                        params={"spaceKey": SPACE_KEY, "title": PAGE_TITLE, "expand": "version"},
                        auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None

def create_page():
    payload = {"type": "page", "title": PAGE_TITLE, "space": {"key": SPACE_KEY},
               "body": {"storage": {"value": html_body, "representation": "storage"}}}
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.post(f"{BASE_WIKI}/content", data=body, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()

def update_page(page_id, version):
    payload = {"type": "page", "title": PAGE_TITLE, "version": {"number": version + 1},
               "body": {"storage": {"value": html_body, "representation": "storage"}}}
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.put(f"{BASE_WIKI}/content/{page_id}", data=body,
                        auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()

def main():
    print(f"Fetched {len(jira_issues)} Jira tickets and {len(conf_pages)} Confluence pages.")
    existing = get_existing()
    if existing:
        print(f"Updating existing page (id={existing['id']}, v{existing['version']['number']}) …")
        result = update_page(existing["id"], existing["version"]["number"])
    else:
        print("Creating new page …")
        result = create_page()
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
