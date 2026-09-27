"use client";

import {
  Search,
  Users,
  TrendingUp,
  LockKeyhole,
} from "lucide-react";

export type ChatRoom = {
  id: string;
  title: string;
  subtitle: string;
  type: "GENERAL" | "TRADE" | "PRIVATE";
  unread: number;
  online?: boolean;
};

export type ChatRole = "ADMIN" | "TRADER" | "MEMBER";

type ChatSidebarProps = {
  rooms: ChatRoom[];
  selectedRoom: string;
  onSelectRoom: (roomId: string) => void;
  currentRole: ChatRole;
};

export default function ChatSidebar({
  rooms,
  selectedRoom,
  onSelectRoom,
  currentRole,
}: ChatSidebarProps) {
  const generalRooms = rooms.filter(
    (room) => room.type === "GENERAL"
  );

  const tradeRooms = rooms.filter(
    (room) => room.type === "TRADE"
  );

  const privateRooms = rooms.filter(
    (room) => room.type === "PRIVATE"
  );

  const renderRoom = (room: ChatRoom) => {
    const isSelected =
      selectedRoom === room.id;

    return (
      <button
        key={room.id}
        type="button"
        onClick={() =>
          onSelectRoom(room.id)
        }
        className={`w-full rounded-xl p-3 text-left transition ${
          isSelected
            ? "bg-white/10"
            : "hover:bg-white/[0.06]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              room.type === "GENERAL"
                ? "bg-blue-500/15 text-blue-400"
                : room.type === "TRADE"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-purple-500/15 text-purple-400"
            }`}
          >
            {room.type === "GENERAL" && (
              <Users size={18} />
            )}

            {room.type === "TRADE" && (
              <TrendingUp size={18} />
            )}

            {room.type === "PRIVATE" && (
              <LockKeyhole size={17} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-white">
                {room.title}
              </span>

              {room.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-semibold text-white">
                  {room.unread}
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  room.online
                    ? "bg-green-400"
                    : "bg-white/25"
                }`}
              />

              <span className="truncate text-xs text-white/45">
                {room.subtitle}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/10 bg-[#101012]">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
              TradeBishi
            </p>

            <h2 className="mt-1 text-xl font-semibold text-white">
              Chat
            </h2>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

            <span className="text-[10px] font-medium text-green-400">
              Realtime
            </span>
          </div>
        </div>

        <div className="relative mt-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-blue-500/40"
          />
        </div>

        <div className="mt-3 text-xs text-white/35">
          Signed in as{" "}
          <span className="font-medium text-white/60">
            {currentRole}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {generalRooms.length > 0 && (
          <div className="mb-5">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Community
            </div>

            <div className="space-y-1">
              {generalRooms.map(renderRoom)}
            </div>
          </div>
        )}

        {tradeRooms.length > 0 && (
          <div className="mb-5">
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Trades
            </div>

            <div className="space-y-1">
              {tradeRooms.map(renderRoom)}
            </div>
          </div>
        )}

        {privateRooms.length > 0 && (
          <div>
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Private
            </div>

            <div className="space-y-1">
              {privateRooms.map(renderRoom)}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-xs font-medium text-white/60">
            TradeBishi Chat
          </p>

          <p className="mt-1 text-[11px] leading-4 text-white/30">
            Community, trade and private conversations.
          </p>
        </div>
      </div>
    </aside>
  );
}