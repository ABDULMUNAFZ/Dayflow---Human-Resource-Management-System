import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  Attendance,
  AuditLog,
  Employee,
  EmployeeWithToday,
  HrDocument,
  LeaveRequest,
  Payroll,
} from "@/lib/types";

export const getEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        departmentId: z.string().uuid().optional(),
        status: z.enum(["all", "active", "on_leave", "inactive"]).default("all"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<EmployeeWithToday[]> => {
    const { supabase } = context;
    let query = supabase
      .from("employees")
      .select("*, departments(name), manager:manager_id(full_name)")
      .order("full_name");
    if (data.search) query = query.or(`full_name.ilike.%${data.search}%,email.ilike.%${data.search}%,employee_code.ilike.%${data.search}%`);
    if (data.departmentId) query = query.eq("department_id", data.departmentId);
    if (data.status !== "all") query = query.eq("employment_status", data.status);

    const { data: employees, error } = await query;
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    const { data: attendance } = await supabase.from("attendance").select("*").eq("work_date", today);
    const byEmployee = new Map((attendance ?? []).map((a) => [a.employee_id, a as Attendance]));

    return ((employees ?? []) as unknown as Employee[]).map((e) => ({
      ...e,
      today_status: byEmployee.get(e.id)?.status ?? null,
      today_check_in: byEmployee.get(e.id)?.check_in ?? null,
    }));
  });

export interface EmployeeDetail {
  employee: Employee;
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payroll: Payroll[];
  documents: HrDocument[];
  audit: AuditLog[];
  canViewPayroll: boolean;
}

export const getEmployeeDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<EmployeeDetail> => {
    const { supabase, userId } = context;

    const { data: employee, error } = await supabase
      .from("employees")
      .select("*, departments(name), manager:manager_id(full_name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!employee) throw new Error("Employee not found or you don't have access.");

    const isSelf = (employee as Employee).user_id === userId;
    const canViewPayroll = isSelf || true; // RLS already scopes payroll rows; staff see all, self sees own

    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const [att, leave, pay, docs, audit] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", data.id)
        .gte("work_date", since)
        .order("work_date", { ascending: false }),
      supabase
        .from("leave_requests")
        .select("*, leave_types(name), reviewer:reviewer_id(full_name)")
        .eq("employee_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", data.id)
        .order("period", { ascending: false })
        .limit(6),
      supabase.from("documents").select("*").eq("employee_id", data.id).order("created_at", { ascending: false }),
      supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_id", data.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return {
      employee: employee as unknown as Employee,
      attendance: (att.data ?? []) as Attendance[],
      leaveRequests: (leave.data ?? []) as unknown as LeaveRequest[],
      payroll: (pay.data ?? []) as Payroll[],
      documents: (docs.data ?? []) as HrDocument[],
      audit: (audit.data ?? []) as AuditLog[],
      canViewPayroll,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        full_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional().nullable(),
        address: z.string().trim().max(240).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<Employee> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("employees")
      .update({ full_name: data.full_name, phone: data.phone ?? null, address: data.address ?? null })
      .eq("user_id", userId)
      .select("*, departments(name), manager:manager_id(full_name)")
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit", {
      _action: "profile_updated",
      _entity: "employee",
      _entity_id: row.id,
      _metadata: { fields: ["full_name", "phone", "address"] },
    });
    return row as unknown as Employee;
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional().nullable(),
        address: z.string().trim().max(240).optional().nullable(),
        job_title: z.string().trim().min(2).max(120),
        department_id: z.string().uuid().nullable(),
        manager_id: z.string().uuid().nullable(),
        employment_status: z.enum(["active", "on_leave", "inactive"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<Employee> => {
    const { supabase, userId } = context;
    // Server-side role enforcement (defense in depth beyond RLS)
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) => r.role === "hr" || r.role === "admin");
    if (!isStaff) throw new Error("Only HR or Admin can edit employee records.");

    const { id } = data;
    const fields = {
      full_name: data.full_name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      job_title: data.job_title,
      department_id: data.department_id,
      manager_id: data.manager_id,
      employment_status: data.employment_status,
    };
    const { data: row, error } = await supabase
      .from("employees")
      .update(fields)
      .eq("id", id)
      .select("*, departments(name), manager:manager_id(full_name)")
      .single();
    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "employee_updated",
      _entity: "employee",
      _entity_id: id,
      _metadata: { fields: Object.keys(fields) },
    });
    await supabase.rpc("notify", {
      _employee_id: id,
      _title: "Profile updated",
      _message: "Your employee record was updated by HR.",
      _type: "info",
    });
    return row as unknown as Employee;
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        employeeId: z.string().uuid(),
        title: z.string().trim().min(2).max(160),
        docType: z.enum(["offer_letter", "id_proof", "certificate", "contract", "other"]),
        fileUrl: z.string().url().optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<HrDocument> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "hr" || r.role === "admin")) {
      throw new Error("Only HR or Admin can add documents.");
    }
    const { data: row, error } = await supabase
      .from("documents")
      .insert({
        employee_id: data.employeeId,
        title: data.title,
        doc_type: data.docType,
        file_url: data.fileUrl || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await supabase.rpc("notify", {
      _employee_id: data.employeeId,
      _title: "New document added",
      _message: `HR added a document: ${data.title}.`,
      _type: "info",
    });
    return row as HrDocument;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "hr" || r.role === "admin")) {
      throw new Error("Only HR or Admin can delete documents.");
    }
    const { error } = await supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
