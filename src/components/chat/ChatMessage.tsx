"use client";

import React from "react";

export type ChatRole = "ADMIN" | "MEMBER" | "TRADER";

export type ChatMessageData = {
  id: string;
  sender: string;
  role: ChatRole;
  text: string;
  time: string;
  mine?: boolean;
};

type Props = {
  message: ChatMessageData;
};

export default function ChatMessage({ message }: Props) {
  const roleLabel =
    message.role === "ADMIN"
      ? "Admin"
      : message.role === "TRADER"
        ? "Trader"
        : "Member";

  return (
    <div
      className={`flex w-full ${
        message.mine ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[78%] gap-3 ${
          message.mine ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            message.role === "ADMIN"
              ? "bg-blue-500/15 text-blue-400"
              : message.role === "TRADER"
                ? "bg-purple-500/15 text-purple-400"
                : "bg-white/10 text-white"
          }`}
        >
          {message.sender
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div
          className={`flex flex-col ${
            message.mine ? "items-end" : "items-start"
          }`}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold text-[#f5f5f7]">
              {message.sender}
            </span>

            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[#98989d]">
              {roleLabel}
            </span>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.mine
                ? "rounded-tr-md bg-[#0a84ff] text-white"
                : "rounded-tl-md bg-[#1c1c1e] text-[#f5f5f7] ring-1 ring-white/[0.06]"
            }`}
          >
            {message.text}
          </div>

          <span className="mt-1 text-[10px] text-[#636366]">
            {message.time}
          </span>
        </div>
      </div>
    </div>
  );
}