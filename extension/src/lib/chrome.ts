import type { PageContext, ProviderConfig } from "../types";

export const getPageContext = (): Promise<PageContext> =>
  chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }) as Promise<PageContext>;

export const getBackendUrl = async (): Promise<string> => {
  const { backendUrl } = await chrome.storage.local.get("backendUrl");
  return (backendUrl as string | undefined) ?? "http://127.0.0.1:8000";
};

export const setBackendUrl = (backendUrl: string): Promise<void> =>
  chrome.storage.local.set({ backendUrl });

// Device-local only (chrome.storage.local, never .sync) so a BYOK API key never
// leaves this browser profile except in the one chat request it authorizes.
export const getProviderConfig = async (): Promise<ProviderConfig | null> => {
  const { providerConfig } = await chrome.storage.local.get("providerConfig");
  return (providerConfig as ProviderConfig | undefined) ?? null;
};

export const setProviderConfig = (providerConfig: ProviderConfig): Promise<void> =>
  chrome.storage.local.set({ providerConfig });

export const clearProviderConfig = (): Promise<void> =>
  chrome.storage.local.remove("providerConfig");
