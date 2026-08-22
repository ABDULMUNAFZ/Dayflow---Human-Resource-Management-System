import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

function dayCount(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${end}T00:00:00`).getTime();
  return Math.round((e - s) / 86400000) + 1;
}

export const getMyLeave = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ requests: LeaveRequest[]; balances: LeaveBalance[] }> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return { requests: [], balances: [] };

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const [{ data: requests }, { data: types }] = await Promise.all([
      supabase
        .from("leave_requests")
        .select("*, leave_types(name), reviewer:reviewer_id(full_name)")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false }),
      supabase.from("leave_types").select("*").order("name"),
    ]);

    const all = (requests ?? []) as unknown as LeaveRequest[];
    const balances: LeaveBalance[] = ((types ?? []) as LeaveType[]).map((t) => {
      const ofType = all.filter((r) => r.leave_type_id === t.id && r.start_date >= yearStart);
      const used = ofType
        .filter((r) => r.status === "approved")
        .reduce((sum, r) => sum + dayCount(r.start_date, r.end_date), 0);
      const pending = ofType
        .filter((r) => r.status === "pending")
        .reduce((sum, r) => sum + dayCount(r.start_date, r.end_date), 0);
      return { typeId: t.id, name: t.name, allowance: t.annual_allowance, used, pending };
    });

    return { requests: all, balances };
  });

export const applyLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        leaveTypeId: z.string().uuid(),
        startDate: dateSchema,
        endDate: dateSchema,
        remarks: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LeaveRequest> => {
    const { supabase, userId } = context;
    if (data.endDate < data.startDate) throw new Error("End date can't be before the start date.");
    const today = new Date().toISOString().slice(0, 10);
    if (data.startDate < today) throw new Error("Leave can't start in the past.");
    if (dayCount(data.startDate, data.endDate) > 60) throw new Error("Leave requests are limited to 60 days.");

    const { data: emp } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!emp) throw new Error("No employee profile linked to this account.");

    const { data: row, error } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: emp.id,
        leave_type_id: data.leaveTypeId,
        start_date: data.startDate,
        end_date: data.endDate,
        remarks: data.remarks ?? null,
      })
      .select("*, leave_types(name)")
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "leave_submitted",
      _entity: "leave_request",
      _entity_id: row.id,
      _metadata: { start: data.startDate, end: data.endDate },
    });

    // Notify all HR/admin employees
    const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["hr", "admin"]);
    const staffIds = (staffRoles ?? []).map((r) => r.user_id);
    if (staffIds.length > 0) {
      const { data: staffEmps } = await supabase.from("employees").select("id").in("user_id", staffIds);
      const typeName = (row as unknown as LeaveRequest).leave_types?.name ?? "Leave";
      for (const se of staffEmps ?? []) {
        await supabase.rpc("notify", {
          _employee_id: se.id,
          _title: "New leave request",
          _message: `${emp.full_name} requested ${typeName} from ${data.startDate} to ${data.endDate}.`,
          _type: "leave",
        });
      }
    }

    return row as unknown as LeaveRequest;
  });

export const getLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ status: z.enum(["all", "pending", "approved", "rejected"]).default("all") }).parse(data),
  )
  .handler(async ({ context, data }): Promise<LeaveRequest[]> => {
    const { supabase } = context;
    let query = supabase
      .from("leave_requests")
      .select("*, leave_types(name), employees(full_name, employee_code, job_title, avatar_url), reviewer:reviewer_id(full_name)")
      .order("created_at", { ascending: false });
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as LeaveRequest[];
  });

export const reviewLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        comment: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LeaveRequest> => {
    const { supabase, userId } = context;

    const { data: reviewer } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!reviewer) throw new Error("No employee profile linked to this account.");

    const { data: request } = await supabase
      .from("leave_requests")
      .select("*, employees(user_id, full_name), leave_types(name)")
      .eq("id", data.id)
      .maybeSingle();
    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");

    const requesterUserId = (request.employees as unknown as { user_id: string | null })?.user_id;
    if (requesterUserId === userId) throw new Error("You can't review your own leave request.");

    const { data: row, error } = await supabase
      .from("leave_requests")
      .update({
        status: data.decision,
        reviewer_id: reviewer.id,
        review_comment: data.comment ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("*, leave_types(name), employees(full_name, employee_code, job_title, avatar_url)")
      .single();
    if (error) throw new Error(error.message);

    const typeName = (row as unknown as LeaveRequest).leave_types?.name ?? "Leave";
    const requesterName = (request.employees as unknown as { full_name: string })?.full_name ?? "Employee";

    await supabase.rpc("notify", {
      _employee_id: request.employee_id,
      _title: `Leave ${data.decision}`,
      _message: `Your ${typeName} request (${request.start_date} → ${request.end_date}) was ${data.decision} by ${reviewer.full_name}.${data.comment ? ` Comment: ${data.comment}` : ""}`,
      _type: data.decision === "approved" ? "success" : "leave",
    });

    await supabase.rpc("log_audit", {
      _action: data.decision === "approved" ? "leave_approved" : "leave_rejected",
      _entity: "leave_request",
      _entity_id: row.id,
      _metadata: { employee: requesterName, start: request.start_date, end: request.end_date },
    });

    // On approval, mark workdays in range as leave on the attendance calendar
    if (data.decision === "approved") {
      const rows: { employee_id: string; work_date: string; status: string }[] = [];
      const cursor = new Date(`${request.start_date}T00:00:00`);
      const end = new Date(`${request.end_date}T00:00:00`);
      while (cursor <= end) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
          rows.push({
            employee_id: request.employee_id,
            work_date: cursor.toISOString().slice(0, 10),
            status: "leave",
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      if (rows.length > 0) {
        await supabase.from("attendance").upsert(rows, {
          onConflict: "employee_id,work_date",
          ignoreDuplicates: true,
        });
      }
    }

    return row as unknown as LeaveRequest;
  });
