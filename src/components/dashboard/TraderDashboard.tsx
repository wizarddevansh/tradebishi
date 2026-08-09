"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  LogOut,
  Plus,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
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

export default function TraderDashboard() {
  const [activeSection, setActiveSection] =
    useState("Overview");

  const [showTradeModal, setShowTradeModal] =
    useState(false);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    symbol: "",
    type: "buy",
    quantity: "",
    price: "",
    returnAmount: "",
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

  async function addTrade(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const symbol = form.symbol
      .trim()
      .toUpperCase();

    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!symbol) {
      setError("Please enter a symbol.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than 0.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than 0.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("trades")
      .insert({
        symbol,
        trade_type: form.type,
        quantity,
        price,
        total_amount: quantity * price,
        trade_date: new Date().toISOString(),
        notes: form.notes.trim() || null,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      symbol: "",
      type: "buy",
      quantity: "",
      price: "",
      returnAmount: "",
      notes: "",
    });

    setShowTradeModal(false);
    setSaving(false);

    await loadTrades();
  }

  const totalTraded = trades.reduce(
    (sum, trade) =>
      sum + Number(trade.total_amount || 0),
    0
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        display: "flex",
      }}
    >
      {/* SIDEBAR */}

      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          padding: "28px 18px",
          background:
            "rgba(255,255,255,0.04)",
          borderRight:
            "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(20px)",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "0 12px",
            marginBottom: "45px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            TradeBishi
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "12px",
              color:
                "rgba(255,255,255,0.4)",
              letterSpacing: "1px",
            }}
          >
            TRADER ACCOUNT
          </div>
        </div>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <NavButton
            icon={
              <LayoutDashboard size={19} />
            }
            label="Overview"
            active={
              activeSection === "Overview"
            }
            onClick={() =>
              setActiveSection("Overview")
            }
          />

          <NavButton
            icon={
              <TrendingUp size={19} />
            }
            label="Record Trade"
            active={false}
            onClick={() =>
              setShowTradeModal(true)
            }
          />

          <NavButton
            icon={
              <History size={19} />
            }
            label="Trade History"
            active={
              activeSection ===
              "Trade History"
            }
            onClick={() =>
              setActiveSection(
                "Trade History"
              )
            }
          />
        </nav>

        <div
          style={{
            position: "absolute",
            bottom: "25px",
            left: "18px",
            right: "18px",
          }}
        >
          <button
            type="button"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "13px",
              borderRadius: "13px",
              border:
                "1px solid rgba(255,255,255,0.08)",
              background: "transparent",
              color:
                "rgba(255,255,255,0.55)",
              cursor: "pointer",
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* TOPBAR */}

        <header
          style={{
            height: "78px",
            padding: "0 35px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            borderBottom:
              "1px solid rgba(255,255,255,0.1)",
            background:
              "rgba(255,255,255,0.02)",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "23px",
                fontWeight: 600,
              }}
            >
              Trader Dashboard
            </h1>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color:
                  "rgba(255,255,255,0.45)",
              }}
            >
              Record and monitor your
              trading activity.
            </p>
          </div>

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
            }}
          >
            T
          </div>
        </header>

        <section
          style={{
            padding: "35px",
          }}
        >
          {/* OVERVIEW */}

          {activeSection ===
            "Overview" && (
            <>
              <div
                style={{
                  marginBottom: "30px",
                }}
              >
                <p
                  style={{
                    color:
                      "rgba(255,255,255,0.4)",
                    fontSize: "13px",
                    letterSpacing: "2px",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Trading workspace
                </p>

                <h2
                  style={{
                    margin:
                      "8px 0 0",
                    fontSize: "38px",
                    letterSpacing:
                      "-1.5px",
                  }}
                >
                  Welcome, Trader.
                </h2>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",
                  gap: "18px",
                }}
              >
                <Stat
                  title="Capital Traded"
                  value={`₹${totalTraded.toLocaleString(
                    "en-IN"
                  )}`}
                  icon={
                    <Wallet size={20} />
                  }
                />

                <Stat
                  title="Total Trades"
                  value={String(
                    trades.length
                  )}
                  icon={
                    <History size={20} />
                  }
                />

                <Stat
                  title="Account Status"
                  value="Active"
                  icon={
                    <TrendingUp
                      size={20}
                    />
                  }
                />
              </div>

              <div
                style={{
                  marginTop: "25px",
                  padding: "28px",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  Record a new trade
                </h3>

                <p
                  style={{
                    marginTop: "7px",
                    color:
                      "rgba(255,255,255,0.45)",
                    fontSize: "14px",
                  }}
                >
                  Every trade you submit is
                  permanently recorded.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowTradeModal(
                      true
                    )
                  }
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    padding:
                      "12px 18px",
                    borderRadius:
                      "13px",
                    border: "none",
                    background:
                      "white",
                    color: "black",
                    fontWeight: 600,
                    cursor:
                      "pointer",
                  }}
                >
                  <Plus size={18} />
                  Record Trade
                </button>
              </div>
            </>
          )}

          {/* HISTORY */}

          {activeSection ===
            "Trade History" && (
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                }}
              >
                Trade History
              </h2>

              <p
                style={{
                  color:
                    "rgba(255,255,255,0.45)",
                  marginTop: "6px",
                  marginBottom:
                    "25px",
                }}
              >
                Your permanently recorded
                trading activity.
              </p>

              {loading && (
                <p
                  style={{
                    color:
                      "rgba(255,255,255,0.5)",
                  }}
                >
                  Loading trades...
                </p>
              )}

              {!loading && error && (
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
                      padding: "50px",
                      textAlign:
                        "center",
                      borderRadius:
                        "22px",
                      background:
                        "rgba(255,255,255,0.04)",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    No trades recorded
                    yet.
                  </div>
                )}

              {!loading &&
                !error &&
                trades.length > 0 && (
                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: "10px",
                    }}
                  >
                    {trades.map(
                      (trade) => (
                        <div
                          key={
                            trade.id
                          }
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "1.3fr 0.8fr 1fr 1fr 1fr",
                            gap: "15px",
                            alignItems:
                              "center",
                            padding:
                              "18px",
                            borderRadius:
                              "16px",
                            background:
                              "rgba(255,255,255,0.04)",
                            border:
                              "1px solid rgba(255,255,255,0.07)",
                          }}
                        >
                          <strong>
                            {
                              trade.symbol
                            }
                          </strong>

                          <span
                            style={{
                              color:
                                trade.trade_type ===
                                "buy"
                                  ? "#34d399"
                                  : "#f87171",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "5px",
                              textTransform:
                                "capitalize",
                            }}
                          >
                            {trade.trade_type ===
                            "buy" ? (
                              <ArrowUpRight
                                size={
                                  16
                                }
                              />
                            ) : (
                              <ArrowDownRight
                                size={
                                  16
                                }
                              />
                            )}

                            {
                              trade.trade_type
                            }
                          </span>

                          <span>
                            {
                              trade.quantity
                            }
                          </span>

                          <span>
                            ₹
                            {Number(
                              trade.price
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>

                          <span>
                            ₹
                            {Number(
                              trade.total_amount
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          )}
        </section>
      </main>

      {/* RECORD TRADE MODAL */}

      {showTradeModal && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowTradeModal(
                false
              );
              setError("");
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background:
              "rgba(0,0,0,0.78)",
            backdropFilter:
              "blur(14px)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "30px",
              borderRadius: "25px",
              background: "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              Record Trade
            </h2>

            <p
              style={{
                marginTop: "6px",
                color:
                  "rgba(255,255,255,0.4)",
                fontSize: "13px",
              }}
            >
              Once recorded, the trader
              cannot delete this trade.
            </p>

            <form
              onSubmit={addTrade}
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "14px",
                marginTop: "25px",
              }}
            >
              <input
                required
                placeholder="Stock / Asset Symbol"
                value={
                  form.symbol
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    symbol:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <select
                value={
                  form.type
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    type:
                      e.target.value,
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
                value={
                  form.quantity
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <input
                required
                type="number"
                min="0.01"
                step="any"
                placeholder="Price per unit"
                value={
                  form.price
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    price:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <textarea
                placeholder="Notes (optional)"
                value={
                  form.notes
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value,
                  })
                }
                rows={3}
                style={inputStyle}
              />

              <div
                style={{
                  padding: "15px",
                  borderRadius:
                    "14px",
                  background:
                    "rgba(255,255,255,0.05)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span
                  style={{
                    color:
                      "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                  }}
                >
                  TOTAL TRADE VALUE
                </span>

                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "21px",
                    fontWeight: 600,
                  }}
                >
                  ₹
                  {(
                    Number(
                      form.quantity ||
                        0
                    ) *
                    Number(
                      form.price ||
                        0
                    )
                  ).toLocaleString(
                    "en-IN"
                  )}
                </div>
              </div>

              {error && (
                <p
                  style={{
                    color:
                      "#f87171",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  saving
                }
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "14px",
                  border: "none",
                  background:
                    "white",
                  color: "black",
                  fontWeight: 600,
                  cursor:
                    saving
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Permanently Record Trade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "13px",
        borderRadius: "13px",
        border: "none",
        background: active
          ? "rgba(255,255,255,0.11)"
          : "transparent",
        color: active
          ? "white"
          : "rgba(255,255,255,0.6)",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "14px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "20px",
        background:
          "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          color:
            "rgba(255,255,255,0.45)",
        }}
      >
        <span>{title}</span>
        {icon}
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "30px",
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
  boxSizing:
    "border-box" as const,
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