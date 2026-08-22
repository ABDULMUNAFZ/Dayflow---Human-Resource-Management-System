import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

function calculateLeaveDuration(start: string, end: string): number {
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let count = 0;
  while (cursor <= last) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) { // Exclude Saturday and Sunday
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
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
        .reduce((sum: number, r: any) => sum + calculateLeaveDuration(r.start_date, r.end_date), 0);
      const pending = ofType
        .filter((r: any) => r.status === "pending")
        .reduce((sum: number, r: any) => sum + calculateLeaveDuration(r.start_date, r.end_date), 0);
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
        attachmentUrl: z.string().optional().nullable(),
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

    const duration = calculateLeaveDuration(data.startDate, data.endDate);
    if (duration <= 0) throw new Error("Leave duration must cover at least one working day (Mon-Fri).");
    if (duration > 60) throw new Error("Leave requests are limited to 60 days.");

    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("No employee profile linked to this account.");

    // Overlapping requests check
    const hasOverlap = db.leave_requests.some((r) => {
      if (r.employee_id !== emp.id) return false;
      if (r.status === "rejected") return false;
      return (data.startDate <= r.end_date && data.endDate >= r.start_date);
    });
    if (hasOverlap) {
      throw new Error("This period overlaps with an existing leave request.");
    }

    // Leave balance check
    const type = db.leave_types.find((t) => t.id === data.leaveTypeId);
    if (!type) throw new Error("Selected leave type not found.");

    // Attachment validation for Sick Leave
    const isSickLeave = type.name.toLowerCase().includes("sick");
    if (isSickLeave && !data.attachmentUrl) {
      throw new Error("Medical certificate attachment is required for sick leave requests.");
    }

    const yearStart = `${new Date().getFullYear()}-01-01`;
    const employeeRequests = db.leave_requests.filter((r) => r.employee_id === emp.id && r.leave_type_id === type.id && r.start_date >= yearStart);
    const used = employeeRequests
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + calculateLeaveDuration(r.start_date, r.end_date), 0);
    const pending = employeeRequests
      .filter((r) => r.status === "pending")
      .reduce((sum, r) => sum + calculateLeaveDuration(r.start_date, r.end_date), 0);
    
    if (used + pending + duration > type.annual_allowance) {
      throw new Error(`Insufficient leave balance. You have ${type.annual_allowance - (used + pending)} days remaining.`);
    }

    const crypto = await import("crypto");
    const newRequest = {
      id: crypto.randomUUID(),
      employee_id: emp.id,
      leave_type_id: data.leaveTypeId,
      start_date: data.startDate,
      end_date: data.endDate,
      remarks: data.remarks ?? null,
      status: "pending",
      attachment_url: data.attachmentUrl ?? null,
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

    return {
      ...newRequest,
      leave_types: { name: type.name },
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
