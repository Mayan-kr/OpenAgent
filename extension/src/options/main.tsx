import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  clearProviderConfig,
  getBackendUrl,
  getProviderConfig,
  setBackendUrl,
  setProviderConfig
} from "../lib/chrome";
import "../sidepanel/styles.css";

const PROVIDER_PRESETS: { name: string; baseUrl: string }[] = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { name: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  { name: "Fireworks AI", baseUrl: "https://api.fireworks.ai/inference/v1" },
  { name: "Ollama (local)", baseUrl: "http://127.0.0.1:11434/v1" },
  { name: "Custom", baseUrl: "" }
];

function Options() {
  const [backendUrl, setUrl] = useState("http://127.0.0.1:8000");
  const [preset, setPreset] = useState(PROVIDER_PRESETS[0].name);
  const [providerBaseUrl, setProviderBaseUrl] = useState(PROVIDER_PRESETS[0].baseUrl);
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getBackendUrl().then(setUrl);
    void getProviderConfig().then((config) => {
      if (!config) return;
      const match = PROVIDER_PRESETS.find((entry) => entry.baseUrl === config.baseUrl);
      setPreset(match ? match.name : "Custom");
      setProviderBaseUrl(config.baseUrl);
      setModel(config.model);
      setApiKey(config.apiKey);
    });
  }, []);

  const applyPreset = (name: string) => {
    setPreset(name);
    const match = PROVIDER_PRESETS.find((entry) => entry.name === name);
    if (match?.baseUrl) setProviderBaseUrl(match.baseUrl);
  };

  const save = async () => {
    await setBackendUrl(backendUrl);
    if (providerBaseUrl && model && apiKey) {
      await setProviderConfig({ baseUrl: providerBaseUrl, model, apiKey });
    } else {
      await clearProviderConfig();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <main>
      <header>
        <strong>OpenAgent settings</strong>
      </header>
      <label>
        Backend URL
        <input value={backendUrl} onChange={(event) => setUrl(event.target.value)} />
      </label>

      <h2>Model provider</h2>
      <p className="notice">
        Bring your own API key for any OpenAI-compatible endpoint. It is stored only in this
        browser&apos;s local extension storage and sent directly to your backend with each message -
        never synced, never saved server-side. Leave the key blank to fall back to the
        backend&apos;s own configured provider.
      </p>
      <label>
        Provider
        <select value={preset} onChange={(event) => applyPreset(event.target.value)}>
          {PROVIDER_PRESETS.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Base URL
        <input
          value={providerBaseUrl}
          onChange={(event) => setProviderBaseUrl(event.target.value)}
          placeholder="https://api.example.com/v1"
        />
      </label>
      <label>
        Model
        <input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="llama-3.3-70b-versatile"
        />
      </label>
      <label>
        API key
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
      </label>

      <button onClick={() => void save()}>Save</button>
      {saved && <span className="status">Saved</span>}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Options />);
