"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Trade = {
  id: string;
  trader_id: string | null;
  symbol: string;
  trade_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  notes: string | null;
};

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    symbol: "",
    trade_type: "buy",
    quantity: "",
    price: "",
    trade_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  async function loadTrades() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: trader, error: traderError } =
      await supabase
        .from("trader_accounts")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (traderError) {
      setError(
        "Trader account not found. Please create your trader account first."
      );
      setTrades([]);
      setLoading(false);
      return;
    }

    const { data, error: tradesError } = await supabase
      .from("trades")
      .select(
        "id, trader_id, symbol, trade_type, quantity, price, total_amount, trade_date, notes"
      )
      .eq("trader_id", trader.id)
      .order("trade_date", { ascending: false });

    if (tradesError) {
      setError(tradesError.message);
      setTrades([]);
      setLoading(false);
      return;
    }

    setTrades((data ?? []) as Trade[]);
    setLoading(false);
  }

  useEffect(() => {
    loadTrades();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const symbol = form.symbol.trim().toUpperCase();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!symbol) {
      setError("Please enter a symbol.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (!form.trade_date) {
      setError("Please select a trade date.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }

    const { data: trader, error: traderError } =
      await supabase
        .from("trader_accounts")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (traderError || !trader) {
      setError(
        "Trader account not found. Please create your trader account first."
      );
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("trades")
      .insert({
        trader_id: trader.id,
        symbol,
        trade_type: form.trade_type,
        quantity,
        price,
        total_amount: quantity * price,
        trade_date: new Date(form.trade_date).toISOString(),
        notes: form.notes.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm({
      symbol: "",
      trade_type: "buy",
      quantity: "",
      price: "",
      trade_date: new Date().toISOString().slice(0, 16),
      notes: "",
    });

    setShowModal(false);
    setSaving(false);

    await loadTrades();
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div
      style={{
        marginTop: "30px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px",
        padding: "30px",
        color: "white",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              margin: 0,
            }}
          >
            My Trades
          </h2>

          <p
            style={{
              marginTop: "6px",
              color: "rgba(255,255,255,0.45)",
              fontSize: "14px",
            }}
          >
            Your recorded trades are permanently stored.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowModal(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "white",
            color: "black",
            padding: "10px 18px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Record Trade
        </button>
      </div>

      {loading && (
        <p style={{ color: "rgba(255,255,255,0.5)" }}>
          Loading trades...
        </p>
      )}

      {!loading && error && (
        <p style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {!loading && !error && trades.length === 0 && (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            borderRadius: "18px",
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "rgba(255,255,255,0.5)" }}>
            No trades recorded yet.
          </p>

          <p
            style={{
              marginTop: "6px",
              color: "rgba(255,255,255,0.3)",
              fontSize: "13px",
            }}
          >
            Record your first trade using the button above.
          </p>
        </div>
      )}

      {!loading && !error && trades.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {trades.map((trade) => (
            <div
              key={trade.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1.2fr 0.8fr 0.8fr 1fr 1.2fr 1.5fr",
                alignItems: "center",
                gap: "12px",
                padding: "18px",
                borderRadius: "16px",
                background: "rgba(0,0,0,0.25)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <strong>{trade.symbol}</strong>

              <span
                style={{
                  color:
                    trade.trade_type.toLowerCase() === "buy"
                      ? "#34d399"
                      : "#f87171",
                  textTransform: "capitalize",
                }}
              >
                {trade.trade_type}
              </span>

              <span>{trade.quantity}</span>

              <span>
                ₹{Number(trade.price).toLocaleString("en-IN")}
              </span>

              <span>
                ₹
                {Number(trade.total_amount).toLocaleString(
                  "en-IN"
                )}
              </span>

              <span
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "13px",
                }}
              >
                {formatDate(trade.trade_date)}
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowModal(false);
              setError("");
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              borderRadius: "24px",
              background: "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Record Trade
                </h3>

                <p
                  style={{
                    marginTop: "6px",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                  }}
                >
                  Once submitted, this trade cannot be edited or deleted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <input
                required
                placeholder="Symbol (e.g. RELIANCE)"
                value={form.symbol}
                onChange={(e) =>
                  setForm({
                    ...form,
                    symbol: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <select
                value={form.trade_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trade_type: e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>

              <input
                required
                type="number"
                min="0.000001"
                step="any"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <input
                required
                type="number"
                min="0.01"
                step="any"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <input
                required
                type="datetime-local"
                value={form.trade_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    trade_date: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <textarea
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
                rows={3}
                style={inputStyle}
              />

              <div
                style={{
                  padding: "14px",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.05)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "13px",
                    margin: 0,
                  }}
                >
                  Total Trade Value
                </p>

                <p
                  style={{
                    marginTop: "5px",
                    fontSize: "20px",
                    fontWeight: 600,
                  }}
                >
                  ₹
                  {(
                    Number(form.quantity || 0) *
                    Number(form.price || 0)
                  ).toLocaleString("en-IN")}
                </p>
              </div>

              {error && (
                <p style={{ color: "#f87171" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "14px",
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
                {saving ? "Saving..." : "Submit Trade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};