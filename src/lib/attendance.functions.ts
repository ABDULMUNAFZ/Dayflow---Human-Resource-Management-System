import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Attendance, AttendanceStatus, Employee } from "@/lib/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const getMyAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).parse(data))
  .handler(async ({ context, data }): Promise<{ rows: Attendance[]; today: Attendance | null }> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return { rows: [], today: null };

    const [year = 1970, month = 1] = data.month.split("-").map(Number);
    const from = `${data.month}-01`;
    const to = new Date(year, month, 0).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const [{ data: rows }, { data: today }] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", emp.id)
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false }),
      supabase.from("attendance").select("*").eq("employee_id", emp.id).eq("work_date", todayStr).maybeSingle(),
    ]);

    return { rows: (rows ?? []) as Attendance[], today: (today as Attendance) ?? null };
  });

export const checkIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ date: dateSchema }).parse(data))
  .handler(async ({ context, data }): Promise<Attendance> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id, full_name").eq("user_id", userId).maybeSingle();
    if (!emp) throw new Error("No employee profile linked to this account.");

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("work_date", data.date)
      .maybeSingle();

    if (existing?.check_in) throw new Error("You're already checked in for today.");

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("attendance")
      .upsert(
        { employee_id: emp.id, work_date: data.date, check_in: now, status: "present" },
        { onConflict: "employee_id,work_date" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "check_in",
      _entity: "attendance",
      _entity_id: row.id,
      _metadata: { date: data.date },
    });
    return row as Attendance;
  });

export const checkOut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ date: dateSchema }).parse(data))
  .handler(async ({ context, data }): Promise<Attendance> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) throw new Error("No employee profile linked to this account.");

    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("work_date", data.date)
      .maybeSingle();

    if (!existing?.check_in) throw new Error("You need to check in before checking out.");
    if (existing.check_out) throw new Error("You're already checked out for today.");

    const now = new Date();
    const workedMs = now.getTime() - new Date(existing.check_in).getTime();
    const status: AttendanceStatus = workedMs >= 4 * 60 * 60 * 1000 ? "present" : "half_day";

    const { data: row, error } = await supabase
      .from("attendance")
      .update({ check_out: now.toISOString(), status })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "check_out",
      _entity: "attendance",
      _entity_id: row.id,
      _metadata: { date: data.date, status },
    });
    return row as Attendance;
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
  .handler(async ({ context, data }): Promise<TeamAttendanceRow[]> => {
    const { supabase } = context;
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, full_name, employee_code, job_title, avatar_url, departments(name)")
      .order("full_name");
    if (error) throw new Error(error.message);

    const { data: attendance } = await supabase.from("attendance").select("*").eq("work_date", data.date);

    const byEmployee = new Map((attendance ?? []).map((a) => [a.employee_id, a as Attendance]));
    return ((employees ?? []) as unknown as TeamAttendanceRow["employee"][]).map((employee) => ({
      employee,
      attendance: byEmployee.get(employee.id) ?? null,
    }));
  });
