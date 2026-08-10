"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  LogOut,
  Lock,
  Wallet,
  BarChart3,
  Activity,
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

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: string;
};

export default function MemberDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Member");
  const [member, setMember] = useState<Member | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMember();
  }, []);

  async function loadMember() {
    const supabase = createClient();

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      /*
       * First try to find the user's profile.
       *
       * Profiles table:
       * id = auth.users.id
       * role = admin / trader / member
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      /*
       * IMPORTANT:
       *
       * A member may have an Auth account and members row
       * even if the profiles row was not created.
       *
       * Therefore, missing profile is NOT immediately fatal.
       */

      if (profileError) {
        console.error(
          "Profile lookup error:",
          profileError
        );
      }

      if (profile) {
        if (
          profile.role !== "member"
        ) {
          router.replace("/");
          return;
        }

        setUserName(
          profile.full_name ||
            user.email ||
            "Member"
        );
      }

      /*
       * Find member record using Auth user ID.
       */
      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("members")
        .select(
          "id, full_name, phone, investment_amount, profit_share, status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error(
          "Member lookup error:",
          memberError
        );

        setError(
          "Unable to load your member account."
        );

        setLoading(false);
        return;
      }

      /*
       * The member record is the important source
       * for the member dashboard.
       */
      if (!memberData) {
        setError(
          "Your member account could not be found. Please contact the administrator."
        );

        setLoading(false);
        return;
      }

      /*
       * If there is no profile, we can still use
       * the member's full name.
       */
      if (!profile) {
        setUserName(
          memberData.full_name ||
            user.email ||
            "Member"
        );
      }

      /*
       * Check account status.
       */
      if (
        memberData.status !== "active"
      ) {
        setError(
          "Your member account is not active. Please contact the administrator."
        );

        setLoading(false);
        return;
      }

      setMember(
        memberData as Member
      );

      /*
       * Load pooled trades.
       */
      const {
        data: tradeData,
        error: tradeError,
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

      if (tradeError) {
        console.error(
          "Trade loading error:",
          tradeError
        );

        setError(
          "Unable to load pooled trading activity."
        );
      } else {
        setTrades(
          (tradeData ?? []) as Trade[]
        );
      }
    } catch (error) {
      console.error(
        "Member dashboard error:",
        error
      );

      setError(
        "Something went wrong while loading your account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function formatCurrency(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
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
        trade.trade_type
          .toLowerCase() === "buy"
    );

  const sellTrades =
    trades.filter(
      (trade) =>
        trade.trade_type
          .toLowerCase() === "sell"
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
      <main style={loadingStyle}>
        Loading Member Account...
      </main>
    );
  }

  if (error && !member) {
    return (
      <main style={loadingStyle}>
        <div
          style={{
            maxWidth: "500px",
            textAlign: "center",
            padding: "30px",
          }}
        >
          <Lock
            size={32}
            style={{
              marginBottom: "15px",
            }}
          />

          <h2>{error}</h2>

          <button
            onClick={() =>
              router.replace("/login")
            }
            style={primaryButton}
          >
            Back to Login
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
              TradeBishi Member
            </div>

            <h1 style={titleStyle}>
              Welcome, {userName}
            </h1>

            <p style={subtitleStyle}>
              View your investment and
              pooled trading activity.
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            style={logoutButton}
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </header>

        {/* MEMBER OVERVIEW */}

        <div style={statsGrid}>

          <Stat
            icon={<Wallet size={18} />}
            title="Your Investment"
            value={formatCurrency(
              Number(
                member?.investment_amount ||
                  0
              )
            )}
          />

          <Stat
            icon={<BarChart3 size={18} />}
            title="Profit Share"
            value={`${Number(
              member?.profit_share || 0
            ).toFixed(2)}%`}
          />

          <Stat
            icon={<Activity size={18} />}
            title="Pooled Trades"
            value={trades.length.toString()}
          />

          <Stat
            icon={<TrendingUp size={18} />}
            title="Trade Volume"
            value={formatCurrency(
              totalTradeValue
            )}
          />

        </div>

        {/* BUY / SELL */}

        <div style={summaryGrid}>

          <SummaryCard
            icon={
              <ArrowUpRight size={17} />
            }
            title="Pooled Buy Value"
            value={formatCurrency(
              totalBuyValue
            )}
            subtitle={`${buyTrades.length} ${
              buyTrades.length === 1
                ? "buy"
                : "buys"
            }`}
            positive
          />

          <SummaryCard
            icon={
              <ArrowDownRight size={17} />
            }
            title="Pooled Sell Value"
            value={formatCurrency(
              totalSellValue
            )}
            subtitle={`${sellTrades.length} ${
              sellTrades.length === 1
                ? "sell"
                : "sells"
            }`}
          />

          <SummaryCard
            icon={
              <BarChart3 size={17} />
            }
            title="Stocks Traded"
            value={uniqueSymbols.toString()}
            subtitle="Unique symbols"
          />

        </div>

        {/* MEMBER ACCOUNT */}

        <section style={sectionStyle}>
          <div
            style={sectionHeaderStyle}
          >
            <div>
              <h2 style={sectionTitle}>
                Your Account
              </h2>

              <p
                style={sectionSubtitle}
              >
                Your cooperative
                investment information.
              </p>
            </div>

            <span
              style={{
                padding: "7px 11px",
                borderRadius: "10px",
                background:
                  member?.status ===
                  "active"
                    ? "rgba(52,211,153,0.1)"
                    : "rgba(248,113,113,0.1)",
                color:
                  member?.status ===
                  "active"
                    ? "#34d399"
                    : "#f87171",
                fontSize: "12px",
                fontWeight: 600,
                textTransform:
                  "capitalize",
              }}
            >
              {member?.status}
            </span>
          </div>

          <div style={accountGrid}>

            <AccountItem
              label="Member Name"
              value={
                member?.full_name ||
                userName
              }
            />

            <AccountItem
              label="Phone"
              value={
                member?.phone ||
                "Not provided"
              }
            />

            <AccountItem
              label="Investment"
              value={formatCurrency(
                Number(
                  member?.investment_amount ||
                    0
                )
              )}
            />

            <AccountItem
              label="Profit Share"
              value={`${Number(
                member?.profit_share ||
                  0
              ).toFixed(2)}%`}
            />

          </div>
        </section>

        {/* POOLED TRADES */}

        <section style={sectionStyle}>

          <div
            style={sectionHeaderStyle}
          >
            <div>
              <h2 style={sectionTitle}>
                Pooled Trades
              </h2>

              <p
                style={sectionSubtitle}
              >
                Trades executed on behalf
                of the cooperative pool.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                color:
                  "rgba(255,255,255,0.35)",
                fontSize: "12px",
              }}
            >
              <Lock size={14} />
              Read Only
            </div>
          </div>

          {trades.length === 0 ? (
            <div style={emptyState}>
              <TrendingUp
                size={30}
                style={{
                  marginBottom: "10px",
                  opacity: 0.5,
                }}
              />

              <div>
                No pooled trades have
                been recorded yet.
              </div>

              <p
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  opacity: 0.7,
                }}
              >
                Trading activity will
                appear here when your
                trader records a trade.
              </p>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  minWidth: "900px",
                }}
              >

                <div
                  style={tableHeader}
                >
                  <span>Symbol</span>
                  <span>Type</span>
                  <span>Quantity</span>
                  <span>Price</span>
                  <span>Total</span>
                  <span>Date</span>
                </div>

                <div style={tradeList}>

                  {trades.map(
                    (trade) => {
                      const isBuy =
                        trade.trade_type
                          .toLowerCase() ===
                        "buy";

                      return (
                        <div
                          key={trade.id}
                          style={tradeRow}
                        >

                          <strong>
                            {trade.symbol}
                          </strong>

                          <span
                            style={{
                              display:
                                "inline-flex",
                              width:
                                "fit-content",
                              padding:
                                "5px 9px",
                              borderRadius:
                                "8px",
                              background:
                                isBuy
                                  ? "rgba(52,211,153,0.1)"
                                  : "rgba(248,113,113,0.1)",
                              color:
                                isBuy
                                  ? "#34d399"
                                  : "#f87171",
                              fontSize:
                                "12px",
                              fontWeight:
                                600,
                              textTransform:
                                "capitalize",
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
                            style={{
                              color:
                                "rgba(255,255,255,0.4)",
                              fontSize:
                                "12px",
                            }}
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

        {/* SECURITY NOTICE */}

        <div
          style={securityNotice}
        >
          <Lock size={16} />

          <span>
            Your account is read-only.
            You can view cooperative
            trading activity but cannot
            create, modify, or delete
            trades.
          </span>
        </div>

      </div>
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
    <div style={statCard}>
      <div style={statLabel}>
        {icon}
        {title}
      </div>

      <h2 style={statValue}>
        {value}
      </h2>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  positive = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div style={summaryCard}>
      <div style={statLabel}>
        {icon}
        {title}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "8px",
          fontSize: "21px",
          color: positive
            ? "#34d399"
            : "white",
        }}
      >
        {value}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: "4px",
          color:
            "rgba(255,255,255,0.3)",
          fontSize: "12px",
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}

function AccountItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        background:
          "rgba(255,255,255,0.035)",
        border:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{
          display: "block",
          color:
            "rgba(255,255,255,0.35)",
          fontSize: "11px",
          textTransform:
            "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "6px",
          fontSize: "14px",
        }}
      >
        {value}
      </strong>
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
  padding: "30px",
};

const containerStyle = {
  maxWidth: "1250px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "35px",
  gap: "20px",
};

const eyebrowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "12px",
  letterSpacing: "3px",
  textTransform:
    "uppercase" as const,
};

