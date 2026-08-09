"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Investment = {
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

export default function Investments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    member_id: "",
    invested_amount: "",
    current_value: "",
  });

  async function loadInvestments() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const [membersResult, investmentsResult] =
      await Promise.all([
        supabase
          .from("members")
          .select("id, full_name")
          .order("full_name", { ascending: true }),

        supabase
          .from("investments")
          .select(
            "id, member_id, invested_amount, current_value, profit_loss, updated_at"
          )
          .order("updated_at", { ascending: false }),
      ]);

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }

    if (investmentsResult.error) {
      setError(investmentsResult.error.message);
      setInvestments([]);
      setLoading(false);
      return;
    }

    setMembers(membersResult.data ?? []);

    const memberMap: Record<string, string> =
      Object.fromEntries(
        (membersResult.data ?? []).map((member) => [
          member.id,
          member.full_name,
        ])
      );

    const formatted: Investment[] = (
      investmentsResult.data ?? []
    ).map((investment) => ({
      id: investment.id,
      member_id: investment.member_id,
      invested_amount: Number(
        investment.invested_amount || 0
      ),
      current_value: Number(
        investment.current_value || 0
      ),
      profit_loss: Number(
        investment.profit_loss || 0
      ),
      updated_at: investment.updated_at,
      member_name:
        memberMap[investment.member_id] ??
        "Unknown Member",
    }));

    setInvestments(formatted);
    setLoading(false);
  }

  useEffect(() => {
    loadInvestments();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!form.member_id) {
      setError("Please select a member.");
      return;
    }

    const investedAmount = Number(
      form.invested_amount
    );

    const currentValue = Number(
      form.current_value
    );

    if (
      !Number.isFinite(investedAmount) ||
      investedAmount <= 0
    ) {
      setError(
        "Invested amount must be greater than 0."
      );
      return;
    }

    if (
      !Number.isFinite(currentValue) ||
      currentValue < 0
    ) {
      setError("Current value cannot be negative.");
      return;
    }

    const profitLoss =
      currentValue - investedAmount;

    setSaving(true);

    const supabase = createClient();

    const { error } = await supabase
      .from("investments")
      .insert({
        member_id: form.member_id,
        invested_amount: investedAmount,
        current_value: currentValue,
        profit_loss: profitLoss,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      member_id: "",
      invested_amount: "",
      current_value: "",
    });

    setShowModal(false);
    setSaving(false);

    await loadInvestments();
  }

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  function getReturnPercentage(
    invested: number,
    profit: number
  ) {
    if (invested <= 0) return 0;

    return (profit / invested) * 100;
  }

  return (
    <div
      style={{
        marginTop: "30px",
        background: "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px",
        padding: "30px",
        color: "white",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "25px",
          gap: "20px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Investments
          </h2>

          <p
            style={{
              marginTop: "6px",
              color:
                "rgba(255,255,255,0.45)",
              fontSize: "14px",
            }}
          >
            Track member capital and portfolio
            performance.
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
            padding: "11px 18px",
            borderRadius: "14px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={18} />
          Add Investment
        </button>
      </div>

      {/* LOADING */}

      {loading && (
        <p
          style={{
            color:
              "rgba(255,255,255,0.5)",
          }}
        >
          Loading investments...
        </p>
      )}

      {/* ERROR */}

      {!loading && error && (
        <p
          style={{
            color: "#f87171",
          }}
        >
          Error: {error}
        </p>
      )}

      {/* EMPTY */}

      {!loading &&
        !error &&
        investments.length === 0 && (
          <div
            style={{
              padding: "45px 20px",
              textAlign: "center",
              borderRadius: "18px",
              background:
                "rgba(0,0,0,0.2)",
              border:
                "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              style={{
                color:
                  "rgba(255,255,255,0.5)",
              }}
            >
              No investments yet.
            </p>

            <p
              style={{
                marginTop: "6px",
                color:
                  "rgba(255,255,255,0.3)",
                fontSize: "13px",
              }}
            >
              Add an investment to begin
              tracking portfolio performance.
            </p>
          </div>
        )}

      {/* INVESTMENT LIST */}

      {!loading &&
        !error &&
        investments.length > 0 && (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <div
              style={{
                minWidth: "850px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 1.3fr 1.3fr 1.3fr 1.1fr",
                  gap: "15px",
                  padding:
                    "0 18px 12px",
                  color:
                    "rgba(255,255,255,0.4)",
                  fontSize: "12px",
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    "0.06em",
                }}
              >
                <span>Member</span>
                <span>Invested</span>
                <span>Current Value</span>
                <span>Profit / Loss</span>
                <span>Return</span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "10px",
                }}
              >
                {investments.map(
                  (investment) => {
                    const percentage =
                      getReturnPercentage(
                        investment.invested_amount,
                        investment.profit_loss
                      );

                    const profitable =
                      investment.profit_loss >=
                      0;

                    return (
                      <div
                        key={investment.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "2fr 1.3fr 1.3fr 1.3fr 1.1fr",
                          gap: "15px",
                          alignItems:
                            "center",
                          padding: "18px",
                          borderRadius:
                            "17px",
                          background:
                            "rgba(0,0,0,0.25)",
                          border:
                            "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                          }}
                        >
                          {
                            investment.member_name
                          }
                        </span>

                        <span>
                          {formatCurrency(
                            investment.invested_amount
                          )}
                        </span>

                        <span>
                          {formatCurrency(
                            investment.current_value
                          )}
                        </span>

                        <span
                          style={{
                            color:
                              profitable
                                ? "#34d399"
                                : "#f87171",
                            fontWeight: 500,
                          }}
                        >
                          {profitable
                            ? "+"
                            : ""}
                          {formatCurrency(
                            investment.profit_loss
                          )}
                        </span>

                        <span
                          style={{
                            color:
                              profitable
                                ? "#34d399"
                                : "#f87171",
                            fontWeight: 600,
                          }}
                        >
                          {profitable
                            ? "+"
                            : ""}
                          {percentage.toFixed(
                            2
                          )}
                          %
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

      {/* ADD INVESTMENT MODAL */}

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
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "30px",
              borderRadius: "24px",
              background: "#111",
              border:
                "1px solid rgba(255,255,255,0.12)",
              color: "white",
              boxShadow:
                "0 25px 80px rgba(0,0,0,0.5)",
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
                    margin: 0,
                  }}
                >
                  Add Investment
                </h3>

                <p
                  style={{
                    marginTop: "6px",
                    color:
                      "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                  }}
                >
                  Add a member's portfolio
                  position.
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
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
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
              <label
                style={labelStyle}
              >
                Member
              </label>

              <select
                required
                value={
                  form.member_id
                }
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
                  Select member
                </option>

                {members.map(
                  (member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {
                        member.full_name
                      }
                    </option>
                  )
                )}
              </select>

              <label
                style={labelStyle}
              >
                Invested Amount
              </label>

              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 50000"
                value={
                  form.invested_amount
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    invested_amount:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <label
                style={labelStyle}
              >
                Current Value
              </label>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 55000"
                value={
                  form.current_value
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    current_value:
                      e.target.value,
                  })
                }
                style={inputStyle}
              />

              <div
                style={{
                  padding: "15px",
                  borderRadius: "14px",
                  background:
                    "rgba(255,255,255,0.04)",
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color:
                      "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                  }}
                >
                  Estimated Profit / Loss
                </p>

                {(() => {
                  const invested =
                    Number(
                      form.invested_amount ||
                        0
                    );

                  const current =
                    Number(
                      form.current_value ||
                        0
                    );

                  const profit =
                    current - invested;

                  return (
                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        fontSize: "20px",
                        color:
                          profit >= 0
                            ? "#34d399"
                            : "#f87171",
                      }}
                    >
                      {profit >= 0
                        ? "+"
                        : ""}
                      {formatCurrency(
                        profit
                      )}
                    </strong>
                  );
                })()}
              </div>

              {error && (
                <p
                  style={{
                    color: "#f87171",
                    margin: 0,
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
                  background:
                    "white",
                  color: "black",
                  fontWeight: 600,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                  opacity: saving
                    ? 0.7
                    : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Investment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  fontSize: "13px",
  color:
    "rgba(255,255,255,0.55)",
};

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
  width: "100%",
  boxSizing:
    "border-box" as const,
};