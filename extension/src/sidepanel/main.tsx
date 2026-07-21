import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { askAgent } from "../lib/api";
import {
  applyActions,
  clearConversation,
  getBackendUrl,
  getConversation,
  getPageContext,
  getProfile,
  getProviderConfig,
  openOptionsPage,
  setConversation
} from "../lib/chrome";
import type { ChatMessage, ProposedAction } from "../types";
import "./styles.css";

const GREETING: ChatMessage = {
  role: "agent",
  content: "Hi! Ask me anything about the page you're viewing."
};

function ActionCard({ actions }: { actions: ProposedAction[] }) {
  const [selected, setSelected] = useState<boolean[]>(actions.map(() => true));
  const [applied, setApplied] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (applied !== null) {
    return (
      <div className="action-card done">
        Filled {applied} field{applied === 1 ? "" : "s"}. Review the form and submit it yourself.
      </div>
    );
  }

  const chosenCount = selected.filter(Boolean).length;
  const apply = async () => {
    setBusy(true);
    try {
      setApplied(await applyActions(actions.filter((_, index) => selected[index])));
    } catch {
      setApplied(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="action-card">
      <div className="action-title">Proposed fills — review before applying</div>
      <ul className="action-list">
        {actions.map((action, index) => (
          <li key={index}>
            <label className="action-item">
              <input
                type="checkbox"
                checked={selected[index]}
                onChange={() =>
                  setSelected((current) => current.map((v, i) => (i === index ? !v : v)))
                }
              />
              <span className="action-field">{action.label || `Field ${action.index}`}</span>
              <span className="action-value">{action.value}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="apply-btn"
        disabled={busy || chosenCount === 0}
        onClick={() => void apply()}
      >
        {busy ? "Filling…" : `Apply ${chosenCount}`}
      </button>
      <p className="action-note">OpenAgent never submits the form — you press Submit yourself.</p>
    </div>
  );
}

function SidePanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [online, setOnline] = useState<boolean | null>(null);
  const [modelLabel, setModelLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
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

  // Restore any saved conversation on open before we start persisting new ones.
  useEffect(() => {
    void getConversation().then((stored) => {
      if (stored && stored.length) setMessages(stored);
      setLoaded(true);
    });
  }, []);

  // Persist the conversation (capped) once the initial restore has run.
  useEffect(() => {
    if (loaded) void setConversation(messages.slice(-200));
  }, [messages, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const newChat = async () => {
    await clearConversation();
    setMessages([GREETING]);
    setInput("");
  };

  const submit = async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setSending(true);
    setInput("");
    setMessages((current) => [...current, { role: "user", content: prompt }]);
    try {
      const [backendUrl, page, provider, profile] = await Promise.all([
        getBackendUrl(),
        getPageContext(),
        getProviderConfig(),
        getProfile()
      ]);
      const response = await askAgent(backendUrl, prompt, page, provider, profile);
      setMessages((current) => [
        ...current,
        { role: "agent", content: response.message, actions: response.actions }
      ]);
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
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => void newChat()}
            aria-label="New chat"
            title="New chat"
          >
            ✚
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void openOptionsPage()}
            aria-label="Open settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index}>
            <div className={`row ${message.role}`}>
              {message.role === "agent" && <span className="avatar">O</span>}
              <article className={`bubble ${message.role}`}>{message.content}</article>
            </div>
            {message.role === "agent" && message.actions && message.actions.length > 0 && (
              <ActionCard actions={message.actions} />
            )}
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
        OpenAgent reads this page and can fill fields only after you approve — it never submits.
        Enter to send, Shift+Enter for a new line.
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
