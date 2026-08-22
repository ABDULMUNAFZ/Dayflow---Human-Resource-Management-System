import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarOff, Clock, LogIn, LogOut, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { AnimatedNumber, PageLoader, Reveal, StatusPill, leaveVariant } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { checkIn, checkOut, getMyAttendance } from "@/lib/attendance.functions";
import { getAdminDashboard } from "@/lib/dashboard.functions";
import { formatCurrency, formatDuration, formatTime, greeting, todayISO, workDurationMs } from "@/lib/format";
import { TrendArea } from "@/components/charts/dayflow-charts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Dayflow HR" },
      { name: "description", content: "Your Dayflow command center — attendance, leave, payroll, and team pulse at a glance." },
      { property: "og:title", content: "Dashboard — Dayflow HR" },
      { property: "og:description", content: "Your Dayflow command center — attendance, leave, payroll, and team pulse at a glance." },
    ],
  }),
  component: DashboardPage,
});

function useMyAttendance() {
  return useQuery({
    queryKey: ["my-attendance", todayISO().slice(0, 7)],
    queryFn: () => getMyAttendance({ data: { month: todayISO().slice(0, 7) } }),
  });
}

function CheckInCard() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useMyAttendance();

  const today = data?.today;
  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
      await queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border-accent/20">
      <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-60" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center justify-between font-display text-base">
          Today's presence
          <StatusPill variant={checkedOut ? "neutral" : checkedIn ? "success" : "warning"}>
            {checkedOut ? "done for today" : checkedIn ? "at work" : "not checked in"}
          </StatusPill>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-5">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-secondary" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">In</p>
                <p className="mt-1 font-data text-sm font-semibold">{formatTime(today?.check_in)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Out</p>
                <p className="mt-1 font-data text-sm font-semibold">{formatTime(today?.check_out)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Hours</p>
                <p className="mt-1 font-data text-sm font-semibold text-accent">
                  {formatDuration(workDurationMs(today?.check_in, today?.check_out))}
                </p>
              </div>
            </div>
            {checkedOut ? (
              <p className="rounded-xl border border-border bg-secondary/40 p-3 text-center text-sm text-muted-foreground">
                Workday complete. See you tomorrow.
              </p>
            ) : checkedIn ? (
              <Button
                onClick={() => act(() => checkOut({ data: { date: todayISO() } }), "Checked out. Great work today.")}
                disabled={busy}
                className="w-full bg-accent text-accent-foreground shadow-glow hover:bg-accent/90"
              >
                <LogOut className="mr-2 h-4 w-4" /> Check out
              </Button>
            ) : (
              <Button
                onClick={() => act(() => checkIn({ data: { date: todayISO() } }), "Checked in. Let's make it a good one.")}
                disabled={busy}
                className="w-full bg-accent text-accent-foreground shadow-glow hover:bg-accent/90"
              >
                <LogIn className="mr-2 h-4 w-4" /> Check in
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EmployeeDashboard({ firstName }: { firstName: string }) {
  const { data } = useMyAttendance();
  const rows = data?.rows ?? [];

  const present = rows.filter((a) => a.status === "present").length;
  const absent = rows.filter((a) => a.status === "absent").length;
  const leave = rows.filter((a) => a.status === "leave").length;
  const half = rows.filter((a) => a.status === "half_day").length;

  let streak = 0;
  const sorted = [...rows].sort((a, b) => (a.work_date < b.work_date ? 1 : -1));
  for (const a of sorted) {
    if (a.status === "present" || a.status === "half_day") streak += 1;
    else break;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">This month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Present", value: present, variant: "success" as const },
                { label: "Absent", value: absent, variant: "destructive" as const },
                { label: "On leave", value: leave, variant: "accentSoft" as const },
                { label: "Half days", value: half, variant: "warning" as const },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-secondary/60 p-4">
                  <StatusPill variant={s.variant}>{s.label}</StatusPill>
                  <p className="mt-3 font-display text-3xl font-extrabold">
                    <AnimatedNumber value={s.value} />
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 p-4">
              <div>
                <p className="text-sm font-semibold">{streak}-day streak</p>
                <p className="text-xs text-muted-foreground">Consecutive days present — keep it alive, {firstName}.</p>
              </div>
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </CardContent>
        </Card>
      </Reveal>
      <Reveal delay={0.08}>
        <CheckInCard />
      </Reveal>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => getAdminDashboard() });

  if (isLoading || !data) return <PageLoader />;

  const kpis = [
    { label: "Total employees", value: data.totalEmployees, icon: Users },
    { label: "Present today", value: data.presentToday, icon: Clock },
    { label: "On leave today", value: data.onLeaveToday, icon: CalendarOff },
    { label: "Pending requests", value: data.pendingRequests, icon: BarChart3 },
    { label: "Payroll this month", value: data.payrollTotal, icon: Wallet, format: (n: number) => formatCurrency(n) },
    { label: "Attendance rate", value: data.attendanceRate, icon: BarChart3, format: (n: number) => `${n.toFixed(1)}%` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <Reveal key={k.label} delay={i * 0.05}>
            <Card className="group transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <k.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent" />
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold tracking-tight">
                  <AnimatedNumber value={k.value} format={k.format} />
                </p>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Presence trend — 14 days</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendArea data={data.trend} dataKey="present" />
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-base">Latest leave requests</CardTitle>
              <Link to="/leave" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                Review <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentRequests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
              {data.recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.employees?.full_name ?? "Employee"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.leave_types?.name} · {r.start_date} → {r.end_date}
                    </p>
                  </div>
                  <StatusPill variant={leaveVariant(r.status)}>{r.status}</StatusPill>
                </div>
              ))}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { session, isLoading } = useSession();

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  const name = session.profile?.full_name ?? session.user.email ?? "there";
  const firstName = name.split(" ")[0] ?? name;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">{greeting()}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{firstName}'s workday</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })} ·{" "}
              {session.isStaff ? "Organization overview" : "Your personal command center"}
            </p>
          </div>
        </div>
        {session.isStaff ? <AdminDashboard /> : <EmployeeDashboard firstName={firstName} />}
      </motion.div>
    </AppShell>
  );
}
