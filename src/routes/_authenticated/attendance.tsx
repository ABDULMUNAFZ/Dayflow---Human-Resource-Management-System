import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, LogOut, Loader2, Search, Filter, CalendarCheck, Clock, Award, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageLoader, Reveal, StatusPill, attendanceVariant } from "@/components/ui/bits";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { checkIn, checkOut, getMyAttendance, getTeamAttendance } from "@/lib/attendance.functions";
import { formatDuration, formatTime, monthLabel, todayISO, workDurationMs } from "@/lib/format";

function currentMonth(): string {
  return todayISO().slice(0, 7);
}

function MyAttendancePanel() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [checkingState, setCheckingState] = useState<"idle" | "checking" | "working">("idle");

  const { data, isLoading } = useQuery({
    queryKey: ["my-attendance", month],
    queryFn: () => getMyAttendance({ data: { month } }),
  });

  const todayStr = todayISO();
  const rows = data?.rows ?? [];
  const today = data?.today ?? null;
  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  useEffect(() => {
    if (checkedIn && !checkedOut) {
      setCheckingState("working");
    } else {
      setCheckingState("idle");
    }
  }, [checkedIn, checkedOut]);

  const handleCheckIn = async () => {
    setBusy(true);
    setCheckingState("checking");
    
    // Premium transition delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    try {
      await checkIn({ data: { date: todayStr } });
      setCheckingState("working");
      toast.success("Checked in. Let's make it a great work day!");
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    } catch (e) {
      setCheckingState("idle");
      toast.error(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    try {
      await checkOut({ data: { date: todayStr } });
      setCheckingState("idle");
      toast.success("Checked out. Amazing effort today!");
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Check-out failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !data) return <PageLoader />;

  // Dynamic calculations for summaries
  const presentDays = rows.filter((r) => r.status === "present").length;
  const absentDays = rows.filter((r) => r.status === "absent").length;
  const leaveDays = rows.filter((r) => r.status === "leave").length;
  const halfDays = rows.filter((r) => r.status === "half_day").length;
  const totalWorkingDays = rows.length;

  const totalWorkedMs = rows.reduce((sum, r) => sum + workDurationMs(r.check_in, r.check_out), 0);
  const totalExtraHours = rows.reduce((sum, r) => sum + (r.extra_hours || 0), 0);

  const datesOf = (status: string) => rows.filter((a) => a.status === status).map((a) => new Date(`${a.work_date}T00:00:00`));

  return (
    <div className="space-y-6">
      
      {/* SUMMARIES INDICATORS */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Reveal delay={0.02}>
          <Card className="bg-card/60 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Working Days</p>
                <p className="font-display text-2xl font-extrabold text-foreground mt-1">{totalWorkingDays} days</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-accent/80" />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.04}>
          <Card className="bg-card/60 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Attendance streak</p>
                <div className="flex gap-2 items-center mt-1">
                  <span className="font-display text-2xl font-extrabold text-success">{presentDays} Present</span>
                  {halfDays > 0 && <span className="text-xs text-warning">({halfDays} Half-day)</span>}
                </div>
              </div>
              <Award className="h-8 w-8 text-success/80" />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="bg-card/60 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Absence & Leave</p>
                <p className="font-display text-2xl font-extrabold text-destructive mt-1">
                  {absentDays} Abs / {leaveDays} Lve
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive/80" />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="bg-card/60 backdrop-blur-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Worked Duration</p>
                <p className="font-display text-2xl font-extrabold text-accent mt-1">
                  {Math.round(totalWorkedMs / 3600000)} Hrs
                  {totalExtraHours > 0 && <span className="text-xs text-success ml-1.5">(+{totalExtraHours} OT)</span>}
                </p>
              </div>
              <Clock className="h-8 w-8 text-accent/80" />
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        
        {/* INTERACTIVE CLOCKING BLOCK */}
        <Reveal className="space-y-4 lg:col-span-2">
          <Card className="relative overflow-hidden border-accent/20">
            <div aria-hidden className="absolute inset-0 bg-hero-glow opacity-50" />
            <CardContent className="relative space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today</p>
                  <p className="font-display text-xl font-bold">
                    {new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", weekday: "long" })}
                  </p>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={checkingState}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    {checkingState === "checking" ? (
                      <StatusPill variant="warning">CHECKING...</StatusPill>
                    ) : checkingState === "working" ? (
                      <StatusPill variant="success" className="animate-pulse">✓ WORKING</StatusPill>
                    ) : checkedOut ? (
                      <StatusPill variant="neutral">COMPLETE</StatusPill>
                    ) : (
                      <StatusPill variant="warning">NOT ACTIVE</StatusPill>
                    )}
                  </motion.div>
                </AnimatePresence>
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

              {/* ACTION TRIGGER BUTTON */}
              {!checkedOut && (
                <Button
                  disabled={busy}
                  onClick={checkedIn ? handleCheckOut : handleCheckIn}
                  className={`w-full text-accent-foreground shadow-glow hover:bg-accent/90 transition-all duration-300 ${
                    checkingState === "working" ? "bg-destructive text-white hover:bg-destructive/90" : "bg-accent"
                  }`}
                >
                  {checkingState === "checking" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : checkingState === "working" ? (
                    <LogOut className="mr-2 h-4 w-4" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {checkingState === "checking"
                    ? "Validating punch..."
                    : checkingState === "working"
                    ? "Check out"
                    : "Check in"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Presence calendar</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-4">
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
                  present: "bg-success/20 text-success font-bold rounded-md border border-success/35",
                  leave: "bg-accent/20 text-accent font-bold rounded-md border border-accent/35",
                  absent: "bg-destructive/20 text-destructive font-bold rounded-md border border-destructive/35",
                  half: "bg-warning/20 text-warning font-bold rounded-md border border-warning/35",
                }}
              />
            </CardContent>
          </Card>
        </Reveal>

        {/* DETAILS TABLE BLOCK */}
        <Reveal delay={0.08} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="font-display text-base">Attendance History</CardTitle>
                <CardDescription>Daily checklist logs for {monthLabel(`${month}-01`)}.</CardDescription>
              </div>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground"
              />
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead>Extra Hours</TableHead>
                    <TableHead className="text-right">Worked Hours</TableHead>
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
                      <TableCell className="font-data text-success">
                        {a.extra_hours ? `+${a.extra_hours}h` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-data font-semibold">
                        {a.work_hours ? `${a.work_hours} hrs` : formatDuration(workDurationMs(a.check_in, a.check_out))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No logs recorded for this month. Check in above to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

function TeamAttendance() {
  const [date, setDate] = useState(todayISO);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["team-attendance", date],
    queryFn: () => getTeamAttendance({ data: { date } }),
  });

  const filteredData = (data ?? []).filter((row) => {
    const matchesSearch = 
      row.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = row.attendance?.status ?? "no_record";
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <CardTitle className="font-display text-base">Presence overview across organization</CardTitle>
          <CardDescription>Track daily rosters and worked parameters.</CardDescription>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-input bg-secondary px-3 py-1.5 text-sm text-foreground"
        />
      </CardHeader>
      
      {/* FILTER CONTROLS */}
      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee name or code..."
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="half_day">Half-day</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="no_record">No Record</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Extra Hours</TableHead>
                <TableHead className="text-right">Worked Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.employee.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{row.employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{row.employee.employee_code} · {row.employee.departments?.name || "No Dept"}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.employee.job_title}</TableCell>
                  <TableCell>
                    <StatusPill variant={attendanceVariant(row.attendance?.status ?? "")}>
                      {row.attendance?.status.replace("_", " ") ?? "no record"}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="font-data text-muted-foreground">{formatTime(row.attendance?.check_in)}</TableCell>
                  <TableCell className="font-data text-muted-foreground">{formatTime(row.attendance?.check_out)}</TableCell>
                  <TableCell className="font-data text-success">
                    {row.attendance?.extra_hours ? `+${row.attendance.extra_hours}h` : "—"}
                  </TableCell>
                  <TableCell className="text-right font-data font-semibold text-foreground">
                    {row.attendance?.work_hours ? `${row.attendance.work_hours} hrs` : formatDuration(workDurationMs(row.attendance?.check_in, row.attendance?.check_out))}
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No matching records found.
                  </TableCell>
                </TableRow>
              )}
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
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Attendance Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.isStaff
              ? "Monitor presence, overtime parameters, and work durations across departments."
              : "Punch in, check out, and keep track of your daily work logs."}
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
