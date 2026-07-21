import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  clearProviderConfig,
  getBackendUrl,
  getProfile,
  getProviderConfig,
  setBackendUrl,
  setProfile,
  setProviderConfig
} from "../lib/chrome";
import type { ProfileField } from "../types";
import "../sidepanel/styles.css";

const PROVIDER_PRESETS: { name: string; baseUrl: string; defaultModel: string }[] = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
  {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile"
  },
  {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct"
  },
  {
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo"
  },
  {
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct"
  },
  { name: "Ollama (local)", baseUrl: "http://127.0.0.1:11434/v1", defaultModel: "llama3.2" },
  { name: "Custom", baseUrl: "", defaultModel: "" }
];

function Options() {
  const [backendUrl, setUrl] = useState("http://127.0.0.1:8000");
  const [preset, setPreset] = useState(PROVIDER_PRESETS[0].name);
  const [providerBaseUrl, setProviderBaseUrl] = useState(PROVIDER_PRESETS[0].baseUrl);
  const [model, setModel] = useState(PROVIDER_PRESETS[0].defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [profile, setProfileState] = useState<ProfileField[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
    void getProfile().then(setProfileState);
  }, []);

  const updateProfileField = (index: number, key: "label" | "value", next: string) =>
    setProfileState((current) =>
      current.map((field, i) => (i === index ? { ...field, [key]: next } : field))
    );
  const addProfileField = () =>
    setProfileState((current) => [...current, { label: "", value: "" }]);
  const removeProfileField = (index: number) =>
    setProfileState((current) => current.filter((_, i) => i !== index));

  const applyPreset = (name: string) => {
    setPreset(name);
    const match = PROVIDER_PRESETS.find((entry) => entry.name === name);
    if (!match) return;
    if (match.baseUrl) setProviderBaseUrl(match.baseUrl);
    // Prefill a real, editable model value so it is never accidentally left empty.
    if (match.defaultModel) setModel(match.defaultModel);
  };

  const save = async () => {
    setError("");
    setStatus("");
    await setBackendUrl(backendUrl);
    // Persist the profile in every branch (drop rows left without a label).
    await setProfile(
      profile
        .filter((field) => field.label.trim())
        .map((field) => ({ label: field.label.trim(), value: field.value }))
    );

    const key = apiKey.trim();
    const url = providerBaseUrl.trim();
    const modelName = model.trim();

    // Empty key is an explicit choice: fall back to the backend's built-in provider.
    if (!key) {
      await clearProviderConfig();
      setStatus("Saved. No key set - using the backend's built-in provider.");
      return;
    }
    // Key present but something else is missing: tell the user instead of silently
    // wiping the config (the old behaviour, which is why keys "disappeared").
    if (!url || !modelName) {
      setError("Enter a base URL and a model, or clear the API key to use the backend default.");
      return;
    }
    await setProviderConfig({ baseUrl: url, model: modelName, apiKey: key });
    setStatus(`Saved. Using ${modelName}.`);
  };

  return (
    <main className="settings">
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

      <h2>Your information</h2>
      <p className="notice">
        Values OpenAgent can use to fill matching form fields (always with your approval). Stored
        only in this browser, and sent to the model only on pages that have a form. Add anything —
        e.g. Full name, Email, Phone, Address, LinkedIn URL.
      </p>
      {profile.map((field, index) => (
        <div className="profile-row" key={index}>
          <input
            className="profile-label"
            value={field.label}
            onChange={(event) => updateProfileField(index, "label", event.target.value)}
            placeholder="Field (e.g. Email)"
          />
          <input
            className="profile-value"
            value={field.value}
            onChange={(event) => updateProfileField(index, "value", event.target.value)}
            placeholder="Value"
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => removeProfileField(index)}
            aria-label="Remove field"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="add-field-btn" onClick={addProfileField}>
        + Add field
      </button>

      <button onClick={() => void save()}>Save</button>
      {status && <span className="status">{status}</span>}
      {error && <span className="error">{error}</span>}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Options />);
