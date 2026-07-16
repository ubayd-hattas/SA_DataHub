import os
from pathlib import Path
from unittest import mock

import pytest

from automation.core.files import atomic_write, atomic_write_text

def test_atomic_write_success(tmp_path):
    target = tmp_path / "data.bin"
    atomic_write(target, b"success bytes")
    assert target.exists()
    assert target.read_bytes() == b"success bytes"

def test_atomic_write_text_success(tmp_path):
    target = tmp_path / "data.txt"
    atomic_write_text(target, "success string")
    assert target.exists()
    assert target.read_text(encoding="utf-8") == "success string"

def test_atomic_write_failure_cleanup(tmp_path):
    target = tmp_path / "failure.bin"
    
    # We mock os.replace to raise an exception, meaning the write fails before atomic swap.
    # The temp file should be deleted in the except block.
    with mock.patch("os.replace", side_effect=OSError("Disk full")):
        with pytest.raises(OSError, match="Disk full"):
            atomic_write(target, b"failure bytes")
            
    assert not target.exists()
    
    # Also verify no temp files are left in the directory
    files_in_dir = list(tmp_path.iterdir())
    assert len(files_in_dir) == 0

