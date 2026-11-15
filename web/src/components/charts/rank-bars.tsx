"use client"
import { ANIM, DUR } from "@/lib/anim"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { short } from "@/lib/format"
import type { RankRow } from "@/lib/types"

const COLORS = ["#254aa5", "#ea1a85", "#56b4e9", "#e69f00", "#009e73", "#6b7aa8"]
export function ContribBars({ rows, labels, keys, height = 380 }: { rows: RankRow[]; labels: Record<string, string>; keys: string[]; height?: number }) {
  const data = rows.map((r) => ({ name: short(r.name), ...Object.fromEntries(keys.map((k) => [k, r.contrib[k] ?? 0])) }))
  const config: ChartConfig = Object.fromEntries(keys.map((k, i) => [k, { label: labels[k] ?? k, color: COLORS[i % COLORS.length] }]))
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12 }} barCategoryGap={5}>
        <CartesianGrid horizontal={false} strokeDasharray="0" stroke="#e8ecf5" />
        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} fontSize={11.5} interval={0} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v) => labels[v as string] ?? v} />
        <ChartTooltip cursor={{ fill: "rgba(37,74,165,0.05)" }} content={<ChartTooltipContent indicator="dot" />} />
        {keys.map((k, i) => <Bar key={k} isAnimationActive={ANIM} animationDuration={DUR} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === keys.length - 1 ? [0, 4, 4, 0] : 0}><Cell /></Bar>)}
      </BarChart>
    </ChartContainer>
  )
}
