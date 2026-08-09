"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    // 1. Sign in
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    // 2. Make sure we have a logged-in user
    const user = data.user;

    if (!user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // =========================================================
    // 3. FIRST CHECK: ADMIN / TRADER
    // =========================================================

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    // Admin
    if (profile?.role === "admin") {
      router.replace("/admin");
      router.refresh();
      return;
    }

    // Trader
    if (profile?.role === "trader") {
      router.replace("/trader");
      router.refresh();
      return;
    }
if (profile?.role === "member") {
  router.replace("/member");
  router.refresh();
  return;
}
    // =========================================================
    // 4. SECOND CHECK: MEMBER
    // =========================================================

    const { data: member, error: memberError } =
      await supabase
        .from("members")
        .select("id, full_name, status")
        .eq("user_id", user.id)
        .maybeSingle();

    if (memberError) {
      setError(
        "Unable to verify your member account. Please try again."
      );
      setLoading(false);
      return;
    }

    if (member) {
      if (member.status !== "active") {
        setError(
          "Your member account is not active. Please contact the administrator."
        );
        setLoading(false);
        return;
      }

      // Member dashboard
      router.replace("/");
      router.refresh();
      return;
    }

    // =========================================================
    // 5. NO VALID ACCOUNT TYPE
    // =========================================================

    setError(
      "Your account is not registered as an Admin, Trader, or Member. Please contact the administrator."
    );

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px",
          borderRadius: "28px",
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(25px)",
          boxShadow: "0 30px 100px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ marginBottom: "35px" }}>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            Investment Intelligence
          </p>

          <h1
            style={{
              fontSize: "42px",
              fontWeight: 700,
              letterSpacing: "-2px",
              marginTop: "10px",
            }}
          >
            TradeBishi
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "15px",
            }}
          >
            Sign in to your account
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              style={{
                position: "absolute",
                left: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
                pointerEvents: "none",
              }}
            />

            <input
              required
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)",
                pointerEvents: "none",
              }}
            />

            <input
              required
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "5px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "15px",
              borderRadius: "14px",
              border: "none",
              background: "white",
              color: "black",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p
          style={{
            marginTop: "30px",
            textAlign: "center",
            color: "rgba(255,255,255,0.3)",
            fontSize: "12px",
          }}
        >
          TradeBishi • Secure Investment Management
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "15px 15px 15px 45px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};