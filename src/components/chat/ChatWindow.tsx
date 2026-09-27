"use client";

import React, { useEffect, useRef } from "react";
import ChatMessage, { ChatMessageData } from "./ChatMessage";
import ChatComposer from "./ChatComposer";
import { ChatRoom, ChatRole } from "./ChatSidebar";

type Props = {
  room: ChatRoom;
  messages: ChatMessageData[];
  onSend: (message: string) => void;
  currentRole: ChatRole;
  onBack?: () => void;
  mobile?: boolean;
};

export default function ChatWindow({
  room,
  messages,
  onSend,
  currentRole,
  onBack,
  mobile = false,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black">
      <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-white/[0.08] bg-black px-5">
        {mobile && onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1c1c1e] text-[#f5f5f7] hover:bg-[#2c2c2e]"
          >
            ←
          </button>
        )}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1c1c1e] text-lg">
          {room.type === "TRADE"
            ? "📈"
            : room.type === "PRIVATE"
              ? "👤"
              : "🏢"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-[#f5f5f7]">
              {room.title}
            </h2>

            {room.online && (
              <span className="flex items-center gap-1.5 text-[10px] text-[#30d158]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#30d158]" />
                Online
              </span>
            )}
          </div>

          <p className="truncate text-xs text-[#98989d]">
            {room.subtitle}
          </p>

          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/20">
            {currentRole}
          </p>
        </div>

        <button className="hidden h-9 w-9 items-center justify-center rounded-xl text-[#98989d] hover:bg-[#1c1c1e] hover:text-white sm:flex">
          ⋯
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1c1c1e] text-2xl">
                  💬
                </div>

                <h3 className="text-sm font-semibold text-[#f5f5f7]">
                  No messages yet
                </h3>

                <p className="mt-1 text-xs text-[#636366]">
                  Start the conversation.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatComposer onSend={onSend} />
    </section>
  );
}