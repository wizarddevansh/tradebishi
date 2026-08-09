"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  RefreshCw,
  LogOut,
  Users,
  Wallet,
  Pencil,
  X,
  Save,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
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

type InvestmentWithMember = Investment & {
  member_name: string;
};

type FormMode = "add" | "edit";

export default function AdminInvestmentsPage() {
  const router = useRouter();

  const [investments, setInvestments] = useState<
    InvestmentWithMember[]
  >([]);

  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [adminName, setAdminName] =
    useState("Admin");

  const [formOpen, setFormOpen] =
    useState(false);

  const [formMode, setFormMode] =
    useState<FormMode>("add");

  const [editingInvestment, setEditingInvestment] =
    useState<InvestmentWithMember | null>(
      null
    );

  const [deleteTarget, setDeleteTarget] =
    useState<InvestmentWithMember | null>(
      null
    );

  const [form, setForm] = useState({
    member_id: "",
    invested_amount: "",
    current_value: "",
  });

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    const supabase = createClient();

    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
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
      return;
    }

    setAdminName(
      profile.full_name || "Admin"
    );

    await Promise.all([
      loadInvestments(),
      loadMembers(),
    ]);

    setLoading(false);
  }

  async function loadMembers() {
    const supabase = createClient();

    const {
      data,
      error: memberError,
    } = await supabase
      .from("members")
      .select("id, full_name")
      .order("full_name", {
        ascending: true,
      });

    if (memberError) {
      setError(memberError.message);
      return;
    }

    setMembers(
      (data ?? []) as Member[]
    );
  }

  async function loadInvestments() {
    const supabase = createClient();

    const {
      data,
      error: investmentError,
    } = await supabase
      .from("investments")
      .select(
        "id, member_id, invested_amount, current_value, profit_loss, updated_at"
      )
      .order("updated_at", {
        ascending: false,
      });

    if (investmentError) {
      setError(
        investmentError.message
      );
      return;
    }

    const {
      data: memberData,
      error: memberError,
    } = await supabase
      .from("members")
      .select("id, full_name");

    if (memberError) {
      setError(memberError.message);
      return;
    }

    const memberList =
      (memberData ?? []) as Member[];

    const memberMap = new Map(
      memberList.map((member) => [
        member.id,
        member.full_name,
      ])
    );

    const formatted =
      (data ?? []).map(
        (investment) => {
          const invested =
            Number(
              investment.invested_amount ||
                0
            );

          const current =
            Number(
              investment.current_value ||
                0
            );

          return {
            ...investment,
            profit_loss:
              current - invested,
            member_name:
              memberMap.get(
                investment.member_id
              ) ||
              "Unknown Member",
          };
        }
      ) as InvestmentWithMember[];

    setInvestments(formatted);
  }

  async function refreshInvestments() {
    setRefreshing(true);
    setError("");

    await Promise.all([
      loadInvestments(),
      loadMembers(),
    ]);

    setRefreshing(false);
  }

  /* =========================
     ADD
  ========================= */

  function openAdd() {
    setFormMode("add");
    setEditingInvestment(null);

    setForm({
      member_id: "",
      invested_amount: "",
      current_value: "",
    });

    setError("");
    setFormOpen(true);
  }

  /* =========================
     EDIT
  ========================= */

  function openEdit(
    investment: InvestmentWithMember
  ) {
    setFormMode("edit");
    setEditingInvestment(
      investment
    );

    setForm({
      member_id:
        investment.member_id,

      invested_amount:
        Number(
          investment.invested_amount
        ).toString(),

      current_value:
        Number(
          investment.current_value
        ).toString(),
    });

    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditingInvestment(null);

    setForm({
      member_id: "",
      invested_amount: "",
      current_value: "",
    });

    setError("");
  }

  /* =========================
     SAVE
  ========================= */

  async function saveInvestment() {
    setError("");

    if (saving) return;

    if (
      formMode === "add" &&
      !form.member_id
    ) {
      setError(
        "Please select a member."
      );
      return;
    }

    const investedAmount =
      Number(
        form.invested_amount
      );

    const currentValue =
      Number(
        form.current_value
      );

    if (
      !Number.isFinite(
        investedAmount
      ) ||
      investedAmount < 0
    ) {
      setError(
        "Invested amount must be a valid number."
      );
      return;
    }

    if (
      !Number.isFinite(
        currentValue
      ) ||
      currentValue < 0
    ) {
      setError(
        "Current value must be a valid number."
      );
      return;
    }

    if (
      formMode === "edit" &&
      !editingInvestment
    ) {
      setError(
        "Investment not selected."
      );
      return;
    }

    const profitLoss =
      currentValue -
      investedAmount;

    setSaving(true);

    const supabase =
      createClient();

    if (formMode === "add") {
      const {
        error: insertError,
      } = await supabase
        .from("investments")
        .insert({
          member_id:
            form.member_id,

          invested_amount:
            investedAmount,

          current_value:
            currentValue,

          profit_loss:
            profitLoss,

          updated_at:
            new Date().toISOString(),
        });

      if (insertError) {
        setError(
          insertError.message
        );
        setSaving(false);
        return;
      }
    } else {
      const {
        error: updateError,
      } = await supabase
        .from("investments")
        .update({
          member_id:
            form.member_id,

          invested_amount:
            investedAmount,

          current_value:
            currentValue,

          profit_loss:
            profitLoss,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          editingInvestment!.id
        );

      if (updateError) {
        setError(
          updateError.message
        );
        setSaving(false);
        return;
      }
    }

    setFormOpen(false);
    setEditingInvestment(null);

    setForm({
      member_id: "",
      invested_amount: "",
      current_value: "",
    });

    await loadInvestments();

    setSaving(false);
  }

  /* =========================
     DELETE
  ========================= */

  function openDelete(
    investment: InvestmentWithMember
  ) {
    setDeleteTarget(investment);
    setError("");
  }

  function closeDelete() {
    if (deleting) return;

    setDeleteTarget(null);
  }

  async function deleteInvestment() {
    if (!deleteTarget) return;

    if (deleting) return;

    setDeleting(true);
    setError("");

    const supabase =
      createClient();

    const {
      error: deleteError,
    } = await supabase
      .from("investments")
      .delete()
      .eq(
        "id",
        deleteTarget.id
      );

    if (deleteError) {
      setError(
        deleteError.message
      );
      setDeleting(false);
      return;
    }

    setDeleteTarget(null);

    await loadInvestments();

    setDeleting(false);
  }

  /* =========================
     LOGOUT
  ========================= */

  async function logout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    router.replace("/login");
  }

  /* =========================
     HELPERS
  ========================= */

  function currency(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;
  }

  const totalInvested =
    investments.reduce(
      (sum, investment) =>
        sum +
        Number(
          investment.invested_amount ||
            0
        ),
      0
    );

  const totalCurrentValue =
    investments.reduce(
      (sum, investment) =>
        sum +
        Number(
          investment.current_value ||
            0
        ),
      0
    );

  const totalProfitLoss =
    totalCurrentValue -
    totalInvested;

  const profitPercent =
    totalInvested > 0
      ? (totalProfitLoss /
          totalInvested) *
        100
      : 0;

  const isPositive =
    totalProfitLoss >= 0;

  const formInvested =
    Number(
      form.invested_amount || 0
    );

  const formCurrent =
    Number(
      form.current_value || 0
    );

  const formProfit =
    formCurrent -
    formInvested;

  const formReturn =
    formInvested > 0
      ? (formProfit /
          formInvested) *
        100
      : 0;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading Investments...
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
            <p style={eyebrowStyle}>
              TRADEBISHI ADMIN
            </p>

            <h1 style={titleStyle}>
              Investments
            </h1>

            <p style={subtitleStyle}>
              Manage member portfolios
              and investment performance,
              {` `}
              {adminName}.
            </p>
          </div>

          <div
            style={headerButtons}
          >
            <button
              type="button"
              onClick={openAdd}
              style={addButton}
            >
              <Plus size={17} />
              Add Investment
            </button>

            <button
              type="button"
              onClick={
                refreshInvestments
              }
              disabled={refreshing}
              style={
                secondaryButton
              }
            >
              <RefreshCw
                size={16}
                style={{
                  animation:
                    refreshing
                      ? "spin 0.8s linear infinite"
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
              style={
                secondaryButton
              }
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        {/* SUMMARY */}

        <section style={summaryGrid}>
          <SummaryCard
            title="Invested Capital"
            value={currency(
              totalInvested
            )}
            icon={
              <Wallet size={19} />
            }
          />

          <SummaryCard
            title="Current Portfolio"
            value={currency(
              totalCurrentValue
            )}
            icon={
              <TrendingUp
                size={19}
              />
            }
          />

          <SummaryCard
            title="Total P/L"
            value={`${
              isPositive
                ? "+"
                : "-"
            }${currency(
              Math.abs(
                totalProfitLoss
              )
            )}`}
            icon={
              isPositive ? (
                <ArrowUpRight
                  size={19}
                />
              ) : (
                <ArrowDownRight
                  size={19}
                />
              )
            }
            positive={
              isPositive
            }
          />

          <SummaryCard
            title="Portfolio Return"
            value={`${
              profitPercent >=
              0
                ? "+"
                : ""
            }${profitPercent.toFixed(
              2
            )}%`}
            icon={
              <Users size={19} />
            }
            positive={
              profitPercent >=
              0
            }
          />
        </section>

        {/* INVESTMENTS */}

        <section
          style={tableSection}
        >
          <div
            style={
              sectionHeader
            }
          >
            <div>
              <p style={cardLabel}>
                PORTFOLIO
              </p>

              <h2
                style={
                  sectionTitle
                }
              >
                Member Investments
              </h2>

              <p
                style={
                  sectionSubtitle
                }
              >
                {investments.length}{" "}
                investment
                {investments.length ===
                1
                  ? ""
                  : "s"}{" "}
                recorded
              </p>
            </div>

            <div
              style={
                portfolioBadge
              }
            >
              <TrendingUp
                size={14}
              />
              Live Portfolio
            </div>
          </div>

          {investments.length ===
          0 ? (
            <div
              style={
                emptyState
              }
            >
              <Wallet size={32} />

              <strong>
                No investments found
              </strong>

              <p>
                Click "Add Investment"
                to create the first
                portfolio record.
              </p>

              <button
                type="button"
                onClick={
                  openAdd
                }
                style={
                  emptyAddButton
                }
              >
                <Plus size={15} />
                Add Investment
              </button>
            </div>
          ) : (
            <div
              style={
                tableWrapper
              }
            >
              {/* TABLE HEADER */}

              <div
                style={
                  tableHeader
                }
              >
                <span>
                  MEMBER
                </span>

                <span>
                  INVESTED
                </span>

                <span>
                  CURRENT VALUE
                </span>

                <span>
                  P/L
                </span>

                <span>
                  RETURN
                </span>

                <span>
                  UPDATED
                </span>

                <span></span>
              </div>

              {/* ROWS */}

              {investments.map(
                (investment) => {
                  const invested =
                    Number(
                      investment.invested_amount ||
                        0
                    );

                  const current =
                    Number(
                      investment.current_value ||
                        0
                    );

                  const profit =
                    current -
                    invested;

                  const returnPercent =
                    invested >
                    0
                      ? (profit /
                          invested) *
                        100
                      : 0;

                  const positive =
                    profit >= 0;

                  return (
                    <div
                      key={
                        investment.id
                      }
                      style={
                        tableRow
                      }
                    >
                      {/* MEMBER */}

                      <div>
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "14px",
                          }}
                        >
                          {
                            investment.member_name
                          }
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "5px",
                            color:
                              "rgba(255,255,255,0.25)",
                            fontSize:
                              "9px",
                          }}
                        >
                          {
                            investment.member_id
                          }
                        </span>
                      </div>

                      {/* INVESTED */}

                      <span>
                        {currency(
                          invested
                        )}
                      </span>

                      {/* CURRENT */}

                      <strong>
                        {currency(
                          current
                        )}
                      </strong>

                      {/* P/L */}

                      <span
                        style={{
                          color:
                            positive
                              ? "#34d399"
                              : "#f87171",
                          fontWeight:
                            600,
                        }}
                      >
                        {positive
                          ? "+"
                          : "-"}
                        {currency(
                          Math.abs(
                            profit
                          )
                        )}
                      </span>

                      {/* RETURN */}

                      <span
                        style={{
                          color:
                            positive
                              ? "#34d399"
                              : "#f87171",
                          fontWeight:
                            600,
                        }}
                      >
                        {returnPercent >=
                        0
                          ? "+"
                          : ""}
                        {returnPercent.toFixed(
                          2
                        )}
                        %
                      </span>

                      {/* UPDATED */}

                      <span
                        style={{
                          color:
                            "rgba(255,255,255,0.38)",
                          fontSize:
                            "11px",
                        }}
                      >
                        {new Date(
                          investment.updated_at
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </span>

                      {/* ACTIONS */}

                      <div
                        style={
                          rowActions
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              investment
                            )
                          }
                          style={
                            editButton
                          }
                          title="Edit investment"
                        >
                          <Pencil
                            size={14}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDelete(
                              investment
                            )
                          }
                          style={
                            deleteButton
                          }
                          title="Delete investment"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        <p
          style={
            footerStyle
          }
        >
          TradeBishi • Investment
          Control Center
        </p>
      </div>

      {/* =========================
          ADD / EDIT MODAL
      ========================= */}

      {formOpen && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }
          }}
          style={
            modalOverlay
          }
        >
          <div
            style={
              modal
            }
          >
            <div
              style={
                modalHeader
              }
            >
              <div>
                <p
                  style={
                    cardLabel
                  }
                >
                  {formMode ===
                  "add"
                    ? "NEW INVESTMENT"
                    : "EDIT INVESTMENT"}
                </p>

                <h2
                  style={
                    modalTitle
                  }
                >
                  {formMode ===
                  "add"
                    ? "Add Investment"
                    : editingInvestment?.member_name}
                </h2>

                <p
                  style={
                    modalSubtitle
                  }
                >
                  {formMode ===
                  "add"
                    ? "Create a new member investment record."
                    : "Update this member's portfolio values."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                style={
                  closeButton
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* MEMBER */}

            <div
              style={
                formContainer
              }
            >
              <label
                style={
                  labelStyle
                }
              >
                Member

                <select
                  value={
                    form.member_id
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      member_id:
                        event
                          .target
                          .value,
                    })
                  }
                  style={
                    selectStyle
                  }
                  disabled={
                    formMode ===
                    "edit"
                  }
                >
                  <option
                    value=""
                    style={{
                      background:
                        "#111",
                    }}
                  >
                    Select a member
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
                        style={{
                          background:
                            "#111",
                        }}
                      >
                        {
                          member.full_name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              {/* INVESTED */}

              <label
                style={
                  labelStyle
                }
              >
                Invested Amount

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.invested_amount
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      invested_amount:
                        event
                          .target
                          .value,
                    })
                  }
                  style={
                    inputStyle
                  }
                  placeholder="₹0"
                />
              </label>

              {/* CURRENT */}

              <label
                style={
                  labelStyle
                }
              >
                Current Value

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.current_value
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      current_value:
                        event
                          .target
                          .value,
                    })
                  }
                  style={
                    inputStyle
                  }
                  placeholder="₹0"
                />
              </label>

              {/* CALCULATION */}

              <div
                style={
                  calculationBox
                }
              >
                <div>
                  <span
                    style={
                      calculationLabel
                    }
                  >
                    Profit / Loss
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      fontSize:
                        "19px",
                      color:
                        formProfit >=
                        0
                          ? "#34d399"
                          : "#f87171",
                    }}
                  >
                    {formProfit >=
                    0
                      ? "+"
                      : "-"}
                    {currency(
                      Math.abs(
                        formProfit
                      )
                    )}
                  </strong>
                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <span
                    style={
                      calculationLabel
                    }
                  >
                    Return
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      fontSize:
                        "19px",
                      color:
                        formReturn >=
                        0
                          ? "#34d399"
                          : "#f87171",
                    }}
                  >
                    {formReturn >=
                    0
                      ? "+"
                      : ""}
                    {formReturn.toFixed(
                      2
                    )}
                    %
                  </strong>
                </div>
              </div>

              <div
                style={
                  infoBox
                }
              >
                <TrendingUp
                  size={15}
                />

                <span>
                  Profit/Loss and
                  return are calculated
                  automatically.
                </span>
              </div>

              {error && (
                <div
                  style={
                    modalError
                  }
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={
                  saveInvestment
                }
                disabled={
                  saving
                }
                style={{
                  ...saveButton,
                  opacity:
                    saving
                      ? 0.6
                      : 1,
                }}
              >
                {formMode ===
                "add" ? (
                  <Plus size={17} />
                ) : (
                  <Save size={17} />
                )}

                {saving
                  ? "Saving..."
                  : formMode ===
                    "add"
                  ? "Create Investment"
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          DELETE CONFIRMATION
      ========================= */}

      {deleteTarget && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDelete();
            }
          }}
          style={
            modalOverlay
          }
        >
          <div
            style={
              deleteModal
            }
          >
            <div
              style={
                dangerIcon
              }
            >
              <AlertTriangle
                size={22}
              />
            </div>

            <h2
              style={
                deleteTitle
              }
            >
              Delete Investment?
            </h2>

            <p
              style={
                deleteText
              }
            >
              You are about to permanently
              delete the investment for{" "}
              <strong>
                {
                  deleteTarget.member_name
                }
              </strong>
              .
            </p>

            <div
              style={
                deleteSummary
              }
            >
              <span>
                Invested
              </span>

              <strong>
                {currency(
                  Number(
                    deleteTarget.invested_amount
                  )
                )}
              </strong>

              <span>
                Current Value
              </span>

              <strong>
                {currency(
                  Number(
                    deleteTarget.current_value
                  )
                )}
              </strong>
            </div>

            {error && (
              <div
                style={
                  modalError
                }
              >
                {error}
              </div>
            )}

            <div
              style={
                deleteActions
              }
            >
              <button
                type="button"
                onClick={
                  closeDelete
                }
                disabled={
                  deleting
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
                  deleteInvestment
                }
                disabled={
                  deleting
                }
                style={{
                  ...confirmDeleteButton,
                  opacity:
                    deleting
                      ? 0.6
                      : 1,
                }}
              >
                <Trash2
                  size={16}
                />

                {deleting
                  ? "Deleting..."
                  : "Delete Investment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================
   SUMMARY CARD
========================= */

function SummaryCard({
  title,
  value,
  icon,
  positive,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div
      style={
        summaryCard
      }
    >
      <div
        style={
          summaryIcon
        }
      >
        {icon}
      </div>

      <p
        style={
          cardLabel
        }
      >
        {title}
      </p>

      <h2
        style={{
          margin:
            "8px 0 0",
          fontSize:
            "25px",
          letterSpacing:
            "-0.7px",
          color:
            positive ===
            undefined
              ? "white"
              : positive
              ? "#34d399"
              : "#f87171",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "#050505",
  color: "white",
  padding:
    "35px 25px",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const containerStyle = {
  maxWidth:
    "1450px",
  margin:
    "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  gap: "20px",
  marginBottom:
    "30px",
};

const headerButtons = {
  display: "flex",
  gap: "9px",
  alignItems:
    "center",
};

const eyebrowStyle = {
  margin: 0,
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "10px",
  letterSpacing:
    "4px",
  fontWeight: 600,
};

const titleStyle = {
  margin:
    "8px 0 0",
  fontSize: "38px",
  letterSpacing:
    "-1.7px",
  fontWeight: 700,
};

const subtitleStyle = {
  marginTop:
    "8px",
  color:
    "rgba(255,255,255,0.42)",
  fontSize: "14px",
};

const addButton = {
  display: "flex",
  alignItems:
    "center",
  gap: "8px",
  padding:
    "11px 15px",
  borderRadius:
    "13px",
  border:
    "1px solid rgba(255,255,255,0.15)",
  background:
    "white",
  color:
    "black",
  cursor:
    "pointer",
  fontWeight:
    600,
};

const secondaryButton = {
  display: "flex",
  alignItems:
    "center",
  gap: "8px",
  padding:
    "11px 15px",
  borderRadius:
    "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor:
    "pointer",
  fontWeight:
    500,
};

const errorBox = {
  marginBottom:
    "18px",
  padding:
    "14px 16px",
  borderRadius:
    "13px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.2)",
  color:
    "#f87171",
  fontSize:
    "13px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  marginBottom:
    "18px",
};

const summaryCard = {
  padding:
    "22px",
  borderRadius:
    "21px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.09)",
  backdropFilter:
    "blur(20px)",
};

const summaryIcon = {
  width: "39px",
  height: "39px",
  borderRadius:
    "12px",
  background:
    "rgba(255,255,255,0.07)",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  marginBottom:
    "17px",
};

const cardLabel = {
  margin: 0,
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "10px",
  letterSpacing:
    "1.4px",
  textTransform:
    "uppercase" as const,
};

const tableSection = {
  padding:
    "26px",
  borderRadius:
    "24px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  backdropFilter:
    "blur(20px)",
};

const sectionHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "center",
  marginBottom:
    "24px",
};

const sectionTitle = {
  margin:
    "7px 0 0",
  fontSize:
    "23px",
  letterSpacing:
    "-0.5px",
};

const sectionSubtitle = {
  marginTop:
    "5px",
  color:
    "rgba(255,255,255,0.32)",
  fontSize:
    "12px",
};

const portfolioBadge = {
  display: "flex",
  alignItems:
    "center",
  gap: "7px",
  padding:
    "8px 11px",
  borderRadius:
    "999px",
  background:
    "rgba(52,211,153,0.07)",
  border:
    "1px solid rgba(52,211,153,0.15)",
  color:
    "#34d399",
  fontSize:
    "11px",
  fontWeight:
    600,
};

const tableWrapper = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "7px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "1.5fr 1fr 1.1fr 1fr 0.8fr 1.3fr 70px",
  gap: "14px",
  padding:
    "0 15px 9px",
  color:
    "rgba(255,255,255,0.25)",
  fontSize:
    "9px",
  letterSpacing:
    "1.1px",
};

const tableRow = {
  display: "grid",
  gridTemplateColumns:
    "1.5fr 1fr 1.1fr 1fr 0.8fr 1.3fr 70px",
  gap: "14px",
  alignItems:
    "center",
  padding:
    "16px 15px",
  borderRadius:
    "15px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.06)",
  fontSize:
    "13px",
};

const rowActions = {
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "flex-end",
  gap: "6px",
};

const editButton = {
  width: "31px",
  height: "31px",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  borderRadius:
    "9px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color:
    "white",
  cursor:
    "pointer",
};

const deleteButton = {
  width: "31px",
  height: "31px",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  borderRadius:
    "9px",
  border:
    "1px solid rgba(248,113,113,0.15)",
  background:
    "rgba(248,113,113,0.06)",
  color:
    "#f87171",
  cursor:
    "pointer",
};

const emptyState = {
  minHeight:
    "230px",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: "10px",
  borderRadius:
    "17px",
  background:
    "rgba(0,0,0,0.2)",
  color:
    "rgba(255,255,255,0.4)",
};

const emptyAddButton = {
  marginTop:
    "5px",
  display: "flex",
  alignItems:
    "center",
  gap: "7px",
  padding:
    "10px 14px",
  borderRadius:
    "11px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "white",
  cursor:
    "pointer",
  fontSize:
    "12px",
  fontWeight:
    600,
};

const modalOverlay = {
  position:
    "fixed" as const,
  inset: 0,
  zIndex:
    9999,
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  padding:
    "20px",
  background:
    "rgba(0,0,0,0.78)",
  backdropFilter:
    "blur(14px)",
};

const modal = {
  width:
    "100%",
  maxWidth:
    "500px",
  maxHeight:
    "90vh",
  overflowY:
    "auto" as const,
  padding:
    "30px",
  borderRadius:
    "25px",
  background:
    "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.6)",
};

const modalHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap:
    "15px",
  marginBottom:
    "23px",
};

const modalTitle = {
  margin:
    "7px 0 0",
  fontSize:
    "24px",
  letterSpacing:
    "-0.5px",
};

const modalSubtitle = {
  marginTop:
    "5px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize:
    "13px",
};

const closeButton = {
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
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  cursor:
    "pointer",
};

const formContainer = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap:
    "15px",
};

const labelStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap:
    "7px",
  color:
    "rgba(255,255,255,0.55)",
  fontSize:
    "12px",
};