const titleStyle = {
  fontSize: "40px",
  margin: "10px 0 0",
  letterSpacing: "-1.8px",
};

const subtitleStyle = {
  color:
    "rgba(255,255,255,0.45)",
  marginTop: "7px",
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "25px",
};

const statCard = {
  padding: "21px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const statLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const statValue = {
  marginTop: "9px",
  fontSize: "24px",
  letterSpacing: "-0.5px",
};

const summaryCard = {
  padding: "20px",
  borderRadius: "18px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const sectionStyle = {
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "26px",
  padding: "28px",
  backdropFilter: "blur(20px)",
  marginBottom: "20px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
  gap: "15px",
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

const accountGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "1.2fr 1fr 1fr 1.2fr 1.3fr 1.5fr",
  gap: "15px",
  padding: "0 17px 11px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
  textTransform:
    "uppercase" as const,
  letterSpacing: "0.07em",
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

const emptyState = {
  padding: "50px 20px",
  textAlign:
    "center" as const,
  color:
    "rgba(255,255,255,0.4)",
  background:
    "rgba(0,0,0,0.2)",
  borderRadius: "18px",
  border:
    "1px solid rgba(255,255,255,0.05)",
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

const primaryButton = {
  marginTop: "20px",
  display: "inline-flex",
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

const logoutButton = {
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

const loadingStyle = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};