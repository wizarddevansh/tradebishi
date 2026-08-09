"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, X, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Member = {
  id: string;
  full_name: string;
  status: string | null;
};

export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    status: "active",
  });

  async function loadMembers() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, status")
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      setError(error.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");

    const fullName = form.full_name.trim();

    if (!fullName) {
      setError("Please enter the member's name.");
      setSaving(false);
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("members")
      .insert({
        full_name: fullName,
        status: form.status,
      });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm({
      full_name: "",
      status: "active",
    });

    setShowModal(false);
    setSaving(false);

    await loadMembers();
  }

  function getStatusColor(status: string | null) {
    const value = status?.toLowerCase();

    if (value === "active") {
      return "#34d399";
    }

    if (
      value === "inactive" ||
      value === "suspended"
    ) {
      return "#f87171";
    }

    return "#facc15";
  }

  return (
    <>
      <div
        style={{
          marginTop: "30px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
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
              Members
            </h2>

            <p
              style={{
                marginTop: "6px",
                color: "rgba(255,255,255,0.45)",
                fontSize: "14px",
              }}
            >
              Manage members of your investment group.
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
            }}
          >
            <Plus size={18} />
            Add Member
          </button>
        </div>

        {/* LOADING */}

        {loading && (
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              padding: "20px 0",
            }}
          >
            Loading members...
          </p>
        )}

        {/* ERROR */}

        {!loading && error && (
          <p
            style={{
              color: "#f87171",
              padding: "20px 0",
            }}
          >
            Error: {error}
          </p>
        )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          members.length === 0 && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                borderRadius: "18px",
                background: "rgba(0,0,0,0.2)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                No members yet.
              </p>

              <p
                style={{
                  marginTop: "6px",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "13px",
                }}
              >
                Click "Add Member" to create one.
              </p>
            </div>
          )}

        {/* MEMBER LIST */}

        {!loading &&
          !error &&
          members.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* TABLE HEADER */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "2fr 1fr 80px",
                  gap: "15px",
                  padding: "0 18px 12px",
                  color:
                    "rgba(255,255,255,0.4)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                <span>Member</span>
                <span>Status</span>
                <span></span>
              </div>

              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "2fr 1fr 80px",
                    gap: "15px",
                    alignItems: "center",
                    padding: "18px",
                    borderRadius: "17px",
                    background:
                      "rgba(0,0,0,0.25)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {/* NAME */}

                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "16px",
                      }}
                    >
                      {member.full_name}
                    </div>

                    <div
                      style={{
                        marginTop: "4px",
                        color:
                          "rgba(255,255,255,0.3)",
                        fontSize: "12px",
                      }}
                    >
                      Member
                    </div>
                  </div>

                  {/* STATUS */}

                  <span
                    style={{
                      color: getStatusColor(
                        member.status
                      ),
                      textTransform:
                        "capitalize",
                      fontWeight: 500,
                    }}
                  >
                    {member.status ||
                      "Unknown"}
                  </span>

                  {/* VIEW */}

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMember(
                        member
                      )
                    }
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "12px",
                      border:
                        "1px solid rgba(255,255,255,0.1)",
                      background:
                        "rgba(255,255,255,0.05)",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                    }}
                    title="View Member"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* ADD MEMBER MODAL */}

      {showModal && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(false);
              setError("");
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
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "480px",
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
            {/* MODAL HEADER */}

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
                  Add Member
                </h3>

                <p
                  style={{
                    marginTop: "6px",
                    color:
                      "rgba(255,255,255,0.45)",
                    fontSize: "13px",
                  }}
                >
                  Add a new member to TradeBishi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
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
                  justifyContent:
                    "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  color:
                    "rgba(255,255,255,0.55)",
                }}
              >
                Full Name
              </label>

              <input
                required
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.full_name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    full_name:
                      event.target.value,
                  })
                }
                style={inputStyle}
              />

              <label
                style={{
                  fontSize: "13px",
                  color:
                    "rgba(255,255,255,0.55)",
                }}
              >
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status:
                      event.target.value,
                  })
                }
                style={inputStyle}
              >
                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>

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
                  marginTop: "5px",
                  padding: "14px",
                  borderRadius: "14px",
                  border: "none",
                  background: saving
                    ? "rgba(255,255,255,0.6)"
                    : "white",
                  color: "black",
                  fontWeight: 600,
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Member"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MEMBER DETAILS */}

      {selectedMember && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedMember(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(0,0,0,0.78)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "30px",
              borderRadius: "26px",
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
                    margin: 0,
                  }}
                >
                  Member Details
                </h3>

                <p
                  style={{
                    marginTop: "5px",
                    color:
                      "rgba(255,255,255,0.4)",
                    fontSize: "13px",
                  }}
                >
                  Member information
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMember(null)
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
                  justifyContent:
                    "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <DetailRow
              label="Name"
              value={selectedMember.full_name}
            />

            <DetailRow
              label="Status"
              value={
                selectedMember.status ||
                "Unknown"
              }
            />

            <DetailRow
              label="Member ID"
              value={selectedMember.id}
            />
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
        justifyContent: "space-between",
        gap: "20px",
        padding: "14px 0",
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
          textAlign: "right",
          wordBreak: "break-word",
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
  background: "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "15px",
  width: "100%",
  boxSizing: "border-box" as const,
};