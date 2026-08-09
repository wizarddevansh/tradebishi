"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type DashboardStats = {
  totalMembers: number;
  totalDeposits: number;
  approvedCapital: number;
  pendingDeposits: number;
  totalInvested: number;
  currentPortfolio: number;
  profitLoss: number;
};

type RecentDeposit = {
  id: string;
  member_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  member_name: string;
};

type RecentInvestment = {
  id: string;
  member_id: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  updated_at: string;
  member_name: string;
};

type Member = {
  id: string;
  full_name: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");

  const [stats, setStats] =
    useState<DashboardStats>({
      totalMembers: 0,
      totalDeposits: 0,
      approvedCapital: 0,
      pendingDeposits: 0,
      totalInvested: 0,
      currentPortfolio: 0,
      profitLoss: 0,
    });

  const [recentDeposits, setRecentDeposits] =
    useState<RecentDeposit[]>([]);

  const [recentInvestments, setRecentInvestments] =
    useState<RecentInvestment[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const supabase = createClient();

    setError("");

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
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      router.replace("/");
      return;
    }

    setAdminName(profile.full_name || "Admin");

    const [
      membersResult,
      depositsResult,
      investmentsResult,
    ] = await Promise.all([
      supabase
        .from("members")
        .select("id, full_name"),

      supabase
        .from("deposits")
        .select(
          "id, member_id, amount, method, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("investments")
        .select(
          "id, member_id, invested_amount, current_value, profit_loss, updated_at"
        )
        .order("updated_at", {
          ascending: false,
        }),
    ]);

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }

    if (depositsResult.error) {
      setError(depositsResult.error.message);
      setLoading(false);
      return;
    }

    if (investmentsResult.error) {
      setError(investmentsResult.error.message);
      setLoading(false);
      return;
    }

    const members =
      (membersResult.data ?? []) as Member[];

    const deposits =
      depositsResult.data ?? [];

    const investments =
      investmentsResult.data ?? [];

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        member.full_name,
      ])
    );

    const totalDeposits = deposits.reduce(
      (sum, deposit) =>
        sum + Number(deposit.amount || 0),
      0
    );

    const approvedCapital = deposits
      .filter(
        (deposit) =>
          deposit.status?.toLowerCase() ===
          "approved"
      )
      .reduce(
        (sum, deposit) =>
          sum + Number(deposit.amount || 0),
        0
      );

    const pendingDeposits = deposits.filter(
      (deposit) =>
        deposit.status?.toLowerCase() ===
        "pending"
    ).length;

    const totalInvested = investments.reduce(
      (sum, investment) =>
        sum +
        Number(
          investment.invested_amount || 0
        ),
      0
    );

    const currentPortfolio =
      investments.reduce(
        (sum, investment) =>
          sum +
          Number(
            investment.current_value || 0
          ),
        0
      );

    const profitLoss = investments.reduce(
      (sum, investment) =>
        sum +
        Number(
          investment.profit_loss || 0
        ),
      0
    );

    const mappedDeposits =
      deposits
        .slice(0, 6)
        .map((deposit) => ({
          ...deposit,
          member_name:
            memberMap.get(
              deposit.member_id
            ) || "Unknown Member",
        }));

    const mappedInvestments =
      investments
        .slice(0, 6)
        .map((investment) => ({
          ...investment,
          member_name:
            memberMap.get(
              investment.member_id
            ) || "Unknown Member",
        }));

    setStats({
      totalMembers: members.length,
      totalDeposits,
      approvedCapital,
      pendingDeposits,
      totalInvested,
      currentPortfolio,
      profitLoss,
    });

    setRecentDeposits(
      mappedDeposits as RecentDeposit[]
    );

    setRecentInvestments(
      mappedInvestments as RecentInvestment[]
    );

    setLoading(false);
  }

  async function refreshDashboard() {
    setRefreshing(true);

    await loadDashboard();

    setRefreshing(false);
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function currency(value: number) {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  const profitPercent =
    stats.totalInvested > 0
      ? (stats.profitLoss /
          stats.totalInvested) *
        100
      : 0;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading Admin Dashboard...
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
            <p style={eyebrowStyle}>
              TRADEBISHI ADMIN
            </p>

            <h1 style={titleStyle}>
              Welcome, {adminName} 👋
            </h1>

            <p style={subtitleStyle}>
              Real-time financial overview of
              your operation.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={refreshDashboard}
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

        {/* PRIMARY FINANCIAL CARDS */}

        <section style={primaryGrid}>
          <FinancialCard
            title="Approved Capital"
            value={currency(
              stats.approvedCapital
            )}
            subtitle="Successfully approved deposits"
            icon={<Wallet size={20} />}
          />

          <FinancialCard
            title="Total Invested"
            value={currency(
              stats.totalInvested
            )}
            subtitle="Capital currently invested"
            icon={<TrendingUp size={20} />}
          />

          <FinancialCard
            title="Current Portfolio"
            value={currency(
              stats.currentPortfolio
            )}
            subtitle="Current investment value"
            icon={<Activity size={20} />}
          />

          <FinancialCard
            title="Members"
            value={stats.totalMembers.toString()}
            subtitle="Registered members"
            icon={<Users size={20} />}
          />
        </section>

        {/* PERFORMANCE */}

        <section style={performanceCard}>
          <div>
            <p style={cardLabel}>
              PORTFOLIO PERFORMANCE
            </p>

            <h2 style={performanceValue}>
              {stats.profitLoss >= 0
                ? "+"
                : "-"}
              {currency(
                Math.abs(stats.profitLoss)
              )}
            </h2>

            <div style={returnBadge}>
              {stats.profitLoss >= 0 ? (
                <ArrowUpRight size={15} />
              ) : (
                <ArrowDownRight size={15} />
              )}

              {Math.abs(
                profitPercent
              ).toFixed(2)}
              % return
            </div>
          </div>

          <div style={performanceRight}>
            <p style={smallLabel}>
              INVESTED
            </p>

            <strong>
              {currency(
                stats.totalInvested
              )}
            </strong>

            <p
              style={{
                ...smallLabel,
                marginTop: "14px",
              }}
            >
              CURRENT VALUE
            </p>

            <strong>
              {currency(
                stats.currentPortfolio
              )}
            </strong>
          </div>
        </section>

        {/* SECONDARY STATS */}

        <section style={secondaryGrid}>
          <InfoCard
            title="Total Deposits"
            value={currency(
              stats.totalDeposits
            )}
            icon={<Wallet size={18} />}
          />

          <InfoCard
            title="Pending Deposits"
            value={stats.pendingDeposits.toString()}
            icon={<Clock size={18} />}
            warning={
              stats.pendingDeposits > 0
            }
          />

          <InfoCard
            title="Investment P/L"
            value={
              (stats.profitLoss >= 0
                ? "+"
                : "-") +
              currency(
                Math.abs(stats.profitLoss)
              )
            }
            icon={<TrendingUp size={18} />}
            positive={
              stats.profitLoss >= 0
            }
          />
        </section>

        {/* RECENT ACTIVITY */}

        <section style={activitySection}>
          <div style={activityHeader}>
            <div>
              <p style={cardLabel}>
                LIVE ACTIVITY
              </p>

              <h2 style={sectionTitle}>
                Recent Activity
              </h2>
            </div>

            <span style={liveIndicator}>
              <span style={liveDot} />
              Live Data
            </span>
          </div>

          <div style={activityGrid}>

            {/* RECENT DEPOSITS */}

            <div style={activityPanel}>
              <div style={panelHeader}>
                <div>
                  <h3 style={panelTitle}>
                    Recent Deposits
                  </h3>

                  <p style={panelSubtitle}>
                    Latest capital requests
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/deposits"
                    )
                  }
                  style={viewButton}
                >
                  View all
                </button>
              </div>

              {recentDeposits.length ===
              0 ? (
                <div style={emptyActivity}>
                  No deposits yet.
                </div>
              ) : (
                <div style={activityList}>
                  {recentDeposits.map(
                    (deposit) => (
                      <div
                        key={deposit.id}
                        style={activityRow}
                      >
                        <div
                          style={activityIcon}
                        >
                          <Wallet size={16} />
                        </div>

                        <div
                          style={
                            activityMain
                          }
                        >
                          <strong>
                            {
                              deposit.member_name
                            }
                          </strong>

                          <span>
                            {deposit.method}
                            {" • "}
                            {new Date(
                              deposit.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <div
                          style={
                            activityAmount
                          }
                        >
                          <strong>
                            {currency(
                              Number(
                                deposit.amount
                              )
                            )}
                          </strong>

                          <span
                            style={{
                              color:
                                deposit.status?.toLowerCase() ===
                                "approved"
                                  ? "#34d399"
                                  : deposit.status?.toLowerCase() ===
                                    "rejected"
                                  ? "#f87171"
                                  : "#facc15",
                            }}
                          >
                            {deposit.status}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* RECENT INVESTMENTS */}

            <div style={activityPanel}>
              <div style={panelHeader}>
                <div>
                  <h3 style={panelTitle}>
                    Recent Investments
                  </h3>

                  <p style={panelSubtitle}>
                    Latest portfolio updates
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/admin/investments"
                    )
                  }
                  style={viewButton}
                >
                  View all
                </button>
              </div>

              {recentInvestments.length ===
              0 ? (
                <div style={emptyActivity}>
                  No investments yet.
                </div>
              ) : (
                <div style={activityList}>
                  {recentInvestments.map(
                    (investment) => {
                      const positive =
                        Number(
                          investment.profit_loss
                        ) >= 0;

                      return (
                        <div
                          key={investment.id}
                          style={activityRow}
                        >
                          <div
                            style={activityIcon}
                          >
                            <TrendingUp
                              size={16}
                            />
                          </div>

                          <div
                            style={
                              activityMain
                            }
                          >
                            <strong>
                              {
                                investment.member_name
                              }
                            </strong>

                            <span>
                              Updated{" "}
                              {new Date(
                                investment.updated_at
                              ).toLocaleDateString(
                                "en-IN"
                              )}
                            </span>
                          </div>

                          <div
                            style={
                              activityAmount
                            }
                          >
                            <strong>
                              {currency(
                                Number(
                                  investment.current_value
                                )
                              )}
                            </strong>

                            <span
                              style={{
                                color:
                                  positive
                                    ? "#34d399"
                                    : "#f87171",
                              }}
                            >
                              {positive
                                ? "+"
                                : "-"}
                              {currency(
                                Math.abs(
                                  Number(
                                    investment.profit_loss
                                  )
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ADMIN MANAGEMENT */}

        <section style={quickSection}>
          <p style={cardLabel}>
            ADMIN MANAGEMENT
          </p>

          <div style={quickGrid}>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/members"
                )
              }
              style={quickButton}
            >
              <Users size={18} />
              Manage Members
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/deposits"
                )
              }
              style={quickButton}
            >
              <Wallet size={18} />
              Manage Deposits
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/investments"
                )
              }
              style={quickButton}
            >
              <TrendingUp size={18} />
              Manage Investments
            </button>
          </div>
        </section>

        <p style={footerStyle}>
          TradeBishi • Admin Control Center
        </p>
      </div>
    </main>
  );
}

function FinancialCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={financialCard}>
      <div style={iconBox}>
        {icon}
      </div>

      <p style={cardLabel}>
        {title}
      </p>

      <h2 style={financialValue}>
        {value}
      </h2>

      <p style={cardSubtitle}>
        {subtitle}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
  icon,
  warning,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  warning?: boolean;
  positive?: boolean;
}) {
  return (
    <div style={infoCard}>
      <div style={infoTop}>
        <span style={cardLabel}>
          {title}
        </span>

        <span
          style={{
            color: warning
              ? "#facc15"
              : positive
              ? "#34d399"
              : "rgba(255,255,255,0.55)",
          }}
        >
          {icon}
        </span>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "14px",
          fontSize: "22px",
          color: warning
            ? "#facc15"
            : positive
            ? "#34d399"
            : "white",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  padding: "35px 25px",
};

const containerStyle = {
  maxWidth: "1350px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "32px",
};

const headerActions = {
  display: "flex",
  gap: "10px",
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

const primaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
};

const financialCard = {
  padding: "24px",
  borderRadius: "22px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(20px)",
};

const iconBox = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "18px",
};

const cardLabel = {
  margin: 0,
  color: "rgba(255,255,255,0.42)",
  fontSize: "10px",
  letterSpacing: "1.3px",
  textTransform: "uppercase" as const,
};

const financialValue = {
  margin: "8px 0 0",
  fontSize: "27px",
  letterSpacing: "-0.8px",
};

const cardSubtitle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.3)",
  fontSize: "12px",
};

