"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type TimePoint = {
  bucket: string; traces: number; costUsd: number;
  promptTokens: number; completionTokens: number;
};

export function VolumeChart({ data }: { data: TimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey="traces" stroke="#2563eb" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CostChart({ data }: { data: TimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
        <Tooltip formatter={(v) => `$${Number(v ?? 0).toFixed(4)}`} />
        <Line type="monotone" dataKey="costUsd" stroke="#16a34a" dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TokenChart({ data }: { data: TimePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip />
        <Legend />
        <Bar dataKey="promptTokens" stackId="t" fill="#93c5fd" name="prompt" />
        <Bar dataKey="completionTokens" stackId="t" fill="#2563eb" name="completion" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PassRateChart({ data }: { data: { evaluator: string; passRate: number | null }[] }) {
  const shaped = data.map((d) => ({
    evaluator: d.evaluator,
    passRate: d.passRate === null ? 0 : Math.round(d.passRate * 100),
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={shaped} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="evaluator" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v) => `${Number(v ?? 0)}%`} />
        <Bar dataKey="passRate" fill="#7c3aed" />
      </BarChart>
    </ResponsiveContainer>
  );
}