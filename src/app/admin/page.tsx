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
  Receipt,
  ChevronRight,
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
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalExpenses: number;
};

type ActivityItem = {
  id: string;
  member_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  member_name: string | null;
};

type Member = {
  id: string;
  full_name: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("Admin");

  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalDeposits: 0,
    approvedCapital: 0,
    pendingDeposits: 0,
    totalInvested: 0,
    currentPortfolio: 0,
    profitLoss: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalExpenses: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function getAdmin() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error || !profile || profile.role !== "admin") {
      router.replace("/");
      return null;
    }

    return {
      user,
      profile,
    };
  }

  async function loadDashboard() {
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setLoading(false);
      return;
    }

    setAdminName(admin.profile.full_name || "Admin");

    const [
      membersResult,
      depositsResult,
      investmentsResult,
      transactionsResult,
      withdrawalsResult,
    ] = await Promise.all([
      supabase
        .from("members")
        .select("id, full_name"),

      supabase
        .from("deposits")
        .select("id, member_id, amount, status, created_at")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("investments")
        .select(
          "id, member_id, invested_amount, current_value, profit_loss, updated_at"
        ),

      supabase
        .from("transactions")
        .select(
          "id, member_id, type, amount, description, status, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100),

      supabase
        .from("withdrawals")
        .select("id, member_id, amount, status, created_at")
        .order("created_at", {
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

    if (transactionsResult.error) {
      setError(transactionsResult.error.message);
      setLoading(false);
      return;
    }

    if (withdrawalsResult.error) {
      setError(withdrawalsResult.error.message);
      setLoading(false);
      return;
    }

    const members = (membersResult.data ?? []) as Member[];

    const deposits = depositsResult.data ?? [];
    const investments = investmentsResult.data ?? [];
    const transactions = transactionsResult.data ?? [];
    const withdrawals = withdrawalsResult.data ?? [];

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        member.full_name,
      ])
    );

    const approvedCapital = deposits
      .filter(
        (item) =>
          item.status?.toLowerCase() === "approved"
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

    const totalDeposits = deposits.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const pendingDeposits = deposits.filter(
      (item) =>
        item.status?.toLowerCase() === "pending"
    ).length;

    const totalInvested = investments.reduce(
      (sum, item) =>
        sum + Number(item.invested_amount || 0),
      0
    );

    const currentPortfolio = investments.reduce(
      (sum, item) =>
        sum + Number(item.current_value || 0),
      0
    );

    const profitLoss = investments.reduce(
      (sum, item) =>
        sum + Number(item.profit_loss || 0),
      0
    );

    const totalWithdrawals = withdrawals
      .filter(
        (item) =>
          item.status?.toLowerCase() === "approved"
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

    const pendingWithdrawals = withdrawals.filter(
      (item) =>
        item.status?.toLowerCase() === "pending"
    ).length;

    const totalExpenses = transactions
      .filter(
        (item) =>
          item.type?.toLowerCase() === "expense" &&
          item.status?.toLowerCase() !== "cancelled"
      )
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

    const mappedActivities: ActivityItem[] =
      transactions.map((item) => ({
        ...item,
        amount: Number(item.amount || 0),
        member_name: item.member_id
          ? memberMap.get(item.member_id) ||
            "Unknown Member"
          : null,
      }));

    setStats({
      totalMembers: members.length,
      totalDeposits,
      approvedCapital,
      pendingDeposits,
      totalInvested,
      currentPortfolio,
      profitLoss,
      totalWithdrawals,
      pendingWithdrawals,
      totalExpenses,
    });

    setActivities(mappedActivities.slice(0, 8));

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
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function activityLabel(activity: ActivityItem) {
    const type = activity.type?.toLowerCase();

    if (type === "expense") {
      return "Cooperative Expense";
    }

    if (type === "deposit") {
      return "Member Deposit";
    }

    if (type === "withdrawal") {
      return "Member Withdrawal";
    }

    return activity.type || "Activity";
  }

  function activitySource(activity: ActivityItem) {
    const type = activity.type?.toLowerCase();

    if (type === "expense") {
      return "Cooperative";
    }

    if (activity.member_name) {
      return activity.member_name;
    }

    return "Cooperative";
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
          <RefreshCw
            size={18}
            style={{
              animation:
                "adminSpin 1s linear infinite",
            }}
          />
          <span>
            Loading Admin Dashboard...
          </span>
        </div>

        <style jsx global>{`
          @keyframes adminSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>

        {/* HEADER */}

        <header className="admin-header">
          <div style={{ minWidth: 0 }}>
            <p style={eyebrowStyle}>
              TRADEBISHI ADMIN
            </p>

            <h1 className="admin-title">
              Welcome, {adminName} 👋
            </h1>

            <p style={subtitleStyle}>
              Complete cooperative financial
              overview.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={refreshing}
              style={{
                ...secondaryButton,
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: refreshing
                    ? "adminSpin 1s linear infinite"
                    : "none",
                }}
              />

              <span>
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              style={secondaryButton}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        {/* MAIN FINANCIAL STATS */}

        <section className="admin-primary-grid">
          <FinancialCard
            title="Approved Capital"
            value={currency(
              stats.approvedCapital
            )}
            subtitle="Approved member deposits"
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

        <section
          className="admin-performance-card"
          style={performanceCard}
        >
          <div>
            <p style={cardLabel}>
              PORTFOLIO PERFORMANCE
            </p>

            <h2
              className="admin-performance-value"
              style={performanceValue}
            >
              {stats.profitLoss >= 0
                ? "+"
                : "-"}
              {currency(
                Math.abs(
                  stats.profitLoss
                )
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

          <div
            className="admin-performance-right"
            style={performanceRight}
          >
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

        <section className="admin-secondary-grid">
          <InfoCard
            title="Pending Deposits"
            value={stats.pendingDeposits.toString()}
            icon={<Clock size={18} />}
            warning={
              stats.pendingDeposits > 0
            }
          />

          <InfoCard
            title="Pending Withdrawals"
            value={stats.pendingWithdrawals.toString()}
            icon={<ArrowDownRight size={18} />}
            warning={
              stats.pendingWithdrawals > 0
            }
          />

          <InfoCard
            title="Cooperative Expenses"
            value={currency(
              stats.totalExpenses
            )}
            icon={<Receipt size={18} />}
          />
        </section>

        {/* ACTIVITY */}

        <section style={activitySection}>
          <div
            className="admin-activity-header"
            style={activityHeader}
          >
            <div style={{ minWidth: 0 }}>
              <p style={cardLabel}>
                COOPERATIVE ACTIVITY
              </p>

              <h2 style={sectionTitle}>
                Recent Activity
              </h2>

              <p style={sectionSubtitle}>
                Deposits, withdrawals,
                expenses and other
                cooperative transactions.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/activity"
                )
              }
              style={viewAllButton}
            >
              <span>View All</span>
              <ChevronRight size={15} />
            </button>
          </div>

          {activities.length === 0 ? (
            <div style={emptyActivity}>
              <Activity size={28} />
              <p>
                No cooperative activity yet.
              </p>
            </div>
          ) : (
            <div style={activityList}>
              {activities.map(
                (activity) => {
                  const type =
                    activity.type?.toLowerCase();

                  const isExpense =
                    type === "expense";

                  const isWithdrawal =
                    type ===
                    "withdrawal";

                  const negative =
                    isExpense ||
                    isWithdrawal;

                  return (
                    <div
                      key={activity.id}
                      className="admin-activity-row"
                      style={activityRow}
                    >
                      <div style={activityIcon}>
                        {isExpense ? (
                          <Receipt size={17} />
                        ) : isWithdrawal ? (
                          <ArrowDownRight
                            size={17}
                          />
                        ) : (
                          <ArrowUpRight
                            size={17}
                          />
                        )}
                      </div>

                      <div
                        style={
                          activityMain
                        }
                      >
                        <strong>
                          {activityLabel(
                            activity
                          )}
                        </strong>

                        <span>
                          {activitySource(
                            activity
                          )}
                          {" • "}
                          {activity.description ||
                            "No description"}
                        </span>

                        <small>
                          {new Date(
                            activity.created_at
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </small>
                      </div>

                      <div
                        style={
                          activityAmount
                        }
                      >
                        <strong
                          style={{
                            color: negative
                              ? "#f87171"
                              : "#34d399",
                          }}
                        >
                          {negative
                            ? "-"
                            : "+"}
                          {currency(
                            activity.amount
                          )}
                        </strong>

                        <span>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ADMIN MANAGEMENT */}

        <section style={quickSection}>
          <p style={cardLabel}>
            ADMIN MANAGEMENT
          </p>

          <div className="admin-quick-grid">
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
                  "/admin/withdrawals"
                )
              }
              style={quickButton}
            >
              <ArrowDownRight size={18} />
              Manage Withdrawals
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

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/activity"
                )
              }
              style={quickButton}
            >
              <Activity size={18} />
              Cooperative Activity
            </button>
          </div>
        </section>

        <p style={footerStyle}>
          TradeBishi • Admin Control Center
        </p>
      </div>

      {/* RESPONSIVE CSS */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          overflow-x: hidden;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 32px;
        }

        .admin-title {
          margin: 8px 0 0;
          font-size: 38px;
          letter-spacing: -1.5px;
          line-height: 1.12;
        }

        .admin-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        .admin-primary-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 16px;
        }

        .admin-secondary-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 16px;
          margin-top: 18px;
        }

        .admin-performance-value {
          word-break: break-word;
        }

        .admin-performance-right {
          flex-shrink: 0;
        }

        .admin-activity-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 15px;
        }

        .admin-activity-row {
          grid-template-columns: 40px minmax(
              0,
              1fr
            ) auto !important;
        }

        .admin-quick-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 12px;
          margin-top: 16px;
        }

        /* TABLET */

        @media (max-width: 1050px) {
          .admin-primary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .admin-secondary-grid {
            grid-template-columns: repeat(
              3,
              minmax(0, 1fr)
            );
          }

          .admin-quick-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }

        /* SMALL TABLET / LARGE PHONE */

        @media (max-width: 760px) {
          .admin-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .admin-header-actions {
            width: 100%;
          }

          .admin-header-actions button {
            flex: 1;
            justify-content: center;
          }

          .admin-title {
            font-size: 32px;
          }

          .admin-primary-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }

          .admin-secondary-grid {
            grid-template-columns: 1fr;
          }

          .admin-performance-card {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 25px;
          }

          .admin-performance-right {
            width: 100%;
            text-align: left !important;
            display: grid;
            grid-template-columns: 1fr 1fr;
            column-gap: 20px;
          }

          .admin-performance-right p {
            margin-bottom: 4px !important;
          }

          .admin-performance-right strong {
            font-size: 17px;
          }

          .admin-performance-right p:nth-of-type(2) {
            margin-top: 0 !important;
          }

          .admin-quick-grid {
            grid-template-columns: 1fr;
          }
        }

        /* MOBILE */

        @media (max-width: 560px) {
          .admin-title {
            font-size: 28px;
            letter-spacing: -1px;
          }

          .admin-header-actions {
            flex-direction: column;
          }

          .admin-header-actions button {
            width: 100%;
          }

          .admin-primary-grid {
            grid-template-columns: 1fr;
          }

          .admin-performance-card {
            padding: 22px !important;
          }

          .admin-performance-value {
            font-size: 30px !important;
          }

          .admin-performance-right {
            grid-template-columns: 1fr 1fr;
          }

          .admin-activity-header {
            flex-direction: column;
          }

          .admin-activity-header button {
            width: 100%;
            justify-content: center;
          }

          .admin-activity-row {
            grid-template-columns: 36px minmax(
                0,
                1fr
              ) !important;
            position: relative;
            padding: 13px !important;
          }

          .admin-activity-row > div:first-child {
            width: 36px;
            height: 36px;
          }

          .admin-activity-row
            > div:last-child {
            grid-column: 2;
            align-items: flex-start !important;
            margin-top: 5px;
          }

          .admin-activity-row
            > div:last-child
            strong {
            font-size: 14px;
          }

          .admin-activity-row
            > div:nth-child(2)
            strong {
            font-size: 13px;
          }

          .admin-activity-row
            > div:nth-child(2)
            span {
            font-size: 11px;
            line-height: 1.4;
          }

          .admin-activity-row
            > div:nth-child(2)
            small {
            font-size: 10px;
          }
        }

        /* VERY SMALL PHONES */

        @media (max-width: 380px) {
          .admin-title {
            font-size: 25px;
          }

          .admin-performance-value {
            font-size: 27px !important;
          }

          .admin-performance-right {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .admin-performance-right p:nth-of-type(2) {
            margin-top: 10px !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================
   COMPONENTS
========================= */

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
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  warning?: boolean;
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
            : "white",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* =========================
   PAGE
========================= */

const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top, #121212 0%, #050505 42%, #030303 100%)",
  color: "white",
  padding: "35px 25px",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1350px",
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

const eyebrowStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "4px",
  fontWeight: 600,
};

const subtitleStyle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.45)",
  fontSize: "14px",
};

const financialCard = {
  padding: "24px",
  borderRadius: "22px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.09)",
  minWidth: 0,
  overflow: "hidden",
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
  textTransform:
    "uppercase" as const,
};

const financialValue = {
  margin: "8px 0 0",
  fontSize: "27px",
  lineHeight: 1.15,
  overflowWrap: "anywhere" as const,
};

const cardSubtitle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.3)",
  fontSize: "12px",
  lineHeight: 1.4,
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
  lineHeight: 1.1,
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

const infoCard = {
  padding: "22px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  minWidth: 0,
};

const infoTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

const activitySection = {
  marginTop: "18px",
  padding: "26px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  minWidth: 0,
};

const activityHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "20px",
  gap: "15px",
};

const sectionTitle = {
  marginTop: "7px",
  marginBottom: 0,
  fontSize: "23px",
  lineHeight: 1.2,
};

const sectionSubtitle = {
  marginTop: "6px",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const viewAllButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  padding: "9px 12px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  flexShrink: 0,
};

const activityList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const activityRow = {
  display: "grid",
  gridTemplateColumns:
    "40px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  borderRadius: "14px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.05)",
  minWidth: 0,
};

const activityIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
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
  whiteSpace: "nowrap" as const,
};

const emptyActivity = {
  minHeight: "180px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  color: "rgba(255,255,255,0.3)",
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
  minHeight: "48px",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "11px 15px",
  minHeight: "43px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
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
  lineHeight: 1.5,
};

const footerStyle = {
  marginTop: "24px",
  textAlign: "center" as const,
  color: "rgba(255,255,255,0.3)",
  fontSize: "12px",
};