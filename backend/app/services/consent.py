from app.schemas import ActionRequest


HIGH_RISK_TERMS = ("payment", "bank", "transfer", "checkout", "purchase")


def requires_explicit_confirmation(request: ActionRequest) -> bool:
    """All mutations need consent; financial terms are never eligible for trusted-mode bypass."""

    text = f"{request.reason} {request.target or ''}".lower()
    return True if any(term in text for term in HIGH_RISK_TERMS) else True
