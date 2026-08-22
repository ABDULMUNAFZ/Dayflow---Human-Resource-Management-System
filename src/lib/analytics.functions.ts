import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AnalyticsData {
  workforce: {
    total: number;
    active: number;
    onLeave: number;
    newHires30d: number;
    byDepartment: { name: string; count: number }[];
  };
  attendance: {
    rate: number;
    present30d: number;
    absent30d: number;
    halfDay30d: number;
    leave30d: number;
    trend: { date: string; present: number; absent: number; leave: number }[];
  };
  leave: {
    pending: number;
    approvedThisYear: number;
    rejectedThisYear: number;
    byType: { name: string; days: number }[];
  };
  payroll: {
    currentMonthTotal: number;
    previousMonthTotal: number;
    averageNet: number;
    distribution: { bucket: string; count: number }[];
    monthlyTotals: { period: string; total: number }[];
  };
}

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<AnalyticsData> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const emps = db.employees || [];
    const att = db.attendance.filter((a) => a.work_date >= since30);
    const lv = db.leave_requests.filter((l) => l.start_date >= yearStart);
    const pay = db.payroll || [];

    const deptCounts = new Map<string, number>();
    for (const e of emps) {
      const dept = db.departments.find((d) => d.id === e.department_id);
      const name = dept?.name || "Unassigned";
      deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
    }

    const present = att.filter((a) => a.status === "present").length;
    const absent = att.filter((a) => a.status === "absent").length;
    const half = att.filter((a) => a.status === "half_day").length;
    const onLeave = att.filter((a) => a.status === "leave").length;
    const rate = present + absent + half > 0 ? ((present + half * 0.5) / (present + absent + half)) * 100 : 0;

    const byDate = new Map<string, { present: number; absent: number; leave: number }>();
    for (const a of att) {
      const entry = byDate.get(a.work_date) ?? { present: 0, absent: 0, leave: 0 };
      if (a.status === "present" || a.status === "half_day") entry.present += 1;
      else if (a.status === "absent") entry.absent += 1;
      else entry.leave += 1;
      byDate.set(a.work_date, entry);
    }
    const trend = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, v]) => ({ date, ...v }));

    const typeDays = new Map<string, number>();
    for (const r of lv.filter((x) => x.status === "approved")) {
      const days = Math.round((new Date(`${r.end_date}T00:00:00`).getTime() - new Date(`${r.start_date}T00:00:00`).getTime()) / 86400000) + 1;
      const type = db.leave_types.find((t) => t.id === r.leave_type_id);
      const name = type?.name || "Other";
      typeDays.set(name, (typeDays.get(name) ?? 0) + days);
    }

    const periods = [...new Set(pay.map((p) => p.period))].sort().reverse();
    const currentPeriod = periods[0] || new Date().toISOString().slice(0, 7) + "-01";
    const previousPeriod = periods[1] || "";
    const currentRows = pay.filter((p) => p.period === currentPeriod);
    const prevRows = pay.filter((p) => p.period === previousPeriod);
    const currentTotal = currentRows.reduce((s, p) => s + Number(p.net_salary || 0), 0);
    
    const monthlyTotals = periods
      .slice(0, 6)
      .reverse()
      .map((period) => ({
        period,
        total: pay.filter((p) => p.period === period).reduce((s, p) => s + Number(p.net_salary || 0), 0),
      }));

    const buckets = [
      { bucket: "< ₹80K", min: 0, max: 80000 },
      { bucket: "₹80K–₹120K", min: 80000, max: 120000 },
      { bucket: "₹120K–₹180K", min: 120000, max: 180000 },
      { bucket: "₹180K+", min: 180000, max: Infinity },
    ].map((b) => ({
      bucket: b.bucket,
      count: currentRows.filter((p) => Number(p.net_salary || 0) >= b.min && Number(p.net_salary || 0) < b.max).length,
    }));

    return {
      workforce: {
        total: emps.length,
        active: emps.filter((e) => e.employment_status === "active").length,
        onLeave: emps.filter((e) => e.employment_status === "on_leave").length,
        newHires30d: emps.filter((e) => e.joining_date >= since30).length,
        byDepartment: [...deptCounts.entries()].map(([name, count]) => ({ name, count })),
      },
      attendance: {
        rate: Math.round(rate * 10) / 10,
        present30d: present,
        absent30d: absent,
        halfDay30d: half,
        leave30d: onLeave,
        trend,
      },
      leave: {
        pending: lv.filter((r) => r.status === "pending").length,
        approvedThisYear: lv.filter((r) => r.status === "approved").length,
        rejectedThisYear: lv.filter((r) => r.status === "rejected").length,
        byType: [...typeDays.entries()].map(([name, days]) => ({ name, days })),
      },
      payroll: {
        currentMonthTotal: currentTotal,
        previousMonthTotal: prevRows.reduce((s, p) => s + Number(p.net_salary || 0), 0),
        averageNet: currentRows.length ? Math.round(currentTotal / currentRows.length) : 0,
        distribution: buckets,
        monthlyTotals,
      },
    };
  });
