"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Plus,
  LogOut,
  Lock,
  X,
  Activity,
  Wallet,
  BarChart3,
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

type Profile = {
  full_name: string | null;
  role: string | null;
};

export default function TraderDashboard() {
  const router = useRouter();

  const [userName, setUserName] = useState("Trader");
  const [role, setRole] = useState("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    symbol: "",
    trade_type: "buy",
    quantity: "",
    price: "",
    trade_date: new Date().toISOString().slice(0, 16),
    notes: "",
  });

  useEffect(() => {
    loadTrader();
  }, []);

  async function loadTrader() {
    const supabase = createClient();

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("TRADER AUTH USER:", user);
      console.log("TRADER AUTH ERROR:", authError);

      if (authError) {
        setError(`Authentication error: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!user) {
        setError("No authenticated user found.");
        setLoading(false);
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      console.log("TRADER PROFILE:", profile);
      console.log(
        "TRADER PROFILE ERROR:",
        profileError
      );
      console.log(
        "TRADER ACTUAL ROLE:",
        profile?.role
      );

      if (profileError) {
        setError(
          `Profile error: ${profileError.message}`
        );
        setLoading(false);
        return;
      }

      if (!profile) {
        setError("No profile was found for this account.");
        setLoading(false);
        return;
      }

      const typedProfile = profile as Profile;

      setUserName(
        typedProfile.full_name || "Trader"
      );

      setRole(
        typedProfile.role || "unknown"
      );

      /*
       * IMPORTANT:
       * We are intentionally NOT redirecting here.
       *
       * This lets us see the actual role returned
       * from Supabase instead of being redirected
       * back to the main dashboard.
       */

      if (
        typedProfile.role?.toLowerCase() !==
        "trader"
      ) {
        console.log(
          "TRADER ROLE CHECK FAILED:",
          typedProfile.role
        );

        setError(
          `Trader access check failed. Supabase returned role: "${typedProfile.role}"`
        );

        setLoading(false);
        return;
      }

      await loadTrades();

      setLoading(false);
    } catch (err) {
      console.error(
        "TRADER DASHBOARD ERROR:",
        err
      );

      setError(
        "Unexpected error while loading Trader Dashboard."
      );

      setLoading(false);
    }
  }

  async function loadTrades() {
    const supabase = createClient();

    const {
      data,
      error: tradesError,
    } = await supabase
      .from("trades")
      .select(
        `
          id,
          symbol,
          trade_type,
          quantity,
          price,
          total_amount,
          trade_date,
          notes
        `
      )
      .order("trade_date", {
        ascending: false,
      });

    console.log(
      "TRADER TRADES:",
      data
    );

    console.log(
      "TRADER TRADES ERROR:",
      tradesError
    );

    if (tradesError) {
      setError(
        `Trades error: ${tradesError.message}`
      );
      return;
    }

    setTrades(
      (data ?? []) as Trade[]
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const symbol =
      form.symbol.trim().toUpperCase();

    const quantity =
      Number(form.quantity);

    const price =
      Number(form.price);

    if (!symbol) {
      setError(
        "Enter a stock symbol."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Quantity must be greater than 0."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setError(
        "Price must be greater than 0."
      );
      setSaving(false);
      return;
    }

    if (!form.trade_date) {
      setError(
        "Select a trade date."
      );
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please sign in again."
      );
      setSaving(false);
      return;
    }

    const {
      error: insertError,
    } = await supabase
      .from("trades")
      .insert({
        symbol,
        trade_type: form.trade_type,
        quantity,
        price,
        total_amount:
          quantity * price,
        trade_date: new Date(
          form.trade_date
        ).toISOString(),
        notes:
          form.notes.trim() || null,
        trader_id: user.id,
      });

    if (insertError) {
      console.error(
        "TRADE INSERT ERROR:",
        insertError
      );

      setError(
        insertError.message
      );

      setSaving(false);
      return;
    }

    resetForm();

    setShowModal(false);
    setSaving(false);

    await loadTrades();
  }

  function resetForm() {
    setForm({
      symbol: "",
      trade_type: "buy",
      quantity: "",
      price: "",
      trade_date:
        new Date()
          .toISOString()
          .slice(0, 16),
      notes: "",
    });
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function formatCurrency(
    value: number
  ) {
    return `₹${value.toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;
  }

  const totalTradeValue =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const buyTrades =
    trades.filter(
      (trade) =>
        trade.trade_type?.toLowerCase() ===
        "buy"
    );

  const sellTrades =
    trades.filter(
      (trade) =>
        trade.trade_type?.toLowerCase() ===
        "sell"
    );

  const totalBuyValue =
    buyTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const totalSellValue =
    sellTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const uniqueSymbols =
    new Set(
      trades.map(
        (trade) => trade.symbol
      )
    ).size;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          <TrendingUp size={20} />
          <span>
            Loading Trader Account...
          </span>
        </div>
      </main>
    );
  }

  /*
   * ROLE DIAGNOSTIC SCREEN
   *
   * If the account is not returning "trader",
   * we stop here instead of redirecting.
   */

  if (
    role.toLowerCase() !==
    "trader"
  ) {
    return (
      <main style={pageStyle}>
        <div style={diagnosticCard}>
          <Lock
            size={34}
            style={{
              marginBottom: "15px",
              opacity: 0.6,
            }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: "28px",
            }}
          >
            Trader Access Check
          </h1>

          <p
            style={{
              color:
                "rgba(255,255,255,0.5)",
              marginTop: "10px",
              lineHeight: 1.6,
            }}
          >
            This page is loading correctly,
            but the account does not currently
            have the required Trader role.
          </p>

          <div style={roleBox}>
            <span>
              Current role returned by Supabase
            </span>

            <strong>
              {role || "null"}
            </strong>
          </div>

          {error && (
            <div
              style={{
                marginTop: "15px",
                color: "#f87171",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              router.replace("/login")
            }
            style={{
              ...primaryButton,
              margin: "20px auto 0",
            }}
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <header style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>
              <TrendingUp size={15} />
              TRADEBISHI TRADER
            </div>

            <h1 style={titleStyle}>
              Welcome, {userName}
            </h1>

            <p style={subtitleStyle}>
              Manage and record your trading
              activity.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={secondaryButton}
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </header>

        {/* STATS */}

        <section style={statsGrid}>
          <Stat
            icon={
              <Activity size={18} />
            }
            title="Trades"
            value={trades.length.toString()}
          />

          <Stat
            icon={
              <Wallet size={18} />
            }
            title="Trade Volume"
            value={formatCurrency(
              totalTradeValue
            )}
          />

          <Stat
            icon={
              <BarChart3 size={18} />
            }
            title="Stocks Traded"
            value={uniqueSymbols.toString()}
          />

          <Stat
            icon={
              <Lock size={18} />
            }
            title="Access"
            value="Trader"
          />
        </section>

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Total Buy Value"
            value={formatCurrency(
              totalBuyValue
            )}
            subtitle={`${buyTrades.length} buy ${
              buyTrades.length === 1
                ? "trade"
                : "trades"
            }`}
            positive
          />

          <SummaryCard
            title="Total Sell Value"
            value={formatCurrency(
              totalSellValue
            )}
            subtitle={`${sellTrades.length} sell ${
              sellTrades.length === 1
                ? "trade"
                : "trades"
            }`}
          />
        </section>

        {/* TRADES */}

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>
                Trading Activity
              </h2>

              <p
                style={
                  sectionSubtitle
                }
              >
                All pooled trading activity
                is permanently recorded.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowModal(true);
              }}
              style={primaryButton}
            >
              <Plus size={18} />
              Record Trade
            </button>
          </div>

          {trades.length === 0 ? (
            <div style={emptyState}>
              <TrendingUp size={32} />

              <strong>
                No trades recorded yet.
              </strong>

              <p>
                Click "Record Trade" to
                add the first trade.
              </p>
            </div>
          ) : (
            <div
              style={
                tableWrapper
              }
            >
              <div
                style={
                  tableMinWidth
                }
              >
                <div
                  style={
                    tableHeader
                  }
                >
                  <span>
                    Symbol
                  </span>

                  <span>
                    Type
                  </span>

                  <span>
                    Quantity
                  </span>

                  <span>
                    Price
                  </span>

                  <span>
                    Total
                  </span>

                  <span>
                    Date
                  </span>
                </div>

                <div
                  style={
                    tradeList
                  }
                >
                  {trades.map(
                    (trade) => {
                      const isBuy =
                        trade.trade_type?.toLowerCase() ===
                        "buy";

                      return (
                        <div
                          key={
                            trade.id
                          }
                          style={
                            tradeRow
                          }
                        >
                          <strong>
                            {
                              trade.symbol
                            }
                          </strong>

                          <span
                            style={{
                              ...typeBadge,
                              background:
                                isBuy
                                  ? "rgba(52,211,153,0.1)"
                                  : "rgba(248,113,113,0.1)",
                              color:
                                isBuy
                                  ? "#34d399"
                                  : "#f87171",
                            }}
                          >
                            {
                              trade.trade_type
                            }
                          </span>

                          <span>
                            {Number(
                              trade.quantity
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>

                          <span>
                            {formatCurrency(
                              Number(
                                trade.price
                              )
                            )}
                          </span>

                          <strong>
                            {formatCurrency(
                              Number(
                                trade.total_amount
                              )
                            )}
                          </strong>

                          <span
                            style={
                              dateStyle
                            }
                          >
                            {new Date(
                              trade.trade_date
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SECURITY */}

        <div
          style={
            securityNotice
          }
        >
          <Lock size={16} />

          <span>
            Trader accounts can record
            trades but cannot modify or
            delete existing records.
          </span>
        </div>
      </div>

      {/* MODAL */}

      {showModal && (
        <div
          style={
            modalOverlay
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(
                false
              );
            }
          }}
        >
          <div
            style={
              modalCard
            }
          >
            <div
              style={
                modalHeader
              }
            >
              <div>
                <h3
                  style={
                    modalTitle
                  }
                >
                  Record Trade
                </h3>

                <p
                  style={
                    modalSubtitle
                  }
                >
                  Add a permanent
                  trading record.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(
                    false
                  );
                  setError("");
                }}
                style={
                  closeButton
                }
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              style={
                formStyle
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Stock Symbol
              </label>

              <input
                required
                placeholder="e.g. RELIANCE"
                value={
                  form.symbol
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    symbol:
                      event.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              <label
                style={
                  labelStyle
                }
              >
                Trade Type
              </label>

              <select
                value={
                  form.trade_type
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    trade_type:
                      event.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              >
                <option value="buy">
                  Buy
                </option>

                <option value="sell">
                  Sell
                </option>
              </select>

              <label
                style={
                  labelStyle
                }
              >
                Quantity
              </label>

              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Quantity"
                value={
                  form.quantity
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    quantity:
                      event.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              <label
                style={
                  labelStyle
                }
              >
                Price Per Unit
              </label>

              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Price"
                value={
                  form.price
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    price:
                      event.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              <label
                style={
                  labelStyle
                }
              >
                Trade Date
              </label>

              <input
                required
                type="datetime-local"
                value={
                  form.trade_date
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    trade_date:
                      event.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              <label
                style={
                  labelStyle
                }
              >
                Notes
              </label>

              <textarea
                rows={3}
                placeholder="Optional trade notes"
                value={
                  form.notes
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    notes:
                      event.target
                        .value,
                  })
                }
                style={{
                  ...inputStyle,
                  resize:
                    "vertical",
                }}
              />

              <div
                style={
                  totalBox
                }
              >
                <span
                  style={
                    totalLabel
                  }
                >
                  Total Trade Value
                </span>

                <strong
                  style={
                    totalValue
                  }
                >
                  {formatCurrency(
                    Number(
                      form.quantity ||
                        0
                    ) *
                      Number(
                        form.price ||
                          0
                      )
                  )}
                </strong>
              </div>

              {error && (
                <div
                  style={
                    modalError
                  }
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  saving
                }
                style={{
                  ...primaryButton,
                  justifyContent:
                    "center",
                  opacity:
                    saving
                      ? 0.6
                      : 1,
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
    </main>
  );
}

/* =========================
   COMPONENTS
========================= */

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
      style={
        statCard
      }
    >
      <div
        style={
          statHeader
        }
      >
        {icon}
        <span>
          {title}
        </span>
      </div>

      <strong
        style={
          statValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div
      style={
        summaryCard
      }
    >
      <span
        style={
          summaryLabel
        }
      >
        {title}
      </span>

      <strong
        style={{
          ...summaryValue,
          color: positive
            ? "#34d399"
            : "white",
        }}
      >
        {value}
      </strong>

      <span
        style={
          summarySubtitle
        }
      >
        {subtitle}
      </span>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #151515 0%, #050505 45%)",
  color: "white",
  padding: "35px 25px",
};

const containerStyle = {
  maxWidth: "1250px",
  margin: "0 auto",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  color: "rgba(255,255,255,0.5)",
};

const diagnosticCard = {
  width: "100%",
  maxWidth: "520px",
  margin: "120px auto",
  padding: "35px",
  borderRadius: "26px",
  background: "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  textAlign: "center" as const,
};

const roleBox = {
  marginTop: "25px",
  padding: "18px",
  borderRadius: "15px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "30px",
};

const eyebrowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "3px",
  fontWeight: 600,
};

const titleStyle = {
  margin: "10px 0 0",
  fontSize: "40px",
  letterSpacing: "-1.8px",
};

const subtitleStyle = {
  marginTop: "7px",
  color: "rgba(255,255,255,0.45)",
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const statCard = {
  padding: "21px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const statHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const statValue = {
  display: "block",
  marginTop: "9px",
  fontSize: "24px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "25px",
};

const summaryCard = {
  padding: "20px",
  borderRadius: "18px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const summaryLabel = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const summaryValue = {
  display: "block",
  marginTop: "7px",
  fontSize: "20px",
};

const summarySubtitle = {
  display: "block",
  marginTop: "4px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "12px",
};

const sectionStyle = {
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "26px",
  padding: "28px",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "25px",
};

const sectionTitle = {
  fontSize: "23px",
  fontWeight: 600,
  margin: 0,
};

const sectionSubtitle = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const primaryButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 17px",
  borderRadius: "13px",
  border: "none",
  background: "white",
  color: "black",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 16px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

const emptyState = {
  padding: "55px 20px",
  textAlign: "center" as const,
  color:
    "rgba(255,255,255,0.4)",
  background:
    "rgba(0,0,0,0.2)",
  borderRadius: "18px",
  border:
    "1px solid rgba(255,255,255,0.05)",
};

const tableWrapper = {
  overflowX: "auto" as const,
};

const tableMinWidth = {
  minWidth: "900px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "1.2fr 1fr 1fr 1.2fr 1.3fr 1.5fr",
  gap: "15px",
  padding:
    "0 17px 11px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
  textTransform:
    "uppercase" as const,
  letterSpacing:
    "0.07em",
};

const tradeList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "9px",
};

const tradeRow = {
  display: "grid",
  gridTemplateColumns:
    "1.2fr 1fr 1fr 1.2fr 1.3fr 1.5fr",
  gap: "15px",
  alignItems: "center",
  padding: "17px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.25)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const typeBadge = {
  display: "inline-flex",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: "8px",
  fontSize: "12px",
  fontWeight: 600,
  textTransform:
    "capitalize" as const,
};

const dateStyle = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const securityNotice = {
  marginTop: "20px",
  padding: "15px 18px",
  borderRadius: "15px",
  background:
    "rgba(255,255,255,0.03)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background:
    "rgba(0,0,0,0.78)",
  backdropFilter:
    "blur(14px)",
};

const modalCard = {
  width: "100%",
  maxWidth: "520px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: "30px",
  borderRadius: "25px",
  background: "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  color: "white",
};

const modalHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  marginBottom: "25px",
};

const modalTitle = {
  fontSize: "24px",
  margin: 0,
};

const modalSubtitle = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const formStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "14px",
};

const labelStyle = {
  color:
    "rgba(255,255,255,0.5)",
  fontSize: "12px",
  marginBottom: "-7px",
};

const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
  width: "100%",
  boxSizing:
    "border-box" as const,
};

const totalBox = {
  padding: "15px",
  borderRadius: "14px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const totalLabel = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const totalValue = {
  display: "block",
  marginTop: "5px",
  fontSize: "21px",
};

const modalError = {
  padding: "11px 13px",
  borderRadius: "10px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.15)",
  color: "#f87171",
  fontSize: "13px",
};

const closeButton = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};