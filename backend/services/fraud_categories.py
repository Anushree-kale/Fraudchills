"""Aggregate complaint.type into dashboard fraud category labels."""

from collections import defaultdict
from typing import Dict, List

# complaint.type (DB) -> display category (UI bars)
TYPE_TO_CATEGORY: Dict[str, str] = {
    "SELLER_FRAUD": "Fake seller",
    "BUYER_FRAUD": "Non-delivery",
    "NON_DELIVERY": "Non-delivery",
    "UNAUTHORIZED_CHARGE": "Unauthorized charge",
    "PHISHING": "Fake seller",
    "REFUND_ABUSE": "Refund issues",
    "IDENTITY_THEFT": "Fake seller",
    "PENDING": "Non-delivery",
}

CANONICAL_ORDER = [
    "Non-delivery",
    "Fake seller",
    "Unauthorized charge",
    "Refund issues",
]


def category_for_type(raw_type: str | None) -> str:
    if not raw_type:
        return "Non-delivery"
    return TYPE_TO_CATEGORY.get(raw_type.upper(), "Non-delivery")


def percentages_from_counts(counts: Dict[str, int]) -> List[dict]:
    total = sum(counts.values())
    out = []
    for label in CANONICAL_ORDER:
        n = counts.get(label, 0)
        pct = round((n / total) * 100, 1) if total > 0 else 0.0
        out.append({"type": label, "percentage": pct})
    return out


def merge_counts(rows: List[tuple]) -> Dict[str, int]:
    """rows: list of (type_str, count_int)"""
    acc: Dict[str, int] = defaultdict(int)
    for t, c in rows:
        label = category_for_type(t)
        acc[label] += int(c)
    return dict(acc)
