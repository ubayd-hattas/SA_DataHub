"""
automation.adapters — Source adapter plugin system.

Every data source (Stats SA, SARB, SAPS, World Bank, …) provides one
adapter class that inherits from :class:`BaseAdapter`.  The runner
discovers all registered adapters via :func:`get_registry` and executes
each one in priority order.

How the plugin system works
---------------------------
1. Each adapter module calls ``register(MyAdapter)`` at import time.
2. The runner calls ``autodiscover()`` once at startup, which imports
   every module in the ``adapters/`` package.
3. After ``autodiscover()``, ``get_registry()`` returns all registered
   adapters sorted by priority.

Adding a new source
-------------------
1. Create ``automation/adapters/<source_id>.py``.
2. Subclass :class:`BaseAdapter`, implement all abstract methods.
3. Call ``register(MyAdapter)`` at the bottom of the module.
4. Add a config file ``automation/config/sources/<source_id>.yaml``.
5. That's it — the runner picks it up automatically.

See ``automation/docs/developer-guide.md`` for the full tutorial.
"""

from __future__ import annotations

import importlib
import pkgutil
from pathlib import Path
from typing import TYPE_CHECKING, Type

if TYPE_CHECKING:
    from automation.adapters.base import BaseAdapter

# ---------------------------------------------------------------------------
# Registry (module-level dict: source_id → adapter class)
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, Type["BaseAdapter"]] = {}


def register(adapter_class: Type["BaseAdapter"]) -> Type["BaseAdapter"]:
    """
    Register an adapter class.

    Typically called at module level in each adapter module::

        from automation.adapters import register

        class StatsSAAdapter(BaseAdapter):
            ...

        register(StatsSAAdapter)

    Raises
    ------
    ValueError
        If a different class is already registered under the same source_id.
    """
    sid = adapter_class.source_id
    existing = _REGISTRY.get(sid)
    if existing is not None and existing is not adapter_class:
        raise ValueError(
            f"Adapter source_id '{sid}' is already registered by "
            f"{existing.__module__}.{existing.__name__}. "
            f"Cannot register {adapter_class.__module__}.{adapter_class.__name__} "
            f"under the same ID."
        )
    _REGISTRY[sid] = adapter_class
    return adapter_class


def get_registry() -> dict[str, Type["BaseAdapter"]]:
    """Return a copy of the current adapter registry."""
    return dict(_REGISTRY)


def get_adapter_class(source_id: str) -> Type["BaseAdapter"] | None:
    """Return the adapter class for ``source_id``, or None if not registered."""
    return _REGISTRY.get(source_id)


# ---------------------------------------------------------------------------
# Auto-discovery
# ---------------------------------------------------------------------------

_ADAPTERS_PACKAGE = "automation.adapters"
_ADAPTERS_DIR = Path(__file__).resolve().parent


def autodiscover() -> list[str]:
    """
    Import all modules in the ``automation/adapters/`` package so that
    their ``register()`` calls execute.

    Returns the list of module names that were imported.
    """
    imported: list[str] = []
    for finder, modname, _ispkg in pkgutil.iter_modules([str(_ADAPTERS_DIR)]):
        if modname.startswith("_") or modname == "base":
            continue
        full_name = f"{_ADAPTERS_PACKAGE}.{modname}"
        try:
            importlib.import_module(full_name)
            imported.append(full_name)
        except ImportError as exc:
            # Don't crash the runner if an adapter has a missing optional dep
            import warnings
            warnings.warn(
                f"Could not import adapter module {full_name}: {exc}",
                stacklevel=2,
            )
    return imported
