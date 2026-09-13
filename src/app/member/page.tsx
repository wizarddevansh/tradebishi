"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Section =
  | "overview"
  | "members"
  | "activity"
  | "trades"
  | "withdrawals"
  | "account";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Member = {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  investment_amount: number | null;
  profit_share: number | null;
  status: string | null;
  created_at: string;
};

type DirectoryMember = Member & {
  balance: number;
};

type Transaction = {
  id: string;
  member_id: string | null;
  member_name?: string;
  type: string;
  amount: number;
  description: string | null;
  status: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  member_id: string | null;
  amount: number;
  method: string;
  account_details: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
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
  is_closed: boolean;
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

const supabase = createClient();

function money(value: number | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function dateText(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateTimeText(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normal(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "TB"
  );
}

function statusLabel(
  status: Trade["status"],
  closed: boolean
) {
  if (closed) return "Closed";
  if (status === "successful") return "Profit";
  if (status === "failed") return "Money Returned";
  return "Ongoing";
}

function statusClass(
  status: Trade["status"],
  closed: boolean
) {
  if (closed) return "closed";
  if (status === "successful") return "success";
  if (status === "failed") return "returned";
  return "ongoing";
}

export default function MemberPage() {
  const router = useRouter();

  const [section, setSection] =
    useState<Section>("overview");

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [member, setMember] =
    useState<Member | null>(null);

  const [members, setMembers] =
    useState<DirectoryMember[]>([]);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [trades, setTrades] =
    useState<Trade[]>([]);

  const [tradeMembers, setTradeMembers] =
    useState<TradeMember[]>([]);

  const [tradeFiles, setTradeFiles] =
    useState<TradeFile[]>([]);

  const [tradeLogs, setTradeLogs] =
    useState<TradeLog[]>([]);

  const [selectedTrade, setSelectedTrade] =
    useState<Trade | null>(null);

  const [withdrawalOpen, setWithdrawalOpen] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [withdrawalMethod, setWithdrawalMethod] =
    useState("Bank Transfer");

  const [withdrawalDetails, setWithdrawalDetails] =
    useState("");

  const [withdrawalMessage, setWithdrawalMessage] =
    useState("");

  const [submittingWithdrawal, setSubmittingWithdrawal] =
    useState(false);

  const isTrader =
    normal(profile?.role) === "trader";

  const displayName =
    member?.full_name ||
    profile?.full_name ||
    (isTrader ? "Trader" : "Member");

  const loadData = useCallback(async () => {
    setError("");

    const {
      data: auth,
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !auth.user) {
      router.replace("/login");
      return;
    }

    const userId = auth.user.id;

    const [
      profileResult,
      memberResult,
      directoryResult,
      activityResponse,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("members")
        .select(
          "id, user_id, full_name, phone, investment_amount, profit_share, status, created_at"
        )
        .eq("user_id", userId)
        .maybeSingle(),

      fetch("/api/member/directory", {
        cache: "no-store",
      }),

      fetch("/api/member/activity", {
        cache: "no-store",
      }),
    ]);

    if (profileResult.data) {
      setProfile(profileResult.data as Profile);
    }

    if (memberResult.error) {
      console.error(
        "Member profile error:",
        memberResult.error
      );
    }

    if (memberResult.data) {
      setMember(memberResult.data as Member);
    }

    if (!directoryResult.ok) {
      let message =
        "Unable to load the member directory.";

      try {
        const raw =
          await directoryResult.text();

        try {
          const body = JSON.parse(raw);

          if (body?.error) {
            message = body.error;
          }
        } catch {
          if (raw.trim()) {
            message += ` ${raw
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 250)}`;
          }
        }
      } catch {}

      throw new Error(message);
    }

    const directoryContentType =
      directoryResult.headers.get(
        "content-type"
      ) || "";

    const directoryRaw =
      await directoryResult.text();

    if (
      !directoryContentType.includes(
        "application/json"
      )
    ) {
      throw new Error(
        `Member directory returned ${
          directoryContentType || "an unknown response"
        } instead of JSON. Please check src/app/api/member/directory/route.ts.`
      );
    }

    let directory: {
      members?: DirectoryMember[];
    };

    try {
      directory = JSON.parse(directoryRaw);
    } catch {
      throw new Error(
        "Member directory returned invalid JSON. Please check src/app/api/member/directory/route.ts."
      );
    }

    const loadedDirectory =
      (directory.members || []) as DirectoryMember[];

    setMembers(loadedDirectory);

    if (!activityResponse.ok) {
      let message =
        "Unable to load cooperative activity.";

      try {
        const raw =
          await activityResponse.text();

        try {
          const body = JSON.parse(raw);

          if (body?.error) {
            message = body.error;
          }
        } catch {
          if (raw.trim()) {
            message += ` ${raw
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 250)}`;
          }
        }
      } catch {}

      throw new Error(message);
    }

    const activityContentType =
      activityResponse.headers.get(
        "content-type"
      ) || "";

    const activityRaw =
      await activityResponse.text();

    if (
      !activityContentType.includes(
        "application/json"
      )
    ) {
      throw new Error(
        `Cooperative activity returned ${
          activityContentType || "an unknown response"
        } instead of JSON. Please check src/app/api/member/activity/route.ts.`
      );
    }

    let activityBody: {
      activity?: Transaction[];
    };

    try {
      activityBody =
        JSON.parse(activityRaw);
    } catch {
      throw new Error(
        "Cooperative activity returned invalid JSON. Please check src/app/api/member/activity/route.ts."
      );
    }

    setTransactions(
      (activityBody.activity || []) as Transaction[]
    );

    const currentMember =
      (memberResult.data || null) as Member | null;

    const [
      withdrawalResult,
      tradeResult,
    ] = await Promise.all([
      currentMember
        ? supabase
            .from("withdrawals")
            .select(
              "id, member_id, amount, method, account_details, status, reviewed_by, reviewed_at, created_at"
            )
            .eq(
              "member_id",
              currentMember.id
            )
            .order("created_at", {
              ascending: false,
            })
        : Promise.resolve({
            data: [],
            error: null,
          }),

      supabase
        .from("trades")
        .select(
          "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed"
        )
        .order("trade_date", {
          ascending: false,
        }),
    ]);

    if (withdrawalResult.error) {
      console.error(
        "Withdrawals error:",
        withdrawalResult.error
      );
    }

    if (tradeResult.error) {
      console.error(
        "Trades error:",
        tradeResult.error
      );
    }

    setWithdrawals(
      (withdrawalResult.data ||
        []) as Withdrawal[]
    );

    const loadedTrades =
      (tradeResult.data || []) as Trade[];

    setTrades(loadedTrades);

    if (currentMember) {
      /*
       * The RLS policy on trade_members already limits normal members
       * to their own participation rows.  Read the rows visible to the
       * authenticated user first, then match them to currentMember.id.
       * This makes the history independent of a second client-side
       * assumption about which member UUID the browser should filter.
       */
      const tradeMemberResult =
        await supabase
          .from("trade_members")
          .select(
            "id, trade_id, member_id, invested_amount, created_at"
          )
          .order("created_at", {
            ascending: true,
          });

      if (tradeMemberResult.error) {
        console.error(
          "Trade participation error:",
          tradeMemberResult.error
        );

        setTradeMembers([]);
      } else {
        const visibleParticipations =
          ((tradeMemberResult.data || []) as TradeMember[]).filter(
            (row) => row.member_id === currentMember.id
          );

        console.info(
          "TradeBishi trade participation loaded:",
          visibleParticipations.length,
          visibleParticipations
        );

        setTradeMembers(visibleParticipations);
      }
    } else {
      setTradeMembers([]);
    }

    const tradeIds =
      loadedTrades.map(
        (trade) => trade.id
      );

    if (tradeIds.length) {
      const [
        filesResult,
        logsResult,
      ] = await Promise.all([
        supabase
          .from("trade_files")
          .select(
            "id, trade_id, category, file_url, created_at"
          )
          .in("trade_id", tradeIds)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("trade_logs")
          .select(
            "id, trade_id, description, created_at"
          )
          .in("trade_id", tradeIds)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      setTradeFiles(
        (filesResult.data ||
          []) as TradeFile[]
      );

      setTradeLogs(
        (logsResult.data ||
          []) as TradeLog[]
      );
    } else {
      setTradeFiles([]);
      setTradeLogs([]);
    }

    if (
      !memberResult.data &&
      normal(profileResult.data?.role) !==
        "trader"
    ) {
      throw new Error(
        "Your account is authenticated, but no TradeBishi member profile is linked to it."
      );
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      try {
        await loadData();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load TradeBishi."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadData]);

  /*
   * IMPORTANT BALANCE RULE:
   *
   * investment_amount is NOT treated as available money.
   *
   * Deposits create available capital.
   * Trade returns add capital back.
   * Approved withdrawals reduce it.
   * Ongoing trade participation reduces available capital.
   */
  const currentCalculatedBalance =
    useMemo(() => {
      if (!member) return 0;

      const valid = (status: string) =>
        normal(status) !== "rejected";

      const approvedWithdrawal =
        (status: string) =>
          normal(status) === "approved" ||
          normal(status) === "completed";

      const deposits =
        transactions
          .filter(
            (t) =>
              t.member_id === member.id &&
              normal(t.type) ===
                "deposit" &&
              valid(t.status)
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          );

      const returns =
        transactions
          .filter(
            (t) =>
              t.member_id === member.id &&
              normal(t.type) ===
                "trade_return" &&
              valid(t.status)
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          );

      const memberWithdrawals =
        withdrawals
          .filter(
            (w) =>
              w.member_id === member.id &&
              approvedWithdrawal(w.status)
          )
          .reduce(
            (sum, w) =>
              sum +
              Number(w.amount || 0),
            0
          );

      const ongoingTradeIds =
        new Set(
          trades
            .filter(
              (trade) =>
                normal(
                  trade.status
                ) === "ongoing" &&
                !trade.is_closed
            )
            .map(
              (trade) => trade.id
            )
        );

      const ongoingCommitment =
        tradeMembers
          .filter(
            (tm) =>
              tm.member_id ===
                member.id &&
              ongoingTradeIds.has(
                tm.trade_id
              )
          )
          .reduce(
            (sum, tm) =>
              sum +
              Number(
                tm.invested_amount || 0
              ),
            0
          );

      return Math.max(
        0,
        deposits +
          returns -
          memberWithdrawals -
          ongoingCommitment
      );
    }, [
      member,
      transactions,
      withdrawals,
      trades,
      tradeMembers,
    ]);

  const correctedMembers =
    useMemo(
      () =>
        members.map((item) => ({
          ...item,

          balance:
            item.id === member?.id
              ? currentCalculatedBalance
              : Math.max(
                  0,
                  Number(
                    item.balance || 0
                  ) -
                    Number(
                      item.investment_amount ||
                        0
                    )
                ),
        })),
      [
        members,
        member?.id,
        currentCalculatedBalance,
      ]
    );

  const currentDirectoryMember =
    useMemo(
      () =>
        correctedMembers.find(
          (item) =>
            item.user_id ===
              profile?.id ||
            item.id === member?.id
        ) || null,
      [
        correctedMembers,
        profile?.id,
        member?.id,
      ]
    );

  const memberBalance =
    currentDirectoryMember?.balance || 0;

  const pendingWithdrawalAmount =
    useMemo(
      () =>
        withdrawals
          .filter(
            (w) =>
              normal(w.status) ===
              "pending"
          )
          .reduce(
            (sum, w) =>
              sum +
              Number(w.amount || 0),
            0
          ),
      [withdrawals]
    );

  // Cooperative balance is a GLOBAL figure.
  // Never replace one member's balance with the
  // currently logged-in member's calculated balance
  // when calculating the cooperative total.
  const cooperativeBalance =
    useMemo(
      () =>
        Math.max(
          0,
          members.reduce(
            (sum, item) =>
              sum +
              Math.max(
                0,
                Number(item.balance || 0)
              ),
            0
          )
        ),
      [members]
    );

  const currentTransactions =
    useMemo(
      () =>
        transactions.filter(
          (t) =>
            t.member_id ===
            member?.id
        ),
      [transactions, member?.id]
    );

  const participatingTrades =
    useMemo(
      () =>
        tradeMembers
          .map((tm) => ({
            trade:
              trades.find(
                (t) =>
                  t.id ===
                  tm.trade_id
              ) || null,

            contribution:
              Number(
                tm.invested_amount ||
                  0
              ),
          }))
          .filter(
            (
              item
            ): item is {
              trade: Trade;
              contribution: number;
            } => Boolean(item.trade)
          ),
      [tradeMembers, trades]
    );

  const ongoingTrades =
    useMemo(
      () =>
        participatingTrades.filter(
          ({ trade }) =>
            normal(
              trade.status
            ) === "ongoing" &&
            !trade.is_closed
        ),
      [participatingTrades]
    );

  // Closed trades remain visible in the member's
  // trade history, but are never treated as ongoing
  // capital commitments.
  const closedTrades =
    useMemo(
      () =>
        participatingTrades.filter(
          ({ trade }) =>
            Boolean(trade.is_closed) ||
            normal(trade.status) === "successful" ||
            normal(trade.status) === "failed"
        ),
      [participatingTrades]
    );

  const expectedProfit =
    useMemo(
      () =>
        ongoingTrades.reduce(
          (sum, item) => {
            const total =
              Number(
                item.trade
                  .invested_amount ||
                  0
              );

            const expected =
              Number(
                item.trade
                  .approx_return ||
                  0
              );

            const share =
              total > 0
                ? item.contribution /
                  total
                : 0;

            return (
              sum +
              Math.max(
                0,
                expected - total
              ) *
                share
            );
          },
          0
        ),
      [ongoingTrades]
    );

  const totalDeposits =
    useMemo(
      () =>
        currentTransactions
          .filter(
            (t) =>
              normal(t.type) ===
                "deposit" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          ),
      [currentTransactions]
    );

  const totalReturns =
    useMemo(
      () =>
        currentTransactions
          .filter(
            (t) =>
              normal(t.type) ===
                "trade_return" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          ),
      [currentTransactions]
    );

  const totalCooperativeDeposits =
    useMemo(
      () =>
        transactions
          .filter(
            (t) =>
              normal(t.type) ===
                "deposit" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          ),
      [transactions]
    );

  const totalCooperativeWithdrawals =
    useMemo(
      () =>
        transactions
          .filter(
            (t) =>
              normal(t.type) ===
                "withdrawal" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          ),
      [transactions]
    );

  const totalCooperativeOther =
    useMemo(
      () =>
        transactions
          .filter(
            (t) =>
              normal(t.type) ===
                "expense" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(t.amount || 0),
            0
          ),
      [transactions]
    );

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to refresh."
      );
    } finally {
      setRefreshing(false);
    }
  };

  const go = (next: Section) => {
    setSection(next);
    setMobileOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const submitWithdrawal = async () => {
    if (!member) return;

    const amount =
      Number(withdrawalAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setWithdrawalMessage(
        "Enter a valid withdrawal amount."
      );
      return;
    }

    if (amount > memberBalance) {
      setWithdrawalMessage(
        "Withdrawal cannot exceed your available member balance."
      );
      return;
    }

    if (!withdrawalDetails.trim()) {
      setWithdrawalMessage(
        "Enter your bank / UPI details."
      );
      return;
    }

    setSubmittingWithdrawal(true);
    setWithdrawalMessage("");

    const {
      error: insertError,
    } = await supabase
      .from("withdrawals")
      .insert({
        member_id: member.id,
        amount,
        method: withdrawalMethod,
        account_details:
          withdrawalDetails.trim(),
        status: "pending",
      });

    if (insertError) {
      setWithdrawalMessage(
        insertError.message
      );
      setSubmittingWithdrawal(false);
      return;
    }

    setWithdrawalMessage(
      "Withdrawal request submitted."
    );

    setWithdrawalAmount("");
    setWithdrawalDetails("");

    await loadData();

    setSubmittingWithdrawal(false);
  };

  if (loading) {
    return (
      <main className="tb-loading">
        <div className="tb-loading-card">
          <div className="tb-logo">
            TB
          </div>

          <div className="tb-spinner" />

          <strong>
            Loading TradeBishi
          </strong>

          <span>
            Preparing your cooperative
            dashboard…
          </span>
        </div>

        <style jsx global>
          {styles}
        </style>
      </main>
    );
  }

  if (
    error &&
    !member &&
    !isTrader
  ) {
    return (
      <main className="tb-loading">
        <div className="tb-error-card">
          <div className="tb-logo">
            TB
          </div>

          <span className="tb-kicker">
            TradeBishi
          </span>

          <h1>
            We couldn't load your
            dashboard
          </h1>

          <p>{error}</p>

          <button
            className="tb-primary"
            onClick={refresh}
          >
            Try Again
          </button>
        </div>

        <style jsx global>
          {styles}
        </style>
      </main>
    );
  }

  const title =
    section === "overview"
      ? "Overview"
      : section === "members"
      ? "Members"
      : section === "activity"
      ? "Cooperative Activity"
      : section === "trades"
      ? "Trades"
      : section === "withdrawals"
      ? "Withdrawals"
      : "Account";

  return (
    <div className="tb-shell">
      <style jsx global>
        {styles}
      </style>

      <aside
        className={`tb-sidebar ${
          mobileOpen ? "open" : ""
        }`}
      >
        <div className="tb-brand">
          <div className="tb-logo">
            TB
          </div>

          <div>
            <strong>
              TradeBishi
            </strong>

            <span>
              Cooperative Trading
            </span>
          </div>
        </div>

        <div className="tb-nav-label">
          Workspace
        </div>

        <nav className="tb-nav">
          <NavButton
            active={
              section === "overview"
            }
            icon={
              <LayoutDashboard
                size={16}
              />
            }
            label="Overview"
            onClick={() =>
              go("overview")
            }
          />

          {!isTrader && (
            <NavButton
              active={
                section === "members"
              }
              icon={
                <Users size={16} />
              }
              label="Members"
              onClick={() =>
                go("members")
              }
            />
          )}

          {!isTrader && (
            <NavButton
              active={
                section === "activity"
              }
              icon={
                <Activity size={16} />
              }
              label="Cooperative Activity"
              onClick={() =>
                go("activity")
              }
            />
          )}

          <NavButton
            active={
              section === "trades"
            }
            icon={
              <TrendingUp
                size={16}
              />
            }
            label="Trades"
            onClick={() =>
              go("trades")
            }
          />

          {!isTrader && (
            <NavButton
              active={
                section ===
                "withdrawals"
              }
              icon={
                <Wallet size={16} />
              }
              label="Withdrawals"
              onClick={() =>
                go("withdrawals")
              }
            />
          )}
        </nav>

        <div className="tb-nav-label account">
          Account
        </div>

        <nav className="tb-nav">
          <NavButton
            active={
              section === "account"
            }
            icon={
              <User size={16} />
            }
            label="Profile"
            onClick={() =>
              go("account")
            }
          />

          <button
            className="tb-nav-button"
            onClick={signOut}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </nav>

        <div className="tb-sidebar-footer">
          <div className="tb-avatar">
            {initials(displayName)}
          </div>

          <div>
            <strong>
              {displayName}
            </strong>

            <span>
              {isTrader
                ? "Trader"
                : "Member"}
            </span>
          </div>
        </div>
      </aside>

      <div className="tb-main">
        <header className="tb-topbar">
          <div className="tb-top-left">
            <button
              className="tb-menu"
              onClick={() =>
                setMobileOpen(
                  (value) => !value
                )
              }
            >
              <Menu size={18} />
            </button>

            <span>
              TradeBishi
            </span>

            <ChevronRight
              size={13}
            />

            <strong>
              {title}
            </strong>
          </div>

          <div className="tb-top-right">
            <button
              className="tb-icon"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "spin"
                    : ""
                }
              />
            </button>

            <div className="tb-icon">
              <Bell size={15} />
            </div>

            <button
              className="tb-user"
              onClick={() =>
                go("account")
              }
            >
              <span className="tb-mini-avatar">
                {initials(
                  displayName
                )}
              </span>

              <span>
                {displayName}
              </span>
            </button>
          </div>
        </header>

        <main className="tb-content">
          {error && (
            <div className="tb-alert">
              <XCircle
                size={17}
              />

              <span>{error}</span>

              <button
                onClick={() =>
                  setError("")
                }
              >
                <X size={15} />
              </button>
            </div>
          )}

          {section ===
            "overview" && (
            <>
              <PageHeading
                eyebrow={
                  isTrader
                    ? "Trader Dashboard"
                    : "Member Dashboard"
                }
                title={
                  <>
                    Good to see you,
                    <br />
                    {displayName}.
                  </>
                }
                subtitle="A clear view of your cooperative capital, trades and activity."
                action={
                  <button
                    className="tb-secondary"
                    onClick={refresh}
                  >
                    <RefreshCw
                      size={14}
                      className={
                        refreshing
                          ? "spin"
                          : ""
                      }
                    />
                    Refresh
                  </button>
                }
              />

              {!isTrader && (
                <div className="tb-stat-grid">
                  <Stat
                    label="Available Balance"
                    value={money(
                      memberBalance
                    )}
                    icon={
                      <Wallet size={17} />
                    }
                    highlight
                    hint="Your personal available capital"
                  />

                  <Stat
                    label="Cooperative Balance"
                    value={money(
                      cooperativeBalance
                    )}
                    icon={
                      <CircleDollarSign
                        size={17}
                      />
                    }
                    hint="Available across the cooperative"
                  />

                  <Stat
                    label="Active Trades"
                    value={String(
                      ongoingTrades.length
                    )}
                    icon={
                      <Clock3 size={17} />
                    }
                    hint="Your ongoing positions"
                  />

                  <Stat
                    label="Expected Profit"
                    value={money(
                      expectedProfit
                    )}
                    icon={
                      <BarChart3
                        size={17}
                      />
                    }
                    hint="From your ongoing trades"
                  />
                </div>
              )}

              <div className="tb-two-col">
                <section className="tb-panel hero-panel">
                  <div className="tb-panel-top">
                    <div>
                      <span className="tb-kicker">
                        Your capital
                      </span>

                      <h2>
                        {money(
                          memberBalance
                        )}
                      </h2>
                    </div>

                    <div className="tb-big-icon">
                      <Wallet size={22} />
                    </div>
                  </div>

                  <p>
                    Your available balance
                    is based on recorded
                    deposits and returned
                    trade capital, less
                    approved withdrawals
                    and capital currently
                    committed to ongoing
                    trades.
                  </p>

                  <div className="tb-mini-grid">
                    <MiniMetric
                      label="Deposited"
                      value={money(
                        totalDeposits
                      )}
                    />

                    <MiniMetric
                      label="Trade returns"
                      value={money(
                        totalReturns
                      )}
                    />

                    <MiniMetric
                      label="Pending withdrawal"
                      value={money(
                        pendingWithdrawalAmount
                      )}
                    />
                  </div>
                </section>

                <section className="tb-panel">
                  <div className="tb-panel-heading">
                    <div>
                      <span className="tb-kicker">
                        Live positions
                      </span>

                      <h2>
                        Ongoing trades
                      </h2>
                    </div>

                    <TrendingUp
                      size={18}
                    />
                  </div>

                  {ongoingTrades.length ===
                  0 ? (
                    <Empty
                      icon={
                        <TrendingUp
                          size={22}
                        />
                      }
                      title="No ongoing participation"
                      text="When you participate in a live trade, it will appear here."
                    />
                  ) : (
                    <div className="tb-list">
                      {ongoingTrades
                        .slice(0, 4)
                        .map(
                          ({
                            trade,
                            contribution,
                          }) => (
                            <TradeRow
                              key={
                                trade.id
                              }
                              trade={
                                trade
                              }
                              contribution={
                                contribution
                              }
                              onClick={() =>
                                setSelectedTrade(
                                  trade
                                )
                              }
                            />
                          )
                        )}
                    </div>
                  )}
                </section>
              </div>

              {!isTrader &&
                closedTrades.length > 0 && (
                  <section
                    className="tb-panel"
                    style={{ marginTop: 18 }}
                  >
                    <div className="tb-panel-heading">
                      <div>
                        <span className="tb-kicker">
                          Completed trades
                        </span>
                        <h2>Closed trade history</h2>
                      </div>
                      <CheckCircle2 size={18} />
                    </div>

                    <div className="tb-list">
                      {closedTrades.map(
                        ({ trade, contribution }) => (
                          <TradeRow
                            key={trade.id}
                            trade={trade}
                            contribution={contribution}
                            onClick={() =>
                              setSelectedTrade(trade)
                            }
                          />
                        )
                      )}
                    </div>
                  </section>
                )}

              {!isTrader && (
                <div className="tb-quick-grid">
                  <button
                    className="tb-quick"
                    onClick={() =>
                      go("members")
                    }
                  >
                    <Users size={18} />

                    <span>
                      <strong>
                        Members
                      </strong>

                      <small>
                        {
                          correctedMembers.length
                        }{" "}
                        registered
                        members
                      </small>
                    </span>

                    <ChevronRight
                      size={16}
                    />
                  </button>

                  <button
                    className="tb-quick"
                    onClick={() =>
                      go("activity")
                    }
                  >
                    <Activity
                      size={18}
                    />

                    <span>
                      <strong>
                        Cooperative
                        activity
                      </strong>

                      <small>
                        Complete activity
                        of the cooperative
                      </small>
                    </span>

                    <ChevronRight
                      size={16}
                    />
                  </button>

                  <button
                    className="tb-quick"
                    onClick={() =>
                      go("withdrawals")
                    }
                  >
                    <ArrowUpRight
                      size={18}
                    />

                    <span>
                      <strong>
                        Request
                        withdrawal
                      </strong>

                      <small>
                        Available{" "}
                        {money(
                          memberBalance
                        )}
                      </small>
                    </span>

                    <ChevronRight
                      size={16}
                    />
                  </button>
                </div>
              )}
            </>
          )}

          {section ===
            "members" &&
            !isTrader && (
              <>
                <PageHeading
                  eyebrow="Cooperative"
                  title="Members"
                  subtitle="Every member, their current available balance and cooperative standing in one clean directory."
                />

                <div className="tb-stat-grid">
                  <Stat
                    label="Members"
                    value={String(
                      correctedMembers.length
                    )}
                    icon={
                      <Users size={17} />
                    }
                    hint="Registered cooperative members"
                  />

                  <Stat
                    label="Your balance"
                    value={money(
                      memberBalance
                    )}
                    icon={
                      <Wallet size={17} />
                    }
                    highlight
                    hint="Your individual available capital"
                  />

                  <Stat
                    label="Cooperative balance"
                    value={money(
                      cooperativeBalance
                    )}
                    icon={
                      <CircleDollarSign
                        size={17}
                      />
                    }
                    hint="Total available cooperative capital"
                  />

                  <Stat
                    label="Active trades"
                    value={String(
                      ongoingTrades.length
                    )}
                    icon={
                      <TrendingUp
                        size={17}
                      />
                    }
                    hint="Your active participation"
                  />
                </div>

                <section className="tb-panel">
                  <div className="tb-panel-heading">
                    <div>
                      <span className="tb-kicker">
                        Member directory
                      </span>

                      <h2>
                        Individual balances
                      </h2>
                    </div>

                    <Users size={18} />
                  </div>

                  {correctedMembers.length ===
                  0 ? (
                    <Empty
                      icon={
                        <Users
                          size={24}
                        />
                      }
                      title="No members found"
                      text="No member records were returned by TradeBishi."
                    />
                  ) : (
                    <div className="tb-member-table">
                      <div className="tb-member-head">
                        <span>
                          Member
                        </span>

                        <span>
                          Status
                        </span>

                        <span>
                          Available
                          balance
                        </span>
                      </div>

                      {correctedMembers.map(
                        (item) => (
                          <div
                            className={`tb-member-row ${
                              item.id ===
                              member?.id
                                ? "current"
                                : ""
                            }`}
                            key={
                              item.id
                            }
                          >
                            <div className="tb-member-person">
                              <div className="tb-avatar large">
                                {initials(
                                  item.full_name
                                )}
                              </div>

                              <div>
                                <strong>
                                  {
                                    item.full_name
                                  }
                                </strong>

                                <span>
                                  {item.id ===
                                  member?.id
                                    ? "You"
                                    : "Cooperative Member"}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`tb-pill ${
                                normal(
                                  item.status
                                ) ===
                                "active"
                                  ? "green"
                                  : "gray"
                              }`}
                            >
                              {item.status ||
                                "—"}
                            </span>

                            <strong className="tb-member-money">
                              {money(
                                item.balance
                              )}
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>

                <div className="tb-note">
                  <ShieldCheck
                    size={18}
                  />

                  <div>
                    <strong>
                      Balance clarity
                    </strong>

                    <p>
                      The dashboard does
                      not use{" "}
                      <code>
                        investment_amount
                      </code>{" "}
                      as spendable
                      balance. Recorded
                      deposits and trade
                      returns are the
                      source of available
                      member capital.
                    </p>
                  </div>
                </div>
              </>
            )}

          {section ===
            "activity" &&
            !isTrader && (
              <>
                <PageHeading
                  eyebrow="Cooperative"
                  title="Cooperative Activity"
                  subtitle="A complete read-only ledger of activity across the entire cooperative."
                />

                <div className="tb-stat-grid">
                  <Stat
                    label="Total deposits"
                    value={money(
                      totalCooperativeDeposits
                    )}
                    icon={
                      <ArrowDownLeft
                        size={17}
                      />
                    }
                    hint="Deposits recorded across all members"
                  />

                  <Stat
                    label="Withdrawals"
                    value={money(
                      totalCooperativeWithdrawals
                    )}
                    icon={
                      <ArrowUpRight
                        size={17}
                      />
                    }
                    hint="Withdrawal activity across the cooperative"
                  />

                  <Stat
                    label="Other activity"
                    value={money(
                      totalCooperativeOther
                    )}
                    icon={
                      <Activity size={17} />
                    }
                    hint="Other cooperative activity"
                  />

                  <Stat
                    label="Cooperative balance"
                    value={money(
                      cooperativeBalance
                    )}
                    icon={
                      <CircleDollarSign
                        size={17}
                      />
                    }
                    highlight
                    hint="Current available cooperative capital"
                  />
                </div>

                <section className="tb-panel">
                  <div className="tb-panel-heading">
                    <div>
                      <span className="tb-kicker">
                        Shared cooperative
                        ledger
                      </span>

                      <h2>
                        Complete activity
                      </h2>
                    </div>

                    <Activity
                      size={18}
                    />
                  </div>

                  <div className="tb-note activity-readonly-note">
                    <ShieldCheck
                      size={18}
                    />

                    <div>
                      <strong>
                        Read-only cooperative
                        activity
                      </strong>

                      <p>
                        This is the same
                        cooperative activity
                        recorded by Admin.
                        Members can view
                        every person's
                        activity, but cannot
                        add, edit or delete
                        any activity.
                      </p>
                    </div>
                  </div>

                  <div
                    className="tb-activity-list"
                    style={{
                      marginTop: 14,
                    }}
                  >
                    {transactions.length ===
                    0 ? (
                      <Empty
                        icon={
                          <Activity
                            size={22}
                          />
                        }
                        title="No activity"
                        text="No cooperative activity has been recorded yet."
                      />
                    ) : (
                      <div className="tb-list">
                        {transactions.map(
                          (item) => {
                            const type =
                              normal(
                                item.type
                              );

                            const activityTitle =
                              type ===
                              "deposit"
                                ? "Deposit"
                                : type ===
                                  "withdrawal"
                                ? "Withdrawal"
                                : type ===
                                  "expense"
                                ? "Other"
                                : type ===
                                  "trade_return"
                                ? "Trade Return"
                                : type ===
                                  "service_fee"
                                ? "TradeBishi Development and Service Fee"
                                : item.type;

                            const person =
                              item.member_name ||
                              (item.member_id
                                ? "Member"
                                : "Cooperative");

                            return (
                              <div
                                className="tb-activity-row"
                                key={
                                  item.id
                                }
                              >
                                <div className="tb-activity-icon">
                                  {type ===
                                  "deposit" ? (
                                    <ArrowDownLeft
                                      size={
                                        17
                                      }
                                    />
                                  ) : type ===
                                    "withdrawal" ? (
                                    <ArrowUpRight
                                      size={
                                        17
                                      }
                                    />
                                  ) : (
                                    <Activity
                                      size={
                                        17
                                      }
                                    />
                                  )}
                                </div>

                                <div className="tb-grow">
                                  <strong>
                                    {
                                      activityTitle
                                    }
                                  </strong>

                                  <span>
                                    {person}
                                    {" • "}
                                    {item.description ||
                                      "Cooperative activity"}
                                  </span>
                                </div>

                                <strong>
                                  {money(
                                    item.amount
                                  )}
                                </strong>

                                <span className="tb-date">
                                  {dateTimeText(
                                    item.created_at
                                  )}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

          {section ===
            "trades" && (
            <>
              <PageHeading
                eyebrow="Trading"
                title="Your Trades"
                subtitle="See your actual participation, expected return and trade status."
              />

              <section className="tb-panel tb-trade-portfolio-panel">
                <div className="tb-panel-heading">
                  <div>
                    <span className="tb-kicker">
                      Live portfolio
                    </span>

                    <h2>
                      Ongoing trades
                    </h2>
                  </div>

                  <TrendingUp
                    size={18}
                  />
                </div>

                {ongoingTrades.length ===
                0 ? (
                  <Empty
                    icon={
                      <TrendingUp
                        size={22}
                      />
                    }
                    title="No ongoing trades"
                    text="When you participate in a live trade, it will appear here."
                  />
                ) : (
                  <div className="tb-trade-grid">
                    {ongoingTrades.map(
                      ({
                        trade,
                        contribution,
                      }) => (
                        <TradeCard
                          key={trade.id}
                          trade={trade}
                          contribution={contribution}
                          onClick={() =>
                            setSelectedTrade(trade)
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>

              <section className="tb-panel tb-trade-history-panel">
                <div className="tb-panel-heading">
                  <div>
                    <span className="tb-kicker">
                      Permanent record
                    </span>

                    <h2>
                      Trade history
                    </h2>
                  </div>

                  <FileText size={18} />
                </div>

                <p className="tb-section-description">
                  Every trade you participated in remains here after closure, preserving the trade date, your contribution, expected return and final trade status as a historical record.
                </p>

                {closedTrades.length ===
                0 ? (
                  <Empty
                    icon={
                      <FileText size={22} />
                    }
                    title="No closed trades yet"
                    text="Completed trades will automatically move into this permanent history."
                  />
                ) : (
                  <div className="tb-trade-history-list">
                    {closedTrades.map(
                      ({
                        trade,
                        contribution,
                      }) => (
                        <TradeHistoryRow
                          key={trade.id}
                          trade={trade}
                          contribution={contribution}
                          onClick={() =>
                            setSelectedTrade(trade)
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {section ===
            "withdrawals" &&
            !isTrader && (
              <>
                <PageHeading
                  eyebrow="Capital"
                  title="Withdrawals"
                  subtitle="Request a withdrawal from your available member balance and track its status."
                  action={
                    <button
                      className="tb-primary"
                      onClick={() => {
                        setWithdrawalMessage(
                          ""
                        );
                        setWithdrawalOpen(
                          true
                        );
                      }}
                    >
                      Request withdrawal
                      <ArrowUpRight
                        size={14}
                      />
                    </button>
                  }
                />

                <div className="tb-stat-grid">
                  <Stat
                    label="Available"
                    value={money(
                      memberBalance
                    )}
                    icon={
                      <Wallet size={17} />
                    }
                    highlight
                  />

                  <Stat
                    label="Pending"
                    value={money(
                      pendingWithdrawalAmount
                    )}
                    icon={
                      <Clock3 size={17} />
                    }
                  />

                  <Stat
                    label="Requests"
                    value={String(
                      withdrawals.length
                    )}
                    icon={
                      <FileText
                        size={17}
                      />
                    }
                  />
                </div>

                <section className="tb-panel">
                  <div className="tb-panel-heading">
                    <div>
                      <span className="tb-kicker">
                        Withdrawal history
                      </span>

                      <h2>
                        Your requests
                      </h2>
                    </div>

                    <Wallet size={18} />
                  </div>

                  {withdrawals.length ===
                  0 ? (
                    <Empty
                      icon={
                        <Wallet
                          size={22}
                        />
                      }
                      title="No withdrawal requests"
                      text="Your withdrawal requests will appear here."
                    />
                  ) : (
                    <div className="tb-list">
                      {withdrawals.map(
                        (item) => (
                          <div
                            className="tb-activity-row"
                            key={
                              item.id
                            }
                          >
                            <div className="tb-activity-icon">
                              <ArrowUpRight
                                size={
                                  17
                                }
                              />
                            </div>

                            <div className="tb-grow">
                              <strong>
                                {money(
                                  item.amount
                                )}
                              </strong>

                              <span>
                                {
                                  item.method
                                }{" "}
                                ·{" "}
                                {dateTimeText(
                                  item.created_at
                                )}
                              </span>
                            </div>

                            <span
                              className={`tb-pill ${
                                normal(
                                  item.status
                                ) ===
                                "pending"
                                  ? "yellow"
                                  : normal(
                                      item.status
                                    ) ===
                                      "approved" ||
                                    normal(
                                      item.status
                                    ) ===
                                      "completed"
                                  ? "green"
                                  : "red"
                              }`}
                            >
                              {
                                item.status
                              }
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
              </>
            )}

          {section ===
            "account" && (
            <>
              <PageHeading
                eyebrow="Account"
                title="Profile"
                subtitle="Your TradeBishi account information."
              />

              <section className="tb-profile-card">
                <div className="tb-avatar huge">
                  {initials(
                    displayName
                  )}
                </div>

                <div>
                  <span className="tb-kicker">
                    Account holder
                  </span>

                  <h2>
                    {displayName}
                  </h2>

                  <p>
                    {isTrader
                      ? "Trader"
                      : "Member"}
                  </p>
                </div>

                <div className="tb-profile-id">
                  <span>
                    User ID
                  </span>

                  <code>
                    {profile?.id ||
                      member?.user_id ||
                      "—"}
                  </code>
                </div>
              </section>

              {!isTrader && (
                <div className="tb-note">
                  <ShieldCheck
                    size={18}
                  />

                  <div>
                    <strong>
                      TradeBishi account
                    </strong>

                    <p>
                      Your member identity
                      is linked through the{" "}
                      <code>
                        members.user_id
                      </code>{" "}
                      relationship.
                    </p>
                  </div>
                </div>
              )}

              <button
                className="tb-danger"
                onClick={signOut}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          )}
        </main>

        <footer className="tb-footer">
          TradeBishi · All rights reserved
        </footer>
      </div>

      {selectedTrade && (
        <div
          className="tb-modal-backdrop"
          onMouseDown={() =>
            setSelectedTrade(null)
          }
        >
          <div
            className="tb-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="tb-modal-head">
              <div>
                <span className="tb-kicker">
                  Trade details
                </span>

                <h2>
                  {
                    selectedTrade.trade_name
                  }
                </h2>
              </div>

              <button
                className="tb-close"
                onClick={() =>
                  setSelectedTrade(
                    null
                  )
                }
              >
                <X size={17} />
              </button>
            </div>

            <div className="tb-trade-status-line">
              <span
                className={`tb-pill ${statusClass(
                  selectedTrade.status,
                  selectedTrade.is_closed
                )}`}
              >
                {statusLabel(
                  selectedTrade.status,
                  selectedTrade.is_closed
                )}
              </span>

              <span>
                {dateText(
                  selectedTrade.trade_date
                )}
              </span>
            </div>

            <div className="tb-modal-grid">
              <MiniMetric
                label="Trade investment"
                value={money(
                  selectedTrade.invested_amount
                )}
              />

              <MiniMetric
                label="Return expected"
                value={money(
                  selectedTrade.approx_return
                )}
              />

              <MiniMetric
                label="Your participation"
                value={money(
                  tradeMembers.find(
                    (item) =>
                      item.trade_id ===
                      selectedTrade.id
                  )?.invested_amount ||
                    0
                )}
              />
            </div>

            {selectedTrade.notes && (
              <div className="tb-modal-section">
                <span className="tb-kicker">
                  Notes
                </span>

                <p>
                  {
                    selectedTrade.notes
                  }
                </p>
              </div>
            )}

            <div className="tb-modal-section">
              <span className="tb-kicker">
                Latest log
              </span>

              {tradeLogs
                .filter(
                  (log) =>
                    log.trade_id ===
                    selectedTrade.id
                )
                .slice(0, 5)
                .map((log) => (
                  <div
                    className="tb-log"
                    key={log.id}
                  >
                    <strong>
                      {
                        log.description
                      }
                    </strong>

                    <span>
                      {dateTimeText(
                        log.created_at
                      )}
                    </span>
                  </div>
                ))}

              {tradeLogs.filter(
                (log) =>
                  log.trade_id ===
                  selectedTrade.id
              ).length === 0 && (
                <p className="tb-muted">
                  No trade log available.
                </p>
              )}
            </div>

            {tradeFiles.filter(
              (file) =>
                file.trade_id ===
                selectedTrade.id
            ).length > 0 && (
              <div className="tb-modal-section">
                <span className="tb-kicker">
                  Documents
                </span>

                {tradeFiles
                  .filter(
                    (file) =>
                      file.trade_id ===
                      selectedTrade.id
                  )
                  .map((file) => (
                    <a
                      className="tb-file"
                      key={file.id}
                      href={
                        file.file_url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      <FileText
                        size={16}
                      />

                      <span>
                        {
                          file.category
                        }
                      </span>

                      <ChevronRight
                        size={14}
                      />
                    </a>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {withdrawalOpen && (
        <div
          className="tb-modal-backdrop"
          onMouseDown={() =>
            !submittingWithdrawal &&
            setWithdrawalOpen(false)
          }
        >
          <div
            className="tb-modal small"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="tb-modal-head">
              <div>
                <span className="tb-kicker">
                  Capital request
                </span>

                <h2>
                  Request withdrawal
                </h2>
              </div>

              <button
                className="tb-close"
                onClick={() =>
                  setWithdrawalOpen(
                    false
                  )
                }
                disabled={
                  submittingWithdrawal
                }
              >
                <X size={17} />
              </button>
            </div>

            <div className="tb-balance-banner">
              <span>
                Available balance
              </span>

              <strong>
                {money(
                  memberBalance
                )}
              </strong>
            </div>

            <label className="tb-label">
              Amount

              <input
                className="tb-input"
                type="number"
                min="1"
                step="0.01"
                value={
                  withdrawalAmount
                }
                onChange={(event) =>
                  setWithdrawalAmount(
                    event.target.value
                  )
                }
                placeholder="₹0"
              />
            </label>

            <label className="tb-label">
              Method

              <select
                className="tb-input"
                value={
                  withdrawalMethod
                }
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
            </label>

            <label className="tb-label">
              Account details

              <textarea
                className="tb-input"
                rows={4}
                value={
                  withdrawalDetails
                }
                onChange={(event) =>
                  setWithdrawalDetails(
                    event.target.value
                  )
                }
                placeholder="Bank account / UPI details"
              />
            </label>

            {withdrawalMessage && (
              <div
                className={`tb-form-message ${
                  withdrawalMessage.includes(
                    "submitted"
                  )
                    ? "success"
                    : "error"
                }`}
              >
                {withdrawalMessage.includes(
                  "submitted"
                ) ? (
                  <CheckCircle2
                    size={16}
                  />
                ) : (
                  <XCircle size={16} />
                )}

                {
                  withdrawalMessage
                }
              </div>
            )}

            <button
              className="tb-primary wide"
              onClick={
                submitWithdrawal
              }
              disabled={
                submittingWithdrawal
              }
            >
              {submittingWithdrawal
                ? "Submitting…"
                : "Submit request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`tb-nav-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="tb-heading">
      <div>
        <span className="tb-kicker">
          {eyebrow}
        </span>

        <h1>{title}</h1>

        <p>{subtitle}</p>
      </div>

      {action}
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`tb-stat ${
        highlight ? "highlight" : ""
      }`}
    >
      <div className="tb-stat-top">
        <span>{label}</span>

        <div>{icon}</div>
      </div>

      <strong>{value}</strong>

      {hint && (
        <small>{hint}</small>
      )}
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="tb-mini-metric">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="tb-empty">
      <div>{icon}</div>

      <strong>{title}</strong>

      <span>{text}</span>
    </div>
  );
}

function TradeCard({
  trade,
  contribution,
  onClick,
}: {
  trade: Trade;
  contribution: number;
  onClick: () => void;
}) {
  const total = Number(trade.invested_amount || 0);
  const expectedReturn = Number(trade.approx_return || 0) *
    (total > 0 ? contribution / total : 0);
  const expectedProfit = Math.max(0, Number(trade.approx_return || 0) - total) *
    (total > 0 ? contribution / total : 0);

  return (
    <button className="tb-trade-card" onClick={onClick}>
      <div className="tb-trade-top">
        <span className={`tb-pill ${statusClass(trade.status, trade.is_closed)}`}>
          {statusLabel(trade.status, trade.is_closed)}
        </span>
        <span>{dateText(trade.trade_date)}</span>
      </div>
      <h3>{trade.trade_name}</h3>
      <div className="tb-trade-metrics">
        <MiniMetric label="Your participation" value={money(contribution)} />
        <MiniMetric label="Expected return" value={money(expectedReturn)} />
        <MiniMetric label="Expected profit" value={money(expectedProfit)} />
      </div>
    </button>
  );
}

function TradeHistoryRow({
  trade,
  contribution,
  onClick,
}: {
  trade: Trade;
  contribution: number;
  onClick: () => void;
}) {
  const total = Number(trade.invested_amount || 0);
  const expectedReturn = Number(trade.approx_return || 0) *
    (total > 0 ? contribution / total : 0);
  const expectedProfit = Math.max(0, Number(trade.approx_return || 0) - total) *
    (total > 0 ? contribution / total : 0);

  return (
    <button className="tb-trade-history-row" onClick={onClick}>
      <div className="tb-history-icon">
        <CheckCircle2 size={17} />
      </div>
      <div className="tb-history-main">
        <div className="tb-history-title-line">
          <strong>{trade.trade_name}</strong>
          <span className={`tb-pill ${statusClass(trade.status, trade.is_closed)}`}>
            {statusLabel(trade.status, trade.is_closed)}
          </span>
        </div>
        <span>Trade date: {dateText(trade.trade_date)} • Closed trade record</span>
      </div>
      <div className="tb-history-metric">
        <span>Your participation</span>
        <strong>{money(contribution)}</strong>
      </div>
      <div className="tb-history-metric">
        <span>Expected return</span>
        <strong>{money(expectedReturn)}</strong>
      </div>
      <div className="tb-history-metric">
        <span>Expected profit</span>
        <strong>{money(expectedProfit)}</strong>
      </div>
      <ChevronRight size={16} className="tb-history-arrow" />
    </button>
  );
}

function TradeRow({
  trade,
  contribution,
  onClick,
}: {
  trade: Trade;
  contribution: number;
  onClick: () => void;
}) {
  const total =
    Number(
      trade.invested_amount || 0
    );

  const expected =
    Number(
      trade.approx_return || 0
    );

  const share =
    total > 0
      ? contribution / total
      : 0;

  return (
    <button
      className="tb-trade-row"
      onClick={onClick}
    >
      <div>
        <strong>
          {trade.trade_name}
        </strong>

        <span>
          {money(
            contribution
          )}{" "}
          participation
        </span>
      </div>

      <div>
        <span
          className={`tb-pill ${statusClass(
            trade.status,
            trade.is_closed
          )}`}
        >
          {statusLabel(
            trade.status,
            trade.is_closed
          )}
        </span>
      </div>

      <div className="tb-trade-row-return">
        <span>
          Expected return
        </span>

        <strong>
          {money(
            expected * share
          )}
        </strong>
      </div>

      <ChevronRight
        size={16}
      />
    </button>
  );
}

const styles = `
:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #070708;
  color: #f5f5f7;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Display",
    "SF Pro Text",
    Inter,
    ui-sans-serif,
    system-ui,
    sans-serif;
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

.tb-shell {
  min-height: 100vh;
  display: flex;
  background:
    radial-gradient(
      circle at 78% -10%,
      rgba(255,255,255,.065),
      transparent 30%
    ),
    #070708;
}

.tb-sidebar {
  position: fixed;
  z-index: 30;
  inset: 0 auto 0 0;
  width: 244px;
  padding: 24px 16px 16px;
  display: flex;
  flex-direction: column;
  background: rgba(11,11,13,.88);
  border-right: 1px solid #242428;
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
}

.tb-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 9px 25px;
}

.tb-brand strong {
  display: block;
  font-size: 14px;
  letter-spacing: -.02em;
}

.tb-brand span {
  display: block;
  margin-top: 3px;
  color: #77777f;
  font-size: 9px;
}

.tb-logo {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: linear-gradient(
    145deg,
    #f7f7f7,
    #8e8e95
  );
  color: #0b0b0c;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: -.04em;
  box-shadow:
    0 8px 24px
    rgba(255,255,255,.08);
}

.tb-nav-label {
  padding: 0 10px 9px;
  color: #55555d;
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 8px;
  font-weight: 700;
}

.tb-nav-label.account {
  margin-top: 25px;
}

.tb-nav {
  display: grid;
  gap: 4px;
}

.tb-nav-button {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: #888890;
  border-radius: 11px;
  padding: 10px 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: .18s ease;
}

.tb-nav-button:hover {
  color: #eeeef1;
  background: #151519;
}

.tb-nav-button.active {
  color: #f5f5f7;
  background: #19191e;
  border-color: #29292f;
  box-shadow:
    inset 0 1px
    rgba(255,255,255,.04);
}

.tb-nav-button span {
  font-size: 11px;
  font-weight: 600;
}

.tb-sidebar-footer {
  margin-top: auto;
  padding: 13px 8px 4px;
  border-top: 1px solid #242428;
  display: flex;
  align-items: center;
  gap: 9px;
}

.tb-sidebar-footer strong {
  display: block;
  font-size: 10px;
}

.tb-sidebar-footer span {
  display: block;
  margin-top: 2px;
  color: #66666e;
  font-size: 8px;
}

.tb-avatar {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex: none;
  background: #1b1b20;
  border: 1px solid #303036;
  color: #dddde2;
  font-size: 9px;
  font-weight: 800;
}

.tb-avatar.large {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.tb-avatar.huge {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  font-size: 16px;
}

.tb-main {
  width: calc(100% - 244px);
  margin-left: 244px;
  min-height: 100vh;
}

.tb-topbar {
  height: 64px;
  padding: 0 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #202024;
  background: rgba(7,7,8,.76);
  backdrop-filter: blur(24px);
  position: sticky;
  top: 0;
  z-index: 20;
}

.tb-top-left,
.tb-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5e5e66;
  font-size: 10px;
}

.tb-top-left strong {
  color: #b8b8be;
}

.tb-top-left svg {
  color: #44444b;
}

.tb-top-right {
  gap: 7px;
}

.tb-icon,
.tb-menu {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid #26262b;
  background: #111114;
  color: #8a8a92;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.tb-menu {
  display: none;
}

.tb-user {
  border: 1px solid #242428;
  background: #111114;
  color: #aaaab1;
  border-radius: 11px;
  padding: 5px 9px 5px 5px;
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-size: 9px;
}

.tb-mini-avatar {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: #25252b;
  color: #dddde2;
  font-size: 7px;
  font-weight: 800;
}

.tb-content {
  width: min(
    1180px,
    calc(100% - 68px)
  );
  margin: 0 auto;
  padding: 46px 0 70px;
}

.tb-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 28px;
}

.tb-kicker {
  color: #686870;
  text-transform: uppercase;
  letter-spacing: .13em;
  font-size: 8px;
  font-weight: 800;
}

.tb-heading h1 {
  margin: 7px 0 9px;
  font-size: 38px;
  line-height: 1.04;
  letter-spacing: -.055em;
  font-weight: 700;
}

.tb-heading p {
  max-width: 610px;
  margin: 0;
  color: #77777f;
  font-size: 12px;
  line-height: 1.65;
}

.tb-stat-grid {
  display: grid;
  grid-template-columns:
    repeat(4,minmax(0,1fr));
  gap: 11px;
  margin-bottom: 13px;
}

.tb-stat {
  min-height: 135px;
  padding: 17px;
  border: 1px solid #242429;
  border-radius: 17px;
  background:
    linear-gradient(
      145deg,
      #111115,
      #0c0c0f
    );
  box-shadow:
    0 12px 40px
    rgba(0,0,0,.12);
}

.tb-stat.highlight {
  background:
    linear-gradient(
      145deg,
      #18181d,
      #0d0d10
    );
  border-color: #35353c;
}

.tb-stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #696970;
  font-size: 9px;
}

.tb-stat-top div {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: #19191e;
  border: 1px solid #2a2a30;
  color: #a6a6ad;
}

.tb-stat strong {
  display: block;
  margin-top: 22px;
  font-size: 24px;
  letter-spacing: -.045em;
}

.tb-stat small {
  display: block;
  margin-top: 5px;
  color: #57575f;
  font-size: 8px;
  line-height: 1.4;
}

.tb-two-col {
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  gap: 13px;
}

.tb-panel {
  border: 1px solid #242429;
  border-radius: 18px;
  background:
    linear-gradient(
      145deg,
      #101014,
      #0b0b0e
    );
  padding: 20px;
  box-shadow:
    0 18px 55px
    rgba(0,0,0,.12);
}

.hero-panel {
  min-height: 260px;
}

.tb-panel-top,
.tb-panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
}

.tb-panel-heading {
  align-items: center;
  margin-bottom: 17px;
}

.tb-panel-heading h2,
.tb-panel-top h2 {
  margin: 5px 0 0;
  font-size: 18px;
  letter-spacing: -.035em;
}

.tb-panel-top h2 {
  font-size: 31px;
}

.tb-big-icon {
  width: 43px;
  height: 43px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #19191e;
  border: 1px solid #2d2d34;
  color: #c3c3c9;
}

.hero-panel > p {
  max-width: 570px;
  margin: 17px 0 23px;
  color: #707078;
  font-size: 10px;
  line-height: 1.65;
}

.tb-mini-grid {
  display: grid;
  grid-template-columns:
    repeat(3,minmax(0,1fr));
  gap: 8px;
}

.tb-mini-metric {
  min-width: 0;
  padding: 11px;
  border: 1px solid #222228;
  background: #0d0d11;
  border-radius: 11px;
}

.tb-mini-metric span {
  display: block;
  color: #5f5f67;
  font-size: 8px;
}

.tb-mini-metric strong {
  display: block;
  margin-top: 5px;
  color: #d8d8dc;
  font-size: 11px;
  letter-spacing: -.02em;
}

.tb-list {
  display: grid;
  gap: 7px;
}

.tb-trade-row {
  width: 100%;
  border: 1px solid #232329;
  background: #0d0d11;
  color: #dddde1;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  grid-template-columns:
    1.5fr auto 1fr auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.tb-trade-row:hover,
.tb-quick:hover,
.tb-trade-card:hover {
  border-color: #3b3b42;
  background: #121216;
  transform: translateY(-1px);
}

.tb-trade-row strong,
.tb-trade-card h3 {
  display: block;
  font-size: 11px;
}

.tb-trade-row span,
.tb-trade-card span {
  color: #66666e;
  font-size: 8px;
}

.tb-trade-row-return {
  text-align: right;
}

.tb-trade-row-return strong {
  margin-top: 3px;
  color: #dddde2;
}

.tb-quick-grid {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 10px;
  margin-top: 13px;
}

.tb-quick {
  border: 1px solid #242429;
  background: #101014;
  border-radius: 15px;
  color: #bdbdc3;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  cursor: pointer;
  transition: .18s ease;
}

.tb-quick > span {
  flex: 1;
}

.tb-quick strong,
.tb-quick small {
  display: block;
}

.tb-quick strong {
  color: #dcdce0;
  font-size: 10px;
}

.tb-quick small {
  color: #5d5d65;
  font-size: 8px;
  margin-top: 4px;
}

.tb-secondary,
.tb-primary,
.tb-danger {
  border: 1px solid #2b2b31;
  background: #151519;
  color: #dedee2;
  border-radius: 10px;
  padding: 9px 13px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
}

.tb-primary {
  background: #f4f4f5;
  color: #09090a;
  border-color: #f4f4f5;
}

.tb-primary:hover {
  background: #fff;
}

.tb-primary.wide {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
}

.tb-danger {
  color: #f0a2a2;
  border-color: #442727;
  background: #1a0e0e;
  margin-top: 16px;
}

.tb-alert {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  padding: 11px 13px;
  border: 1px solid #4a2a2a;
  border-radius: 11px;
  background: #170e0e;
  color: #e4a7a7;
  font-size: 9px;
}

.tb-alert span {
  flex: 1;
}

.tb-alert button {
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

.tb-member-table {
  border: 1px solid #222228;
  border-radius: 14px;
  overflow: hidden;
}

.tb-member-head,
.tb-member-row {
  display: grid;
  grid-template-columns:
    1.6fr .7fr 1fr;
  gap: 16px;
  align-items: center;
  padding: 13px 15px;
}

.tb-member-head {
  background: #111115;
  color: #55555d;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-size: 7px;
  font-weight: 800;
}

.tb-member-row {
  border-top: 1px solid #1e1e23;
  background: #0d0d11;
}

.tb-member-row.current {
  background: #141419;
}

.tb-member-person {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tb-member-person strong,
.tb-member-person span {
  display: block;
}

.tb-member-person strong {
  font-size: 10px;
}

.tb-member-person span {
  margin-top: 3px;
  color: #5e5e66;
  font-size: 8px;
}

.tb-member-money {
  text-align: right;
  font-size: 11px;
}

.tb-pill {
  display: inline-flex;
  width: max-content;
  align-items: center;
  padding: 5px 7px;
  border-radius: 100px;
  border: 1px solid #303037;
  background: #17171c;
  color: #aaaab1;
  text-transform: capitalize;
  font-size: 7px;
  font-weight: 800;
}

.tb-pill.green,
.tb-pill.success {
  color: #9ed6b5;
  border-color: #244233;
  background: #102018;
}

.tb-pill.yellow,
.tb-pill.ongoing {
  color: #d7c58d;
  border-color: #443a22;
  background: #1b170c;
}

.tb-pill.red {
  color: #e2a0a0;
  border-color: #472828;
  background: #1b0e0e;
}

.tb-pill.returned {
  color: #a7c8e3;
  border-color: #263b4b;
  background: #0e1820;
}

.tb-pill.closed {
  color: #bdbdc4;
  border-color: #36363d;
  background: #18181d;
}

.tb-pill.gray {
  color: #888890;
}

.tb-note {
  margin-top: 13px;
  padding: 14px 16px;
  border: 1px solid #25252b;
  border-radius: 14px;
  background: #0f0f13;
  display: flex;
  gap: 11px;
  color: #aaaab0;
}

.tb-note svg {
  flex: none;
  margin-top: 1px;
}

.tb-note strong {
  display: block;
  font-size: 10px;
}

.tb-note p {
  margin: 5px 0 0;
  color: #65656d;
  font-size: 8px;
  line-height: 1.6;
}

.tb-note code {
  color: #a5a5ac;
}

.activity-readonly-note {
  margin-top: 0;
  margin-bottom: 14px;
}

.tb-activity-row {
  display: grid;
  grid-template-columns:
    36px 1fr auto auto;
  gap: 11px;
  align-items: center;
  padding: 11px;
  border: 1px solid #222228;
  background: #0d0d11;
  border-radius: 12px;
}

.tb-activity-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #17171c;
  border: 1px solid #29292f;
  color: #a5a5ac;
}

.tb-grow strong,
.tb-grow span {
  display: block;
}

.tb-grow strong {
  font-size: 10px;
}

.tb-grow span {
  margin-top: 4px;
  color: #5d5d65;
  font-size: 8px;
}

.tb-activity-row > strong {
  font-size: 10px;
}

.tb-date {
  color: #5a5a62;
  font-size: 7px;
}

/* Premium trade presentation */
.tb-trade-portfolio-panel,
.tb-trade-history-panel {
  position: relative;
  overflow: hidden;
}

.tb-trade-portfolio-panel::before,
.tb-trade-history-panel::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, transparent, #4b4b54, transparent);
  opacity: .75;
}

.tb-section-description {
  margin: -5px 0 16px;
  max-width: 760px;
  color: #686870;
  font-size: 9px;
  line-height: 1.65;
}

.tb-trade-history-list {
  display: grid;
  gap: 8px;
}

.tb-trade-history-row {
  width: 100%;
  border: 1px solid #24242b;
  background: linear-gradient(135deg, #111116, #0c0c10);
  color: #dddde2;
  border-radius: 14px;
  padding: 13px;
  display: grid;
  grid-template-columns: 38px minmax(190px, 1.7fr) repeat(3, minmax(100px, .75fr)) 18px;
  gap: 12px;
  align-items: center;
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
}

.tb-trade-history-row:hover {
  transform: translateY(-1px);
  border-color: #3b3b44;
  background: linear-gradient(135deg, #15151a, #0f0f13);
  box-shadow: 0 14px 35px rgba(0,0,0,.18);
}

.tb-history-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  background: #15151a;
  border: 1px solid #2c2c34;
  color: #bdbdc4;
}

.tb-history-main {
  min-width: 0;
}

.tb-history-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tb-history-title-line strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

.tb-history-main > span {
  display: block;
  margin-top: 5px;
  color: #606069;
  font-size: 8px;
}

.tb-history-metric {
  min-width: 0;
  padding-left: 11px;
  border-left: 1px solid #23232a;
}

.tb-history-metric span,
.tb-history-metric strong {
  display: block;
}

.tb-history-metric span {
  color: #5e5e66;
  font-size: 7px;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.tb-history-metric strong {
  margin-top: 5px;
  color: #d6d6db;
  font-size: 10px;
}

.tb-history-arrow {
  color: #55555d;
}

.tb-trade-grid {
  display: grid;
  grid-template-columns:
    repeat(2,minmax(0,1fr));
  gap: 10px;
}

.tb-trade-card {
  border: 1px solid #242429;
  background: #0d0d11;
  color: #dddde2;
  border-radius: 15px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: .18s ease;
}

.tb-trade-top,
.tb-trade-status-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  color: #5e5e66;
  font-size: 8px;
}

.tb-trade-card h3 {
  margin: 17px 0;
  font-size: 15px;
  letter-spacing: -.03em;
}

.tb-trade-metrics {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 7px;
}

.tb-profile-card {
  border: 1px solid #242429;
  border-radius: 18px;
  background: #101014;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.tb-profile-card h2 {
  margin: 5px 0 3px;
  font-size: 23px;
  letter-spacing: -.04em;
}

.tb-profile-card p {
  margin: 0;
  color: #66666e;
  font-size: 9px;
}

.tb-profile-id {
  margin-left: auto;
  max-width: 320px;
}

.tb-profile-id span {
  display: block;
  color: #5f5f67;
  font-size: 8px;
}

.tb-profile-id code {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9999a1;
  font-size: 8px;
}

.tb-footer {
  padding: 20px 34px 28px;
  color: #414149;
  text-align: center;
  font-size: 8px;
}

.tb-empty {
  min-height: 180px;
  border: 1px dashed #29292f;
  border-radius: 13px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  text-align: center;
  padding: 25px;
  color: #55555d;
}

.tb-empty > div {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: #17171c;
  border: 1px solid #28282f;
  color: #888890;
  margin-bottom: 3px;
}

.tb-empty strong {
  color: #a5a5ac;
  font-size: 10px;
}

.tb-empty span {
  max-width: 360px;
  color: #5b5b63;
  font-size: 8px;
  line-height: 1.5;
}

.tb-loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #070708;
  color: #eeeef0;
}

.tb-loading-card,
.tb-error-card {
  width: min(
    390px,
    calc(100% - 36px)
  );
  border: 1px solid #25252a;
  border-radius: 20px;
  background: #101014;
  padding: 28px;
  text-align: center;
  box-shadow:
    0 30px 100px
    rgba(0,0,0,.4);
}

.tb-loading-card .tb-logo,
.tb-error-card .tb-logo {
  margin: 0 auto 20px;
}

.tb-loading-card strong,
.tb-loading-card span {
  display: block;
}

.tb-loading-card strong {
  font-size: 13px;
}

.tb-loading-card span {
  margin-top: 6px;
  color: #606069;
  font-size: 9px;
}

.tb-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #2b2b31;
  border-top-color: #eeeef0;
  border-radius: 50%;
  margin: 0 auto 17px;
  animation:
    tbspin .8s linear infinite;
}

.tb-error-card h1 {
  margin: 9px 0;
  font-size: 20px;
  letter-spacing: -.04em;
}

.tb-error-card p {
  color: #77777f;
  font-size: 9px;
  line-height: 1.6;
  margin: 0 0 18px;
}

.tb-modal-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0,0,0,.66);
  backdrop-filter: blur(10px);
}

.tb-modal {
  width: min(
    700px,
    100%
  );
  max-height: min(
    760px,
    90vh
  );
  overflow: auto;
  border: 1px solid #2d2d34;
  border-radius: 20px;
  background: #101014;
  box-shadow:
    0 40px 120px
    rgba(0,0,0,.55);
  padding: 21px;
}

.tb-modal.small {
  width: min(
    470px,
    100%
  );
}

.tb-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  align-items: flex-start;
}

.tb-modal-head h2 {
  margin: 5px 0 0;
  font-size: 20px;
  letter-spacing: -.04em;
}

.tb-close {
  width: 31px;
  height: 31px;
  border: 1px solid #29292f;
  background: #17171c;
  color: #8b8b93;
  border-radius: 9px;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.tb-trade-status-line {
  margin: 18px 0;
  padding-bottom: 16px;
  border-bottom: 1px solid #242429;
}

.tb-modal-grid {
  display: grid;
  grid-template-columns:
    repeat(3,1fr);
  gap: 8px;
}

.tb-modal-section {
  margin-top: 18px;
  padding-top: 17px;
  border-top: 1px solid #242429;
}

.tb-modal-section > p {
  color: #888890;
  font-size: 9px;
  line-height: 1.6;
}

.tb-log {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 9px 0;
  border-bottom: 1px solid #1d1d22;
}

.tb-log strong {
  font-size: 9px;
  font-weight: 500;
}

.tb-log span {
  color: #5e5e66;
  font-size: 7px;
  white-space: nowrap;
}

.tb-file {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px;
  border: 1px solid #232329;
  border-radius: 10px;
  background: #0d0d11;
  color: #aaaab1;
  text-decoration: none;
  margin-top: 7px;
  font-size: 9px;
}

.tb-file span {
  flex: 1;
}

.tb-muted {
  color: #5d5d65;
  font-size: 8px;
}

.tb-balance-banner {
  margin: 18px 0 16px;
  padding: 14px;
  border-radius: 13px;
  border: 1px solid #2d2d34;
  background: #17171c;
}

.tb-balance-banner span,
.tb-balance-banner strong {
  display: block;
}

.tb-balance-banner span {
  color: #65656d;
  font-size: 8px;
}

.tb-balance-banner strong {
  margin-top: 5px;
  font-size: 20px;
  letter-spacing: -.04em;
}

.tb-label {
  display: block;
  margin-top: 12px;
  color: #85858d;
  font-size: 8px;
  font-weight: 700;
}

.tb-input {
  width: 100%;
  margin-top: 6px;
  border: 1px solid #29292f;
  border-radius: 10px;
  background: #0c0c10;
  color: #eeeef0;
  padding: 11px;
  outline: none;
  font-size: 9px;
}

.tb-input:focus {
  border-color: #5a5a62;
  box-shadow:
    0 0 0 3px
    rgba(255,255,255,.035);
}

.tb-form-message {
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: 8px;
}

.tb-form-message.success {
  background: #0e1b14;
  border: 1px solid #234331;
  color: #9bd3b2;
}

.tb-form-message.error {
  background: #1b0f0f;
  border: 1px solid #482727;
  color: #e1a3a3;
}

.spin {
  animation:
    tbspin .8s linear infinite;
}

@keyframes tbspin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .tb-sidebar {
    transform: translateX(-100%);
    transition: transform .22s ease;
    box-shadow:
      20px 0 70px
      rgba(0,0,0,.35);
  }

  .tb-sidebar.open {
    transform: translateX(0);
  }

  .tb-main {
    width: 100%;
    margin-left: 0;
  }

  .tb-menu {
    display: grid;
  }

  .tb-topbar {
    padding: 0 18px;
  }

  .tb-content {
    width: min(
      100% - 36px,
      760px
    );
    padding-top: 34px;
  }

  .tb-stat-grid {
    grid-template-columns:
      repeat(2,1fr);
  }

  .tb-two-col {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 650px) {
  .tb-top-right
  .tb-user > span:last-child {
    display: none;
  }

  .tb-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .tb-heading h1 {
    font-size: 31px;
  }

  .tb-stat-grid,
  .tb-quick-grid,
  .tb-trade-grid {
    grid-template-columns: 1fr;
  }

  .tb-member-head {
    display: none;
  }

  .tb-member-row {
    grid-template-columns: 1fr auto;
  }

  .tb-member-row .tb-pill {
    grid-column: 2;
    grid-row: 1;
  }

  .tb-member-money {
    grid-column: 1 / -1;
    text-align: left;
    padding-left: 48px;
    margin-top: -7px;
  }

  .tb-activity-row {
    grid-template-columns:
      34px 1fr auto;
  }
  .tb-trade-history-row {
    grid-template-columns: 36px 1fr auto;
  }

  .tb-history-metric {
    display: none;
  }

  .tb-history-arrow {
    grid-column: 3;
    grid-row: 1;
  }

  .tb-history-title-line {
    padding-right: 4px;
  }


  .tb-date {
    display: none;
  }

  .tb-modal-grid,
  .tb-mini-grid {
    grid-template-columns: 1fr;
  }

  .tb-profile-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .tb-profile-id {
    width: 100%;
    margin-left: 0;
  }

  .tb-trade-row {
    grid-template-columns:
      1fr auto;
  }

  .tb-trade-row-return {
    text-align: left;
  }
}
`;