"""
automation — SA Data Hub automation framework.

Run via:
    python -m automation           (same as python -m automation.runner)
    python -m automation --list
    python -m automation --dry-run
"""

from automation.runner import main

raise SystemExit(main())
