
// export interface ChatMessage {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: string;
// }

// export async function sendChatMessage(
//   disease: string,
//   message: string
// ): Promise<ChatMessage> {
//   try {
//     const res = await fetch(
//       "https://smart-teeth-care.runasp.net/api/AiService/chat",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           disease: disease,
//           user_Message: message,
//         }),
//       }
//     );

//     if (!res.ok) {
//       throw new Error("Chat failed");
//     }

//     const data = await res.json();

//     return {
//       id: `msg-${Date.now()}`,
//       role: "assistant",
//       content: data.message || "No response from AI",
//       timestamp: new Date().toISOString(),
//     };
//   } catch {
//     return {
//       id: `error-${Date.now()}`,
//       role: "assistant",
//       content: "❌ Unable to connect to AI service",
//       timestamp: new Date().toISOString(),
//     };
//   }
// }

// export function getWelcomeMessage(disease: string): ChatMessage {
//   return {
//     id: "welcome",
//     role: "assistant",
//     content: `👋 Analysis Result: ${disease}

// You can now ask any question about this condition.`,
//     timestamp: new Date().toISOString(),
//   };
// }














// export interface ChatMessage {
//   id: string;
//   role: "user" | "assistant";
//   content: string;
//   timestamp: string;
// }

// export async function sendChatMessage(
//   disease: string,
//   message: string,
//   sessionId: string
// ): Promise<ChatMessage> {
//   try {
//     const res = await fetch(
//       "https://smart-teeth-care.runasp.net/api/AiService/chat",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           disease: disease,
//           userMessage: message,
//           session_id: sessionId,
//         }),
//       }
//     );

//     if (!res.ok) {
//       throw new Error("Chat failed");
//     }

//     const data = await res.json();

//     return {
//       id: `msg-${Date.now()}`,
//       role: "assistant",
//       content: data.message || data.reply || "No response from AI",
//       timestamp: new Date().toISOString(),
//     };
//   } catch {
//     return {
//       id: `error-${Date.now()}`,
//       role: "assistant",
//       content: "❌ Unable to connect to AI service",
//       timestamp: new Date().toISOString(),
//     };
//   }
// }

// export function getWelcomeMessage(disease: string): ChatMessage {
//   return {
//     id: "welcome",
//     role: "assistant",
//     content: `👋 Analysis Result: ${disease}

// You can now ask any question about this condition.`,
//     timestamp: new Date().toISOString(),
//   };
// }












export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export async function sendChatMessage(
  disease: string,
  message: string,
  sessionId: string
): Promise<ChatMessage> {
  const res = await fetch(
    "https://smart-teeth-care.runasp.net/api/AiService/chat",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        disease,
        user_message: message,
        session_id: sessionId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Chat failed");
  }

  const data = await res.json();

  return {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: data.bot_Response,
    timestamp: new Date().toISOString(),
  };
}

export function getWelcomeMessage(disease: string): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: `👋 Analysis Result: ${disease}

You can now ask any question about this condition.`,
    timestamp: new Date().toISOString(),
  };
}