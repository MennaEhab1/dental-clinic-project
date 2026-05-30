






// export interface ChatMessage {
//   id: string;
//   role: 'user' | 'assistant';
//   content: string;
//   timestamp: string;
// }

// export async function sendChatMessage(message: string): Promise<ChatMessage> {
//   try {
//     const res = await fetch(
//       "https://smart-teeth-care.runasp.net/api/AiService/chat",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           question: message, // ✅ أهم تعديل هنا
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
//       content:
//         data.response ||
//         data.answer ||
//         data.message ||
//         "No response from AI",
//       timestamp: new Date().toISOString(),
//     };
//   } catch (error) {
//     return {
//       id: `error-${Date.now()}`,
//       role: "assistant",
//       content: "❌ Unable to connect to AI service",
//       timestamp: new Date().toISOString(),
//     };
//   }
// }

// export function getWelcomeMessage(): ChatMessage {
//   return {
//     id: "welcome",
//     role: "assistant",
//     content: "👋 Welcome to Dental AI Assistant! How can I help you today?",
//     timestamp: new Date().toISOString(),
//   };
// }










export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function sendChatMessage(
  disease: string,
  message: string
): Promise<ChatMessage> {
  try {
    const res = await fetch(
      "https://smart-teeth-care.runasp.net/api/AiService/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          disease: disease,
          user_Message: message,
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
      content: data.message || "No response from AI",
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      id: `error-${Date.now()}`,
      role: "assistant",
      content: "❌ Unable to connect to AI service",
      timestamp: new Date().toISOString(),
    };
  }
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