"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function Topbar() {
  async function handleLogout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <header
      style={{
        height: "80px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 35px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        color: "white",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            margin: 0,
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "14px",
            margin: "5px 0 0",
          }}
        >
          Welcome back to TradeBishi
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          type="button"
          aria-label="Search"
          style={iconButtonStyle}
        >
          <Search size={19} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          style={iconButtonStyle}
        >
          <Bell size={19} />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          style={{
            ...iconButtonStyle,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 13px",
          }}
        >
          <LogOut size={18} />
          <span style={{ fontSize: "13px" }}>
            Logout
          </span>
        </button>

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background: "white",
            color: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            marginLeft: "4px",
          }}
        >
          D
        </div>
      </div>
    </header>
  );
}

const iconButtonStyle = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  padding: "10px",
  color: "white",
  cursor: "pointer",
};