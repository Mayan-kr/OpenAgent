import type { PageContext, ProposedAction, ProviderConfig } from "../types";

type ChatResponse = { message: string; toolHints: string[]; actions?: ProposedAction[] };

export async function askAgent(
  backendUrl: string,
  message: string,
  page: PageContext,
  provider: ProviderConfig | null
): Promise<ChatResponse> {
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
        : {})
    })
  });
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`);
  return (await response.json()) as ChatResponse;
}
