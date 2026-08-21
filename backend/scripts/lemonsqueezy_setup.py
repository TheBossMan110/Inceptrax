"""
LemonSqueezy setup helper.

Reads your LemonSqueezy account and prints the exact .env lines to paste —
so variant IDs are never copied by hand and never transposed.

Usage (from the backend directory):

    # inside Docker (recommended — the API key is already in the container env)
    docker exec inceptrax-backend python scripts/lemonsqueezy_setup.py

    # or locally, with the key passed in
    LEMONSQUEEZY_API_KEY=... python scripts/lemonsqueezy_setup.py

Read-only. It never creates, edits, or deletes anything in your store.
"""

import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.lemonsqueezy.com/v1"

# Maps a product's billing interval + our tier naming onto the env var the
# backend reads. Tier is matched from the product name, case-insensitively.
TIERS = ("starter", "pro", "enterprise")
INTERVALS = {"month": "MONTHLY", "year": "YEARLY"}


def _get(path: str, key: str) -> dict:
    req = urllib.request.Request(
        f"{API}{path}",
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/vnd.api+json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def _mode() -> str:
    value = (os.environ.get("LEMONSQUEEZY_MODE") or "live").strip().lower()
    return "test" if value == "test" else "live"


def _cfg(name: str) -> str:
    """Mode-aware lookup, matching LemonSqueezyService._cfg."""
    prefixed = os.environ.get(f"LEMONSQUEEZY_{_mode().upper()}_{name}")
    if prefixed:
        return prefixed.strip()
    return (os.environ.get(f"LEMONSQUEEZY_{name}") or "").strip()


def main() -> int:
    mode = _mode()
    prefix = f"LEMONSQUEEZY_{mode.upper()}_"

    print(f"Mode: {mode.upper()}  (set LEMONSQUEEZY_MODE=test|live to switch)")
    print(f"Reading {prefix}* first, falling back to LEMONSQUEEZY_*\n")

    key = _cfg("API_KEY")
    if not key:
        print("No API key found.\n")
        print(f"Set {prefix}API_KEY (or LEMONSQUEEZY_API_KEY) in backend/.env.")
        print("Create one at https://app.lemonsqueezy.com/settings/api")
        print(f"Make sure it is a {mode.upper()} mode key — test and live keys")
        print("only work against their own side of the account.")
        return 1

    # ── Stores ────────────────────────────────────────────────────────────
    try:
        stores = _get("/stores", key).get("data", [])
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("The API key was rejected (401 Unauthorized).\n")
            print("This usually means the key was revoked or belongs to a different")
            print("account. Generate a fresh one at:")
            print("  https://app.lemonsqueezy.com/settings/api")
            print("then replace LEMONSQUEEZY_API_KEY in backend/.env.")
        else:
            print(f"LemonSqueezy API error {e.code}: {e.reason}")
        return 1
    except Exception as e:
        print(f"Could not reach LemonSqueezy: {e}")
        return 1

    if not stores:
        print("No stores found on this account.")
        print("Finish creating your store at https://app.lemonsqueezy.com first.")
        return 1

    print("=" * 68)
    print("STORES")
    print("=" * 68)
    for s in stores:
        a = s["attributes"]
        print(f"  id={s['id']}  {a.get('name')}  ({a.get('slug')})")
        print(f"     currency={a.get('currency')}  country={a.get('country')}")
    store_id = stores[0]["id"]
    print()

    # ── Products and their variants ───────────────────────────────────────
    try:
        products = _get(f"/products?filter[store_id]={store_id}", key).get("data", [])
    except Exception as e:
        print(f"Could not list products: {e}")
        return 1

    if not products:
        print("No products yet. Create them in the dashboard, then re-run this.")
        print("You need: Starter, Pro, Enterprise — each with a monthly price")
        print("(and optionally a yearly price at 10x the monthly).")
        return 1

    print("=" * 68)
    print("PRODUCTS AND VARIANTS")
    print("=" * 68)

    env_lines: dict[str, str] = {}
    unmatched: list[str] = []

    for p in products:
        pid = p["id"]
        pname = p["attributes"].get("name", "")
        print(f"\n  {pname}  (product id={pid})")

        try:
            variants = _get(f"/variants?filter[product_id]={pid}", key).get("data", [])
        except Exception as e:
            print(f"    could not list variants: {e}")
            continue

        tier = next((t for t in TIERS if t in pname.lower()), None)

        for v in variants:
            va = v["attributes"]
            vid = v["id"]
            interval = (va.get("interval") or "").lower()
            price_cents = va.get("price")
            price = f"{price_cents / 100:.2f}" if isinstance(price_cents, int) else "?"
            label = va.get("name", "")

            print(f"    variant id={vid:<10} {label:<18} interval={interval or 'one-time':<9} price={price}")

            suffix = INTERVALS.get(interval)
            if tier and suffix:
                env_lines[f"LEMONSQUEEZY_{tier.upper()}_{suffix}_VARIANT_ID"] = vid
            else:
                reason = "product name has no tier keyword" if not tier else "not a subscription interval"
                unmatched.append(f"{pname} / {label} (id={vid}) — {reason}")

    # ── Output ────────────────────────────────────────────────────────────
    print("\n" + "=" * 68)
    print("PASTE THESE INTO backend/.env")
    print("=" * 68)
    print(f"LEMONSQUEEZY_MODE={mode}")
    print(f"{prefix}STORE_ID={store_id}")

    expected = [
        f"{prefix}{t.upper()}_{i}_VARIANT_ID"
        for t in TIERS
        for i in ("MONTHLY", "YEARLY")
    ]
    for name in expected:
        value = env_lines.get(name, "")
        marker = "" if value else "   # not found yet"
        print(f"{name}={value}{marker}")

    if unmatched:
        print("\n" + "-" * 68)
        print("COULD NOT AUTO-MATCH")
        print("-" * 68)
        for u in unmatched:
            print(f"  {u}")
        print("\nName products so they contain 'Starter', 'Pro', or 'Enterprise'")
        print("and set each price to recur monthly or yearly.")

    # ── Validate whatever is already in the environment ───────────────────
    # Test mode and live mode are entirely separate environments with their
    # own products and IDs. A live key with test-mode variant IDs (or vice
    # versa) fails at checkout with a confusing error, so catch it here.
    live_ids = {vid for vid in env_lines.values()}
    stale: list[str] = []
    for name in expected:
        current = os.environ.get(name, "").strip()
        if current and current not in live_ids:
            stale.append(f"{name}={current}")

    if stale:
        print("\n" + "!" * 68)
        print("MODE MISMATCH — these IDs are set but do not exist in this account")
        print("!" * 68)
        for s in stale:
            print(f"  {s}")
        print("\nAlmost always this means the products were created in a different")
        print("mode than the API key. Test mode and Live mode do not share data.")
        print("Fix: use an API key from the SAME mode the products live in,")
        print("then re-run this script and paste the IDs it prints above.")

    missing = [n for n in expected if not env_lines.get(n)]
    if missing:
        print(f"\n{len(expected) - len(missing)}/{len(expected)} variants found.")
        print("Missing ones simply disable that plan's button — they are not fatal.")
        print("At minimum you need LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID for a demo.")
    else:
        print("\nAll six variants found. Paste the block above and restart the backend.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
