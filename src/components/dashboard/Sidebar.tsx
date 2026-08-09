"use client";

import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  FileText,
  Settings,
  UserRoundCog,
} from "lucide-react";

const menu = [
  {
    name: "Overview",
    icon: LayoutDashboard,
  },
  {
    name: "Members",
    icon: Users,
  },
  {
    name: "Investments",
    icon: Wallet,
  },
  {
    name: "Trades",
    icon: TrendingUp,
  },
  {
    name: "Trader Account",
    icon: UserRoundCog,
  },
  {
    name: "Reports",
    icon: FileText,
  },
  {
    name: "Settings",
    icon: Settings,
  },
];

export default function Sidebar({
  activeSection,
  onNavigate,
}: {
  activeSection: string;
  onNavigate: (section: string) => void;
}) {
  return (
    <aside
      style={{
        width: "260px",
        minHeight: "100vh",
        background: "rgba(255,255,255,0.05)",
        borderRight:
          "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        padding: "30px 20px",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <h2
        style={{
          fontSize: "28px",
          fontWeight: 700,
          marginBottom: "40px",
        }}
      >
        TradeBishi
      </h2>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {menu.map((item) => {
          const Icon = item.icon;

          const active =
            activeSection === item.name;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                onNavigate(item.name)
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                background: active
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                border: "none",
                color: active
                  ? "white"
                  : "rgba(255,255,255,0.7)",
                fontSize: "16px",
                cursor: "pointer",
                textAlign: "left",
                transition:
                  "all 0.2s ease",
              }}
            >
              <Icon size={20} />

              {item.name}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}