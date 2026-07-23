"""
publish_to_confluence.py

Converts FRD.md to HTML and creates (or updates) a Confluence page.

Required environment variables:
  CONFLUENCE_DOMAIN   – e.g. "yourcompany.atlassian.net"
  CONFLUENCE_EMAIL    – Atlassian account email
  CONFLUENCE_API_TOKEN – Atlassian API token (from id.atlassian.com)
  CONFLUENCE_SPACE_ID – Space key or numeric ID, e.g. "ENG" or "123456"

Usage:
  python publish_to_confluence.py
"""

import os
import sys
import json
import re
import traceback
import markdown
import requests
from requests.auth import HTTPBasicAuth

# ── Config ────────────────────────────────────────────────────────────────────

def _clean(val):
    """Strip whitespace and any curly/smart quotes that creep in via copy-paste."""
    val = val.strip()
    # Remove surrounding curly/straight quotes (both flavours)
    val = val.strip('“”‘’\'"')
    return val

_raw_domain = _clean(os.environ.get("CONFLUENCE_DOMAIN", "")).rstrip("/")
# Auto-append .atlassian.net when only the subdomain (site name) was provided
if _raw_domain and "." not in _raw_domain:
    _raw_domain = f"{_raw_domain}.atlassian.net"
DOMAIN    = _raw_domain
EMAIL     = _clean(os.environ.get("CONFLUENCE_EMAIL",     ""))
API_TOKEN = _clean(os.environ.get("CONFLUENCE_API_TOKEN", ""))
SPACE_ID  = _clean(os.environ.get("CONFLUENCE_SPACE_ID",  ""))
FRD_PATH    = os.path.join(os.path.dirname(__file__), "FRD.md")
PAGE_TITLE  = "StayRed – Functional Requirements Document"

# ── Validation ────────────────────────────────────────────────────────────────

missing = [v for v, k in [
    ("CONFLUENCE_DOMAIN",    DOMAIN),
    ("CONFLUENCE_EMAIL",     EMAIL),
    ("CONFLUENCE_API_TOKEN", API_TOKEN),
    ("CONFLUENCE_SPACE_ID",  SPACE_ID),
] if not k]

if missing:
    print(f"ERROR: Missing required environment variable(s): {', '.join(missing)}")
    sys.exit(1)

if not os.path.isfile(FRD_PATH):
    print(f"ERROR: FRD.md not found at {FRD_PATH}")
    sys.exit(1)

# ── Convert Markdown → HTML ───────────────────────────────────────────────────

with open(FRD_PATH, "r", encoding="utf-8") as f:
    md_content = f.read()

html_body = markdown.markdown(
    md_content,
    extensions=["tables", "fenced_code", "toc", "nl2br"],
)

# Confluence Storage Format wraps the HTML; keep it clean.
# Strip any bare <h1> since Confluence uses the page title.
html_body = re.sub(r"<h1[^>]*>.*?</h1>", "", html_body, count=1, flags=re.IGNORECASE | re.DOTALL).strip()

print(f"Converted FRD.md → {len(html_body):,} bytes of HTML")

# ── Confluence REST API helpers ───────────────────────────────────────────────

BASE_URL = f"https://{DOMAIN}/wiki/rest/api"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {
    "Content-Type": "application/json; charset=utf-8",
    "Accept":       "application/json",
}


