"use client";

import { useEffect, useState } from "react";
import { Plus, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Trade = {
  id: string;
  symbol: string;
  trade_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  notes: string | null;
};

export default function TraderAccount() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    symbol: "",
    trade_type: "buy",
    quantity: "",
    price: "",
    notes: "",
  });

  async function loadTrades() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, symbol, trade_type, quantity, price, total_amount, trade_date, notes"
      )
      .order("trade_date", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
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
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const symbol = form.symbol
      .trim()
      .toUpperCase();

    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!symbol) {
      setError("Enter a stock symbol.");
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

    const { error } = await supabase
      .from("trades")
      .insert({
        symbol,
        trade_type: form.trade_type,
        quantity,
        price,
        total_amount: quantity * price,
        notes: form.notes.trim() || null,
        trade_date: new Date().toISOString(),
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      symbol: "",
      trade_type: "buy",
      quantity: "",
      price: "",
      notes: "",
    });

    setShowForm(false);
    setSaving(false);

    await loadTrades();
  }

  const totalTrades = trades.length;

  const totalBuyValue = trades
    .filter(
      (trade) =>
        trade.trade_type.toLowerCase() === "buy"
    )
    .reduce(
      (sum, trade) =>
        sum + Number(trade.total_amount || 0),
      0
    );

  const totalSellValue = trades
    .filter(
      (trade) =>
        trade.trade_type.toLowerCase() === "sell"
    )
    .reduce(
      (sum, trade) =>
        sum + Number(trade.total_amount || 0),
      0
    );

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <div
      style={{
        color: "white",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <p
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "13px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Trader Workspace
          </p>

          <h1
            style={{
              fontSize: "36px",
              marginTop: "8px",
              fontWeight: 700,
            }}
          >
            Trader Account
          </h1>

          <p
            style={{
              marginTop: "6px",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Record every trade and maintain a permanent
            trading history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowForm(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "13px 20px",
            borderRadius: "14px",
            border: "none",
            background: "white",
            color: "black",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
          Record Trade
        </button>
      </div>

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "18px",
          marginBottom: "30px",
        }}
      >
        <Stat
          icon={<TrendingUp size={20} />}
          title="Total Trades"
          value={totalTrades.toString()}
        />

        <Stat
          icon={<Wallet size={20} />}
          title="Total Buy Value"
          value={formatCurrency(totalBuyValue)}
        />

        <Stat
          icon={<Wallet size={20} />}
          title="Total Sell Value"
          value={formatCurrency(totalSellValue)}
        />
      </div>

      {/* TRADES */}

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border:
            "1px solid rgba(255,255,255,0.1)",
          borderRadius: "26px",
          padding: "28px",
          backdropFilter: "blur(20px)",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 600,
            marginBottom: "20px",
          }}
        >
          Trading History
        </h2>

        {loading && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Loading trading history...
          </p>
        )}

        {!loading && error && !showForm && (
          <p
            style={{
              color: "#f87171",
            }}
          >
            Error: {error}
          </p>
        )}

        {!loading &&
          !error &&
          trades.length === 0 && (
            <div
              style={{
                padding: "45px 20px",
                textAlign: "center",
                borderRadius: "18px",
                background:
                  "rgba(0,0,0,0.2)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                style={{
                  color:
                    "rgba(255,255,255,0.5)",
                }}
              >
                No trades recorded yet.
              </p>

              <p
                style={{
                  marginTop: "6px",
                  color:
                    "rgba(255,255,255,0.3)",
                  fontSize: "13px",
                }}
              >
                Use "Record Trade" whenever the trader
                executes a trade.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          trades.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {trades.map((trade) => {
                const isBuy =
                  trade.trade_type.toLowerCase() ===
                  "buy";

                return (
                  <div
                    key={trade.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.5fr 1fr 1fr 1.3fr 1.4fr",
                      gap: "15px",
                      alignItems: "center",
                      padding: "18px",
                      borderRadius: "16px",
                      background:
                        "rgba(0,0,0,0.25)",
                      border:
                        "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                        }}
                      >
                        {trade.symbol}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "12px",
                          color:
                            "rgba(255,255,255,0.4)",
                        }}
                      >
                        {new Date(
                          trade.trade_date
                        ).toLocaleString("en-IN")}
                      </div>
                    </div>

                    <span
                      style={{
                        color: isBuy
                          ? "#34d399"
                          : "#f87171",
                        textTransform:
                          "capitalize",
                        fontWeight: 600,
                      }}
                    >
                      {trade.trade_type}
                    </span>

                    <span>
                      {trade.quantity}
                    </span>

                    <span>
                      {formatCurrency(
                        Number(trade.price)
                      )}
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(
                        Number(
                          trade.total_amount
                        )
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* RECORD TRADE MODAL */}

      {showForm && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowForm(false);
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
            background:
              "rgba(0,0,0,0.78)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "30px",
              borderRadius: "26px",
              background: "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <h2
              style={{
                fontSize: "25px",
                marginBottom: "6px",
              }}
            >
              Record Trade
            </h2>

            <p
              style={{
                color:
                  "rgba(255,255,255,0.45)",
                fontSize: "13px",
                marginBottom: "25px",
              }}
            >
              Once recorded, this trade cannot be
              deleted from the dashboard.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <input
                required
                placeholder="Stock Symbol"
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
                <option value="buy">
                  Buy
                </option>

                <option value="sell">
                  Sell
                </option>
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
                placeholder="Execution Price"
                value={form.price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    price: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <textarea
                placeholder="Trade notes / reason"
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes: e.target.value,
                  })
                }
                style={inputStyle}
              />

              <div
                style={{
                  padding: "15px",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.05)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span
                  style={{
                    color:
                      "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                  }}
                >
                  Trade Value
                </span>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "21px",
                    fontWeight: 600,
                  }}
                >
                  {formatCurrency(
                    Number(form.quantity || 0) *
                      Number(form.price || 0)
                  )}
                </div>
              </div>

              {error && (
                <p
                  style={{
                    color: "#f87171",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: "5px",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: "white",
                  color: "black",
                  fontWeight: 600,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? "Recording..."
                  : "Record Trade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "22px",
        borderRadius: "20px",
        background:
          "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color:
            "rgba(255,255,255,0.5)",
          fontSize: "13px",
        }}
      >
        {icon}
        {title}
      </div>

      <div
        style={{
          marginTop: "12px",
          fontSize: "27px",
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};