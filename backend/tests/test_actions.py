from app.schemas import FormField, PageContext
from app.services.actions import parse_fill_actions


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


def test_no_fenced_block_yields_no_actions() -> None:
    page = _page([FormField(index=0, selector="#name", label="Name", type="text")])
    message, actions = parse_fill_actions("Just a normal answer with no actions.", page)
    assert actions == []
    assert message == "Just a normal answer with no actions."


def test_valid_actions_are_parsed_and_carry_selector_and_label() -> None:
    page = _page(
        [
            FormField(index=0, selector="#name", label="Full name", type="text"),
            FormField(index=1, selector="#email", label="Email", type="email"),
        ]
    )
    content = (
        "I'll fill those in.\n"
        '```json\n{"actions": [{"index": 0, "value": "Ada"}, {"index": 1, "value": "ada@x.io"}]}\n```'
    )
    message, actions = parse_fill_actions(content, page)
    assert message == "I'll fill those in."
    assert [(a.index, a.selector, a.label, a.value) for a in actions] == [
        (0, "#name", "Full name", "Ada"),
        (1, "#email", "Email", "ada@x.io"),
    ]


def test_unknown_field_index_is_dropped() -> None:
    # index 5 was never advertised by the page (e.g. a filtered-out password field);
    # the model cannot invent a write target.
    page = _page([FormField(index=0, selector="#name", label="Name", type="text")])
    content = '```json\n{"actions": [{"index": 5, "value": "secret"}]}\n```'
    message, actions = parse_fill_actions(content, page)
    assert actions == []


def test_malformed_json_is_ignored() -> None:
    page = _page([FormField(index=0, selector="#name", label="Name", type="text")])
    content = "Sure.\n```json\n{not valid json}\n```"
    message, actions = parse_fill_actions(content, page)
    assert actions == []
    assert message == "Sure."
