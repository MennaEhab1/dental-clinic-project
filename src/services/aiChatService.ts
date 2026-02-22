/**
 * AI Chat Assistant Service (Mock)
 * 
 * Simulates a dental clinic AI customer support chatbot.
 * 
 * TODO: Replace with real AI API integration:
 * 1. Update sendMessage() to POST to your AI chat endpoint
 * 2. Handle streaming responses if using SSE/WebSocket
 * 3. Maintain conversation context via session ID
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface KeywordResponse {
  keywords: string[];
  response: string;
}

const keywordResponses: KeywordResponse[] = [
  {
    keywords: ['book', 'appointment', 'schedule', 'reserve'],
    response: "I'd be happy to help you book an appointment! 🗓️ You can book directly from your dashboard by clicking **Book Appointment**, or I can guide you through the process. Would you prefer a general check-up, cleaning, or a specific treatment?",
  },
  {
    keywords: ['cancel', 'reschedule', 'change appointment'],
    response: "To cancel or reschedule your appointment, please go to **My Appointments** in your dashboard. You can modify appointments up to 24 hours before the scheduled time. Would you like me to help with anything else?",
  },
  {
    keywords: ['hours', 'open', 'working', 'time', 'when'],
    response: "Our clinic is open:\n\n🕐 **Monday - Friday:** 8:00 AM – 6:00 PM\n🕐 **Saturday:** 9:00 AM – 3:00 PM\n🕐 **Sunday:** Closed\n\nEmergency services are available 24/7. Would you like to book an appointment?",
  },
  {
    keywords: ['emergency', 'urgent', 'pain', 'hurt', 'ache', 'swollen'],
    response: "I'm sorry to hear you're in discomfort! 😟 For dental emergencies, please call our emergency line at **+1-800-DENTAL-911** immediately. If you're experiencing severe pain, swelling, or bleeding, don't wait — seek care right away. Can I help you schedule an urgent appointment?",
  },
  {
    keywords: ['cost', 'price', 'fee', 'insurance', 'payment', 'how much'],
    response: "Our pricing varies by treatment. Here are some estimates:\n\n💰 **General Check-up:** $75 - $120\n💰 **Teeth Cleaning:** $90 - $150\n💰 **Filling:** $150 - $300\n💰 **Whitening:** $250 - $500\n\nWe accept most major insurance plans. Would you like more details on a specific treatment?",
  },
  {
    keywords: ['whitening', 'white', 'cosmetic', 'veneer', 'aesthetic'],
    response: "We offer several cosmetic dentistry options! ✨\n\n• **Professional Teeth Whitening** — In-office and take-home kits\n• **Porcelain Veneers** — Custom-made for a perfect smile\n• **Dental Bonding** — Quick fix for chips and gaps\n\nWould you like to book a cosmetic consultation?",
  },
  {
    keywords: ['doctor', 'dentist', 'specialist', 'who'],
    response: "Our team includes experienced specialists in:\n\n👨‍⚕️ **General Dentistry** — Dr. Sarah Chen\n👨‍⚕️ **Orthodontics** — Dr. Ahmed Hassan\n👨‍⚕️ **Cosmetic Dentistry** — Dr. Emily Rodriguez\n👨‍⚕️ **Oral Surgery** — Dr. Michael Park\n\nYou can view all our doctors on the **Doctors** page. Would you like to book with a specific doctor?",
  },
  {
    keywords: ['record', 'history', 'file', 'report', 'x-ray'],
    response: "You can access all your medical records from your dashboard under **Medical Records**. This includes:\n\n📋 Treatment history\n📋 X-rays and scans\n📋 Prescriptions\n📋 Diagnoses\n\nIs there a specific record you're looking for?",
  },
  {
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    response: "Hello! 👋 Welcome to DentalCare AI Assistant. I'm here to help with:\n\n• Booking appointments\n• Clinic information\n• Treatment questions\n• Insurance & pricing\n\nHow can I assist you today?",
  },
  {
    keywords: ['thank', 'thanks', 'appreciate'],
    response: "You're welcome! 😊 I'm glad I could help. If you have any other questions about our dental services, feel free to ask anytime. Wishing you a great smile! 🦷✨",
  },
];

const fallbackResponses = [
  "I appreciate your question! While I might not have the specific answer right now, our team would be happy to help. Would you like me to help you book an appointment to discuss this with a dentist?",
  "That's a great question! For detailed clinical information, I'd recommend speaking with one of our specialists. Would you like me to help you schedule a consultation?",
  "I want to make sure you get the most accurate answer. Let me suggest booking a quick consultation with one of our dentists who can provide personalized advice. Shall I help with that?",
];

/**
 * Sends a message and returns a mock AI response.
 * 
 * TODO: Replace with real AI API call:
 * const response = await fetch(`${API_BASE_URL}/ai/chat`, {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${getAuthToken()}`,
 *   },
 *   body: JSON.stringify({ message, conversationId }),
 * });
 * return response.json();
 */
export async function sendChatMessage(message: string): Promise<ChatMessage> {
  // Simulate AI thinking delay (1-2 seconds)
  const thinkingTime = 1000 + Math.random() * 1000;
  await new Promise(resolve => setTimeout(resolve, thinkingTime));

  const lowerMessage = message.toLowerCase();
  
  // Find matching keyword response
  const match = keywordResponses.find(kr =>
    kr.keywords.some(keyword => lowerMessage.includes(keyword))
  );

  const responseContent = match
    ? match.response
    : fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
  };
}

export function getWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome-msg',
    role: 'assistant',
    content: "Hello! 👋 I'm your DentalCare AI Assistant. I can help you with:\n\n• **Booking** appointments\n• **Clinic hours** & information\n• **Treatment** questions\n• **Insurance** & pricing\n\nHow can I help you today?",
    timestamp: new Date().toISOString(),
  };
}
