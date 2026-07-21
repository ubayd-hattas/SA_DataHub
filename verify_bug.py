"""
Bug verification: AutomationHTTPError raised without url argument.

This script verifies:
1. The bug exists (TypeError raised, not AutomationHTTPError)
2. The error IS caught by the generic `except Exception` handler in fetch_and_apply
3. What the exact error message will be in production logs
"""
import sys
sys.path.insert(0, '.')

from automation.core.http_client import AutomationHTTPError

print("=== BUG VERIFICATION: AutomationHTTPError missing url ===")
print()

# 1. Reproduce the bug directly
print("TEST 1: Direct reproduction of bug at line 674")
try:
    raise AutomationHTTPError(status=403, reason="WAF_BLOCKED: Incapsula WAF challenge detected")
    print("  FAIL: No exception raised (unexpected)")
except TypeError as e:
    print(f"  CONFIRMED BUG: TypeError raised: {e}")
except AutomationHTTPError as e:
    print(f"  No bug: url={e.url!r}")
print()

# 2. Verify the error class of the raised exception (TypeError not AutomationHTTPError)
print("TEST 2: Is the bug masked by fetch_and_apply's except Exception?")
class _FakeAutomationHTTPError(Exception):
    """Mimic real AutomationHTTPError for isolation"""
    def __init__(self, url, status, reason):
        self.url = url
        self.status = status
        self.reason = reason

def simulate_buggy_fetch(client, hub_url):
    """Simulate _fetch_release_hub_html with the bug at line 674."""
    # Buggy call - missing url positional argument
    raise AutomationHTTPError(status=403, reason="WAF_BLOCKED: Incapsula WAF challenge detected")

# Simulate fetch_and_apply try/except (lines 4275-4290)
result = {"errors": []}
try:
    simulate_buggy_fetch(None, "https://www.statssa.gov.za/?page_id=1854&PPN=P0211")
except AutomationHTTPError as exc:
    # This path WOULD be taken if the bug didn't exist
    msg = f"QLFS release hub returned HTTP {exc.status}: {exc.reason}"
    result["errors"].append(msg)
    print(f"  Caught as AutomationHTTPError (no bug path): {msg}")
except Exception as exc:
    # This path IS taken due to the bug (TypeError not AutomationHTTPError)
    msg = f"Failed to fetch QLFS release hub: {exc}"
    result["errors"].append(msg)
    print(f"  Caught as Exception (BUG path): TypeError masquerading as generic error")
    print(f"  Error message in result[\"errors\"]: {msg!r}")
    print(f"  Exception type: {type(exc).__name__}")
print()

# 3. What the user sees in production logs
print("TEST 3: Production impact summary")
print("  - When WAF blocks the hub during fetch_and_apply():")
print("    - TypeError is raised inside _fetch_release_hub_html() at line 674")
print("    - TypeError is caught by 'except Exception' at line 4286")
print("    - Error is reported as: 'Failed to fetch QLFS release hub: ...'")
print("    - This is MISLEADING - looks like a network error, not a WAF block")
print("    - fetch_and_apply() returns early with result['status'] still 'pending'")
print("    - exc.status is NEVER accessible because the TypeError has no .status")
print()
print("  - Correct fix: pass hub_url as first positional arg:")
print("    raise AutomationHTTPError(hub_url, 403, 'WAF_BLOCKED: Incapsula WAF challenge detected')")
print()

# 4. Confirm the fix works
print("TEST 4: Fixed version works correctly")
try:
    url = "https://www.statssa.gov.za/?page_id=1854&PPN=P0211"
    raise AutomationHTTPError(url, 403, "WAF_BLOCKED: Incapsula WAF challenge detected")
except AutomationHTTPError as exc:
    print(f"  Fixed: AutomationHTTPError raised correctly")
    print(f"  url={exc.url!r}")
    print(f"  status={exc.status}")
    print(f"  reason={exc.reason!r}")
    # Now check if fetch_and_apply's handler would produce the right message
    msg = f"QLFS release hub returned HTTP {exc.status}: {exc.reason}"
    print(f"  Error message in result['errors']: {msg!r}")
print()
print("=== DONE ===")
