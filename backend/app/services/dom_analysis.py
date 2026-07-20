from app.schemas import DomAnalyzeResponse, PageContext


class DomAnalysisService:
    """Produces a structural summary without interpreting page text as instructions."""

    def analyze(self, page: PageContext) -> DomAnalyzeResponse:
        dom = page.dom
        landmarks = dom.landmarks if dom else []
        headings = dom.headings if dom else []
        forms = dom.forms if dom else []
        tables = dom.tables if dom else []
        interactive_count = len(page.interactive_elements)
        landmark_text = ", ".join(landmarks) if landmarks else "none detected"
        summary = (
            f"{len(headings)} headings, {len(forms)} forms, {len(tables)} tables, "
            f"and {interactive_count} visible interactive elements. Landmarks: {landmark_text}."
        )
        return DomAnalyzeResponse(
            url=page.url,
            title=page.title,
            semanticSummary=summary,
            landmarkCount=len(landmarks),
            headingCount=len(headings),
            formCount=len(forms),
            tableCount=len(tables),
            interactiveCount=interactive_count,
        )


dom_analysis_service = DomAnalysisService()
