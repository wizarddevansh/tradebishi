"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Transaction = {
  id: string;
  member_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
  member_name: string;
};

type Member = {
  id: string;
  full_name: string;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    member_id: "",
    type: "deposit",
    amount: "",
    description: "",
    status: "completed",
  });

  async function loadTransactions() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const [
      transactionResult,
      memberResult,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, member_id, type, amount, description, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(10),

      supabase
        .from("members")
        .select("id, full_name")
        .order("full_name", { ascending: true }),
    ]);

    if (transactionResult.error) {
      setError(transactionResult.error.message);
      setTransactions([]);
      setLoading(false);
      return;
    }

    if (memberResult.error) {
      setError(memberResult.error.message);
      setTransactions([]);
      setLoading(false);
      return;
    }

    setMembers(memberResult.data ?? []);

    const memberMap: Record<string, string> =
      Object.fromEntries(
        (memberResult.data ?? []).map((member) => [
          member.id,
          member.full_name,
        ])
      );

    const formattedTransactions: Transaction[] = (
      transactionResult.data ?? []
    ).map((transaction) => ({
      id: transaction.id,
      member_id: transaction.member_id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      status: transaction.status,
      created_at: transaction.created_at,
      member_name: transaction.member_id
        ? memberMap[transaction.member_id] ??
          "Unknown Member"
        : "System",
    }));

    setTransactions(formattedTransactions);
    setLoading(false);
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const supabase = createClient();

    const amount = Number(form.amount);

    if (!form.type.trim()) {
      setError("Please select a transaction type.");
      setSaving(false);
      return;
    }

    if (!amount || amount <= 0) {
      setError("Please enter a valid amount.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .insert({
        member_id: form.member_id || null,
        type: form.type,
        amount,
        description:
          form.description.trim() || null,
        status: form.status,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      member_id: "",
      type: "deposit",
      amount: "",
      description: "",
      status: "completed",
    });

    setShowModal(false);
    setSaving(false);

    await loadTransactions();
  }

  const getStatusColor = (status: string) => {
    const value = status.toLowerCase();

    if (value === "pending") {
      return "#facc15";
    }

    if (
      value === "rejected" ||
      value === "failed"
    ) {
      return "#f87171";
    }

    return "#34d399";
  };

  const getTypeColor = (type: string) => {
    const value = type.toLowerCase();

    if (
      value === "deposit" ||
      value === "profit" ||
      value === "credit"
    ) {
      return "#34d399";
    }

    if (
      value === "withdrawal" ||
      value === "loss" ||
      value === "debit"
    ) {
      return "#f87171";
    }

    return "white";
  };

  return (
    <>
      <div
        style={{
          marginTop: "30px",
          background: "rgba(255,255,255,0.05)",
          border:
            "1px solid rgba(255,255,255,0.1)",
          borderRadius: "28px",
          padding: "30px",
          backdropFilter: "blur(20px)",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
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
              Recent Transactions
            </h2>

            <p
              style={{
                marginTop: "6px",
                color:
                  "rgba(255,255,255,0.45)",
                fontSize: "14px",
              }}
            >
              Latest financial activity
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
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
            Add Transaction
          </button>
        </div>

        {loading && (
          <p
            style={{
              color:
                "rgba(255,255,255,0.5)",
            }}
          >
            Loading transactions...
          </p>
        )}

        {!loading && error && (
          <p style={{ color: "#f87171" }}>
            Error: {error}
          </p>
        )}

        {!loading &&
          !error &&
          transactions.length === 0 && (
            <p
              style={{
                color:
                  "rgba(255,255,255,0.5)",
              }}
            >
              No transactions yet.
            </p>
          )}

        {!loading &&
          !error &&
          transactions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {transactions.map(
                (transaction) => (
                  <div
                    key={transaction.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.2fr 1.5fr 1.2fr 1fr",
                      padding: "18px",
                      borderRadius: "16px",
                      background:
                        "rgba(0,0,0,0.25)",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 600,
                          color: getTypeColor(
                            transaction.type
                          ),
                          textTransform:
                            "capitalize",
                        }}
                      >
                        {transaction.type}
                      </span>

                      {transaction.description && (
                        <p
                          style={{
                            marginTop: "4px",
                            fontSize: "12px",
                            color:
                              "rgba(255,255,255,0.4)",
                          }}
                        >
                          {
                            transaction.description
                          }
                        </p>
                      )}
                    </div>

                    <span
                      style={{
                        color:
                          "rgba(255,255,255,0.6)",
                      }}
                    >
                      {transaction.member_name}
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      ₹
                      {transaction.amount.toLocaleString(
                        "en-IN"
                      )}
                    </span>

                    <span
                      style={{
                        color:
                          getStatusColor(
                            transaction.status
                          ),
                        textTransform:
                          "capitalize",
                        fontWeight: 500,
                      }}
                    >
                      {transaction.status}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
      </div>

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
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background:
              "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "30px",
              borderRadius: "24px",
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
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                  }}
                >
                  Add Transaction
                </h3>

                <p
                  style={{
                    marginTop: "5px",
                    fontSize: "13px",
                    color:
                      "rgba(255,255,255,0.45)",
                  }}
                >
                  Record financial activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                style={{
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
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: "15px",
              }}
            >
              <select
                value={form.member_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    member_id:
                      e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="">
                  System / No member
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

              <select
                required
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="deposit">
                  Deposit
                </option>

                <option value="withdrawal">
                  Withdrawal
                </option>

                <option value="profit">
                  Profit
                </option>

                <option value="loss">
                  Loss
                </option>

                <option value="buy">
                  Buy
                </option>

                <option value="sell">
                  Sell
                </option>

                <option value="credit">
                  Credit
                </option>

                <option value="debit">
                  Debit
                </option>
              </select>

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="completed">
                  Completed
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>

              {error && (
                <p
                  style={{
                    color: "#f87171",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: "white",
                  color: "black",
                  fontWeight: 600,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Transaction"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
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