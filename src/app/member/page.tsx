"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Image as ImageIcon,
  Lock,
  LogOut,
  MinusCircle,
  Plus,
  TrendingUp,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: string;
};

type AllMember = {
  id: string;
  full_name: string;
};

type Withdrawal = {
  id: string;
  member_id: string | null;
  amount: number;
  method: string;
  account_details: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Transaction = {
  id: string;
  member_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
};

type Trade = {
  id: string;
  trade_name: string;
  invested_amount: number;
  approx_return: number;
  status: "ongoing" | "successful" | "failed";
  trade_date: string;
  notes: string | null;
  trader_id: string | null;
};

type TradeMember = {
  id: string;
  trade_id: string;
  member_id: string;
  invested_amount: number;
  created_at: string;
};

type TradeFile = {
  id: string;
  trade_id: string;
  category: string;
  file_url: string;
  created_at: string;
};

type TradeLog = {
  id: string;
  trade_id: string;
  description: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Section =
  | "overview"
  | "members"
  | "cooperative"
  | "trades"
  | "withdrawals"
  | "account";

/* =========================================================
   HELPERS
========================================================= */

const supabase = createClient();

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTradeStatusLabel(status: string) {
  if (status === "successful") {
    return "Successful";
  }

  if (status === "failed") {
    return "Failed — Invested Amount Returned";
  }

  return "Ongoing";
}

function getTradeStatusClass(status: string) {
  if (status === "successful") {
    return "tb-status-success";
  }

  if (status === "failed") {
    return "tb-status-failed";
  }

  return "tb-status-ongoing";
}

function getActivityLabel(type: string) {
  if (type === "deposit") {
    return "Deposit";
  }

  if (type === "withdrawal") {
    return "Withdrawal";
  }

  if (type === "expense") {
    return "Others";
  }

  return type
    ? type.charAt(0).toUpperCase() + type.slice(1)
    : "Activity";
}

function getFileCategoryLabel(category: string) {
  if (category === "agreement") {
    return "Agreement";
  }

  if (category === "receipt") {
    return "Payment Receipt";
  }

  return "Other";
}

function isImageFile(url: string) {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".gif")
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MemberDashboard() {
  const router = useRouter();

  /* =========================================================
     AUTH / MEMBER
  ========================================================= */

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const [activeSection, setActiveSection] =
    useState<Section>("overview");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  /* =========================================================
     MEMBERS
  ========================================================= */

  const [allMembers, setAllMembers] =
    useState<AllMember[]>([]);

  const [membersLoading, setMembersLoading] =
    useState(false);

  /* =========================================================
     TRANSACTIONS
  ========================================================= */

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [transactionsLoading, setTransactionsLoading] =
    useState(false);

  /* =========================================================
     WITHDRAWALS
  ========================================================= */

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [withdrawalsLoading, setWithdrawalsLoading] =
    useState(false);

  const [showWithdrawalModal, setShowWithdrawalModal] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [withdrawalMethod, setWithdrawalMethod] =
    useState("Bank Transfer");

  const [accountDetails, setAccountDetails] =
    useState("");

  const [withdrawalSubmitting, setWithdrawalSubmitting] =
    useState(false);

  const [withdrawalMessage, setWithdrawalMessage] =
    useState("");

  /* =========================================================
     TRADES
  ========================================================= */

  const [trades, setTrades] =
    useState<Trade[]>([]);

  const [tradeMembers, setTradeMembers] =
    useState<TradeMember[]>([]);

  const [tradeFiles, setTradeFiles] =
    useState<TradeFile[]>([]);

  const [tradeLogs, setTradeLogs] =
    useState<TradeLog[]>([]);

  const [tradesLoading, setTradesLoading] =
    useState(false);

  const [selectedTrade, setSelectedTrade] =
    useState<Trade | null>(null);

  const [showTradeModal, setShowTradeModal] =
    useState(false);

  /* =========================================================
     IMAGE VIEWER
  ========================================================= */

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  /* =========================================================
     ERROR
  ========================================================= */

  const [pageError, setPageError] =
    useState("");

  /* =========================================================
     LOAD MEMBER
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadMember() {
      setLoading(true);
      setPageError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error(
            "Auth user error:",
            authError
          );
        }

        if (!user) {
          if (mounted) {
            router.replace("/login");
          }

          return;
        }

        const {
          data: memberData,
          error: memberError,
        } = await supabase
          .from("members")
          .select(
            "id, full_name, phone, investment_amount, profit_share, status"
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (memberError) {
          console.error(
            "Member loading error:",
            memberError
          );

          if (mounted) {
            setPageError(
              "Unable to load your member account."
            );
          }

          return;
        }

        if (!memberData) {
          if (mounted) {
            setPageError(
              "Your member account could not be found."
            );
          }

          return;
        }

        if (
          memberData.status &&
          memberData.status !== "active"
        ) {
          if (mounted) {
            setPageError(
              "Your member account is not active."
            );
          }

          return;
        }

        if (!mounted) return;

        setMember(memberData as Member);

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Profile loading error:",
            profileError
          );
        }

        if (mounted && profileData) {
          setProfile(profileData as Profile);
        }

        await Promise.all([
          loadAllMembers(),
          loadTransactions(),
          loadWithdrawalsForMember(
            memberData.id
          ),
          loadTrades(memberData.id),
        ]);
      } catch (error) {
        console.error(
          "Member dashboard error:",
          error
        );

        if (mounted) {
          setPageError(
            "Something went wrong while loading your dashboard."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadMember();

    return () => {
      mounted = false;
    };
  }, [router]);

  /* =========================================================
     LOAD MEMBERS
  ========================================================= */

  async function loadAllMembers() {
    setMembersLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("members")
        .select("id, full_name")
        .order("full_name", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Members list error:",
          error
        );

        setAllMembers([]);
        return;
      }

      setAllMembers(
        (data ?? []) as AllMember[]
      );
    } catch (error) {
      console.error(
        "Members list exception:",
        error
      );

      setAllMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  /* =========================================================
     LOAD TRANSACTIONS
  ========================================================= */

  async function loadTransactions() {
    setTransactionsLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("transactions")
        .select(
          `
          id,
          member_id,
          type,
          amount,
          description,
          status,
          created_at
        `
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Transactions loading error:",
          error
        );

        setTransactions([]);
        return;
      }

      setTransactions(
        (data ?? []) as Transaction[]
      );
    } catch (error) {
      console.error(
        "Transactions exception:",
        error
      );

      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }

  /* =========================================================
     LOAD WITHDRAWALS
  ========================================================= */

  async function loadWithdrawalsForMember(
    memberId: string
  ) {
    setWithdrawalsLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("withdrawals")
        .select(
          `
          id,
          member_id,
          amount,
          method,
          account_details,
          status,
          reviewed_by,
          reviewed_at,
          created_at
        `
        )
        .eq("member_id", memberId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Withdrawals loading error:",
          error
        );

        setWithdrawals([]);
        return;
      }

      setWithdrawals(
        (data ?? []) as Withdrawal[]
      );
    } catch (error) {
      console.error(
        "Withdrawals exception:",
        error
      );

      setWithdrawals([]);
    } finally {
      setWithdrawalsLoading(false);
    }
  }

  /* =========================================================
     LOAD TRADES
  ========================================================= */

  async function loadTrades(memberId: string) {
    setTradesLoading(true);

    try {
      const {
        data: tradeData,
        error: tradeError,
      } = await supabase
        .from("trades")
        .select(
          `
          id,
          trade_name,
          invested_amount,
          approx_return,
          status,
          trade_date,
          notes,
          trader_id
        `
        )
        .order("trade_date", {
          ascending: false,
        });

      if (tradeError) {
        console.error(
          "Trades loading error:",
          tradeError
        );

        setTrades([]);
        setTradeMembers([]);
        setTradeFiles([]);
        setTradeLogs([]);

        return;
      }

      const safeTrades =
        (tradeData ?? []) as Trade[];

      setTrades(safeTrades);

      if (safeTrades.length === 0) {
        setTradeMembers([]);
        setTradeFiles([]);
        setTradeLogs([]);
        return;
      }

      const tradeIds =
        safeTrades.map(
          (trade) => trade.id
        );

      const {
        data: tradeMemberData,
        error: tradeMemberError,
      } = await supabase
        .from("trade_members")
        .select(
          `
          id,
          trade_id,
          member_id,
          invested_amount,
          created_at
        `
        )
        .eq("member_id", memberId);

      if (tradeMemberError) {
        console.error(
          "Trade members loading error:",
          tradeMemberError
        );

        setTradeMembers([]);
      } else {
        setTradeMembers(
          (tradeMemberData ?? []) as TradeMember[]
        );
      }

      const {
        data: tradeFileData,
        error: tradeFileError,
      } = await supabase
        .from("trade_files")
        .select(
          `
          id,
          trade_id,
          category,
          file_url,
          created_at
        `
        )
        .in("trade_id", tradeIds)
        .order("created_at", {
          ascending: true,
        });

      if (tradeFileError) {
        console.error(
          "Trade files loading error:",
          tradeFileError
        );

        setTradeFiles([]);
      } else {
        setTradeFiles(
          (tradeFileData ?? []) as TradeFile[]
        );
      }

      const {
        data: tradeLogData,
        error: tradeLogError,
      } = await supabase
        .from("trade_logs")
        .select(
          `
          id,
          trade_id,
          description,
          created_at
        `
        )
        .in("trade_id", tradeIds)
        .order("created_at", {
          ascending: false,
        });

      if (tradeLogError) {
        console.error(
          "Trade logs loading error:",
          tradeLogError
        );

        setTradeLogs([]);
      } else {
        setTradeLogs(
          (tradeLogData ?? []) as TradeLog[]
        );
      }
    } catch (error) {
      console.error(
        "Trades exception:",
        error
      );

      setTrades([]);
      setTradeMembers([]);
      setTradeFiles([]);
      setTradeLogs([]);
    } finally {
      setTradesLoading(false);
    }
  }

  /* =========================================================
     RELOAD
  ========================================================= */

  async function reloadMemberData() {
    if (!member?.id) return;

    await Promise.all([
      loadWithdrawalsForMember(member.id),
      loadTransactions(),
      loadTrades(member.id),
    ]);
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function changeSection(section: Section) {
    setActiveSection(section);
    setMobileMenuOpen(false);
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await supabase.auth.signOut();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  /* =========================================================
     WITHDRAWAL
  ========================================================= */

  async function submitWithdrawal() {
    if (!member?.id) {
      setWithdrawalMessage(
        "Member account not found."
      );

      return;
    }

    const amount = Number(
      withdrawalAmount
    );

    if (
      !withdrawalAmount ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setWithdrawalMessage(
        "Please enter a valid withdrawal amount."
      );

      return;
    }

    if (!accountDetails.trim()) {
      setWithdrawalMessage(
        "Please enter your account details."
      );

      return;
    }

    setWithdrawalSubmitting(true);
    setWithdrawalMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("withdrawals")
        .insert({
          member_id: member.id,
          amount,
          method: withdrawalMethod,
          account_details:
            accountDetails.trim(),
          status: "pending",
        });

      if (error) {
        console.error(
          "Withdrawal submission error:",
          error
        );

        setWithdrawalMessage(
          error.message ||
            "Unable to submit withdrawal request."
        );

        return;
      }

      setWithdrawalMessage(
        "Withdrawal request submitted successfully."
      );

      setWithdrawalAmount("");
      setAccountDetails("");

      await loadWithdrawalsForMember(
        member.id
      );

      setTimeout(() => {
        setShowWithdrawalModal(false);
        setWithdrawalMessage("");
      }, 1200);
    } catch (error) {
      console.error(
        "Withdrawal exception:",
        error
      );

      setWithdrawalMessage(
        "Something went wrong while submitting the request."
      );
    } finally {
      setWithdrawalSubmitting(false);
    }
  }

  /* =========================================================
     MEMBER BALANCES
  ========================================================= */

  const memberTransactions = useMemo(() => {
    if (!member?.id) return [];

    return transactions.filter(
      (transaction) =>
        transaction.member_id ===
        member.id
    );
  }, [transactions, member]);

  const memberDeposits = useMemo(() => {
    if (!member?.id) return 0;

    return memberTransactions
      .filter(
        (transaction) =>
          transaction.type === "deposit"
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.amount || 0
          ),
        0
      );
  }, [memberTransactions, member]);

  const memberWithdrawals = useMemo(() => {
    if (!member?.id) return 0;

    return withdrawals
      .filter(
        (withdrawal) =>
          withdrawal.status ===
            "approved" ||
          withdrawal.status ===
            "completed"
      )
      .reduce(
        (total, withdrawal) =>
          total +
          Number(
            withdrawal.amount || 0
          ),
        0
      );
  }, [withdrawals, member]);

  const memberBalance = useMemo(() => {
    if (!member) return 0;

    const baseAmount =
      Number(
        member.investment_amount || 0
      );

    return (
      baseAmount +
      memberDeposits -
      memberWithdrawals
    );
  }, [
    member,
    memberDeposits,
    memberWithdrawals,
  ]);

  /* =========================================================
     COOPERATIVE BALANCE
  ========================================================= */

  const cooperativeDeposits = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "deposit"
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.amount || 0
          ),
        0
      );
  }, [transactions]);

  const cooperativeWithdrawals = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type ===
          "withdrawal"
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.amount || 0
          ),
        0
      );
  }, [transactions]);

  const cooperativeOthers = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type ===
          "expense"
      )
      .reduce(
        (total, transaction) =>
          total +
          Number(
            transaction.amount || 0
          ),
        0
      );
  }, [transactions]);

  const cooperativeBalance = useMemo(() => {
    return (
      cooperativeDeposits -
      cooperativeWithdrawals -
      cooperativeOthers
    );
  }, [
    cooperativeDeposits,
    cooperativeWithdrawals,
    cooperativeOthers,
  ]);

  /* =========================================================
     TRADE DATA
  ========================================================= */

  const memberTradeContributions = useMemo(() => {
    const map: Record<string, number> = {};

    for (const item of tradeMembers) {
      map[item.trade_id] =
        Number(
          item.invested_amount || 0
        );
    }

    return map;
  }, [tradeMembers]);

  const ongoingTrades = useMemo(() => {
    return trades.filter(
      (trade) =>
        trade.status === "ongoing"
    );
  }, [trades]);

  const successfulTrades = useMemo(() => {
    return trades.filter(
      (trade) =>
        trade.status === "successful"
    );
  }, [trades]);

  const failedTrades = useMemo(() => {
    return trades.filter(
      (trade) =>
        trade.status === "failed"
    );
  }, [trades]);

  const totalTradeCapital = useMemo(() => {
    return trades.reduce(
      (total, trade) =>
        total +
        Number(
          trade.invested_amount || 0
        ),
      0
    );
  }, [trades]);

  function getTradeContribution(
    tradeId: string
  ) {
    return (
      memberTradeContributions[
        tradeId
      ] ?? 0
    );
  }

  function getTradeFiles(
    tradeId: string
  ) {
    return tradeFiles.filter(
      (file) =>
        file.trade_id === tradeId
    );
  }

  function getTradeLogs(
    tradeId: string
  ) {
    return tradeLogs.filter(
      (log) =>
        log.trade_id === tradeId
    );
  }

  function openTrade(trade: Trade) {
    setSelectedTrade(trade);
    setShowTradeModal(true);
  }

  function closeTrade() {
    setShowTradeModal(false);
    setSelectedTrade(null);
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <>
        <style>{styles}</style>

        <main className="tb-loading-page">
          <div className="tb-loading-card">
            <div className="tb-logo-glow">
              <TrendingUp size={24} />
            </div>

            <div className="tb-spinner" />

            <h2>
              Loading TradeBishi
            </h2>

            <p>
              Preparing your member dashboard...
            </p>
          </div>
        </main>
      </>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (!member) {
    return (
      <>
        <style>{styles}</style>

        <main className="tb-loading-page">
          <div className="tb-error-card">
            <div className="tb-error-icon">
              <XCircle size={28} />
            </div>

            <h2>
              Unable to open member dashboard
            </h2>

            <p>
              {pageError ||
                "Your member account could not be loaded."}
            </p>

            <button
              type="button"
              className="tb-primary-button"
              onClick={() =>
                router.refresh()
              }
            >
              Try Again
            </button>

            <button
              type="button"
              className="tb-secondary-button"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </main>
      </>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <style>{styles}</style>

      <div className="tb-app">

        {/* SIDEBAR */}

        <aside
          className={`tb-sidebar ${
            mobileMenuOpen
              ? "tb-sidebar-open"
              : ""
          }`}
        >
          <div className="tb-brand">
            <div className="tb-brand-mark">
              <TrendingUp size={21} />
            </div>

            <div>
              <div className="tb-brand-name">
                TradeBishi
              </div>

              <div className="tb-brand-subtitle">
                Member Portal
              </div>
            </div>
          </div>

          <nav className="tb-nav">

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "overview"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "overview"
                )
              }
            >
              <BarChart3 size={18} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "members"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "members"
                )
              }
            >
              <Users size={18} />
              <span>Members</span>
            </button>

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "cooperative"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "cooperative"
                )
              }
            >
              <Activity size={18} />
              <span>
                Cooperative Activity
              </span>
            </button>

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "trades"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "trades"
                )
              }
            >
              <TrendingUp size={18} />
              <span>Trades</span>

              {ongoingTrades.length > 0 && (
                <span className="tb-nav-count">
                  {ongoingTrades.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "withdrawals"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "withdrawals"
                )
              }
            >
              <ArrowDownRight size={18} />
              <span>Withdrawals</span>
            </button>

            <button
              type="button"
              className={`tb-nav-item ${
                activeSection ===
                "account"
                  ? "tb-nav-active"
                  : ""
              }`}
              onClick={() =>
                changeSection(
                  "account"
                )
              }
            >
              <Lock size={18} />
              <span>Account</span>
            </button>

          </nav>

          <div className="tb-sidebar-bottom">

            <div className="tb-user-mini">
              <div className="tb-avatar">
                {member.full_name
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "M"}
              </div>

              <div className="tb-user-mini-info">
                <strong>
                  {member.full_name}
                </strong>

                <span>
                  Member
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="tb-logout-button"
            >
              <LogOut size={16} />
              <span>
                Sign Out
              </span>
            </button>

          </div>
        </aside>

        {/* MOBILE OVERLAY */}

        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="tb-mobile-overlay"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          />
        )}

        {/* MAIN */}

        <main className="tb-main">

          <header className="tb-header">

            <div className="tb-header-left">

              <button
                type="button"
                className="tb-mobile-menu"
                onClick={() =>
                  setMobileMenuOpen(true)
                }
              >
                <Activity size={20} />
              </button>

              <div>
                <h1>
                  {activeSection === "overview" &&
                    "Overview"}

                  {activeSection === "members" &&
                    "Members"}

                  {activeSection === "cooperative" &&
                    "Cooperative Activity"}

                  {activeSection === "trades" &&
                    "Trades"}

                  {activeSection === "withdrawals" &&
                    "Withdrawals"}

                  {activeSection === "account" &&
                    "Account"}
                </h1>

                <p>
                  Welcome back,{" "}
                  {member.full_name}
                </p>
              </div>

            </div>

            <div className="tb-header-right">
              <div className="tb-header-status">
                <span className="tb-online-dot" />
                Active Member
              </div>
            </div>

          </header>

          <div className="tb-content">

            {/* =================================================
                OVERVIEW
            ================================================= */}

            {activeSection === "overview" && (
              <section>

                <div className="tb-page-intro">
                  <div>
                    <div className="tb-eyebrow">
                      MEMBER DASHBOARD
                    </div>

                    <h2>
                      Member Overview
                    </h2>

                    <p>
                      A quick view of your
                      account and cooperative
                      activity.
                    </p>
                  </div>

                  <div className="tb-intro-date">
                    {formatDate(
                      new Date().toISOString()
                    )}
                  </div>
                </div>

                <div className="tb-stat-grid">

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <div className="tb-stat-icon">
                        <Wallet size={20} />
                      </div>

                      <span className="tb-stat-dot" />
                    </div>

                    <div className="tb-stat-label">
                      Member Balance
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        memberBalance
                      )}
                    </div>

                    <div className="tb-stat-foot">
                      Your current member balance
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <div className="tb-stat-icon">
                        <CircleDollarSign size={20} />
                      </div>

                      <span className="tb-stat-dot" />
                    </div>

                    <div className="tb-stat-label">
                      Cooperative Balance
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        cooperativeBalance
                      )}
                    </div>

                    <div className="tb-stat-foot">
                      Common cooperative balance
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <div className="tb-stat-icon">
                        <TrendingUp size={20} />
                      </div>

                      <span className="tb-stat-dot" />
                    </div>

                    <div className="tb-stat-label">
                      Active Trades
                    </div>

                    <div className="tb-stat-value">
                      {ongoingTrades.length}
                    </div>

                    <div className="tb-stat-foot">
                      Currently ongoing
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <div className="tb-stat-icon">
                        <Users size={20} />
                      </div>

                      <span className="tb-stat-dot" />
                    </div>

                    <div className="tb-stat-label">
                      Members
                    </div>

                    <div className="tb-stat-value">
                      {allMembers.length}
                    </div>

                    <div className="tb-stat-foot">
                      Cooperative members
                    </div>
                  </div>

                </div>

                <div className="tb-two-column">

                  <div className="tb-panel">

                    <div className="tb-panel-header">
                      <div>
                        <h3>
                          Recent Activity
                        </h3>

                        <p>
                          Latest cooperative
                          transactions
                        </p>
                      </div>

                      <Activity size={20} />
                    </div>

                    {transactionsLoading ? (
                      <div className="tb-empty">
                        Loading activity...
                      </div>
                    ) : memberTransactions.length === 0 ? (
                      <div className="tb-empty">
                        No activity found.
                      </div>
                    ) : (
                      <div className="tb-activity-list">
                        {memberTransactions
                          .slice(0, 6)
                          .map((transaction) => (
                            <div
                              key={transaction.id}
                              className="tb-activity-row"
                            >
                              <div
                                className={`tb-activity-icon ${
                                  transaction.type ===
                                  "deposit"
                                    ? "tb-activity-positive"
                                    : transaction.type ===
                                          "withdrawal" ||
                                        transaction.type ===
                                          "expense"
                                      ? "tb-activity-negative"
                                      : ""
                                }`}
                              >
                                {transaction.type ===
                                "deposit" ? (
                                  <ArrowUpRight size={17} />
                                ) : (
                                  <ArrowDownRight size={17} />
                                )}
                              </div>

                              <div className="tb-activity-main">
                                <strong>
                                  {getActivityLabel(
                                    transaction.type
                                  )}
                                </strong>

                                <span>
                                  {transaction.description ||
                                    "No description"}
                                </span>
                              </div>

                              <div className="tb-activity-amount">
                                {formatCurrency(
                                  transaction.amount
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                  </div>

                  <div className="tb-panel">

                    <div className="tb-panel-header">
                      <div>
                        <h3>
                          Your Trades
                        </h3>

                        <p>
                          Recent trade participation
                        </p>
                      </div>

                      <button
                        type="button"
                        className="tb-panel-link"
                        onClick={() =>
                          changeSection("trades")
                        }
                      >
                        View all
                      </button>
                    </div>

                    {tradesLoading ? (
                      <div className="tb-empty">
                        Loading trades...
                      </div>
                    ) : trades.length === 0 ? (
                      <div className="tb-empty">
                        No trades available.
                      </div>
                    ) : (
                      <div className="tb-trade-mini-list">
                        {trades
                          .slice(0, 5)
                          .map((trade) => (
                            <button
                              key={trade.id}
                              type="button"
                              className="tb-trade-mini"
                              onClick={() =>
                                openTrade(trade)
                              }
                            >
                              <div>
                                <strong>
                                  {trade.trade_name}
                                </strong>

                                <span>
                                  {formatDate(
                                    trade.trade_date
                                  )}
                                </span>
                              </div>

                              <div className="tb-trade-mini-right">
                                <span
                                  className={getTradeStatusClass(
                                    trade.status
                                  )}
                                >
                                  {getTradeStatusLabel(
                                    trade.status
                                  )}
                                </span>

                                <ChevronRight size={16} />
                              </div>
                            </button>
                          ))}
                      </div>
                    )}

                  </div>

                </div>

                <div className="tb-action-banner">

                  <div className="tb-action-banner-icon">
                    <ArrowDownRight size={22} />
                  </div>

                  <div className="tb-action-banner-content">
                    <h3>
                      Need to withdraw?
                    </h3>

                    <p>
                      Submit a withdrawal request
                      for admin approval.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="tb-primary-button"
                    onClick={() => {
                      setWithdrawalMessage("");
                      setShowWithdrawalModal(true);
                    }}
                  >
                    Request Withdrawal
                  </button>

                </div>

              </section>
            )}

            {/* =================================================
                MEMBERS
            ================================================= */}

            {activeSection === "members" && (
              <section>

                <div className="tb-page-intro">
                  <div>
                    <div className="tb-eyebrow">
                      COOPERATIVE
                    </div>

                    <h2>
                      Cooperative Members
                    </h2>

                    <p>
                      View the members of your
                      cooperative.
                    </p>
                  </div>

                  <div className="tb-member-count">
                    <Users size={17} />
                    {allMembers.length} Members
                  </div>
                </div>

                <div className="tb-panel">

                  <div className="tb-panel-header">
                    <div>
                      <h3>
                        Member Directory
                      </h3>

                      <p>
                        Names of all active
                        cooperative members
                      </p>
                    </div>

                    <Users size={20} />
                  </div>

                  {membersLoading ? (
                    <div className="tb-empty">
                      Loading members...
                    </div>
                  ) : allMembers.length === 0 ? (
                    <div className="tb-empty">
                      No members found.
                    </div>
                  ) : (
                    <div className="tb-members-grid">
                      {allMembers.map(
                        (item, index) => {
                          const isCurrent =
                            item.id === member.id;

                          return (
                            <div
                              key={item.id}
                              className={`tb-member-card ${
                                isCurrent
                                  ? "tb-member-current"
                                  : ""
                              }`}
                            >
                              <div className="tb-member-avatar">
                                {item.full_name
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "M"}
                              </div>

                              <div className="tb-member-info">
                                <strong>
                                  {item.full_name}
                                </strong>

                                <span>
                                  {isCurrent
                                    ? "You"
                                    : `Member ${
                                        index + 1
                                      }`}
                                </span>
                              </div>

                              {isCurrent && (
                                <span className="tb-you-badge">
                                  You
                                </span>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                </div>

              </section>
            )}

            {/* =================================================
                COOPERATIVE
            ================================================= */}

            {activeSection === "cooperative" && (
              <section>

                <div className="tb-page-intro">
                  <div>
                    <div className="tb-eyebrow">
                      LEDGER
                    </div>

                    <h2>
                      Cooperative Activity
                    </h2>

                    <p>
                      View common financial activity
                      recorded by the cooperative.
                    </p>
                  </div>

                  <Activity size={22} />
                </div>

                <div className="tb-stat-grid">

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <ArrowUpRight size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Deposits
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        cooperativeDeposits
                      )}
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <ArrowDownRight size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Withdrawals
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        cooperativeWithdrawals
                      )}
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <MinusCircle size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Others
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        cooperativeOthers
                      )}
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <Wallet size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Cooperative Balance
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        cooperativeBalance
                      )}
                    </div>
                  </div>

                </div>

                <div className="tb-panel">

                  <div className="tb-panel-header">
                    <div>
                      <h3>
                        Activity Ledger
                      </h3>

                      <p>
                        Deposits, withdrawals and
                        other cooperative activity
                      </p>
                    </div>

                    <Activity size={20} />
                  </div>

                  {transactionsLoading ? (
                    <div className="tb-empty">
                      Loading cooperative activity...
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="tb-empty">
                      No cooperative activity found.
                    </div>
                  ) : (
                    <div className="tb-table-wrap">

                      <table className="tb-table">

                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>

                        <tbody>
                          {transactions.map(
                            (transaction) => (
                              <tr key={transaction.id}>

                                <td>
                                  <div className="tb-table-type">
                                    {transaction.type ===
                                    "deposit" ? (
                                      <ArrowUpRight size={15} />
                                    ) : (
                                      <ArrowDownRight size={15} />
                                    )}

                                    <span>
                                      {getActivityLabel(
                                        transaction.type
                                      )}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  {transaction.description ||
                                    "—"}
                                </td>

                                <td className="tb-table-amount">
                                  {formatCurrency(
                                    transaction.amount
                                  )}
                                </td>

                                <td>
                                  <span
                                    className={`tb-basic-status ${
                                      transaction.status ===
                                      "approved"
                                        ? "tb-basic-approved"
                                        : transaction.status ===
                                            "rejected"
                                          ? "tb-basic-rejected"
                                          : "tb-basic-pending"
                                    }`}
                                  >
                                    {transaction.status ||
                                      "—"}
                                  </span>
                                </td>

                                <td>
                                  {formatDateTime(
                                    transaction.created_at
                                  )}
                                </td>

                              </tr>
                            )
                          )}
                        </tbody>

                      </table>

                    </div>
                  )}

                </div>

              </section>
            )}

            {/* =================================================
                TRADES
            ================================================= */}

            {activeSection === "trades" && (
              <section>

                <div className="tb-page-intro">

                  <div>
                    <div className="tb-eyebrow">
                      TRADE PORTFOLIO
                    </div>

                    <h2>
                      Trades
                    </h2>

                    <p>
                      View cooperative trades and
                      your participation in them.
                    </p>
                  </div>

                  <div className="tb-trade-summary">
                    <TrendingUp size={18} />
                    {trades.length} Total Trades
                  </div>

                </div>

                <div className="tb-stat-grid">

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <Clock size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Ongoing
                    </div>

                    <div className="tb-stat-value">
                      {ongoingTrades.length}
                    </div>

                    <div className="tb-stat-foot">
                      Trades currently ongoing
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <CheckCircle2 size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Successful
                    </div>

                    <div className="tb-stat-value">
                      {successfulTrades.length}
                    </div>

                    <div className="tb-stat-foot">
                      Completed successfully
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <XCircle size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Failed
                    </div>

                    <div className="tb-stat-value">
                      {failedTrades.length}
                    </div>

                    <div className="tb-stat-foot">
                      Invested amount returned
                    </div>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-icon">
                      <CircleDollarSign size={20} />
                    </div>

                    <div className="tb-stat-label">
                      Trade Capital
                    </div>

                    <div className="tb-stat-value">
                      {formatCurrency(
                        totalTradeCapital
                      )}
                    </div>

                    <div className="tb-stat-foot">
                      Across recorded trades
                    </div>
                  </div>

                </div>

                <div className="tb-trades-grid">

                  {tradesLoading ? (
                    <div className="tb-panel tb-trades-loading">
                      <div className="tb-spinner" />

                      <h3>
                        Loading trades...
                      </h3>

                      <p>
                        Please wait while trade
                        information is loaded.
                      </p>
                    </div>
                  ) : trades.length === 0 ? (
                    <div className="tb-panel tb-empty-large">

                      <div className="tb-empty-large-icon">
                        <TrendingUp size={28} />
                      </div>

                      <h3>
                        No trades yet
                      </h3>

                      <p>
                        Trades created by the
                        cooperative will appear here.
                      </p>

                    </div>
                  ) : (
                    trades.map((trade) => {

                      const contribution =
                        getTradeContribution(
                          trade.id
                        );

                      const files =
                        getTradeFiles(
                          trade.id
                        );

                      const agreementCount =
                        files.filter(
                          (file) =>
                            file.category ===
                            "agreement"
                        ).length;

                      const receiptCount =
                        files.filter(
                          (file) =>
                            file.category ===
                            "receipt"
                        ).length;

                      return (
                        <button
                          key={trade.id}
                          type="button"
                          className="tb-trade-card"
                          onClick={() =>
                            openTrade(trade)
                          }
                        >

                          <div className="tb-trade-card-top">

                            <div className="tb-trade-icon">
                              <TrendingUp size={21} />
                            </div>

                            <span
                              className={getTradeStatusClass(
                                trade.status
                              )}
                            >
                              {getTradeStatusLabel(
                                trade.status
                              )}
                            </span>

                          </div>

                          <div className="tb-trade-card-name">
                            {trade.trade_name}
                          </div>

                          <div className="tb-trade-date">
                            Trade Date:{" "}
                            {formatDate(
                              trade.trade_date
                            )}
                          </div>

                          <div className="tb-trade-values">

                            <div>
                              <span>
                                Total Trade
                              </span>

                              <strong>
                                {formatCurrency(
                                  trade.invested_amount
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Approx. Return
                              </span>

                              <strong>
                                {formatCurrency(
                                  trade.approx_return
                                )}
                              </strong>
                            </div>

                          </div>

                          <div className="tb-trade-contribution">

                            <div>
                              <span>
                                Your Contribution
                              </span>

                              <strong>
                                {formatCurrency(
                                  contribution
                                )}
                              </strong>
                            </div>

                            <ChevronRight size={18} />

                          </div>

                          <div className="tb-trade-card-footer">

                            <span>
                              <ImageIcon size={14} />
                              {agreementCount} Agreements
                            </span>

                            <span>
                              <ImageIcon size={14} />
                              {receiptCount} Receipts
                            </span>

                          </div>

                        </button>
                      );
                    })
                  )}

                </div>

              </section>
            )}

            {/* =================================================
                WITHDRAWALS
            ================================================= */}

            {activeSection === "withdrawals" && (
              <section>

                <div className="tb-page-intro">

                  <div>
                    <div className="tb-eyebrow">
                      ACCOUNT
                    </div>

                    <h2>
                      Withdrawals
                    </h2>

                    <p>
                      Request withdrawals and track
                      their status.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="tb-primary-button"
                    onClick={() => {
                      setWithdrawalMessage("");
                      setShowWithdrawalModal(true);
                    }}
                  >
                    <Plus size={17} />
                    New Request
                  </button>

                </div>

                <div className="tb-panel">

                  <div className="tb-panel-header">

                    <div>
                      <h3>
                        Withdrawal Requests
                      </h3>

                      <p>
                        Your submitted withdrawal
                        requests
                      </p>
                    </div>

                    <ArrowDownRight size={20} />

                  </div>

                  {withdrawalsLoading ? (
                    <div className="tb-empty">
                      Loading withdrawals...
                    </div>
                  ) : withdrawals.length === 0 ? (
                    <div className="tb-empty-large">

                      <div className="tb-empty-large-icon">
                        <ArrowDownRight size={28} />
                      </div>

                      <h3>
                        No withdrawal requests
                      </h3>

                      <p>
                        You have not submitted a
                        withdrawal request yet.
                      </p>

                      <button
                        type="button"
                        className="tb-primary-button"
                        onClick={() =>
                          setShowWithdrawalModal(true)
                        }
                      >
                        Request Withdrawal
                      </button>

                    </div>
                  ) : (
                    <div className="tb-withdrawal-list">

                      {withdrawals.map(
                        (withdrawal) => (
                          <div
                            key={withdrawal.id}
                            className="tb-withdrawal-row"
                          >

                            <div className="tb-withdrawal-icon">
                              <ArrowDownRight size={19} />
                            </div>

                            <div className="tb-withdrawal-main">

                              <strong>
                                {formatCurrency(
                                  withdrawal.amount
                                )}
                              </strong>

                              <span>
                                {withdrawal.method}
                              </span>

                              <small>
                                Requested{" "}
                                {formatDateTime(
                                  withdrawal.created_at
                                )}
                              </small>

                            </div>

                            <div>

                              <span
                                className={`tb-basic-status ${
                                  withdrawal.status ===
                                  "approved"
                                    ? "tb-basic-approved"
                                    : withdrawal.status ===
                                        "rejected"
                                      ? "tb-basic-rejected"
                                      : "tb-basic-pending"
                                }`}
                              >
                                {withdrawal.status}
                              </span>

                            </div>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

              </section>
            )}

            {/* =================================================
                ACCOUNT
            ================================================= */}

            {activeSection === "account" && (
              <section>

                <div className="tb-page-intro">

                  <div>
                    <div className="tb-eyebrow">
                      PROFILE
                    </div>

                    <h2>
                      Account
                    </h2>

                    <p>
                      Your TradeBishi member account
                      information.
                    </p>
                  </div>

                  <Lock size={22} />

                </div>

                <div className="tb-account-grid">

                  <div className="tb-panel">

                    <div className="tb-panel-header">
                      <div>
                        <h3>
                          Personal Information
                        </h3>

                        <p>
                          Basic member details
                        </p>
                      </div>

                      <Users size={20} />
                    </div>

                    <div className="tb-account-list">

                      <div className="tb-account-row">
                        <span>
                          Full Name
                        </span>

                        <strong>
                          {member.full_name}
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Phone
                        </span>

                        <strong>
                          {member.phone ||
                            "Not provided"}
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Member Status
                        </span>

                        <strong>
                          {member.status}
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Member ID
                        </span>

                        <strong className="tb-account-id">
                          {member.id}
                        </strong>
                      </div>

                    </div>

                  </div>

                  <div className="tb-panel">

                    <div className="tb-panel-header">
                      <div>
                        <h3>
                          Account Summary
                        </h3>

                        <p>
                          Your current account figures
                        </p>
                      </div>

                      <Wallet size={20} />
                    </div>

                    <div className="tb-account-list">

                      <div className="tb-account-row">
                        <span>
                          Member Balance
                        </span>

                        <strong>
                          {formatCurrency(
                            memberBalance
                          )}
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Member Share
                        </span>

                        <strong>
                          {Number(
                            member.profit_share || 0
                          )}
                          %
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Active Trades
                        </span>

                        <strong>
                          {ongoingTrades.length}
                        </strong>
                      </div>

                      <div className="tb-account-row">
                        <span>
                          Total Trades
                        </span>

                        <strong>
                          {trades.length}
                        </strong>
                      </div>

                    </div>

                  </div>

                </div>

                <div className="tb-account-security">

                  <div className="tb-security-icon">
                    <Lock size={20} />
                  </div>

                  <div>
                    <h3>
                      Account Security
                    </h3>

                    <p>
                      Your authentication is managed
                      securely through TradeBishi's
                      authentication system.
                    </p>
                  </div>

                </div>

                <button
                  type="button"
                  className="tb-danger-button"
                  onClick={handleLogout}
                >
                  <LogOut size={17} />
                  Sign Out
                </button>

              </section>
            )}

          </div>
        </main>

        {/* =================================================
            TRADE DETAIL MODAL
        ================================================= */}

        {showTradeModal &&
          selectedTrade && (
            <div className="tb-modal-backdrop">

              <div className="tb-modal tb-trade-modal">

                <div className="tb-modal-header">

                  <div>

                    <span className="tb-modal-eyebrow">
                      Trade Details
                    </span>

                    <h2>
                      {selectedTrade.trade_name}
                    </h2>

                  </div>

                  <button
                    type="button"
                    className="tb-close-button"
                    onClick={closeTrade}
                  >
                    <X size={20} />
                  </button>

                </div>

                <div className="tb-modal-body">

                  <div className="tb-trade-detail-status">

                    <span
                      className={getTradeStatusClass(
                        selectedTrade.status
                      )}
                    >
                      {getTradeStatusLabel(
                        selectedTrade.status
                      )}
                    </span>

                    <span>
                      {formatDate(
                        selectedTrade.trade_date
                      )}
                    </span>

                  </div>

                  <div className="tb-detail-grid">

                    <div className="tb-detail-card">
                      <span>
                        Total Trade Amount
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedTrade.invested_amount
                        )}
                      </strong>
                    </div>

                    <div className="tb-detail-card">
                      <span>
                        Approx. Return
                      </span>

                      <strong>
                        {formatCurrency(
                          selectedTrade.approx_return
                        )}
                      </strong>
                    </div>

                    <div className="tb-detail-card tb-detail-highlight">
                      <span>
                        Your Contribution
                      </span>

                      <strong>
                        {formatCurrency(
                          getTradeContribution(
                            selectedTrade.id
                          )
                        )}
                      </strong>
                    </div>

                  </div>

                  {selectedTrade.status ===
                    "successful" && (
                    <div className="tb-info-box">

                      <CheckCircle2 size={19} />

                      <div>
                        <strong>
                          Successful Trade
                        </strong>

                        <p>
                          The approximate return
                          shown above represents the
                          total return amount,
                          including the original
                          amount and profit.
                        </p>
                      </div>

                    </div>
                  )}

                  {selectedTrade.status ===
                    "failed" && (
                    <div className="tb-warning-box">

                      <XCircle size={19} />

                      <div>
                        <strong>
                          Invested Amount Returned
                        </strong>

                        <p>
                          This trade was marked
                          failed. The invested amount
                          is intended to be returned
                          to participating members.
                        </p>
                      </div>

                    </div>
                  )}

                  {selectedTrade.status ===
                    "ongoing" && (
                    <div className="tb-info-box">

                      <Clock size={19} />

                      <div>
                        <strong>
                          Trade Ongoing
                        </strong>

                        <p>
                          This trade is currently
                          active. Final settlement
                          has not yet been recorded.
                        </p>
                      </div>

                    </div>
                  )}

                  {selectedTrade.notes && (
                    <div className="tb-detail-section">

                      <div className="tb-detail-section-title">
                        <h3>
                          Trade Notes
                        </h3>
                      </div>

                      <div className="tb-notes">
                        {selectedTrade.notes}
                      </div>

                    </div>
                  )}

                  <div className="tb-detail-section">

                    <div className="tb-detail-section-title">

                      <div>
                        <h3>
                          Documents & Proof
                        </h3>

                        <p>
                          Files attached to this trade
                        </p>
                      </div>

                      <ImageIcon size={19} />

                    </div>

                    {getTradeFiles(
                      selectedTrade.id
                    ).length === 0 ? (
                      <div className="tb-small-empty">
                        No documents uploaded for
                        this trade.
                      </div>
                    ) : (
                      <div className="tb-file-grid">

                        {getTradeFiles(
                          selectedTrade.id
                        ).map((file) => (
                          <button
                            type="button"
                            key={file.id}
                            className="tb-file-card"
                            onClick={() => {
                              if (
                                isImageFile(
                                  file.file_url
                                )
                              ) {
                                setSelectedImage(
                                  file.file_url
                                );
                              } else {
                                window.open(
                                  file.file_url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }
                            }}
                          >

                            <div className="tb-file-preview">

                              {isImageFile(
                                file.file_url
                              ) ? (
                                <img
                                  src={file.file_url}
                                  alt={getFileCategoryLabel(
                                    file.category
                                  )}
                                />
                              ) : (
                                <ImageIcon size={28} />
                              )}

                            </div>

                            <div className="tb-file-info">

                              <strong>
                                {getFileCategoryLabel(
                                  file.category
                                )}
                              </strong>

                              <span>
                                {formatDate(
                                  file.created_at
                                )}
                              </span>

                            </div>

                          </button>
                        ))}

                      </div>
                    )}

                  </div>

                  <div className="tb-detail-section">

                    <div className="tb-detail-section-title">

                      <div>
                        <h3>
                          Trade Activity
                        </h3>

                        <p>
                          Updates recorded by the
                          trade manager
                        </p>
                      </div>

                      <Activity size={19} />

                    </div>

                    {getTradeLogs(
                      selectedTrade.id
                    ).length === 0 ? (
                      <div className="tb-small-empty">
                        No trade updates have been
                        recorded.
                      </div>
                    ) : (
                      <div className="tb-timeline">

                        {getTradeLogs(
                          selectedTrade.id
                        ).map((log) => (
                          <div
                            key={log.id}
                            className="tb-timeline-item"
                          >

                            <div className="tb-timeline-dot" />

                            <div className="tb-timeline-content">

                              <p>
                                {log.description}
                              </p>

                              <span>
                                {formatDateTime(
                                  log.created_at
                                )}
                              </span>

                            </div>

                          </div>
                        ))}

                      </div>
                    )}

                  </div>

                </div>

                <div className="tb-modal-footer">

                  <button
                    type="button"
                    className="tb-secondary-button"
                    onClick={closeTrade}
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>
          )}

        {/* =================================================
            WITHDRAWAL MODAL
        ================================================= */}

        {showWithdrawalModal && (
          <div className="tb-modal-backdrop">

            <div className="tb-modal tb-withdrawal-modal">

              <div className="tb-modal-header">

                <div>

                  <span className="tb-modal-eyebrow">
                    Member Request
                  </span>

                  <h2>
                    Request Withdrawal
                  </h2>

                </div>

                <button
                  type="button"
                  className="tb-close-button"
                  onClick={() => {
                    if (!withdrawalSubmitting) {
                      setShowWithdrawalModal(false);
                    }
                  }}
                >
                  <X size={20} />
                </button>

              </div>

              <div className="tb-modal-body">

                <div className="tb-info-box">

                  <Wallet size={19} />

                  <div>
                    <strong>
                      Available Member Balance
                    </strong>

                    <p>
                      {formatCurrency(
                        memberBalance
                      )}
                    </p>
                  </div>

                </div>

                <div className="tb-form-group">

                  <label>
                    Withdrawal Amount
                  </label>

                  <div className="tb-input-money">

                    <span>
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={withdrawalAmount}
                      onChange={(event) =>
                        setWithdrawalAmount(
                          event.target.value
                        )
                      }
                      placeholder="Enter amount"
                    />

                  </div>

                </div>

                <div className="tb-form-group">

                  <label>
                    Withdrawal Method
                  </label>

                  <select
                    value={withdrawalMethod}
                    onChange={(event) =>
                      setWithdrawalMethod(
                        event.target.value
                      )
                    }
                  >
                    <option>
                      Bank Transfer
                    </option>

                    <option>
                      UPI
                    </option>

                    <option>
                      Other
                    </option>
                  </select>

                </div>

                <div className="tb-form-group">

                  <label>
                    Account Details
                  </label>

                  <textarea
                    value={accountDetails}
                    onChange={(event) =>
                      setAccountDetails(
                        event.target.value
                      )
                    }
                    placeholder={
                      withdrawalMethod ===
                      "UPI"
                        ? "Enter UPI ID"
                        : "Enter bank/account details"
                    }
                    rows={4}
                  />

                </div>

                {withdrawalMessage && (
                  <div className="tb-form-message">
                    {withdrawalMessage}
                  </div>
                )}

              </div>

              <div className="tb-modal-footer">

                <button
                  type="button"
                  className="tb-secondary-button"
                  disabled={withdrawalSubmitting}
                  onClick={() =>
                    setShowWithdrawalModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="tb-primary-button"
                  disabled={withdrawalSubmitting}
                  onClick={submitWithdrawal}
                >
                  {withdrawalSubmitting
                    ? "Submitting..."
                    : "Submit Request"}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            IMAGE VIEWER
        ================================================= */}

        {selectedImage && (
          <div className="tb-image-viewer">

            <button
              type="button"
              className="tb-image-close"
              onClick={() =>
                setSelectedImage(null)
              }
            >
              <X size={22} />
            </button>

            <img
              src={selectedImage}
              alt="Trade document"
            />

          </div>
        )}

      </div>
    </>
  );
}

/* =========================================================
   PREMIUM DARK THEME
========================================================= */

const styles = `
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

/* =========================================================
   APP
========================================================= */

.tb-app {
  min-height: 100vh;
  background: #070a0f;
  color: #f4f7fb;
  display: flex;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

/* =========================================================
   SIDEBAR
========================================================= */

.tb-sidebar {
  width: 250px;
  min-width: 250px;
  min-height: 100vh;
  background: #0a0e15;
  border-right: 1px solid #1b2230;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 50;
}

.tb-brand {
  height: 78px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #171e2a;
}

.tb-brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(
      145deg,
      #2563eb,
      #4f46e5
    );
  color: #ffffff;
  box-shadow:
    0 7px 25px rgba(
      37,
      99,
      235,
      0.28
    );
}

.tb-brand-name {
  color: #f6f8fb;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.tb-brand-subtitle {
  margin-top: 2px;
  color: #68758a;
  font-size: 11px;
}

.tb-nav {
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.tb-nav-item {
  width: 100%;
  min-height: 44px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #778398;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.tb-nav-item:hover {
  background: #111722;
  border-color: #1c2635;
  color: #e5ebf4;
}

.tb-nav-active {
  background:
    linear-gradient(
      135deg,
      #182744,
      #121c30
    );
  border-color: #253b61;
  color: #eaf1ff;
  box-shadow:
    inset 0 1px 0 rgba(
      255,
      255,
      255,
      0.035
    );
}

.tb-nav-active:hover {
  background:
    linear-gradient(
      135deg,
      #182744,
      #121c30
    );
  border-color: #2c4670;
  color: #ffffff;
}

.tb-nav-count {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #2b65d9;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
}

.tb-sidebar-bottom {
  padding: 15px;
  border-top: 1px solid #171e2a;
}

.tb-user-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 4px 13px;
}

.tb-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(
      145deg,
      #1c2b45,
      #121b2b
    );
  border: 1px solid #2a3b57;
  color: #9dbbff;
  font-weight: 800;
  font-size: 13px;
}

.tb-user-mini-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tb-user-mini-info strong {
  color: #e7ecf4;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-user-mini-info span {
  margin-top: 2px;
  font-size: 10px;
  color: #667388;
}

.tb-logout-button {
  width: 100%;
  height: 39px;
  border: 1px solid #232c3a;
  background: #0e141e;
  border-radius: 9px;
  color: #7d899b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.tb-logout-button:hover {
  background: #151b26;
  border-color: #303b4d;
  color: #e3e8ef;
}

/* =========================================================
   MAIN
========================================================= */

.tb-main {
  flex: 1;
  min-width: 0;
  background: #070a0f;
}

.tb-header {
  height: 78px;
  background: rgba(
    10,
    14,
    21,
    0.92
  );
  border-bottom: 1px solid #1a2230;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: sticky;
  top: 0;
  z-index: 30;
  backdrop-filter: blur(18px);
}

.tb-header-left {
  display: flex;
  align-items: center;
  gap: 13px;
}

.tb-header h1 {
  margin: 0;
  color: #f4f7fb;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.4px;
}

.tb-header p {
  margin: 4px 0 0;
  font-size: 11px;
  color: #6f7b8f;
}

.tb-header-right {
  display: flex;
  align-items: center;
}

.tb-header-status {
  height: 32px;
  border: 1px solid #222c3b;
  background: #0f151f;
  border-radius: 999px;
  padding: 0 11px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8b98aa;
  font-size: 11px;
  font-weight: 700;
}

.tb-online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow:
    0 0 10px rgba(
      34,
      197,
      94,
      0.6
    );
}

.tb-mobile-menu {
  display: none;
  width: 38px;
  height: 38px;
  border: 1px solid #252f3e;
  background: #111722;
  color: #dce4ef;
  border-radius: 9px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tb-content {
  padding: 30px;
  max-width: 1500px;
  min-height: calc(100vh - 78px);
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(
        37,
        99,
        235,
        0.07
      ),
      transparent 30%
    ),
    #070a0f;
}

/* =========================================================
   EYEBROW
========================================================= */

.tb-eyebrow {
  margin-bottom: 7px;
  color: #668ddd;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

/* =========================================================
   INTRO
========================================================= */

.tb-page-intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 22px;
}

.tb-page-intro h2 {
  margin: 0;
  color: #f2f5f9;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.tb-page-intro p {
  margin: 6px 0 0;
  color: #737f92;
  font-size: 12px;
}

.tb-intro-date,
.tb-member-count,
.tb-trade-summary {
  height: 34px;
  padding: 0 11px;
  border: 1px solid #222b39;
  background: #0e141e;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8b97a9;
  font-size: 11px;
  font-weight: 700;
}

/* =========================================================
   STAT CARDS
========================================================= */

.tb-stat-grid {
  display: grid;
  grid-template-columns:
    repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.tb-stat-card {
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      #101620,
      #0c1119
    );
  border: 1px solid #1d2634;
  border-radius: 13px;
  padding: 17px;
  min-height: 148px;
  box-shadow:
    0 12px 40px rgba(
      0,
      0,
      0,
      0.2
    );
}

.tb-stat-card::after {
  content: "";
  position: absolute;
  width: 90px;
  height: 90px;
  right: -35px;
  top: -35px;
  border-radius: 50%;
  background: rgba(
    70,
    112,
    210,
    0.07
  );
  pointer-events: none;
}

.tb-stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tb-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #151e2c;
  color: #7fa8ff;
  margin-bottom: 13px;
}

.tb-stat-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3d6fc9;
  box-shadow:
    0 0 10px rgba(
      61,
      111,
      201,
      0.5
    );
}

.tb-stat-label {
  font-size: 11px;
  color: #7f8ca0;
  font-weight: 600;
}

.tb-stat-value {
  margin-top: 5px;
  color: #f5f7fb;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.tb-stat-foot {
  margin-top: 5px;
  color: #626e80;
  font-size: 10px;
}

/* =========================================================
   PANELS
========================================================= */

.tb-panel {
  background: #0d131c;
  border: 1px solid #1c2634;
  border-radius: 13px;
  overflow: hidden;
  box-shadow:
    0 12px 40px rgba(
      0,
      0,
      0,
      0.16
    );
}

.tb-panel-header {
  min-height: 68px;
  padding: 15px 17px;
  border-bottom: 1px solid #1b2431;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  color: #78869a;
}

.tb-panel-header h3 {
  margin: 0;
  color: #e9eef5;
  font-size: 13px;
  font-weight: 800;
}

.tb-panel-header p {
  margin: 4px 0 0;
  color: #687589;
  font-size: 10px;
}

.tb-panel-link {
  border: 0;
  background: transparent;
  color: #82a9ff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.tb-panel-link:hover {
  color: #aec7ff;
  text-decoration: underline;
}

.tb-two-column {
  display: grid;
  grid-template-columns:
    minmax(0, 1.2fr)
    minmax(0, 1fr);
  gap: 18px;
}

/* =========================================================
   ACTIVITY
========================================================= */

.tb-activity-list {
  padding: 4px 17px;
}

.tb-activity-row {
  min-height: 66px;
  display: flex;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid #1a222e;
}

.tb-activity-row:last-child {
  border-bottom: 0;
}

.tb-activity-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #151c27;
  color: #7c899c;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-activity-positive {
  background: #10271b;
  color: #48cf7b;
}

.tb-activity-negative {
  background: #291518;
  color: #ed7272;
}

.tb-activity-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tb-activity-main strong {
  color: #e5ebf2;
  font-size: 11px;
  font-weight: 800;
}

.tb-activity-main span {
  margin-top: 3px;
  font-size: 10px;
  color: #6e7b8f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-activity-amount {
  color: #dfe6ef;
  font-size: 11px;
  font-weight: 800;
}

/* =========================================================
   TRADE MINI
========================================================= */

.tb-trade-mini-list {
  padding: 4px 12px;
}

.tb-trade-mini {
  width: 100%;
  min-height: 65px;
  border: 0;
  border-bottom: 1px solid #1a222e;
  background: transparent;
  color: #e7edf5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  padding: 8px 5px;
}

.tb-trade-mini:last-child {
  border-bottom: 0;
}

.tb-trade-mini:hover {
  background: #121923;
}

.tb-trade-mini > div:first-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tb-trade-mini strong {
  color: #e6ebf2;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-trade-mini span {
  margin-top: 4px;
  font-size: 10px;
  color: #6d7a8e;
}

.tb-trade-mini-right {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

/* =========================================================
   STATUS
========================================================= */

.tb-status-ongoing,
.tb-status-success,
.tb-status-failed {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 25px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 9px;
  line-height: 1.2;
  font-weight: 800;
  white-space: normal;
  text-align: center;
}

.tb-status-ongoing {
  background: #2a2110;
  color: #e5b94e;
  border: 1px solid #493917;
}

.tb-status-success {
  background: #10271b;
  color: #45cf78;
  border: 1px solid #1e4a30;
}

.tb-status-failed {
  background: #2a1518;
  color: #ef7777;
  border: 1px solid #512328;
}

/* =========================================================
   ACTION BANNER
========================================================= */

.tb-action-banner {
  margin-top: 18px;
  background:
    linear-gradient(
      135deg,
      #111a28,
      #0e141e
    );
  border: 1px solid #1e2d43;
  border-radius: 13px;
  padding: 17px;
  display: flex;
  align-items: center;
  gap: 13px;
}

.tb-action-banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #17263c;
  color: #83aaff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-action-banner-content {
  flex: 1;
}

.tb-action-banner-content h3 {
  margin: 0;
  color: #e9eff7;
  font-size: 13px;
}

.tb-action-banner-content p {
  margin: 4px 0 0;
  color: #718096;
  font-size: 10px;
}

/* =========================================================
   BUTTONS
========================================================= */

.tb-primary-button,
.tb-secondary-button,
.tb-danger-button {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    opacity 0.12s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.tb-primary-button {
  border: 1px solid #3268d5;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #315fd0
    );
  color: #ffffff;
  box-shadow:
    0 7px 20px rgba(
      37,
      99,
      235,
      0.18
    );
}

.tb-primary-button:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.tb-secondary-button {
  border: 1px solid #2a3443;
  background: #111721;
  color: #a7b2c2;
}

.tb-secondary-button:hover {
  background: #171e29;
  border-color: #364254;
  color: #e1e7ef;
}

.tb-danger-button {
  border: 1px solid #4a2529;
  background: #211316;
  color: #e97979;
}

.tb-danger-button:hover {
  background: #2b171a;
}

.tb-primary-button:disabled,
.tb-secondary-button:disabled,
.tb-danger-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* =========================================================
   MEMBERS
========================================================= */

.tb-members-grid {
  padding: 17px;
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 11px;
}

.tb-member-card {
  min-height: 74px;
  border: 1px solid #202a38;
  border-radius: 11px;
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  background: #101620;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}

.tb-member-card:hover {
  border-color: #2b3b51;
  background: #131a25;
  transform: translateY(-1px);
}

.tb-member-current {
  border-color: #315ca5;
  background:
    linear-gradient(
      135deg,
      #14223a,
      #101923
    );
}

.tb-member-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  background:
    linear-gradient(
      145deg,
      #1d304f,
      #111a29
    );
  border: 1px solid #2a4268;
  color: #8eaff1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}

.tb-member-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tb-member-info strong {
  color: #e5ebf2;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-member-info span {
  margin-top: 3px;
  color: #6e7b8f;
  font-size: 9px;
}

.tb-you-badge {
  margin-left: auto;
  padding: 4px 7px;
  border-radius: 999px;
  background: #1b3157;
  color: #9bbcff;
  font-size: 8px;
  font-weight: 800;
}

/* =========================================================
   TABLE
========================================================= */

.tb-table-wrap {
  overflow-x: auto;
}

.tb-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.tb-table th {
  padding: 12px 17px;
  background: #101620;
  color: #6f7d91;
  text-align: left;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.tb-table td {
  padding: 14px 17px;
  border-top: 1px solid #1a222e;
  color: #8290a3;
  font-size: 10px;
}

.tb-table tbody tr:hover {
  background: #101720;
}

.tb-table-amount {
  font-weight: 800;
  color: #e1e7ef !important;
}

.tb-table-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #d9e1eb;
  font-weight: 800;
}

.tb-basic-status {
  display: inline-flex;
  align-items: center;
  min-height: 23px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: capitalize;
}

.tb-basic-approved {
  background: #10271b;
  color: #45c976;
}

.tb-basic-rejected {
  background: #2b1518;
  color: #ed7272;
}

.tb-basic-pending {
  background: #2a2110;
  color: #e3b74e;
}

/* =========================================================
   TRADES
========================================================= */

.tb-trades-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 15px;
}

.tb-trade-card {
  width: 100%;
  border: 1px solid #202a38;
  background:
    linear-gradient(
      145deg,
      #101721,
      #0c121a
    );
  border-radius: 13px;
  padding: 17px;
  text-align: left;
  color: #e8edf5;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.tb-trade-card:hover {
  border-color: #30435d;
  transform: translateY(-2px);
  box-shadow:
    0 14px 35px rgba(
      0,
      0,
      0,
      0.25
    );
}

.tb-trade-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tb-trade-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #172236;
  color: #7fa7ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-trade-card-name {
  margin-top: 14px;
  color: #edf2f8;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.25px;
}

.tb-trade-date {
  margin-top: 5px;
  color: #69778a;
  font-size: 10px;
}

.tb-trade-values {
  margin-top: 18px;
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 10px;
}

.tb-trade-values > div {
  padding: 11px;
  border-radius: 9px;
  background: #111822;
  border: 1px solid #1b2634;
}

.tb-trade-values span,
.tb-trade-contribution span {
  display: block;
  color: #738095;
  font-size: 9px;
}

.tb-trade-values strong {
  display: block;
  margin-top: 5px;
  color: #e1e8f1;
  font-size: 13px;
}

.tb-trade-contribution {
  margin-top: 11px;
  padding: 11px;
  border: 1px solid #202a38;
  border-radius: 9px;
  background: #0e151e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tb-trade-contribution strong {
  display: block;
  margin-top: 4px;
  color: #eef3f8;
  font-size: 12px;
}

.tb-trade-card-footer {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  color: #6e7b8d;
  font-size: 9px;
}

.tb-trade-card-footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* =========================================================
   EMPTY
========================================================= */

.tb-empty {
  padding: 35px 18px;
  text-align: center;
  color: #69778a;
  font-size: 11px;
}

.tb-empty-large {
  min-height: 250px;
  padding: 35px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #0d131c;
}

.tb-empty-large-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #151e2b;
  border: 1px solid #253144;
  color: #71829c;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-empty-large h3 {
  margin: 13px 0 0;
  color: #e3e9f1;
  font-size: 14px;
}

.tb-empty-large p {
  margin: 5px 0 15px;
  color: #69768a;
  font-size: 10px;
}

.tb-trades-loading {
  grid-column: 1 / -1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.tb-trades-loading h3 {
  margin: 13px 0 0;
  color: #e4eaf2;
  font-size: 13px;
}

.tb-trades-loading p {
  margin: 5px 0 0;
  color: #69768a;
  font-size: 10px;
}

/* =========================================================
   WITHDRAWALS
========================================================= */

.tb-withdrawal-list {
  padding: 5px 17px;
}

.tb-withdrawal-row {
  min-height: 80px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #1b2430;
}

.tb-withdrawal-row:last-child {
  border-bottom: 0;
}

.tb-withdrawal-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #281619;
  color: #e06e6e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-withdrawal-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tb-withdrawal-main strong {
  color: #e6ebf2;
  font-size: 12px;
}

.tb-withdrawal-main span {
  margin-top: 2px;
  font-size: 10px;
  color: #778497;
}

.tb-withdrawal-main small {
  margin-top: 3px;
  color: #626f81;
  font-size: 9px;
}

/* =========================================================
   ACCOUNT
========================================================= */

.tb-account-grid {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 17px;
}

.tb-account-list {
  padding: 4px 17px;
}

.tb-account-row {
  min-height: 58px;
  border-bottom: 1px solid #1b2430;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.tb-account-row:last-child {
  border-bottom: 0;
}

.tb-account-row span {
  color: #707d91;
  font-size: 10px;
}

.tb-account-row strong {
  color: #dce3ec;
  font-size: 11px;
  text-align: right;
}

.tb-account-id {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tb-account-security {
  margin-top: 17px;
  padding: 17px;
  border: 1px solid #1d2735;
  background:
    linear-gradient(
      135deg,
      #101721,
      #0d131c
    );
  border-radius: 13px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.tb-security-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #172235;
  color: #789eea;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-account-security h3 {
  margin: 1px 0 0;
  color: #e2e8f0;
  font-size: 12px;
}

.tb-account-security p {
  margin: 5px 0 0;
  color: #6e7b8e;
  font-size: 10px;
  line-height: 1.5;
}

.tb-danger-button {
  margin-top: 15px;
}

/* =========================================================
   MODAL
========================================================= */

.tb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(
    0,
    0,
    0,
    0.72
  );
  backdrop-filter: blur(7px);
  z-index: 100;
  padding: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-modal {
  width: min(
    760px,
    100%
  );
  max-height: calc(100vh - 50px);
  background: #0d131c;
  border: 1px solid #263142;
  border-radius: 15px;
  box-shadow:
    0 30px 100px rgba(
      0,
      0,
      0,
      0.55
    );
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tb-trade-modal {
  width: min(
    850px,
    100%
  );
}

.tb-withdrawal-modal {
  width: min(
    540px,
    100%
  );
}

.tb-modal-header {
  min-height: 75px;
  padding: 16px 19px;
  border-bottom: 1px solid #1d2633;
  background: #101620;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.tb-modal-eyebrow {
  color: #698ddd;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tb-modal-header h2 {
  margin: 4px 0 0;
  color: #f0f4f8;
  font-size: 17px;
  font-weight: 800;
}

.tb-close-button {
  width: 34px;
  height: 34px;
  border: 1px solid #293343;
  background: #151c27;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #8794a7;
}

.tb-close-button:hover {
  background: #1b2431;
  color: #e8edf4;
}

.tb-modal-body {
  padding: 18px;
  overflow-y: auto;
}

.tb-modal-footer {
  min-height: 66px;
  padding: 12px 18px;
  border-top: 1px solid #1d2633;
  background: #0f151e;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

/* =========================================================
   TRADE DETAILS
========================================================= */

.tb-trade-detail-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  color: #748195;
  font-size: 10px;
}

.tb-detail-grid {
  margin-top: 15px;
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tb-detail-card {
  padding: 13px;
  border: 1px solid #202a38;
  background: #101721;
  border-radius: 10px;
}

.tb-detail-card span {
  display: block;
  color: #748196;
  font-size: 9px;
}

.tb-detail-card strong {
  display: block;
  margin-top: 6px;
  color: #e3eaf2;
  font-size: 14px;
}

.tb-detail-highlight {
  background: #142038;
  border-color: #29436e;
}

.tb-info-box,
.tb-warning-box {
  margin-top: 14px;
  padding: 13px;
  border-radius: 10px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.tb-info-box {
  background: #10261b;
  border: 1px solid #1d4630;
  color: #4dca7a;
}

.tb-warning-box {
  background: #291918;
  border: 1px solid #4b2925;
  color: #e17b61;
}

.tb-info-box strong,
.tb-warning-box strong {
  display: block;
  font-size: 11px;
}

.tb-info-box p,
.tb-warning-box p {
  margin: 4px 0 0;
  font-size: 9px;
  line-height: 1.5;
  color: inherit;
  opacity: 0.82;
}

.tb-detail-section {
  margin-top: 20px;
}

.tb-detail-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 9px;
  color: #738095;
}

.tb-detail-section-title h3 {
  margin: 0;
  color: #dfe6ef;
  font-size: 12px;
}

.tb-detail-section-title p {
  margin: 3px 0 0;
  color: #69768a;
  font-size: 9px;
}

.tb-notes {
  padding: 12px;
  border: 1px solid #202a38;
  background: #101721;
  border-radius: 9px;
  color: #8a97aa;
  font-size: 10px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.tb-small-empty {
  padding: 15px;
  border: 1px dashed #2a3443;
  border-radius: 9px;
  color: #6d7a8d;
  font-size: 10px;
  text-align: center;
}

/* =========================================================
   FILES
========================================================= */

.tb-file-grid {
  display: grid;
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.tb-file-card {
  padding: 0;
  border: 1px solid #222c3a;
  background: #101721;
  color: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
}

.tb-file-card:hover {
  border-color: #34445b;
}

.tb-file-preview {
  height: 105px;
  background: #151c27;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #738198;
}

.tb-file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tb-file-info {
  padding: 9px;
  display: flex;
  flex-direction: column;
}

.tb-file-info strong {
  font-size: 9px;
  color: #dbe3ec;
}

.tb-file-info span {
  margin-top: 3px;
  color: #69768a;
  font-size: 8px;
}

/* =========================================================
   TIMELINE
========================================================= */

.tb-timeline {
  border-left: 1px solid #2a3442;
  margin-left: 8px;
  padding-left: 18px;
}

.tb-timeline-item {
  position: relative;
  padding-bottom: 17px;
}

.tb-timeline-item:last-child {
  padding-bottom: 0;
}

.tb-timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6387ca;
  box-shadow:
    0 0 8px rgba(
      99,
      135,
      202,
      0.35
    );
  position: absolute;
  left: -22px;
  top: 4px;
}

.tb-timeline-content p {
  margin: 0;
  color: #9aa6b7;
  font-size: 10px;
  line-height: 1.5;
}

.tb-timeline-content span {
  display: block;
  margin-top: 4px;
  color: #5e6b7d;
  font-size: 8px;
}

/* =========================================================
   FORM
========================================================= */

.tb-form-group {
  margin-top: 15px;
}

.tb-form-group label {
  display: block;
  margin-bottom: 6px;
  color: #8490a2;
  font-size: 10px;
  font-weight: 800;
}

.tb-form-group input,
.tb-form-group select,
.tb-form-group textarea {
  width: 100%;
  border: 1px solid #293342;
  background: #101721;
  border-radius: 9px;
  outline: none;
  color: #e3eaf2;
  font-family: inherit;
  font-size: 11px;
}

.tb-form-group input::placeholder,
.tb-form-group textarea::placeholder {
  color: #566376;
}

.tb-form-group input,
.tb-form-group select {
  height: 40px;
  padding: 0 11px;
}

.tb-form-group textarea {
  padding: 10px 11px;
  resize: vertical;
  line-height: 1.5;
}

.tb-form-group input:focus,
.tb-form-group select:focus,
.tb-form-group textarea:focus {
  border-color: #3b68ad;
  box-shadow:
    0 0 0 3px rgba(
      59,
      104,
      173,
      0.12
    );
}

.tb-input-money {
  display: flex;
  align-items: center;
  border: 1px solid #293342;
  background: #101721;
  border-radius: 9px;
  overflow: hidden;
}

.tb-input-money > span {
  height: 40px;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #151d29;
  color: #8794a7;
  font-size: 12px;
  font-weight: 800;
}

.tb-input-money input {
  border: 0;
  border-radius: 0;
}

.tb-form-message {
  margin-top: 12px;
  padding: 10px 11px;
  border-radius: 8px;
  background: #151d28;
  border: 1px solid #273344;
  color: #8c99ab;
  font-size: 10px;
}

/* =========================================================
   IMAGE VIEWER
========================================================= */

.tb-image-viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(
    0,
    0,
    0,
    0.9
  );
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
}

.tb-image-viewer img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow:
    0 25px 80px rgba(
      0,
      0,
      0,
      0.5
    );
}

.tb-image-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(
    255,
    255,
    255,
    0.18
  );
  background: rgba(
    255,
    255,
    255,
    0.08
  );
  color: #ffffff;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* =========================================================
   LOADING / ERROR
========================================================= */

.tb-loading-page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at center,
      #111b2b,
      #070a0f 55%
    );
  color: #f4f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
}

.tb-loading-card,
.tb-error-card {
  width: min(
    390px,
    100%
  );
  background: #0d131c;
  border: 1px solid #222d3d;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  box-shadow:
    0 25px 70px rgba(
      0,
      0,
      0,
      0.35
    );
}

.tb-logo-glow {
  width: 50px;
  height: 50px;
  margin: 0 auto;
  border-radius: 14px;
  background:
    linear-gradient(
      145deg,
      #2563eb,
      #4f46e5
    );
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 10px 35px rgba(
      37,
      99,
      235,
      0.25
    );
}

.tb-loading-card h2,
.tb-error-card h2 {
  margin: 16px 0 0;
  color: #edf2f8;
  font-size: 17px;
}

.tb-loading-card p,
.tb-error-card p {
  margin: 7px 0 0;
  color: #6e7b8e;
  font-size: 11px;
  line-height: 1.5;
}

.tb-error-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto;
  border-radius: 14px;
  background: #291518;
  border: 1px solid #4b2529;
  color: #e46f6f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tb-error-card .tb-primary-button {
  margin-top: 20px;
  width: 100%;
}

.tb-error-card .tb-secondary-button {
  margin-top: 8px;
  width: 100%;
}

.tb-spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #273142;
  border-top-color: #5f8fe9;
  animation: tb-spin 0.8s linear infinite;
  margin: 18px auto 0;
}

@keyframes tb-spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================================================
   MOBILE OVERLAY
========================================================= */

.tb-mobile-overlay {
  display: none;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1150px) {
  .tb-stat-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .tb-members-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .tb-sidebar {
    position: fixed;
    left: -270px;
    top: 0;
    bottom: 0;
    transition: left 0.2s ease;
    box-shadow:
      12px 0 40px rgba(
        0,
        0,
        0,
        0.35
      );
  }

  .tb-sidebar-open {
    left: 0;
  }

  .tb-mobile-menu {
    display: flex;
  }

  .tb-mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(
      0,
      0,
      0,
      0.55
    );
    z-index: 40;
  }

  .tb-two-column,
  .tb-account-grid {
    grid-template-columns:
      1fr;
  }

  .tb-trades-grid {
    grid-template-columns:
      1fr;
  }
}

@media (max-width: 650px) {
  .tb-header {
    height: 68px;
    padding: 0 15px;
  }

  .tb-header h1 {
    font-size: 17px;
  }

  .tb-header-right {
    display: none;
  }

  .tb-content {
    padding: 18px 13px 30px;
  }

  .tb-page-intro {
    align-items: flex-start;
  }

  .tb-page-intro h2 {
    font-size: 19px;
  }

  .tb-stat-grid {
    grid-template-columns:
      1fr 1fr;
    gap: 9px;
  }

  .tb-stat-card {
    min-height: 130px;
    padding: 13px;
  }

  .tb-stat-value {
    font-size: 17px;
  }

  .tb-stat-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 9px;
  }

  .tb-members-grid {
    grid-template-columns:
      1fr;
    padding: 12px;
  }

  .tb-action-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .tb-action-banner-content {
    min-width: calc(
      100% - 55px
    );
  }

  .tb-action-banner .tb-primary-button {
    width: 100%;
  }

  .tb-detail-grid {
    grid-template-columns:
      1fr;
  }

  .tb-file-grid {
    grid-template-columns:
      1fr 1fr;
  }

  .tb-modal-backdrop {
    padding: 10px;
  }

  .tb-modal {
    max-height: calc(
      100vh - 20px
    );
    border-radius: 12px;
  }

  .tb-modal-header {
    padding: 13px;
  }

  .tb-modal-body {
    padding: 13px;
  }

  .tb-modal-footer {
    padding: 10px 13px;
  }

  .tb-trade-values {
    grid-template-columns:
      1fr;
  }

  .tb-withdrawal-row {
    align-items: flex-start;
    padding: 13px 0;
  }
}

@media (max-width: 430px) {
  .tb-stat-grid {
    grid-template-columns:
      1fr;
  }

  .tb-file-grid {
    grid-template-columns:
      1fr;
  }

  .tb-trade-card {
    padding: 14px;
  }

  .tb-header-left > div:last-child p {
    display: none;
  }

  .tb-page-intro {
    flex-direction: column;
    align-items: flex-start;
  }

  .tb-intro-date,
  .tb-member-count,
  .tb-trade-summary {
    align-self: flex-start;
  }
}
`;