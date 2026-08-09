"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { createClient } from "@/lib/supabase";

type ChartPoint = {
  date: string;
  value: number;
};

export default function PortfolioChart() {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChart() {
      const supabase = createClient();

      const { data: investments, error } = await supabase
        .from("investments")
        .select("current_value, updated_at")
        .order("updated_at", { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const points: ChartPoint[] = (investments ?? []).map(
        (investment) => ({
          date: new Date(
            investment.updated_at
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
          value: Number(investment.current_value || 0),
        })
      );

      setData(points);
      setLoading(false);
    }

    loadChart();
  }, []);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString("en-IN")}`;

  return (
    <div
      style={{
        height: "350px",
        marginTop: "30px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px",
        padding: "25px",
        backdropFilter: "blur(20px)",
      }}
    >
      <h2
        style={{
          color: "white",
          fontSize: "22px",
          fontWeight: 600,
          marginBottom: "20px",
        }}
      >
        Portfolio Value
      </h2>

      {loading ? (
        <div
          style={{
            height: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Loading portfolio...
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            height: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Add an investment to see portfolio growth.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="80%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 10,
              bottom: 10,
            }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
            />

            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.5)"
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                `₹${Number(value).toLocaleString("en-IN")}`
              }
            />

            <Tooltip
              contentStyle={{
                background: "#111",
                border:
                  "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                color: "white",
              }}
              formatter={(value) =>
                formatCurrency(Number(value))
              }
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="white"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "white",
              }}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}