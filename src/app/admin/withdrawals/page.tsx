"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  Check,
  Clock,
  Eye,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Withdrawal = {
  id: string;
  member_id: string | null;
  amount: number;
  method: string;
  account_details: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  member_name: string;
  member_phone: string | null;
};

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
};

export default function AdminWithdrawalsPage() {
  const router = useRouter();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, []);

  async function loadWithdrawals() {
    const supabase = createClient();

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        router.replace("/");
        return;
      }

      setAdminName(profile.full_name || "Admin");

      const { data: withdrawalData, error: withdrawalError } =
        await supabase
          .from("withdrawals")
          .select(
            "id, member_id, amount, method, account_details, status, reviewed_by, reviewed_at, created_at"
          )
          .order("created_at", {
            ascending: false,
          });

      if (withdrawalError) {
        console.error(
          "Withdrawal loading error:",
          withdrawalError
        );

        setError(withdrawalError.message);
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, full_name, phone");

      if (memberError) {
        console.error(
          "Member loading error:",
          memberError
        );

        setError(memberError.message);
        return;
      }

      const members = (memberData ?? []) as Member[];

      const memberMap = new Map<string, Member>(
        members.map((member) => [member.id, member])
      );

      const mappedWithdrawals = (withdrawalData ?? []).map(
        (withdrawal) => {
          const member = withdrawal.member_id
            ? memberMap.get(withdrawal.member_id)
            : undefined;

          return {
            ...withdrawal,
            member_name:
              member?.full_name || "Unknown Member",
            member_phone: member?.phone || null,
          };
        }
      );

      setWithdrawals(mappedWithdrawals as Withdrawal[]);
    } catch (err) {
      console.error("Withdrawals page error:", err);

      setError(
        "Something went wrong while loading withdrawal requests."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadWithdrawals();
    setRefreshing(false);
  }

  async function updateWithdrawalStatus(
    withdrawalId: string,
    status: "approved" | "rejected"
  ) {
    const supabase = createClient();

    setProcessingId(withdrawalId);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.role !== "admin"
      ) {
        setError(
          "You are not authorized to perform this action."
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("withdrawals")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (updateError) {
        console.error(
          "Withdrawal update error:",
          updateError
        );

        setError(updateError.message);
        return;
      }

      setSelectedWithdrawal(null);
      setShowModal(false);

      await loadWithdrawals();
    } catch (err) {
      console.error(
        "Withdrawal action error:",
        err
      );

      setError(
        "Unable to update withdrawal request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  function statusColor(status: string) {
    const value = status.toLowerCase();

    if (value === "approved") return "#34d399";
    if (value === "rejected") return "#f87171";

    return "#facc15";
  }

  function statusBackground(status: string) {
    const value = status.toLowerCase();

    if (value === "approved") {
      return "rgba(52,211,153,0.1)";
    }

    if (value === "rejected") {
      return "rgba(248,113,113,0.1)";
    }

    return "rgba(250,204,21,0.1)";
  }

  const filteredWithdrawals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return withdrawals.filter((withdrawal) => {
      const status = withdrawal.status.toLowerCase();

      const matchesStatus =
        filter === "all" || status === filter;

      const matchesSearch =
        !query ||
        withdrawal.member_name.toLowerCase().includes(query) ||
        withdrawal.method.toLowerCase().includes(query) ||
        status.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [withdrawals, search, filter]);

  const pendingCount = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status.toLowerCase() === "pending"
  ).length;

  const approvedCount = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status.toLowerCase() === "approved"
  ).length;

  const rejectedCount = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status.toLowerCase() === "rejected"
  ).length;

  const pendingAmount = withdrawals
    .filter(
      (withdrawal) =>
        withdrawal.status.toLowerCase() === "pending"
    )
    .reduce(
      (sum, withdrawal) =>
        sum + Number(withdrawal.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={loadingPage}>
        <div>
          <div style={loadingSpinner}>
            <RefreshCw size={22} />
          </div>

          <p>Loading Withdrawal Requests...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <div style={eyebrow}>
              <ShieldCheck size={14} />
              TRADEBISHI ADMIN
            </div>

            <h1 style={title}>
              Withdrawal Requests
            </h1>

            <p style={subtitle}>
              Review and manage member withdrawal requests.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              style={secondaryButton}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: refreshing
                    ? "spin 1s linear infinite"
                    : "none",
                }}
              />

              {refreshing ? "Refreshing..." : "Refresh"}
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

        {error && (
          <div style={errorBox}>
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              style={errorClose}
            >
              <X size={15} />
            </button>
          </div>
        )}

        <section style={statsGrid}>
          <StatCard
            icon={<Clock size={19} />}
            label="Pending Requests"
            value={pendingCount.toString()}
            subtext="Awaiting review"
            warning
          />

          <StatCard
            icon={<Wallet size={19} />}
            label="Pending Amount"
            value={currency(pendingAmount)}
            subtext="Awaiting approval"
            warning
          />

          <StatCard
            icon={<Check size={19} />}
            label="Approved"
            value={approvedCount.toString()}
            subtext="Completed requests"
            positive
          />

          <StatCard
            icon={<X size={19} />}
            label="Rejected"
            value={rejectedCount.toString()}
            subtext="Rejected requests"
          />
        </section>

        <section style={mainPanel}>
          <div style={toolbar}>
            <div>
              <h2 style={sectionTitle}>
                All Withdrawal Requests
              </h2>

              <p style={sectionSubtitle}>
                {filteredWithdrawals.length} request
                {filteredWithdrawals.length === 1 ? "" : "s"} shown
              </p>
            </div>

            <div style={toolbarRight}>
              <div style={searchBox}>
                <Search size={16} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search member..."
                  style={searchInput}
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                style={filterSelect}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div style={emptyState}>
              <ArrowDownToLine
                size={34}
                style={{
                  opacity: 0.4,
                  marginBottom: "12px",
                }}
              />

              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                }}
              >
                No withdrawal requests
              </h3>

              <p
                style={{
                  marginTop: "6px",
                  color: "rgba(255,255,255,0.35)",
                  fontSize: "13px",
                }}
              >
                {search || filter !== "all"
                  ? "No requests match your current filters."
                  : "Member withdrawal requests will appear here."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: "950px" }}>
                <div style={tableHeader}>
                  <span>Member</span>
                  <span>Amount</span>
                  <span>Method</span>
                  <span>Status</span>
                  <span>Requested</span>
                  <span>Action</span>
                </div>

                <div style={tableList}>
                  {filteredWithdrawals.map((withdrawal) => {
                    const status =
                      withdrawal.status.toLowerCase();

                    return (
                      <div
                        key={withdrawal.id}
                        style={tableRow}
                      >
                        <div style={memberCell}>
                          <div style={avatar}>
                            {withdrawal.member_name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div style={memberInfo}>
                            <strong>
                              {withdrawal.member_name}
                            </strong>

                            <span>
                              {withdrawal.member_phone ||
                                "No phone"}
                            </span>
                          </div>
                        </div>

                        <strong style={{ fontSize: "15px" }}>
                          {currency(
                            Number(withdrawal.amount)
                          )}
                        </strong>

                        <span
                          style={{
                            textTransform:
                              "capitalize",
                            color:
                              "rgba(255,255,255,0.65)",
                          }}
                        >
                          {withdrawal.method}
                        </span>

                        <span
                          style={{
                            ...statusBadge,
                            color: statusColor(status),
                            background:
                              statusBackground(status),
                          }}
                        >
                          {status === "pending" && (
                            <Clock size={13} />
                          )}

                          {status === "approved" && (
                            <Check size={13} />
                          )}

                          {status === "rejected" && (
                            <X size={13} />
                          )}

                          {status}
                        </span>

                        <span style={dateText}>
                          {new Date(
                            withdrawal.created_at
                          ).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWithdrawal(
                              withdrawal
                            );
                            setShowModal(true);
                          }}
                          style={actionButton}
                        >
                          <Eye size={15} />
                          Review
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <div style={footer}>
          <Users size={14} />

          <span>
            Logged in as{" "}
            <strong>{adminName}</strong>
            {" • "}
            Admin withdrawal control
          </span>
        </div>
      </div>

      {showModal && selectedWithdrawal && (
        <div
          style={modalOverlay}
          onMouseDown={() => setShowModal(false)}
        >
          <div
            style={modal}
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <div style={modalEyebrow}>
                  WITHDRAWAL REQUEST
                </div>

                <h2 style={modalTitle}>
                  Review Request
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={modalClose}
              >
                <X size={18} />
              </button>
            </div>

            <div style={modalMember}>
              <div style={modalAvatar}>
                {selectedWithdrawal.member_name
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "16px",
                  }}
                >
                  {selectedWithdrawal.member_name}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color:
                      "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                  }}
                >
                  {selectedWithdrawal.member_phone ||
                    "No phone provided"}
                </span>
              </div>
            </div>

            <div style={detailsGrid}>
              <Detail
                label="Amount"
                value={currency(
                  Number(selectedWithdrawal.amount)
                )}
                highlight
              />

              <Detail
                label="Method"
                value={selectedWithdrawal.method}
              />

              <Detail
                label="Status"
                value={selectedWithdrawal.status}
              />

              <Detail
                label="Requested"
                value={new Date(
                  selectedWithdrawal.created_at
                ).toLocaleString("en-IN")}
              />
            </div>

            <div style={accountDetailsBox}>
              <span style={detailLabel}>
                ACCOUNT DETAILS
              </span>

              <div style={accountDetailsText}>
                {selectedWithdrawal.account_details ||
                  "No account details provided."}
              </div>
            </div>

            {selectedWithdrawal.reviewed_at && (
              <div style={reviewedBox}>
                <ShieldCheck size={15} />

                <span>
                  Reviewed on{" "}
                  {new Date(
                    selectedWithdrawal.reviewed_at
                  ).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {selectedWithdrawal.status.toLowerCase() ===
              "pending" && (
              <div style={modalActions}>
                <button
                  type="button"
                  disabled={
                    processingId ===
                    selectedWithdrawal.id
                  }
                  onClick={() =>
                    updateWithdrawalStatus(
                      selectedWithdrawal.id,
                      "rejected"
                    )
                  }
                  style={rejectButton}
                >
                  <X size={16} />

                  {processingId ===
                  selectedWithdrawal.id
                    ? "Processing..."
                    : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={
                    processingId ===
                    selectedWithdrawal.id
                  }
                  onClick={() =>
                    updateWithdrawalStatus(
                      selectedWithdrawal.id,
                      "approved"
                    )
                  }
                  style={approveButton}
                >
                  <Check size={16} />

                  {processingId ===
                  selectedWithdrawal.id
                    ? "Processing..."
                    : "Approve Withdrawal"}
                </button>
              </div>
            )}

            {selectedWithdrawal.status.toLowerCase() !==
              "pending" && (
              <div style={alreadyReviewed}>
                This withdrawal request has already been{" "}
                <strong>
                  {selectedWithdrawal.status}
                </strong>
                .
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #050505;
        }

        button,
        input,
        select {
          font-family: inherit;
        }

        button {
          transition:
            opacity 0.2s,
            transform 0.2s,
            background 0.2s;
        }

        button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        select option {
          background: #111;
          color: white;
        }

        @media (max-width: 900px) {
          .withdrawal-stats {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            );
          }
        }
      `}</style>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  warning,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  warning?: boolean;
  positive?: boolean;
}) {
  return (
    <div style={statCard}>
      <div style={statTop}>
        <div style={statIcon}>
          {icon}
        </div>

        <span
          style={{
            color: warning
              ? "#facc15"
              : positive
              ? "#34d399"
              : "rgba(255,255,255,0.45)",
          }}
        >
          {icon}
        </span>
      </div>

      <p style={statLabel}>{label}</p>

      <h2
        style={{
          ...statValue,
          color: warning
            ? "#facc15"
            : positive
            ? "#34d399"
            : "white",
        }}
      >
        {value}
      </h2>

      <span style={statSubtext}>
        {subtext}
      </span>
    </div>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={detailBox}>
      <span style={detailLabel}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "6px",
          fontSize: highlight ? "21px" : "14px",
          color: highlight ? "#34d399" : "white",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #151515 0%, #050505 45%)",
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
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "30px",
};

const eyebrow = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color: "rgba(255,255,255,0.38)",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: 600,
};

const title = {
  margin: "9px 0 0",
  fontSize: "38px",
  letterSpacing: "-1.6px",
};

const subtitle = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.42)",
  fontSize: "14px",
};

const headerActions = {
  display: "flex",
  gap: "9px",
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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
  marginBottom: "18px",
  padding: "14px 16px",
  borderRadius: "14px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.18)",
  color: "#f87171",
  fontSize: "13px",
};

const errorClose = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  color: "#f87171",
  cursor: "pointer",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "18px",
};

const statCard = {
  padding: "21px",
  borderRadius: "20px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const statTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const statIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.07)",
};

const statLabel = {
  marginTop: "17px",
  marginBottom: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "10px",
  letterSpacing: "1.2px",
  textTransform: "uppercase" as const,
};

const statValue = {
  margin: "7px 0 0",
  fontSize: "25px",
  letterSpacing: "-0.7px",
};

const statSubtext = {
  display: "block",
  marginTop: "6px",
  color: "rgba(255,255,255,0.28)",
  fontSize: "11px",
};

const mainPanel = {
  borderRadius: "24px",
  padding: "25px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "24px",
};

const sectionTitle = {
  margin: 0,
  fontSize: "22px",
  letterSpacing: "-0.5px",
};

const sectionSubtitle = {
  marginTop: "5px",
  color: "rgba(255,255,255,0.32)",
  fontSize: "12px",
};

const toolbarRight = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const searchBox = {
  width: "230px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "0 12px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.35)",
};

const searchInput = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "white",
  fontSize: "12px",
};

const filterSelect = {
  height: "40px",
  padding: "0 12px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  outline: "none",
  cursor: "pointer",
  fontSize: "12px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1.1fr 1.1fr 1.1fr 1.7fr 1fr",
  gap: "15px",
  alignItems: "center",
  padding: "0 16px 11px",
  color: "rgba(255,255,255,0.3)",
  fontSize: "10px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const tableList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const tableRow = {
  display: "grid",
  gridTemplateColumns:
    "2fr 1.1fr 1.1fr 1.1fr 1.7fr 1fr",
  gap: "15px",
  alignItems: "center",
  padding: "14px 16px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.055)",
};

const memberCell = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  minWidth: 0,
};

const avatar = {
  width: "36px",
  height: "36px",
  flexShrink: 0,
  borderRadius: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
  fontSize: "13px",
  fontWeight: 600,
};

const memberInfo = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "3px",
  minWidth: 0,
};

const statusBadge = {
  width: "fit-content",
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "6px 9px",
  borderRadius: "9px",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "capitalize" as const,
};

const dateText = {
  color: "rgba(255,255,255,0.38)",
  fontSize: "11px",
};

const actionButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "9px 11px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 600,
};

const emptyState = {
  padding: "70px 20px",
  textAlign: "center" as const,
  color: "rgba(255,255,255,0.35)",
};

const footer = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "7px",
  marginTop: "22px",
  color: "rgba(255,255,255,0.25)",
  fontSize: "11px",
};

const loadingPage = {
  minHeight: "100vh",
  background: "#050505",
  color: "rgba(255,255,255,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center" as const,
};

const loadingSpinner = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background:
    "rgba(0,0,0,0.72)",
  backdropFilter: "blur(12px)",
};

const modal = {
  width: "100%",
  maxWidth: "600px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: "27px",
  borderRadius: "24px",
  background:
    "linear-gradient(145deg, #171717, #0b0b0b)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.6)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "22px",
};

const modalEyebrow = {
  color: "rgba(255,255,255,0.32)",
  fontSize: "9px",
  letterSpacing: "2px",
  fontWeight: 600,
};

const modalTitle = {
  margin: "6px 0 0",
  fontSize: "26px",
  letterSpacing: "-0.7px",
};

const modalClose = {
  width: "35px",
  height: "35px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

const modalMember = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "15px",
  borderRadius: "15px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const modalAvatar = {
  width: "43px",
  height: "43px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.08)",
  fontWeight: 600,
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "12px",
};

const detailBox = {
  padding: "14px",
  borderRadius: "13px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const detailLabel = {
  display: "block",
  color: "rgba(255,255,255,0.3)",
  fontSize: "9px",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
};

const accountDetailsBox = {
  marginTop: "10px",
  padding: "15px",
  borderRadius: "14px",
  background:
    "rgba(0,0,0,0.25)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const accountDetailsText = {
  marginTop: "8px",
  color: "rgba(255,255,255,0.7)",
  fontSize: "13px",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};

const reviewedBox = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginTop: "12px",
  padding: "11px 13px",
  borderRadius: "11px",
  background:
    "rgba(52,211,153,0.07)",
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
};

const modalActions = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1.5fr",
  gap: "10px",
  marginTop: "20px",
};

const rejectButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "13px",
  borderRadius: "12px",
  border:
    "1px solid rgba(248,113,113,0.2)",
  background:
    "rgba(248,113,113,0.09)",
  color: "#f87171",
  cursor: "pointer",
  fontWeight: 600,
};

const approveButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "13px",
  border: "none",
  borderRadius: "12px",
  background: "#34d399",
  color: "#03130d",
  cursor: "pointer",
  fontWeight: 700,
};

const alreadyReviewed = {
  marginTop: "20px",
  padding: "13px",
  borderRadius: "12px",
  textAlign: "center" as const,
  background:
    "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.4)",
  fontSize: "12px",
};