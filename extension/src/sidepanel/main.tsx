import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { askAgent } from "../lib/api";
import { getBackendUrl, getPageContext, getProviderConfig, openOptionsPage } from "../lib/chrome";
import "./styles.css";

type Message = { role: "user" | "agent"; content: string };

function SidePanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", content: "Hi! Ask me anything about the page you're viewing." }
  ]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [modelLabel, setModelLabel] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getBackendUrl(), getProviderConfig()])
      .then(async ([url, provider]) => {
        const response = await fetch(`${url}/health`);
        setOnline(response.ok);
        setModelLabel(provider ? provider.model : "no API key set");
      })
      .catch(() => {
        setOnline(false);
        setModelLabel("");
      });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

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

  const statusText = online === null ? "Connecting…" : online ? "Online" : "Backend unavailable";
  const dotClass = online === null ? "dot connecting" : online ? "dot online" : "dot offline";

  return (
    <main>
      <header>
        <div className="brand">
          <span className="logo">O</span>
          <div className="brand-text">
            <strong>OpenAgent</strong>
            <span className="status">
              <span className={dotClass} />
              {statusText}
              {modelLabel && <span className="model"> · {modelLabel}</span>}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => void openOptionsPage()}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <section className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <div className={`row ${message.role}`} key={index}>
            {message.role === "agent" && <span className="avatar">O</span>}
            <article className={`bubble ${message.role}`}>{message.content}</article>
          </div>
        ))}
        {sending && (
          <div className="row agent">
            <span className="avatar">O</span>
            <article className="bubble agent typing" aria-label="OpenAgent is thinking">
              <span className="dot-typing" />
              <span className="dot-typing" />
              <span className="dot-typing" />
            </article>
          </div>
        )}
        <div ref={endRef} />
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Ask about this page…"
          aria-label="Message OpenAgent"
          rows={2}
        />
        <button disabled={sending || !input.trim()} type="submit">
          {sending ? "…" : "Send"}
        </button>
      </form>
      <p className="notice">
        Read-only — OpenAgent can see this page but never clicks or types. Enter to send,
        Shift+Enter for a new line.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
