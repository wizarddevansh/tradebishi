"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Users,
  Clock,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Receipt,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type DashboardStats = {
  totalMembers: number;
  approvedCapital: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalExpenses: number;
};

type ActivityItem = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  memberName: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    approvedCapital: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalExpenses: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setRefreshing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        router.push("/login");
        return;
      }

      setAdminName(profile.full_name || "Admin");

      const [
        membersResult,
        depositsResult,
        withdrawalsResult,
        transactionsResult,
      ] = await Promise.all([
        supabase
          .from("members")
          .select(
            "id, user_id, full_name, phone, investment_amount, profit_share, status, created_at"
          ),

        supabase
          .from("deposits")
          .select("id, member_id, amount, status, created_at"),

        supabase
          .from("withdrawals")
          .select(
            "id, member_id, amount, method, account_details, status, reviewed_by, reviewed_at, created_at"
          ),

        supabase
          .from("transactions")
          .select(
            "id, member_id, type, amount, description, status, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (membersResult.error) {
        console.error("Members error:", membersResult.error);
      }

      if (depositsResult.error) {
        console.error("Deposits error:", depositsResult.error);
      }

      if (withdrawalsResult.error) {
        console.error("Withdrawals error:", withdrawalsResult.error);
      }

      if (transactionsResult.error) {
        console.error("Transactions error:", transactionsResult.error);
      }

      const members = membersResult.data || [];
      const deposits = depositsResult.data || [];
      const withdrawals = withdrawalsResult.data || [];
      const transactions = transactionsResult.data || [];

      const approvedCapital = deposits
        .filter((deposit) => deposit.status === "approved")
        .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);

      const pendingDeposits = deposits
        .filter((deposit) => deposit.status === "pending")
        .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);

      const pendingWithdrawals = withdrawals
        .filter((withdrawal) => withdrawal.status === "pending")
        .reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0);

      const totalExpenses = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      setStats({
        totalMembers: members.length,
        approvedCapital,
        pendingDeposits,
        pendingWithdrawals,
        totalExpenses,
      });

      const memberMap = new Map(
        members.map((member) => [member.id, member.full_name])
      );

      const formattedActivities: ActivityItem[] = transactions.map(
        (transaction) => ({
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount || 0),
          description: transaction.description,
          status: transaction.status,
          created_at: transaction.created_at,
          memberName: transaction.member_id
            ? memberMap.get(transaction.member_id) || "Unknown Member"
            : "Cooperative",
        })
      );

      setActivities(formattedActivities);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getActivityLabel(type: string) {
    if (type === "deposit") return "Deposit";
    if (type === "withdrawal") return "Withdrawal";
    if (type === "expense") return "Others";
    return type;
  }

  function getActivityIcon(type: string) {
    if (type === "deposit") {
      return <ArrowDownRight size={17} />;
    }

    if (type === "withdrawal") {
      return <ArrowUpRight size={17} />;
    }

    return <Receipt size={17} />;
  }

  function getActivityIconStyle(type: string) {
    if (type === "deposit") {
      return {
        background: "rgba(34,197,94,0.12)",
        color: "#4ade80",
      };
    }

    if (type === "withdrawal") {
      return {
        background: "rgba(239,68,68,0.12)",
        color: "#f87171",
      };
    }

    return {
      background: "rgba(168,85,247,0.12)",
      color: "#c084fc",
    };
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#09090b",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #27272a",
          background: "#0f0f11",
          padding: "18px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              TradeBishi
            </div>

            <div
              style={{
                color: "#a1a1aa",
                fontSize: "14px",
                marginTop: "4px",
              }}
            >
              Admin Dashboard
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {adminName}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  color: "#71717a",
                }}
              >
                Administrator
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                border: "1px solid #27272a",
                background: "#18181b",
                color: "#d4d4d8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "28px 24px 50px",
        }}
      >
        {/* Top actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              Overview
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#71717a",
                fontSize: "14px",
              }}
            >
              Manage members, balances and cooperative activity.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #27272a",
              background: "#18181b",
              color: "#e4e4e7",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw
              size={16}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
        </div>

        {/* Main stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Member Balance */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(59,130,246,0.12)",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Wallet size={20} />
              </div>

              <span
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                }}
              >
                Approved
              </span>
            </div>

            <div
              style={{
                marginTop: "18px",
                color: "#a1a1aa",
                fontSize: "13px",
              }}
            >
              Member Balance
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                marginTop: "5px",
              }}
            >
              {formatCurrency(stats.approvedCapital)}
            </div>
          </div>

          {/* Members */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(168,85,247,0.12)",
                color: "#c084fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>

            <div
              style={{
                marginTop: "18px",
                color: "#a1a1aa",
                fontSize: "13px",
              }}
            >
              Members
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                marginTop: "5px",
              }}
            >
              {stats.totalMembers}
            </div>
          </div>

          {/* Pending Deposits */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(245,158,11,0.12)",
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={20} />
            </div>

            <div
              style={{
                marginTop: "18px",
                color: "#a1a1aa",
                fontSize: "13px",
              }}
            >
              Pending Deposits
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                marginTop: "5px",
              }}
            >
              {formatCurrency(stats.pendingDeposits)}
            </div>
          </div>

          {/* Pending Withdrawals */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.12)",
                color: "#f87171",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowUpRight size={20} />
            </div>

            <div
              style={{
                marginTop: "18px",
                color: "#a1a1aa",
                fontSize: "13px",
              }}
            >
              Pending Withdrawals
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                marginTop: "5px",
              }}
            >
              {formatCurrency(stats.pendingWithdrawals)}
            </div>
          </div>
        </div>

        {/* Cooperative overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(168,85,247,0.12)",
                  color: "#c084fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity size={20} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#a1a1aa",
                  }}
                >
                  Other Cooperative Activity
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    marginTop: "3px",
                  }}
                >
                  {formatCurrency(stats.totalExpenses)}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "14px",
                fontSize: "12px",
                color: "#71717a",
              }}
            >
              Recorded cooperative activity currently stored as Others.
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <section
          style={{
            background: "#111113",
            border: "1px solid #27272a",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: "1px solid #27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 800,
                }}
              >
                Recent Cooperative Activity
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#71717a",
                  fontSize: "13px",
                }}
              >
                Latest deposits, withdrawals and other activity.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/activity")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                border: "none",
                background: "transparent",
                color: "#a1a1aa",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              View all
              <ChevronRight size={15} />
            </button>
          </div>

          {activities.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "#71717a",
                fontSize: "14px",
              }}
            >
              No recent activity.
            </div>
          ) : (
            <div>
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #1f1f22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        ...getActivityIconStyle(activity.type),
                      }}
                    >
                      {getActivityIcon(activity.type)}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                        }}
                      >
                        {getActivityLabel(activity.type)}
                      </div>

                      <div
                        style={{
                          color: "#71717a",
                          fontSize: "12px",
                          marginTop: "3px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {activity.memberName}
                        {activity.description
                          ? ` • ${activity.description}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "14px",
                      }}
                    >
                      {formatCurrency(activity.amount)}
                    </div>

                    <div
                      style={{
                        color: "#71717a",
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Management */}
        <section>
          <div
            style={{
              marginBottom: "14px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 800,
              }}
            >
              Management
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#71717a",
                fontSize: "13px",
              }}
            >
              Open the different sections of TradeBishi.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <button
              onClick={() => router.push("/admin/members")}
              style={{
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid #27272a",
                background: "#111113",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Users size={19} />

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                }}
              >
                Members
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Manage all members
              </div>
            </button>

            <button
              onClick={() => router.push("/admin/deposits")}
              style={{
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid #27272a",
                background: "#111113",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ArrowDownRight size={19} />

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                }}
              >
                Deposits
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Review member deposits
              </div>
            </button>

            <button
              onClick={() => router.push("/admin/withdrawals")}
              style={{
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid #27272a",
                background: "#111113",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <ArrowUpRight size={19} />

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                }}
              >
                Withdrawals
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Approve or decline requests
              </div>
            </button>

            <button
              onClick={() => router.push("/admin/trades")}
              style={{
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid #27272a",
                background: "#111113",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <BarChart3 size={18} />

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                }}
              >
                Trade Dashboard
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Manage and view trades
              </div>
            </button>

            <button
              onClick={() => router.push("/admin/activity")}
              style={{
                padding: "18px",
                borderRadius: "14px",
                border: "1px solid #27272a",
                background: "#111113",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Activity size={19} />

              <div
                style={{
                  marginTop: "12px",
                  fontWeight: 800,
                }}
              >
                Cooperative Activity
              </div>

              <div
                style={{
                  color: "#71717a",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                Deposits, withdrawals and Others
              </div>
            </button>
          </div>
        </section>
      </main>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          main {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}