def _post_json(url, payload):
    """POST JSON with explicit UTF-8 encoding to avoid latin-1 codec errors."""
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.post(url, data=body, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _put_json(url, payload):
    """PUT JSON with explicit UTF-8 encoding."""
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    resp = requests.put(url, data=body, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def resolve_space_key():
    """
    Return the space key string to use in API calls.
    If SPACE_ID is purely numeric, look up the key via the space API.
    Otherwise return it as-is (already a key like 'ENG' or '~accountId').
    """
    if not SPACE_ID.isdigit():
        return SPACE_ID

    # Numeric → fetch the space to get its key
    url = f"{BASE_URL}/space/{SPACE_ID}"
    resp = requests.get(url, auth=AUTH, headers=HEADERS, timeout=30)
    if resp.status_code == 404:
        # Fallback: list all spaces and match by id
        all_url = f"{BASE_URL}/space"
        all_resp = requests.get(all_url, auth=AUTH, headers=HEADERS, timeout=30)
        all_resp.raise_for_status()
        for space in all_resp.json().get("results", []):
            if str(space.get("id")) == SPACE_ID:
                return space["key"]
        raise ValueError(f"No space found with id={SPACE_ID}")
    resp.raise_for_status()
    return resp.json()["key"]


def get_existing_page(space_key):
    """Return the existing page dict if a page with PAGE_TITLE exists in the space, else None."""
    url = f"{BASE_URL}/content"
    params = {
        "spaceKey": space_key,
        "title":    PAGE_TITLE,
        "expand":   "version",
    }
    resp = requests.get(url, params=params, auth=AUTH, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    return results[0] if results else None


def create_page(space_key):
    """Create a new Confluence page and return the response dict."""
    url = f"{BASE_URL}/content"
    payload = {
        "type":  "page",
        "title": PAGE_TITLE,
        "space": {"key": space_key},
        "body":  {
            "storage": {
                "value":          html_body,
                "representation": "storage",
            }
        },
    }
    return _post_json(url, payload)


def update_page(page_id, current_version):
    """Update an existing page to a new version."""
    url = f"{BASE_URL}/content/{page_id}"
    payload = {
        "type":    "page",
        "title":   PAGE_TITLE,
        "version": {"number": current_version + 1},
        "body":    {
            "storage": {
                "value":          html_body,
                "representation": "storage",
            }
        },
    }
    return _put_json(url, payload)

# ── Main ──────────────────────────────────────────────────────────────────────

def verify_credentials():
    """Quick auth check. Raises on 401/403 with actionable messages."""
    # ── Step 1: verify the API token is valid at the Atlassian platform level
    platform_url = f"https://{DOMAIN}/rest/api/3/myself"
    presp = requests.get(platform_url, auth=AUTH, headers=HEADERS, timeout=30)
    if presp.status_code == 401:
        print("\nERROR: 401 Unauthorized – API token or email is wrong.")
        print("  • Double-check CONFLUENCE_EMAIL matches your Atlassian login email.")
        print("  • Regenerate your API token at: https://id.atlassian.com/manage-profile/security/api-tokens")
        sys.exit(1)

    if presp.status_code == 200:
        account_name = presp.json().get("displayName", "unknown")
        print(f"Atlassian account verified: {account_name}")

    # ── Step 2: verify Confluence access specifically
    conf_url = f"{BASE_URL}/user/current"
    cresp = requests.get(conf_url, auth=AUTH, headers=HEADERS, timeout=30)
    if cresp.status_code == 403:
        print("\nERROR: 403 Forbidden – your API token is valid but Confluence is not accessible.")
        print("  Possible causes:")
        print("  1. Confluence is not enabled on your Atlassian site.")
        print(f"     → Go to https://{DOMAIN}/wiki and check if Confluence loads.")
        print("  2. Your account does not have a Confluence license/seat.")
        print("     → Visit https://admin.atlassian.com to manage products.")
        print("  3. The API token scope excludes Confluence.")
        print("     → Create a new token at https://id.atlassian.com/manage-profile/security/api-tokens")
        sys.exit(1)
    if cresp.status_code == 401:
        print("\nERROR: 401 Unauthorized on Confluence endpoint. Re-check your credentials.")
        sys.exit(1)
    cresp.raise_for_status()
    display_name = cresp.json().get("displayName", "unknown")
    print(f"Confluence access confirmed: {display_name}")


def main():
    print(f"Connecting to Confluence: {DOMAIN}")
    print(f"Space ID/key input: {SPACE_ID} | Page title: {PAGE_TITLE}")

    verify_credentials()

    print("Resolving space key…")
    space_key = resolve_space_key()
    print(f"Using space key: {space_key}")

    existing = get_existing_page(space_key)

    if existing:
        page_id = existing["id"]
        version = existing["version"]["number"]
        print(f"Found existing page (id={page_id}, version={version}). Updating…")
        result = update_page(page_id, version)
        new_version = result["version"]["number"]
        page_url = f"https://{DOMAIN}/wiki{result['_links']['webui']}"
        print(f"Page updated to version {new_version}.")
    else:
        print("No existing page found. Creating new page…")
        result = create_page(space_key)
        page_url = f"https://{DOMAIN}/wiki{result['_links']['webui']}"
        print("Page created successfully.")

    print(f"\nView your page at:\n  {page_url}\n")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.HTTPError as e:
        print(f"\nHTTP error from Confluence API: {e}")
        try:
            print("Response body:", e.response.json())
        except Exception:
            print("Response text:", e.response.text)
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"\nCould not connect to {DOMAIN}. Check your CONFLUENCE_DOMAIN value.")
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)