const inputStyle = {
  width:
    "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "14px",
  borderRadius:
    "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color:
    "white",
  outline:
    "none",
  fontSize:
    "15px",
};

const selectStyle = {
  width:
    "100%",
  boxSizing:
    "border-box" as const,
  padding:
    "14px",
  borderRadius:
    "12px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "#151515",
  color:
    "white",
  outline:
    "none",
  fontSize:
    "15px",
  cursor:
    "pointer",
};

const calculationBox = {
  display:
    "flex",
  justifyContent:
    "space-between",
  gap:
    "20px",
  padding:
    "16px",
  borderRadius:
    "15px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const calculationLabel = {
  color:
    "rgba(255,255,255,0.35)",
  fontSize:
    "10px",
  letterSpacing:
    "1px",
  textTransform:
    "uppercase" as const,
};

const infoBox = {
  display:
    "flex",
  alignItems:
    "flex-start",
  gap:
    "9px",
  padding:
    "12px 13px",
  borderRadius:
    "12px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.4)",
  fontSize:
    "11px",
  lineHeight:
    1.5,
};

const saveButton = {
  marginTop:
    "3px",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "8px",
  padding:
    "14px",
  borderRadius:
    "13px",
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
};

const modalError = {
  padding:
    "12px 14px",
  borderRadius:
    "12px",
  background:
    "rgba(248,113,113,0.1)",
  border:
    "1px solid rgba(248,113,113,0.2)",
  color:
    "#f87171",
  fontSize:
    "13px",
};

