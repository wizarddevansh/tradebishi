"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Wallet,
  TrendingUp,
  RefreshCw,
  LogOut,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Save,
  Mail,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: string;
  created_at: string;
};

type MemberForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  investment_amount: string;
  profit_share: string;
  status: string;
};

const emptyForm: MemberForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  investment_amount: "0",
  profit_share: "0",
  status: "active",
};

export default function AdminMembersPage() {
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] =
    useState<Member | null>(null);

  const [form, setForm] =
    useState<MemberForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      setError("");

      const response = await fetch(
        "/api/admin/members",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/admin");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to load members."
        );
      }

      setMembers(result.members || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load members."
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshMembers() {
    setRefreshing(true);
    setError("");
    setSuccess("");

    await loadMembers();

    setRefreshing(false);
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

  function openAddForm() {
    setError("");
    setSuccess("");
    setEditingMember(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(member: Member) {
    setError("");
    setSuccess("");

    setEditingMember(member);

    setForm({
      full_name: member.full_name,
      email: member.email ?? "",
      password: "",
      phone: member.phone ?? "",
      investment_amount:
        member.investment_amount.toString(),
      profit_share:
        member.profit_share.toString(),
      status: member.status || "active",
    });

    setSelectedMember(null);
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingMember(null);
    setForm(emptyForm);
  }

  async function handleSaveMember(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const fullName =
      form.full_name.trim();

    const email =
      form.email.trim().toLowerCase();

    const password = form.password;

    const phone =
      form.phone.trim();

    const investmentAmount =
      Number(form.investment_amount);

    const profitShare =
      Number(form.profit_share);

    if (!fullName) {
      setError(
        "Full name is required."
      );
      setSaving(false);
      return;
    }

    if (!editingMember && !email) {
      setError(
        "Email is required for a new member."
      );
      setSaving(false);
      return;
    }

    if (
      !editingMember &&
      !password
    ) {
      setError(
        "Password is required for a new member."
      );
      setSaving(false);
      return;
    }

    if (
      password &&
      password.length < 6
    ) {
      setError(
        "Password must be at least 6 characters."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(
        investmentAmount
      ) ||
      investmentAmount < 0
    ) {
      setError(
        "Investment amount must be 0 or greater."
      );
      setSaving(false);
      return;
    }

    if (
      !Number.isFinite(profitShare) ||
      profitShare < 0 ||
      profitShare > 100
    ) {
      setError(
        "Profit share must be between 0 and 100."
      );
      setSaving(false);
      return;
    }

    try {
      const isEditing =
        Boolean(editingMember);

      const body: Record<
        string,
        unknown
      > = {
        full_name: fullName,
        email: email || undefined,
        password:
          password || undefined,
        phone: phone || null,
        investment_amount:
          investmentAmount,
        profit_share: profitShare,
        status: form.status,
      };

      if (isEditing) {
        body.id = editingMember!.id;
      }

      const response = await fetch(
        "/api/admin/members",
        {
          method: isEditing
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/admin");
        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to save member."
        );
      }

      setSuccess(
        isEditing
          ? `${fullName} was updated successfully.`
          : `${fullName} was added successfully.`
      );

      setShowForm(false);
      setEditingMember(null);
      setForm(emptyForm);

      await loadMembers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save member."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(
    member: Member
  ) {
    const confirmed =
      window.confirm(
        `Delete ${member.full_name}?\n\nThis will permanently delete the member record and their login account.`
      );

    if (!confirmed) return;

    setDeletingId(member.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/members?id=${encodeURIComponent(
          member.id
        )}`,
        {
          method: "DELETE",
        }
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/admin");
        return;
      }

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete member."
        );
      }

      setSelectedMember(null);

      setSuccess(
        `${member.full_name} was deleted successfully.`
      );

      await loadMembers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete member."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const filteredMembers =
    members.filter((member) => {
      const query =
        search.trim().toLowerCase();

      if (!query) return true;

      return (
        member.full_name
          .toLowerCase()
          .includes(query) ||
        (member.email ?? "")
          .toLowerCase()
          .includes(query) ||
        (member.phone ?? "")
          .toLowerCase()
          .includes(query) ||
        (member.status ?? "")
          .toLowerCase()
          .includes(query)
      );
    });

  const totalInvestment =
    members.reduce(
      (sum, member) =>
        sum +
        Number(
          member.investment_amount || 0
        ),
      0
    );

  const activeMembers =
    members.filter(
      (member) =>
        member.status?.toLowerCase() ===
        "active"
    ).length;

  const inactiveMembers =
    members.length - activeMembers;

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={loadingStyle}>
          Loading Members...
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          <div>
            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              style={backButton}
            >
              <ArrowLeft size={16} />
              Admin Dashboard
            </button>

            <p style={eyebrowStyle}>
              TRADEBISHI ADMIN
            </p>

            <h1 style={titleStyle}>
              Members
            </h1>

            <p style={subtitleStyle}>
              Manage every registered
              investment member from one
              place.
            </p>
          </div>

          <div style={headerActions}>
            <button
              type="button"
              onClick={
                refreshMembers
              }
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

        {success && (
          <div style={successBox}>
            {success}
          </div>
        )}

        <section style={statsGrid}>
          <StatCard
            title="Total Members"
            value={members.length.toString()}
            icon={<Users size={20} />}
          />

          <StatCard
            title="Active Members"
            value={activeMembers.toString()}
            icon={<TrendingUp size={20} />}
          />

          <StatCard
            title="Total Investment"
            value={currency(
              totalInvestment
            )}
            icon={<Wallet size={20} />}
          />

          <StatCard
            title="Inactive"
            value={inactiveMembers.toString()}
            icon={<Users size={20} />}
          />
        </section>

        <section style={mainCard}>
          <div style={sectionHeader}>
            <div>
              <p style={cardLabel}>
                MEMBER DIRECTORY
              </p>

              <h2 style={sectionTitle}>
                All Members
              </h2>

              <p style={sectionSubtitle}>
                Add, edit, search and manage
                member records.
              </p>
            </div>

            <div style={sectionActions}>
              <div style={searchBox}>
                <Search
                  size={17}
                  color="rgba(255,255,255,0.4)"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search members..."
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
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={
                  openAddForm
                }
                style={primaryButton}
              >
                <Plus size={17} />
                Add Member
              </button>
            </div>
          </div>

          {filteredMembers.length ===
          0 ? (
            <div style={emptyState}>
              <Users
                size={32}
                style={{
                  opacity: 0.45,
                  marginBottom: "10px",
                }}
              />

              <div>
                {members.length ===
                0
                  ? "No members found."
                  : "No members match your search."}
              </div>

              {members.length ===
                0 && (
                <button
                  type="button"
                  onClick={
                    openAddForm
                  }
                  style={{
                    ...primaryButton,
                    margin:
                      "15px auto 0",
                  }}
                >
                  <Plus size={16} />
                  Add First Member
                </button>
              )}
            </div>
          ) : (
            <div style={memberList}>
              {filteredMembers.map(
                (member) => {
                  const status =
                    member.status?.toLowerCase();

                  return (
                    <div
                      key={member.id}
                      style={memberRow}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMember(
                            member
                          )
                        }
                        style={
                          memberMainButton
                        }
                      >
                        <div
                          style={
                            memberIdentity
                          }
                        >
                          <div
                            style={avatar}
                          >
                            {member.full_name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {
                                member.full_name
                              }
                            </strong>

                            <p
                              style={
                                mutedText
                              }
                            >
                              {member.email ||
                                member.phone ||
                                "No contact information"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p
                            style={
                              columnLabel
                            }
                          >
                            INVESTMENT
                          </p>

                          <strong>
                            {currency(
                              member.investment_amount
                            )}
                          </strong>
                        </div>

                        <div>
                          <p
                            style={
                              columnLabel
                            }
                          >
                            PROFIT SHARE
                          </p>

                          <strong>
                            {
                              member.profit_share
                            }
                            %
                          </strong>
                        </div>

                        <div>
                          <p
                            style={
                              columnLabel
                            }
                          >
                            STATUS
                          </p>

                          <span
                            style={{
                              ...statusBadge,
                              color:
                                status ===
                                "active"
                                  ? "#34d399"
                                  : "#facc15",
                              borderColor:
                                status ===
                                "active"
                                  ? "rgba(52,211,153,0.2)"
                                  : "rgba(250,204,21,0.2)",
                              background:
                                status ===
                                "active"
                                  ? "rgba(52,211,153,0.08)"
                                  : "rgba(250,204,21,0.08)",
                            }}
                          >
                            {
                              member.status
                            }
                          </span>
                        </div>

                        <div>
                          <p
                            style={
                              columnLabel
                            }
                          >
                            JOINED
                          </p>

                          <span
                            style={
                              mutedText
                            }
                          >
                            {new Date(
                              member.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </span>
                        </div>
                      </button>

                      <div
                        style={rowActions}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              member
                            )
                          }
                          style={iconButton}
                          title="Edit member"
                        >
                          <Pencil
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteMember(
                              member
                            )
                          }
                          disabled={
                            deletingId ===
                            member.id
                          }
                          style={{
                            ...iconButton,
                            color:
                              "#f87171",
                            opacity:
                              deletingId ===
                              member.id
                                ? 0.5
                                : 1,
                          }}
                          title="Delete member"
                        >
                          <Trash2
                            size={16}
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

        <p style={footerStyle}>
          TradeBishi • Member Management
        </p>
      </div>

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
          style={modalOverlay}
        >
          <div style={modal}>
            <div style={modalHeader}>
              <div>
                <p style={eyebrowStyle}>
                  MEMBER PROFILE
                </p>

                <h2 style={modalTitle}>
                  {
                    selectedMember.full_name
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedMember(
                    null
                  )
                }
                style={closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <DetailRow
              label="Full Name"
              value={
                selectedMember.full_name
              }
            />

            <DetailRow
              label="Email"
              value={
                selectedMember.email ||
                "Not provided"
              }
            />

            <DetailRow
              label="Phone"
              value={
                selectedMember.phone ||
                "Not provided"
              }
            />

            <DetailRow
              label="Investment"
              value={currency(
                selectedMember.investment_amount
              )}
            />

            <DetailRow
              label="Profit Share"
              value={`${selectedMember.profit_share}%`}
            />

            <DetailRow
              label="Status"
              value={
                selectedMember.status
              }
            />

            <DetailRow
              label="Joined"
              value={new Date(
                selectedMember.created_at
              ).toLocaleString(
                "en-IN"
              )}
            />

            <DetailRow
              label="Member ID"
              value={
                selectedMember.id
              }
            />

            <DetailRow
              label="User ID"
              value={
                selectedMember.user_id ||
                "Not linked"
              }
            />

            <div
              style={modalActions}
            >
              <button
                type="button"
                onClick={() =>
                  openEditForm(
                    selectedMember
                  )
                }
                style={primaryButton}
              >
                <Pencil size={16} />
                Edit Member
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteMember(
                    selectedMember
                  )
                }
                disabled={
                  deletingId ===
                  selectedMember.id
                }
                style={
                  dangerButton
                }
              >
                <Trash2 size={16} />

                {deletingId ===
                selectedMember.id
                  ? "Deleting..."
                  : "Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeForm();
            }
          }}
          style={modalOverlay}
        >
          <div style={formModal}>
            <div style={modalHeader}>
              <div>
                <p style={eyebrowStyle}>
                  {editingMember
                    ? "EDIT MEMBER"
                    : "NEW MEMBER"}
                </p>

                <h2 style={modalTitle}>
                  {editingMember
                    ? "Edit Member"
                    : "Add Member"}
                </h2>

                <p
                  style={{
                    marginTop: "5px",
                    color:
                      "rgba(255,255,255,0.4)",
                    fontSize: "13px",
                  }}
                >
                  {editingMember
                    ? "Update the member's information or login credentials."
                    : "Create the member's investment record and login account."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={closeButton}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleSaveMember
              }
              style={formStyle}
            >
              <label style={labelStyle}>
                Full Name
              </label>

              <input
                required
                value={form.full_name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    full_name:
                      event.target.value,
                  })
                }
                placeholder="Member full name"
                style={inputStyle}
              />

              <label style={labelStyle}>
                <span
                  style={
                    labelWithIcon
                  }
                >
                  <Mail size={13} />
                  Email
                </span>
              </label>

              <input
                required={!editingMember}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email:
                      event.target.value,
                  })
                }
                placeholder="member@example.com"
                style={inputStyle}
              />

              <label style={labelStyle}>
                <span
                  style={
                    labelWithIcon
                  }
                >
                  <Lock size={13} />
                  {editingMember
                    ? "New Password"
                    : "Password"}
                </span>
              </label>

              <input
                required={!editingMember}
                type="password"
                autoComplete={
                  editingMember
                    ? "new-password"
                    : "new-password"
                }
                value={form.password}
                onChange={(event) =>
                  setForm({
                    ...form,
                    password:
                      event.target.value,
                  })
                }
                placeholder={
                  editingMember
                    ? "Leave blank to keep current password"
                    : "Minimum 6 characters"
                }
                style={inputStyle}
              />

              <label style={labelStyle}>
                Phone
              </label>

              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone:
                      event.target.value,
                  })
                }
                placeholder="Phone number"
                style={inputStyle}
              />

              <label style={labelStyle}>
                Investment Amount
              </label>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={
                  form.investment_amount
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    investment_amount:
                      event.target.value,
                  })
                }
                placeholder="0"
                style={inputStyle}
              />

              <label style={labelStyle}>
                Profit Share (%)
              </label>

              <input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.profit_share
                }
                onChange={(event) =>
                  setForm({
                    ...form,
                    profit_share:
                      event.target.value,
                  })
                }
                placeholder="0"
                style={inputStyle}
              />

              <label style={labelStyle}>
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

                <option value="suspended">
                  Suspended
                </option>
              </select>

              {error && (
                <div style={errorBox}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...primaryButton,
                  justifyContent:
                    "center",
                  marginTop: "5px",
                  opacity: saving
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
                ) : editingMember ? (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Member
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>
        {icon}
      </div>

      <p style={cardLabel}>
        {title}
      </p>

      <h2 style={statValue}>
        {value}
      </h2>
    </div>
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

      <strong style={detailValue}>
        {value}
      </strong>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#050505",
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
  alignItems: "flex-end",
  gap: "20px",
  marginBottom: "30px",
};

const headerActions = {
  display: "flex",
  gap: "10px",
};

const backButton = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  marginBottom: "22px",
  padding: "8px 12px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.08)",
  background:
    "rgba(255,255,255,0.04)",
  color:
    "rgba(255,255,255,0.7)",
  cursor: "pointer",
};

const eyebrowStyle = {
  margin: 0,
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "4px",
  fontWeight: 600,
};

const titleStyle = {
  margin: "8px 0 0",
  fontSize: "38px",
  letterSpacing: "-1.5px",
};

const subtitleStyle = {
  marginTop: "8px",
  color:
    "rgba(255,255,255,0.45)",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "18px",
};

const statCard = {
  padding: "22px",
  borderRadius: "20px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))",
  border:
    "1px solid rgba(255,255,255,0.09)",
};

const statIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "17px",
};

const statValue = {
  marginTop: "8px",
  fontSize: "25px",
  letterSpacing: "-0.6px",
};

const mainCard = {
  padding: "26px",
  borderRadius: "24px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  marginBottom: "22px",
};

const sectionActions = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const cardLabel = {
  margin: 0,
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "11px",
  letterSpacing: "1.2px",
  textTransform:
    "uppercase" as const,
};

const sectionTitle = {
  marginTop: "8px",
  fontSize: "23px",
};

const sectionSubtitle = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "13px",
};

const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  width: "280px",
  padding: "11px 13px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.09)",
  background:
    "rgba(255,255,255,0.045)",
};

const searchInput = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background:
    "transparent",
  color: "white",
  fontSize: "14px",
};

const clearSearch = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background:
    "transparent",
  color:
    "rgba(255,255,255,0.5)",
  cursor: "pointer",
  padding: "2px",
};

const memberList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "10px",
};

const memberRow = {
  display: "grid",
  gridTemplateColumns:
    "1fr auto",
  alignItems: "center",
  gap: "12px",
  padding:
    "10px 12px 10px 18px",
  borderRadius: "16px",
  background:
    "rgba(0,0,0,0.22)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const memberMainButton = {
  width: "100%",
  display: "grid",
  gridTemplateColumns:
    "2fr 1.2fr 1fr 1fr 1fr",
  alignItems: "center",
  gap: "18px",
  border: "none",
  background:
    "transparent",
  color: "white",
  textAlign:
    "left" as const,
  cursor: "pointer",
  padding: "8px 0",
};

const memberIdentity = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const avatar = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.09)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
};

const columnLabel = {
  margin: "0 0 5px",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "9px",
  letterSpacing: "1px",
};

const mutedText = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const statusBadge = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "9px",
  border: "1px solid",
  fontSize: "11px",
  textTransform:
    "capitalize" as const,
};

const rowActions = {
  display: "flex",
  gap: "7px",
};

const iconButton = {
  width: "36px",
  height: "36px",
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

const emptyState = {
  padding: "55px 20px",
  textAlign:
    "center" as const,
  color:
    "rgba(255,255,255,0.4)",
  background:
    "rgba(0,0,0,0.2)",
  borderRadius: "16px",
};

const primaryButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 16px",
  borderRadius: "13px",
  border: "none",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace:
    "nowrap" as const,
};

const dangerButton = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "11px 16px",
  borderRadius: "13px",
  border:
    "1px solid rgba(248,113,113,0.2)",
  background:
    "rgba(248,113,113,0.08)",
  color: "#f87171",
  cursor: "pointer",
  fontWeight: 600,
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
  marginBottom: "18px",
  padding: "14px 16px",
  borderRadius: "13px",
  background:
    "rgba(248,113,113,0.08)",
  border:
    "1px solid rgba(248,113,113,0.2)",
  color: "#f87171",
};

const successBox = {
  marginBottom: "18px",
  padding: "14px 16px",
  borderRadius: "13px",
  background:
    "rgba(52,211,153,0.08)",
  border:
    "1px solid rgba(52,211,153,0.2)",
  color: "#34d399",
};

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
  backdropFilter:
    "blur(14px)",
};

const modal = {
  width: "100%",
  maxWidth: "560px",
  maxHeight: "85vh",
  overflowY:
    "auto" as const,
  padding: "28px",
  borderRadius: "24px",
  background: "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.6)",
};

const formModal = {
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  overflowY:
    "auto" as const,
  padding: "30px",
  borderRadius: "25px",
  background: "#111",
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
  marginBottom: "20px",
};

const modalTitle = {
  marginTop: "8px",
  fontSize: "25px",
};

const closeButton = {
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

const detailRow = {
  display: "flex",
  justifyContent:
    "space-between",
  gap: "20px",
  padding: "14px 0",
  borderBottom:
    "1px solid rgba(255,255,255,0.07)",
};

const detailLabel = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const detailValue = {
  maxWidth: "65%",
  textAlign:
    "right" as const,
  fontSize: "13px",
  wordBreak:
    "break-word" as const,
};

const modalActions = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "10px",
  marginTop: "24px",
};

const formStyle = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "10px",
};

const labelStyle = {
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "12px",
  marginTop: "5px",
};

const labelWithIcon = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
};

const inputStyle = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  outline: "none",
  fontSize: "14px",
};

const footerStyle = {
  marginTop: "24px",
  textAlign:
    "center" as const,
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "12px",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color:
    "rgba(255,255,255,0.5)",
};