import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { askAgent } from "../lib/api";
import { getBackendUrl, getPageContext, getProviderConfig, openOptionsPage } from "../lib/chrome";
import "./styles.css";

type Message = { role: "user" | "agent"; content: string };

function SidePanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "Ready to help with this page." }
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Connecting…");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([getBackendUrl(), getProviderConfig()])
      .then(async ([url, provider]) => {
        const response = await fetch(`${url}/health`);
        const backendStatus = response.ok ? "Local agent online" : "Backend unavailable";
        setStatus(
          provider ? `${backendStatus} · ${provider.model}` : `${backendStatus} · no API key set`
        );
      })
      .catch(() => setStatus("Backend unavailable"));
  }, []);

  const submit = async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setSending(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    try {
      const [backendUrl, page, provider] = await Promise.all([
        getBackendUrl(),
        getPageContext(),
        getProviderConfig()
      ]);
      const response = await askAgent(backendUrl, prompt, page, provider);
      setMessages((current) => [...current, { role: "agent", content: response.message }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          content: error instanceof Error ? error.message : "Unable to reach OpenAgent."
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <main>
      <header>
        <div className="header-left">
          <strong>OpenAgent</strong>
          <span className="status">{status}</span>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void openOptionsPage()}
          aria-label="Open settings"
          title="Open settings"
        >
          ⚙
        </button>
      </header>
      <section className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <article className={message.role} key={index}>
            {message.content}
          </article>
        ))}
      </section>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about this page"
          aria-label="Message OpenAgent"
        />
        <button disabled={sending} type="submit">
          {sending ? "Working…" : "Send"}
        </button>
      </form>
      <p className="notice">This milestone only exposes read-only page context through MCP.</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
