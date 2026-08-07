"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { SpendingVsPlanRow } from "@/lib/budget-display";
import type { PieSlice } from "@/lib/dashboard-display";

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const TEAL = "#15302F";
const ORANGE = "#FB4D30";
const BEIGE = "#EEE3D2";
const GREEN = "#22C55E";
const SKY = "#0EA5E9";

export interface TrendPoint {
  key: string;
  label: string;
  netWorth: number;
  netIncome: number;
  investmentsPct: number;
  savingsPct: number;
  id: string;
}

export function NetWorthTrendChart({ data, onPointClick }: { data: TrendPoint[]; onPointClick: (state: unknown) => void }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} onClick={onPointClick as never} style={{ cursor: "pointer" }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
        <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={12} width={70} />
        <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
        <Line type="monotone" dataKey="netWorth" stroke={TEAL} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SavingsInvestmentChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
        <YAxis tickFormatter={(v) => `${v}%`} stroke="#A3A3A3" fontSize={12} domain={[0, 100]} />
        <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v, name) => [`${Math.round(Number(v))}%`, String(name)]} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="investmentsPct" name="Investments" stackId="1" stroke={TEAL} fill={TEAL} fillOpacity={0.7} />
        <Area type="monotone" dataKey="savingsPct" name="Savings" stackId="1" stroke={SKY} fill={SKY} fillOpacity={0.7} />
        <ReferenceLine y={20} stroke={GREEN} strokeDasharray="3 3" label={{ value: "IWT target 20%", position: "insideTopRight", fontSize: 10, fill: GREEN }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function IncomeTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
        <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={12} width={70} />
        <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
        <Line type="monotone" dataKey="netIncome" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3 }} name="Net income" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SpendingVsPlanChart({ data }: { data: SpendingVsPlanRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} />
        <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={11} width={70} />
        <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="planned" name="Planned" fill={BEIGE} />
        <Bar dataKey="actual" name="Actual" fill={ORANGE} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FixedCostsPieChart({
  slices,
  highlighted,
  onSliceClick,
}: {
  slices: PieSlice[];
  highlighted: string | null;
  onSliceClick: (label: string) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={220} className="sm:w-1/2">
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={1}
          onClick={(d: unknown) => {
            const label = (d as { label?: string; payload?: { label?: string } })?.label
              ?? (d as { payload?: { label?: string } })?.payload?.label;
            if (label) onSliceClick(label);
          }}
          style={{ cursor: "pointer" }}
        >
          {slices.map((slice) => (
            <Cell key={slice.label} fill={slice.color} opacity={highlighted && highlighted !== slice.label ? 0.3 : 1} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }}
          formatter={(v, _n, p) => [fmt(Number(v)), (p as { payload?: { label?: string } })?.payload?.label ?? ""]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
