from app.schemas import FormField, PageContext, ProfileEntry
from app.services.chat import build_page_system_prompt


def _page(fields: list[FormField]) -> PageContext:
    return PageContext(
        url="https://example.com/",
        title="Example",
        text="",
        selectedText="",
        interactiveElements=[],
        formFields=fields,
        dom=None,
    )


def test_profile_is_included_when_the_page_has_form_fields() -> None:
    page = _page([FormField(index=0, selector="#email", label="Email", type="email")])
    profile = [ProfileEntry(label="Email", value="ada@example.com")]
    prompt = build_page_system_prompt(page, profile)
    assert "saved information" in prompt
    assert "ada@example.com" in prompt


def test_profile_is_omitted_when_the_page_has_no_form_fields() -> None:
    page = _page([])
    profile = [ProfileEntry(label="Email", value="ada@example.com")]
    prompt = build_page_system_prompt(page, profile)
    assert "ada@example.com" not in prompt