/* =========================
   DELETE MODAL
========================= */

const deleteModal = {
  width:
    "100%",
  maxWidth:
    "430px",
  padding:
    "30px",
  borderRadius:
    "25px",
  background:
    "#111",
  border:
    "1px solid rgba(248,113,113,0.15)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.7)",
};

const dangerIcon = {
  width:
    "46px",
  height:
    "46px",
  borderRadius:
    "14px",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  background:
    "rgba(248,113,113,0.1)",
  border:
    "1px solid rgba(248,113,113,0.18)",
  color:
    "#f87171",
  marginBottom:
    "17px",
};

const deleteTitle = {
  margin:
    "0",
  fontSize:
    "23px",
  letterSpacing:
    "-0.5px",
};

const deleteText = {
  marginTop:
    "10px",
  color:
    "rgba(255,255,255,0.45)",
  fontSize:
    "13px",
  lineHeight:
    1.6,
};

const deleteSummary = {
  display:
    "grid",
  gridTemplateColumns:
    "1fr auto",
  gap:
    "10px",
  marginTop:
    "18px",
  padding:
    "15px",
  borderRadius:
    "14px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  fontSize:
    "12px",
  color:
    "rgba(255,255,255,0.4)",
};

const deleteActions = {
  display:
    "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap:
    "10px",
  marginTop:
    "20px",
};

