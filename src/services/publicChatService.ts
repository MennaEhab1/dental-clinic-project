export interface PublicChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SESSION_ID = `session-${Date.now()}`;

export async function sendPublicChatMessage(
  message: string
): Promise<PublicChatMessage> {
  try {
    const res = await fetch(
      "https://smart-teeth-care.runasp.net/api/PublicChat/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          session_id: SESSION_ID,
        }),
      }
    );

    if (!res.ok) {
      throw new Error("Public chat failed");
    }

    const data = await res.json();

    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content:
        data.reply ||
        data.response ||
        data.answer ||
        "No response from AI",
    };
  } catch {
    return {
      id: `error-${Date.now()}`,
      role: "assistant",
      content: "❌ Unable to connect to AI service",
    };
  }
}