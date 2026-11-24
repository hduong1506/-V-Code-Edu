"""Cấu hình logging. Không bao giờ ghi nội dung tin nhắn/khóa API vào log."""
from __future__ import annotations

import logging

_configured = False


def configure_logging(level: str = "INFO") -> None:
    global _configured
    root = logging.getLogger("vcode")
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    if _configured:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s"))
    root.addHandler(handler)
    root.propagate = False
    _configured = True
