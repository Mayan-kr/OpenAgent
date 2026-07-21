import type {
  DomNode,
  DomSnapshot,
  FormField,
  FormSummary,
  InteractiveElement,
  PageContext,
  ProposedAction,
  TableSummary
} from "../types";

// A form control is off-limits to the agent if it looks like a credential or payment field.
// Kept as a plain string so it can be re-declared verbatim inside injected functions.
const SENSITIVE_FIELD_PATTERN =
  "pass|card|cc-|ccnum|cvv|cvc|ssn|social-security|routing|iban|sort-code|account-number|accountnumber|pin";

function extractPageContext(sensitivePattern: string): PageContext {
  // executeScript serializes this function, so these bounds must live inside it.
  const maxTextLength = 12_000;
  const maxElements = 80;
  const sensitive = new RegExp(sensitivePattern, "i");
  const selectorFor = (element: Element): string => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const tag = element.tagName.toLowerCase();
    const name = element.getAttribute("name");
    return name ? `${tag}[name="${CSS.escape(name)}"]` : tag;
  };
  const textOf = (element: Element, limit = 240): string =>
    (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
  const buildNode = (element: Element, depth: number): DomNode => {
    const htmlElement = element as HTMLElement;
    const children =
      depth >= 4
        ? []
        : Array.from(htmlElement.children)
            .filter((child) => (child as HTMLElement).offsetParent !== null)
            .slice(0, 20)
            .map((child) => buildNode(child, depth + 1));
    return {
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      name: element.getAttribute("aria-label") ?? element.getAttribute("name"),
      selector: selectorFor(element),
      text: textOf(element),
      children
    };
  };
  const landmarks = Array.from(
    document.querySelectorAll("header,nav,main,aside,footer,section,[role]")
  )
    .map((element) => element.getAttribute("role") ?? element.tagName.toLowerCase())
    .filter((role, index, roles) => roles.indexOf(role) === index)
    .slice(0, 30);
  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .map((heading) => textOf(heading, 200))
    .filter(Boolean)
    .slice(0, 100);
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>("form"))
    .slice(0, 30)
    .map<FormSummary>((form) => ({
      selector: selectorFor(form),
      action: form.action,
      method: (form.method || "get").toLowerCase(),
      fields: Array.from(form.querySelectorAll("input,select,textarea"))
        .map(
          (field) =>
            field.getAttribute("name") ??
            field.getAttribute("aria-label") ??
            field.tagName.toLowerCase()
        )
        .slice(0, 40)
    }));
  const tables = Array.from(document.querySelectorAll<HTMLTableElement>("table"))
    .slice(0, 30)
    .map<TableSummary>((table) => ({
      selector: selectorFor(table),
      caption: textOf(table.querySelector("caption") ?? table, 240),
      headers: Array.from(table.querySelectorAll("thead th, tr:first-child th"))
        .map((header) => textOf(header, 120))
        .filter(Boolean)
        .slice(0, 30),
      rowCount: Math.max(0, table.rows.length - (table.tHead ? table.tHead.rows.length : 0))
    }));
  const dom: DomSnapshot = {
    landmarks,
    headings,
    forms,
    tables,
    tree: Array.from(document.body?.children ?? [])
      .filter((element) => (element as HTMLElement).offsetParent !== null)
      .slice(0, 20)
      .map((element) => buildNode(element, 0))
  };
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      "a,button,input,select,textarea,[role='button'],[role='link']"
    )
  )
    .filter((element) => element.offsetParent !== null)
    .slice(0, maxElements)
    .map<InteractiveElement>((element) => ({
      role: element.getAttribute("role") ?? element.tagName.toLowerCase(),
      label:
        element.getAttribute("aria-label") ??
        (element as HTMLInputElement).placeholder ??
        element.innerText?.trim().slice(0, 160) ??
        "",
      selector: selectorFor(element),
      disabled: (element as HTMLButtonElement).disabled ?? false
    }));

  // Fillable form controls, with a resolved human label. Password/payment fields are
  // excluded outright so the agent never sees or proposes to touch them.
  const excludedTypes = new Set(["hidden", "submit", "button", "reset", "image", "file"]);
  const labelFor = (element: HTMLElement): string => {
    if (element.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (explicit?.textContent)
        return explicit.textContent.replace(/\s+/g, " ").trim().slice(0, 200);
    }
    const wrapping = element.closest("label");
    if (wrapping?.textContent)
      return wrapping.textContent.replace(/\s+/g, " ").trim().slice(0, 200);
    const aria = element.getAttribute("aria-label");
    if (aria) return aria.slice(0, 200);
    const labelledby = element.getAttribute("aria-labelledby");
    if (labelledby) {
      const ref = document.getElementById(labelledby);
      if (ref?.textContent) return ref.textContent.replace(/\s+/g, " ").trim().slice(0, 200);
    }
    const placeholder = (element as HTMLInputElement).placeholder;
    if (placeholder) return placeholder.slice(0, 200);
    return element.getAttribute("name") ?? "";
  };
  const formFields = Array.from(document.querySelectorAll<HTMLElement>("input,select,textarea"))
    .filter((element) => {
      if (element.offsetParent === null) return false;
      const input = element as HTMLInputElement;
      const type = (input.type || "").toLowerCase();
      if (excludedTypes.has(type)) return false;
      if (input.disabled || input.readOnly) return false;
      const haystack = `${input.name} ${input.id} ${input.getAttribute("autocomplete") ?? ""} ${labelFor(element)}`;
      if (sensitive.test(haystack)) return false;
      return true;
    })
    .slice(0, 60)
    .map<FormField>((element, index) => ({
      index,
      selector: selectorFor(element),
      label: labelFor(element),
      type: (element as HTMLInputElement).type || element.tagName.toLowerCase(),
      required: (element as HTMLInputElement).required ?? false
    }));

  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, maxTextLength),
    selectedText: window.getSelection()?.toString().slice(0, 4_000) ?? "",
    interactiveElements: elements,
    formFields,
    dom
  };
}

