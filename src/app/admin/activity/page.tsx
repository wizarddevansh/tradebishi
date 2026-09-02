"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type ActivityType =
  | "deposit"
  | "withdrawal"
  | "expense";

type ActivitySource =
  | "member"
  | "cooperative";

export default function AdminActivityPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [members, setMembers] = useState<Member[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] =
    useState<Transaction | null>(null);

  const [source, setSource] =
    useState<ActivitySource>("member");

  const [memberId, setMemberId] = useState("");

  const [type, setType] =
    useState<ActivityType>("deposit");

  const [amount, setAmount] = useState("");
  const [description, setDescription] =
    useState("");

  const [status, setStatus] =
    useState("completed");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] =
    useState<"all" | ActivityType>("all");

  const [filterStatus, setFilterStatus] =
    useState<
      "all" | "completed" | "pending" | "cancelled"
    >("all");

  useEffect(() => {
    loadActivity();
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

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      router.replace("/");
      return null;
    }

    return user;
  }

  async function loadActivity() {
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setLoading(false);
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
    if (refreshing) return;

    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  }

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
    setError("");
    setShowModal(true);
  }

  function openEditModal(
    transaction: Transaction
  ) {
    setEditing(transaction);

    if (transaction.member_id) {
      setSource("member");
      setMemberId(transaction.member_id);
    } else {
      setSource("cooperative");
      setMemberId("");
    }

    const transactionType =
      transaction.type?.toLowerCase();

    if (
      transactionType === "deposit" ||
      transactionType === "withdrawal" ||
      transactionType === "expense"
    ) {
      setType(transactionType);
    } else {
      setType("expense");
    }

    setAmount(String(transaction.amount));
    setDescription(
      transaction.description || ""
    );
    setStatus(
      transaction.status || "completed"
    );

    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    resetForm();
  }

  async function saveActivity() {
    if (saving) return;

    setError("");

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    if (source === "member" && !memberId) {
      setError("Please select a member.");
      return;
    }

    if (
      source === "cooperative" &&
      type !== "expense"
    ) {
      setError(
        "Cooperative activity must be an Others activity."
      );
      return;
    }

    if (!description.trim()) {
      setError(
        "Please enter a description."
      );
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setSaving(false);
      return;
    }

    const data = {
      member_id:
        source === "member"
          ? memberId
          : null,

      type:
        source === "cooperative"
          ? "expense"
          : type,

      amount: numericAmount,

      description:
        description.trim(),

      status,
    };

    let result;

    if (editing) {
      result = await supabase
        .from("transactions")
        .update(data)
        .eq("id", editing.id);
    } else {
      result = await supabase
        .from("transactions")
        .insert(data);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setShowModal(false);
    resetForm();

    await loadActivity();

    setSaving(false);
  }

  async function deleteActivity(
    transaction: Transaction
  ) {
    if (deleting) return;

    const confirmed = window.confirm(
      `Delete this ${displayType(
        transaction.type
      )} of ${currency(
        Number(transaction.amount)
      )}?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setDeleting(false);
      return;
    }

    const { error: deleteError } =
      await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

    if (deleteError) {
      setError(
        deleteError.message
      );
      setDeleting(false);
      return;
    }

    await loadActivity();

    setDeleting(false);
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  function currency(value: number) {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  function memberName(
    memberId: string | null
  ) {
    if (!memberId) {
      return "Cooperative";
    }

    return (
      members.find(
        (member) =>
          member.id === memberId
      )?.full_name ||
      "Unknown Member"
    );
  }

  function displayType(
    value: string
  ) {
    if (value === "deposit") {
      return "Deposit";
    }

    if (value === "withdrawal") {
      return "Withdrawal";
    }

    if (value === "expense") {
      return "Others";
    }

    return value;
  }

  const deposits = transactions.filter(
    (item) =>
      item.type === "deposit"
  );

  const withdrawals = transactions.filter(
    (item) =>
      item.type === "withdrawal"
  );

  const expenses = transactions.filter(
    (item) =>
      item.type === "expense"
  );

  const depositTotal =
    deposits.reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0),
      0
    );

  const withdrawalTotal =
    withdrawals.reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0),
      0
    );

  const expenseTotal =
    expenses.reduce(
      (sum, item) =>
        sum +
        Number(item.amount || 0),
      0
    );

  const completedCount =
    transactions.filter(
      (item) =>
        item.status === "completed"
    ).length;

  const pendingCount =
    transactions.filter(
      (item) =>
        item.status === "pending"
    ).length;

  const filteredTransactions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return transactions.filter(
        (transaction) => {
          const matchesSearch =
            !query ||
            memberName(
              transaction.member_id
            )
              .toLowerCase()
              .includes(query) ||
            (
              transaction.description ||
              ""
            )
              .toLowerCase()
              .includes(query) ||
            transaction.type
              .toLowerCase()
              .includes(query) ||
            displayType(
              transaction.type
            )
              .toLowerCase()
              .includes(query);

          const matchesType =
            filterType === "all" ||
            transaction.type ===
              filterType;

          const matchesStatus =
            filterStatus === "all" ||
            transaction.status ===
              filterStatus;

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus
          );
        }
      );
    }, [
      transactions,
      members,
      search,
      filterType,
      filterStatus,
    ]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          <div style={loadingSpinner}>
            <RefreshCw size={18} />
          </div>

          <span>
            Loading Activity...
          </span>
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
                router.push("/admin")
              }
              style={backButton}
            >
              ← Admin Dashboard
            </button>

            <div style={titleRow}>
              <div style={titleIcon}>
                <Activity size={21} />
              </div>

              <div>
                <p style={eyebrowStyle}>
                  TRADEBISHI ADMIN
                </p>

                <h1 style={titleStyle}>
                  Cooperative Activity
                </h1>
              </div>
            </div>

            <p style={subtitleStyle}>
              Monitor and manage every
              member transaction and
              cooperative activity.
            </p>
          </div>

          <div style={headerButtons}>
            <button
              type="button"
              onClick={openAddModal}
              style={primaryButton}
            >
              <Plus size={16} />
              Add Activity
            </button>

            <button
              type="button"
              onClick={refreshActivity}
              disabled={refreshing}
              style={{
                ...secondaryButton,
                opacity:
                  refreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation:
                    refreshing
                      ? "spin 1s linear infinite"
                      : "none",
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
            <XCircle size={17} />
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              style={errorClose}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Member Deposits"
            value={currency(
              depositTotal
            )}
            icon={
              <ArrowDownLeft size={18} />
            }
            accent="green"
            subtitle={`${deposits.length} records`}
          />

          <SummaryCard
            title="Member Withdrawals"
            value={currency(
              withdrawalTotal
            )}
            icon={
              <ArrowUpRight size={18} />
            }
            accent="red"
            subtitle={`${withdrawals.length} records`}
          />

          <SummaryCard
            title="Cooperative Others"
            value={currency(
              expenseTotal
            )}
            icon={
              <Receipt size={18} />
            }
            accent="yellow"
            subtitle={`${expenses.length} records`}
          />

          <SummaryCard
            title="Total Activity"
            value={transactions.length.toString()}
            icon={
              <Activity size={18} />
            }
            accent="blue"
            subtitle={`${completedCount} completed · ${pendingCount} pending`}
          />
        </section>

        {/* ACTIVITY SECTION */}

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionLabelRow}>
                <div
                  style={sectionLabelDot}
                />

                <p style={cardLabel}>
                  ALL ACTIVITY
                </p>
              </div>

              <h2 style={sectionTitle}>
                Activity Records
              </h2>

              <p style={sectionSubtitle}>
                Every deposit, withdrawal
                and cooperative activity
                recorded in TradeBishi.
              </p>
            </div>

            <div style={recordBadge}>
              <Activity size={13} />

              {filteredTransactions.length}
              {" / "}
              {transactions.length}
            </div>
          </div>

          {/* FILTER BAR */}

          <div style={filterBar}>
            <div
              style={searchWrapper}
            >
              <Search
                size={16}
                style={searchIcon}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search member or description..."
                style={searchInput}
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  style={clearSearch}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={filterControl}>
              <Filter size={14} />

              <select
                value={filterType}
                onChange={(event) =>
                  setFilterType(
                    event.target.value as
                      | "all"
                      | ActivityType
                  )
                }
                style={filterSelect}
              >
                <option value="all">
                  All Types
                </option>

                <option value="deposit">
                  Deposits
                </option>

                <option value="withdrawal">
                  Withdrawals
                </option>

                <option value="expense">
                  Others
                </option>
              </select>
            </div>

            <div style={filterControl}>
              <CheckCircle2
                size={14}
              />

              <select
                value={filterStatus}
                onChange={(event) =>
                  setFilterStatus(
                    event.target.value as
                      | "all"
                      | "completed"
                      | "pending"
                      | "cancelled"
                  )
                }
                style={filterSelect}
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

          {transactions.length === 0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}>
                <Activity size={27} />
              </div>

              <h3 style={emptyTitle}>
                No activity yet
              </h3>

              <p style={emptyText}>
                No cooperative activity has
                been recorded yet.
              </p>

              <button
                type="button"
                onClick={
                  openAddModal
                }
                style={primaryButton}
              >
                <Plus size={16} />
                Add First Activity
              </button>
            </div>
          ) : filteredTransactions.length ===
            0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}>
                <Search size={27} />
              </div>

              <h3 style={emptyTitle}>
                No matching activity
              </h3>

              <p style={emptyText}>
                Try changing your search
                or filters.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                style={secondaryButton}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={tableWrapper}>
              <div style={tableHeader}>
                <span>TYPE</span>
                <span>SOURCE</span>
                <span>AMOUNT</span>
                <span>DESCRIPTION</span>
                <span>STATUS</span>
                <span>DATE</span>
                <span>ACTIONS</span>
              </div>

              {filteredTransactions.map(
                (transaction) => (
                  <div
                    key={
                      transaction.id
                    }
                    style={tableRow}
                  >
                    <TypeBadge
                      type={
                        transaction.type
                      }
                    />

                    <div>
                      <strong
                        style={
                          memberNameStyle
                        }
                      >
                        {memberName(
                          transaction.member_id
                        )}
                      </strong>

                      <p
                        style={
                          transaction.member_id
                            ? mutedText
                            : expenseSource
                        }
                      >
                        {transaction.member_id
                          ? "Member transaction"
                          : "Cooperative activity"}
                      </p>
                    </div>

                    <strong
                      style={
                        amountStyle
                      }
                    >
                      {currency(
                        Number(
                          transaction.amount
                        )
                      )}
                    </strong>

                    <span
                      style={
                        descriptionText
                      }
                      title={
                        transaction.description ||
                        ""
                      }
                    >
                      {transaction.description ||
                        "—"}
                    </span>

                    <StatusBadge
                      status={
                        transaction.status
                      }
                    />

                    <span
                      style={
                        dateText
                      }
                    >
                      {new Date(
                        transaction.created_at
                      ).toLocaleString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>

                    <div
                      style={
                        actions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            transaction
                          )
                        }
                        style={
                          iconButton
                        }
                        title="Edit activity"
                      >
                        <Pencil
                          size={15}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          deleteActivity(
                            transaction
                          )
                        }
                        style={{
                          ...deleteIconButton,
                          opacity:
                            deleting
                              ? 0.5
                              : 1,
                        }}
                        title="Delete activity"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* MODAL */}

      {showModal && (
        <div
          style={modalOverlay}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <p
                  style={
                    eyebrowStyle
                  }
                >
                  {editing
                    ? "EDIT ACTIVITY"
                    : "ADMIN ACTION"}
                </p>

                <h2
                  style={
                    modalTitle
                  }
                >
                  {editing
                    ? "Edit Activity"
                    : "Add Activity"}
                </h2>

                <p
                  style={
                    modalSubtitle
                  }
                >
                  {editing
                    ? "Update the selected activity."
                    : "Record a member transaction or cooperative activity."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                style={
                  closeButton
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* SOURCE */}

            <div style={formGroup}>
              <label
                style={
                  formLabel
                }
              >
                Activity Source
              </label>

              <div
                style={
                  sourceGrid
                }
              >
                <button
                  type="button"
                  onClick={() => {
                    setSource(
                      "member"
                    );

                    if (
                      type ===
                      "expense"
                    ) {
                      setType(
                        "deposit"
                      );
                    }
                  }}
                  style={{
                    ...sourceButton,
                    ...(source ===
                    "member"
                      ? sourceButtonActive
                      : {}),
                  }}
                >
                  <span
                    style={
                      sourceIcon
                    }
                  >
                    👤
                  </span>

                  <span>
                    Member
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSource(
                      "cooperative"
                    );

                    setType(
                      "expense"
                    );

                    setMemberId(
                      ""
                    );
                  }}
                  style={{
                    ...sourceButton,
                    ...(source ===
                    "cooperative"
                      ? sourceButtonActive
                      : {}),
                  }}
                >
                  <span
                    style={
                      sourceIcon
                    }
                  >
                    🏢
                  </span>

                  <span>
                    Cooperative Activity
                  </span>
                </button>
              </div>
            </div>

            {/* MEMBER */}

            {source === "member" && (
              <div style={formGroup}>
                <label
                  style={
                    formLabel
                  }
                >
                  Member
                </label>

                <select
                  value={
                    memberId
                  }
                  onChange={(
                    event
                  ) =>
                    setMemberId(
                      event.target
                        .value
                    )
                  }
                  style={
                    formInput
                  }
                >
                  <option value="">
                    Select member
                  </option>

                  {members.map(
                    (
                      member
                    ) => (
                      <option
                        key={
                          member.id
                        }
                        value={
                          member.id
                        }
                      >
                        {
                          member.full_name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {/* TYPE */}

            <div style={formGroup}>
              <label
                style={
                  formLabel
                }
              >
                Activity Type
              </label>

              <select
                value={type}
                onChange={(
                  event
                ) =>
                  setType(
                    event.target
                      .value as ActivityType
                  )
                }
                disabled={
                  source ===
                  "cooperative"
                }
                style={{
                  ...formInput,
                  opacity:
                    source ===
                    "cooperative"
                      ? 0.55
                      : 1,
                }}
              >
                {source ===
                "member" ? (
                  <>
                    <option value="deposit">
                      Deposit
                    </option>

                    <option value="withdrawal">
                      Withdrawal
                    </option>
                  </>
                ) : (
                  <option value="expense">
                    Others
                  </option>
                )}
              </select>
            </div>

            {/* AMOUNT */}

            <div style={formGroup}>
              <label
                style={
                  formLabel
                }
              >
                Amount
              </label>

              <div
                style={
                  inputWithPrefix
                }
              >
                <span
                  style={
                    currencyPrefix
                  }
                >
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    amount
                  }
                  onChange={(
                    event
                  ) =>
                    setAmount(
                      event.target
                        .value
                    )
                  }
                  placeholder="0.00"
                  style={
                    amountInput
                  }
                />
              </div>
            </div>

            {/* DESCRIPTION */}

            <div style={formGroup}>
              <label
                style={
                  formLabel
                }
              >
                Description
              </label>

              <input
                type="text"
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
                  )
                }
                placeholder={
                  source ===
                  "cooperative"
                    ? "e.g. Office electricity or other cooperative activity"
                    : "e.g. Monthly contribution"
                }
                style={
                  formInput
                }
              />
            </div>

            {/* STATUS */}

            <div style={formGroup}>
              <label
                style={
                  formLabel
                }
              >
                Status
              </label>

              <select
                value={
                  status
                }
                onChange={(
                  event
                ) =>
                  setStatus(
                    event.target
                      .value
                  )
                }
                style={
                  formInput
                }
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

            {source ===
              "cooperative" && (
              <div
                style={
                  hintBox
                }
              >
                <Receipt
                  size={16}
                />

                <span>
                  This will be recorded as
                  a cooperative activity with
                  <strong>
                    {" "}
                    no member attached
                  </strong>
                  .
                </span>
              </div>
            )}

            <div
              style={
                modalActions
              }
            >
              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  saving
                }
                style={
                  cancelButton
                }
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveActivity
                }
                disabled={
                  saving
                }
                style={{
                  ...primaryButton,
                  flex: 1,
                  justifyContent:
                    "center",
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      style={{
                        animation:
                          "spin 1s linear infinite",
                      }}
                    />

                    Saving...
                  </>
                ) : editing ? (
                  <>
                    <Pencil
                      size={16}
                    />

                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus
                      size={16}
                    />

                    Add Activity
                  </>
                )}
              </button>
            </div>
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

        button,
        input,
        select {
          font-family: inherit;
        }

        button {
          transition:
            opacity 0.18s ease,
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        button:not(:disabled):hover {
          transform: translateY(-1px);
        }

        button:not(:disabled):active {
          transform: translateY(0);
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        select option {
          background: #111;
          color: white;
        }

        @media (max-width: 1000px) {
          .tradebishi-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 700px) {
          .tradebishi-header {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .tradebishi-header-buttons {
            justify-content: flex-start !important;
          }

          .tradebishi-summary-grid {
            grid-template-columns: 1fr !important;
          }

          .tradebishi-filter-bar {
            flex-direction: column !important;
          }

          .tradebishi-search {
            width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  accent,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: "green" | "red" | "yellow" | "blue";
  subtitle: string;
}) {
  const accentStyles = {
    green: {
      color: "#34d399",
      background:
        "rgba(52,211,153,0.10)",
      border:
        "rgba(52,211,153,0.15)",
    },

    red: {
      color: "#f87171",
      background:
        "rgba(248,113,113,0.10)",
      border:
        "rgba(248,113,113,0.15)",
    },

    yellow: {
      color: "#facc15",
      background:
        "rgba(250,204,21,0.10)",
      border:
        "rgba(250,204,21,0.15)",
    },

    blue: {
      color: "#60a5fa",
      background:
        "rgba(96,165,250,0.10)",
      border:
        "rgba(96,165,250,0.15)",
    },
  };

  const current =
    accentStyles[accent];

  return (
    <div
      style={{
        ...summaryCard,
        borderColor:
          current.border,
      }}
    >
      <div
        style={{
          ...summaryIcon,
          color: current.color,
          background:
            current.background,
        }}
      >
        {icon}
      </div>

      <p style={cardLabel}>
        {title}
      </p>

      <h2
        style={{
          ...summaryValue,
          color: "white",
        }}
      >
        {value}
      </h2>

      <p
        style={{
          margin:
            "8px 0 0",
          color:
            "rgba(255,255,255,0.28)",
          fontSize: "11px",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function TypeBadge({
  type,
}: {
  type: string;
}) {
  const config = {
    deposit: {
      color: "#34d399",
      background:
        "rgba(52,211,153,0.10)",
      icon: (
        <ArrowDownLeft
          size={12}
        />
      ),
      label: "Deposit",
    },

    withdrawal: {
      color: "#f87171",
      background:
        "rgba(248,113,113,0.10)",
      icon: (
        <ArrowUpRight
          size={12}
        />
      ),
      label: "Withdrawal",
    },

    expense: {
      color: "#facc15",
      background:
        "rgba(250,204,21,0.10)",
      icon: (
        <Receipt
          size={12}
        />
      ),
      label: "Others",
    },
  };

  const current =
    config[
      type as keyof typeof config
    ] || {
      color:
        "rgba(255,255,255,0.6)",
      background:
        "rgba(255,255,255,0.06)",
      icon: (
        <Activity
          size={12}
        />
      ),
      label: type,
    };

  return (
    <span
      style={{
        width: "fit-content",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding:
          "6px 10px",
        borderRadius:
          "999px",
        background:
          current.background,
        color:
          current.color,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing:
          "0.2px",
        whiteSpace:
          "nowrap",
      }}
    >
      {current.icon}
      {current.label}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status?.toLowerCase();

  const config = {
    completed: {
      color: "#34d399",
      background:
        "rgba(52,211,153,0.08)",
      icon: (
        <CheckCircle2
          size={12}
        />
      ),
    },

    pending: {
      color: "#facc15",
      background:
        "rgba(250,204,21,0.08)",
      icon: (
        <Clock3
          size={12}
        />
      ),
    },

    cancelled: {
      color: "#f87171",
      background:
        "rgba(248,113,113,0.08)",
      icon: (
        <XCircle
          size={12}
        />
      ),
    },
  };

  const current =
    config[
      normalized as keyof typeof config
    ] || {
      color:
        "rgba(255,255,255,0.6)",
      background:
        "rgba(255,255,255,0.06)",
      icon: (
        <Activity
          size={12}
        />
      ),
    };

  return (
    <span
      style={{
        width: "fit-content",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding:
          "6px 10px",
        borderRadius:
          "999px",
        background:
          current.background,
        color:
          current.color,
        fontSize: "10px",
        fontWeight: 600,
        textTransform:
          "capitalize",
        whiteSpace:
          "nowrap",
      }}
    >
      {current.icon}
      {normalized ||
        "unknown"}
    </span>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.035), transparent 32%), #050505",
  color: "white",
  padding:
    "34px 25px 60px",
};

const containerStyle = {
  maxWidth: "1450px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-end",
  gap: "25px",
  marginBottom: "28px",
};

const titleRow = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
};

const titleIcon = {
  width: "43px",
  height: "43px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  background:
    "rgba(255,255,255,0.07)",
  border:
    "1px solid rgba(255,255,255,0.10)",
  color:
    "rgba(255,255,255,0.9)",
};

const headerButtons = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
};

const backButton = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginBottom: "20px",
  padding:
    "8px 12px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.035)",
  color:
    "rgba(255,255,255,0.65)",
  cursor: "pointer",
  fontSize: "12px",
};

const eyebrowStyle = {
  margin: 0,
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "10px",
  letterSpacing: "3.5px",
  fontWeight: 700,
};

const titleStyle = {
  margin:
    "5px 0 0",
  fontSize: "34px",
  lineHeight: 1.1,
  letterSpacing:
    "-1.5px",
};

const subtitleStyle = {
  margin:
    "12px 0 0 56px",
  color:
    "rgba(255,255,255,0.42)",
  fontSize: "13px",
};

const primaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  gap: "8px",
  padding:
    "11px 15px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.18)",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  gap: "8px",
  padding:
    "11px 14px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "12px",
};

const errorBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  marginBottom: "18px",
  padding:
    "13px 15px",
  borderRadius: "13px",
  background:
    "rgba(248,113,113,0.07)",
  border:
    "1px solid rgba(248,113,113,0.17)",
  color: "#f87171",
  fontSize: "12px",
};

const errorClose = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  width: "27px",
  height: "27px",
  border: "none",
  borderRadius: "8px",
  background:
    "rgba(255,255,255,0.05)",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const summaryCard = {
  padding: "20px",
  borderRadius: "20px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.022))",
  border:
    "1px solid rgba(255,255,255,0.08)",
  boxShadow:
    "0 15px 45px rgba(0,0,0,0.18)",
};

const summaryIcon = {
  width: "37px",
  height: "37px",
  borderRadius: "11px",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  marginBottom: "16px",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const cardLabel = {
  margin: 0,
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "10px",
  letterSpacing: "1.4px",
  textTransform:
    "uppercase" as const,
  fontWeight: 700,
};

const summaryValue = {
  margin:
    "7px 0 0",
  fontSize: "24px",
  lineHeight: 1.15,
  letterSpacing:
    "-0.5px",
};

const sectionStyle = {
  padding: "24px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.075)",
};

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "20px",
};

const sectionLabelRow = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
};

const sectionLabelDot = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background:
    "rgba(255,255,255,0.45)",
};

const sectionTitle = {
  margin:
    "7px 0 0",
  fontSize: "22px",
  letterSpacing:
    "-0.5px",
};

const sectionSubtitle = {
  margin:
    "6px 0 0",
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "12px",
};

const recordBadge = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding:
    "8px 11px",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "11px",
  whiteSpace:
    "nowrap" as const,
};

const filterBar = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  marginBottom: "17px",
  padding:
    "10px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.18)",
  border:
    "1px solid rgba(255,255,255,0.055)",
};

const searchWrapper = {
  position: "relative" as const,
  flex: 1,
  minWidth: "220px",
};

const searchIcon = {
  position: "absolute" as const,
  left: "12px",
  top: "50%",
  transform:
    "translateY(-50%)",
  color:
    "rgba(255,255,255,0.3)",
  pointerEvents:
    "none" as const,
};

const searchInput = {
  width: "100%",
  padding:
    "10px 38px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.035)",
  color: "white",
  outline: "none",
  fontSize: "12px",
};

const clearSearch = {
  position: "absolute" as const,
  right: "8px",
  top: "50%",
  transform:
    "translateY(-50%)",
  width: "25px",
  height: "25px",
  border: "none",
  borderRadius: "7px",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  cursor: "pointer",
};

const filterControl = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding:
    "0 10px",
  color:
    "rgba(255,255,255,0.35)",
};

const filterSelect = {
  border: "none",
  outline: "none",
  background:
    "transparent",
  color:
    "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: "11px",
};

const tableWrapper = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "7px",
  overflowX:
    "auto" as const,
};

const tableHeader = {
  minWidth: "1250px",
  display: "grid",
  gridTemplateColumns:
    "1fr 1.5fr 1fr 1.7fr 1fr 1.45fr 0.75fr",
  gap: "15px",
  padding:
    "9px 15px",
  color:
    "rgba(255,255,255,0.27)",
  fontSize: "9px",
  letterSpacing: "1.2px",
  fontWeight: 700,
};

const tableRow = {
  minWidth: "1250px",
  display: "grid",
  gridTemplateColumns:
    "1fr 1.5fr 1fr 1.7fr 1fr 1.45fr 0.75fr",
  gap: "15px",
  alignItems: "center",
  padding:
    "15px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.20)",
  border:
    "1px solid rgba(255,255,255,0.055)",
};

const memberNameStyle = {
  fontSize: "12px",
  fontWeight: 650,
};

const mutedText = {
  margin:
    "4px 0 0",
  color:
    "rgba(255,255,255,0.24)",
  fontSize: "9px",
};

const expenseSource = {
  margin:
    "4px 0 0",
  color:
    "rgba(250,204,21,0.75)",
  fontSize: "9px",
};

const amountStyle = {
  fontSize: "12px",
  fontWeight: 650,
};

const descriptionText = {
  display: "block",
  color:
    "rgba(255,255,255,0.48)",
  fontSize: "11px",
  whiteSpace:
    "nowrap" as const,
  overflow: "hidden",
  textOverflow:
    "ellipsis",
};

const dateText = {
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "10px",
  lineHeight: 1.4,
};

const actions = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const iconButton = {
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  borderRadius: "9px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.75)",
  cursor: "pointer",
};

const deleteIconButton = {
  ...iconButton,
  color: "#f87171",
  border:
    "1px solid rgba(248,113,113,0.14)",
  background:
    "rgba(248,113,113,0.06)",
};

const emptyState = {
  minHeight: "300px",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "center",
  justifyContent:
    "center",
  gap: "8px",
  color:
    "rgba(255,255,255,0.35)",
};

const emptyIcon = {
  width: "58px",
  height: "58px",
  borderRadius: "17px",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  marginBottom: "5px",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  color:
    "rgba(255,255,255,0.5)",
};

const emptyTitle = {
  margin: "4px 0 0",
  color:
    "rgba(255,255,255,0.7)",
  fontSize: "15px",
};

const emptyText = {
  margin:
    "0 0 10px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "11px",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems: "center",
  justifyContent:
    "center",
  gap: "12px",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "12px",
};

const loadingSpinner = {
  width: "40px",
  height: "40px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  padding: "20px",
  background:
    "rgba(0,0,0,0.78)",
  backdropFilter:
    "blur(16px)",
};

const modal = {
  width: "100%",
  maxWidth: "570px",
  maxHeight: "90vh",
  overflowY:
    "auto" as const,
  padding: "28px",
  borderRadius: "25px",
  background:
    "linear-gradient(145deg, #151515, #0e0e0e)",
  border:
    "1px solid rgba(255,255,255,0.11)",
  boxShadow:
    "0 35px 120px rgba(0,0,0,0.7)",
};

const modalHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "26px",
};

const modalTitle = {
  margin:
    "8px 0 0",
  fontSize: "25px",
  letterSpacing:
    "-0.7px",
};

const modalSubtitle = {
  margin:
    "6px 0 0",
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const closeButton = {
  width: "35px",
  height: "35px",
  flexShrink: 0,
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.05)",
  color:
    "rgba(255,255,255,0.8)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
};

const formGroup = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "8px",
  marginBottom: "16px",
};

const formLabel = {
  color:
    "rgba(255,255,255,0.62)",
  fontSize: "11px",
  fontWeight: 650,
};

const formInput = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "13px 14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  outline: "none",
  fontSize: "13px",
};

const inputWithPrefix = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  overflow: "hidden",
};

const currencyPrefix = {
  padding:
    "0 0 0 14px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "14px",
};

const amountInput = {
  flex: 1,
  minWidth: 0,
  padding:
    "13px 14px 13px 7px",
  border: "none",
  outline: "none",
  background:
    "transparent",
  color: "white",
  fontSize: "13px",
};

const sourceGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "8px",
};

const sourceButton = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "center",
  gap: "8px",
  padding: "13px 10px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.035)",
  color:
    "rgba(255,255,255,0.55)",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 600,
};

const sourceButtonActive = {
  background:
    "rgba(255,255,255,0.10)",
  color: "white",
  border:
    "1px solid rgba(255,255,255,0.20)",
};

const sourceIcon = {
  fontSize: "14px",
};

const hintBox = {
  display: "flex",
  alignItems:
    "flex-start",
  gap: "9px",
  padding:
    "12px 13px",
  marginTop: "2px",
  borderRadius: "12px",
  background:
    "rgba(250,204,21,0.055)",
  border:
    "1px solid rgba(250,204,21,0.11)",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "11px",
  lineHeight: 1.5,
};

const modalActions = {
  display: "flex",
  gap: "9px",
  marginTop: "23px",
};

const cancelButton = {
  padding:
    "12px 18px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color: "white",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};