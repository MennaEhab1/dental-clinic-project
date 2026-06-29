






// import { useState, useRef, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { MessageCircle, X, Send } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { sendChatMessage, getWelcomeMessage, type ChatMessage } from '@/services/aiChatService';

// interface AIChatWidgetProps {
//   disease: string;
//   isOpen?: boolean;
//   onClose?: () => void;
// }

// export function AIChatWidget({ disease, isOpen: externalOpen = false, onClose }: AIChatWidgetProps) {
//   const [isOpen, setIsOpen] = useState(externalOpen);
//   const [messages, setMessages] = useState<ChatMessage[]>([
//     getWelcomeMessage(disease),
//   ]);
//   const [input, setInput] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   useEffect(() => {
//     setIsOpen(externalOpen);
//   }, [externalOpen]);

//   const scrollToBottom = useCallback(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, []);

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isTyping, scrollToBottom]);

//   useEffect(() => {
//     if (isOpen) inputRef.current?.focus();
//   }, [isOpen]);

//   const handleClose = useCallback(() => {
//     setIsOpen(false);
//     onClose?.();
//   }, [onClose]);

//   const handleSend = useCallback(async () => {
//     const text = input.trim();
//     if (!text || isTyping) return;

//     const userMsg: ChatMessage = {
//       id: `user-${Date.now()}`,
//       role: 'user',
//       content: text,
//       timestamp: new Date().toISOString(),
//     };

//     setMessages(prev => [...prev, userMsg]);
//     setInput('');
//     setIsTyping(true);

//     try {
//       const response = await sendChatMessage(disease, text);
//       setMessages(prev => [...prev, response]);
//     } catch {
//       setMessages(prev => [
//         ...prev,
//         {
//           id: `error-${Date.now()}`,
//           role: 'assistant',
//           content: "❌ Unable to connect to AI service",
//           timestamp: new Date().toISOString(),
//         },
//       ]);
//     } finally {
//       setIsTyping(false);
//     }
//   }, [input, isTyping, disease]);

//   const renderContent = (content: string) => {
//     return content.split('\n').map((line, i) => (
//       <span key={i}>
//         {i > 0 && <br />}
//         {line}
//       </span>
//     ));
//   };

//   return (
//     <>
//       {/* Floating Button */}
//       <AnimatePresence>
//         {!isOpen && (
//           <motion.div
//             initial={{ scale: 0, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             exit={{ scale: 0, opacity: 0 }}
//             className="fixed bottom-6 right-6 z-[9999]"
//           >
//             <Button
//               onClick={() => setIsOpen(true)}
//               className="h-14 w-14 rounded-full bg-blue-600 text-white"
//               size="icon"
//             >
//               <MessageCircle className="w-6 h-6" />
//             </Button>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Chat Panel */}
//       <AnimatePresence>
//         {isOpen && (
//           <motion.div
//             initial={{ opacity: 0, y: 20, scale: 0.95 }}
//             animate={{ opacity: 1, y: 0, scale: 1 }}
//             exit={{ opacity: 0, y: 20, scale: 0.95 }}
//             className="fixed bottom-6 right-6 z-[9999] w-[360px] h-[520px] flex flex-col rounded-2xl border bg-white shadow-lg"
//           >
//             {/* Header */}
//             <div className="bg-blue-600 px-4 py-3 flex justify-between items-center rounded-t-2xl">
//               <span className="text-white font-semibold">AI Assistant</span>
//               <Button size="icon" variant="ghost" onClick={handleClose}>
//                 <X className="w-4 h-4 text-white" />
//               </Button>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-3">
//               {messages.map((msg) => (
//                 <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
//                   <div
//                     className={`inline-block px-3 py-2 rounded-xl text-sm ${
//                       msg.role === 'user'
//                         ? 'bg-blue-600 text-white'
//                         : 'bg-gray-100 text-black'
//                     }`}
//                   >
//                     {renderContent(msg.content)}
//                   </div>
//                 </div>
//               ))}

//               {isTyping && (
//                 <p className="text-sm text-gray-500">Typing...</p>
//               )}

//               <div ref={messagesEndRef} />
//             </div>

//             {/* Input */}
//             <form
//               onSubmit={(e) => {
//                 e.preventDefault();
//                 handleSend();
//               }}
//               className="p-3 flex gap-2 border-t"
//             >
//               <input
//                 ref={inputRef}
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 placeholder="Ask about your condition..."
//                 className="flex-1 h-10 px-4 rounded-xl bg-white border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
//               />
//               <Button type="submit" className="bg-blue-600 text-white">
//                 <Send className="w-4 h-4" />
//               </Button>
//             </form>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </>
//   );
// }








import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendChatMessage, getWelcomeMessage, type ChatMessage } from '@/services/aiChatService';

interface AIChatWidgetProps {
  disease: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AIChatWidget({ disease, isOpen: externalOpen = false, onClose }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(externalOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([
    getWelcomeMessage(disease),
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendChatMessage(disease, text);
      setMessages(prev => [...prev, response]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "❌ Unable to connect to AI service",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, disease]);

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {i > 0 && <br />}
        {line}
      </span>
    ));
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[9999]"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-blue-600 text-white"
              size="icon"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] w-[360px] h-[520px] flex flex-col rounded-2xl border bg-white shadow-lg"
          >
            {/* Header */}
            <div className="bg-blue-600 px-4 py-3 flex justify-between items-center rounded-t-2xl">
              <span className="text-white font-semibold">AI Assistant</span>
              <Button size="icon" variant="ghost" onClick={handleClose}>
                <X className="w-4 h-4 text-white" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
                  <div
                    className={`inline-block px-3 py-2 rounded-xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-black'
                    }`}
                  >
                    {renderContent(msg.content)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <p className="text-sm text-gray-500">Typing...</p>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 flex gap-2 border-t"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your condition..."
                className="flex-1 h-10 px-4 rounded-xl bg-white border border-gray-300 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Button type="submit" className="bg-blue-600 text-white">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}