"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      console.log("ROOT AUTH USER:", user);
      console.log("ROOT PROFILE:", profile);
      console.log("ROOT PROFILE ERROR:", error);

      if (error || !profile) {
        router.replace("/login");
        return;
      }

      if (profile.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (profile.role === "trader") {
        router.replace("/trader");
        return;
      }

      await supabase.auth.signOut();
      router.replace("/login");
    }

    redirectUser();
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "#ffffff",
            margin: "0 auto 16px",
          }}
        />

        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.5)",
            fontSize: "14px",
          }}
        >
          Loading TradeBishi...
        </p>
      </div>
    </main>
  );
}