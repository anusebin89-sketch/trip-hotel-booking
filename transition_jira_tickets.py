import os
"""
transition_jira_tickets.py
Transitions all 8 KAN sprint tickets to Done (transition id=41).
"""

import sys, requests, traceback
from requests.auth import HTTPBasicAuth

DOMAIN    = "anusebin89.atlassian.net"
EMAIL     = os.environ.get("CONFLUENCE_EMAIL", "anusebin89@gmail.com")
API_TOKEN = os.environ["CONFLUENCE_API_TOKEN"]

TICKETS        = [f"KAN-{n}" for n in range(3, 11)]   # KAN-3 … KAN-10
DONE_TRANSITION = "41"

BASE_URL = f"https://{DOMAIN}/rest/api/3"
AUTH     = HTTPBasicAuth(EMAIL, API_TOKEN)
HEADERS  = {"Content-Type": "application/json", "Accept": "application/json"}

def transition(ticket):
    resp = requests.post(
        f"{BASE_URL}/issue/{ticket}/transitions",
        json={"transition": {"id": DONE_TRANSITION}},
        auth=AUTH, headers=HEADERS, timeout=30
    )
    return resp.status_code

def main():
    print(f"Transitioning tickets to Done on {DOMAIN}\n")
    print(f"{'Ticket':<12} Status")
    print("-" * 25)
    for ticket in TICKETS:
        code = transition(ticket)
        status = "✅ Done" if code == 204 else f"❌ HTTP {code}"
        print(f"{ticket:<12} {status}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        traceback.print_exc()
        sys.exit(1)
