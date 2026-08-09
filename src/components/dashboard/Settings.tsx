"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Shield,
  User,
  Palette,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function Settings() {
  const [businessName, setBusinessName] =
    useState("TradeBishi");

  const [email, setEmail] = useState("");

  const [currency, setCurrency] = useState("INR");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError(
          "You must be signed in to load your settings."
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("settings")
        .select(
          "business_name, email, currency"
        )
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setBusinessName(
          data.business_name || "TradeBishi"
        );

        setEmail(data.email || "");

        setCurrency(data.currency || "INR");
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    const supabase = createClient();

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError(
        "You must be signed in to save settings."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: userData.user.id,
          business_name:
            businessName.trim() || "TradeBishi",
          email: email.trim() || null,
          currency,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  if (loading) {
    return (
      <div
        style={{
          marginTop: "30px",
          padding: "30px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Loading settings...
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "30px",
        color: "white",
        maxWidth: "1000px",
      }}
    >
      <div style={{ marginBottom: "30px" }}>
        <h2
          style={{
            fontSize: "30px",
            fontWeight: 600,
          }}
        >
          Settings
        </h2>

        <p
          style={{
            marginTop: "8px",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Manage your TradeBishi preferences and account.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px 18px",
            borderRadius: "14px",
            background: "rgba(248,113,113,0.08)",
            border:
              "1px solid rgba(248,113,113,0.2)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}

      {/* PROFILE */}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={iconBoxStyle}>
            <User size={20} />
          </div>

          <div>
            <h3 style={sectionTitleStyle}>
              Business Profile
            </h3>

            <p style={sectionDescriptionStyle}>
              Basic information about your TradeBishi
              account.
            </p>
          </div>
        </div>

        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>
              Business Name
            </label>

            <input
              value={businessName}
              onChange={(e) =>
                setBusinessName(e.target.value)
              }
              style={inputStyle}
              placeholder="TradeBishi"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              style={inputStyle}
              placeholder="your@email.com"
            />
          </div>
        </div>
      </section>

      {/* PREFERENCES */}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={iconBoxStyle}>
            <Palette size={20} />
          </div>

          <div>
            <h3 style={sectionTitleStyle}>
              Preferences
            </h3>

            <p style={sectionDescriptionStyle}>
              Configure how financial information is
              displayed.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: "320px" }}>
          <label style={labelStyle}>
            Currency
          </label>

          <select
            value={currency}
            onChange={(e) =>
              setCurrency(e.target.value)
            }
            style={inputStyle}
          >
            <option value="INR">
              ₹ Indian Rupee (INR)
            </option>

            <option value="USD">
              $ US Dollar (USD)
            </option>

            <option value="EUR">
              € Euro (EUR)
            </option>

            <option value="GBP">
              £ British Pound (GBP)
            </option>
          </select>
        </div>
      </section>

      {/* SECURITY */}

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div style={iconBoxStyle}>
            <Shield size={20} />
          </div>

          <div>
            <h3 style={sectionTitleStyle}>
              Security
            </h3>

            <p style={sectionDescriptionStyle}>
              Security controls for your TradeBishi
              account.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "18px",
            borderRadius: "16px",
            background:
              "rgba(255,255,255,0.04)",
            border:
              "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p
            style={{
              fontWeight: 600,
            }}
          >
            Account Security
          </p>

          <p
            style={{
              marginTop: "6px",
              color:
                "rgba(255,255,255,0.45)",
              fontSize: "14px",
            }}
          >
            Authentication and account protection
            are handled through Supabase.
          </p>
        </div>
      </section>

      {/* DANGER ZONE */}

      <section
        style={{
          ...sectionStyle,
          border:
            "1px solid rgba(248,113,113,0.2)",
        }}
      >
        <div style={sectionHeaderStyle}>
          <div
            style={{
              ...iconBoxStyle,
              color: "#f87171",
              background:
                "rgba(248,113,113,0.08)",
            }}
          >
            <AlertTriangle size={20} />
          </div>

          <div>
            <h3
              style={{
                ...sectionTitleStyle,
                color: "#f87171",
              }}
            >
              Danger Zone
            </h3>

            <p style={sectionDescriptionStyle}>
              Destructive account actions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            alert(
              "Account deletion will be implemented later."
            )
          }
          style={{
            padding: "12px 18px",
            borderRadius: "12px",
            border:
              "1px solid rgba(248,113,113,0.3)",
            background:
              "rgba(248,113,113,0.08)",
            color: "#f87171",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Delete Account
        </button>
      </section>

      {/* SAVE */}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "15px",
          marginTop: "25px",
          marginBottom: "40px",
        }}
      >
        {saved && (
          <span
            style={{
              color: "#34d399",
              fontSize: "14px",
            }}
          >
            Settings saved successfully.
          </span>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "13px 22px",
            borderRadius: "14px",
            border: "none",
            background: "white",
            color: "black",
            fontWeight: 600,
            cursor: saving
              ? "not-allowed"
              : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Save size={18} />

          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

const sectionStyle = {
  marginBottom: "20px",
  padding: "26px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(20px)",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "25px",
};

const iconBoxStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
};

const sectionTitleStyle = {
  fontSize: "19px",
  fontWeight: 600,
};

const sectionDescriptionStyle = {
  marginTop: "4px",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "14px",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color:
    "rgba(255,255,255,0.55)",
  fontSize: "14px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "13px 14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px",
};