const performanceCard = {
  marginTop: "18px",
  padding: "28px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(255,255,255,0.035))",
  border:
    "1px solid rgba(255,255,255,0.09)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const performanceValue = {
  margin: "10px 0 0",
  fontSize: "36px",
  letterSpacing: "-1px",
};

const returnBadge = {
  marginTop: "10px",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  color: "#34d399",
  fontSize: "13px",
  fontWeight: 600,
};

const performanceRight = {
  textAlign: "right" as const,
};

const smallLabel = {
  color: "rgba(255,255,255,0.35)",
  fontSize: "10px",
  letterSpacing: "1px",
  marginBottom: "4px",
};

const secondaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "16px",
  marginTop: "18px",
};

const infoCard = {
  padding: "22px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const infoTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const activitySection = {
  marginTop: "18px",
  padding: "26px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const activityHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const sectionTitle = {
  marginTop: "7px",
  fontSize: "23px",
};

const liveIndicator = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "8px 11px",
  borderRadius: "20px",
  background:
    "rgba(52,211,153,0.08)",
  border:
    "1px solid rgba(52,211,153,0.15)",
  color: "#34d399",
  fontSize: "11px",
};

const liveDot = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "#34d399",
};

const activityGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "16px",
};

const activityPanel = {
  padding: "20px",
  borderRadius: "19px",
  background:
    "rgba(0,0,0,0.18)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "15px",
};

const panelTitle = {
  margin: 0,
  fontSize: "16px",
};

const panelSubtitle = {
  marginTop: "4px",
  color: "rgba(255,255,255,0.3)",
  fontSize: "11px",
};

const viewButton = {
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.55)",
  cursor: "pointer",
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
    "36px 1fr auto",
  alignItems: "center",
  gap: "11px",
  padding: "12px",
  borderRadius: "13px",
  background:
    "rgba(255,255,255,0.035)",
};

const activityIcon = {
  width: "36px",
  height: "36px",
  borderRadius: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.06)",
};

const activityMain = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "4px",
  minWidth: 0,
};

const activityAmount = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end",
  gap: "4px",
  fontSize: "12px",
};

const emptyActivity = {
  padding: "35px 10px",
  textAlign: "center" as const,
  color: "rgba(255,255,255,0.3)",
  fontSize: "13px",
};

const quickSection = {
  marginTop: "18px",
  padding: "24px",
  borderRadius: "22px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const quickGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginTop: "16px",
};

const quickButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  padding: "14px",
  borderRadius: "14px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
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

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.5)",
};

const footerStyle = {
  marginTop: "24px",
  textAlign: "center" as const,
  color: "rgba(255,255,255,0.3)",
  fontSize: "12px",
};