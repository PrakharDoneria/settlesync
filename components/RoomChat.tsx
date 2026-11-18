'use client';

import React, { useEffect, useState, useRef } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { supabase, type RoomMessage, type Profile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface RoomChatProps {
  roomId: string;
  currentUser: Profile;
}

export const RoomChat: React.FC<RoomChatProps> = ({ roomId, currentUser }) => {
  const [messages, setMessages] = useState<(RoomMessage & { profile: Profile })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('room_messages')
          .select('*, profile:user_id(*)')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [roomId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room-messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: any) => {
          try {
            // Fetch the new message with profile data
            const { data: newMsg } = await supabase
              .from('room_messages')
              .select('*, profile:user_id(*)')
              .eq('id', payload.new.id)
              .single();

            if (newMsg) {
              setMessages((prev) => [...prev, newMsg]);
            }
          } catch (error) {
            console.error('Error fetching new message:', error);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED') {
          console.log('Real-time subscription closed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase.from('room_messages').insert({
        room_id: roomId,
        user_id: currentUser.id,
        message: newMessage,
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-neo-black border-t-neo-cyan rounded-full animate-neo-spin mb-4"></div>
          <p className="text-neo-md font-neo-black text-neo-cyan">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neo-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 border-b-3 border-neo-black">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-neo-md font-neo-bold text-neo-black">
              No messages yet. Start the conversation! 💬
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-neo border-2 border-neo-black font-neo-bold text-neo-sm ${
                  msg.user_id === currentUser.id
                    ? 'bg-neo-cyan text-neo-black'
                    : 'bg-neo-yellow text-neo-black'
                }`}
              >
                <p className="text-neo-xs font-neo-black mb-1 opacity-70">
                  {msg.profile?.display_name || 'Unknown'}
                </p>
                <p className="break-words">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-3 border-neo-black p-4 bg-neo-gray">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="neo-input flex-1 border-3"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="neo-button-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border-3"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
            SEND
          </button>
        </form>
      </div>
    </div>
  );
};
