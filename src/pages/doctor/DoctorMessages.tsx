import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChatUI } from '@/components/dashboard/ChatUI';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { messageService } from '@/services/api';
import { mockMessages } from '@/services/mockData';
import type { Conversation, Message } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function DoctorMessages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const currentUserId = user?.id || 'doc-1';

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await messageService.getConversations(currentUserId);
        setConversations(response.data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
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
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (conversation) {
      const participants = conversation.participants;
      const convMessages = mockMessages.filter(m =>
        participants.includes(m.senderId) && participants.includes(m.receiverId)
      );
      setMessages(convMessages);
    }
  }, [selectedConversationId, conversations]);

  const handleSendMessage = async (content: string, receiverId: string) => {
    try {
      const response = await messageService.sendMessage({
        senderId: currentUserId,
        receiverId,
        content,
      });
      setMessages(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Failed to send message:', error);
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
          <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground text-sm">Chat with your patients</p>
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
