"use client";

import {
  UserPlus,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function Welcome() {
  const goToSection = (section: string) => {
    window.dispatchEvent(
      new CustomEvent("tradebishi:navigate", {
        detail: section,
      })
    );
  };

  return (
    <section
      style={{
        marginBottom: "30px",
        padding: "35px",
        borderRadius: "30px",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        color: "white",
      }}
    >
      <p
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: "14px",
          margin: 0,
        }}
      >
        Investment Management Dashboard
      </p>

      <h1
        style={{
          fontSize: "42px",
          marginTop: "10px",
          marginBottom: 0,
          fontWeight: 700,
          letterSpacing: "-1.5px",
        }}
      >
        Welcome back, Devansh 👋
      </h1>

      <p
        style={{
          marginTop: "10px",
          color: "rgba(255,255,255,0.6)",
          lineHeight: 1.6,
        }}
      >
        Manage investments, members and portfolio growth
        from one place.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "25px",
        }}
      >
        <button
          type="button"
          onClick={() => goToSection("Members")}
          style={quickButtonStyle}
        >
          <UserPlus size={18} />
          Add Member
        </button>

        <button
          type="button"
          onClick={() => goToSection("Trades")}
          style={quickButtonStyle}
        >
          <TrendingUp size={18} />
          Record Trade
        </button>

        <button
          type="button"
          onClick={() => goToSection("Deposits")}
          style={quickButtonStyle}
        >
          <Wallet size={18} />
          Review Deposits
        </button>
      </div>

      <style>{`
        .tradebishi-quick-button:hover {
          background: rgba(255,255,255,0.14) !important;
          border-color: rgba(255,255,255,0.2) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </section>
  );
}

const quickButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "11px 16px",
  borderRadius: "13px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s ease",
};