const cancelButton = {
  padding:
    "13px",
  borderRadius:
    "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color:
    "white",
  cursor:
    "pointer",
  fontWeight:
    600,
};

const confirmDeleteButton = {
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap:
    "7px",
  padding:
    "13px",
  borderRadius:
    "13px",
  border:
    "1px solid rgba(248,113,113,0.2)",
  background:
    "rgba(248,113,113,0.1)",
  color:
    "#f87171",
  cursor:
    "pointer",
  fontWeight:
    600,
};

const loadingStyle = {
  minHeight:
    "100vh",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  color:
    "rgba(255,255,255,0.5)",
};

const footerStyle = {
  marginTop:
    "22px",
  textAlign:
    "center" as const,
  color:
    "rgba(255,255,255,0.25)",
  fontSize:
    "11px",
};

/* =========================
   GLOBAL ANIMATION
========================= */

if (
  typeof document !==
    "undefined" &&
  !document.getElementById(
    "tradebishi-investment-styles"
  )
) {
  const style =
    document.createElement(
      "style"
    );

  style.id =
    "tradebishi-investment-styles";

  style.innerHTML = `
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    button {
      transition:
        filter 0.15s ease,
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }

    button:hover:not(:disabled) {
      filter: brightness(1.12);
    }

    button:active:not(:disabled) {
      transform: scale(0.98);
    }

    input::placeholder {
      color: rgba(255,255,255,0.2);
    }

    @media (max-width: 1150px) {
      body {
        overflow-x: auto;
      }
    }
  `;

  document.head.appendChild(
    style
  );
}