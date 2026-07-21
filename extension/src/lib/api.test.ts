import { afterEach, describe, expect, it, vi } from "vitest";

import { askAgent } from "./api";

const page = {
  url: "https://example.com/",
  title: "Example",
  text: "Example text",
  selectedText: "",
  interactiveElements: [],
  formFields: [],
  dom: { landmarks: [], headings: [], forms: [], tables: [], tree: [] }
};

afterEach(() => vi.unstubAllGlobals());

describe("askAgent", () => {
  it("sends bounded page context to the local gateway", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ready", toolHints: ["browser.get_current_page"] })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(askAgent("http://127.0.0.1:8000", "Summarize", page, null, [])).resolves.toEqual({
      message: "ready",
      toolHints: ["browser.get_current_page"]
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/v1/chat",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects a non-success gateway response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(askAgent("http://127.0.0.1:8000", "Summarize", page, null, [])).rejects.toThrow(
      "503"
    );
  });

  it("attaches the BYOK provider config to the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ready", toolHints: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    await askAgent(
      "http://127.0.0.1:8000",
      "Summarize",
      page,
      {
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: "sk-secret",
        model: "llama-3.3-70b-versatile"
      },
      []
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.provider).toEqual({
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: "sk-secret",
      model: "llama-3.3-70b-versatile"
    });
  });

  it("sends the saved profile only when the page has form fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok", toolHints: [] })
    });
    vi.stubGlobal("fetch", fetchMock);
    const profile = [{ label: "Full name", value: "Ada" }];

    // No form fields on this page -> profile withheld.
    await askAgent("http://127.0.0.1:8000", "hi", page, null, profile);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).profile).toBeUndefined();

    // Page with a form field -> profile included.
    const formPage = {
      ...page,
      formFields: [{ index: 0, selector: "#n", label: "Name", type: "text", required: false }]
    };
    await askAgent("http://127.0.0.1:8000", "fill it", formPage, null, profile);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string).profile).toEqual(profile);
  });
});
