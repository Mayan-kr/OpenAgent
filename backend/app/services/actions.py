import json
import re

from app.schemas import PageContext, ProposedAction

_FENCED_JSON = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def parse_fill_actions(content: str, page: PageContext) -> tuple[str, list[ProposedAction]]:
    """Split a model reply into human text and validated fill actions.

    The model is asked to emit a fenced ```json {"actions": [{"index", "value"}]} ``` block
    when the user wants fields filled. Actions are validated against the page's own field
    list - an index the page never advertised (including any sensitive field the extractor
    already dropped) is discarded, so the model cannot invent a target to write to.
    """
    match = _FENCED_JSON.search(content)
    if not match:
        return content, []

    cleaned = (content[: match.start()] + content[match.end() :]).strip()
    by_index = {field.index: field for field in page.form_fields}
    actions: list[ProposedAction] = []
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        data = {}

    raw_actions = data.get("actions", []) if isinstance(data, dict) else []
    for item in raw_actions:
        if not isinstance(item, dict):
            continue
        index = item.get("index")
        value = item.get("value")
        if not isinstance(index, int) or not isinstance(value, str):
            continue
        field = by_index.get(index)
        if field is None:
            continue
        actions.append(
            ProposedAction(
                type="fill",
                index=field.index,
                selector=field.selector,
                label=field.label,
                value=value[:2_000],
            )
        )

    if actions and not cleaned:
        cleaned = f"I've prepared {len(actions)} field(s) to fill. Review them and click Apply."
    return cleaned, actions
