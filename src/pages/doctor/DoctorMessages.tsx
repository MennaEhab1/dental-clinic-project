import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ChatUI } from "@/components/dashboard/ChatUI";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { messageService } from "@/services/api";
import type { Conversation, Message } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function DoctorMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const currentUserId = user?.id || "doc-1";

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await messageService.getConversations(currentUserId);
        setConversations(response.data);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const response = await messageService.getMessages(
          selectedConversationId,
        );
        setMessages(response.data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedConversationId]);

  const handleSendMessage = async (content: string, receiverId: string) => {
    try {
      const response = await messageService.sendMessage({
        senderId: currentUserId,
        receiverId,
        content,
      });
      setMessages((prev) => [...prev, response.data]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout role="doctor">
        <LoadingCard />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Messages
          </h1>
          <p className="text-muted-foreground text-sm">
            Chat with your patients
          </p>
        </div>
        <ChatUI
          conversations={conversations}
          messages={messages}
          currentUserId={currentUserId}
          onSendMessage={handleSendMessage}
          onSelectConversation={setSelectedConversationId}
          selectedConversationId={selectedConversationId}
        />
      </div>
    </DashboardLayout>
  );
}
