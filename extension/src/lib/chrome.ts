import type {
  ChatMessage,
  PageContext,
  ProfileField,
  ProposedAction,
  ProviderConfig
} from "../types";

export const getPageContext = (): Promise<PageContext> =>
  chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }) as Promise<PageContext>;

// Ask the background to apply approved fills to the active page. Returns the number of
// fields actually written.
export const applyActions = (actions: ProposedAction[]): Promise<number> =>
  chrome.runtime.sendMessage({ type: "APPLY_ACTIONS", actions }) as Promise<number>;

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

// The user's saved information (label -> value). Device-local only, and only sent to the
// model when the current page has a form to fill.
export const getProfile = async (): Promise<ProfileField[]> => {
  const { profile } = await chrome.storage.local.get("profile");
  return (profile as ProfileField[] | undefined) ?? [];
};

export const setProfile = (profile: ProfileField[]): Promise<void> =>
  chrome.storage.local.set({ profile });

export const openOptionsPage = (): Promise<void> => chrome.runtime.openOptionsPage();

// Conversation history persists in device-local storage so closing and reopening the
// side panel resumes the same chat instead of starting over.
export const getConversation = async (): Promise<ChatMessage[] | null> => {
  const { conversation } = await chrome.storage.local.get("conversation");
  return (conversation as ChatMessage[] | undefined) ?? null;
};

export const setConversation = (conversation: ChatMessage[]): Promise<void> =>
  chrome.storage.local.set({ conversation });

export const clearConversation = (): Promise<void> => chrome.storage.local.remove("conversation");
