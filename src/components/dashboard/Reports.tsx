"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Investment = {
  member_id: string;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
};

type Member = {
  id: string;
  full_name: string;
  status: string;
};

type Trade = {
  id: string;
  symbol: string;
  trade_type: string;
  total_amount: number;
  trade_date: string;
};

type Deposit = {
  id: string;
  amount: number;
  status: string;
};

export default function Reports() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      const supabase = createClient();

      const [
        investmentsResult,
        membersResult,
        tradesResult,
        depositsResult,
      ] = await Promise.all([
        supabase
          .from("investments")
          .select(
            "member_id, invested_amount, current_value, profit_loss"
          ),

        supabase
          .from("members")
          .select("id, full_name, status"),

        supabase
          .from("trades")
          .select(
            "id, symbol, trade_type, total_amount, trade_date"
          )
          .order("trade_date", {
            ascending: false,
          }),

        supabase
          .from("deposits")
          .select("id, amount, status"),
      ]);

      if (investmentsResult.error) {
        setError(investmentsResult.error.message);
        setLoading(false);
        return;
      }

      if (membersResult.error) {
        setError(membersResult.error.message);
        setLoading(false);
        return;
      }

      if (tradesResult.error) {
        setError(tradesResult.error.message);
        setLoading(false);
        return;
      }

      if (depositsResult.error) {
        setError(depositsResult.error.message);
        setLoading(false);
        return;
      }

      setInvestments(
        (investmentsResult.data ?? []).map((item) => ({
          member_id: item.member_id,
          invested_amount: Number(item.invested_amount || 0),
          current_value: Number(item.current_value || 0),
          profit_loss: Number(item.profit_loss || 0),
        }))
      );

      setMembers(
        (membersResult.data ?? []).map((item) => ({
          id: item.id,
          full_name: item.full_name,
          status: item.status,
        }))
      );

      setTrades(
        (tradesResult.data ?? []).map((item) => ({
          id: item.id,
          symbol: item.symbol,
          trade_type: item.trade_type,
          total_amount: Number(item.total_amount || 0),
          trade_date: item.trade_date,
        }))
      );

      setDeposits(
        (depositsResult.data ?? []).map((item) => ({
          id: item.id,
          amount: Number(item.amount || 0),
          status: item.status,
        }))
      );

      setLoading(false);
    }

    loadReports();
  }, []);

  const totalInvested = investments.reduce(
    (sum, item) => sum + item.invested_amount,
    0
  );

  const currentValue = investments.reduce(
    (sum, item) => sum + item.current_value,
    0
  );

  const totalProfitLoss = investments.reduce(
    (sum, item) => sum + item.profit_loss,
    0
  );

  const activeMembers = members.filter(
    (member) =>
      member.status?.toLowerCase() === "active"
  ).length;

  const approvedDeposits = deposits
    .filter(
      (deposit) =>
        deposit.status?.toLowerCase() === "approved"
    )
    .reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );

  const pendingDeposits = deposits
    .filter(
      (deposit) =>
        deposit.status?.toLowerCase() === "pending"
    )
    .reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );

  const rejectedDeposits = deposits
    .filter(
      (deposit) =>
        deposit.status?.toLowerCase() === "rejected"
    )
    .reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );

  const totalTradeValue = trades.reduce(
    (sum, trade) => sum + trade.total_amount,
    0
  );

  const buyTrades = trades.filter(
    (trade) =>
      trade.trade_type?.toLowerCase() === "buy"
  );

  const sellTrades = trades.filter(
    (trade) =>
      trade.trade_type?.toLowerCase() === "sell"
  );

  const buyVolume = buyTrades.reduce(
    (sum, trade) => sum + trade.total_amount,
    0
  );

  const sellVolume = sellTrades.reduce(
    (sum, trade) => sum + trade.total_amount,
    0
  );

  const returnPercentage =
    totalInvested > 0
      ? (totalProfitLoss / totalInvested) * 100
      : 0;

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const isProfit = totalProfitLoss >= 0;

  if (loading) {
    return (
      <div
        style={{
          marginTop: "30px",
          padding: "30px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Loading reports...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          marginTop: "30px",
          padding: "30px",
          color: "#f87171",
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "30px",
        color: "white",
      }}
    >
      {/* PAGE HEADER */}

      <div
        style={{
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            fontSize: "30px",
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Reports
        </h2>

        <p
          style={{
            marginTop: "8px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "14px",
          }}
        >
          TradeBishi performance and financial overview.
        </p>
      </div>

      {/* MAIN STAT CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, minmax(0, 1fr))",
          gap: "18px",
        }}
      >
        <div style={cardStyle}>
          <div style={cardTopStyle}>
            <span style={labelStyle}>
              Total Invested
            </span>

            <div style={iconBoxStyle}>
              <Wallet size={17} />
            </div>
          </div>

          <h3 style={mainValueStyle}>
            {formatCurrency(totalInvested)}
          </h3>

          <p style={subtleStyle}>
            Capital deployed
          </p>
        </div>

        <div style={cardStyle}>
          <div style={cardTopStyle}>
            <span style={labelStyle}>
              Current Value
            </span>

            <div style={iconBoxStyle}>
              <Activity size={17} />
            </div>
          </div>

          <h3 style={mainValueStyle}>
            {formatCurrency(currentValue)}
          </h3>

          <p style={subtleStyle}>
            Current portfolio value
          </p>
        </div>

        <div style={cardStyle}>
          <div style={cardTopStyle}>
            <span style={labelStyle}>
              Total Profit / Loss
            </span>

            <div
              style={{
                ...iconBoxStyle,
                color: isProfit
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {isProfit ? (
                <TrendingUp size={17} />
              ) : (
                <TrendingDown size={17} />
              )}
            </div>
          </div>

          <h3
            style={{
              ...mainValueStyle,
              color: isProfit
                ? "#34d399"
                : "#f87171",
            }}
          >
            {isProfit ? "+" : ""}
            {formatCurrency(totalProfitLoss)}
          </h3>

          <p
            style={{
              ...subtleStyle,
              color: isProfit
                ? "#34d399"
                : "#f87171",
            }}
          >
            {isProfit ? "+" : ""}
            {returnPercentage.toFixed(2)}% return
          </p>
        </div>

        <div style={cardStyle}>
          <div style={cardTopStyle}>
            <span style={labelStyle}>
              Active Members
            </span>

            <div style={iconBoxStyle}>
              <Users size={17} />
            </div>
          </div>

          <h3 style={mainValueStyle}>
            {activeMembers}
          </h3>

          <p style={subtleStyle}>
            {members.length} total members
          </p>
        </div>
      </div>

      {/* DEPOSIT + TRADING */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "18px",
          marginTop: "18px",
        }}
      >
        {/* DEPOSITS */}

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3 style={sectionTitleStyle}>
                Deposit Overview
              </h3>

              <p style={sectionSubtitleStyle}>
                Capital received from members
              </p>
            </div>

            <div style={iconBoxStyle}>
              <Wallet size={18} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: "12px",
              marginTop: "25px",
            }}
          >
            <div style={miniCardStyle}>
              <span style={miniLabelStyle}>
                Approved
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#34d399",
                  fontSize: "18px",
                }}
              >
                {formatCurrency(
                  approvedDeposits
                )}
              </strong>
            </div>

            <div style={miniCardStyle}>
              <span style={miniLabelStyle}>
                Pending
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#facc15",
                  fontSize: "18px",
                }}
              >
                {formatCurrency(
                  pendingDeposits
                )}
              </strong>
            </div>

            <div style={miniCardStyle}>
              <span style={miniLabelStyle}>
                Rejected
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#f87171",
                  fontSize: "18px",
                }}
              >
                {formatCurrency(
                  rejectedDeposits
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* TRADING */}

        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <h3 style={sectionTitleStyle}>
                Trading Overview
              </h3>

              <p style={sectionSubtitleStyle}>
                Overall trading activity
              </p>
            </div>

            <div style={iconBoxStyle}>
              <Activity size={18} />
            </div>
          </div>

          <div
            style={{
              marginTop: "25px",
            }}
          >
            <p style={labelStyle}>
              Total Trade Volume
            </p>

            <strong
              style={{
                display: "block",
                marginTop: "7px",
                fontSize: "25px",
              }}
            >
              {formatCurrency(totalTradeValue)}
            </strong>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginTop: "20px",
            }}
          >
            <div style={miniCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "#34d399",
                }}
              >
                <ArrowUpRight size={16} />

                <span style={miniLabelStyle}>
                  Buy
                </span>
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  fontSize: "17px",
                }}
              >
                {formatCurrency(buyVolume)}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color:
                    "rgba(255,255,255,0.4)",
                  fontSize: "12px",
                }}
              >
                {buyTrades.length} trades
              </span>
            </div>

            <div style={miniCardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "#f87171",
                }}
              >
                <ArrowDownRight size={16} />

                <span style={miniLabelStyle}>
                  Sell
                </span>
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  fontSize: "17px",
                }}
              >
                {formatCurrency(sellVolume)}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color:
                    "rgba(255,255,255,0.4)",
                  fontSize: "12px",
                }}
              >
                {sellTrades.length} trades
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LATEST TRADES */}

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>
              Latest Trades
            </h3>

            <p style={sectionSubtitleStyle}>
              Most recent trading activity
            </p>
          </div>

          <span
            style={{
              color:
                "rgba(255,255,255,0.4)",
              fontSize: "13px",
            }}
          >
            {trades.length} total
          </span>
        </div>

        {trades.length === 0 ? (
          <div
            style={{
              marginTop: "25px",
              padding: "35px",
              textAlign: "center",
              borderRadius: "16px",
              background:
                "rgba(0,0,0,0.2)",
              border:
                "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p style={labelStyle}>
              No trades recorded yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: "20px",
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
                  "1.5fr 1fr 1.3fr 1.2fr",
                gap: "15px",
                padding:
                  "0 16px 10px",
                color:
                  "rgba(255,255,255,0.35)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing:
                  "0.06em",
              }}
            >
              <span>Symbol</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Date</span>
            </div>

            {trades
              .slice(0, 7)
              .map((trade) => {
                const isBuy =
                  trade.trade_type?.toLowerCase() ===
                  "buy";

                return (
                  <div
                    key={trade.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.5fr 1fr 1.3fr 1.2fr",
                      gap: "15px",
                      alignItems: "center",
                      padding: "16px",
                      borderRadius: "15px",
                      background:
                        "rgba(0,0,0,0.25)",
                      border:
                        "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {trade.symbol}
                    </span>

                    <span
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "6px",
                        color: isBuy
                          ? "#34d399"
                          : "#f87171",
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {isBuy ? (
                        <ArrowUpRight
                          size={15}
                        />
                      ) : (
                        <ArrowDownRight
                          size={15}
                        />
                      )}

                      {trade.trade_type}
                    </span>

                    <span>
                      {formatCurrency(
                        trade.total_amount
                      )}
                    </span>

                    <span
                      style={{
                        color:
                          "rgba(255,255,255,0.45)",
                      }}
                    >
                      {new Date(
                        trade.trade_date
                      ).toLocaleDateString(
                        "en-IN"
                      )}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* PERFORMANCE SUMMARY */}

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>
              Performance Summary
            </h3>

            <p style={sectionSubtitleStyle}>
              Portfolio performance at a glance
            </p>
          </div>

          {isProfit ? (
            <TrendingUp
              size={22}
              color="#34d399"
            />
          ) : (
            <TrendingDown
              size={22}
              color="#f87171"
            />
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: "15px",
            marginTop: "25px",
          }}
        >
          <div style={performanceCardStyle}>
            <span style={miniLabelStyle}>
              Capital
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "8px",
                fontSize: "20px",
              }}
            >
              {formatCurrency(
                totalInvested
              )}
            </strong>
          </div>

          <div style={performanceCardStyle}>
            <span style={miniLabelStyle}>
              Portfolio
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "8px",
                fontSize: "20px",
              }}
            >
              {formatCurrency(
                currentValue
              )}
            </strong>
          </div>

          <div style={performanceCardStyle}>
            <span style={miniLabelStyle}>
              Return
            </span>

            <strong
              style={{
                display: "block",
                marginTop: "8px",
                fontSize: "20px",
                color: isProfit
                  ? "#34d399"
                  : "#f87171",
              }}
            >
              {isProfit ? "+" : ""}
              {returnPercentage.toFixed(
                2
              )}
              %
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const cardStyle = {
  padding: "22px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(20px)",
};

const cardTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const iconBoxStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(255,255,255,0.07)",
  color: "rgba(255,255,255,0.7)",
};

const labelStyle = {
  color: "rgba(255,255,255,0.48)",
  fontSize: "13px",
};

const mainValueStyle = {
  marginTop: "14px",
  fontSize: "25px",
  fontWeight: 600,
  letterSpacing: "-0.02em",
};

const subtleStyle = {
  marginTop: "7px",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
};

const sectionStyle = {
  marginTop: "18px",
  padding: "25px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(20px)",
};

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "19px",
  fontWeight: 600,
};

const sectionSubtitleStyle = {
  marginTop: "5px",
  color: "rgba(255,255,255,0.35)",
  fontSize: "12px",
};

const miniCardStyle = {
  padding: "15px",
  borderRadius: "15px",
  background: "rgba(0,0,0,0.2)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const miniLabelStyle = {
  color: "rgba(255,255,255,0.42)",
  fontSize: "12px",
};

const performanceCardStyle = {
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(0,0,0,0.2)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};