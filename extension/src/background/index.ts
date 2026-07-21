import type {
  DomNode,
  DomSnapshot,
  FormSummary,
  InteractiveElement,
  PageContext,
  TableSummary
} from "../types";

function extractPageContext(): PageContext {
  // executeScript serializes this function, so these bounds must live inside it.
  const maxTextLength = 12_000;
  const maxElements = 80;
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

  return {
    url: location.href,
    title: document.title,
    text: (document.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, maxTextLength),
    selectedText: window.getSelection()?.toString().slice(0, 4_000) ?? "",
    interactiveElements: elements,
    dom
  };
}

async function currentPageContext(): Promise<PageContext> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab is available.");
  let result: PageContext | undefined;
  try {
    [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContext
    });
  } catch {
    throw new Error(
      "OpenAgent can't read this page. Restricted pages - chrome:// settings, the Chrome Web Store, PDFs, and the new-tab page - are never readable by any extension. Open a regular website and try again."
    );
  }
  if (!result) throw new Error("Unable to extract the active page.");
  return result;
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

chrome.runtime.onMessage.addListener((message: { type: string }) => {
  if (message.type === "GET_PAGE_CONTEXT") return currentPageContext();
  return undefined;
});
