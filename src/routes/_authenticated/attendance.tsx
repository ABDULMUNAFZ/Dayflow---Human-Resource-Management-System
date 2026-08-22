import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, attendanceVariant } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { checkIn, checkOut, getMyAttendance, getTeamAttendance } from "@/lib/attendance.functions";
import { formatDuration, formatTime, monthLabel, todayISO, workDurationMs } from "@/lib/format";

function currentMonth(): string {
  return todayISO().slice(0, 7);
}

function MyAttendancePanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const { data, isLoading } = useQuery({
    queryKey: ["my-attendance", month],
    queryFn: () => getMyAttendance({ data: { month } }),
  });

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

  if (isLoading || !data) return <PageLoader />;

  const rows = data.rows;
  const today = data.today;
  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;
  const datesOf = (status: string) => rows.filter((a) => a.status === status).map((a) => new Date(`${a.work_date}T00:00:00`));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Reveal className="space-y-4 lg:col-span-2">
        <Card className="relative overflow-hidden border-accent/20">
          <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-50" />
          <CardContent className="relative space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today</p>
                <p className="font-display text-xl font-bold">
                  {new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric" })}
                </p>
              </div>
              <StatusPill variant={checkedOut ? "neutral" : checkedIn ? "success" : "warning"}>
                {checkedOut ? "complete" : checkedIn ? "at work" : "not checked in"}
              </StatusPill>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">In</p>
                <p className="mt-1 font-data text-sm font-semibold">{formatTime(today?.check_in)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Out</p>
                <p className="mt-1 font-data text-sm font-semibold">{formatTime(today?.check_out)}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Hours</p>
                <p className="mt-1 font-data text-sm font-semibold text-accent">
                  {formatDuration(workDurationMs(today?.check_in, today?.check_out))}
                </p>
              </div>
            </div>
            {!checkedOut && (
              <Button
                disabled={busy}
                onClick={() =>
                  checkedIn
                    ? act(() => checkOut({ data: { date: todayISO() } }), "Checked out. Great work today.")
                    : act(() => checkIn({ data: { date: todayISO() } }), "Checked in. Let's make it a good one.")
                }
                className="w-full bg-accent text-accent-foreground shadow-glow hover:bg-accent/90"
              >
                {checkedIn ? <LogOut className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
                {checkedIn ? "Check out" : "Check in"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              month={new Date(`${month}-01T00:00:00`)}
              onMonthChange={(d) => setMonth(d.toISOString().slice(0, 7))}
              modifiers={{
                present: datesOf("present"),
                leave: datesOf("leave"),
                absent: datesOf("absent"),
                half: datesOf("half_day"),
              }}
              modifiersClassNames={{
                present: "bg-success/15 text-success font-bold rounded-md",
                leave: "bg-accent-soft/15 text-accent-soft font-bold rounded-md",
                absent: "bg-destructive/15 text-destructive font-bold rounded-md",
                half: "bg-warning/15 text-warning font-bold rounded-md",
              }}
            />
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.08} className="lg:col-span-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">{monthLabel(`${month}-01`)} — daily log</CardTitle>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.work_date}</TableCell>
                    <TableCell>
                      <StatusPill variant={attendanceVariant(a.status)}>{a.status.replace("_", " ")}</StatusPill>
                    </TableCell>
                    <TableCell className="font-data text-muted-foreground">{formatTime(a.check_in)}</TableCell>
                    <TableCell className="font-data text-muted-foreground">{formatTime(a.check_out)}</TableCell>
                    <TableCell className="text-right font-data font-semibold">
                      {formatDuration(workDurationMs(a.check_in, a.check_out))}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No attendance records for this month. Check in to start your streak.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}

function TeamAttendance() {
  const [date, setDate] = useState(todayISO);
  const { data, isLoading } = useQuery({
    queryKey: ["team-attendance", date],
    queryFn: () => getTeamAttendance({ data: { date } }),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-base">Team attendance</CardTitle>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground"
        />
      </CardHeader>
      <CardContent className="overflow-x-auto p-0 pb-2">
        {isLoading ? (
          <div className="p-6">
            <div className="h-48 animate-pulse rounded-xl bg-secondary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell>
                    <p className="font-medium">{row.employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.employee.employee_code}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.employee.job_title}</TableCell>
                  <TableCell>
                    <StatusPill variant={attendanceVariant(row.attendance?.status ?? "")}>
                      {row.attendance?.status.replace("_", " ") ?? "no record"}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="font-data text-muted-foreground">{formatTime(row.attendance?.check_in)}</TableCell>
                  <TableCell className="font-data text-muted-foreground">{formatTime(row.attendance?.check_out)}</TableCell>
                  <TableCell className="text-right font-data font-semibold">
                    {formatDuration(workDurationMs(row.attendance?.check_in, row.attendance?.check_out))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function AttendancePage() {
  const { session, isLoading } = useSession();
  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.isStaff
              ? "Monitor presence across the organization, day by day."
              : "Check in, check out, and track your rhythm."}
          </p>
        </div>
        {session.isStaff ? <TeamAttendance /> : <MyAttendancePanel />}
      </motion.div>
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Dayflow HR" },
      { name: "description", content: "Check in, check out, and review attendance history for you and your team." },
      { property: "og:title", content: "Attendance — Dayflow HR" },
      { property: "og:description", content: "Check in, check out, and review attendance history for you and your team." },
    ],
  }),
  component: AttendancePage,
});
