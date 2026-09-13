import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MEMBER_SELECT =
  "id,user_id,full_name,phone,investment_amount,profit_share,status,created_at";

const TRADE_SELECT =
  "id,trade_name,invested_amount,approx_return,status,trade_date,notes,trader_id,is_closed";

type AnyRecord = Record<string, unknown>;

function number(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function normal(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function validTransactionStatus(status: unknown): boolean {
  return normal(status) !== "rejected";
}

function approvedWithdrawalStatus(status: unknown): boolean {
  const value = normal(status);
  return value === "approved" || value === "completed";
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment variables are missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

function calculateMemberBalance(
  memberId: string,
  transactions: AnyRecord[],
  withdrawals: AnyRecord[],
  trades: AnyRecord[],
  tradeMembers: AnyRecord[]
): number {
  /*
   * TradeBishi balance rule:
   *
   * AVAILABLE BALANCE =
   *
   * approved deposits
   * + closed successful trade returns
   * + explicit trade_return transactions
   * - approved/completed withdrawals
   * - money currently committed to ongoing trades
   *
   * IMPORTANT:
   * members.investment_amount is NOT used as available money.
   */

  const deposits = transactions
    .filter(
      (transaction) =>
        String(transaction.member_id) === memberId &&
        normal(transaction.type) === "deposit" &&
        validTransactionStatus(transaction.status)
    )
    .reduce(
      (sum, transaction) =>
        sum + number(transaction.amount),
      0
    );

  const explicitReturns = transactions
    .filter(
      (transaction) =>
        String(transaction.member_id) === memberId &&
        normal(transaction.type) === "trade_return" &&
        validTransactionStatus(transaction.status)
    )
    .reduce(
      (sum, transaction) =>
        sum + number(transaction.amount),
      0
    );

  const memberWithdrawals = withdrawals
    .filter(
      (withdrawal) =>
        String(withdrawal.member_id) === memberId &&
        approvedWithdrawalStatus(withdrawal.status)
    )
    .reduce(
      (sum, withdrawal) =>
        sum + number(withdrawal.amount),
      0
    );

  const memberTradeRows = tradeMembers.filter(
    (row) =>
      String(row.member_id) === memberId
  );

  let ongoingCommitment = 0;
  let calculatedClosedReturn = 0;

  for (const row of memberTradeRows) {
    const trade = trades.find(
      (item) =>
        String(item.id) === String(row.trade_id)
    );

    if (!trade) continue;

    const contribution = number(
      row.invested_amount
    );

    const tradeInvestment = number(
      trade.invested_amount
    );

    const tradeReturn = number(
      trade.approx_return
    );

    const status = normal(trade.status);

    const closed = Boolean(trade.is_closed);

    if (
      status === "ongoing" &&
      !closed
    ) {
      ongoingCommitment += contribution;
      continue;
    }

    /*
     * When Admin closes a successful trade,
     * the existing Admin dashboard calculates
     * each member's return proportionally from
     * trade_members.invested_amount.
     *
     * We mirror the exact same calculation here.
     */
    if (
      status === "successful" &&
      closed &&
      tradeInvestment > 0
    ) {
      const share =
        contribution / tradeInvestment;

      calculatedClosedReturn +=
        tradeReturn * share;
    }
  }

  /*
   * If an explicit trade_return transaction
   * already exists, do not add the calculated
   * closed-trade return again.
   *
   * Current TradeBishi distribution does not
   * create these transactions, so currently
   * calculatedClosedReturn is what credits
   * the member after a trade is closed.
   */

  const balance =
    deposits +
    explicitReturns +
    calculatedClosedReturn -
    memberWithdrawals -
    ongoingCommitment;

  return Math.max(0, balance);
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const adminSupabase = getAdminSupabase();

    const [
      profileResult,
      memberResult,
      membersResult,
      transactionsResult,
      withdrawalsResult,
      tradesResult,
      tradeMembersResult,
      tradeFilesResult,
      tradeLogsResult,
    ] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id,full_name,role")
        .eq("id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("members")
        .select(MEMBER_SELECT)
        .eq("user_id", user.id)
        .maybeSingle(),

      adminSupabase
        .from("members")
        .select(MEMBER_SELECT)
        .order("full_name", {
          ascending: true,
        }),

      adminSupabase
        .from("transactions")
        .select(
          "id,member_id,type,amount,description,status,created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      adminSupabase
        .from("withdrawals")
        .select(
          "id,member_id,amount,method,account_details,status,reviewed_by,reviewed_at,created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      adminSupabase
        .from("trades")
        .select(TRADE_SELECT)
        .order("trade_date", {
          ascending: false,
        }),

      adminSupabase
        .from("trade_members")
        .select(
          "id,trade_id,member_id,invested_amount,created_at"
        )
        .order("created_at", {
          ascending: true,
        }),

      adminSupabase
        .from("trade_files")
        .select(
          "id,trade_id,category,file_url,created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      adminSupabase
        .from("trade_logs")
        .select(
          "id,trade_id,description,created_at"
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    const results = [
      profileResult,
      memberResult,
      membersResult,
      transactionsResult,
      withdrawalsResult,
      tradesResult,
      tradeMembersResult,
      tradeFilesResult,
      tradeLogsResult,
    ];

    const failed = results.find(
      (result) => result.error
    );

    if (failed?.error) {
      console.error(
        "TradeBishi member dashboard query error:",
        failed.error
      );

      return NextResponse.json(
        {
          error:
            "TradeBishi could not load dashboard data.",
          details: failed.error.message,
        },
        {
          status: 500,
        }
      );
    }

    const profile =
      (profileResult.data as AnyRecord | null) ??
      null;

    const member =
      (memberResult.data as AnyRecord | null) ??
      null;

    const allMembers =
      (membersResult.data ?? []) as AnyRecord[];

    const transactions =
      (transactionsResult.data ?? []) as AnyRecord[];

    const withdrawals =
      (withdrawalsResult.data ?? []) as AnyRecord[];

    const trades =
      (tradesResult.data ?? []) as AnyRecord[];

    const tradeMembers =
      (tradeMembersResult.data ?? []) as AnyRecord[];

    const tradeFiles =
      (tradeFilesResult.data ?? []) as AnyRecord[];

    const tradeLogs =
      (tradeLogsResult.data ?? []) as AnyRecord[];

    const role = normal(profile?.role);

    if (
      !member &&
      role !== "trader"
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is authenticated, but no TradeBishi member profile is linked to it.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Calculate every member's balance.
     */
    const membersWithBalances =
      allMembers.map((item) => ({
        ...item,
        balance: calculateMemberBalance(
          String(item.id),
          transactions,
          withdrawals,
          trades,
          tradeMembers
        ),
      }));

    /*
     * Current member data.
     */
    let currentBalance = 0;

    if (member) {
      currentBalance =
        calculateMemberBalance(
          String(member.id),
          transactions,
          withdrawals,
          trades,
          tradeMembers
        );
    }

    /*
     * Cooperative balance is the total
     * of all individual available balances.
     */
    const cooperativeBalance =
      membersWithBalances.reduce(
        (sum, item) =>
          sum + number(item.balance),
        0
      );

    /*
     * Trader should only see trades assigned
     * to their own trader_id.
     */
    const visibleTrades =
      role === "trader"
        ? trades.filter(
            (trade) =>
              String(trade.trader_id) ===
              String(user.id)
          )
        : trades;

    const visibleTradeIds =
      new Set(
        visibleTrades.map((trade) =>
          String(trade.id)
        )
      );

    const visibleTradeMembers =
      tradeMembers.filter((row) =>
        visibleTradeIds.has(
          String(row.trade_id)
        )
      );

    const visibleTradeFiles =
      tradeFiles.filter((file) =>
        visibleTradeIds.has(
          String(file.trade_id)
        )
      );

    const visibleTradeLogs =
      tradeLogs.filter((log) =>
        visibleTradeIds.has(
          String(log.trade_id)
        )
      );

    /*
     * Member's own transactions and withdrawals.
     */
    const ownTransactions = member
      ? transactions.filter(
          (transaction) =>
            String(transaction.member_id) ===
            String(member.id)
        )
      : [];

    const ownWithdrawals = member
      ? withdrawals.filter(
          (withdrawal) =>
            String(withdrawal.member_id) ===
            String(member.id)
        )
      : [];

    const ownTradeMembers = member
      ? tradeMembers.filter(
          (row) =>
            String(row.member_id) ===
            String(member.id)
        )
      : [];

    return NextResponse.json({
      profile,
      member,
      members: membersWithBalances,
      transactions: ownTransactions,
      withdrawals: ownWithdrawals,
      trades: visibleTrades,
      tradeMembers: ownTradeMembers,
      tradeFiles: visibleTradeFiles,
      tradeLogs: visibleTradeLogs,
      currentBalance,
      cooperativeBalance,
    });
  } catch (error) {
    console.error(
      "TradeBishi dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected TradeBishi server error.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as {
        amount?: unknown;
        method?: unknown;
        account_details?: unknown;
      };

    const amount = number(body.amount);

    const method =
      typeof body.method === "string"
        ? body.method.trim()
        : "";

    const accountDetails =
      typeof body.account_details === "string"
        ? body.account_details.trim()
        : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid withdrawal amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (!method) {
      return NextResponse.json(
        {
          error:
            "Withdrawal method is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!accountDetails) {
      return NextResponse.json(
        {
          error:
            "Account details are required.",
        },
        {
          status: 400,
        }
      );
    }

    const adminSupabase =
      getAdminSupabase();

    const { data: member, error: memberError } =
      await adminSupabase
        .from("members")
        .select(
          "id,user_id,full_name,status"
        )
        .eq("user_id", user.id)
        .maybeSingle();

    if (memberError) {
      return NextResponse.json(
        {
          error: memberError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!member) {
      return NextResponse.json(
        {
          error:
            "No TradeBishi member account is linked to this login.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      normal(member.status) !== "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Your member account is not active.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * Recalculate balance on the server immediately
     * before accepting the withdrawal.
     */
    const [
      transactionsResult,
      withdrawalsResult,
      tradesResult,
      tradeMembersResult,
    ] = await Promise.all([
      adminSupabase
        .from("transactions")
        .select(
          "id,member_id,type,amount,description,status,created_at"
        ),

      adminSupabase
        .from("withdrawals")
        .select(
          "id,member_id,amount,status"
        ),

      adminSupabase
        .from("trades")
        .select(TRADE_SELECT),

      adminSupabase
        .from("trade_members")
        .select(
          "id,trade_id,member_id,invested_amount,created_at"
        ),
    ]);

    const balanceData = [
      transactionsResult,
      withdrawalsResult,
      tradesResult,
      tradeMembersResult,
    ];

    const balanceError =
      balanceData.find(
        (result) => result.error
      );

    if (balanceError?.error) {
      return NextResponse.json(
        {
          error:
            balanceError.error.message,
        },
        {
          status: 500,
        }
      );
    }

    const availableBalance =
      calculateMemberBalance(
        String(member.id),
        (transactionsResult.data ??
          []) as AnyRecord[],
        (withdrawalsResult.data ??
          []) as AnyRecord[],
        (tradesResult.data ??
          []) as AnyRecord[],
        (tradeMembersResult.data ??
          []) as AnyRecord[]
      );

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error:
            `Withdrawal exceeds your available balance of ₹${availableBalance.toLocaleString(
              "en-IN"
            )}.`,
        },
        {
          status: 400,
        }
      );
    }

    const { data: withdrawal, error } =
      await adminSupabase
        .from("withdrawals")
        .insert({
          member_id: member.id,
          amount,
          method,
          account_details: accountDetails,
          status: "pending",
        })
        .select(
          "id,member_id,amount,method,account_details,status,reviewed_by,reviewed_at,created_at"
        )
        .single();

    if (error) {
      console.error(
        "Withdrawal creation error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Withdrawal request could not be created.",
          details: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawal,
    });
  } catch (error) {
    console.error(
      "TradeBishi withdrawal API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected withdrawal error.",
      },
      {
        status: 500,
      }
    );
  }
}