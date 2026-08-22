import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

import { AppShell } from "@/components/layout/app-shell";
import { AnimatedNumber, PageLoader, Reveal } from "@/components/ui/bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { getAnalytics } from "@/lib/analytics.functions";
import { formatCurrency } from "@/lib/format";
import {
  ACCENT,
  DESTRUCTIVE,
  DeptBars,
  MultiLine,
  PayrollBars,
  StatusDonut,
  SUCCESS,
  TrendArea,
  WARNING,
} from "@/components/charts/dayflow-charts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Dayflow HR" },
      { name: "description", content: "Workforce, attendance, leave, and payroll analytics for HR decision-makers." },
      { property: "og:title", content: "Analytics — Dayflow HR" },
      { property: "og:description", content: "Workforce, attendance, leave, and payroll analytics for HR decision-makers." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { session, isLoading: sessionLoading } = useSession();
  const isStaff = !!session && (session.role === "admin" || session.role === "hr");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => getAnalytics(),
    enabled: isStaff,
  });

  if (sessionLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><PageLoader /></div>;
  }

  if (!isStaff) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <h1 className="font-display text-2xl font-extrabold">Analytics</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Organization analytics are available to HR and Admin roles.
          </p>
          <Link to="/dashboard" className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  if (isLoading || !data) {
    return (
      <AppShell>
        <PageLoader />
      </AppShell>
    );
  }

  const headStats = [
    { label: "Workforce", value: data.workforce.total },
    { label: "Attendance rate (30d)", value: data.attendance.rate, format: (n: number) => `${n.toFixed(1)}%` },
    { label: "Pending leave requests", value: data.leave.pending },
    { label: "Payroll (this month)", value: data.payroll.currentMonthTotal, format: (n: number) => formatCurrency(n) },
  ];

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">The pulse of your organization — workforce, attendance, leave, and payroll.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {headStats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05}>
              <Card>
                <CardContent className="p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">
                    <AnimatedNumber value={s.value} format={s.format} />
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Attendance — last 14 days</CardTitle></CardHeader>
              <CardContent>
                <MultiLine data={data.attendance.trend} />
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Present</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Absent</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Leave</span>
                </div>
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">30-day status split</CardTitle></CardHeader>
              <CardContent>
                <StatusDonut
                  slices={[
                    { name: "Present", value: data.attendance.present30d, color: SUCCESS },
                    { name: "Absent", value: data.attendance.absent30d, color: DESTRUCTIVE },
                    { name: "Half day", value: data.attendance.halfDay30d, color: WARNING },
                    { name: "Leave", value: data.attendance.leave30d, color: ACCENT },
                  ]}
                />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Headcount by department</CardTitle></CardHeader>
              <CardContent>
                <DeptBars data={data.workforce.byDepartment} />
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Salary distribution (net)</CardTitle></CardHeader>
              <CardContent>
                <PayrollBars data={data.payroll.distribution} />
              </CardContent>
            </Card>
          </Reveal>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Monthly payroll totals</CardTitle></CardHeader>
              <CardContent>
                <TrendArea data={data.payroll.monthlyTotals} dataKey="total" />
              </CardContent>
            </Card>
          </Reveal>
          <Reveal delay={0.06}>
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Leave usage this year</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-secondary/60 p-4 text-center">
                    <p className="font-display text-2xl font-extrabold text-warning">{data.leave.pending}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4 text-center">
                    <p className="font-display text-2xl font-extrabold text-success">{data.leave.approvedThisYear}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="rounded-xl bg-secondary/60 p-4 text-center">
                    <p className="font-display text-2xl font-extrabold text-destructive">{data.leave.rejectedThisYear}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
                {data.leave.byType.map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="font-data text-muted-foreground">{t.days} days taken</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </motion.div>
    </AppShell>
  );
}
