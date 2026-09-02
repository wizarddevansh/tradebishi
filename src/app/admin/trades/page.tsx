"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LogOut,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Trade = {
  id: string;
  symbol: string;
  trade_type: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_date: string;
  notes: string | null;
};

export default function AdminTradesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);

  const tradesPerPage = 10;

  const loadTrades = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || profile.role !== "admin") {
        router.push("/");
        return;
      }

      const { data, error } = await supabase
        .from("trades")
        .select(
          "id, symbol, trade_type, quantity, price, total_amount, trade_date, notes"
        )
        .order("trade_date", { ascending: false });

      if (error) {
        console.error("Error loading trades:", error);
        setTrades([]);
        return;
      }

      setTrades(data || []);
    } catch (error) {
      console.error("Error loading admin trades:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();

    return trades.filter((trade) => {
      const matchesSearch =
        !query ||
        trade.symbol.toLowerCase().includes(query) ||
        (trade.notes || "").toLowerCase().includes(query);

      const matchesType =
        filterType === "all" ||
        trade.trade_type.toLowerCase() === filterType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }, [trades, search, filterType]);

  useEffect(() => {
    setPage(1);
  }, [search, filterType]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrades.length / tradesPerPage)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * tradesPerPage,
    currentPage * tradesPerPage
  );

  const stats = useMemo(() => {
    const buyTrades = trades.filter(
      (trade) => trade.trade_type.toLowerCase() === "buy"
    );

    const sellTrades = trades.filter(
      (trade) => trade.trade_type.toLowerCase() === "sell"
    );

    const totalBuyValue = buyTrades.reduce(
      (sum, trade) => sum + Number(trade.total_amount || 0),
      0
    );

    const totalSellValue = sellTrades.reduce(
      (sum, trade) => sum + Number(trade.total_amount || 0),
      0
    );

    const totalTradeValue = trades.reduce(
      (sum, trade) => sum + Number(trade.total_amount || 0),
      0
    );

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalBuyValue,
      totalSellValue,
      totalTradeValue,
    };
  }, [trades]);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#fafafa]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 w-full border-b border-[#27272a] bg-[#0f0f11]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#fafafa] sm:text-2xl">
              Trade Dashboard
            </h1>

            <p className="mt-1 text-xs text-[#71717a]">
              Monitor all cooperative trades
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => loadTrades(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-[10px] border border-[#27272a] bg-[#18181b] px-3 py-[9px] text-sm text-[#d4d4d8] transition hover:bg-[#27272a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-[10px] border border-[#27272a] bg-[#18181b] px-3 py-[9px] text-sm text-[#d4d4d8] transition hover:bg-[#27272a]"
            >
              <LogOut size={16} />

              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <button
          onClick={() => router.push("/admin")}
          className="mb-[22px] border-none bg-transparent p-0 text-[13px] font-semibold text-[#a1a1aa] transition hover:text-[#fafafa]"
        >
          ← Back to Admin Dashboard
        </button>

        {/* STATS */}
        <section className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
          {/* TOTAL TRADES */}
          <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
            <div className="mb-[17px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <BarChart3 size={20} />
            </div>

            <p className="text-[13px] text-[#a1a1aa]">Total Trades</p>

            <h2 className="mt-1 text-[25px] font-extrabold text-[#fafafa]">
              {stats.totalTrades}
            </h2>
          </div>

          {/* BUY */}
          <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
            <div className="mb-[17px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-green-500/10 text-green-400">
              <ArrowUpRight size={20} />
            </div>

            <p className="text-[13px] text-[#a1a1aa]">Buy Trades</p>

            <h2 className="mt-1 text-[25px] font-extrabold text-[#fafafa]">
              {stats.buyTrades}
            </h2>

            <span className="mt-1 block text-xs text-[#71717a]">
              {formatCurrency(stats.totalBuyValue)}
            </span>
          </div>

          {/* SELL */}
          <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
            <div className="mb-[17px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <ArrowDownRight size={20} />
            </div>

            <p className="text-[13px] text-[#a1a1aa]">Sell Trades</p>

            <h2 className="mt-1 text-[25px] font-extrabold text-[#fafafa]">
              {stats.sellTrades}
            </h2>

            <span className="mt-1 block text-xs text-[#71717a]">
              {formatCurrency(stats.totalSellValue)}
            </span>
          </div>

          {/* TOTAL VALUE */}
          <div className="rounded-2xl border border-[#27272a] bg-[#111113] p-5">
            <div className="mb-[17px] flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Wallet size={20} />
            </div>

            <p className="text-[13px] text-[#a1a1aa]">
              Total Trade Value
            </p>

            <h2 className="mt-1 text-[25px] font-extrabold text-[#fafafa]">
              {formatCurrency(stats.totalTradeValue)}
            </h2>
          </div>
        </section>

        {/* FILTER */}
        <section className="mt-5 rounded-2xl border border-[#27272a] bg-[#111113] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#71717a]"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or notes..."
                className="w-full rounded-[10px] border border-[#27272a] bg-[#18181b] px-[14px] py-[11px] pl-10 text-[13px] text-[#f4f4f5] outline-none placeholder:text-[#52525b] focus:border-[#52525b]"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-[10px] border border-[#27272a] bg-[#18181b] px-[14px] py-[11px] text-[13px] text-[#f4f4f5] outline-none focus:border-[#52525b] sm:w-[180px]"
            >
              <option value="all" className="bg-[#18181b] text-[#f4f4f5]">
                All Trade Types
              </option>

              <option value="buy" className="bg-[#18181b] text-[#f4f4f5]">
                Buy
              </option>

              <option value="sell" className="bg-[#18181b] text-[#f4f4f5]">
                Sell
              </option>
            </select>
          </div>
        </section>

        {/* HISTORY */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-[#27272a] bg-[#111113]">
          <div className="flex items-center justify-between border-b border-[#27272a] px-5 py-[18px]">
            <div>
              <h2 className="text-[17px] font-extrabold text-[#fafafa]">
                Trade History
              </h2>

              <p className="mt-1 text-xs text-[#71717a]">
                {filteredTrades.length} trade
                {filteredTrades.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <TrendingUp size={20} className="text-[#71717a]" />
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-[#3f3f46]">
              <RefreshCw size={26} className="animate-spin" />
            </div>
          ) : paginatedTrades.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center text-[#3f3f46]">
              <BarChart3 size={40} />

              <h3 className="mt-3 text-[15px] font-bold text-[#fafafa]">
                No trades found
              </h3>

              <p className="mt-1 text-[13px] text-[#71717a]">
                There are no trades matching your current filters.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden w-full overflow-x-auto md:block">
                <table className="w-full min-w-[850px] border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Symbol
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Type
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Quantity
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Price
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Total Amount
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Trade Date
                      </th>

                      <th className="border-b border-[#27272a] bg-[#18181b] px-5 py-[13px] text-left text-[11px] font-bold uppercase tracking-[0.05em] text-[#71717a]">
                        Notes
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedTrades.map((trade) => {
                      const isBuy =
                        trade.trade_type.toLowerCase() === "buy";

                      return (
                        <tr key={trade.id} className="group">
                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] font-bold text-[#f4f4f5] group-hover:bg-[#18181b]">
                            {trade.symbol}
                          </td>

                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] text-[#a1a1aa] group-hover:bg-[#18181b]">
                            <span
                              className={`inline-flex items-center gap-[5px] rounded-full px-[9px] py-[5px] text-[11px] font-bold ${
                                isBuy
                                  ? "bg-green-500/10 text-green-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {isBuy ? (
                                <ArrowUpRight size={13} />
                              ) : (
                                <ArrowDownRight size={13} />
                              )}

                              {isBuy ? "BUY" : "SELL"}
                            </span>
                          </td>

                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] text-[#a1a1aa] group-hover:bg-[#18181b]">
                            {Number(trade.quantity).toLocaleString("en-IN")}
                          </td>

                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] text-[#a1a1aa] group-hover:bg-[#18181b]">
                            {formatCurrency(Number(trade.price))}
                          </td>

                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] font-bold text-[#f4f4f5] group-hover:bg-[#18181b]">
                            {formatCurrency(Number(trade.total_amount))}
                          </td>

                          <td className="border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] text-[#a1a1aa] group-hover:bg-[#18181b]">
                            {formatDate(trade.trade_date)}
                          </td>

                          <td className="max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-[#1f1f22] bg-[#111113] px-5 py-4 text-[13px] text-[#a1a1aa] group-hover:bg-[#18181b]">
                            {trade.notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="block md:hidden">
                {paginatedTrades.map((trade) => {
                  const isBuy =
                    trade.trade_type.toLowerCase() === "buy";

                  return (
                    <div
                      className="border-b border-[#1f1f22] bg-[#111113] p-4"
                      key={trade.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block text-base text-[#fafafa]">
                            {trade.symbol}
                          </strong>

                          <span className="mt-1 block text-xs text-[#71717a]">
                            {formatDate(trade.trade_date)}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-[5px] rounded-full px-[9px] py-[5px] text-[11px] font-bold ${
                            isBuy
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight size={13} />
                          ) : (
                            <ArrowDownRight size={13} />
                          )}

                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5 min-[420px]:grid-cols-3">
                        <div className="rounded-[9px] border border-[#27272a] bg-[#18181b] p-2.5">
                          <span className="mb-1 block text-[10px] text-[#71717a]">
                            Quantity
                          </span>

                          <strong className="block overflow-hidden text-ellipsis text-xs text-[#e4e4e7]">
                            {Number(trade.quantity).toLocaleString("en-IN")}
                          </strong>
                        </div>

                        <div className="rounded-[9px] border border-[#27272a] bg-[#18181b] p-2.5">
                          <span className="mb-1 block text-[10px] text-[#71717a]">
                            Price
                          </span>

                          <strong className="block overflow-hidden text-ellipsis text-xs text-[#e4e4e7]">
                            {formatCurrency(Number(trade.price))}
                          </strong>
                        </div>

                        <div className="col-span-2 rounded-[9px] border border-[#27272a] bg-[#18181b] p-2.5 min-[420px]:col-span-1">
                          <span className="mb-1 block text-[10px] text-[#71717a]">
                            Total
                          </span>

                          <strong className="block overflow-hidden text-ellipsis text-xs text-[#e4e4e7]">
                            {formatCurrency(Number(trade.total_amount))}
                          </strong>
                        </div>
                      </div>

                      {trade.notes && (
                        <div className="mt-3 border-t border-[#27272a] pt-3">
                          <span className="text-[10px] uppercase text-[#71717a]">
                            Notes
                          </span>

                          <p className="mt-1 break-words text-xs leading-relaxed text-[#a1a1aa]">
                            {trade.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* PAGINATION */}
              <div className="flex items-center justify-between border-t border-[#27272a] px-4 py-3.5 sm:px-5">
                <p className="text-xs text-[#71717a]">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#27272a] bg-[#18181b] text-[#a1a1aa] transition hover:bg-[#27272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <button
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                    disabled={currentPage === totalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#27272a] bg-[#18181b] text-[#a1a1aa] transition hover:bg-[#27272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}