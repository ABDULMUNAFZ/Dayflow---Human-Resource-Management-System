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
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) return { requests: [], balances: [] };

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const requests = db.leave_requests.filter((r) => r.employee_id === emp.id);
    const types = db.leave_types || [];

    const mappedRequests = requests.map((r) => {
      const type = types.find((t) => t.id === r.leave_type_id);
      const rev = db.employees.find((e) => e.id === r.reviewer_id);
      return {
        ...r,
        leave_types: type ? { name: type.name } : null,
        reviewer: rev ? { full_name: rev.full_name } : null,
      };
    }) as any;

    const balances: LeaveBalance[] = types.map((t) => {
      const ofType = mappedRequests.filter((r: any) => r.leave_type_id === t.id && r.start_date >= yearStart);
      const used = ofType
        .filter((r: any) => r.status === "approved")
        .reduce((sum: number, r: any) => sum + dayCount(r.start_date, r.end_date), 0);
      const pending = ofType
        .filter((r: any) => r.status === "pending")
        .reduce((sum: number, r: any) => sum + dayCount(r.start_date, r.end_date), 0);
      return { typeId: t.id, name: t.name, allowance: t.annual_allowance, used, pending };
    });

    return { requests: mappedRequests, balances };
  });

export const applyLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        leaveTypeId: z.string(),
        startDate: dateSchema,
        endDate: dateSchema,
        remarks: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LeaveRequest> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    if (data.endDate < data.startDate) throw new Error("End date can't be before the start date.");
    const today = new Date().toISOString().slice(0, 10);
    if (data.startDate < today) throw new Error("Leave can't start in the past.");
    if (dayCount(data.startDate, data.endDate) > 60) throw new Error("Leave requests are limited to 60 days.");

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("No employee profile linked to this account.");

    const crypto = await import("crypto");
    const newRequest = {
      id: crypto.randomUUID(),
      employee_id: emp.id,
      leave_type_id: data.leaveTypeId,
      start_date: data.startDate,
      end_date: data.endDate,
      remarks: data.remarks ?? null,
      status: "pending",
      created_at: new Date().toISOString(),
      reviewer_id: null,
      review_comment: null,
      reviewed_at: null,
    };

    db.leave_requests.push(newRequest);
    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: "leave_submitted",
      created_at: new Date().toISOString(),
    });

    saveDb(db);

    const type = db.leave_types.find((t) => t.id === data.leaveTypeId);
    return {
      ...newRequest,
      leave_types: type ? { name: type.name } : null,
    } as any;
  });

export const getLeaveRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ status: z.enum(["all", "pending", "approved", "rejected"]).default("all") }).parse(data),
  )
  .handler(async ({ data }): Promise<LeaveRequest[]> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();

    let requests = [...db.leave_requests];
    if (data.status !== "all") {
      requests = requests.filter((r) => r.status === data.status);
    }

    return requests.map((r) => {
      const type = db.leave_types.find((t) => t.id === r.leave_type_id);
      const emp = db.employees.find((e) => e.id === r.employee_id);
      const rev = db.employees.find((e) => e.id === r.reviewer_id);
      return {
        ...r,
        leave_types: type ? { name: type.name } : null,
        employees: emp ? {
          full_name: emp.full_name,
          employee_code: emp.employee_code,
          job_title: emp.job_title,
          avatar_url: emp.avatar_url,
        } : null,
        reviewer: rev ? { full_name: rev.full_name } : null,
      };
    }) as any[];
  });

export const reviewLeave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string(),
        decision: z.enum(["approved", "rejected"]),
        comment: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LeaveRequest> => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const reviewer = db.employees.find((e) => e.user_id === userId);
    if (!reviewer) throw new Error("No employee profile linked to this account.");

    const request = db.leave_requests.find((r) => r.id === data.id);
    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("This request has already been reviewed.");

    const requester = db.employees.find((e) => e.id === request.employee_id);
    if (requester?.user_id === userId) throw new Error("You can't review your own leave request.");

    request.status = data.decision;
    request.reviewer_id = reviewer.id;
    request.review_comment = data.comment ?? null;
    request.reviewed_at = new Date().toISOString();

    const crypto = await import("crypto");
    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: data.decision === "approved" ? "leave_approved" : "leave_rejected",
      created_at: new Date().toISOString(),
    });

    if (data.decision === "approved") {
      const cursor = new Date(`${request.start_date}T00:00:00`);
      const end = new Date(`${request.end_date}T00:00:00`);
      while (cursor <= end) {
        const dow = cursor.getDay();
        if (dow !== 0 && dow !== 6) {
          const dateStr = cursor.toISOString().slice(0, 10);
          const existingAtt = db.attendance.find(
            (a) => a.employee_id === request.employee_id && a.work_date === dateStr
          );
          if (existingAtt) {
            existingAtt.status = "leave";
          } else {
            db.attendance.push({
              id: crypto.randomUUID(),
              employee_id: request.employee_id,
              work_date: dateStr,
              check_in: null,
              check_out: null,
              status: "leave",
              created_at: new Date().toISOString(),
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    saveDb(db);

    const type = db.leave_types.find((t) => t.id === request.leave_type_id);
    return {
      ...request,
      leave_types: type ? { name: type.name } : null,
      employees: requester ? {
        full_name: requester.full_name,
        employee_code: requester.employee_code,
        job_title: requester.job_title,
        avatar_url: requester.avatar_url,
      } : null,
    } as any;
  });
