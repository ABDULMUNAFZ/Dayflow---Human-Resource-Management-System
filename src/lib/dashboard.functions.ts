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
  .handler(async (): Promise<AdminDashboardData> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();
    
    const today = new Date().toISOString().slice(0, 10);
    const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const employees = db.employees;
    const todayAtt = db.attendance.filter((a) => a.work_date === today);
    const att30 = db.attendance.filter((a) => a.work_date >= since30);
    
    const pending = db.leave_requests.filter((l) => l.status === "pending");
    const payroll = db.payroll;
    const recent = db.leave_requests.slice(-5);

    const present = att30.filter((a) => a.status === "present").length;
    const absent = att30.filter((a) => a.status === "absent").length;
    const half = att30.filter((a) => a.status === "half_day").length;
    const rate = present + absent + half > 0 ? ((present + half * 0.5) / (present + absent + half)) * 100 : 0;

    const byDate = new Map<string, number>();
    for (const a of att30) {
      if (a.status === "present" || a.status === "half_day") {
        byDate.set(a.work_date, (byDate.get(a.work_date) ?? 0) + 1);
      }
    }
    const trend = [...byDate.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, p]) => ({ date, present: p }));

    const deptCounts = new Map<string, number>();
    for (const e of employees) {
      const dept = db.departments.find((d) => d.id === e.department_id);
      const name = dept?.name || "Unassigned";
      deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
    }

    const mappedRequests = recent.map((r) => {
      const emp = db.employees.find((e) => e.id === r.employee_id);
      const type = db.leave_types.find((t) => t.id === r.leave_type_id);
      return {
        ...r,
        leave_types: type ? { name: type.name } : null,
        employees: emp ? {
          full_name: emp.full_name,
          employee_code: emp.employee_code,
          job_title: emp.job_title,
          avatar_url: emp.avatar_url,
        } : null,
      };
    }) as any;

    return {
      totalEmployees: employees.length,
      presentToday: todayAtt.filter((a) => a.status === "present" || a.status === "half_day").length,
      absentToday: todayAtt.filter((a) => a.status === "absent").length,
      onLeaveToday: todayAtt.filter((a) => a.status === "leave").length,
      pendingRequests: pending.length,
      payrollTotal: payroll.reduce((s, p) => s + Number(p.net_salary || 0), 0),
      attendanceRate: Math.round(rate * 10) / 10,
      trend,
      recentRequests: mappedRequests,
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
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return [];

    const att = db.attendance.filter((a) => a.employee_id === emp.id).slice(-5);
    const leave = db.leave_requests.filter((l) => l.employee_id === emp.id).slice(-5);
    const pay = db.payroll.filter((p) => p.employee_id === emp.id).slice(-2);

    const items: ActivityItem[] = [];
    for (const a of att) {
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
    for (const l of leave) {
      const type = db.leave_types.find((t) => t.id === l.leave_type_id);
      items.push({
        id: `leave-${l.id}`,
        kind: "leave",
        title:
          l.status === "pending"
            ? "Leave request submitted"
            : `Leave ${l.status}`,
        detail: `${type?.name ?? "Leave"} · ${l.start_date} → ${l.end_date}`,
        at: l.reviewed_at ?? l.created_at,
      });
    }
    for (const p of pay) {
      items.push({
        id: `pay-${p.id}`,
        kind: "payroll",
        title: p.status === "paid" ? "Salary paid" : "Payroll generated",
        detail: `Period ${p.period}`,
        at: p.pay_date ? `${p.pay_date}T00:00:00` : `${p.period}T00:00:00`,
      });
    }

    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 10);
  });
