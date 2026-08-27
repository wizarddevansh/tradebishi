"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  LogOut,
  X,
  Plus,
  Trash2,
  Pencil,
  BarChart3,
  ArrowLeft,
  Search,
  CircleDollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Investment = {
  id: string;
  member_id: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  updated_at: string;
};

type Member = {
  id: string;
  full_name: string;
};

export default function AdminInvestmentsPage() {
  const router = useRouter();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedInvestment, setSelectedInvestment] =
    useState<Investment | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [newMemberId, setNewMemberId] = useState("");
  const [newInvestedAmount, setNewInvestedAmount] = useState("");
  const [newCurrentValue, setNewCurrentValue] = useState("");

  const [editInvestedAmount, setEditInvestedAmount] = useState("");
  const [editCurrentValue, setEditCurrentValue] = useState("");

  useEffect(() => {
    loadInvestments();
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

    const { data: profile, error: profileError } = await supabase
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
      return null;
    }

    return {
      user,
      profile,
    };
  }

  async function loadInvestments() {
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setLoading(false);
      return;
    }

    const [investmentsResult, membersResult] =
      await Promise.all([
        supabase
          .from("investments")
          .select(
            "id, member_id, invested_amount, current_value, profit_loss, updated_at"
          )
          .order("updated_at", {
            ascending: false,
          }),

        supabase
          .from("members")
          .select("id, full_name")
          .order("full_name", {
            ascending: true,
          }),
      ]);

    if (investmentsResult.error) {
      setError(investmentsResult.error.message);
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }

    setInvestments(
      (investmentsResult.data ?? []) as Investment[]
    );

    setMembers(
      (membersResult.data ?? []) as Member[]
    );

    setLoading(false);
  }

  async function refreshInvestments() {
    if (refreshing) return;

    setRefreshing(true);
    await loadInvestments();
    setRefreshing(false);
  }

  function currency(value: number) {
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  function memberName(memberId: string) {
    const member = members.find(
      (item) => item.id === memberId
    );

    return member?.full_name || "Unknown Member";
  }

  const filteredInvestments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return investments;

    return investments.filter((investment) =>
      memberName(investment.member_id)
        .toLowerCase()
        .includes(query)
    );
  }, [investments, searchQuery, members]);

  const totalInvested = investments.reduce(
    (sum, investment) =>
      sum + Number(investment.invested_amount || 0),
    0
  );

  const totalCurrentValue = investments.reduce(
    (sum, investment) =>
      sum + Number(investment.current_value || 0),
    0
  );

  const totalProfitLoss = investments.reduce(
    (sum, investment) =>
      sum + Number(investment.profit_loss || 0),
    0
  );

  const totalReturn =
    totalInvested > 0
      ? (totalProfitLoss / totalInvested) * 100
      : 0;

  const profitableInvestments = investments.filter(
    (investment) =>
      Number(investment.profit_loss || 0) > 0
  ).length;

  const losingInvestments = investments.filter(
    (investment) =>
      Number(investment.profit_loss || 0) < 0
  ).length;

  function resetAddForm() {
    setNewMemberId("");
    setNewInvestedAmount("");
    setNewCurrentValue("");
  }

  function openAddModal() {
    setError("");
    resetAddForm();
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (saving) return;

    setShowAddModal(false);
    resetAddForm();
  }

  function openEditModal(investment: Investment) {
    setError("");

    setSelectedInvestment(investment);

    setEditInvestedAmount(
      String(investment.invested_amount)
    );

    setEditCurrentValue(
      String(investment.current_value)
    );

    setShowEditModal(true);
  }

  function closeEditModal() {
    if (saving) return;

    setShowEditModal(false);
    setSelectedInvestment(null);

    setEditInvestedAmount("");
    setEditCurrentValue("");
  }

  async function addInvestment() {
    if (saving) return;

    setError("");

    if (!newMemberId) {
      setError("Please select a member.");
      return;
    }

    const investedAmount = Number(newInvestedAmount);
    const currentValue = Number(newCurrentValue);

    if (
      !Number.isFinite(investedAmount) ||
      investedAmount <= 0
    ) {
      setError("Please enter a valid invested amount.");
      return;
    }

    if (
      !Number.isFinite(currentValue) ||
      currentValue < 0
    ) {
      setError("Please enter a valid current value.");
      return;
    }

    const profitLoss = currentValue - investedAmount;

    setSaving(true);

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("investments")
      .insert({
        member_id: newMemberId,
        invested_amount: investedAmount,
        current_value: currentValue,
        profit_loss: profitLoss,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setShowAddModal(false);
    resetAddForm();

    await loadInvestments();

    setSaving(false);
  }

  async function updateInvestment() {
    if (saving || !selectedInvestment) return;

    setError("");

    const investedAmount = Number(editInvestedAmount);
    const currentValue = Number(editCurrentValue);

    if (
      !Number.isFinite(investedAmount) ||
      investedAmount <= 0
    ) {
      setError("Please enter a valid invested amount.");
      return;
    }

    if (
      !Number.isFinite(currentValue) ||
      currentValue < 0
    ) {
      setError("Please enter a valid current value.");
      return;
    }

    const profitLoss = currentValue - investedAmount;

    setSaving(true);

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("investments")
      .update({
        invested_amount: investedAmount,
        current_value: currentValue,
        profit_loss: profitLoss,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedInvestment.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setShowEditModal(false);
    setSelectedInvestment(null);

    await loadInvestments();

    setSaving(false);
  }

  async function deleteInvestment(
    investment: Investment
  ) {
    if (deleting) return;

    const confirmed = window.confirm(
      `Delete this investment of ${currency(
        Number(investment.invested_amount)
      )} for ${memberName(
        investment.member_id
      )}?\n\nThis action cannot be undone.`
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

    const { error: deleteError } = await supabase
      .from("investments")
      .delete()
      .eq("id", investment.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    await loadInvestments();

    setDeleting(false);
  }

  async function signOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingContainer}>
          <div style={loadingOrb}>
            <Wallet size={22} />
          </div>

          <p style={loadingText}>
            Loading investments
          </p>

          <span style={loadingSubtext}>
            Please wait...
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
              onClick={() => router.push("/admin")}
              style={backButton}
            >
              <ArrowLeft size={15} />
              Admin Dashboard
            </button>

            <div style={eyebrowStyle}>
              TRADEBISHI
              <span style={eyebrowDot}>•</span>
              ADMIN
            </div>

            <h1 style={titleStyle}>
              Investments
            </h1>

            <p style={subtitleStyle}>
              Monitor and manage member investment
              portfolios.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={refreshInvestments}
              disabled={refreshing}
              style={secondaryButton}
            >
              <RefreshCw
                size={15}
                style={{
                  animation: refreshing
                    ? "spin 1s linear infinite"
                    : "none",
                }}
              />

              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={openAddModal}
              style={primaryButton}
            >
              <Plus size={16} />
              Add Investment
            </button>

            <button
              type="button"
              onClick={signOut}
              style={iconButton}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div style={errorBox}>
            <div style={errorIcon}>!</div>

            <div>
              <strong style={errorTitle}>
                Something went wrong
              </strong>

              <p style={errorMessage}>
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              style={errorClose}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Total Invested"
            value={currency(totalInvested)}
            icon={<Wallet size={18} />}
          />

          <SummaryCard
            title="Current Value"
            value={currency(totalCurrentValue)}
            icon={<CircleDollarSign size={18} />}
          />

          <SummaryCard
            title="Total P / L"
            value={currency(totalProfitLoss)}
            icon={
              totalProfitLoss >= 0 ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )
            }
            positive={totalProfitLoss >= 0}
            secondary={`${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(
              2
            )}% overall return`}
          />

          <SummaryCard
            title="Investment Records"
            value={investments.length.toString()}
            icon={<BarChart3 size={18} />}
            secondary={
              `${profitableInvestments} profitable · ${losingInvestments} losing`
            }
          />
        </section>

        {/* MAIN PANEL */}

        <section style={sectionStyle}>
          <div style={sectionTop}>
            <div>
              <div style={sectionEyebrow}>
                PORTFOLIO
              </div>

              <h2 style={sectionTitle}>
                Investment Records
              </h2>

              <p style={sectionSubtitle}>
                All investment positions currently
                recorded in TradeBishi.
              </p>
            </div>

            <div style={sectionRight}>
              <div style={recordBadge}>
                <span style={recordDot} />
                {investments.length}{" "}
                {investments.length === 1
                  ? "record"
                  : "records"}
              </div>
            </div>
          </div>

          {/* SEARCH */}

          {investments.length > 0 && (
            <div style={searchWrapper}>
              <Search
                size={16}
                style={searchIcon}
              />

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search by member name..."
                style={searchInput}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  style={searchClear}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* EMPTY */}

          {investments.length === 0 ? (
            <div style={emptyState}>
              <div style={emptyIcon}>
                <Wallet size={28} />
              </div>

              <h3 style={emptyTitle}>
                No investments yet
              </h3>

              <p style={emptyText}>
                Create the first investment record
                for a member to get started.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                style={primaryButton}
              >
                <Plus size={16} />
                Add First Investment
              </button>
            </div>
          ) : filteredInvestments.length === 0 ? (
            <div style={emptySearchState}>
              <Search size={24} />

              <p>
                No investments match
                "{searchQuery}".
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div style={desktopTable}>
                <div style={tableHeader}>
                  <span>MEMBER</span>
                  <span>INVESTED</span>
                  <span>CURRENT VALUE</span>
                  <span>PROFIT / LOSS</span>
                  <span>UPDATED</span>
                  <span>ACTIONS</span>
                </div>

                {filteredInvestments.map(
                  (investment) => {
                    const invested = Number(
                      investment.invested_amount || 0
                    );

                    const currentValue = Number(
                      investment.current_value || 0
                    );

                    const profitLoss = Number(
                      investment.profit_loss || 0
                    );

                    const returnPercent =
                      invested > 0
                        ? (profitLoss / invested) *
                          100
                        : 0;

                    return (
                      <InvestmentRow
                        key={investment.id}
                        investment={investment}
                        memberName={memberName(
                          investment.member_id
                        )}
                        invested={invested}
                        currentValue={currentValue}
                        profitLoss={profitLoss}
                        returnPercent={
                          returnPercent
                        }
                        currency={currency}
                        onEdit={
                          openEditModal
                        }
                        onDelete={
                          deleteInvestment
                        }
                        deleting={deleting}
                      />
                    );
                  }
                )}
              </div>

              {/* MOBILE CARDS */}

              <div style={mobileCards}>
                {filteredInvestments.map(
                  (investment) => {
                    const invested = Number(
                      investment.invested_amount || 0
                    );

                    const currentValue = Number(
                      investment.current_value || 0
                    );

                    const profitLoss = Number(
                      investment.profit_loss || 0
                    );

                    const returnPercent =
                      invested > 0
                        ? (profitLoss / invested) *
                          100
                        : 0;

                    return (
                      <MobileInvestmentCard
                        key={investment.id}
                        investment={investment}
                        memberName={memberName(
                          investment.member_id
                        )}
                        invested={invested}
                        currentValue={currentValue}
                        profitLoss={profitLoss}
                        returnPercent={
                          returnPercent
                        }
                        currency={currency}
                        onEdit={
                          openEditModal
                        }
                        onDelete={
                          deleteInvestment
                        }
                        deleting={deleting}
                      />
                    );
                  }
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ADD MODAL */}

      {showAddModal && (
        <InvestmentModal
          mode="add"
          saving={saving}
          memberName=""
          members={members}
          memberId={newMemberId}
          investedAmount={
            newInvestedAmount
          }
          currentValue={
            newCurrentValue
          }
          onMemberChange={
            setNewMemberId
          }
          onInvestedChange={
            setNewInvestedAmount
          }
          onCurrentChange={
            setNewCurrentValue
          }
          onClose={closeAddModal}
          onSubmit={addInvestment}
        />
      )}

      {/* EDIT MODAL */}

      {showEditModal &&
        selectedInvestment && (
          <InvestmentModal
            mode="edit"
            saving={saving}
            memberName={memberName(
              selectedInvestment.member_id
            )}
            members={members}
            memberId={
              selectedInvestment.member_id
            }
            investedAmount={
              editInvestedAmount
            }
            currentValue={
              editCurrentValue
            }
            onMemberChange={() => {}}
            onInvestedChange={
              setEditInvestedAmount
            }
            onCurrentChange={
              setEditCurrentValue
            }
            onClose={closeEditModal}
            onSubmit={updateInvestment}
          />
        )}
    </main>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  positive,
  secondary,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  secondary?: string;
}) {
  return (
    <div style={summaryCard}>
      <div style={summaryTop}>
        <div style={summaryIcon}>
          {icon}
        </div>

        {positive !== undefined && (
          <span
            style={{
              ...statusPill,
              color: positive
                ? "#34d399"
                : "#f87171",
              background: positive
                ? "rgba(52,211,153,0.08)"
                : "rgba(248,113,113,0.08)",
            }}
          >
            {positive ? "Positive" : "Negative"}
          </span>
        )}
      </div>

      <p style={cardLabel}>{title}</p>

      <h2
        style={{
          ...summaryValue,
          color:
            positive === undefined
              ? "#fff"
              : positive
              ? "#34d399"
              : "#f87171",
        }}
      >
        {value}
      </h2>

      {secondary && (
        <p style={summarySecondary}>
          {secondary}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   DESKTOP ROW
========================================================= */

function InvestmentRow({
  investment,
  memberName,
  invested,
  currentValue,
  profitLoss,
  returnPercent,
  currency,
  onEdit,
  onDelete,
  deleting,
}: {
  investment: Investment;
  memberName: string;
  invested: number;
  currentValue: number;
  profitLoss: number;
  returnPercent: number;
  currency: (value: number) => string;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  deleting: boolean;
}) {
  const positive = profitLoss >= 0;

  return (
    <div style={tableRow}>
      <div style={memberCell}>
        <div style={memberAvatar}>
          {memberName
            .charAt(0)
            .toUpperCase()}
        </div>

        <div style={memberInfo}>
          <strong style={memberNameText}>
            {memberName}
          </strong>

          <span style={memberIdText}>
            {investment.member_id}
          </span>
        </div>
      </div>

      <div style={moneyCell}>
        {currency(invested)}
      </div>

      <div style={moneyCell}>
        {currency(currentValue)}
      </div>

      <div>
        <div
          style={{
            ...profitValue,
            color: positive
              ? "#34d399"
              : "#f87171",
          }}
        >
          {positive ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}

          {positive ? "+" : ""}
          {currency(profitLoss)}
        </div>

        <span
          style={{
            ...returnText,
            color: positive
              ? "rgba(52,211,153,0.7)"
              : "rgba(248,113,113,0.7)",
          }}
        >
          {positive ? "+" : ""}
          {returnPercent.toFixed(2)}%
        </span>
      </div>

      <div>
        <span style={dateText}>
          {formatDate(
            investment.updated_at
          )}
        </span>
      </div>

      <div style={rowActions}>
        <button
          type="button"
          onClick={() =>
            onEdit(investment)
          }
          style={editButton}
        >
          <Pencil size={13} />
          Edit
        </button>

        <button
          type="button"
          disabled={deleting}
          onClick={() =>
            onDelete(investment)
          }
          style={deleteButton}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   MOBILE CARD
========================================================= */

function MobileInvestmentCard({
  investment,
  memberName,
  invested,
  currentValue,
  profitLoss,
  returnPercent,
  currency,
  onEdit,
  onDelete,
  deleting,
}: {
  investment: Investment;
  memberName: string;
  invested: number;
  currentValue: number;
  profitLoss: number;
  returnPercent: number;
  currency: (value: number) => string;
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  deleting: boolean;
}) {
  const positive = profitLoss >= 0;

  return (
    <div style={mobileCard}>
      <div style={mobileCardTop}>
        <div style={memberCell}>
          <div style={memberAvatar}>
            {memberName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div style={memberInfo}>
            <strong style={memberNameText}>
              {memberName}
            </strong>

            <span style={memberIdText}>
              {investment.member_id}
            </span>
          </div>
        </div>

        <div
          style={{
            ...mobileProfit,
            color: positive
              ? "#34d399"
              : "#f87171",
          }}
        >
          {positive ? "+" : ""}
          {returnPercent.toFixed(2)}%
        </div>
      </div>

      <div style={mobileValues}>
        <div style={mobileValueBox}>
          <span style={mobileLabel}>
            INVESTED
          </span>

          <strong>
            {currency(invested)}
          </strong>
        </div>

        <div style={mobileValueBox}>
          <span style={mobileLabel}>
            CURRENT
          </span>

          <strong>
            {currency(currentValue)}
          </strong>
        </div>

        <div style={mobileValueBox}>
          <span style={mobileLabel}>
            P / L
          </span>

          <strong
            style={{
              color: positive
                ? "#34d399"
                : "#f87171",
            }}
          >
            {positive ? "+" : ""}
            {currency(profitLoss)}
          </strong>
        </div>
      </div>

      <div style={mobileCardBottom}>
        <span style={dateText}>
          Updated{" "}
          {formatDate(
            investment.updated_at
          )}
        </span>

        <div style={rowActions}>
          <button
            type="button"
            onClick={() =>
              onEdit(investment)
            }
            style={editButton}
          >
            <Pencil size={13} />
            Edit
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={() =>
              onDelete(investment)
            }
            style={deleteButton}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function InvestmentModal({
  mode,
  saving,
  memberName,
  members,
  memberId,
  investedAmount,
  currentValue,
  onMemberChange,
  onInvestedChange,
  onCurrentChange,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  saving: boolean;
  memberName: string;
  members: Member[];
  memberId: string;
  investedAmount: string;
  currentValue: string;
  onMemberChange: (value: string) => void;
  onInvestedChange: (value: string) => void;
  onCurrentChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const invested = Number(investedAmount);
  const current = Number(currentValue);

  const previewProfit =
    Number.isFinite(invested) &&
    Number.isFinite(current)
      ? current - invested
      : 0;

  const previewPositive =
    previewProfit >= 0;

  return (
    <div
      style={modalOverlay}
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div style={modal}>
        <div style={modalHeader}>
          <div>
            <div style={modalEyebrow}>
              {mode === "add"
                ? "NEW POSITION"
                : "EDIT POSITION"}
            </div>

            <h2 style={modalTitle}>
              {mode === "add"
                ? "Add Investment"
                : memberName}
            </h2>

            <p style={modalSubtitle}>
              {mode === "add"
                ? "Create a new investment record for a member."
                : "Update the current investment position."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButton}
          >
            <X size={18} />
          </button>
        </div>

        {mode === "add" && (
          <div style={formGroup}>
            <label style={formLabel}>
              Member
            </label>

            <select
              value={memberId}
              onChange={(event) =>
                onMemberChange(
                  event.target.value
                )
              }
              style={formInput}
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

        {mode === "edit" && (
          <div style={selectedMemberBox}>
            <div style={memberAvatar}>
              {memberName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <span style={selectedMemberLabel}>
                MEMBER
              </span>

              <strong>
                {memberName}
              </strong>
            </div>
          </div>
        )}

        <div style={formGroup}>
          <label style={formLabel}>
            Invested Amount
          </label>

          <div style={inputWrapper}>
            <span style={inputPrefix}>
              ₹
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={investedAmount}
              onChange={(event) =>
                onInvestedChange(
                  event.target.value
                )
              }
              placeholder="0.00"
              style={numberInput}
            />
          </div>
        </div>

        <div style={formGroup}>
          <label style={formLabel}>
            Current Value
          </label>

          <div style={inputWrapper}>
            <span style={inputPrefix}>
              ₹
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={currentValue}
              onChange={(event) =>
                onCurrentChange(
                  event.target.value
                )
              }
              placeholder="0.00"
              style={numberInput}
            />
          </div>
        </div>

        <div style={previewBox}>
          <div>
            <span style={previewLabel}>
              CURRENT PROFIT / LOSS
            </span>

            <strong
              style={{
                ...previewValue,
                color: previewPositive
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {previewPositive ? "+" : ""}
              ₹
              {Math.abs(
                previewProfit
              ).toLocaleString(
                "en-IN",
                {
                  maximumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

          {invested > 0 && (
            <span
              style={{
                ...previewPercent,
                color: previewPositive
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {previewPositive
                ? "+"
                : ""}
              {(
                (previewProfit /
                  invested) *
                100
              ).toFixed(2)}
              %
            </span>
          )}
        </div>

        <p style={modalHint}>
          Profit / Loss is calculated automatically
          as Current Value − Invested Amount.
        </p>

        <div style={modalActions}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={cancelButton}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={{
              ...primaryButton,
              flex: 1,
              justifyContent: "center",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {mode === "add" ? (
              <Plus size={16} />
            ) : (
              <Pencil size={15} />
            )}

            {saving
              ? "Saving..."
              : mode === "add"
              ? "Create Investment"
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(date: string) {
  return new Date(date).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at 15% 0%, rgba(255,255,255,0.045), transparent 28%), #050505",
  color: "#fff",
  padding: "32px 24px 60px",
};

const containerStyle = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "30px",
  marginBottom: "28px",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "8px 11px",
  marginBottom: "22px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.035)",
  color:
    "rgba(255,255,255,0.55)",
  cursor: "pointer",
  fontSize: "12px",
};

const eyebrowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  margin: 0,
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "3.5px",
};

const eyebrowDot = {
  color:
    "rgba(255,255,255,0.18)",
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: "42px",
  lineHeight: 1.05,
  letterSpacing: "-2px",
  fontWeight: 700,
};

const subtitleStyle = {
  margin: "10px 0 0",
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "13px",
};

const headerActions = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 15px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.16)",
  background: "#fff",
  color: "#050505",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 700,
  boxShadow:
    "0 8px 25px rgba(0,0,0,0.25)",
};

const secondaryButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.78)",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
};

const iconButton = {
  width: "39px",
  height: "39px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.65)",
  cursor: "pointer",
};

const errorBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "13px 15px",
  marginBottom: "18px",
  borderRadius: "14px",
  border:
    "1px solid rgba(248,113,113,0.18)",
  background:
    "rgba(248,113,113,0.065)",
};

const errorIcon = {
  width: "23px",
  height: "23px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "rgba(248,113,113,0.12)",
  color: "#f87171",
  fontWeight: 800,
  fontSize: "12px",
};

const errorTitle = {
  fontSize: "12px",
  color: "#fca5a5",
};

const errorMessage = {
  margin: "3px 0 0",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "11px",
  wordBreak: "break-word" as const,
};

const errorClose = {
  marginLeft: "auto",
  border: "none",
  background: "transparent",
  color:
    "rgba(255,255,255,0.4)",
  cursor: "pointer",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "13px",
  marginBottom: "16px",
};

const summaryCard = {
  minWidth: 0,
  padding: "20px",
  borderRadius: "19px",
  border:
    "1px solid rgba(255,255,255,0.075)",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.022))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.025)",
};

const summaryTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "17px",
};

const summaryIcon = {
  width: "35px",
  height: "35px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.065)",
  color:
    "rgba(255,255,255,0.75)",
};

const statusPill = {
  padding: "5px 8px",
  borderRadius: "8px",
  fontSize: "9px",
  fontWeight: 700,
};

const cardLabel = {
  margin: 0,
  color:
    "rgba(255,255,255,0.36)",
  fontSize: "10px",
  letterSpacing: "1.2px",
  fontWeight: 600,
};

const summaryValue = {
  margin: "7px 0 0",
  fontSize: "24px",
  lineHeight: 1.1,
  letterSpacing: "-0.7px",
};

const summarySecondary = {
  margin: "7px 0 0",
  color:
    "rgba(255,255,255,0.28)",
  fontSize: "10px",
};

const sectionStyle = {
  borderRadius: "22px",
  border:
    "1px solid rgba(255,255,255,0.075)",
  background:
    "rgba(255,255,255,0.028)",
  overflow: "hidden",
};

const sectionTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "23px 24px 18px",
};

const sectionEyebrow = {
  color:
    "rgba(255,255,255,0.27)",
  fontSize: "9px",
  letterSpacing: "2px",
  fontWeight: 700,
};

const sectionTitle = {
  margin: "7px 0 0",
  fontSize: "21px",
  letterSpacing: "-0.5px",
};

const sectionSubtitle = {
  margin: "5px 0 0",
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "11px",
};

const sectionRight = {
  flexShrink: 0,
};

const recordBadge = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "7px 10px",
  borderRadius: "9px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "10px",
};

const recordDot = {
  width: "5px",
  height: "5px",
  borderRadius: "50%",
  background: "#34d399",
  boxShadow:
    "0 0 8px rgba(52,211,153,0.6)",
};

const searchWrapper = {
  position: "relative" as const,
  display: "flex",
  alignItems: "center",
  margin: "0 24px 14px",
};

const searchIcon = {
  position: "absolute" as const,
  left: "13px",
  color:
    "rgba(255,255,255,0.3)",
  pointerEvents: "none" as const,
};

const searchInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 40px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.035)",
  color: "white",
  outline: "none",
  fontSize: "12px",
};

const searchClear = {
  position: "absolute" as const,
  right: "9px",
  width: "25px",
  height: "25px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: "7px",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "rgba(255,255,255,0.45)",
  cursor: "pointer",
};

const desktopTable = {
  width: "100%",
  overflowX: "auto" as const,
  padding: "0 12px 12px",
};

const tableHeader = {
  minWidth: "1050px",
  display: "grid",
  gridTemplateColumns:
    "1.6fr 1fr 1.1fr 1.15fr 1.15fr 1fr",
  gap: "14px",
  padding: "11px 12px",
  color:
    "rgba(255,255,255,0.23)",
  fontSize: "9px",
  letterSpacing: "1.1px",
  fontWeight: 700,
};

const tableRow = {
  minWidth: "1050px",
  display: "grid",
  gridTemplateColumns:
    "1.6fr 1fr 1.1fr 1.15fr 1.15fr 1fr",
  gap: "14px",
  alignItems: "center",
  padding: "14px 12px",
  marginBottom: "6px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.055)",
  background:
    "rgba(0,0,0,0.18)",
};

const memberCell = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
};

const memberAvatar = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.045))",
  border:
    "1px solid rgba(255,255,255,0.08)",
  color:
    "rgba(255,255,255,0.72)",
  fontSize: "12px",
  fontWeight: 700,
};

const memberInfo = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
  gap: "3px",
};

const memberNameText = {
  fontSize: "12px",
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const memberIdText = {
  color:
    "rgba(255,255,255,0.2)",
  fontSize: "8px",
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const moneyCell = {
  color:
    "rgba(255,255,255,0.78)",
  fontSize: "12px",
  fontWeight: 600,
};

const profitValue = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 700,
};

const returnText = {
  display: "block",
  marginTop: "3px",
  fontSize: "9px",
  fontWeight: 600,
};

const dateText = {
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
};

const rowActions = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const editButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
  padding: "7px 9px",
  borderRadius: "8px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 600,
};

const deleteButton = {
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  border:
    "1px solid rgba(248,113,113,0.14)",
  background:
    "rgba(248,113,113,0.055)",
  color:
    "rgba(248,113,113,0.75)",
  cursor: "pointer",
};

const mobileCards = {
  display: "none",
};

const mobileCard = {
  margin: "0 12px 8px",
  padding: "16px",
  borderRadius: "15px",
  border:
    "1px solid rgba(255,255,255,0.06)",
  background:
    "rgba(0,0,0,0.18)",
};

const mobileCardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "15px",
};

const mobileProfit = {
  fontSize: "12px",
  fontWeight: 700,
};

const mobileValues = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "8px",
  marginTop: "15px",
};

const mobileValueBox = {
  padding: "10px",
  borderRadius: "10px",
  background:
    "rgba(255,255,255,0.035)",
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
};

const mobileLabel = {
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "8px",
  letterSpacing: "0.7px",
};

const mobileCardBottom = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginTop: "14px",
};

const emptyState = {
  minHeight: "330px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  padding: "30px",
  textAlign: "center" as const,
};

const emptyIcon = {
  width: "62px",
  height: "62px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "16px",
  borderRadius: "19px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.35)",
};

const emptyTitle = {
  margin: 0,
  fontSize: "17px",
};

const emptyText = {
  maxWidth: "340px",
  margin: "7px 0 18px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "11px",
  lineHeight: 1.6,
};

const emptySearchState = {
  minHeight: "220px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "12px",
};

const loadingContainer = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
};

const loadingOrb = {
  width: "46px",
  height: "46px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "13px",
  borderRadius: "14px",
  background:
    "rgba(255,255,255,0.06)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  color:
    "rgba(255,255,255,0.6)",
};

const loadingText = {
  margin: 0,
  color:
    "rgba(255,255,255,0.65)",
  fontSize: "13px",
};

const loadingSubtext = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "10px",
};

/* =========================================================
   MODAL STYLES
========================================================= */

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
  backdropFilter: "blur(18px)",
};

const modal = {
  width: "100%",
  maxWidth: "510px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: "27px",
  borderRadius: "23px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "linear-gradient(145deg, #151515, #0d0d0d)",
  boxShadow:
    "0 35px 100px rgba(0,0,0,0.7)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "25px",
};

const modalEyebrow = {
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
  letterSpacing: "2.2px",
  fontWeight: 700,
};

const modalTitle = {
  margin: "7px 0 0",
  fontSize: "24px",
  letterSpacing: "-0.7px",
};

const modalSubtitle = {
  margin: "6px 0 0",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
  lineHeight: 1.5,
};

const closeButton = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.65)",
  cursor: "pointer",
};

const formGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "7px",
  marginBottom: "16px",
};

const formLabel = {
  color:
    "rgba(255,255,255,0.55)",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.2px",
};

const formInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color: "#fff",
  outline: "none",
  fontSize: "12px",
};

const inputWrapper = {
  position: "relative" as const,
  display: "flex",
  alignItems: "center",
};

const inputPrefix = {
  position: "absolute" as const,
  left: "13px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "13px",
  pointerEvents: "none" as const,
};

const numberInput = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px 12px 28px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color: "#fff",
  outline: "none",
  fontSize: "13px",
};

