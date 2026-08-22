import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Attendance, AttendanceStatus, Employee } from "@/lib/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(data))
  .handler(async ({ context, data }): Promise<{ rows: Attendance[]; today: Attendance | null }> => {
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return { rows: [], today: null };

    const todayStr = new Date().toISOString().slice(0, 10);
    const rows = db.attendance.filter(
      (a) => a.employee_id === emp.id && a.work_date.startsWith(data.month)
    );
    const today = db.attendance.find(
      (a) => a.employee_id === emp.id && a.work_date === todayStr
    ) || null;

    return { rows: [...rows].reverse() as any[], today: today as any };
  });

export const checkIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ date: dateSchema }).parse(data))
  .handler(async ({ context, data }): Promise<Attendance> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("No employee profile linked to this account.");

    const existing = db.attendance.find(
      (a) => a.employee_id === emp.id && a.work_date === data.date
    );

    if (existing?.check_in) throw new Error("You're already checked in for today.");

    const now = new Date().toISOString();
    const crypto = await import("crypto");
    const newRecord = {
      id: crypto.randomUUID(),
      employee_id: emp.id,
      work_date: data.date,
      check_in: now,
      check_out: null,
      status: "present" as AttendanceStatus,
      work_hours: 0,
      extra_hours: 0,
      created_at: now,
    };

    if (existing) {
      existing.check_in = now;
      existing.status = "present";
    } else {
      db.attendance.push(newRecord);
    }
    
    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: "check_in",
      created_at: now,
    });

    saveDb(db);
    return (existing || newRecord) as any;
  });

export const checkOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ date: dateSchema }).parse(data))
  .handler(async ({ context, data }): Promise<Attendance> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("No employee profile linked to this account.");

    const existing = db.attendance.find(
      (a) => a.employee_id === emp.id && a.work_date === data.date
    );

    if (!existing?.check_in) throw new Error("You need to check in before checking out.");
    if (existing.check_out) throw new Error("You're already checked out for today.");

    const sc = db.salary_configs?.find((s: any) => s.employee_id === emp.id);
    const standardHours = sc?.working_hours_per_day || 8;

    const checkoutTime = new Date();
    const checkinTime = new Date(existing.check_in);
    const workedMs = checkoutTime.getTime() - checkinTime.getTime();
    const workHours = Math.round((workedMs / 3600000) * 100) / 100;

    let status: AttendanceStatus = "present";
    if (workHours < (standardHours / 2)) {
      status = "absent";
    } else if (workHours < standardHours) {
      status = "half_day";
    }

    const extraHours = Math.max(0, Math.round((workHours - standardHours) * 100) / 100);

    existing.check_out = checkoutTime.toISOString();
    existing.status = status;
    existing.work_hours = workHours;
    existing.extra_hours = extraHours;

    const crypto = await import("crypto");
    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: "check_out",
      created_at: checkoutTime.toISOString(),
    });

    saveDb(db);
    return existing as any;
  });

export interface TeamAttendanceRow {
  employee: Pick<Employee, "id" | "full_name" | "employee_code" | "job_title" | "avatar_url"> & {
    departments?: { name: string } | null;
  };
  attendance: Attendance | null;
}

export const getTeamAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ date: dateSchema }).parse(data))
  .handler(async ({ data }): Promise<TeamAttendanceRow[]> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();

    return db.employees.map((employee) => {
      const attendance = db.attendance.find(
        (a) => a.employee_id === employee.id && a.work_date === data.date
      ) || null;
      const dept = db.departments.find((d) => d.id === employee.department_id);

      return {
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          employee_code: employee.employee_code,
          job_title: employee.job_title,
          avatar_url: employee.avatar_url,
          departments: dept ? { name: dept.name } : null,
        },
        attendance: attendance as any,
      };
    });
  });
