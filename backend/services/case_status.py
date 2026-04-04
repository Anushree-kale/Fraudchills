"""Map internal DB statuses to dashboard OPEN / REVIEW / RESOLVED."""

RESOLVED_SET = frozenset({"RESOLVED", "REJECTED"})
REVIEW_SET = frozenset(
    {
        "INVESTIGATING",
        "RESPONDED",
        "ESCALATED",
        "REVIEW",
        "UNDER_REVIEW",
    }
)


def ui_status(db_status: str | None) -> str:
    s = (db_status or "PENDING").upper()
    if s in RESOLVED_SET:
        return "RESOLVED"
    if s in REVIEW_SET:
        return "REVIEW"
    return "OPEN"


def is_active_case(db_status: str | None) -> bool:
    return ui_status(db_status) != "RESOLVED"
