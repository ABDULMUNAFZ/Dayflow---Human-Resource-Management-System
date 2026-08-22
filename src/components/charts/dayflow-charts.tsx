import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ACCENT = "oklch(0.63 0.21 29)";
const SUCCESS = "oklch(0.72 0.17 160)";
const WARNING = "oklch(0.78 0.15 80)";
const DESTRUCTIVE = "oklch(0.62 0.21 25)";
const MUTED_LINE = "oklch(0.7 0.02 260 / 0.35)";
const GRID = "oklch(0.7 0.02 260 / 0.12)";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

export function TrendArea({ data, dataKey, color = ACCENT }: { data: Record<string, unknown>[]; dataKey: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={`g-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#g-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({ data }: { data: Record<string, unknown>[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={(d: string) => d.slice(5)} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="present" stroke={SUCCESS} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="absent" stroke={DESTRUCTIVE} strokeWidth={2} dot={false} strokeDasharray="5 4" />
        <Line type="monotone" dataKey="leave" stroke={WARNING} strokeWidth={2} dot={false} strokeDasharray="2 4" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DeptBars({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} width={110} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "transparent" }} />
        <Bar dataKey="count" radius={[4, 8, 8, 4]} barSize={14}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? ACCENT : MUTED_LINE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusDonut({ slices }: { slices: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} strokeWidth={0}>
          {slices.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PayrollBars({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "transparent" }} />
        <Bar dataKey="count" radius={[6, 6, 2, 2]} barSize={36} fill={ACCENT} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { ACCENT, SUCCESS, WARNING, DESTRUCTIVE };
