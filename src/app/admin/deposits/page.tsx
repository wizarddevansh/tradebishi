"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  X,
  ExternalLink,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Deposit = {
  id: string;
  member_id: string;
  amount: number;
  method: string;
  proof_url: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Member = {
  id: string;
  full_name: string;
};

export default function AdminDepositsPage() {
  const router = useRouter();

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [selectedDeposit, setSelectedDeposit] =
    useState<Deposit | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);

  const [newMemberId, setNewMemberId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMethod, setNewMethod] = useState("bank_transfer");
  const [newProofUrl, setNewProofUrl] = useState("");
  const [newStatus, setNewStatus] = useState<
    "pending" | "approved"
  >("pending");

  useEffect(() => {
    loadDeposits();
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

  async function loadDeposits() {
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setLoading(false);
      return;
    }

    const [depositsResult, membersResult] =
      await Promise.all([
        supabase
          .from("deposits")
          .select(
            "id, member_id, amount, method, proof_url, status, reviewed_by, reviewed_at, created_at"
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

    if (depositsResult.error) {
      setError(depositsResult.error.message);
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }

    setDeposits(
      (depositsResult.data ?? []) as Deposit[]
    );

    setMembers(
      (membersResult.data ?? []) as Member[]
    );

    setLoading(false);
  }

  async function refreshDeposits() {
    setRefreshing(true);
    await loadDeposits();
    setRefreshing(false);
  }

  function resetAddForm() {
    setNewMemberId("");
    setNewAmount("");
    setNewMethod("bank_transfer");
    setNewProofUrl("");
    setNewStatus("pending");
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

  async function addDeposit() {
    if (saving) return;

    setError("");

    if (!newMemberId) {
      setError("Please select a member.");
      return;
    }

    const amount = Number(newAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setSaving(false);
      return;
    }

    const insertData = {
      member_id: newMemberId,
      amount,
      method: newMethod,
      proof_url: newProofUrl.trim() || null,
      status: newStatus,
      reviewed_by:
        newStatus === "approved"
          ? admin.user.id
          : null,
      reviewed_at:
        newStatus === "approved"
          ? new Date().toISOString()
          : null,
    };

    const {
      data: createdDeposit,
      error: insertError,
    } = await supabase
      .from("deposits")
      .insert(insertData)
      .select(
        "id, member_id, amount, method, proof_url, status, reviewed_by, reviewed_at, created_at"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    if (
      newStatus === "approved" &&
      createdDeposit
    ) {
      const { error: transactionError } =
        await supabase
          .from("transactions")
          .insert({
            member_id: createdDeposit.member_id,
            type: "deposit",
            amount: Number(createdDeposit.amount),
            description: "Deposit approved",
            status: "completed",
          });

      if (transactionError) {
        await supabase
          .from("deposits")
          .delete()
          .eq("id", createdDeposit.id);

        setError(
          `Deposit creation failed: ${transactionError.message}`
        );

        setSaving(false);
        return;
      }
    }

    setShowAddModal(false);
    resetAddForm();

    await loadDeposits();

    setSaving(false);
  }

  async function deleteDeposit(deposit: Deposit) {
    if (deleting) return;

    const confirmed = window.confirm(
      `Delete this deposit of ${currency(
        Number(deposit.amount)
      )} for ${memberName(
        deposit.member_id
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
        .from("deposits")
        .delete()
        .eq("id", deposit.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setSelectedDeposit(null);

    await loadDeposits();

    setDeleting(false);
  }

  async function reviewDeposit(
    depositId: string,
    newStatus: "approved" | "rejected"
  ) {
    if (reviewing) return;

    setReviewing(true);
    setError("");

    const supabase = createClient();

    const admin = await getAdmin();

    if (!admin) {
      setReviewing(false);
      return;
    }

    const {
      data: deposit,
      error: depositError,
    } = await supabase
      .from("deposits")
      .select(
        "id, member_id, amount, status"
      )
      .eq("id", depositId)
      .single();

    if (depositError || !deposit) {
      setError(
        depositError?.message ||
          "Deposit not found."
      );

      setReviewing(false);
      return;
    }

    if (
      deposit.status?.toLowerCase() !==
      "pending"
    ) {
      setError(
        "This deposit has already been reviewed."
      );

      setReviewing(false);
      return;
    }

    const { error: updateError } =
      await supabase
        .from("deposits")
        .update({
          status: newStatus,
          reviewed_by: admin.user.id,
          reviewed_at:
            new Date().toISOString(),
        })
        .eq("id", depositId)
        .eq("status", "pending");

    if (updateError) {
      setError(updateError.message);
      setReviewing(false);
      return;
    }

    if (newStatus === "approved") {
      const { error: transactionError } =
        await supabase
          .from("transactions")
          .insert({
            member_id: deposit.member_id,
            type: "deposit",
            amount: Number(deposit.amount),
            description: "Deposit approved",
            status: "completed",
          });

      if (transactionError) {
        await supabase
          .from("deposits")
          .update({
            status: "pending",
            reviewed_by: null,
            reviewed_at: null,
          })
          .eq("id", depositId);

        setError(
          `Deposit approval failed: ${transactionError.message}`
        );

        setReviewing(false);
        return;
      }
    }

    setSelectedDeposit(null);

    await loadDeposits();

    setReviewing(false);
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

  function memberName(memberId: string) {
    const member = members.find(
      (item) => item.id === memberId
    );

    return member?.full_name || "Unknown Member";
  }

  const pendingCount = deposits.filter(
    (deposit) =>
      deposit.status?.toLowerCase() === "pending"
  ).length;

  const approvedCount = deposits.filter(
    (deposit) =>
      deposit.status?.toLowerCase() === "approved"
  ).length;

  const rejectedCount = deposits.filter(
    (deposit) =>
      deposit.status?.toLowerCase() === "rejected"
  ).length;

  const approvedAmount = deposits
    .filter(
      (deposit) =>
        deposit.status?.toLowerCase() === "approved"
    )
    .reduce(
      (sum, deposit) =>
        sum + Number(deposit.amount || 0),
      0
    );

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading Deposits...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div style={headerContent}>
            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              style={backButton}
            >
              ← Admin Dashboard
            </button>

            <p style={eyebrowStyle}>
              TRADEBISHI ADMIN
            </p>

            <h1 style={titleStyle}>
              Deposit Management
            </h1>

            <p style={subtitleStyle}>
              Review, approve and manage member
              deposits.
            </p>
          </div>

          <div style={headerButtons}>
            <button
              type="button"
              onClick={openAddModal}
              style={addButton}
            >
              <Plus size={16} />
              Add Deposit
            </button>

            <button
              type="button"
              onClick={refreshDeposits}
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

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        <section style={summaryGrid}>
          <SummaryCard
            title="Pending"
            value={pendingCount.toString()}
            icon={<Clock size={19} />}
          />

          <SummaryCard
            title="Approved"
            value={approvedCount.toString()}
            icon={<CheckCircle2 size={19} />}
          />

          <SummaryCard
            title="Rejected"
            value={rejectedCount.toString()}
            icon={<XCircle size={19} />}
          />

          <SummaryCard
            title="Approved Capital"
            value={currency(approvedAmount)}
            icon={<Wallet size={19} />}
          />
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeader}>
            <div>
              <p style={cardLabel}>
                ALL DEPOSITS
              </p>

              <h2 style={sectionTitle}>
                Deposit Records
              </h2>

              <p style={sectionSubtitle}>
                Every deposit entering the TradeBishi
                system.
              </p>
            </div>

            <span style={recordCount}>
              {deposits.length} records
            </span>
          </div>

          {deposits.length === 0 ? (
            <div style={emptyState}>
              <Wallet size={30} />

              <p>No deposits recorded yet.</p>

              <button
                type="button"
                onClick={openAddModal}
                style={addButton}
              >
                <Plus size={16} />
                Add First Deposit
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div style={desktopTable}>
                <div style={tableHeader}>
                  <span>MEMBER</span>
                  <span>AMOUNT</span>
                  <span>METHOD</span>
                  <span>STATUS</span>
                  <span>DATE</span>
                  <span>ACTIONS</span>
                </div>

                {deposits.map((deposit) => {
                  const status =
                    deposit.status?.toLowerCase();

                  return (
                    <div
                      key={deposit.id}
                      style={tableRow}
                    >
                      <div style={memberCell}>
                        <strong>
                          {memberName(
                            deposit.member_id
                          )}
                        </strong>

                        <p style={mutedText}>
                          {deposit.member_id}
                        </p>
                      </div>

                      <strong>
                        {currency(
                          Number(deposit.amount)
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
                        {deposit.method.replaceAll(
                          "_",
                          " "
                        )}
                      </span>

                      <StatusBadge
                        status={status}
                      />

                      <span style={dateText}>
                        {new Date(
                          deposit.created_at
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDeposit(
                            deposit
                          )
                        }
                        style={viewButton}
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* MOBILE CARDS */}
              <div style={mobileList}>
                {deposits.map((deposit) => {
                  const status =
                    deposit.status?.toLowerCase();

                  return (
                    <div
                      key={deposit.id}
                      style={mobileDepositCard}
                    >
                      <div style={mobileCardTop}>
                        <div style={memberCell}>
                          <strong
                            style={{
                              fontSize: "15px",
                            }}
                          >
                            {memberName(
                              deposit.member_id
                            )}
                          </strong>

                          <span
                            style={mobileDate}
                          >
                            {new Date(
                              deposit.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <StatusBadge
                          status={status}
                        />
                      </div>

                      <div
                        style={
                          mobileAmountRow
                        }
                      >
                        <div>
                          <p
                            style={mobileLabel}
                          >
                            AMOUNT
                          </p>

                          <strong
                            style={
                              mobileAmount
                            }
                          >
                            {currency(
                              Number(
                                deposit.amount
                              )
                            )}
                          </strong>
                        </div>

                        <div
                          style={
                            mobileMethod
                          }
                        >
                          <p
                            style={mobileLabel}
                          >
                            METHOD
                          </p>

                          <span>
                            {deposit.method.replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDeposit(
                            deposit
                          )
                        }
                        style={
                          mobileViewButton
                        }
                      >
                        View Deposit
                        <ExternalLink
                          size={15}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ADD DEPOSIT MODAL */}

      {showAddModal && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddModal();
            }
          }}
          style={modalOverlay}
        >
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <p style={eyebrowStyle}>
                  ADMIN ACTION
                </p>

                <h2 style={modalTitle}>
                  Add Deposit
                </h2>

                <p style={modalSubtitle}>
                  Record money deposited by a
                  member.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddModal}
                style={closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <div style={formGroup}>
              <label style={formLabel}>
                Member
              </label>

              <select
                value={newMemberId}
                onChange={(event) =>
                  setNewMemberId(
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

            <div style={formGroup}>
              <label style={formLabel}>
                Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={newAmount}
                onChange={(event) =>
                  setNewAmount(
                    event.target.value
                  )
                }
                placeholder="Enter amount"
                style={formInput}
              />
            </div>

            <div style={formGroup}>
              <label style={formLabel}>
                Payment Method
              </label>

              <select
                value={newMethod}
                onChange={(event) =>
                  setNewMethod(
                    event.target.value
                  )
                }
                style={formInput}
              >
                <option value="bank_transfer">
                  Bank Transfer
                </option>
                <option value="upi">
                  UPI
                </option>
                <option value="cash">
                  Cash
                </option>
                <option value="cheque">
                  Cheque
                </option>
                <option value="other">
                  Other
                </option>
              </select>
            </div>

            <div style={formGroup}>
              <label style={formLabel}>
                Payment Proof URL
                <span style={optionalText}>
                  Optional
                </span>
              </label>

              <input
                type="url"
                value={newProofUrl}
                onChange={(event) =>
                  setNewProofUrl(
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={formInput}
              />
            </div>

            <div style={formGroup}>
              <label style={formLabel}>
                Initial Status
              </label>

              <select
                value={newStatus}
                onChange={(event) =>
                  setNewStatus(
                    event.target.value as
                      | "pending"
                      | "approved"
                  )
                }
                style={formInput}
              >
                <option value="pending">
                  Pending
                </option>

                <option value="approved">
                  Approved
                </option>
              </select>
            </div>

            <div style={formHint}>
              <Wallet size={16} />

              <span>
                Approved deposits will count toward
                approved capital on the admin
                dashboard.
              </span>
            </div>

            <div style={modalActions}>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                style={cancelButton}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={addDeposit}
                disabled={saving}
                style={{
                  ...addButton,
                  flex: 1,
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Plus size={17} />

                {saving
                  ? "Saving..."
                  : "Create Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT DETAILS MODAL */}

      {selectedDeposit && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedDeposit(null);
            }
          }}
          style={modalOverlay}
        >
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <p style={eyebrowStyle}>
                  DEPOSIT DETAILS
                </p>

                <h2 style={modalTitle}>
                  {memberName(
                    selectedDeposit.member_id
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedDeposit(null)
                }
                style={closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <div style={detailCard}>
              <DetailRow
                label="Amount"
                value={currency(
                  selectedDeposit.amount
                )}
              />

              <DetailRow
                label="Payment Method"
                value={selectedDeposit.method.replaceAll(
                  "_",
                  " "
                )}
              />

              <DetailRow
                label="Status"
                value={selectedDeposit.status}
              />

              <DetailRow
                label="Created"
                value={new Date(
                  selectedDeposit.created_at
                ).toLocaleString(
                  "en-IN"
                )}
              />

              <DetailRow
                label="Reviewed At"
                value={
                  selectedDeposit.reviewed_at
                    ? new Date(
                        selectedDeposit.reviewed_at
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "Not reviewed"
                }
              />

              <DetailRow
                label="Reviewed By"
                value={
                  selectedDeposit.reviewed_by ||
                  "Not reviewed"
                }
              />

              <DetailRow
                label="Deposit ID"
                value={selectedDeposit.id}
              />
            </div>

            {selectedDeposit.proof_url && (
              <a
                href={
                  selectedDeposit.proof_url
                }
                target="_blank"
                rel="noreferrer"
                style={proofButton}
              >
                <ExternalLink size={16} />
                View Payment Proof
              </a>
            )}

            <button
              type="button"
              disabled={deleting}
              onClick={() =>
                deleteDeposit(selectedDeposit)
              }
              style={{
                ...deleteButton,
                opacity: deleting ? 0.6 : 1,
              }}
            >
              <Trash2 size={16} />

              {deleting
                ? "Deleting..."
                : "Delete Deposit"}
            </button>

            {selectedDeposit.status?.toLowerCase() ===
              "pending" && (
              <div style={actionGrid}>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() =>
                    reviewDeposit(
                      selectedDeposit.id,
                      "rejected"
                    )
                  }
                  style={{
                    ...rejectButton,
                    opacity: reviewing
                      ? 0.6
                      : 1,
                  }}
                >
                  <XCircle size={17} />

                  {reviewing
                    ? "Processing..."
                    : "Reject"}
                </button>

                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() =>
                    reviewDeposit(
                      selectedDeposit.id,
                      "approved"
                    )
                  }
                  style={{
                    ...approveButton,
                    opacity: reviewing
                      ? 0.6
                      : 1,
                  }}
                >
                  <CheckCircle2 size={17} />

                  {reviewing
                    ? "Processing..."
                    : "Approve"}
                </button>
              </div>
            )}

            {selectedDeposit.status?.toLowerCase() !==
              "pending" && (
              <div style={reviewedNotice}>
                <CheckCircle2 size={17} />

                This deposit has already been
                reviewed.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================
   COMPONENTS
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

      <p style={cardLabel}>{title}</p>

      <h2 style={summaryValue}>
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let color = "rgba(255,255,255,0.5)";
  let background =
    "rgba(255,255,255,0.06)";
  let border =
    "rgba(255,255,255,0.1)";

  if (status === "pending") {
    color = "#facc15";
    background =
      "rgba(250,204,21,0.08)";
    border =
      "rgba(250,204,21,0.18)";
  }

  if (status === "approved") {
    color = "#34d399";
    background =
      "rgba(52,211,153,0.08)";
    border =
      "rgba(52,211,153,0.18)";
  }

  if (status === "rejected") {
    color = "#f87171";
    background =
      "rgba(248,113,113,0.08)";
    border =
      "rgba(248,113,113,0.18)";
  }

  return (
    <span
      style={{
        display: "inline-flex",
        width: "fit-content",
        padding: "6px 10px",
        borderRadius: "999px",
        color,
        background,
        border: `1px solid ${border}`,
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={detailRow}>
      <span style={detailLabel}>
        {label}
      </span>

      <span style={detailValue}>
        {value}
      </span>
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
  padding: "clamp(18px, 3vw, 35px) clamp(14px, 3vw, 25px)",
};

const containerStyle = {
  width: "100%",
  maxWidth: "1350px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "24px",
  marginBottom: "30px",
  flexWrap: "wrap" as const,
};

const headerContent = {
  minWidth: 0,
  flex: "1 1 450px",
};

const headerButtons = {
  display: "flex",
  gap: "9px",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
  flex: "0 1 auto",
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  marginBottom: "20px",
  padding: "8px 12px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  fontSize: "13px",
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
  fontSize: "clamp(30px, 4vw, 38px)",
  letterSpacing: "-1.5px",
  lineHeight: 1.1,
};

const subtitleStyle = {
  marginTop: "9px",
  color: "rgba(255,255,255,0.45)",
  fontSize: "14px",
};

const secondaryButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "10px 14px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
};

const addButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minHeight: "42px",
  padding: "10px 15px",
  border:
    "1px solid rgba(255,255,255,0.16)",
  background: "white",
  color: "black",
  borderRadius: "13px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "13px",
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
  fontSize: "13px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "18px",
};

const summaryCard = {
  minWidth: 0,
  padding: "20px",
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
  marginBottom: "17px",
};

const cardLabel = {
  margin: 0,
  color: "rgba(255,255,255,0.4)",
  fontSize: "10px",
  letterSpacing: "1.2px",
  textTransform: "uppercase" as const,
};

const summaryValue = {
  margin: "8px 0 0",
  fontSize: "clamp(21px, 2.5vw, 25px)",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const sectionStyle = {
  padding: "clamp(17px, 3vw, 25px)",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "20px",
  flexWrap: "wrap" as const,
};

const sectionTitle = {
  margin: "7px 0 0",
  fontSize: "23px",
};

const sectionSubtitle = {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
  lineHeight: 1.5,
};

const recordCount = {
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
  paddingTop: "5px",
};

const desktopTable = {
  width: "100%",
  overflowX: "auto" as const,
};

const tableHeader = {
  minWidth: "850px",
  display: "grid",
  gridTemplateColumns:
    "1.5fr 1fr 1fr 1fr 1.4fr 0.8fr",
  gap: "14px",
  padding: "10px 14px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "10px",
  letterSpacing: "1px",
};

const tableRow = {
  minWidth: "850px",
  display: "grid",
  gridTemplateColumns:
    "1.5fr 1fr 1fr 1fr 1.4fr 0.8fr",
  gap: "14px",
  alignItems: "center",
  padding: "15px 14px",
  marginBottom: "7px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const memberCell = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column" as const,
};

const mutedText = {
  marginTop: "4px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "10px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const dateText = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "11px",
};

const viewButton = {
  padding: "9px 13px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const mobileList = {
  display: "none",
};

const mobileDepositCard = {
  padding: "17px",
  borderRadius: "17px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const mobileCardTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
};

const mobileDate = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "11px",
};

const mobileAmountRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  marginTop: "20px",
  paddingTop: "15px",
  borderTop:
    "1px solid rgba(255,255,255,0.06)",
};

const mobileLabel = {
  margin: 0,
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
  letterSpacing: "1px",
};

const mobileAmount = {
  display: "block",
  marginTop: "5px",
  fontSize: "21px",
};

const mobileMethod = {
  textAlign: "right" as const,
  color:
    "rgba(255,255,255,0.65)",
  fontSize: "13px",
  textTransform:
    "capitalize" as const,
};

const mobileViewButton = {
  width: "100%",
  marginTop: "17px",
  padding: "12px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  cursor: "pointer",
  fontWeight: 600,
};

const emptyState = {
  minHeight: "220px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  color:
    "rgba(255,255,255,0.35)",
  textAlign: "center" as const,
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color:
    "rgba(255,255,255,0.5)",
};

const modalOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px",
  background:
    "rgba(0,0,0,0.78)",
  backdropFilter: "blur(14px)",
};

const modal = {
  width: "100%",
  maxWidth: "560px",
  maxHeight: "calc(100vh - 28px)",
  overflowY: "auto" as const,
  padding: "clamp(19px, 4vw, 28px)",
  borderRadius: "25px",
  background: "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.6)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px",
  marginBottom: "23px",
};

const modalTitle = {
  marginTop: "8px",
  fontSize: "25px",
  lineHeight: 1.15,
};

const modalSubtitle = {
  marginTop: "6px",
  color: "rgba(255,255,255,0.4)",
  fontSize: "13px",
  lineHeight: 1.5,
};

const closeButton = {
  flexShrink: 0,
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

const formGroup = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  marginBottom: "15px",
};

const formLabel = {
  color: "rgba(255,255,255,0.65)",
  fontSize: "12px",
  fontWeight: 600,
};

const optionalText = {
  marginLeft: "7px",
  color: "rgba(255,255,255,0.3)",
  fontWeight: 400,
};

const formInput = {
  width: "100%",
  minHeight: "46px",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
  fontSize: "14px",
};

const formHint = {
  display: "flex",
  alignItems: "flex-start",
  gap: "9px",
  marginTop: "17px",
  padding: "12px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "11px",
  lineHeight: 1.5,
};

const modalActions = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const cancelButton = {
  padding: "13px 18px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

const detailCard = {
  borderRadius: "15px",
  padding: "0 14px",
  background:
    "rgba(255,255,255,0.025)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const proofButton = {
  marginTop: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "13px",
};

const deleteButton = {
  marginTop: "12px",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "12px",
  borderRadius: "13px",
  border:
    "1px solid rgba(248,113,113,0.2)",
  background:
    "rgba(248,113,113,0.08)",
  color: "#f87171",
  cursor: "pointer",
  fontWeight: 600,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "10px",
  marginTop: "12px",
};

const approveButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "13px",
  borderRadius: "13px",
  border:
    "1px solid rgba(52,211,153,0.2)",
  background:
    "rgba(52,211,153,0.1)",
  color: "#34d399",
  cursor: "pointer",
  fontWeight: 600,
};

const rejectButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "13px",
  borderRadius: "13px",
  border:
    "1px solid rgba(248,113,113,0.2)",
  background:
    "rgba(248,113,113,0.08)",
  color: "#f87171",
  cursor: "pointer",
  fontWeight: 600,
};

const reviewedNotice = {
  marginTop: "20px",
  padding: "13px",
  borderRadius: "13px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "12px",
  lineHeight: 1.4,
};

const detailRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  padding: "13px 0",
  borderBottom:
    "1px solid rgba(255,255,255,0.06)",
};

const detailLabel = {
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "12px",
  minWidth: "90px",
};

const detailValue = {
  color:
    "rgba(255,255,255,0.85)",
  fontSize: "13px",
  textAlign: "right" as const,
  wordBreak: "break-word" as const,
};

/* =========================
   RESPONSIVE CSS
========================= */

if (typeof document !== "undefined") {
  const styleId =
    "tradebishi-admin-deposits-responsive";

  if (!document.getElementById(styleId)) {
    const style =
      document.createElement("style");

    style.id = styleId;

    style.textContent = `
      @media (max-width: 1050px) {
        .tradebishi-deposits-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 700px) {
        .tradebishi-deposits-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
        }

        .tradebishi-deposits-desktop {
          display: none !important;
        }

        .tradebishi-deposits-mobile {
          display: flex !important;
          flex-direction: column;
          gap: 9px;
        }

        .tradebishi-deposits-header-buttons {
          width: 100%;
          justify-content: stretch !important;
        }

        .tradebishi-deposits-header-buttons button {
          flex: 1;
          min-width: 0;
        }

        .tradebishi-deposits-modal-actions {
          flex-direction: column-reverse !important;
        }

        .tradebishi-deposits-modal-actions button {
          width: 100%;
        }

        .tradebishi-deposits-action-grid {
          grid-template-columns: 1fr !important;
        }
      }

      @media (max-width: 430px) {
        .tradebishi-deposits-summary-grid {
          grid-template-columns: 1fr 1fr !important;
        }

        .tradebishi-deposits-summary-card {
          padding: 16px !important;
        }

        .tradebishi-deposits-summary-icon {
          margin-bottom: 13px !important;
        }

        .tradebishi-deposits-header-buttons {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
        }

        .tradebishi-deposits-header-buttons button:first-child {
          grid-column: 1 / -1;
        }

        .tradebishi-deposits-mobile-amount-row {
          gap: 10px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }
}