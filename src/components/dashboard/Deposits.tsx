"use client";

import { useEffect, useState } from "react";
import {
  Check,
  X,
  Plus,
  Eye,
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
  member_name: string;
};

export default function Deposits() {
  const [deposits, setDeposits] = useState<Deposit[]>(
    []
  );

  const [members, setMembers] = useState<
    { id: string; full_name: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [selectedDeposit, setSelectedDeposit] =
    useState<Deposit | null>(null);

  const [form, setForm] = useState({
    member_id: "",
    amount: "",
    method: "upi",
    proof_url: "",
  });

  async function loadDeposits() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const [depositResult, memberResult] =
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

    if (depositResult.error) {
      setError(depositResult.error.message);
      setDeposits([]);
      setLoading(false);
      return;
    }

    if (memberResult.error) {
      setError(memberResult.error.message);
      setLoading(false);
      return;
    }

    setMembers(memberResult.data ?? []);

    const memberMap = Object.fromEntries(
      (memberResult.data ?? []).map((member) => [
        member.id,
        member.full_name,
      ])
    );

    const formatted: Deposit[] = (
      depositResult.data ?? []
    ).map((deposit) => ({
      id: deposit.id,
      member_id: deposit.member_id,
      amount: Number(deposit.amount),
      method: deposit.method,
      proof_url: deposit.proof_url,
      status: deposit.status,
      reviewed_by: deposit.reviewed_by,
      reviewed_at: deposit.reviewed_at,
      created_at: deposit.created_at,
      member_name:
        memberMap[deposit.member_id] ??
        "Unknown Member",
    }));

    setDeposits(formatted);
    setLoading(false);
  }

  useEffect(() => {
    loadDeposits();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "You must be logged in to add a deposit."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("deposits")
      .insert({
        member_id: form.member_id,
        amount: Number(form.amount),
        method: form.method,
        proof_url:
          form.proof_url.trim() || null,
        status: "pending",
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      member_id: "",
      amount: "",
      method: "upi",
      proof_url: "",
    });

    setShowModal(false);
    setSaving(false);

    await loadDeposits();
  }

  async function updateDepositStatus(
    depositId: string,
    status: "approved" | "rejected"
  ) {
    setSaving(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "You must be logged in to review deposits."
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("deposits")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", depositId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSelectedDeposit(null);
    setSaving(false);

    await loadDeposits();
  }

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <>
      <div
        style={{
          marginTop: "30px",
          background:
            "rgba(255,255,255,0.05)",
          border:
            "1px solid rgba(255,255,255,0.1)",
          borderRadius: "28px",
          padding: "30px",
          color: "white",
          backdropFilter:
            "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "25px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              Deposit Requests
            </h2>

            <p
              style={{
                marginTop: "5px",
                color:
                  "rgba(255,255,255,0.45)",
                fontSize: "14px",
              }}
            >
              Review and manage member deposits
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowModal(true)
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "white",
              color: "black",
              padding: "10px 18px",
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <Plus size={18} />
            Add Deposit
          </button>
        </div>

        {loading && (
          <p
            style={{
              color:
                "rgba(255,255,255,0.5)",
            }}
          >
            Loading deposits...
          </p>
        )}

        {!loading && error && (
          <p
            style={{
              color: "#f87171",
              marginBottom: "15px",
            }}
          >
            Error: {error}
          </p>
        )}

        {!loading &&
          !error &&
          deposits.length === 0 && (
            <p
              style={{
                color:
                  "rgba(255,255,255,0.5)",
              }}
            >
              No deposit requests yet.
            </p>
          )}

        {!loading &&
          !error &&
          deposits.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "12px",
              }}
            >
              {deposits.map(
                (deposit) => {
                  const status =
                    deposit.status.toLowerCase();

                  return (
                    <div
                      key={deposit.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "2fr 1fr 1fr 1fr auto",
                        alignItems:
                          "center",
                        gap: "15px",
                        padding: "18px",
                        borderRadius:
                          "16px",
                        background:
                          "rgba(0,0,0,0.25)",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {
                            deposit.member_name
                          }
                        </div>

                        <div
                          style={{
                            marginTop:
                              "4px",
                            fontSize:
                              "12px",
                            color:
                              "rgba(255,255,255,0.4)",
                            textTransform:
                              "uppercase",
                          }}
                        >
                          {
                            deposit.method
                          }
                        </div>
                      </div>

                      <span>
                        {formatCurrency(
                          deposit.amount
                        )}
                      </span>

                      <span
                        style={{
                          color:
                            status ===
                            "approved"
                              ? "#34d399"
                              : status ===
                                "rejected"
                              ? "#f87171"
                              : "#facc15",
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {
                          deposit.status
                        }
                      </span>

                      <span
                        style={{
                          color:
                            "rgba(255,255,255,0.45)",
                          fontSize:
                            "13px",
                        }}
                      >
                        {new Date(
                          deposit.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </span>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "8px",
                        }}
                      >
                        {status ===
                          "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                updateDepositStatus(
                                  deposit.id,
                                  "approved"
                                )
                              }
                              style={{
                                width:
                                  "38px",
                                height:
                                  "38px",
                                borderRadius:
                                  "12px",
                                border:
                                  "1px solid rgba(52,211,153,0.25)",
                                background:
                                  "rgba(52,211,153,0.1)",
                                color:
                                  "#34d399",
                                cursor:
                                  "pointer",
                              }}
                              title="Approve"
                            >
                              <Check
                                size={
                                  18
                                }
                              />
                            </button>

                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                updateDepositStatus(
                                  deposit.id,
                                  "rejected"
                                )
                              }
                              style={{
                                width:
                                  "38px",
                                height:
                                  "38px",
                                borderRadius:
                                  "12px",
                                border:
                                  "1px solid rgba(248,113,113,0.25)",
                                background:
                                  "rgba(248,113,113,0.1)",
                                color:
                                  "#f87171",
                                cursor:
                                  "pointer",
                              }}
                              title="Reject"
                            >
                              <X
                                size={
                                  18
                                }
                              />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDeposit(
                              deposit
                            )
                          }
                          style={{
                            width:
                              "38px",
                            height:
                              "38px",
                            borderRadius:
                              "12px",
                            border:
                              "1px solid rgba(255,255,255,0.1)",
                            background:
                              "rgba(255,255,255,0.05)",
                            color:
                              "white",
                            cursor:
                              "pointer",
                          }}
                          title="View"
                        >
                          <Eye
                            size={18}
                          />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </div>

      {/* ADD DEPOSIT */}

      {showModal && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(false);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "24px",
            background:
              "rgba(0,0,0,0.75)",
            backdropFilter:
              "blur(12px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "30px",
              borderRadius:
                "24px",
              background: "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "25px",
              }}
            >
              <h3
                style={{
                  fontSize:
                    "24px",
                  fontWeight: 600,
                }}
              >
                Add Deposit
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor:
                    "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "15px",
              }}
            >
              <select
                required
                value={
                  form.member_id
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    member_id:
                      e.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Select member
                </option>

                {members.map(
                  (member) => (
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

              <input
                required
                type="number"
                min="0"
                step="any"
                placeholder="Amount"
                value={
                  form.amount
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount:
                      e.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              <select
                required
                value={
                  form.method
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    method:
                      e.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              >
                <option value="upi">
                  UPI
                </option>

                <option value="bank_transfer">
                  Bank Transfer
                </option>

                <option value="cash">
                  Cash
                </option>
              </select>

              <input
                placeholder="Proof URL (optional)"
                value={
                  form.proof_url
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    proof_url:
                      e.target
                        .value,
                  })
                }
                style={
                  inputStyle
                }
              />

              {error && (
                <p
                  style={{
                    color:
                      "#f87171",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  saving
                }
                style={{
                  padding:
                    "14px",
                  borderRadius:
                    "14px",
                  border:
                    "none",
                  background:
                    "white",
                  color:
                    "black",
                  fontWeight:
                    600,
                  cursor:
                    "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Deposit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DEPOSIT DETAILS */}

      {selectedDeposit && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedDeposit(
                null
              );
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: "24px",
            background:
              "rgba(0,0,0,0.78)",
            backdropFilter:
              "blur(14px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "30px",
              borderRadius:
                "26px",
              background:
                "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "25px",
              }}
            >
              <h3
                style={{
                  fontSize:
                    "24px",
                  fontWeight: 600,
                }}
              >
                Deposit Details
              </h3>

              <button
                type="button"
                onClick={() =>
                  setSelectedDeposit(
                    null
                  )
                }
                style={{
                  width:
                    "36px",
                  height:
                    "36px",
                  borderRadius:
                    "50%",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  background:
                    "rgba(255,255,255,0.06)",
                  color:
                    "white",
                  cursor:
                    "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <DetailRow
              label="Member"
              value={
                selectedDeposit.member_name
              }
            />

            <DetailRow
              label="Amount"
              value={formatCurrency(
                selectedDeposit.amount
              )}
            />

            <DetailRow
              label="Method"
              value={
                selectedDeposit.method
              }
            />

            <DetailRow
              label="Status"
              value={
                selectedDeposit.status
              }
            />

            <DetailRow
              label="Submitted"
              value={new Date(
                selectedDeposit.created_at
              ).toLocaleString(
                "en-IN"
              )}
            />

            {selectedDeposit.reviewed_at && (
              <DetailRow
                label="Reviewed"
                value={new Date(
                  selectedDeposit.reviewed_at
                ).toLocaleString(
                  "en-IN"
                )}
              />
            )}

            {selectedDeposit.proof_url && (
              <a
                href={
                  selectedDeposit.proof_url
                }
                target="_blank"
                rel="noreferrer"
                style={{
                  display:
                    "block",
                  marginTop:
                    "20px",
                  padding:
                    "13px",
                  borderRadius:
                    "13px",
                  background:
                    "rgba(255,255,255,0.07)",
                  color:
                    "white",
                  textAlign:
                    "center",
                  textDecoration:
                    "none",
                }}
              >
                View Payment Proof
              </a>
            )}

            {selectedDeposit.status.toLowerCase() ===
              "pending" && (
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "12px",
                  marginTop:
                    "20px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateDepositStatus(
                      selectedDeposit.id,
                      "approved"
                    )
                  }
                  style={{
                    padding:
                      "13px",
                    borderRadius:
                      "13px",
                    border:
                      "1px solid rgba(52,211,153,0.25)",
                    background:
                      "rgba(52,211,153,0.1)",
                    color:
                      "#34d399",
                    fontWeight:
                      600,
                    cursor:
                      "pointer",
                  }}
                >
                  Approve
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    updateDepositStatus(
                      selectedDeposit.id,
                      "rejected"
                    )
                  }
                  style={{
                    padding:
                      "13px",
                    borderRadius:
                      "13px",
                    border:
                      "1px solid rgba(248,113,113,0.25)",
                    background:
                      "rgba(248,113,113,0.1)",
                    color:
                      "#f87171",
                    fontWeight:
                      600,
                    cursor:
                      "pointer",
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
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
    <div
      style={{
        display: "flex",
        justifyContent:
          "space-between",
        gap: "20px",
        padding:
          "14px 0",
        borderBottom:
          "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        style={{
          color:
            "rgba(255,255,255,0.45)",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          textAlign:
            "right",
          textTransform:
            "capitalize",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const inputStyle = {
  padding: "14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
};