import type { PageContext, ProfileField, ProposedAction, ProviderConfig } from "../types";

type ChatResponse = { message: string; toolHints: string[]; actions?: ProposedAction[] };

export async function askAgent(
  backendUrl: string,
  message: string,
  page: PageContext,
  provider: ProviderConfig | null,
  profile: ProfileField[]
): Promise<ChatResponse> {
  // Only send saved info when the page actually has a form to fill, so ordinary
  // browsing questions never ship personal data to the model.
  const includeProfile = profile.length > 0 && page.formFields.length > 0;
  const response = await fetch(`${backendUrl}/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      page,
      ...(provider
        ? {
            provider: { baseUrl: provider.baseUrl, apiKey: provider.apiKey, model: provider.model }
          }
        : {}),
      ...(includeProfile ? { profile } : {})
    })
  });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return (await response.json()) as ChatResponse;
}
