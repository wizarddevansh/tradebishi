"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Copy,
  FileCheck2,
  FileImage,
  FileText,
  FolderOpen,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
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

type ParticipatingTrade = {
  trade: Trade;
  participation: TradeMember;
};

function normal(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function money(value: number | null | undefined) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(
  status: string,
  closed?: boolean
) {
  const normalized = normal(status);

  if (closed) {
    return "Closed";
  }

  if (normalized === "successful") {
    return "Profit";
  }

  if (normalized === "failed") {
    return "Money Returned";
  }

  return "Ongoing";
}

function statusClass(
  status: string,
  closed?: boolean
) {
  const normalized = normal(status);

  if (closed) {
    return "tb-status tb-status-closed";
  }

  if (normalized === "successful") {
    return "tb-status tb-status-success";
  }

  if (normalized === "failed") {
    return "tb-status tb-status-failed";
  }

  return "tb-status tb-status-ongoing";
}

function initials(name: string | null | undefined) {
  const value = String(name || "").trim();

  if (!value) {
    return "?";
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function MemberPage() {
  const router = useRouter();
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [section, setSection] =
    useState<Section>("overview");

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

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [selectedTradeId, setSelectedTradeId] =
    useState<string | null>(null);

  const [showWithdrawalModal, setShowWithdrawalModal] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [withdrawalMethod, setWithdrawalMethod] =
    useState("Bank Transfer");

  const [withdrawalDetails, setWithdrawalDetails] =
    useState("");

  const [withdrawalSubmitting, setWithdrawalSubmitting] =
    useState(false);

  const [withdrawalError, setWithdrawalError] =
    useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const {
          data: {
            user,
          },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const [
          profileResponse,
          memberResponse,
          directoryResponse,
          activityResponse,
          withdrawalsResponse,
          tradesResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, role"
            )
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("members")
            .select(
              "id, user_id, full_name, phone, investment_amount, profit_share, status, created_at"
            )
            .eq("user_id", user.id)
            .maybeSingle(),

          fetch(
            "/api/member/directory",
            {
              cache: "no-store",
            }
          ),

          fetch(
            "/api/member/activity",
            {
              cache: "no-store",
            }
          ),

          supabase
            .from("withdrawals")
            .select(
              "id, member_id, amount, method, account_details, status, reviewed_by, reviewed_at, created_at"
            )
            .eq(
              "member_id",
              (
                await supabase
                  .from("members")
                  .select("id")
                  .eq("user_id", user.id)
                  .maybeSingle()
              ).data?.id || ""
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("trades")
            .select(
              "id, trade_name, invested_amount, approx_return, status, trade_date, notes, trader_id, is_closed"
            )
            .order(
              "trade_date",
              {
                ascending: false,
              }
            ),
        ]);

        if (profileResponse.error) {
          throw profileResponse.error;
        }

        if (memberResponse.error) {
          throw memberResponse.error;
        }

        if (
          directoryResponse.ok === false
        ) {
          throw new Error(
            "Unable to load member directory."
          );
        }

        if (
          activityResponse.ok === false
        ) {
          throw new Error(
            "Unable to load cooperative activity."
          );
        }

        if (withdrawalsResponse.error) {
          throw withdrawalsResponse.error;
        }

        if (tradesResponse.error) {
          throw tradesResponse.error;
        }

        const directoryJson =
          await directoryResponse.json();

        const activityJson =
          await activityResponse.json();

        const directoryMembers =
          Array.isArray(directoryJson)
            ? directoryJson
            : Array.isArray(
                directoryJson?.members
              )
            ? directoryJson.members
            : [];

        const activityTransactions =
          Array.isArray(activityJson)
            ? activityJson
            : Array.isArray(
                activityJson?.transactions
              )
            ? activityJson.transactions
            : [];

        setProfile(
          profileResponse.data || null
        );

        const currentMember =
          memberResponse.data || null;

        setMember(currentMember);

        if (
          !currentMember &&
          normal(
            profileResponse.data?.role
          ) !== "trader"
        ) {
          throw new Error(
            "Your account is not linked to a member record yet."
          );
        }

        setMembers(
          directoryMembers.map(
            (item: DirectoryMember) => ({
              ...item,
              balance: Number(
                item.balance || 0
              ),
            })
          )
        );

        setTransactions(
          activityTransactions.map(
            (item: Transaction) => ({
              ...item,
              amount: Number(
                item.amount || 0
              ),
            })
          )
        );

        setWithdrawals(
          withdrawalsResponse.data || []
        );

        const loadedTrades =
          tradesResponse.data || [];

        setTrades(loadedTrades);

        if (currentMember) {
          const {
            data: memberTradeRows,
            error: memberTradeError,
          } = await supabase
            .from("trade_members")
            .select(
              "id, trade_id, member_id, invested_amount, created_at"
            )
            .eq(
              "member_id",
              currentMember.id
            );

          if (memberTradeError) {
            throw memberTradeError;
          }

          setTradeMembers(
            memberTradeRows || []
          );

          const tradeIds =
            loadedTrades.map(
              (trade) => trade.id
            );

          if (tradeIds.length > 0) {
            const [
              filesResponse,
              logsResponse,
            ] = await Promise.all([
              supabase
                .from("trade_files")
                .select(
                  "id, trade_id, category, file_url, created_at"
                )
                .in(
                  "trade_id",
                  tradeIds
                )
                .order(
                  "created_at",
                  {
                    ascending: false,
                  }
                ),

              supabase
                .from("trade_logs")
                .select(
                  "id, trade_id, description, created_at"
                )
                .in(
                  "trade_id",
                  tradeIds
                )
                .order(
                  "created_at",
                  {
                    ascending: false,
                  }
                ),
            ]);

            if (filesResponse.error) {
              throw filesResponse.error;
            }

            if (logsResponse.error) {
              throw logsResponse.error;
            }

            setTradeFiles(
              filesResponse.data || []
            );

            setTradeLogs(
              logsResponse.data || []
            );
          } else {
            setTradeFiles([]);
            setTradeLogs([]);
          }
        } else {
          setTradeMembers([]);
          setTradeFiles([]);
          setTradeLogs([]);
        }
      } catch (loadError) {
        console.error(
          "Member dashboard load error:",
          loadError
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Something went wrong while loading the dashboard."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentCalculatedBalance =
    useMemo(() => {
      if (!member) {
        return 0;
      }

      const valid = (status: string) =>
        normal(status) !== "rejected";

      const approvedWithdrawal = (
        status: string
      ) =>
        normal(status) === "approved" ||
        normal(status) === "completed";

      const deposits =
        transactions
          .filter(
            (t) =>
              t.member_id === member.id &&
              normal(t.type) === "deposit" &&
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

      const serviceFees =
        transactions
          .filter(
            (t) =>
              t.member_id === member.id &&
              normal(t.type) ===
                "service_fee" &&
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
          ongoingCommitment -
          serviceFees
      );
    }, [
      member,
      transactions,
      withdrawals,
      trades,
      tradeMembers,
    ]);

  /*
   * GLOBAL MEMBER BALANCES
   *
   * Every member is calculated using the same ledger rules.
   * The /api/member/directory balance is deliberately not used here,
   * because relying on a viewer-specific/legacy directory balance can make
   * the cooperative balance change depending on who is logged in.
   *
   * investment_amount is legacy participation data and is NOT treated as
   * spendable member balance.
   */
  const calculatedMemberBalances =
    useMemo(() => {
      const approvedWithdrawal = (
        status: string
      ) =>
        normal(status) === "approved" ||
        normal(status) === "completed";

      const validTransaction = (
        status: string
      ) =>
        normal(status) !== "rejected";

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

      const balances =
        new Map<string, number>();

      members.forEach((item) => {
        const deposits =
          transactions
            .filter(
              (t) =>
                t.member_id ===
                  item.id &&
                normal(t.type) ===
                  "deposit" &&
                validTransaction(
                  t.status
                )
            )
            .reduce(
              (sum, t) =>
                sum +
                Number(
                  t.amount || 0
                ),
              0
            );

        const returns =
          transactions
            .filter(
              (t) =>
                t.member_id ===
                  item.id &&
                normal(t.type) ===
                  "trade_return" &&
                validTransaction(
                  t.status
                )
            )
            .reduce(
              (sum, t) =>
                sum +
                Number(
                  t.amount || 0
                ),
              0
            );

        const serviceFees =
          transactions
            .filter(
              (t) =>
                t.member_id ===
                  item.id &&
                normal(t.type) ===
                  "service_fee" &&
                validTransaction(
                  t.status
                )
            )
            .reduce(
              (sum, t) =>
                sum +
                Number(
                  t.amount || 0
                ),
              0
            );

        const memberWithdrawals =
          withdrawals
            .filter(
              (w) =>
                w.member_id ===
                  item.id &&
                approvedWithdrawal(
                  w.status
                )
            )
            .reduce(
              (sum, w) =>
                sum +
                Number(
                  w.amount || 0
                ),
              0
            );

        const ongoingCommitment =
          tradeMembers
            .filter(
              (tm) =>
                tm.member_id ===
                  item.id &&
                ongoingTradeIds.has(
                  tm.trade_id
                )
            )
            .reduce(
              (sum, tm) =>
                sum +
                Number(
                  tm.invested_amount ||
                    0
                ),
              0
            );

        balances.set(
          item.id,
          Math.max(
            0,
            deposits +
              returns -
              memberWithdrawals -
              ongoingCommitment -
              serviceFees
          )
        );
      });

      return balances;
    }, [
      members,
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
              : calculatedMemberBalances.get(
                  item.id
                ) || 0,
        })),
      [
        members,
        member?.id,
        currentCalculatedBalance,
        calculatedMemberBalances,
      ]
    );

  const currentDirectoryMember =
    useMemo(
      () =>
        correctedMembers.find(
          (item) =>
            item.id === member?.id
        ) || null,
      [
        correctedMembers,
        member?.id,
      ]
    );

  const memberBalance =
    currentDirectoryMember?.balance ||
    0;

  const participatingTrades =
    useMemo<ParticipatingTrade[]>(
      () => {
        return tradeMembers
          .map((participation) => {
            const trade = trades.find(
              (item) =>
                item.id ===
                participation.trade_id
            );

            if (!trade) {
              return null;
            }

            return {
              trade,
              participation,
            };
          })
          .filter(
            (
              item
            ): item is ParticipatingTrade =>
              Boolean(item)
          );
      },
      [tradeMembers, trades]
    );

  const ongoingTrades =
    useMemo(
      () =>
        participatingTrades.filter(
          ({ trade }) =>
            normal(trade.status) ===
              "ongoing" &&
            !trade.is_closed
        ),
      [participatingTrades]
    );

  const closedTrades =
    useMemo(
      () =>
        participatingTrades.filter(
          ({ trade }) =>
            trade.is_closed
        ),
      [participatingTrades]
    );

  const expectedProfit =
    useMemo(
      () =>
        ongoingTrades.reduce(
          (sum, { trade, participation }) => {
            const totalInvested =
              Number(
                trade.invested_amount ||
                  0
              );

            const totalReturn =
              Number(
                trade.approx_return ||
                  0
              );

            if (
              totalInvested <= 0 ||
              totalReturn <= 0
            ) {
              return sum;
            }

            const memberInvestment =
              Number(
                participation.invested_amount ||
                  0
              );

            const proportionalReturn =
              (memberInvestment /
                totalInvested) *
              totalReturn;

            return (
              sum +
              Math.max(
                0,
                proportionalReturn -
                  memberInvestment
              )
            );
          },
          0
        ),
      [ongoingTrades]
    );

  const selectedTrade =
    useMemo(
      () =>
        participatingTrades.find(
          ({ trade }) =>
            trade.id ===
            selectedTradeId
        ) || null,
      [
        participatingTrades,
        selectedTradeId,
      ]
    );

  const selectedTradeFiles =
    useMemo(
      () =>
        selectedTradeId
          ? tradeFiles.filter(
              (file) =>
                file.trade_id ===
                selectedTradeId
            )
          : [],
      [
        tradeFiles,
        selectedTradeId,
      ]
    );

  const selectedTradeLogs =
    useMemo(
      () =>
        selectedTradeId
          ? tradeLogs.filter(
              (log) =>
                log.trade_id ===
                selectedTradeId
            )
          : [],
      [
        tradeLogs,
        selectedTradeId,
      ]
    );

  /*
   * Cooperative balance is GLOBAL and therefore must be identical for every
   * logged-in member.
   *
   * Member balances already deduct:
   * - approved/completed member withdrawals
   * - ongoing trade commitments
   * - service fees
   *
   * We therefore do not subtract withdrawals again here.
   *
   * service_fee is an internal member -> TradeBishi transfer, so it is added
   * back to cooperative retained funds.
   */
  const cooperativeBalance =
    useMemo(() => {
      const memberAvailableBalance =
        correctedMembers.reduce(
          (sum, item) =>
            sum +
            Number(
              item.balance || 0
            ),
          0
        );

      const serviceFees =
        transactions
          .filter(
            (t) =>
              normal(t.type) ===
                "service_fee" &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(
                t.amount || 0
              ),
            0
          );

      const expenses =
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
              Number(
                t.amount || 0
              ),
            0
          );

      return Math.max(
        0,
        memberAvailableBalance +
          serviceFees -
          expenses
      );
    }, [
      correctedMembers,
      transactions,
    ]);

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
              Number(
                t.amount || 0
              ),
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
              Number(
                t.amount || 0
              ),
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
              (normal(t.type) ===
                "expense" ||
                normal(t.type) ===
                  "service_fee") &&
              normal(t.status) !==
                "rejected"
          )
          .reduce(
            (sum, t) =>
              sum +
              Number(
                t.amount || 0
              ),
            0
          ),
      [transactions]
    );

  const filteredMembers =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) {
        return correctedMembers;
      }

      return correctedMembers.filter(
        (item) =>
          item.full_name
            .toLowerCase()
            .includes(query) ||
          String(
            item.phone || ""
          )
            .toLowerCase()
            .includes(query)
      );
    }, [
      correctedMembers,
      searchQuery,
    ]);

  const recentActivity =
    useMemo(
      () =>
        transactions
          .slice()
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          )
          .slice(0, 8),
      [transactions]
    );

  const submitWithdrawal =
    async () => {
      setWithdrawalError(null);

      const amount =
        Number(withdrawalAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setWithdrawalError(
          "Enter a valid withdrawal amount."
        );
        return;
      }

      if (amount > memberBalance) {
        setWithdrawalError(
          "Withdrawal amount cannot be greater than your available balance."
        );
        return;
      }

      if (
        !withdrawalDetails.trim()
      ) {
        setWithdrawalError(
          "Please provide your account details."
        );
        return;
      }

      if (!member) {
        setWithdrawalError(
          "Member account not found."
        );
        return;
      }

      try {
        setWithdrawalSubmitting(
          true
        );

        const {
          error: insertError,
        } = await supabase
          .from("withdrawals")
          .insert({
            member_id: member.id,
            amount,
            method:
              withdrawalMethod,
            account_details:
              withdrawalDetails.trim(),
            status: "pending",
          });

        if (insertError) {
          throw insertError;
        }

        setWithdrawalAmount("");
        setWithdrawalDetails("");
        setWithdrawalMethod(
          "Bank Transfer"
        );
        setShowWithdrawalModal(
          false
        );

        await loadData(true);
      } catch (submitError) {
        console.error(
          "Withdrawal submission error:",
          submitError
        );

        setWithdrawalError(
          submitError instanceof
            Error
            ? submitError.message
            : "Unable to submit withdrawal request."
        );
      } finally {
        setWithdrawalSubmitting(
          false
        );
      }
    };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const navigationItems: {
    id: Section;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "members",
      label: "Members",
      icon: Users,
    },
    {
      id: "activity",
      label: "Activity",
      icon: Activity,
    },
    {
      id: "trades",
      label: "Trades",
      icon: BarChart3,
    },
    {
      id: "withdrawals",
      label: "Withdrawals",
      icon: ArrowUpRight,
    },
    {
      id: "account",
      label: "Account",
      icon: Settings,
    },
  ];

  if (loading) {
    return (
      <>
        <style jsx global>{`
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f5f5f7;
            color: #1d1d1f;
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "SF Pro Display",
              "SF Pro Text",
              "Helvetica Neue",
              Arial,
              sans-serif;
          }

          .tb-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background:
              radial-gradient(
                circle at 50% 0%,
                rgba(255, 255, 255, 0.95),
                rgba(245, 245, 247, 1)
              );
          }

          .tb-loading-card {
            width: min(
              calc(100% - 40px),
              440px
            );
            padding: 36px;
            border-radius: 28px;
            background: rgba(
              255,
              255,
              255,
              0.82
            );
            border: 1px solid
              rgba(0, 0, 0, 0.07);
            box-shadow:
              0 24px 80px
                rgba(0, 0, 0, 0.08);
            text-align: center;
            backdrop-filter: blur(
              24px
            );
          }

          .tb-spinner {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            border: 3px solid
              rgba(0, 0, 0, 0.08);
            border-top-color: #1d1d1f;
            animation:
              tb-spin 0.8s linear
              infinite;
            margin: 0 auto 18px;
          }

          @keyframes tb-spin {
            to {
              transform: rotate(
                360deg
              );
            }
          }
        `}</style>

        <main className="tb-loading">
          <div className="tb-loading-card">
            <div className="tb-spinner" />
            <h1
              style={{
                margin:
                  "0 0 8px",
                fontSize: 21,
                fontWeight: 700,
                letterSpacing:
                  "-0.02em",
              }}
            >
              Loading TradeBishi
            </h1>
            <p
              style={{
                margin: 0,
                color:
                  "#6e6e73",
                fontSize: 14,
              }}
            >
              Preparing your
              cooperative dashboard…
            </p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style jsx global>{`
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #f5f5f7;
            color: #1d1d1f;
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              "SF Pro Display",
              "SF Pro Text",
              "Helvetica Neue",
              Arial,
              sans-serif;
          }

          .tb-error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background:
              radial-gradient(
                circle at 50% 0%,
                #ffffff 0,
                #f5f5f7 52%
              );
          }

          .tb-error-card {
            width: min(
              100%,
              560px
            );
            padding: 36px;
            border-radius: 28px;
            background: rgba(
              255,
              255,
              255,
              0.9
            );
            border: 1px solid
              rgba(0, 0, 0, 0.08);
            box-shadow:
              0 30px 100px
                rgba(0, 0, 0, 0.1);
          }

          .tb-error-icon {
            width: 52px;
            height: 52px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            background: #fff2f2;
            color: #d70015;
            margin-bottom: 18px;
          }

          .tb-error-title {
            margin: 0 0 10px;
            font-size: 26px;
            line-height: 1.1;
            letter-spacing:
              -0.03em;
          }

          .tb-error-text {
            margin: 0;
            color: #6e6e73;
            line-height: 1.6;
          }

          .tb-error-actions {
            display: flex;
            gap: 10px;
            margin-top: 24px;
            flex-wrap: wrap;
          }

          .tb-button {
            appearance: none;
            border: 0;
            border-radius: 14px;
            padding: 12px 17px;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
          }

          .tb-button-primary {
            background: #1d1d1f;
            color: white;
          }

          .tb-button-secondary {
            background: #f2f2f7;
            color: #1d1d1f;
          }
        `}</style>

        <main className="tb-error-page">
          <section className="tb-error-card">
            <div className="tb-error-icon">
              <XCircle size={26} />
            </div>

            <h1 className="tb-error-title">
              Unable to load TradeBishi
            </h1>

            <p className="tb-error-text">
              {error}
            </p>

            <div className="tb-error-actions">
              <button
                type="button"
                className="tb-button tb-button-primary"
                onClick={() =>
                  loadData(true)
                }
              >
                Try again
              </button>

              <button
                type="button"
                className="tb-button tb-button-secondary"
                onClick={logout}
              >
                Sign out
              </button>
            </div>
          </section>
        </main>
      </>
    );
  }

  const firstName =
    profile?.full_name
      ?.trim()
      .split(/\s+/)[0] ||
    member?.full_name
      ?.trim()
      .split(/\s+/)[0] ||
    "Member";

  const memberName =
    member?.full_name ||
    profile?.full_name ||
    "Member";

  const memberInitials =
    initials(memberName);

  const activeTradeCount =
    ongoingTrades.length;

  const closedTradeCount =
    closedTrades.length;

  const totalParticipatedCapital =
    participatingTrades.reduce(
      (sum, item) =>
        sum +
        Number(
          item.participation
            .invested_amount || 0
        ),
      0
    );

  return (
    <>
      <style jsx global>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f5f5f7;
          color: #1d1d1f;
          font-family:
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "SF Pro Text",
            "Helvetica Neue",
            Arial,
            sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
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

        .tb-app {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 80% -10%,
              rgba(
                255,
                255,
                255,
                0.95
              ),
              transparent 36%
            ),
            #f5f5f7;
        }

        .tb-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 252px;
          z-index: 40;
          padding: 18px;
          display: flex;
          flex-direction: column;
          background: rgba(
            250,
            250,
            252,
            0.88
          );
          border-right: 1px solid
            rgba(0, 0, 0, 0.06);
          backdrop-filter: blur(
            24px
          );
          -webkit-backdrop-filter: blur(
            24px
          );
        }

        .tb-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 8px 23px;
        }

        .tb-brand-mark {
          width: 37px;
          height: 37px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #1d1d1f;
          color: white;
          box-shadow:
            0 5px 14px
              rgba(0, 0, 0, 0.15);
        }

        .tb-brand-text {
          min-width: 0;
        }

        .tb-brand-name {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          letter-spacing:
            -0.02em;
        }

        .tb-brand-caption {
          margin: 2px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-nav {
          display: grid;
          gap: 5px;
        }

        .tb-nav-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #6e6e73;
          border-radius: 12px;
          padding: 11px 12px;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
        }

        .tb-nav-button:hover {
          background: rgba(
            0,
            0,
            0,
            0.045
          );
          color: #1d1d1f;
        }

        .tb-nav-button:active {
          transform: scale(
            0.985
          );
        }

        .tb-nav-button.active {
          background: #e8e8ed;
          color: #1d1d1f;
          font-weight: 600;
        }

        .tb-nav-icon {
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        .tb-sidebar-spacer {
          flex: 1;
        }

        .tb-sidebar-account {
          margin-top: 16px;
          padding-top: 15px;
          border-top: 1px solid
            rgba(0, 0, 0, 0.06);
        }

        .tb-mini-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
        }

        .tb-avatar {
          width: 36px;
          height: 36px;
          flex: 0 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #e5e5ea;
          color: #3a3a3c;
          font-size: 12px;
          font-weight: 700;
        }

        .tb-mini-profile-copy {
          min-width: 0;
          flex: 1;
        }

        .tb-mini-profile-name {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
        }

        .tb-mini-profile-role {
          margin: 2px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-logout {
          border: 0;
          background: transparent;
          color: #86868b;
          cursor: pointer;
          padding: 8px;
          border-radius: 9px;
        }

        .tb-logout:hover {
          background: rgba(
            0,
            0,
            0,
            0.05
          );
          color: #1d1d1f;
        }

        .tb-main {
          margin-left: 252px;
          min-height: 100vh;
          padding: 0 32px 50px;
        }

        .tb-topbar {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          position: sticky;
          top: 0;
          z-index: 30;
          background: rgba(
            245,
            245,
            247,
            0.76
          );
          backdrop-filter: blur(
            20px
          );
          -webkit-backdrop-filter: blur(
            20px
          );
        }

        .tb-topbar-left {
          min-width: 0;
        }

        .tb-eyebrow {
          margin: 0 0 4px;
          color: #86868b;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing:
            0.08em;
        }

        .tb-page-title {
          margin: 0;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing:
            -0.035em;
          font-weight: 700;
        }

        .tb-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tb-icon-button {
          width: 39px;
          height: 39px;
          display: grid;
          place-items: center;
          border: 1px solid
            rgba(0, 0, 0, 0.06);
          background: rgba(
            255,
            255,
            255,
            0.68
          );
          color: #3a3a3c;
          border-radius: 12px;
          cursor: pointer;
          transition:
            background 0.18s ease,
            transform 0.18s ease;
        }

        .tb-icon-button:hover {
          background: white;
        }

        .tb-icon-button:active {
          transform: scale(
            0.96
          );
        }

        .tb-content {
          max-width: 1500px;
          margin: 0 auto;
        }

        .tb-welcome {
          margin-bottom: 24px;
        }

        .tb-welcome-title {
          margin: 0;
          font-size: 35px;
          line-height: 1.04;
          letter-spacing:
            -0.045em;
          font-weight: 700;
        }

        .tb-welcome-subtitle {
          margin: 9px 0 0;
          color: #6e6e73;
          font-size: 15px;
          line-height: 1.5;
        }

        .tb-stat-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 13px;
          margin-bottom: 18px;
        }

        .tb-stat-card {
          min-width: 0;
          padding: 21px;
          border-radius: 21px;
          background: rgba(
            255,
            255,
            255,
            0.78
          );
          border: 1px solid
            rgba(0, 0, 0, 0.055);
          box-shadow:
            0 12px 35px
              rgba(
                0,
                0,
                0,
                0.045
              );
        }

        .tb-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .tb-stat-label {
          color: #6e6e73;
          font-size: 12px;
          font-weight: 600;
        }

        .tb-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #f2f2f7;
          color: #3a3a3c;
        }

        .tb-stat-value {
          margin: 12px 0 0;
          font-size: 25px;
          line-height: 1;
          letter-spacing:
            -0.035em;
          font-weight: 700;
        }

        .tb-stat-caption {
          margin: 8px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-grid-2 {
          display: grid;
          grid-template-columns:
            minmax(0, 1.45fr)
            minmax(330px, 0.85fr);
          gap: 18px;
        }

        .tb-panel {
          min-width: 0;
          background: rgba(
            255,
            255,
            255,
            0.82
          );
          border: 1px solid
            rgba(0, 0, 0, 0.055);
          border-radius: 24px;
          box-shadow:
            0 15px 45px
              rgba(
                0,
                0,
                0,
                0.045
              );
          overflow: hidden;
        }

        .tb-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 21px 22px;
          border-bottom: 1px solid
            rgba(0, 0, 0, 0.055);
        }

        .tb-panel-title-wrap {
          min-width: 0;
        }

        .tb-panel-title {
          margin: 0;
          font-size: 16px;
          letter-spacing:
            -0.02em;
          font-weight: 700;
        }

        .tb-panel-subtitle {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 11px;
          line-height: 1.45;
        }

        .tb-panel-body {
          padding: 21px 22px;
        }

        .tb-balance-hero {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(190px, 0.65fr);
          gap: 18px;
          align-items: stretch;
        }

        .tb-balance-main {
          padding: 25px;
          border-radius: 20px;
          background: #1d1d1f;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .tb-balance-main::after {
          content: "";
          position: absolute;
          width: 190px;
          height: 190px;
          border-radius: 50%;
          right: -75px;
          top: -75px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
        }

        .tb-balance-label {
          margin: 0;
          color: rgba(
            255,
            255,
            255,
            0.65
          );
          font-size: 12px;
          font-weight: 600;
        }

        .tb-balance-value {
          margin: 12px 0 0;
          font-size: 38px;
          line-height: 1;
          letter-spacing:
            -0.05em;
          font-weight: 700;
        }

        .tb-balance-caption {
          margin: 12px 0 0;
          color: rgba(
            255,
            255,
            255,
            0.55
          );
          font-size: 11px;
        }

        .tb-balance-side {
          display: grid;
          gap: 11px;
        }

        .tb-mini-stat {
          padding: 17px;
          border-radius: 18px;
          background: #f7f7f9;
        }

        .tb-mini-stat-label {
          margin: 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-mini-stat-value {
          margin: 7px 0 0;
          font-size: 20px;
          line-height: 1;
          font-weight: 700;
          letter-spacing:
            -0.025em;
        }

        .tb-trade-list {
          display: grid;
          gap: 10px;
        }

        .tb-trade-row {
          width: 100%;
          border: 1px solid
            rgba(0, 0, 0, 0.055);
          background: white;
          border-radius: 17px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 13px;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .tb-trade-row:hover {
          border-color: rgba(
            0,
            0,
            0,
            0.12
          );
          box-shadow:
            0 8px 25px
              rgba(
                0,
                0,
                0,
                0.06
              );
          transform: translateY(
            -1px
          );
        }

        .tb-trade-symbol {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #f2f2f7;
          color: #3a3a3c;
        }

        .tb-trade-main {
          min-width: 0;
          flex: 1;
        }

        .tb-trade-name {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          font-weight: 650;
        }

        .tb-trade-meta {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-trade-right {
          flex: 0 0 auto;
          text-align: right;
        }

        .tb-trade-amount {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
        }

        .tb-trade-return {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 10px;
        }

        .tb-status {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .tb-status-ongoing {
          background: #fff4d6;
          color: #8a5b00;
        }

        .tb-status-success {
          background: #e9f8ef;
          color: #187a42;
        }

        .tb-status-failed {
          background: #f2f2f7;
          color: #54545a;
        }

        .tb-status-closed {
          background: #e8e8ed;
          color: #3a3a3c;
        }

        .tb-empty {
          padding: 35px 20px;
          text-align: center;
          color: #86868b;
        }

        .tb-empty-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          border-radius: 14px;
          background: #f2f2f7;
          color: #6e6e73;
        }

        .tb-empty-title {
          margin: 0;
          color: #3a3a3c;
          font-size: 14px;
          font-weight: 650;
        }

        .tb-empty-text {
          margin: 6px auto 0;
          max-width: 420px;
          font-size: 11px;
          line-height: 1.5;
        }

        .tb-search {
          position: relative;
          width: min(
            300px,
            100%
          );
        }

        .tb-search svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(
            -50%
          );
          color: #86868b;
          pointer-events: none;
        }

        .tb-search input {
          width: 100%;
          height: 38px;
          padding: 0 12px 0 37px;
          border: 1px solid
            rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          background: #f7f7f9;
          color: #1d1d1f;
          outline: none;
        }

        .tb-search input:focus {
          border-color: rgba(
            0,
            0,
            0,
            0.18
          );
          background: white;
        }

        .tb-member-list {
          display: grid;
        }

        .tb-member-row {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 15px 22px;
          border-bottom: 1px solid
            rgba(0, 0, 0, 0.045);
        }

        .tb-member-row:last-child {
          border-bottom: 0;
        }

        .tb-member-avatar {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e5e5ea;
          color: #3a3a3c;
          font-size: 12px;
          font-weight: 700;
        }

        .tb-member-copy {
          min-width: 0;
          flex: 1;
        }

        .tb-member-name {
          margin: 0;
          font-size: 13px;
          font-weight: 650;
        }

        .tb-member-meta {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-member-balance {
          text-align: right;
        }

        .tb-member-balance-label {
          margin: 0;
          color: #86868b;
          font-size: 10px;
        }

        .tb-member-balance-value {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 700;
        }

        .tb-activity-list {
          display: grid;
        }

        .tb-activity-row {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px 22px;
          border-bottom: 1px solid
            rgba(0, 0, 0, 0.045);
        }

        .tb-activity-row:last-child {
          border-bottom: 0;
        }

        .tb-activity-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #f2f2f7;
          color: #3a3a3c;
        }

        .tb-activity-copy {
          min-width: 0;
          flex: 1;
        }

        .tb-activity-title {
          margin: 0;
          font-size: 12px;
          font-weight: 650;
        }

        .tb-activity-description {
          margin: 3px 0 0;
          color: #86868b;
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tb-activity-right {
          flex: 0 0 auto;
          text-align: right;
        }

        .tb-activity-amount {
          margin: 0;
          font-size: 12px;
          font-weight: 700;
        }

        .tb-activity-date {
          margin: 3px 0 0;
          color: #86868b;
          font-size: 9px;
        }

        .tb-section-stack {
          display: grid;
          gap: 18px;
        }

        .tb-section-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 18px;
        }

        .tb-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          flex-wrap: wrap;
        }

        .tb-toolbar-left {
          min-width: 0;
        }

        .tb-toolbar-title {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          letter-spacing:
            -0.03em;
        }

        .tb-toolbar-text {
          margin: 5px 0 0;
          color: #86868b;
          font-size: 11px;
        }

        .tb-primary-button {
          border: 0;
          border-radius: 13px;
          padding: 11px 15px;
          background: #1d1d1f;
          color: white;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition:
            transform 0.18s ease,
            opacity 0.18s ease;
        }

        .tb-primary-button:hover {
          opacity: 0.9;
        }

        .tb-primary-button:active {
          transform: scale(
            0.97
          );
        }

        .tb-primary-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .tb-secondary-button {
          border: 1px solid
            rgba(0, 0, 0, 0.08);
          border-radius: 13px;
          padding: 10px 14px;
          background: white;
          color: #1d1d1f;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .tb-secondary-button:hover {
          background: #f7f7f9;
        }

        .tb-detail-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .tb-detail-card {
          padding: 15px;
          border-radius: 16px;
          background: #f7f7f9;
        }

        .tb-detail-label {
          margin: 0;
          color: #86868b;
          font-size: 10px;
        }

        .tb-detail-value {
          margin: 6px 0 0;
          font-size: 14px;
          font-weight: 700;
        }

        .tb-detail-value.large {
          font-size: 20px;
          letter-spacing:
            -0.025em;
        }

        .tb-divider {
          height: 1px;
          background: rgba(
            0,
            0,
            0,
            0.055
          );
          margin: 20px 0;
        }

        .tb-log-list {
          display: grid;
          gap: 10px;
        }

        .tb-log-item {
          display: flex;
          gap: 11px;
          padding: 12px;
          border-radius: 14px;
          background: #f7f7f9;
        }

        .tb-log-dot {
          width: 7px;
          height: 7px;
          flex: 0 0 auto;
          margin-top: 5px;
          border-radius: 50%;
          background: #6e6e73;
        }

        .tb-log-copy {
          min-width: 0;
        }

        .tb-log-description {
          margin: 0;
          font-size: 11px;
          line-height: 1.5;
        }

        .tb-log-date {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 9px;
        }

        .tb-file-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
        }

        .tb-file-card {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid
            rgba(0, 0, 0, 0.055);
          border-radius: 14px;
          background: white;
          text-decoration: none;
          color: #1d1d1f;
        }

        .tb-file-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #f2f2f7;
          color: #3a3a3c;
        }

        .tb-file-copy {
          min-width: 0;
        }

        .tb-file-name {
          margin: 0;
          font-size: 11px;
          font-weight: 650;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tb-file-meta {
          margin: 3px 0 0;
          color: #86868b;
          font-size: 9px;
        }

        .tb-withdrawal-list {
          display: grid;
        }

        .tb-withdrawal-row {
          padding: 17px 22px;
          border-bottom: 1px solid
            rgba(0, 0, 0, 0.045);
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .tb-withdrawal-row:last-child {
          border-bottom: 0;
        }

        .tb-withdrawal-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          background: #f2f2f7;
          color: #3a3a3c;
        }

        .tb-withdrawal-copy {
          min-width: 0;
          flex: 1;
        }

        .tb-withdrawal-title {
          margin: 0;
          font-size: 12px;
          font-weight: 650;
        }

        .tb-withdrawal-meta {
          margin: 4px 0 0;
          color: #86868b;
          font-size: 10px;
        }

        .tb-withdrawal-right {
          text-align: right;
          flex: 0 0 auto;
        }

        .tb-withdrawal-amount {
          margin: 0 0 5px;
          font-size: 13px;
          font-weight: 700;
        }

        .tb-account-card {
          display: grid;
          grid-template-columns:
            72px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
          padding: 24px;
        }

        .tb-account-avatar {
          width: 72px;
          height: 72px;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: #1d1d1f;
          color: white;
          font-size: 20px;
          font-weight: 700;
        }

        .tb-account-name {
          margin: 0;
          font-size: 23px;
          font-weight: 700;
          letter-spacing:
            -0.03em;
        }

        .tb-account-role {
          margin: 5px 0 0;
          color: #86868b;
          font-size: 12px;
        }

        .tb-account-info {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-top: 21px;
        }

        .tb-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(
            0,
            0,
            0,
            0.36
          );
          backdrop-filter: blur(
            8px
          );
        }

        .tb-modal {
          width: min(
            100%,
            520px
          );
          max-height: min(
            90vh,
            800px
          );
          overflow: auto;
          border-radius: 25px;
          background: white;
          box-shadow:
            0 30px 100px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .tb-modal-header {
          padding: 21px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          border-bottom: 1px solid
            rgba(0, 0, 0, 0.06);
        }

        .tb-modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing:
            -0.025em;
        }

        .tb-modal-body {
          padding: 22px;
        }

        .tb-form-group {
          margin-bottom: 16px;
        }

        .tb-form-label {
          display: block;
          margin-bottom: 7px;
          color: #3a3a3c;
          font-size: 11px;
          font-weight: 650;
        }

        .tb-form-input,
        .tb-form-select,
        .tb-form-textarea {
          width: 100%;
          border: 1px solid
            rgba(0, 0, 0, 0.1);
          border-radius: 13px;
          background: #f7f7f9;
          color: #1d1d1f;
          outline: none;
          transition:
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .tb-form-input,
        .tb-form-select {
          height: 44px;
          padding: 0 13px;
        }

        .tb-form-textarea {
          min-height: 100px;
          padding: 12px 13px;
          resize: vertical;
        }

        .tb-form-input:focus,
        .tb-form-select:focus,
        .tb-form-textarea:focus {
          border-color: rgba(
            0,
            0,
            0,
            0.22
          );
          background: white;
        }

        .tb-form-help {
          margin: 7px 0 0;
          color: #86868b;
          font-size: 10px;
          line-height: 1.5;
        }

        .tb-form-error {
          padding: 11px 12px;
          border-radius: 12px;
          background: #fff2f2;
          color: #b00020;
          font-size: 11px;
          line-height: 1.45;
          margin-bottom: 15px;
        }

        .tb-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 21px;
        }

        .tb-mobile-menu-button {
          display: none;
        }

        .tb-mobile-overlay {
          display: none;
        }

        @media (
          max-width: 1200px
        ) {
          .tb-stat-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .tb-grid-2 {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 900px
        ) {
          .tb-sidebar {
            transform: translateX(
              -100%
            );
            transition:
              transform 0.25s ease;
          }

          .tb-sidebar.mobile-open {
            transform: translateX(
              0
            );
          }

          .tb-mobile-overlay {
            position: fixed;
            inset: 0;
            z-index: 35;
            display: block;
            background: rgba(
              0,
              0,
              0,
              0.25
            );
            backdrop-filter: blur(
              4px
            );
          }

          .tb-main {
            margin-left: 0;
            padding-left: 18px;
            padding-right: 18px;
          }

          .tb-mobile-menu-button {
            display: grid;
            place-items: center;
            width: 39px;
            height: 39px;
            flex: 0 0 auto;
            border: 1px solid
              rgba(0, 0, 0, 0.06);
            border-radius: 12px;
            background: rgba(
              255,
              255,
              255,
              0.7
            );
            cursor: pointer;
          }

          .tb-topbar {
            gap: 10px;
          }

          .tb-topbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .tb-page-title {
            font-size: 22px;
          }

          .tb-welcome-title {
            font-size: 30px;
          }

          .tb-section-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .tb-main {
            padding-left: 12px;
            padding-right: 12px;
            padding-bottom: 30px;
          }

          .tb-topbar {
            min-height: 68px;
          }

          .tb-stat-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
            gap: 9px;
          }

          .tb-stat-card {
            padding: 15px;
            border-radius: 17px;
          }

          .tb-stat-value {
            font-size: 19px;
          }

          .tb-stat-label {
            font-size: 10px;
          }

          .tb-stat-caption {
            font-size: 9px;
          }

          .tb-welcome {
            margin-bottom: 18px;
          }

          .tb-welcome-title {
            font-size: 27px;
          }

          .tb-welcome-subtitle {
            font-size: 13px;
          }

          .tb-panel {
            border-radius: 19px;
          }

          .tb-panel-header {
            padding: 16px;
          }

          .tb-panel-body {
            padding: 16px;
          }

          .tb-balance-hero {
            grid-template-columns:
              1fr;
          }

          .tb-balance-value {
            font-size: 32px;
          }

          .tb-detail-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .tb-file-grid {
            grid-template-columns:
              1fr;
          }

          .tb-search {
            width: 100%;
          }

          .tb-member-row,
          .tb-activity-row,
          .tb-withdrawal-row {
            padding-left: 16px;
            padding-right: 16px;
          }

          .tb-member-balance {
            display: none;
          }

          .tb-trade-row {
            padding: 12px;
          }

          .tb-trade-right {
            display: none;
          }

          .tb-account-card {
            grid-template-columns:
              1fr;
            text-align: center;
          }

          .tb-account-avatar {
            margin: 0 auto;
          }

          .tb-account-info {
            grid-template-columns:
              1fr;
            text-align: left;
          }

          .tb-modal-backdrop {
            padding: 10px;
          }

          .tb-modal {
            border-radius: 20px;
          }
        }
      `}</style>

      <div className="tb-app">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="tb-mobile-overlay"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
          />
        )}

        <aside
          className={`tb-sidebar ${
            mobileMenuOpen
              ? "mobile-open"
              : ""
          }`}
        >
          <div className="tb-brand">
            <div className="tb-brand-mark">
              <TrendingUp
                size={20}
                strokeWidth={2.4}
              />
            </div>

            <div className="tb-brand-text">
              <p className="tb-brand-name">
                TradeBishi
              </p>
              <p className="tb-brand-caption">
                Smart investment
                management
              </p>
            </div>
          </div>

          <nav className="tb-nav">
            {navigationItems.map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`tb-nav-button ${
                      section ===
                      item.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setSection(
                        item.id
                      );
                      setMobileMenuOpen(
                        false
                      );
                    }}
                  >
                    <span className="tb-nav-icon">
                      <Icon
                        size={18}
                        strokeWidth={
                          section ===
                          item.id
                            ? 2.4
                            : 2
                        }
                      />
                    </span>

                    <span>
                      {item.label}
                    </span>
                  </button>
                );
              }
            )}
          </nav>

          <div className="tb-sidebar-spacer" />

          <div className="tb-sidebar-account">
            <div className="tb-mini-profile">
              <div className="tb-avatar">
                {memberInitials}
              </div>

              <div className="tb-mini-profile-copy">
                <p className="tb-mini-profile-name">
                  {memberName}
                </p>

                <p className="tb-mini-profile-role">
                  {normal(
                    profile?.role
                  ) ===
                  "trader"
                    ? "Trader"
                    : "Member"}
                </p>
              </div>

              <button
                type="button"
                className="tb-logout"
                onClick={
                  logout
                }
                aria-label="Sign out"
              >
                <LogOut
                  size={16}
                />
              </button>
            </div>
          </div>
        </aside>

        <main className="tb-main">
          <header className="tb-topbar">
            <div className="tb-topbar-left">
              <button
                type="button"
                className="tb-mobile-menu-button"
                onClick={() =>
                  setMobileMenuOpen(
                    true
                  )
                }
                aria-label="Open menu"
              >
                <Menu
                  size={19}
                />
              </button>

              <div>
                <p className="tb-eyebrow">
                  TradeBishi
                </p>

                <h1 className="tb-page-title">
                  {navigationItems.find(
                    (item) =>
                      item.id ===
                      section
                  )?.label ||
                    "Overview"}
                </h1>
              </div>
            </div>

            <div className="tb-topbar-actions">
              <button
                type="button"
                className="tb-icon-button"
                onClick={() =>
                  loadData(true)
                }
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "tb-refreshing"
                      : ""
                  }
                />
              </button>

              <button
                type="button"
                className="tb-icon-button"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell
                  size={16}
                />
              </button>
            </div>
          </header>

          <div className="tb-content">
            {section ===
              "overview" && (
              <>
                <section className="tb-welcome">
                  <h2 className="tb-welcome-title">
                    Good afternoon,{" "}
                    {firstName}.
                  </h2>

                  <p className="tb-welcome-subtitle">
                    Here is the latest
                    view of your
                    cooperative
                    participation,
                    balance and
                    trades.
                  </p>
                </section>

                <section className="tb-stat-grid">
                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <span className="tb-stat-label">
                        Your balance
                      </span>

                      <span className="tb-stat-icon">
                        <Wallet
                          size={16}
                        />
                      </span>
                    </div>

                    <p className="tb-stat-value">
                      {money(
                        memberBalance
                      )}
                    </p>

                    <p className="tb-stat-caption">
                      Available to
                      request
                      withdrawal
                    </p>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <span className="tb-stat-label">
                        Cooperative
                        balance
                      </span>

                      <span className="tb-stat-icon">
                        <CircleDollarSign
                          size={16}
                        />
                      </span>
                    </div>

                    <p className="tb-stat-value">
                      {money(
                        cooperativeBalance
                      )}
                    </p>

                    <p className="tb-stat-caption">
                      Shared
                      cooperative
                      funds
                    </p>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <span className="tb-stat-label">
                        Ongoing trades
                      </span>

                      <span className="tb-stat-icon">
                        <TrendingUp
                          size={16}
                        />
                      </span>
                    </div>

                    <p className="tb-stat-value">
                      {
                        activeTradeCount
                      }
                    </p>

                    <p className="tb-stat-caption">
                      Trades currently
                      active
                    </p>
                  </div>

                  <div className="tb-stat-card">
                    <div className="tb-stat-top">
                      <span className="tb-stat-label">
                        Expected profit
                      </span>

                      <span className="tb-stat-icon">
                        <Percent
                          size={16}
                        />
                      </span>
                    </div>

                    <p className="tb-stat-value">
                      {money(
                        expectedProfit
                      )}
                    </p>

                    <p className="tb-stat-caption">
                      From ongoing
                      trades
                    </p>
                  </div>
                </section>

                <section className="tb-grid-2">
                  <div className="tb-panel">
                    <div className="tb-panel-header">
                      <div className="tb-panel-title-wrap">
                        <h3 className="tb-panel-title">
                          Your balance
                        </h3>

                        <p className="tb-panel-subtitle">
                          Available member
                          capital after
                          active trade
                          commitments
                          and approved
                          withdrawals.
                        </p>
                      </div>
                    </div>

                    <div className="tb-panel-body">
                      <div className="tb-balance-hero">
                        <div className="tb-balance-main">
                          <p className="tb-balance-label">
                            Available
                            balance
                          </p>

                          <p className="tb-balance-value">
                            {money(
                              memberBalance
                            )}
                          </p>

                          <p className="tb-balance-caption">
                            This is the
                            amount currently
                            available for a
                            withdrawal
                            request.
                          </p>
                        </div>

                        <div className="tb-balance-side">
                          <div className="tb-mini-stat">
                            <p className="tb-mini-stat-label">
                              Participating
                              capital
                            </p>

                            <p className="tb-mini-stat-value">
                              {money(
                                totalParticipatedCapital
                              )}
                            </p>
                          </div>

                          <div className="tb-mini-stat">
                            <p className="tb-mini-stat-label">
                              Closed trades
                            </p>

                            <p className="tb-mini-stat-value">
                              {
                                closedTradeCount
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tb-panel">
                    <div className="tb-panel-header">
                      <div className="tb-panel-title-wrap">
                        <h3 className="tb-panel-title">
                          Ongoing trades
                        </h3>

                        <p className="tb-panel-subtitle">
                          Your active
                          trade
                          participation.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="tb-secondary-button"
                        onClick={() =>
                          setSection(
                            "trades"
                          )
                        }
                      >
                        View all
                        <ChevronRight
                          size={14}
                        />
                      </button>
                    </div>

                    <div className="tb-panel-body">
                      {ongoingTrades.length ===
                      0 ? (
                        <div className="tb-empty">
                          <div className="tb-empty-icon">
                            <BarChart3
                              size={
                                19
                              }
                            />
                          </div>

                          <p className="tb-empty-title">
                            No ongoing
                            trades
                          </p>

                          <p className="tb-empty-text">
                            When you
                            participate
                            in an active
                            trade, it
                            will appear
                            here.
                          </p>
                        </div>
                      ) : (
                        <div className="tb-trade-list">
                          {ongoingTrades
                            .slice(
                              0,
                              5
                            )
                            .map(
                              ({
                                trade,
                                participation,
                              }) => (
                                <button
                                  key={
                                    trade.id
                                  }
                                  type="button"
                                  className="tb-trade-row"
                                  onClick={() => {
                                    setSelectedTradeId(
                                      trade.id
                                    );
                                    setSection(
                                      "trades"
                                    );
                                  }}
                                >
                                  <span className="tb-trade-symbol">
                                    <TrendingUp
                                      size={
                                        18
                                      }
                                    />
                                  </span>

                                  <span className="tb-trade-main">
                                    <p className="tb-trade-name">
                                      {
                                        trade.trade_name
                                      }
                                    </p>

                                    <p className="tb-trade-meta">
                                      Invested{" "}
                                      {money(
                                        participation.invested_amount
                                      )}{" "}
                                      ·{" "}
                                      {dateLabel(
                                        trade.trade_date
                                      )}
                                    </p>
                                  </span>

                                  <span className="tb-trade-right">
                                    <span
                                      className={statusClass(
                                        trade.status,
                                        trade.is_closed
                                      )}
                                    >
                                      {statusLabel(
                                        trade.status,
                                        trade.is_closed
                                      )}
                                    </span>

                                    <p className="tb-trade-return">
                                      Expected{" "}
                                      {money(
                                        trade.approx_return
                                      )}
                                    </p>
                                  </span>
                                </button>
                              )
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {closedTrades.length >
                  0 && (
                  <section
                    className="tb-panel"
                    style={{
                      marginTop:
                        18,
                    }}
                  >
                    <div className="tb-panel-header">
                      <div className="tb-panel-title-wrap">
                        <h3 className="tb-panel-title">
                          Closed trades
                        </h3>

                        <p className="tb-panel-subtitle">
                          Trades that
                          have been
                          completed or
                          closed are
                          shown here
                          separately
                          from ongoing
                          trades.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="tb-secondary-button"
                        onClick={() =>
                          setSection(
                            "trades"
                          )
                        }
                      >
                        View trades
                        <ChevronRight
                          size={14}
                        />
                      </button>
                    </div>

                    <div className="tb-panel-body">
                      <div className="tb-trade-list">
                        {closedTrades.map(
                          ({
                            trade,
                            participation,
                          }) => (
                            <button
                              key={
                                trade.id
                              }
                              type="button"
                              className="tb-trade-row"
                              onClick={() =>
                                setSelectedTradeId(
                                  trade.id
                                )
                              }
                            >
                              <span className="tb-trade-symbol">
                                <CheckCircle2
                                  size={
                                    18
                                  }
                                />
                              </span>

                              <span className="tb-trade-main">
                                <p className="tb-trade-name">
                                  {
                                    trade.trade_name
                                  }
                                </p>

                                <p className="tb-trade-meta">
                                  Invested{" "}
                                  {money(
                                    participation.invested_amount
                                  )}{" "}
                                  · Closed{" "}
                                  {dateLabel(
                                    trade.trade_date
                                  )}
                                </p>
                              </span>

                              <span className="tb-trade-right">
                                <span
                                  className={statusClass(
                                    trade.status,
                                    true
                                  )}
                                >
                                  {statusLabel(
                                    trade.status,
                                    true
                                  )}
                                </span>

                                <p className="tb-trade-return">
                                  Trade return{" "}
                                  {money(
                                    trade.approx_return
                                  )}
                                </p>
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <section
                  className="tb-section-grid"
                  style={{
                    marginTop:
                      18,
                  }}
                >
                  <div className="tb-panel">
                    <div className="tb-panel-header">
                      <div className="tb-panel-title-wrap">
                        <h3 className="tb-panel-title">
                          Recent activity
                        </h3>

                        <p className="tb-panel-subtitle">
                          Latest cooperative
                          ledger activity.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="tb-secondary-button"
                        onClick={() =>
                          setSection(
                            "activity"
                          )
                        }
                      >
                        See all
                        <ChevronRight
                          size={14}
                        />
                      </button>
                    </div>

                    <div className="tb-activity-list">
                      {recentActivity.length ===
                      0 ? (
                        <div className="tb-empty">
                          <div className="tb-empty-icon">
                            <Activity
                              size={
                                19
                              }
                            />
                          </div>

                          <p className="tb-empty-title">
                            No activity
                            yet
                          </p>

                          <p className="tb-empty-text">
                            Cooperative
                            deposits,
                            withdrawals
                            and other
                            activities
                            will appear
                            here.
                          </p>
                        </div>
                      ) : (
                        recentActivity.map(
                          (item) => {
                            const type =
                              normal(
                                item.type
                              );

                            const isIncoming =
                              type ===
                                "deposit" ||
                              type ===
                                "trade_return";

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="tb-activity-row"
                              >
                                <div className="tb-activity-icon">
                                  {isIncoming ? (
                                    <ArrowDownLeft
                                      size={
                                        17
                                      }
                                    />
                                  ) : (
                                    <ArrowUpRight
                                      size={
                                        17
                                      }
                                    />
                                  )}
                                </div>

                                <div className="tb-activity-copy">
                                  <p className="tb-activity-title">
                                    {type ===
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
                                      : item.type}
                                  </p>

                                  <p className="tb-activity-description">
                                    {item.description ||
                                      "Cooperative activity"}
                                  </p>
                                </div>

                                <div className="tb-activity-right">
                                  <p className="tb-activity-amount">
                                    {isIncoming
                                      ? "+"
                                      : "-"}
                                    {money(
                                      item.amount
                                    )}
                                  </p>

                                  <p className="tb-activity-date">
                                    {dateTimeLabel(
                                      item.created_at
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </div>

                  <div className="tb-panel">
                    <div className="tb-panel-header">
                      <div className="tb-panel-title-wrap">
                        <h3 className="tb-panel-title">
                          Cooperative
                          snapshot
                        </h3>

                        <p className="tb-panel-subtitle">
                          Global figures
                          shared across
                          all members.
                        </p>
                      </div>
                    </div>

                    <div className="tb-panel-body">
                      <div className="tb-detail-grid">
                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Total deposits
                          </p>

                          <p className="tb-detail-value">
                            {money(
                              totalCooperativeDeposits
                            )}
                          </p>
                        </div>

                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Withdrawals
                          </p>

                          <p className="tb-detail-value">
                            {money(
                              totalCooperativeWithdrawals
                            )}
                          </p>
                        </div>

                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Other activity
                          </p>

                          <p className="tb-detail-value">
                            {money(
                              totalCooperativeOther
                            )}
                          </p>
                        </div>

                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Members
                          </p>

                          <p className="tb-detail-value">
                            {
                              correctedMembers.length
                            }
                          </p>
                        </div>
                      </div>

                      <div className="tb-divider" />

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "space-between",
                          gap: 15,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin:
                                0,
                              color:
                                "#86868b",
                              fontSize:
                                11,
                            }}
                          >
                            Global
                            cooperative
                            balance
                          </p>

                          <p
                            style={{
                              margin:
                                "5px 0 0",
                              fontSize:
                                24,
                              fontWeight:
                                700,
                              letterSpacing:
                                "-0.035em",
                            }}
                          >
                            {money(
                              cooperativeBalance
                            )}
                          </p>
                        </div>

                        <ShieldCheck
                          size={28}
                          strokeWidth={
                            1.7
                          }
                          color="#6e6e73"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {section ===
              "members" && (
              <section className="tb-section-stack">
                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h2 className="tb-panel-title">
                        Cooperative
                        members
                      </h2>

                      <p className="tb-panel-subtitle">
                        Member balances
                        are calculated
                        consistently from
                        the cooperative
                        ledger.
                      </p>
                    </div>

                    <div className="tb-search">
                      <Search
                        size={15}
                      />

                      <input
                        value={
                          searchQuery
                        }
                        onChange={(event) =>
                          setSearchQuery(
                            event.target
                              .value
                          )
                        }
                        placeholder="Search members"
                        aria-label="Search members"
                      />
                    </div>
                  </div>

                  <div className="tb-member-list">
                    {filteredMembers.length ===
                    0 ? (
                      <div className="tb-empty">
                        <div className="tb-empty-icon">
                          <Users
                            size={19}
                          />
                        </div>

                        <p className="tb-empty-title">
                          No members
                          found
                        </p>

                        <p className="tb-empty-text">
                          Try a different
                          search.
                        </p>
                      </div>
                    ) : (
                      filteredMembers.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="tb-member-row"
                          >
                            <div className="tb-member-avatar">
                              {initials(
                                item.full_name
                              )}
                            </div>

                            <div className="tb-member-copy">
                              <p className="tb-member-name">
                                {
                                  item.full_name
                                }
                              </p>

                              <p className="tb-member-meta">
                                {item.phone ||
                                  "No phone number"}
                                {item.status
                                  ? ` · ${item.status}`
                                  : ""}
                              </p>
                            </div>

                            <div className="tb-member-balance">
                              <p className="tb-member-balance-label">
                                Available
                                balance
                              </p>

                              <p className="tb-member-balance-value">
                                {money(
                                  item.balance
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </section>
            )}

            {section ===
              "activity" && (
              <section className="tb-section-stack">
                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h2 className="tb-panel-title">
                        Cooperative
                        activity
                      </h2>

                      <p className="tb-panel-subtitle">
                        Deposits,
                        withdrawals,
                        trade returns,
                        expenses and
                        development/service
                        fees.
                      </p>
                    </div>
                  </div>

                  <div className="tb-activity-list">
                    {transactions.length ===
                    0 ? (
                      <div className="tb-empty">
                        <div className="tb-empty-icon">
                          <History
                            size={19}
                          />
                        </div>

                        <p className="tb-empty-title">
                          No activity
                        </p>

                        <p className="tb-empty-text">
                          There is no
                          cooperative
                          activity to
                          display yet.
                        </p>
                      </div>
                    ) : (
                      transactions
                        .slice()
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            new Date(
                              b.created_at
                            ).getTime() -
                            new Date(
                              a.created_at
                            ).getTime()
                        )
                        .map(
                          (item) => {
                            const type =
                              normal(
                                item.type
                              );

                            const isIncoming =
                              type ===
                                "deposit" ||
                              type ===
                                "trade_return";

                            return (
                              <div
                                key={
                                  item.id
                                }
                                className="tb-activity-row"
                              >
                                <div className="tb-activity-icon">
                                  {isIncoming ? (
                                    <ArrowDownLeft
                                      size={
                                        17
                                      }
                                    />
                                  ) : (
                                    <ArrowUpRight
                                      size={
                                        17
                                      }
                                    />
                                  )}
                                </div>

                                <div className="tb-activity-copy">
                                  <p className="tb-activity-title">
                                    {type ===
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
                                      : item.type}
                                  </p>

                                  <p className="tb-activity-description">
                                    {item.description ||
                                      "No description"}
                                  </p>
                                </div>

                                <div className="tb-activity-right">
                                  <p className="tb-activity-amount">
                                    {isIncoming
                                      ? "+"
                                      : "-"}
                                    {money(
                                      item.amount
                                    )}
                                  </p>

                                  <p className="tb-activity-date">
                                    {dateTimeLabel(
                                      item.created_at
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )
                    )}
                  </div>
                </div>
              </section>
            )}

            {section ===
              "trades" && (
              <section className="tb-section-stack">
                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h2 className="tb-panel-title">
                        Your trades
                      </h2>

                      <p className="tb-panel-subtitle">
                        Ongoing and
                        completed trade
                        participation
                        associated with
                        your member
                        account.
                      </p>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: 8,
                        flexWrap:
                          "wrap",
                        justifyContent:
                          "flex-end",
                      }}
                    >
                      <span className="tb-status tb-status-ongoing">
                        {
                          activeTradeCount
                        }{" "}
                        ongoing
                      </span>

                      <span className="tb-status tb-status-closed">
                        {
                          closedTradeCount
                        }{" "}
                        closed
                      </span>
                    </div>
                  </div>

                  <div className="tb-panel-body">
                    {participatingTrades.length ===
                    0 ? (
                      <div className="tb-empty">
                        <div className="tb-empty-icon">
                          <BarChart3
                            size={19}
                          />
                        </div>

                        <p className="tb-empty-title">
                          No trade
                          participation
                        </p>

                        <p className="tb-empty-text">
                          Trades assigned
                          to your member
                          account will
                          appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="tb-trade-list">
                        {participatingTrades.map(
                          ({
                            trade,
                            participation,
                          }) => (
                            <button
                              key={
                                trade.id
                              }
                              type="button"
                              className="tb-trade-row"
                              onClick={() =>
                                setSelectedTradeId(
                                  trade.id
                                )
                              }
                            >
                              <span className="tb-trade-symbol">
                                {trade.is_closed ? (
                                  <CheckCircle2
                                    size={
                                      18
                                    }
                                  />
                                ) : (
                                  <TrendingUp
                                    size={
                                      18
                                    }
                                  />
                                )}
                              </span>

                              <span className="tb-trade-main">
                                <p className="tb-trade-name">
                                  {
                                    trade.trade_name
                                  }
                                </p>

                                <p className="tb-trade-meta">
                                  Your
                                  investment{" "}
                                  {money(
                                    participation.invested_amount
                                  )}{" "}
                                  ·{" "}
                                  {dateLabel(
                                    trade.trade_date
                                  )}
                                </p>
                              </span>

                              <span className="tb-trade-right">
                                <span
                                  className={statusClass(
                                    trade.status,
                                    trade.is_closed
                                  )}
                                >
                                  {statusLabel(
                                    trade.status,
                                    trade.is_closed
                                  )}
                                </span>

                                <p className="tb-trade-return">
                                  Expected return{" "}
                                  {money(
                                    trade.approx_return
                                  )}
                                </p>
                              </span>

                              <ChevronRight
                                size={
                                  15
                                }
                                color="#86868b"
                              />
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {section ===
              "withdrawals" && (
              <section className="tb-section-stack">
                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h2 className="tb-panel-title">
                        Withdrawals
                      </h2>

                      <p className="tb-panel-subtitle">
                        Request a
                        withdrawal from
                        your available
                        member balance.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="tb-primary-button"
                      onClick={() => {
                        setWithdrawalError(
                          null
                        );
                        setShowWithdrawalModal(
                          true
                        );
                      }}
                    >
                      <ArrowUpRight
                        size={15}
                      />
                      Request
                      withdrawal
                    </button>
                  </div>

                  <div className="tb-panel-body">
                    <div className="tb-detail-grid">
                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Available
                          balance
                        </p>

                        <p className="tb-detail-value large">
                          {money(
                            memberBalance
                          )}
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Pending
                          requests
                        </p>

                        <p className="tb-detail-value large">
                          {
                            withdrawals.filter(
                              (
                                item
                              ) =>
                                normal(
                                  item.status
                                ) ===
                                "pending"
                            ).length
                          }
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Total
                          approved
                        </p>

                        <p className="tb-detail-value large">
                          {money(
                            withdrawals
                              .filter(
                                (
                                  item
                                ) =>
                                  normal(
                                    item.status
                                  ) ===
                                    "approved" ||
                                  normal(
                                    item.status
                                  ) ===
                                    "completed"
                              )
                              .reduce(
                                (
                                  sum,
                                  item
                                ) =>
                                  sum +
                                  Number(
                                    item.amount ||
                                      0
                                  ),
                                0
                              )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="tb-withdrawal-list">
                    {withdrawals.length ===
                    0 ? (
                      <div className="tb-empty">
                        <div className="tb-empty-icon">
                          <Banknote
                            size={19}
                          />
                        </div>

                        <p className="tb-empty-title">
                          No withdrawal
                          requests
                        </p>

                        <p className="tb-empty-text">
                          Your withdrawal
                          history will
                          appear here
                          after you submit
                          a request.
                        </p>
                      </div>
                    ) : (
                      withdrawals.map(
                        (item) => (
                          <div
                            key={
                              item.id
                            }
                            className="tb-withdrawal-row"
                          >
                            <div className="tb-withdrawal-icon">
                              <Banknote
                                size={
                                  17
                                }
                              />
                            </div>

                            <div className="tb-withdrawal-copy">
                              <p className="tb-withdrawal-title">
                                {money(
                                  item.amount
                                )}
                              </p>

                              <p className="tb-withdrawal-meta">
                                {
                                  item.method
                                }{" "}
                                · Requested{" "}
                                {dateTimeLabel(
                                  item.created_at
                                )}
                              </p>
                            </div>

                            <div className="tb-withdrawal-right">
                              <span
                                className={`tb-status ${
                                  normal(
                                    item.status
                                  ) ===
                                  "pending"
                                    ? "tb-status-ongoing"
                                    : normal(
                                        item.status
                                      ) ===
                                      "rejected"
                                    ? "tb-status-failed"
                                    : "tb-status-success"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              </section>
            )}

            {section ===
              "account" && (
              <section className="tb-section-stack">
                <div className="tb-panel">
                  <div className="tb-account-card">
                    <div className="tb-account-avatar">
                      {
                        memberInitials
                      }
                    </div>

                    <div>
                      <h2 className="tb-account-name">
                        {memberName}
                      </h2>

                      <p className="tb-account-role">
                        {normal(
                          profile?.role
                        ) ===
                        "trader"
                          ? "Trader account"
                          : "Member account"}
                      </p>

                      <div className="tb-account-info">
                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Member
                            balance
                          </p>

                          <p className="tb-detail-value">
                            {money(
                              memberBalance
                            )}
                          </p>
                        </div>

                        <div className="tb-detail-card">
                          <p className="tb-detail-label">
                            Cooperative
                            balance
                          </p>

                          <p className="tb-detail-value">
                            {money(
                              cooperativeBalance
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h3 className="tb-panel-title">
                        Account
                        information
                      </h3>

                      <p className="tb-panel-subtitle">
                        Your TradeBishi
                        profile and
                        membership
                        details.
                      </p>
                    </div>
                  </div>

                  <div className="tb-panel-body">
                    <div className="tb-detail-grid">
                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Full name
                        </p>

                        <p className="tb-detail-value">
                          {memberName}
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Phone
                        </p>

                        <p className="tb-detail-value">
                          {member?.phone ||
                            "Not provided"}
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Member since
                        </p>

                        <p className="tb-detail-value">
                          {dateLabel(
                            member?.created_at
                          )}
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Status
                        </p>

                        <p className="tb-detail-value">
                          {member?.status ||
                            "Active"}
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Profit share
                        </p>

                        <p className="tb-detail-value">
                          {Number(
                            member?.profit_share ||
                              0
                          )}
                          %
                        </p>
                      </div>

                      <div className="tb-detail-card">
                        <p className="tb-detail-label">
                          Legacy
                          investment
                        </p>

                        <p className="tb-detail-value">
                          {money(
                            member?.investment_amount
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tb-panel">
                  <div className="tb-panel-header">
                    <div className="tb-panel-title-wrap">
                      <h3 className="tb-panel-title">
                        Security
                      </h3>

                      <p className="tb-panel-subtitle">
                        Your account is
                        protected by
                        Supabase
                        authentication.
                      </p>
                    </div>
                  </div>

                  <div className="tb-panel-body">
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 13,
                      }}
                    >
                      <div className="tb-activity-icon">
                        <ShieldCheck
                          size={
                            19
                          }
                        />
                      </div>

                      <div>
                        <p
                          style={{
                            margin:
                              0,
                            fontSize:
                              13,
                            fontWeight:
                              650,
                          }}
                        >
                          Account
                          authenticated
                        </p>

                        <p
                          style={{
                            margin:
                              "4px 0 0",
                            color:
                              "#86868b",
                            fontSize:
                              10,
                          }}
                        >
                          You are
                          securely
                          signed in to
                          TradeBishi.
                        </p>
                      </div>
                    </div>

                    <div className="tb-divider" />

                    <button
                      type="button"
                      className="tb-secondary-button"
                      onClick={
                        logout
                      }
                    >
                      <LogOut
                        size={15}
                      />
                      Sign out
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {selectedTrade && (
          <div
            className="tb-modal-backdrop"
            onClick={() =>
              setSelectedTradeId(
                null
              )
            }
          >
            <section
              className="tb-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="tb-modal-header">
                <div>
                  <h2 className="tb-modal-title">
                    {
                      selectedTrade
                        .trade
                        .trade_name
                    }
                  </h2>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      color:
                        "#86868b",
                      fontSize:
                        10,
                    }}
                  >
                    Trade details
                  </p>
                </div>

                <button
                  type="button"
                  className="tb-icon-button"
                  onClick={() =>
                    setSelectedTradeId(
                      null
                    )
                  }
                  aria-label="Close"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>

              <div className="tb-modal-body">
                <div className="tb-detail-grid">
                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Status
                    </p>

                    <p className="tb-detail-value">
                      {statusLabel(
                        selectedTrade
                          .trade
                          .status,
                        selectedTrade
                          .trade
                          .is_closed
                      )}
                    </p>
                  </div>

                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Your investment
                    </p>

                    <p className="tb-detail-value">
                      {money(
                        selectedTrade
                          .participation
                          .invested_amount
                      )}
                    </p>
                  </div>

                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Expected return
                    </p>

                    <p className="tb-detail-value">
                      {money(
                        selectedTrade
                          .trade
                          .approx_return
                      )}
                    </p>
                  </div>

                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Trade date
                    </p>

                    <p className="tb-detail-value">
                      {dateLabel(
                        selectedTrade
                          .trade
                          .trade_date
                      )}
                    </p>
                  </div>

                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Total trade
                      investment
                    </p>

                    <p className="tb-detail-value">
                      {money(
                        selectedTrade
                          .trade
                          .invested_amount
                      )}
                    </p>
                  </div>

                  <div className="tb-detail-card">
                    <p className="tb-detail-label">
                      Closed
                    </p>

                    <p className="tb-detail-value">
                      {selectedTrade
                        .trade
                        .is_closed
                        ? "Yes"
                        : "No"}
                    </p>
                  </div>
                </div>

                {selectedTrade.trade
                  .notes && (
                  <>
                    <div className="tb-divider" />

                    <div>
                      <p
                        style={{
                          margin:
                            "0 0 7px",
                          color:
                            "#86868b",
                          fontSize:
                            10,
                          fontWeight:
                            650,
                        }}
                      >
                        Notes
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            12,
                          lineHeight:
                            1.6,
                        }}
                      >
                        {
                          selectedTrade
                            .trade
                            .notes
                        }
                      </p>
                    </div>
                  </>
                )}

                <div className="tb-divider" />

                <div>
                  <p
                    style={{
                      margin:
                        "0 0 10px",
                      fontSize:
                        13,
                      fontWeight:
                        700,
                    }}
                  >
                    Trade log
                  </p>

                  {selectedTradeLogs.length ===
                  0 ? (
                    <div className="tb-empty">
                      <div className="tb-empty-icon">
                        <History
                          size={
                            18
                          }
                        />
                      </div>

                      <p className="tb-empty-title">
                        No trade log
                        entries
                      </p>
                    </div>
                  ) : (
                    <div className="tb-log-list">
                      {selectedTradeLogs.map(
                        (log) => (
                          <div
                            key={
                              log.id
                            }
                            className="tb-log-item"
                          >
                            <span className="tb-log-dot" />

                            <div className="tb-log-copy">
                              <p className="tb-log-description">
                                {
                                  log.description
                                }
                              </p>

                              <p className="tb-log-date">
                                {dateTimeLabel(
                                  log.created_at
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                <div className="tb-divider" />

                <div>
                  <p
                    style={{
                      margin:
                        "0 0 10px",
                      fontSize:
                        13,
                      fontWeight:
                        700,
                    }}
                  >
                    Trade files
                  </p>

                  {selectedTradeFiles.length ===
                  0 ? (
                    <div className="tb-empty">
                      <div className="tb-empty-icon">
                        <FolderOpen
                          size={
                            18
                          }
                        />
                      </div>

                      <p className="tb-empty-title">
                        No files
                        uploaded
                      </p>

                      <p className="tb-empty-text">
                        Agreements,
                        receipts and
                        proof files
                        will appear
                        here when
                        uploaded by
                        the admin.
                      </p>
                    </div>
                  ) : (
                    <div className="tb-file-grid">
                      {selectedTradeFiles.map(
                        (file) => (
                          <a
                            key={
                              file.id
                            }
                            href={
                              file.file_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="tb-file-card"
                          >
                            <span className="tb-file-icon">
                              {normal(
                                file.category
                              ).includes(
                                "image"
                              ) ? (
                                <FileImage
                                  size={
                                    17
                                  }
                                />
                              ) : (
                                <FileText
                                  size={
                                    17
                                  }
                                />
                              )}
                            </span>

                            <span className="tb-file-copy">
                              <p className="tb-file-name">
                                {file.category ||
                                  "Trade file"}
                              </p>

                              <p className="tb-file-meta">
                                {dateTimeLabel(
                                  file.created_at
                                )}
                              </p>
                            </span>
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {showWithdrawalModal && (
          <div
            className="tb-modal-backdrop"
            onClick={() => {
              if (
                !withdrawalSubmitting
              ) {
                setShowWithdrawalModal(
                  false
                );
              }
            }}
          >
            <section
              className="tb-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="tb-modal-header">
                <div>
                  <h2 className="tb-modal-title">
                    Request
                    withdrawal
                  </h2>

                  <p
                    style={{
                      margin:
                        "4px 0 0",
                      color:
                        "#86868b",
                      fontSize:
                        10,
                    }}
                  >
                    Available balance:{" "}
                    {money(
                      memberBalance
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className="tb-icon-button"
                  onClick={() =>
                    setShowWithdrawalModal(
                      false
                    )
                  }
                  disabled={
                    withdrawalSubmitting
                  }
                  aria-label="Close"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>

              <div className="tb-modal-body">
                {withdrawalError && (
                  <div className="tb-form-error">
                    {withdrawalError}
                  </div>
                )}

                <div className="tb-form-group">
                  <label className="tb-form-label">
                    Amount
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="tb-form-input"
                    value={
                      withdrawalAmount
                    }
                    onChange={(event) =>
                      setWithdrawalAmount(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter amount"
                    disabled={
                      withdrawalSubmitting
                    }
                  />

                  <p className="tb-form-help">
                    Maximum available:
                    {" "}
                    {money(
                      memberBalance
                    )}
                  </p>
                </div>

                <div className="tb-form-group">
                  <label className="tb-form-label">
                    Withdrawal method
                  </label>

                  <select
                    className="tb-form-select"
                    value={
                      withdrawalMethod
                    }
                    onChange={(event) =>
                      setWithdrawalMethod(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      withdrawalSubmitting
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
                  <label className="tb-form-label">
                    Account details
                  </label>

                  <textarea
                    className="tb-form-textarea"
                    value={
                      withdrawalDetails
                    }
                    onChange={(event) =>
                      setWithdrawalDetails(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter the account/UPI details where the amount should be sent."
                    disabled={
                      withdrawalSubmitting
                    }
                  />

                  <p className="tb-form-help">
                    Provide the
                    details required
                    for the admin to
                    process the
                    withdrawal.
                  </p>
                </div>

                <div className="tb-modal-actions">
                  <button
                    type="button"
                    className="tb-secondary-button"
                    onClick={() =>
                      setShowWithdrawalModal(
                        false
                      )
                    }
                    disabled={
                      withdrawalSubmitting
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="tb-primary-button"
                    onClick={
                      submitWithdrawal
                    }
                    disabled={
                      withdrawalSubmitting
                    }
                  >
                    {withdrawalSubmitting ? (
                      <>
                        <RefreshCw
                          size={
                            14
                          }
                          className="tb-refreshing"
                        />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Check
                          size={
                            14
                          }
                        />
                        Submit request
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}