"""
SA Data Hub — Automation Framework
===================================
Source-agnostic automation runner for scheduled data pipeline execution.

Import conventions
------------------
- automation.core.*     — generic, never dataset- or source-aware
- automation.adapters.* — source-specific adapter implementations
- automation.runner     — top-level executable runner
"""

__version__ = "0.1.0"
__all__ = ["__version__"]
