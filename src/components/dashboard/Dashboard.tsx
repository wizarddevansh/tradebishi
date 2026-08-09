"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import StatCard from "./StatCard";
import PortfolioChart from "./PortfolioChart";
import Transactions from "./Transactions";
import Members from "./Members";
import Deposits from "./Deposits";
import Welcome from "./Welcome";
import Investments from "./Investments";
import Trades from "./Trades";
import Reports from "./Reports";
import Settings from "./Settings";
import TraderAccount from "./TraderAccount";
import { createClient } from "@/lib/supabase";

export default function Dashboard() {
  const [activeSection, setActiveSection] =
    useState("Overview");

  const [totalInvested, setTotalInvested] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [portfolioGrowth, setPortfolioGrowth] =
    useState(0);

  useEffect(() => {
    function handleQuickNavigation(
      event: Event
    ) {
      const customEvent = event as CustomEvent<string>;

      if (customEvent.detail) {
        setActiveSection(customEvent.detail);
      }
    }

    window.addEventListener(
      "tradebishi:navigate",
      handleQuickNavigation
    );

    return () => {
      window.removeEventListener(
        "tradebishi:navigate",
        handleQuickNavigation
      );
    };
  }, []);

  useEffect(() => {
    async function loadOverview() {
      const supabase = createClient();

      const [
        membersResult,
        investmentsResult,
      ] = await Promise.all([
        supabase
          .from("members")
          .select("id, status"),

        supabase
          .from("investments")
          .select(
            "invested_amount, current_value, profit_loss"
          ),
      ]);

      if (!membersResult.error) {
        const active = (
          membersResult.data ?? []
        ).filter(
          (member) =>
            member.status?.toLowerCase() ===
            "active"
        ).length;

        setActiveMembers(active);
      }

      if (!investmentsResult.error) {
        const investments =
          investmentsResult.data ?? [];

        const invested = investments.reduce(
          (sum, item) =>
            sum +
            Number(item.invested_amount || 0),
          0
        );

        const current = investments.reduce(
          (sum, item) =>
            sum +
            Number(item.current_value || 0),
          0
        );

        const profit = investments.reduce(
          (sum, item) =>
            sum +
            Number(item.profit_loss || 0),
          0
        );

        setTotalInvested(invested);
        setCurrentValue(current);
        setTotalProfit(profit);

        setPortfolioGrowth(
          invested > 0
            ? (profit / invested) * 100
            : 0
        );
      }
    }

    loadOverview();
  }, []);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <>
      <style>{`
        .dashboard-layout {
          min-height: 100vh;
          background: #050505;
          display: flex;
        }

        .dashboard-content {
          flex: 1;
          color: white;
          min-width: 0;
        }

        .dashboard-main {
          padding: 35px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
        }

        @media (max-width: 1100px) {
          .overview-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .dashboard-layout {
            display: block;
          }

          .dashboard-main {
            padding: 20px;
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .dashboard-main {
            padding: 15px;
          }
        }
      `}</style>

      <div className="dashboard-layout">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />

        <div className="dashboard-content">
          <Topbar />

          {activeSection === "Overview" && (
            <Welcome />
          )}

          <main className="dashboard-main">
            {activeSection === "Overview" && (
              <>
                <div className="overview-grid">
                  <StatCard
                    title="Total Invested"
                    value={formatCurrency(
                      totalInvested
                    )}
                    change="Capital invested"
                  />

                  <StatCard
                    title="Portfolio Value"
                    value={formatCurrency(
                      currentValue
                    )}
                    change="Current investment value"
                  />

                  <StatCard
                    title="Total Profit / Loss"
                    value={formatCurrency(
                      totalProfit
                    )}
                    change={
                      totalProfit >= 0
                        ? "Positive performance"
                        : "Negative performance"
                    }
                  />

                  <StatCard
                    title="Portfolio Growth"
                    value={`${portfolioGrowth.toFixed(
                      2
                    )}%`}
                    change="Return on invested capital"
                  />
                </div>

                <PortfolioChart />

                <Transactions />

                <Members />

                <Deposits />
              </>
            )}

            {activeSection === "Members" && (
              <Members />
            )}

            {activeSection === "Investments" && (
              <Investments />
            )}

            {activeSection === "Deposits" && (
              <Deposits />
            )}

            {activeSection === "Trades" && (
              <Trades />
            )}

            {activeSection === "Reports" && (
              <Reports />
            )}

            {activeSection === "Settings" && (
              <Settings />
            )}
            {activeSection === "Trader Account" && (
  <TraderAccount />
)}
          </main>
        </div>
      </div>
    </>
  );
}