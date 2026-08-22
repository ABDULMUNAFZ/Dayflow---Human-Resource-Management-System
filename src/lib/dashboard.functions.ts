import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppNotification, Attendance, LeaveRequest, Payroll } from "@/lib/types";

export interface AdminDashboardData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingRequests: number;
  payrollTotal: number;
  attendanceRate: number;
  trend: { date: string; present: number }[];
  recentRequests: LeaveRequest[];
  departmentMix: { name: string; count: number }[];
}

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminDashboardData> => {
    const { supabase } = context;
    const today = new Date().toISOString().slice(0, 10);
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [emps, todayAtt, att30, pending, payroll, recent] = await Promise.all([
      supabase.from("employees").select("id, department_id, departments(name)"),
      supabase.from("attendance").select("status").eq("work_date", today),
      supabase.from("attendance").select("work_date, status").gte("work_date", since30),
      supabase
        .from("leave_requests")
        .select("id", { count: "exact" })
        .eq("status", "pending"),
      supabase.from("payroll").select("net_salary").eq("period", period),
      supabase
        .from("leave_requests")
        .select("*, leave_types(name), employees(full_name, employee_code, job_title, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const todayRows = todayAtt.data ?? [];
    const att = att30.data ?? [];
    const present = att.filter((a) => a.status === "present").length;
    const absent = att.filter((a) => a.status === "absent").length;
    const half = att.filter((a) => a.status === "half_day").length;
    const rate = present + absent + half > 0 ? ((present + half * 0.5) / (present + absent + half)) * 100 : 0;

    const byDate = new Map<string, number>();
    for (const a of att) {
      if (a.status === "present" || a.status === "half_day") {
        byDate.set(a.work_date, (byDate.get(a.work_date) ?? 0) + 1);
      }
    }
    const trend = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, p]) => ({ date, present: p }));

    const deptCounts = new Map<string, number>();
    for (const e of emps.data ?? []) {
      const name = (e.departments as unknown as { name: string } | null)?.name ?? "Unassigned";
      deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
    }

    return {
      totalEmployees: (emps.data ?? []).length,
      presentToday: todayRows.filter((a) => a.status === "present" || a.status === "half_day").length,
      absentToday: todayRows.filter((a) => a.status === "absent").length,
      onLeaveToday: todayRows.filter((a) => a.status === "leave").length,
      pendingRequests: pending.count ?? 0,
      payrollTotal: (payroll.data ?? []).reduce((s, p) => s + Number(p.net_salary), 0),
      attendanceRate: Math.round(rate * 10) / 10,
      trend,
      recentRequests: (recent.data ?? []) as unknown as LeaveRequest[],
      departmentMix: [...deptCounts.entries()].map(([name, count]) => ({ name, count })),
    };
  });

export interface ActivityItem {
  id: string;
  kind: "attendance" | "leave" | "payroll" | "notification";
  title: string;
  detail: string;
  at: string;
}

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityItem[]> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return [];

    const [att, leave, pay, notifs] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", emp.id)
        .order("work_date", { ascending: false })
        .limit(5),
      supabase
        .from("leave_requests")
        .select("*, leave_types(name)")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", emp.id)
        .order("period", { ascending: false })
        .limit(2),
      supabase
        .from("notifications")
        .select("*")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const items: ActivityItem[] = [];
    for (const a of (att.data ?? []) as Attendance[]) {
      if (a.check_in) {
        items.push({
          id: `att-${a.id}`,
          kind: "attendance",
          title: a.check_out ? "Completed workday" : "Checked in",
          detail: a.work_date,
          at: a.check_out ?? a.check_in,
        });
      }
    }
    for (const l of (leave.data ?? []) as unknown as LeaveRequest[]) {
      items.push({
        id: `leave-${l.id}`,
        kind: "leave",
        title:
          l.status === "pending"
            ? "Leave request submitted"
            : `Leave ${l.status}`,
        detail: `${l.leave_types?.name ?? "Leave"} · ${l.start_date} → ${l.end_date}`,
        at: l.reviewed_at ?? l.created_at,
      });
    }
    for (const p of (pay.data ?? []) as Payroll[]) {
      items.push({
        id: `pay-${p.id}`,
        kind: "payroll",
        title: p.status === "paid" ? "Salary paid" : "Payroll generated",
        detail: `Period ${p.period}`,
        at: p.pay_date ? `${p.pay_date}T00:00:00` : `${p.period}T00:00:00`,
      });
    }
    for (const n of (notifs.data ?? []) as AppNotification[]) {
      items.push({ id: `ntf-${n.id}`, kind: "notification", title: n.title, detail: n.message, at: n.created_at });
    }

    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 10);
  });