// Injected into the page to apply approved fills. Structured data only - never runs
// model-authored code, never clicks, never submits. Re-derives the same ordered field
// list as the extractor so an action's index resolves to the same control.
function applyFillActions(actions: ProposedAction[], sensitivePattern: string): number {
  const sensitive = new RegExp(sensitivePattern, "i");
  const excludedTypes = new Set([
    "hidden",
    "submit",
    "button",
    "reset",
    "image",
    "file",
    "password"
  ]);
  const isFillable = (element: Element | null): element is HTMLElement => {
    if (!element) return false;
    const input = element as HTMLInputElement;
    const type = (input.type || "").toLowerCase();
    if (excludedTypes.has(type)) return false;
    if (input.disabled || input.readOnly) return false;
    const haystack = `${input.name} ${input.id} ${input.getAttribute("autocomplete") ?? ""}`;
    return !sensitive.test(haystack);
  };
  const orderedFields = Array.from(
    document.querySelectorAll<HTMLElement>("input,select,textarea")
  ).filter((element) => element.offsetParent !== null && isFillable(element));

  const setValue = (element: HTMLElement, value: string): void => {
    const input = element as HTMLInputElement;
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();
  };

  let filled = 0;
  for (const action of actions) {
    let target: HTMLElement | null = null;
    if (action.selector) {
      const found = document.querySelector(action.selector);
      if (isFillable(found)) target = found;
    }
    if (!target && typeof action.index === "number") {
      const candidate = orderedFields[action.index];
      if (isFillable(candidate)) target = candidate;
    }
    if (target) {
      setValue(target, action.value);
      filled += 1;
    }
  }
  return filled;
}

async function currentPageContext(): Promise<PageContext> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab is available.");
  let result: PageContext | undefined;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContext,
      args: [SENSITIVE_FIELD_PATTERN]
    });
  } catch {
    throw new Error(
      "OpenAgent can't read this page. Restricted pages - chrome:// settings, the Chrome Web Store, PDFs, and the new-tab page - are never readable by any extension. Open a regular website and try again."
    );
  }
  if (!result) throw new Error("Unable to extract the active page.");
  return result;
}

async function applyActions(actions: ProposedAction[]): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab is available.");
  let result: number | undefined;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: applyFillActions,
      args: [actions, SENSITIVE_FIELD_PATTERN]
    });
  } catch {
    throw new Error("OpenAgent can't fill fields on this page.");
  }
  return result ?? 0;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  chrome.contextMenus.create({
    id: "openagent-explain",
    title: "Ask OpenAgent about this",
    contexts: ["selection", "page"]
  });
});

chrome.contextMenus.onClicked.addListener(async () => {
  const window = await chrome.windows.getCurrent();
  if (window.id) await chrome.sidePanel.open({ windowId: window.id });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-side-panel") return;
  const window = await chrome.windows.getCurrent();
  if (window.id) await chrome.sidePanel.open({ windowId: window.id });
});

chrome.runtime.onMessage.addListener((message: { type: string; actions?: ProposedAction[] }) => {
  if (message.type === "GET_PAGE_CONTEXT") return currentPageContext();
  if (message.type === "APPLY_ACTIONS") return applyActions(message.actions ?? []);
  return undefined;
});
