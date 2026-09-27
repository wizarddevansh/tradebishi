"use client";

import React, { FormEvent, useState } from "react";

type Props = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export default function ChatComposer({
  onSend,
  disabled = false,
}: Props) {
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmed = message.trim();

    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-white/[0.08] bg-[#000000] p-4"
    >
      <div className="flex items-end gap-3 rounded-2xl border border-white/[0.10] bg-[#1c1c1e] p-2">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event);
            }
          }}
          placeholder="Write a message..."
          rows={1}
          disabled={disabled}
          className="min-h-[42px] max-h-32 flex-1 resize-none border-0 bg-transparent px-3 py-2 text-sm text-[#f5f5f7] outline-none placeholder:text-[#636366] focus:border-0 focus:ring-0"
        />

        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0a84ff] text-white transition hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M21.5 3.5L10.2 14.8M21.5 3.5L14.3 20.5L10.2 14.8M21.5 3.5L3.5 9.7L10.2 14.8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="mt-2 px-2 text-[10px] text-[#636366]">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </form>
  );
}