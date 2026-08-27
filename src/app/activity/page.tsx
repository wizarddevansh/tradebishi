"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Transaction = {
  id: string;
  member_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
};

type Member = {
  id: string;
  full_name: string;
};

export default function CooperativeActivityPage() {
  const router = useRouter();

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadActivity();
  }, []);

  async function loadActivity() {
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
      router.replace("/login");
      return;
    }

    /*
      IMPORTANT:
      This page is for MEMBERS.

      Do NOT redirect members to /admin.

      Members can see cooperative-wide activity.
    */

    if (profile.role === "admin") {
      router.replace("/admin");
      return;
    }

    const [
      transactionsResult,
      membersResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, member_id, type, amount, description, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("members")
        .select("id, full_name")
        .order("full_name", {
          ascending: true,
        }),
    ]);

    if (transactionsResult.error) {
      setError(
        transactionsResult.error.message
      );
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setError(
        membersResult.error.message
      );
      setLoading(false);
      return;
    }

    setTransactions(
      (transactionsResult.data ??
        []) as Transaction[]
    );

    setMembers(
      (membersResult.data ??
        []) as Member[]
    );

    setLoading(false);
  }

  async function refreshActivity() {
    setRefreshing(true);

    await loadActivity();

    setRefreshing(false);
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function memberName(
    memberId: string | null
  ) {
    if (!memberId) {
      return "Cooperative";
    }

    const member = members.find(
      (item) => item.id === memberId
    );

    return member?.full_name || "Unknown Member";
  }

  function formatType(type: string) {
    return type
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  function isExpense(type: string) {
    return [
      "expense",
      "expenses",
    ].includes(type.toLowerCase());
  }

  function isDeposit(type: string) {
    return [
      "deposit",
      "deposits",
    ].includes(type.toLowerCase());
  }

  function isWithdrawal(type: string) {
    return [
      "withdrawal",
      "withdrawals",
    ].includes(type.toLowerCase());
  }

  const totalDeposits = transactions
    .filter((transaction) =>
      isDeposit(transaction.type)
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );

  const totalWithdrawals = transactions
    .filter((transaction) =>
      isWithdrawal(transaction.type)
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );

  const totalExpenses = transactions
    .filter((transaction) =>
      isExpense(transaction.type)
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading Cooperative Activity...
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
            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              style={backButton}
            >
              ← Dashboard
            </button>

            <p style={eyebrowStyle}>
              TRADEBISHI
            </p>

            <h1 style={titleStyle}>
              Cooperative Activity
            </h1>

            <p style={subtitleStyle}>
              Transparent record of deposits,
              withdrawals and cooperative expenses.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={refreshActivity}
              disabled={refreshing}
              style={secondaryButton}
            >
              <RefreshCw
                size={16}
                style={{
                  transform: refreshing
                    ? "rotate(360deg)"
                    : "none",
                  transition:
                    "transform 0.6s",
                }}
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={logout}
              style={secondaryButton}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Deposits"
            value={currency(totalDeposits)}
            icon={<ArrowDownLeft size={19} />}
          />

          <SummaryCard
            title="Withdrawals"
            value={currency(totalWithdrawals)}
            icon={<ArrowUpRight size={19} />}
          />

          <SummaryCard
            title="Expenses"
            value={currency(totalExpenses)}
            icon={<Receipt size={19} />}
          />

          <SummaryCard
            title="Total Records"
            value={transactions.length.toString()}
            icon={<Activity size={19} />}
          />
        </section>

        {/* ACTIVITY */}

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <div>
              <p style={cardLabel}>
                COOPERATIVE LEDGER
              </p>

              <h2 style={sectionTitle}>
                All Activity
              </h2>

              <p style={sectionSubtitle}>
                Every recorded cooperative transaction
                is visible to all members.
              </p>
            </div>

            <span style={recordCount}>
              {transactions.length} records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div style={emptyState}>
              <Activity size={32} />

              <p>
                No cooperative activity recorded
                yet.
              </p>
            </div>
          ) : (
            <div style={activityList}>
              {transactions.map(
                (transaction) => {
                  const expense = isExpense(
                    transaction.type
                  );

                  const withdrawal =
                    isWithdrawal(
                      transaction.type
                    );

                  const deposit = isDeposit(
                    transaction.type
                  );

                  return (
                    <div
                      key={transaction.id}
                      style={activityRow}
                    >
                      {/* ICON */}

                      <div
                        style={{
                          ...activityIcon,
                          background:
                            expense
                              ? "rgba(248,113,113,0.08)"
                              : withdrawal
                              ? "rgba(250,204,21,0.08)"
                              : "rgba(52,211,153,0.08)",
                          color:
                            expense
                              ? "#f87171"
                              : withdrawal
                              ? "#facc15"
                              : "#34d399",
                        }}
                      >
                        {expense ? (
                          <Receipt size={18} />
                        ) : withdrawal ? (
                          <ArrowUpRight
                            size={18}
                          />
                        ) : (
                          <ArrowDownLeft
                            size={18}
                          />
                        )}
                      </div>

                      {/* DETAILS */}

                      <div
                        style={
                          activityMain
                        }
                      >
                        <div
                          style={
                            activityTitleRow
                          }
                        >
                          <strong>
                            {formatType(
                              transaction.type
                            )}
                          </strong>

                          <span
                            style={{
                              ...statusBadge,
                              color:
                                transaction.status?.toLowerCase() ===
                                "completed"
                                  ? "#34d399"
                                  : transaction.status?.toLowerCase() ===
                                    "pending"
                                  ? "#facc15"
                                  : transaction.status?.toLowerCase() ===
                                    "rejected"
                                  ? "#f87171"
                                  : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {
                              transaction.status
                            }
                          </span>
                        </div>

                        <span
                          style={
                            descriptionText
                          }
                        >
                          {transaction.description ||
                            "No description"}
                        </span>

                        <span
                          style={
                            metaText
                          }
                        >
                          {expense ? (
                            <>
                              Expense •
                              Cooperative
                            </>
                          ) : (
                            <>
                              From{" "}
                              {memberName(
                                transaction.member_id
                              )}
                            </>
                          )}

                          {" • "}

                          {new Date(
                            transaction.created_at
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>

                      {/* AMOUNT */}

                      <div
                        style={
                          activityAmount
                        }
                      >
                        <strong
                          style={{
                            color:
                              expense ||
                              withdrawal
                                ? "#f87171"
                                : "#34d399",
                          }}
                        >
                          {expense ||
                          withdrawal
                            ? "-"
                            : "+"}
                          {currency(
                            Number(
                              transaction.amount
                            )
                          )}
                        </strong>

                        <span
                          style={
                            typeText
                          }
                        >
                          {formatType(
                            transaction.type
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <p style={footerStyle}>
          TradeBishi • Cooperative Transparency
        </p>
      </div>
    </main>
  );
}

/* =========================
   SUMMARY CARD
========================= */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={summaryCard}>
      <div style={summaryIcon}>
        {icon}
      </div>

      <p style={cardLabel}>
        {title}
      </p>

      <h2 style={summaryValue}>
        {value}
      </h2>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  padding: "35px 25px",
};

const containerStyle = {
  maxWidth: "1250px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  marginBottom: "30px",
};

const headerActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const backButton = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginBottom: "22px",
  padding: "8px 12px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
};

const eyebrowStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "4px",
  fontWeight: 600,
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: "38px",
  letterSpacing: "-1.5px",
};

const subtitleStyle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.45)",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 15px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

const errorBox = {
  marginBottom: "18px",
  padding: "14px 16px",
  borderRadius: "13px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.2)",
  color: "#f87171",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const summaryCard = {
  padding: "22px",
  borderRadius: "20px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.09)",
};

const summaryIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "18px",
};

const cardLabel = {
  margin: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "1.2px",
  textTransform: "uppercase" as const,
};

const summaryValue = {
  margin: "8px 0 0",
  fontSize: "25px",
};

const sectionStyle = {
  padding: "25px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "22px",
};

const sectionTitle = {
  margin: "7px 0 0",
  fontSize: "23px",
};

const sectionSubtitle = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
};

const recordCount = {
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "12px",
};

const activityList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const activityRow = {
  display: "grid",
  gridTemplateColumns:
    "42px 1fr auto",
  gap: "13px",
  alignItems: "center",
  padding: "15px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const activityIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const activityMain = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
};

const activityTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap" as const,
};

const statusBadge = {
  fontSize: "10px",
  textTransform:
    "capitalize" as const,
};

const descriptionText = {
  color:
    "rgba(255,255,255,0.55)",
  fontSize: "12px",
};

const metaText = {
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "10px",
};

const activityAmount = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: "4px",
  whiteSpace: "nowrap" as const,
};

const typeText = {
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "10px",
};

const emptyState = {
  minHeight: "250px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  color:
    "rgba(255,255,255,0.35)",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color:
    "rgba(255,255,255,0.5)",
};

const footerStyle = {
  marginTop: "24px",
  textAlign: "center" as const,
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "12px",
};