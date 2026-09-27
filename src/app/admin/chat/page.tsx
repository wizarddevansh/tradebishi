"use client";

import { useEffect, useState } from "react";
import ChatSidebar, {
  ChatRole,
  ChatRoom,
} from "@/components/chat/ChatSidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import { ChatMessageData } from "@/components/chat/ChatMessage";
import { createClient } from "@/lib/supabase";

type DbMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

const rooms: ChatRoom[] = [
  {
    id: "community",
    title: "TradeBishi Community",
    subtitle: "Everyone",
    type: "GENERAL",
    unread: 0,
    online: true,
  },
  {
    id: "TB-2026-09",
    title: "TB-2026-09",
    subtitle: "Trade discussion",
    type: "TRADE",
    unread: 0,
    online: true,
  },
  {
    id: "TB-2026-08",
    title: "TB-2026-08",
    subtitle: "Completed trade",
    type: "TRADE",
    unread: 0,
    online: false,
  },
  {
    id: "devansh-private",
    title: "Devansh",
    subtitle: "Private conversation",
    type: "PRIVATE",
    unread: 0,
    online: true,
  },
];

function formatMessages(
  messages: DbMessage[],
  currentUserId: string
): ChatMessageData[] {
  return messages.map((message) => ({
    id: message.id,
    sender:
      message.sender_id === currentUserId ? "You" : "TradeBishi User",
    role: message.sender_id === currentUserId ? "ADMIN" : "MEMBER",
    text: message.message,
    time: message.created_at,
    mine: message.sender_id === currentUserId,
  }));
}

export default function AdminChatPage() {
  const supabase = createClient();

  const currentRole: ChatRole = "ADMIN";

  const [selectedRoom, setSelectedRoom] = useState("community");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedRoomData =
    rooms.find((room) => room.id === selectedRoom) ?? rooms[0];

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function loadChat() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const userId = user.id;

      // Keep TypeScript aware that this is definitely a string
      const currentUserId = userId;

      const { data: communityRoom, error: roomError } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("room_type", "COMMUNITY")
        .maybeSingle();

      if (roomError) {
        console.error("Community room error:", roomError);
        setLoading(false);
        return;
      }

      if (!communityRoom) {
        console.error("Community chat room not found.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", communityRoom.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Chat messages error:", error);
      } else if (!cancelled) {
        setMessages(
          formatMessages(
            (data ?? []) as DbMessage[],
            currentUserId
          )
        );
      }

      setLoading(false);

      channel = supabase
        .channel(`admin-community-chat-${communityRoom.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `room_id=eq.${communityRoom.id}`,
          },
          (payload) => {
            const newMessage = payload.new as DbMessage;

            setMessages((previous) => {
              const alreadyExists = previous.some(
                (message) => message.id === newMessage.id
              );

              if (alreadyExists) {
                return previous;
              }

              return [
                ...previous,
                ...formatMessages(
                  [newMessage],
                  currentUserId
                ),
              ];
            });
          }
        )
        .subscribe((status) => {
          console.log("Admin chat realtime:", status);
        });
    }

    loadChat();

    return () => {
      cancelled = true;

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function handleSend(message: string) {
    const trimmed = message.trim();

    if (!trimmed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user.");
      return;
    }

    const { data: communityRoom, error: roomError } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("room_type", "COMMUNITY")
      .maybeSingle();

    if (roomError || !communityRoom) {
      console.error("Unable to find community room:", roomError);
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      room_id: communityRoom.id,
      sender_id: user.id,
      message: trimmed,
    });

    if (error) {
      console.error("Send message error:", error);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0 overflow-hidden bg-black">
      <ChatSidebar
        rooms={rooms}
        selectedRoom={selectedRoom}
        onSelectRoom={setSelectedRoom}
        currentRole={currentRole}
      />

      <ChatWindow
        room={selectedRoomData}
        messages={
          selectedRoom === "community"
            ? messages
            : []
        }
        onSend={
          selectedRoom === "community"
            ? handleSend
            : async () => {}
        }
        currentRole={currentRole}
      />

      {loading && (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded-full border border-white/10 bg-[#1c1c1e] px-3 py-1.5 text-xs text-white/50">
          Loading chat...
        </div>
      )}
    </div>
  );
}