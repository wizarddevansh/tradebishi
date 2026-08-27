"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  LogOut,
  Lock,
  Wallet,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
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
  proofPhotos: string[];
};

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  investment_amount: number;
  profit_share: number;
  status: string;
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

type PerformancePoint = {
  date: string;
  label: string;
  value: number;
};

/* =========================================================
   MOBILE POLISH CSS
========================================================= */

const mobileStyles = `
  * {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    background: #050505;
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

  .tb-mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }

  .tb-mobile-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
  }

  .tb-mobile-performance-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .tb-mobile-account-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .tb-mobile-withdrawal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }

  .tb-mobile-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 15px;
  }

  .tb-mobile-portfolio-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }

  .tb-mobile-current-value {
    text-align: right;
  }

  .tb-mobile-trades {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .tb-mobile-trade-inner {
    min-width: 1050px;
  }

  .tb-mobile-modal {
    width: 100%;
    max-width: 540px;
  }

  .tb-mobile-proof-image {
    max-width: calc(100vw - 180px);
    max-height: calc(100vh - 220px);
  }

  .tb-mobile-scroll-hint {
    display: none;
  }

  @media (max-width: 900px) {
    .tb-mobile-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tb-mobile-account-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .tb-mobile-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .tb-mobile-page {
      padding: 16px !important;
    }

    .tb-mobile-container {
      width: 100%;
    }

    .tb-mobile-header {
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px !important;
    }

    .tb-mobile-header h1 {
      font-size: 30px !important;
      line-height: 1.1;
      letter-spacing: -1.2px !important;
    }

    .tb-mobile-header p {
      font-size: 13px !important;
      line-height: 1.5;
    }

    .tb-mobile-header > button {
      width: 100%;
      justify-content: center;
      min-height: 44px;
    }

    .tb-mobile-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 10px !important;
    }

    .tb-mobile-stat-card {
      padding: 16px !important;
      border-radius: 17px !important;
      min-width: 0;
    }

    .tb-mobile-stat-card h2 {
      font-size: 20px !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tb-mobile-stat-label {
      font-size: 10px !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tb-mobile-portfolio {
      padding: 18px !important;
      border-radius: 21px !important;
    }

    .tb-mobile-portfolio-header {
      flex-direction: column;
      gap: 14px;
    }

    .tb-mobile-current-value {
      text-align: left;
    }

    .tb-mobile-current-value strong {
      font-size: 22px !important;
    }

    .tb-mobile-performance-summary {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .tb-mobile-performance-summary > div:last-child {
      grid-column: 1 / -1;
    }

    .tb-mobile-chart svg {
      height: 210px !important;
    }

    .tb-mobile-section {
      padding: 18px !important;
      border-radius: 21px !important;
    }

    .tb-mobile-section-header {
      align-items: flex-start !important;
      margin-bottom: 18px !important;
    }

    .tb-mobile-section-header h2 {
      font-size: 20px !important;
    }

    .tb-mobile-section-header p {
      font-size: 12px !important;
      line-height: 1.5;
    }

    .tb-mobile-withdrawal {
      flex-direction: column;
      align-items: stretch;
      padding: 18px !important;
      border-radius: 20px !important;
      gap: 15px;
    }

    .tb-mobile-withdrawal-button {
      width: 100%;
      justify-content: center;
      min-height: 46px;
    }

    .tb-mobile-withdrawal-row {
      padding: 14px !important;
      gap: 12px !important;
    }

    .tb-mobile-withdrawal-row strong {
      font-size: 15px !important;
    }

    .tb-mobile-withdrawal-row > div:last-child {
      max-width: 48%;
    }

    .tb-mobile-summary {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .tb-mobile-summary > div:last-child {
      grid-column: 1 / -1;
    }

    .tb-mobile-summary-card {
      padding: 16px !important;
    }

    .tb-mobile-summary-card strong {
      font-size: 18px !important;
    }

    .tb-mobile-account-grid {
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .tb-mobile-account-item {
      padding: 13px !important;
      min-width: 0;
    }

    .tb-mobile-account-item strong {
      font-size: 13px !important;
      overflow-wrap: anywhere;
    }

    .tb-mobile-trades {
      margin: 0 -18px;
      padding: 0 18px;
    }

    .tb-mobile-trade-inner {
      min-width: 980px;
    }

    .tb-mobile-scroll-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: -8px;
      margin-bottom: 12px;
      color: rgba(255,255,255,0.25);
      font-size: 10px;
    }

    .tb-mobile-security {
      padding: 13px !important;
      align-items: flex-start !important;
      font-size: 11px !important;
      line-height: 1.5;
    }

    .tb-mobile-modal-overlay {
      align-items: flex-end !important;
      padding: 0 !important;
    }

    .tb-mobile-modal {
      max-width: none !important;
      max-height: 92vh !important;
      padding: 20px !important;
      border-radius: 25px 25px 0 0 !important;
      border-bottom: none !important;
    }

    .tb-mobile-modal-title {
      font-size: 22px !important;
    }

    .tb-mobile-modal-actions {
      position: sticky;
      bottom: 0;
      padding-top: 10px;
      background: #111;
    }

    .tb-mobile-proof-top {
      padding: 16px !important;
    }

    .tb-mobile-proof-area {
      gap: 8px !important;
      padding: 12px !important;
    }

    .tb-mobile-proof-image {
      max-width: calc(100vw - 90px) !important;
      max-height: calc(100vh - 190px) !important;
      border-radius: 12px !important;
    }

    .tb-mobile-proof-nav {
      width: 42px !important;
      height: 42px !important;
    }

    .tb-mobile-proof-bottom {
      padding: 12px 16px !important;
      flex-direction: column;
      align-items: stretch !important;
      gap: 10px !important;
    }

    .tb-mobile-proof-thumbnails {
      max-width: 100%;
      overflow-x: auto;
    }
  }

  @media (max-width: 390px) {
    .tb-mobile-page {
      padding: 12px !important;
    }

    .tb-mobile-stats {
      gap: 8px;
    }

    .tb-mobile-stat-card {
      padding: 14px !important;
    }

    .tb-mobile-stat-card h2 {
      font-size: 18px !important;
    }

    .tb-mobile-account-grid {
      grid-template-columns: 1fr;
    }

    .tb-mobile-summary {
      grid-template-columns: 1fr;
    }

    .tb-mobile-summary > div:last-child {
      grid-column: auto;
    }

    .tb-mobile-performance-summary {
      grid-template-columns: 1fr;
    }

    .tb-mobile-performance-summary > div:last-child {
      grid-column: auto;
    }

    .tb-mobile-header h1 {
      font-size: 27px !important;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .tb-mobile-stat-card,
    .tb-mobile-summary-card,
    .tb-mobile-section,
    .tb-mobile-withdrawal {
      transition:
        transform 180ms ease,
        border-color 180ms ease,
        background 180ms ease;
    }

    .tb-mobile-stat-card:active,
    .tb-mobile-summary-card:active {
      transform: scale(0.985);
    }
  }
`;

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function MemberDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Member");

  const [member, setMember] =
    useState<Member | null>(null);

  const [trades, setTrades] =
    useState<Trade[]>([]);

  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>([]);

  const [error, setError] = useState("");

  const [showWithdrawalModal, setShowWithdrawalModal] =
    useState(false);

  const [withdrawalAmount, setWithdrawalAmount] =
    useState("");

  const [withdrawalMethod, setWithdrawalMethod] =
    useState("upi");

  const [accountDetails, setAccountDetails] =
    useState("");

  const [submittingWithdrawal, setSubmittingWithdrawal] =
    useState(false);

  /*
   * TRADE PROOF VIEWER
   */

  const [showProofModal, setShowProofModal] =
    useState(false);

  const [selectedTrade, setSelectedTrade] =
    useState<Trade | null>(null);

  const [selectedProofIndex, setSelectedProofIndex] =
    useState(0);

  useEffect(() => {
    loadMember();
  }, []);

  async function loadTradeProofs(
    tradeList: any[]
  ): Promise<Trade[]> {
    const supabase = createClient();

    const tradesWithProofs =
      await Promise.all(
        tradeList.map(async (trade) => {
          try {
            const {
              data: files,
              error: storageError,
            } = await supabase.storage
              .from("trade-photos")
              .list(trade.id);

            if (storageError) {
              console.error(
                `Proof loading error for trade ${trade.id}:`,
                storageError
              );

              return {
                ...trade,
                proofPhotos: [],
              };
            }

            const proofPhotos =
              (files ?? [])
                .filter(
                  (file) =>
                    file.name &&
                    !file.name.endsWith("/")
                )
                .map((file) => {
                  const { data } =
                    supabase.storage
                      .from("trade-photos")
                      .getPublicUrl(
                        `${trade.id}/${file.name}`
                      );

                  return data.publicUrl;
                });

            return {
              ...trade,
              proofPhotos,
            };
          } catch (error) {
            console.error(
              `Unexpected proof loading error for trade ${trade.id}:`,
              error
            );

            return {
              ...trade,
              proofPhotos: [],
            };
          }
        })
      );

    return tradesWithProofs as Trade[];
  }

  async function loadMember() {
    const supabase = createClient();

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Profile lookup error:",
          profileError
        );
      }

      if (profile) {
        if (profile.role !== "member") {
          router.replace("/");
          return;
        }

        setUserName(
          profile.full_name ||
            user.email ||
            "Member"
        );
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
          "Member lookup error:",
          memberError
        );

        setError(
          "Unable to load your member account."
        );

        setLoading(false);
        return;
      }

      if (!memberData) {
        setError(
          "Your member account could not be found. Please contact the administrator."
        );

        setLoading(false);
        return;
      }

      if (!profile) {
        setUserName(
          memberData.full_name ||
            user.email ||
            "Member"
        );
      }

      if (memberData.status !== "active") {
        setError(
          "Your member account is not active. Please contact the administrator."
        );

        setLoading(false);
        return;
      }

      setMember(
        memberData as Member
      );

      /*
       * LOAD POOLED TRADES
       */

      const {
        data: tradeData,
        error: tradeError,
      } = await supabase
        .from("trades")
        .select(
          `
          id,
          symbol,
          trade_type,
          quantity,
          price,
          total_amount,
          trade_date,
          notes
          `
        )
        .order("trade_date", {
          ascending: true,
        });

      if (tradeError) {
        console.error(
          "Trade loading error:",
          tradeError
        );
      } else {
        const tradesWithProofs =
          await loadTradeProofs(
            tradeData ?? []
          );

        setTrades(
          tradesWithProofs
        );
      }

      /*
       * LOAD THIS MEMBER'S WITHDRAWALS
       */

      const {
        data: withdrawalData,
        error: withdrawalError,
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
        .eq(
          "member_id",
          memberData.id
        )
        .order("created_at", {
          ascending: false,
        });

      if (withdrawalError) {
        console.error(
          "Withdrawal loading error:",
          withdrawalError
        );
      } else {
        setWithdrawals(
          (withdrawalData ?? []) as Withdrawal[]
        );
      }
    } catch (error) {
      console.error(
        "Member dashboard error:",
        error
      );

      setError(
        "Something went wrong while loading your account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitWithdrawal() {
    if (submittingWithdrawal) return;

    setError("");

    if (!member) {
      setError(
        "Member account not found."
      );
      return;
    }

    const amount = Number(
      withdrawalAmount
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Please enter a valid withdrawal amount."
      );
      return;
    }

    if (
      amount >
      Number(member.investment_amount || 0)
    ) {
      setError(
        "Withdrawal amount cannot be greater than your current investment."
      );
      return;
    }

    if (!withdrawalMethod) {
      setError(
        "Please select a withdrawal method."
      );
      return;
    }

    if (!accountDetails.trim()) {
      setError(
        "Please enter your payment/account details."
      );
      return;
    }

    setSubmittingWithdrawal(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error: insertError } =
        await supabase
          .from("withdrawals")
          .insert({
            member_id: member.id,
            amount,
            method: withdrawalMethod,
            account_details:
              accountDetails.trim(),
            status: "pending",
          });

      if (insertError) {
        console.error(
          "Withdrawal insert error:",
          insertError
        );

        setError(
          insertError.message
        );

        setSubmittingWithdrawal(false);
        return;
      }

      setWithdrawalAmount("");
      setWithdrawalMethod("upi");
      setAccountDetails("");

      setShowWithdrawalModal(false);

      await loadMember();
    } catch (error) {
      console.error(
        "Withdrawal request error:",
        error
      );

      setError(
        "Unable to submit withdrawal request."
      );
    } finally {
      setSubmittingWithdrawal(false);
    }
  }

  function closeWithdrawalModal() {
    if (submittingWithdrawal) return;

    setShowWithdrawalModal(false);

    setWithdrawalAmount("");
    setWithdrawalMethod("upi");
    setAccountDetails("");
  }

  function openProofViewer(
    trade: Trade,
    index = 0
  ) {
    if (!trade.proofPhotos?.length) {
      return;
    }

    setSelectedTrade(trade);
    setSelectedProofIndex(index);
    setShowProofModal(true);
  }

  function closeProofViewer() {
    setShowProofModal(false);
    setSelectedTrade(null);
    setSelectedProofIndex(0);
  }

  function previousProof() {
    if (!selectedTrade) return;

    setSelectedProofIndex(
      (current) =>
        current === 0
          ? selectedTrade.proofPhotos.length - 1
          : current - 1
    );
  }

  function nextProof() {
    if (!selectedTrade) return;

    setSelectedProofIndex(
      (current) =>
        current ===
        selectedTrade.proofPhotos.length - 1
          ? 0
          : current + 1
    );
  }

  async function logout() {
    const supabase = createClient();

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  function formatCurrency(
    value: number
  ) {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  function formatMethod(
    method: string
  ) {
    return method
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }

  const totalTradeValue =
    trades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const buyTrades =
    trades.filter(
      (trade) =>
        trade.trade_type
          .toLowerCase() ===
        "buy"
    );

  const sellTrades =
    trades.filter(
      (trade) =>
        trade.trade_type
          .toLowerCase() ===
        "sell"
    );

  const totalBuyValue =
    buyTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const totalSellValue =
    sellTrades.reduce(
      (sum, trade) =>
        sum +
        Number(
          trade.total_amount || 0
        ),
      0
    );

  const uniqueSymbols =
    new Set(
      trades.map(
        (trade) => trade.symbol
      )
    ).size;

  const pendingWithdrawals =
    withdrawals.filter(
      (withdrawal) =>
        withdrawal.status?.toLowerCase() ===
        "pending"
    );

  /*
   * PORTFOLIO PERFORMANCE
   */

  const performanceData =
    useMemo<PerformancePoint[]>(() => {
      const startingInvestment =
        Number(
          member?.investment_amount || 0
        );

      if (!trades.length) {
        return [
          {
            date: new Date().toISOString(),
            label: "Now",
            value: startingInvestment,
          },
        ];
      }

      let runningValue =
        startingInvestment;

      const points: PerformancePoint[] =
        [];

      points.push({
        date: trades[0].trade_date,
        label: "Start",
        value: runningValue,
      });

      trades.forEach((trade) => {
        const amount =
          Number(
            trade.total_amount || 0
          );

        const type =
          trade.trade_type.toLowerCase();

        if (type === "buy") {
          runningValue += amount;
        }

        if (type === "sell") {
          runningValue -= amount;
        }

        points.push({
          date: trade.trade_date,
          label: new Date(
            trade.trade_date
          ).toLocaleDateString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
            }
          ),
          value: Math.max(
            0,
            runningValue
          ),
        });
      });

      return points;
    }, [trades, member]);

  const performanceStart =
    performanceData[0]?.value || 0;

  const performanceCurrent =
    performanceData[
      performanceData.length - 1
    ]?.value || 0;

  const performanceChange =
    performanceCurrent -
    performanceStart;

  const performancePercentage =
    performanceStart > 0
      ? (performanceChange /
          performanceStart) *
        100
      : 0;

  const performancePositive =
    performanceChange >= 0;

  const chart = useMemo(() => {
    if (!performanceData.length) {
      return null;
    }

    const width = 900;
    const height = 300;

    const paddingX = 25;
    const paddingY = 25;

    const values =
      performanceData.map(
        (point) => point.value
      );

    let minValue =
      Math.min(...values);

    let maxValue =
      Math.max(...values);

    if (
      minValue === maxValue
    ) {
      const padding =
        Math.max(
          1000,
          maxValue * 0.05
        );

      minValue -= padding;
      maxValue += padding;
    }

    const range =
      maxValue - minValue;

    const points =
      performanceData.map(
        (point, index) => {
          const x =
            performanceData.length ===
            1
              ? width / 2
              : paddingX +
                (index /
                  (performanceData.length -
                    1)) *
                  (width -
                    paddingX * 2);

          const y =
            height -
            paddingY -
            ((point.value -
              minValue) /
              range) *
              (height -
                paddingY * 2);

          return {
            ...point,
            x,
            y,
          };
        }
      );

    const linePath =
      points
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
        )
        .join(" ");

    const areaPath =
      `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return {
      width,
      height,
      points,
      linePath,
      areaPath,
      minValue,
      maxValue,
    };
  }, [performanceData]);

  if (loading) {
    return (
      <>
        <style>{mobileStyles}</style>

        <main style={loadingStyle}>
          Loading Member Account...
        </main>
      </>
    );
  }

  if (error && !member) {
    return (
      <>
        <style>{mobileStyles}</style>

        <main style={loadingStyle}>
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
              padding: "30px",
            }}
          >
            <Lock
              size={32}
              style={{
                marginBottom: "15px",
              }}
            />

            <h2>{error}</h2>

            <button
              onClick={() =>
                router.replace("/login")
              }
              style={primaryButton}
            >
              Back to Login
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style>{mobileStyles}</style>

      <main
        style={pageStyle}
        className="tb-mobile-page"
      >
        <div
          style={containerStyle}
          className="tb-mobile-container"
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <header
            style={headerStyle}
            className="tb-mobile-header"
          >
            <div>
              <div style={eyebrowStyle}>
                <TrendingUp size={15} />
                TradeBishi Member
              </div>

              <h1 style={titleStyle}>
                Welcome, {userName}
              </h1>

              <p style={subtitleStyle}>
                View your investment and
                pooled trading activity.
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              style={logoutButton}
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </header>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div style={errorBox}>
              {error}
            </div>
          )}

          {/* =================================================
              MEMBER OVERVIEW
          ================================================= */}

          <div
            style={statsGrid}
            className="tb-mobile-stats"
          >
            <Stat
              icon={<Wallet size={18} />}
              title="Your Investment"
              value={formatCurrency(
                Number(
                  member?.investment_amount ||
                    0
                )
              )}
            />

            <Stat
              icon={<BarChart3 size={18} />}
              title="Profit Share"
              value={`${Number(
                member?.profit_share || 0
              ).toFixed(2)}%`}
            />

            <Stat
              icon={<Activity size={18} />}
              title="Pooled Trades"
              value={trades.length.toString()}
            />

            <Stat
              icon={<TrendingUp size={18} />}
              title="Trade Volume"
              value={formatCurrency(
                totalTradeValue
              )}
            />
          </div>

          {/* =================================================
              PORTFOLIO PERFORMANCE
          ================================================= */}

          <section
            style={portfolioSection}
            className="tb-mobile-portfolio"
          >
            <div
              style={portfolioHeader}
              className="tb-mobile-portfolio-header"
            >
              <div>
                <div style={portfolioEyebrow}>
                  <TrendingUp size={14} />
                  PORTFOLIO
                </div>

                <h2 style={portfolioTitle}>
                  Portfolio Performance
                </h2>

                <p style={portfolioSubtitle}>
                  Your portfolio activity based
                  on recorded pooled trades.
                </p>
              </div>

              <div className="tb-mobile-current-value">
                <div
                  style={{
                    color:
                      "rgba(255,255,255,0.38)",
                    fontSize: "11px",
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.08em",
                  }}
                >
                  Current Tracked Value
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "5px",
                    fontSize: "24px",
                  }}
                >
                  {formatCurrency(
                    performanceCurrent
                  )}
                </strong>
              </div>
            </div>

            <div
              style={performanceSummaryGrid}
              className="tb-mobile-performance-summary"
            >
              <div style={performanceMiniCard}>
                <span style={miniLabel}>
                  Starting Value
                </span>

                <strong style={miniValue}>
                  {formatCurrency(
                    performanceStart
                  )}
                </strong>
              </div>

              <div style={performanceMiniCard}>
                <span style={miniLabel}>
                  Current Tracked Value
                </span>

                <strong style={miniValue}>
                  {formatCurrency(
                    performanceCurrent
                  )}
                </strong>
              </div>

              <div style={performanceMiniCard}>
                <span style={miniLabel}>
                  Activity Change
                </span>

                <strong
                  style={{
                    ...miniValue,
                    color:
                      performancePositive
                        ? "#34d399"
                        : "#f87171",
                  }}
                >
                  {performancePositive
                    ? "+"
                    : ""}
                  {formatCurrency(
                    performanceChange
                  )}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color:
                      performancePositive
                        ? "#34d399"
                        : "#f87171",
                    fontSize: "11px",
                  }}
                >
                  {performancePositive
                    ? "+"
                    : ""}
                  {performancePercentage.toFixed(
                    2
                  )}
                  %
                </span>
              </div>
            </div>

            <div
              style={chartContainer}
              className="tb-mobile-chart"
            >
              {chart ? (
                <>
                  <svg
                    viewBox={`0 0 ${chart.width} ${chart.height}`}
                    width="100%"
                    height="300"
                    preserveAspectRatio="none"
                    style={{
                      display: "block",
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="portfolioGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgba(255,255,255,0.18)"
                        />

                        <stop
                          offset="100%"
                          stopColor="rgba(255,255,255,0)"
                        />
                      </linearGradient>
                    </defs>

                    <line
                      x1="25"
                      y1="25"
                      x2="875"
                      y2="25"
                      stroke="rgba(255,255,255,0.06)"
                    />

                    <line
                      x1="25"
                      y1="150"
                      x2="875"
                      y2="150"
                      stroke="rgba(255,255,255,0.06)"
                    />

                    <line
                      x1="25"
                      y1="275"
                      x2="875"
                      y2="275"
                      stroke="rgba(255,255,255,0.06)"
                    />

                    <path
                      d={chart.areaPath}
                      fill="url(#portfolioGradient)"
                    />

                    <path
                      d={chart.linePath}
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {chart.points.map(
                      (point, index) => (
                        <circle
                          key={`${point.date}-${index}`}
                          cx={point.x}
                          cy={point.y}
                          r={
                            index ===
                            chart.points.length - 1
                              ? 5
                              : 3
                          }
                          fill="white"
                          stroke="#111"
                          strokeWidth="2"
                        />
                      )
                    )}
                  </svg>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginTop: "8px",
                      padding:
                        "0 8px",
                      color:
                        "rgba(255,255,255,0.3)",
                      fontSize: "10px",
                    }}
                  >
                    <span>
                      {performanceData[0]
                        ? new Date(
                            performanceData[0]
                              .date
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : ""}
                    </span>

                    <span>
                      {performanceData[
                        performanceData.length -
                          1
                      ]
                        ? new Date(
                            performanceData[
                              performanceData.length -
                                1
                            ].date
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : ""}
                    </span>
                  </div>
                </>
              ) : (
                <div style={emptyState}>
                  No performance data available.
                </div>
              )}
            </div>

            <div style={performanceDisclaimer}>
              <Lock size={13} />

              <span>
                This chart reflects recorded
                portfolio activity. Actual
                realized/unrealized P&amp;L will
                require current market prices and
                holdings-level valuation.
              </span>
            </div>
          </section>

          {/* =================================================
              WITHDRAWAL ACTION
          ================================================= */}

          <section
            style={withdrawalSection}
            className="tb-mobile-withdrawal"
          >
            <div>
              <div style={withdrawalTitleRow}>
                <Wallet size={20} />

                <h2 style={withdrawalTitle}>
                  Withdraw Funds
                </h2>
              </div>

              <p style={withdrawalSubtitle}>
                Request a withdrawal from your
                investment. An administrator will
                review your request.
              </p>

              {pendingWithdrawals.length >
                0 && (
                <div style={pendingNotice}>
                  <Clock size={15} />

                  You have{" "}
                  {pendingWithdrawals.length}{" "}
                  pending withdrawal{" "}
                  {pendingWithdrawals.length ===
                  1
                    ? "request"
                    : "requests"}
                  .
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowWithdrawalModal(true)
              }
              style={withdrawButton}
              className="tb-mobile-withdrawal-button"
            >
              <Plus size={17} />
              Request Withdrawal
            </button>
          </section>

          {/* =================================================
              WITHDRAWAL HISTORY
          ================================================= */}

          <section
            style={sectionStyle}
            className="tb-mobile-section"
          >
            <div
              style={sectionHeaderStyle}
              className="tb-mobile-section-header"
            >
              <div>
                <h2 style={sectionTitle}>
                  Withdrawal Requests
                </h2>

                <p
                  style={sectionSubtitle}
                >
                  Track your withdrawal
                  requests and their status.
                </p>
              </div>

              <span
                style={{
                  color:
                    "rgba(255,255,255,0.35)",
                  fontSize: "12px",
                }}
              >
                {withdrawals.length}{" "}
                {withdrawals.length === 1
                  ? "request"
                  : "requests"}
              </span>
            </div>

            {withdrawals.length === 0 ? (
              <div style={emptyState}>
                <Wallet
                  size={28}
                  style={{
                    opacity: 0.5,
                    marginBottom: "10px",
                  }}
                />

                <div>
                  No withdrawal requests yet.
                </div>

                <p
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  Your withdrawal requests
                  will appear here.
                </p>
              </div>
            ) : (
              <div style={withdrawalList}>
                {withdrawals.map(
                  (withdrawal) => (
                    <div
                      key={withdrawal.id}
                      style={withdrawalRow}
                      className="tb-mobile-withdrawal-row"
                    >
                      <div>
                        <strong
                          style={{
                            display:
                              "block",
                            fontSize:
                              "16px",
                          }}
                        >
                          {formatCurrency(
                            Number(
                              withdrawal.amount
                            )
                          )}
                        </strong>

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "5px",
                            color:
                              "rgba(255,255,255,0.35)",
                            fontSize:
                              "11px",
                          }}
                        >
                          {formatMethod(
                            withdrawal.method
                          )}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <WithdrawalStatus
                          status={
                            withdrawal.status
                          }
                        />

                        <span
                          style={{
                            display:
                              "block",
                            marginTop:
                              "6px",
                            color:
                              "rgba(255,255,255,0.3)",
                            fontSize:
                              "11px",
                          }}
                        >
                          {new Date(
                            withdrawal.created_at
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* =================================================
              BUY / SELL SUMMARY
          ================================================= */}

          <div
            style={summaryGrid}
            className="tb-mobile-summary"
          >
            <SummaryCard
              icon={
                <ArrowUpRight size={17} />
              }
              title="Pooled Buy Value"
              value={formatCurrency(
                totalBuyValue
              )}
              subtitle={`${buyTrades.length} ${
                buyTrades.length === 1
                  ? "buy"
                  : "buys"
              }`}
              positive
            />

            <SummaryCard
              icon={
                <ArrowDownRight size={17} />
              }
              title="Pooled Sell Value"
              value={formatCurrency(
                totalSellValue
              )}
              subtitle={`${sellTrades.length} ${
                sellTrades.length === 1
                  ? "sell"
                  : "sells"
              }`}
            />

            <SummaryCard
              icon={
                <BarChart3 size={17} />
              }
              title="Stocks Traded"
              value={uniqueSymbols.toString()}
              subtitle="Unique symbols"
            />
          </div>

          {/* =================================================
              MEMBER ACCOUNT
          ================================================= */}

          <section
            style={sectionStyle}
            className="tb-mobile-section"
          >
            <div
              style={sectionHeaderStyle}
              className="tb-mobile-section-header"
            >
              <div>
                <h2 style={sectionTitle}>
                  Your Account
                </h2>

                <p
                  style={sectionSubtitle}
                >
                  Your cooperative
                  investment information.
                </p>
              </div>

              <span
                style={{
                  padding: "7px 11px",
                  borderRadius: "10px",
                  background:
                    member?.status ===
                    "active"
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(248,113,113,0.1)",
                  color:
                    member?.status ===
                    "active"
                      ? "#34d399"
                      : "#f87171",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform:
                    "capitalize",
                }}
              >
                {member?.status}
              </span>
            </div>

            <div
              style={accountGrid}
              className="tb-mobile-account-grid"
            >
              <AccountItem
                label="Member Name"
                value={
                  member?.full_name ||
                  userName
                }
              />

              <AccountItem
                label="Phone"
                value={
                  member?.phone ||
                  "Not provided"
                }
              />

              <AccountItem
                label="Investment"
                value={formatCurrency(
                  Number(
                    member?.investment_amount ||
                      0
                  )
                )}
              />

              <AccountItem
                label="Profit Share"
                value={`${Number(
                  member?.profit_share ||
                    0
                ).toFixed(2)}%`}
              />
            </div>
          </section>

          {/* =================================================
              POOLED TRADES
          ================================================= */}

          <section
            style={sectionStyle}
            className="tb-mobile-section"
          >
            <div
              style={sectionHeaderStyle}
              className="tb-mobile-section-header"
            >
              <div>
                <h2 style={sectionTitle}>
                  Pooled Trades
                </h2>

                <p
                  style={sectionSubtitle}
                >
                  Trades executed on behalf
                  of the cooperative pool.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color:
                    "rgba(255,255,255,0.35)",
                  fontSize: "12px",
                  flexShrink: 0,
                }}
              >
                <Lock size={14} />
                Read Only
              </div>
            </div>

            {trades.length === 0 ? (
              <div style={emptyState}>
                <TrendingUp
                  size={30}
                  style={{
                    marginBottom: "10px",
                    opacity: 0.5,
                  }}
                />

                <div>
                  No pooled trades have
                  been recorded yet.
                </div>

                <p
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  Trading activity will
                  appear here when your
                  trader records a trade.
                </p>
              </div>
            ) : (
              <>
                <div className="tb-mobile-scroll-hint">
                  <ChevronLeft size={12} />
                  Swipe horizontally to view all trade details
                  <ChevronRight size={12} />
                </div>

                <div
                  className="tb-mobile-trades"
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <div
                    className="tb-mobile-trade-inner"
                    style={{
                      minWidth: "1050px",
                    }}
                  >
                    <div
                      style={tableHeader}
                    >
                      <span>Symbol</span>
                      <span>Type</span>
                      <span>Quantity</span>
                      <span>Price</span>
                      <span>Total</span>
                      <span>Date</span>
                      <span>Proof</span>
                    </div>

                    <div style={tradeList}>
                      {trades.map(
                        (trade) => {
                          const isBuy =
                            trade.trade_type
                              .toLowerCase() ===
                            "buy";

                          const proofCount =
                            trade.proofPhotos?.length ||
                            0;

                          return (
                            <div
                              key={trade.id}
                              style={{
                                ...tradeRow,
                                gridTemplateColumns:
                                  "1.1fr 0.9fr 1fr 1.1fr 1.2fr 1.4fr 1fr",
                              }}
                            >
                              <strong>
                                {trade.symbol}
                              </strong>

                              <span
                                style={{
                                  display:
                                    "inline-flex",
                                  width:
                                    "fit-content",
                                  padding:
                                    "5px 9px",
                                  borderRadius:
                                    "8px",
                                  background:
                                    isBuy
                                      ? "rgba(52,211,153,0.1)"
                                      : "rgba(248,113,113,0.1)",
                                  color:
                                    isBuy
                                      ? "#34d399"
                                      : "#f87171",
                                  fontSize:
                                    "12px",
                                  fontWeight:
                                    600,
                                  textTransform:
                                    "capitalize",
                                }}
                              >
                                {
                                  trade.trade_type
                                }
                              </span>

                              <span>
                                {Number(
                                  trade.quantity
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </span>

                              <span>
                                {formatCurrency(
                                  Number(
                                    trade.price
                                  )
                                )}
                              </span>

                              <strong>
                                {formatCurrency(
                                  Number(
                                    trade.total_amount
                                  )
                                )}
                              </strong>

                              <span
                                style={{
                                  color:
                                    "rgba(255,255,255,0.4)",
                                  fontSize:
                                    "12px",
                                }}
                              >
                                {new Date(
                                  trade.trade_date
                                ).toLocaleString(
                                  "en-IN"
                                )}
                              </span>

                              {proofCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openProofViewer(
                                      trade
                                    )
                                  }
                                  style={
                                    proofButton
                                  }
                                >
                                  <ImageIcon
                                    size={15}
                                  />

                                  <span>
                                    View
                                  </span>

                                  <span
                                    style={
                                      proofCountBadge
                                    }
                                  >
                                    {proofCount}
                                  </span>
                                </button>
                              ) : (
                                <span
                                  style={
                                    noProofText
                                  }
                                >
                                  No proof
                                </span>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* =================================================
              SECURITY NOTICE
          ================================================= */}

          <div
            style={securityNotice}
            className="tb-mobile-security"
          >
            <Lock size={16} />

            <span>
              Your account is read-only.
              Withdrawal requests require
              administrator approval.
            </span>
          </div>
        </div>

        {/* =====================================================
            WITHDRAWAL MODAL
        ===================================================== */}

        {showWithdrawalModal && (
          <div
            style={modalOverlay}
            className="tb-mobile-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeWithdrawalModal();
              }
            }}
          >
            <div
              style={modal}
              className="tb-mobile-modal"
            >
              <div style={modalHeader}>
                <div>
                  <div
                    style={modalEyebrow}
                  >
                    MEMBER ACTION
                  </div>

                  <h2
                    style={modalTitle}
                    className="tb-mobile-modal-title"
                  >
                    Request Withdrawal
                  </h2>

                  <p
                    style={modalSubtitle}
                  >
                    Submit a request for
                    administrator approval.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeWithdrawalModal
                  }
                  style={closeButton}
                  aria-label="Close withdrawal modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                style={availableBox}
              >
                <span>
                  Current Investment
                </span>

                <strong>
                  {formatCurrency(
                    Number(
                      member?.investment_amount ||
                        0
                    )
                  )}
                </strong>
              </div>

              <div style={formGroup}>
                <label style={formLabel}>
                  Withdrawal Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    withdrawalAmount
                  }
                  onChange={(event) =>
                    setWithdrawalAmount(
                      event.target.value
                    )
                  }
                  placeholder="Enter amount"
                  style={formInput}
                  inputMode="decimal"
                />
              </div>

              <div style={formGroup}>
                <label style={formLabel}>
                  Withdrawal Method
                </label>

                <select
                  value={
                    withdrawalMethod
                  }
                  onChange={(event) =>
                    setWithdrawalMethod(
                      event.target.value
                    )
                  }
                  style={formInput}
                >
                  <option value="upi">
                    UPI
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>

                  <option value="cash">
                    Cash
                  </option>

                  <option value="cheque">
                    Cheque
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </div>

              <div style={formGroup}>
                <label style={formLabel}>
                  Payment / Account Details
                </label>

                <textarea
                  value={
                    accountDetails
                  }
                  onChange={(event) =>
                    setAccountDetails(
                      event.target.value
                    )
                  }
                  placeholder={
                    withdrawalMethod ===
                    "upi"
                      ? "Enter your UPI ID"
                      : "Enter bank/payment details"
                  }
                  style={{
                    ...formInput,
                    minHeight: "90px",
                    resize:
                      "vertical" as const,
                  }}
                />
              </div>

              <div
                style={modalNotice}
              >
                <Clock size={15} />

                <span>
                  Your request will remain
                  pending until an
                  administrator reviews it.
                </span>
              </div>

              <div
                style={modalActions}
                className="tb-mobile-modal-actions"
              >
                <button
                  type="button"
                  onClick={
                    closeWithdrawalModal
                  }
                  disabled={
                    submittingWithdrawal
                  }
                  style={cancelButton}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    submitWithdrawal
                  }
                  disabled={
                    submittingWithdrawal
                  }
                  style={{
                    ...withdrawButton,
                    flex: 1,
                    justifyContent:
                      "center",
                    opacity:
                      submittingWithdrawal
                        ? 0.6
                        : 1,
                  }}
                >
                  <Wallet size={17} />

                  {submittingWithdrawal
                    ? "Submitting..."
                    : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            TRADE PROOF FULLSCREEN VIEWER
        ===================================================== */}

        {showProofModal &&
          selectedTrade &&
          selectedTrade.proofPhotos.length >
            0 && (
            <div
              style={proofOverlay}
              onMouseDown={(event) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  closeProofViewer();
                }
              }}
            >
              {/* TOP BAR */}

              <div
                style={proofTopBar}
                className="tb-mobile-proof-top"
              >
                <div>
                  <div
                    style={{
                      color:
                        "rgba(255,255,255,0.4)",
                      fontSize: "10px",
                      letterSpacing:
                        "3px",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Trade Proof
                  </div>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "18px",
                    }}
                  >
                    {selectedTrade.symbol}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      color:
                        "rgba(255,255,255,0.4)",
                      fontSize: "11px",
                    }}
                  >
                    {selectedTrade.trade_type
                      .toUpperCase()}{" "}
                    •{" "}
                    {new Date(
                      selectedTrade.trade_date
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    closeProofViewer
                  }
                  style={
                    proofCloseButton
                  }
                  aria-label="Close trade proof"
                >
                  <X size={20} />
                </button>
              </div>

              {/* IMAGE AREA */}

              <div
                style={proofImageArea}
                className="tb-mobile-proof-area"
              >
                {selectedTrade.proofPhotos.length >
                  1 && (
                  <button
                    type="button"
                    onClick={
                      previousProof
                    }
                    style={
                      proofNavigationButton
                    }
                    className="tb-mobile-proof-nav"
                    aria-label="Previous proof"
                  >
                    <ChevronLeft
                      size={25}
                    />
                  </button>
                )}

                <img
                  src={
                    selectedTrade
                      .proofPhotos[
                      selectedProofIndex
                    ]
                  }
                  alt={`Trade proof ${
                    selectedProofIndex + 1
                  } for ${
                    selectedTrade.symbol
                  }`}
                  style={
                    proofImage
                  }
                  className="tb-mobile-proof-image"
                />

                {selectedTrade.proofPhotos.length >
                  1 && (
                  <button
                    type="button"
                    onClick={
                      nextProof
                    }
                    style={
                      proofNavigationButton
                    }
                    className="tb-mobile-proof-nav"
                    aria-label="Next proof"
                  >
                    <ChevronRight
                      size={25}
                    />
                  </button>
                )}
              </div>

              {/* BOTTOM INFO */}

              <div
                style={proofBottomBar}
                className="tb-mobile-proof-bottom"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ImageIcon
                    size={15}
                  />

                  <span>
                    Proof{" "}
                    {selectedProofIndex +
                      1}{" "}
                    of{" "}
                    {
                      selectedTrade
                        .proofPhotos
                        .length
                    }
                  </span>
                </div>

                {selectedTrade.proofPhotos.length >
                  1 && (
                  <div
                    style={
                      proofThumbnailRow
                    }
                    className="tb-mobile-proof-thumbnails"
                  >
                    {selectedTrade.proofPhotos.map(
                      (
                        photo,
                        index
                      ) => (
                        <button
                          key={
                            `${photo}-${index}`
                          }
                          type="button"
                          onClick={() =>
                            setSelectedProofIndex(
                              index
                            )
                          }
                          style={{
                            ...proofThumbnailButton,
                            opacity:
                              index ===
                              selectedProofIndex
                                ? 1
                                : 0.45,
                          }}
                        >
                          <img
                            src={photo}
                            alt={`Proof ${
                              index + 1
                            }`}
                            style={
                              proofThumbnail
                            }
                          />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
      </main>
    </>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Stat({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div
      style={statCard}
      className="tb-mobile-stat-card"
    >
      <div
        style={statLabel}
        className="tb-mobile-stat-label"
      >
        {icon}
        {title}
      </div>

      <h2 style={statValue}>
        {value}
      </h2>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  positive = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  positive?: boolean;
}) {
  return (
    <div
      style={summaryCard}
      className="tb-mobile-summary-card"
    >
      <div style={statLabel}>
        {icon}
        {title}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "8px",
          fontSize: "21px",
          color: positive
            ? "#34d399"
            : "white",
        }}
      >
        {value}
      </strong>

      <span
        style={{
          display: "block",
          marginTop: "4px",
          color:
            "rgba(255,255,255,0.3)",
          fontSize: "12px",
        }}
      >
        {subtitle}
      </span>
    </div>
  );
}

function AccountItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "14px",
        background:
          "rgba(255,255,255,0.035)",
        border:
          "1px solid rgba(255,255,255,0.06)",
      }}
      className="tb-mobile-account-item"
    >
      <span
        style={{
          display: "block",
          color:
            "rgba(255,255,255,0.35)",
          fontSize: "11px",
          textTransform:
            "uppercase",
          letterSpacing:
            "0.07em",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          display: "block",
          marginTop: "6px",
          fontSize: "14px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function WithdrawalStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    status?.toLowerCase();

  if (normalized === "approved") {
    return (
      <span
        style={{
          ...statusBadge,
          color: "#34d399",
          background:
            "rgba(52,211,153,0.1)",
          border:
            "1px solid rgba(52,211,153,0.18)",
        }}
      >
        <CheckCircle2 size={14} />
        Approved
      </span>
    );
  }

  if (normalized === "rejected") {
    return (
      <span
        style={{
          ...statusBadge,
          color: "#f87171",
          background:
            "rgba(248,113,113,0.1)",
          border:
            "1px solid rgba(248,113,113,0.18)",
        }}
      >
        <XCircle size={14} />
        Rejected
      </span>
    );
  }

  return (
    <span
      style={{
        ...statusBadge,
        color: "#facc15",
        background:
          "rgba(250,204,21,0.1)",
        border:
          "1px solid rgba(250,204,21,0.18)",
      }}
    >
      <Clock size={14} />
      Pending
    </span>
  );
}

/* =========================================================
   GENERAL STYLES
========================================================= */

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, #151515 0%, #050505 45%)",
  color: "white",
  padding: "30px",
};

const containerStyle = {
  maxWidth: "1250px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: "35px",
  gap: "20px",
};

const eyebrowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "9px",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "12px",
  letterSpacing: "3px",
  textTransform:
    "uppercase" as const,
};

const titleStyle = {
  fontSize: "40px",
  margin: "10px 0 0",
  letterSpacing: "-1.8px",
};

const subtitleStyle = {
  color:
    "rgba(255,255,255,0.45)",
  marginTop: "7px",
  fontSize: "14px",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "25px",
};

const statCard = {
  padding: "21px",
  borderRadius: "20px",
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const statLabel = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const statValue = {
  marginTop: "9px",
  fontSize: "24px",
  letterSpacing: "-0.5px",
};

const summaryCard = {
  padding: "20px",
  borderRadius: "18px",
  background:
    "rgba(255,255,255,0.035)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const sectionStyle = {
  background:
    "rgba(255,255,255,0.05)",
  border:
    "1px solid rgba(255,255,255,0.1)",
  borderRadius: "26px",
  padding: "28px",
  backdropFilter: "blur(20px)",
  marginBottom: "20px",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px",
  gap: "15px",
};

const sectionTitle = {
  fontSize: "23px",
  fontWeight: 600,
  margin: 0,
};

const sectionSubtitle = {
  marginTop: "5px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const accountGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "12px",
};

const tableHeader = {
  display: "grid",
  gridTemplateColumns:
    "1.1fr 0.9fr 1fr 1.1fr 1.2fr 1.4fr 1fr",
  gap: "15px",
  padding: "0 17px 11px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "11px",
  textTransform:
    "uppercase" as const,
  letterSpacing: "0.07em",
};

const tradeList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "9px",
};

const tradeRow = {
  display: "grid",
  gap: "15px",
  alignItems: "center",
  padding: "17px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.25)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const emptyState = {
  padding: "50px 20px",
  textAlign:
    "center" as const,
  color:
    "rgba(255,255,255,0.4)",
  background:
    "rgba(0,0,0,0.2)",
  borderRadius: "18px",
  border:
    "1px solid rgba(255,255,255,0.05)",
};

const securityNotice = {
  marginTop: "20px",
  padding: "15px 18px",
  borderRadius: "15px",
  background:
    "rgba(255,255,255,0.03)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
};

const primaryButton = {
  marginTop: "20px",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 17px",
  borderRadius: "13px",
  border: "none",
  background: "white",
  color: "black",
  fontWeight: 600,
  cursor: "pointer",
};

const logoutButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 16px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};

const withdrawalSection = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "20px",
  padding: "23px 25px",
  borderRadius: "22px",
  background:
    "rgba(255,255,255,0.045)",
  border:
    "1px solid rgba(255,255,255,0.09)",
};

const withdrawalTitleRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const withdrawalTitle = {
  margin: 0,
  fontSize: "19px",
};

const withdrawalSubtitle = {
  marginTop: "6px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "12px",
};

const pendingNotice = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  marginTop: "10px",
  padding: "7px 10px",
  borderRadius: "9px",
  background:
    "rgba(250,204,21,0.08)",
  border:
    "1px solid rgba(250,204,21,0.15)",
  color: "#facc15",
  fontSize: "11px",
};

const withdrawButton = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "12px 17px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.14)",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace:
    "nowrap" as const,
};

const withdrawalList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "9px",
};

const withdrawalRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "17px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.25)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const statusBadge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 600,
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

const loadingStyle = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
};

/* =========================================================
   PROOF STYLES
========================================================= */

const proofButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  width: "fit-content",
  padding: "8px 11px",
  borderRadius: "10px",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 600,
};

const proofCountBadge = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "18px",
  height: "18px",
  padding: "0 4px",
  borderRadius: "999px",
  background:
    "rgba(255,255,255,0.12)",
  fontSize: "9px",
};

const noProofText = {
  color:
    "rgba(255,255,255,0.25)",
  fontSize: "11px",
};

const proofOverlay = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 10000,
  display: "flex",
  flexDirection:
    "column" as const,
  background:
    "rgba(0,0,0,0.94)",
  backdropFilter: "blur(18px)",
};

const proofTopBar = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "20px",
  padding: "22px 25px",
  borderBottom:
    "1px solid rgba(255,255,255,0.08)",
};

const proofCloseButton = {
  width: "40px",
  height: "40px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
};

const proofImageArea = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "20px",
  padding: "25px",
};

const proofImage = {
  maxWidth: "calc(100vw - 180px)",
  maxHeight: "calc(100vh - 220px)",
  objectFit: "contain" as const,
  borderRadius: "16px",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.7)",
  userSelect: "none" as const,
};

const proofNavigationButton = {
  width: "48px",
  height: "48px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border:
    "1px solid rgba(255,255,255,0.12)",
  background:
    "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
};

const proofBottomBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "20px",
  padding: "15px 25px",
  borderTop:
    "1px solid rgba(255,255,255,0.08)",
  color:
    "rgba(255,255,255,0.45)",
  fontSize: "11px",
};

const proofThumbnailRow = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  overflowX: "auto" as const,
};

const proofThumbnailButton = {
  width: "48px",
  height: "38px",
  padding: "0",
  borderRadius: "7px",
  overflow: "hidden" as const,
  border:
    "1px solid rgba(255,255,255,0.15)",
  background: "black",
  cursor: "pointer",
};

const proofThumbnail = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

/* =========================================================
   PORTFOLIO STYLES
========================================================= */

const portfolioSection = {
  marginBottom: "20px",
  padding: "28px",
  borderRadius: "26px",
  background:
    "linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.035))",
  border:
    "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(20px)",
  overflow: "hidden",
};

const portfolioHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "22px",
};

const portfolioEyebrow = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  color:
    "rgba(255,255,255,0.35)",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: 600,
};

const portfolioTitle = {
  margin: "8px 0 0",
  fontSize: "25px",
  letterSpacing: "-0.7px",
};

const portfolioSubtitle = {
  marginTop: "6px",
  color:
    "rgba(255,255,255,0.38)",
  fontSize: "12px",
};

const performanceSummaryGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "18px",
};

const performanceMiniCard = {
  padding: "15px",
  borderRadius: "15px",
  background:
    "rgba(0,0,0,0.2)",
  border:
    "1px solid rgba(255,255,255,0.06)",
};

const miniLabel = {
  display: "block",
  color:
    "rgba(255,255,255,0.32)",
  fontSize: "10px",
  textTransform:
    "uppercase" as const,
  letterSpacing: "0.07em",
};

const miniValue = {
  display: "block",
  marginTop: "6px",
  fontSize: "17px",
};

const chartContainer = {
  width: "100%",
  padding: "10px 0 0",
  borderRadius: "18px",
  background:
    "rgba(0,0,0,0.15)",
};

const performanceDisclaimer = {
  display: "flex",
  alignItems: "flex-start",
  gap: "7px",
  marginTop: "13px",
  padding: "11px 13px",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,0.025)",
  border:
    "1px solid rgba(255,255,255,0.05)",
  color:
    "rgba(255,255,255,0.3)",
  fontSize: "10px",
  lineHeight: 1.5,
};

/* =========================================================
   MODAL STYLES
========================================================= */

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
  backdropFilter: "blur(14px)",
};

const modal = {
  width: "100%",
  maxWidth: "540px",
  maxHeight: "90vh",
  overflowY: "auto" as const,
  padding: "28px",
  borderRadius: "25px",
  background: "#111",
  border:
    "1px solid rgba(255,255,255,0.12)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,0.6)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "22px",
};

const modalEyebrow = {
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: 600,
};

const modalTitle = {
  marginTop: "8px",
  fontSize: "25px",
};

const modalSubtitle = {
  marginTop: "6px",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "13px",
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

const availableBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px",
  marginBottom: "20px",
  borderRadius: "13px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
};

const formGroup = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "8px",
  marginBottom: "16px",
};

const formLabel = {
  color:
    "rgba(255,255,255,0.65)",
  fontSize: "12px",
  fontWeight: 600,
};

const formInput = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "13px 14px",
  borderRadius: "12px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  outline: "none",
  fontSize: "14px",
};

const modalNotice = {
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  padding: "12px",
  borderRadius: "12px",
  background:
    "rgba(255,255,255,0.04)",
  border:
    "1px solid rgba(255,255,255,0.07)",
  color:
    "rgba(255,255,255,0.4)",
  fontSize: "11px",
  lineHeight: 1.5,
};

const modalActions = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const cancelButton = {
  padding: "13px 18px",
  borderRadius: "13px",
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.05)",
  color: "white",
  cursor: "pointer",
};