const selectedMemberBox = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "11px",
  marginBottom: "16px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.07)",
  background:
    "rgba(255,255,255,0.035)",
};

const selectedMemberLabel = {
  display: "block",
  marginBottom: "3px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "8px",
  letterSpacing: "1px",
};

const previewBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "14px",
  marginTop: "3px",
  borderRadius: "13px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.065)",
};

const previewLabel = {
  display: "block",
  marginBottom: "4px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "8px",
  letterSpacing: "1px",
};

const previewValue = {
  display: "block",
  fontSize: "17px",
};

const previewPercent = {
  fontSize: "12px",
  fontWeight: 700,
};

const modalHint = {
  margin: "9px 2px 0",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "9px",
  lineHeight: 1.5,
};

const modalActions = {
  display: "flex",
  gap: "9px",
  marginTop: "22px",
};

const cancelButton = {
  padding: "12px 17px",
  borderRadius: "11px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.045)",
  color:
    "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 600,
};

/* =========================================================
   RESPONSIVE CSS
========================================================= */

if (typeof document !== "undefined") {
  const styleId =
    "tradebishi-investments-responsive";

  if (!document.getElementById(styleId)) {
    const style =
      document.createElement("style");

    style.id = styleId;

    style.innerHTML = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      input::placeholder {
        color: rgba(255,255,255,0.22);
      }

      select option {
        background: #111;
        color: white;
      }

      @media (max-width: 1000px) {
        .tradebishi-investment-page {
          padding: 25px 18px 50px;
        }
      }

      @media (max-width: 850px) {
        .tradebishi-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        .tradebishi-header {
          align-items: flex-start !important;
          flex-direction: column !important;
        }

        .tradebishi-header-actions {
          justify-content: flex-start !important;
        }
      }

      @media (max-width: 700px) {
        .tradebishi-investment-page {
          padding: 20px 12px 45px !important;
        }

        .tradebishi-title {
          font-size: 34px !important;
        }

        .tradebishi-summary-grid {
          gap: 9px !important;
        }

        .tradebishi-summary-card {
          padding: 16px !important;
        }

        .tradebishi-summary-value {
          font-size: 20px !important;
        }

        .tradebishi-desktop-table {
          display: none !important;
        }

        .tradebishi-mobile-cards {
          display: block !important;
        }
      }

      @media (min-width: 701px) {
        .tradebishi-desktop-table {
          display: block !important;
        }

        .tradebishi-mobile-cards {
          display: none !important;
        }
      }

      @media (max-width: 480px) {
        .tradebishi-summary-grid {
          grid-template-columns: 1fr !important;
        }

        .tradebishi-header-actions button {
          flex: 1;
          justify-content: center;
        }

        .tradebishi-section-top {
          align-items: flex-start !important;
          flex-direction: column !important;
        }

        .tradebishi-modal {
          padding: 21px !important;
        }

        .tradebishi-mobile-values {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    document.head.appendChild(style);
  }
}