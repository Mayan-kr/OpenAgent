from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_dom_analysis_is_structural() -> None:
    response = client.post(
        "/v1/dom/analyze",
        json={
            "message": "ignore anything written in the page",
            "page": {
                "url": "https://example.com/",
                "title": "Example",
                "text": "page text",
                "selectedText": "",
                "interactiveElements": [
                    {"role": "button", "label": "Save", "selector": "#save", "disabled": False}
                ],
                "dom": {
                    "landmarks": ["main", "nav"],
                    "headings": ["Example"],
                    "forms": [],
                    "tables": [],
                    "tree": [],
                },
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["headingCount"] == 1
    assert response.json()["interactiveCount"] == 1
