"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  LogOut,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "expense"
  | "trade_return"
  | "service_fee";

type Transaction = {
  id: string;
  member_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  status: "completed" | "pending" | "cancelled";
  created_at: string;
};

type Member = {
  id: string;
  full_name: string;
};

type ActivityType =
  | "deposit"
  | "withdrawal"
  | "expense"
  | "service_fee";

type ActivitySource = "member" | "cooperative";

export default function AdminActivityPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [source, setSource] = useState<ActivitySource>("member");
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<ActivityType>("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<
    "completed" | "pending" | "cancelled"
  >("completed");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | ActivityType
  >("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "completed" | "pending" | "cancelled"
  >("all");

  /* ---------------------------------------------------------
     ADMIN AUTH
  --------------------------------------------------------- */

  async function getAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      window.location.href = "/login";
      return null;
    }

    return user;
  }

  /* ---------------------------------------------------------
     LOAD ACTIVITY
  --------------------------------------------------------- */

  async function loadActivity(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const admin = await getAdmin();

      if (!admin) return;

      const [transactionResult, memberResult] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, member_id, type, amount, description, status, created_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("members")
          .select("id, full_name")
          .order("full_name", { ascending: true }),
      ]);

      if (transactionResult.error) {
        throw transactionResult.error;
      }

      if (memberResult.error) {
        throw memberResult.error;
      }

      setTransactions(
        (transactionResult.data || []) as Transaction[]
      );

      setMembers(memberResult.data || []);
    } catch (err: any) {
      console.error("Activity loading error:", err);
      setError(err?.message || "Failed to load activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  /* ---------------------------------------------------------
     FORM
  --------------------------------------------------------- */

  function resetForm() {
    setSource("member");
    setMemberId("");
    setType("deposit");
    setAmount("");
    setDescription("");
    setStatus("completed");
    setEditing(null);
  }

  function openAddModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditing(transaction);

    if (transaction.member_id) {
      setSource("member");
      setMemberId(transaction.member_id);
    } else {
      setSource("cooperative");
      setMemberId("");
    }

    if (
      transaction.type === "deposit" ||
      transaction.type === "withdrawal" ||
      transaction.type === "expense" ||
      transaction.type === "service_fee"
    ) {
      setType(transaction.type);
    } else {
      setType("expense");
    }

    setAmount(String(transaction.amount));
    setDescription(transaction.description || "");
    setStatus(transaction.status);

    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  /* ---------------------------------------------------------
     SAVE ACTIVITY
  --------------------------------------------------------- */

  async function saveActivity() {
    setError("");

    const numericAmount = Number(amount);

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (source === "member" && !memberId) {
      setError("Please select a member.");
      return;
    }

    if (source === "cooperative" && type !== "expense") {
      setError("Cooperative activity can only be recorded as Others.");
      return;
    }

    if (type === "service_fee" && source !== "member") {
      setError(
        "TradeBishi Development & Service Fees must be assigned to a member."
      );
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    setSaving(true);

    try {
      const data = {
        member_id: source === "member" ? memberId : null,

        /*
         * Member:
         * deposit
         * withdrawal
         * service_fee
         *
         * Cooperative:
         * expense
         */
        type:
          source === "cooperative"
            ? "expense"
            : type,

        amount: numericAmount,
        description: description.trim(),
        status,
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from("transactions")
          .update(data)
          .eq("id", editing.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(data);

        if (insertError) {
          throw insertError;
        }
      }

      setShowModal(false);
      resetForm();

      await loadActivity();
    } catch (err: any) {
      console.error("Save activity error:", err);
      setError(
        err?.message ||
          "Failed to save activity. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------
     DELETE ACTIVITY
  --------------------------------------------------------- */

  async function deleteActivity(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this activity?"
    );

    if (!confirmed) return;

    setDeleting(id);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      await loadActivity();
    } catch (err: any) {
      console.error("Delete activity error:", err);
      setError(
        err?.message ||
          "Failed to delete activity. Please try again."
      );
    } finally {
      setDeleting(null);
    }
  }

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */

  function memberName(memberId: string | null) {
    if (!memberId) return "TradeBishi Cooperative";

    const member = members.find((m) => m.id === memberId);

    return member?.full_name || "Unknown Member";
  }

  function displayType(type: TransactionType) {
    switch (type) {
      case "deposit":
        return "Deposit";

      case "withdrawal":
        return "Withdrawal";

      case "expense":
        return "Others";

      case "service_fee":
        return "TradeBishi Development & Service Fee";

      case "trade_return":
        return "Trade Return";

      default:
        return "Activity";
    }
  }

  function typeDescription(type: ActivityType) {
    switch (type) {
      case "deposit":
        return "Money added to a member's balance.";

      case "withdrawal":
        return "Money withdrawn by a member.";

      case "service_fee":
        return "Amount deducted from the member and credited internally to TradeBishi.";

      case "expense":
        return "Cooperative expense paid outside the member balances.";

      default:
        return "";
    }
  }

  /* ---------------------------------------------------------
     SUMMARY
  --------------------------------------------------------- */

  const summary = useMemo(() => {
    const completed = transactions.filter(
      (transaction) => transaction.status === "completed"
    );

    const deposits = completed
      .filter((transaction) => transaction.type === "deposit")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const withdrawals = completed
      .filter((transaction) => transaction.type === "withdrawal")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const expenses = completed
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const serviceFees = completed
      .filter((transaction) => transaction.type === "service_fee")
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      deposits,
      withdrawals,
      expenses,
      serviceFees,
    };
  }, [transactions]);

  /* ---------------------------------------------------------
     FILTERING
  --------------------------------------------------------- */

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        memberName(transaction.member_id)
          .toLowerCase()
          .includes(query) ||
        (transaction.description || "")
          .toLowerCase()
          .includes(query) ||
        displayType(transaction.type)
          .toLowerCase()
          .includes(query);

      const matchesType =
        filterType === "all" ||
        transaction.type === filterType;

      const matchesStatus =
        filterStatus === "all" ||
        transaction.status === filterStatus;

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    transactions,
    members,
    search,
    filterType,
    filterStatus,
  ]);

  /* ---------------------------------------------------------
     UI HELPERS
  --------------------------------------------------------- */

  function getTypeIcon(type: TransactionType) {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft size={17} />;

      case "withdrawal":
        return <ArrowUpRight size={17} />;

      case "service_fee":
        return <Receipt size={17} />;

      case "expense":
        return <Receipt size={17} />;

      default:
        return <Activity size={17} />;
    }
  }

  function getTypeClass(type: TransactionType) {
    switch (type) {
      case "deposit":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";

      case "withdrawal":
        return "text-red-400 bg-red-400/10 border-red-400/20";

      case "service_fee":
        return "text-violet-400 bg-violet-400/10 border-violet-400/20";

      case "expense":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";

      default:
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    }
  }

  function getStatusIcon(
    transactionStatus: Transaction["status"]
  ) {
    switch (transactionStatus) {
      case "completed":
        return <CheckCircle2 size={15} />;

      case "pending":
        return <Clock3 size={15} />;

      case "cancelled":
        return <XCircle size={15} />;

      default:
        return null;
    }
  }

  function getStatusClass(
    transactionStatus: Transaction["status"]
  ) {
    switch (transactionStatus) {
      case "completed":
        return "text-emerald-400";

      case "pending":
        return "text-yellow-400";

      case "cancelled":
        return "text-red-400";

      default:
        return "text-white/50";
    }
  }

  /* ---------------------------------------------------------
     LOADING
  --------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw
            size={28}
            className="animate-spin text-white/50"
          />
          <p className="text-sm text-white/50">
            Loading activity...
          </p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     PAGE
  --------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-[1500px] mx-auto px-5 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
                <Activity size={20} />
              </div>

              <div>
                <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                  Activity
                </h1>

                <p className="text-xs text-white/40">
                  Cooperative financial ledger
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadActivity(true)}
                disabled={refreshing}
                className="h-10 px-3 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />

                <span className="hidden sm:inline">
                  Refresh
                </span>
              </button>

              <button
                onClick={() => {
                  supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="h-10 px-3 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-2 text-sm"
              >
                <LogOut size={16} />

                <span className="hidden sm:inline">
                  Logout
                </span>
              </button>

              <button
                onClick={openAddModal}
                className="h-10 px-4 rounded-xl bg-white text-black hover:bg-white/90 transition flex items-center gap-2 text-sm font-medium"
              >
                <Plus size={17} />
                Add Activity
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-5 md:px-8 py-7">
        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-xs text-white/40 mb-2">
              Total Deposits
            </p>

            <p className="text-2xl font-semibold">
              ₹
              {summary.deposits.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-xs text-white/40 mb-2">
              Total Withdrawals
            </p>

            <p className="text-2xl font-semibold">
              ₹
              {summary.withdrawals.toLocaleString(
                "en-IN"
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
            <p className="text-xs text-white/40 mb-2">
              Cooperative Expenses
            </p>

            <p className="text-2xl font-semibold">
              ₹
              {summary.expenses.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-5">
            <p className="text-xs text-violet-300/60 mb-2">
              TradeBishi Fees
            </p>

            <p className="text-2xl font-semibold text-violet-300">
              ₹
              {summary.serviceFees.toLocaleString(
                "en-IN"
              )}
            </p>
          </div>
        </div>

        {/* FILTER BAR */}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 mb-5">
          <div className="flex flex-col xl:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search member, activity or description..."
                className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-11 pr-4 outline-none focus:border-white/20 transition text-sm placeholder:text-white/25"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter
                size={16}
                className="text-white/35 hidden sm:block"
              />

              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(
                    e.target.value as
                      | "all"
                      | ActivityType
                  )
                }
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 outline-none text-sm text-white"
              >
                <option value="all">
                  All Activity
                </option>

                <option value="deposit">
                  Deposits
                </option>

                <option value="withdrawal">
                  Withdrawals
                </option>

                <option value="service_fee">
                  TradeBishi Fees
                </option>

                <option value="expense">
                  Others
                </option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as
                      | "all"
                      | "completed"
                      | "pending"
                      | "cancelled"
                  )
                }
                className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 outline-none text-sm text-white"
              >
                <option value="all">
                  All Status
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div>
              <h2 className="font-medium">
                Activity Ledger
              </h2>

              <p className="text-xs text-white/35 mt-1">
                {filteredTransactions.length}{" "}
                {filteredTransactions.length === 1
                  ? "activity"
                  : "activities"}
              </p>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-20 text-center">
              <Activity
                size={34}
                className="mx-auto text-white/15 mb-4"
              />

              <p className="text-white/50">
                No activities found
              </p>

              <p className="text-xs text-white/25 mt-1">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {filteredTransactions.map(
                (transaction) => (
                  <div
                    key={transaction.id}
                    className="px-5 py-4 hover:bg-white/[0.025] transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* TYPE */}

                      <div className="flex items-center gap-3 min-w-0 lg:w-[300px]">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getTypeClass(
                            transaction.type
                          )}`}
                        >
                          {getTypeIcon(
                            transaction.type
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {displayType(
                              transaction.type
                            )}
                          </p>

                          <p className="text-xs text-white/35 truncate">
                            {memberName(
                              transaction.member_id
                            )}
                          </p>
                        </div>
                      </div>

                      {/* DESCRIPTION */}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/75 truncate">
                          {transaction.description ||
                            "No description"}
                        </p>

                        <p className="text-xs text-white/30 mt-1">
                          {new Date(
                            transaction.created_at
                          ).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      {/* AMOUNT */}

                      <div className="lg:w-[150px]">
                        <p
                          className={`text-sm font-semibold ${
                            transaction.type ===
                              "deposit" ||
                            transaction.type ===
                              "trade_return"
                              ? "text-emerald-400"
                              : transaction.type ===
                                "service_fee"
                              ? "text-violet-300"
                              : "text-white"
                          }`}
                        >
                          {transaction.type ===
                            "deposit" ||
                          transaction.type ===
                            "trade_return"
                            ? "+"
                            : "-"}

                          ₹
                          {Number(
                            transaction.amount
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* STATUS */}

                      <div
                        className={`flex items-center gap-1.5 text-xs capitalize lg:w-[110px] ${getStatusClass(
                          transaction.status
                        )}`}
                      >
                        {getStatusIcon(
                          transaction.status
                        )}

                        {transaction.status}
                      </div>

                      {/* ACTIONS */}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            openEditModal(transaction)
                          }
                          className="w-9 h-9 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() =>
                            deleteActivity(
                              transaction.id
                            )
                          }
                          disabled={
                            deleting ===
                            transaction.id
                          }
                          className="w-9 h-9 rounded-lg border border-red-400/10 bg-red-400/[0.03] hover:bg-red-400/10 text-red-400 flex items-center justify-center transition disabled:opacity-40"
                          title="Delete"
                        >
                          {deleting ===
                          transaction.id ? (
                            <RefreshCw
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* ADD / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/[0.1] bg-[#111111] shadow-2xl overflow-hidden">
            {/* MODAL HEADER */}

            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {editing
                    ? "Edit Activity"
                    : "Add Activity"}
                </h2>

                <p className="text-xs text-white/35 mt-1">
                  Record an activity in the cooperative
                  ledger.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="w-9 h-9 rounded-xl hover:bg-white/[0.08] flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="p-6 space-y-5">
              {/* SOURCE */}

              <div>
                <label className="text-xs text-white/45 block mb-2">
                  Activity Source
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSource("member");

                      if (
                        type === "expense"
                      ) {
                        setType("deposit");
                      }
                    }}
                    className={`h-11 rounded-xl border text-sm transition ${
                      source === "member"
                        ? "border-white/20 bg-white/[0.09]"
                        : "border-white/[0.08] bg-white/[0.03] text-white/50"
                    }`}
                  >
                    Member Activity
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSource("cooperative");
                      setType("expense");
                      setMemberId("");
                    }}
                    className={`h-11 rounded-xl border text-sm transition ${
                      source === "cooperative"
                        ? "border-white/20 bg-white/[0.09]"
                        : "border-white/[0.08] bg-white/[0.03] text-white/50"
                    }`}
                  >
                    Cooperative Activity
                  </button>
                </div>
              </div>

              {/* MEMBER */}

              {source === "member" && (
                <div>
                  <label className="text-xs text-white/45 block mb-2">
                    Member
                  </label>

                  <select
                    value={memberId}
                    onChange={(e) =>
                      setMemberId(e.target.value)
                    }
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 outline-none text-sm text-white focus:border-white/20"
                  >
                    <option value="">
                      Select member
                    </option>

                    {members.map((member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TYPE */}

              <div>
                <label className="text-xs text-white/45 block mb-2">
                  Activity Type
                </label>

                {source === "member" ? (
                  <>
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(
                          e.target.value as ActivityType
                        )
                      }
                      className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 outline-none text-sm text-white focus:border-white/20"
                    >
                      <option value="deposit">
                        Deposit
                      </option>

                      <option value="withdrawal">
                        Withdrawal
                      </option>

                      <option value="service_fee">
                        TradeBishi Development & Service
                        Fees
                      </option>
                    </select>

                    <p className="text-xs text-white/30 mt-2">
                      {typeDescription(type)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 flex items-center text-sm">
                      Others / Cooperative Expense
                    </div>

                    <p className="text-xs text-white/30 mt-2">
                      Records money spent by the cooperative
                      outside member balances.
                    </p>
                  </>
                )}
              </div>

              {/* AMOUNT */}

              <div>
                <label className="text-xs text-white/45 block mb-2">
                  Amount
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    placeholder="0.00"
                    className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] pl-9 pr-4 outline-none text-sm focus:border-white/20"
                  />
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="text-xs text-white/45 block mb-2">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder={
                    type === "service_fee"
                      ? "e.g. TradeBishi development and service fee"
                      : "Describe this activity..."
                  }
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 outline-none text-sm resize-none focus:border-white/20 placeholder:text-white/25"
                />
              </div>

              {/* STATUS */}

              <div>
                <label className="text-xs text-white/45 block mb-2">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as
                        | "completed"
                        | "pending"
                        | "cancelled"
                    )
                  }
                  className="w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 outline-none text-sm text-white focus:border-white/20"
                >
                  <option value="completed">
                    Completed
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* SERVICE FEE WARNING */}

              {type === "service_fee" &&
                source === "member" && (
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.06] p-4">
                    <div className="flex gap-3">
                      <Receipt
                        size={18}
                        className="text-violet-300 shrink-0 mt-0.5"
                      />

                      <div>
                        <p className="text-sm font-medium text-violet-200">
                          TradeBishi Development &
                          Service Fee
                        </p>

                        <p className="text-xs text-violet-200/55 mt-1 leading-relaxed">
                          This fee is recorded against the
                          selected member. Once completed,
                          the member's available balance
                          will be reduced by this amount.
                          It represents an internal
                          TradeBishi fee, not a cooperative
                          expense.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* ACTIONS */}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition text-sm disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={saveActivity}
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-white text-black hover:bg-white/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : editing
                    ? "Save Changes"
                    : "Add Activity"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}