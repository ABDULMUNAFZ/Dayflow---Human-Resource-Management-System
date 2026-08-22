import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type ReportType = "attendance" | "leave" | "payroll" | "employees";

export interface ReportResult {
  type: ReportType;
  headers: string[];
  rows: (string | number)[][];
  generatedAt: string;
}

export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        type: z.enum(["attendance", "leave", "payroll", "employees"]),
        from: dateSchema,
        to: dateSchema,
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ReportResult> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "hr" || r.role === "admin")) {
      throw new Error("Reports are available to HR and Admin only.");
    }

    const generatedAt = new Date().toISOString();

    if (data.type === "attendance") {
      const { data: rows } = await supabase
        .from("attendance")
        .select("work_date, status, check_in, check_out, employees(full_name, employee_code, departments(name))")
        .gte("work_date", data.from)
        .lte("work_date", data.to)
        .order("work_date", { ascending: false })
        .limit(2000);
      return {
        type: data.type,
        headers: ["Date", "Employee", "Code", "Department", "Status", "Check In", "Check Out"],
        rows: (rows ?? []).map((r) => {
          const e = r.employees as unknown as {
            full_name: string;
            employee_code: string;
            departments: { name: string } | null;
          } | null;
          return [r.work_date, e?.full_name ?? "", e?.employee_code ?? "", e?.departments?.name ?? "", r.status, r.check_in ?? "", r.check_out ?? ""];
        }),
        generatedAt,
      };
    }

    if (data.type === "leave") {
      const { data: rows } = await supabase
        .from("leave_requests")
        .select("start_date, end_date, status, remarks, created_at, leave_types(name), employees(full_name, employee_code)")
        .gte("start_date", data.from)
        .lte("start_date", data.to)
        .order("created_at", { ascending: false })
        .limit(2000);
      return {
        type: data.type,
        headers: ["Employee", "Code", "Type", "From", "To", "Status", "Remarks", "Submitted"],
        rows: (rows ?? []).map((r) => {
          const e = r.employees as unknown as { full_name: string; employee_code: string } | null;
          const t = r.leave_types as unknown as { name: string } | null;
          return [e?.full_name ?? "", e?.employee_code ?? "", t?.name ?? "", r.start_date, r.end_date, r.status, r.remarks ?? "", r.created_at];
        }),
        generatedAt,
      };
    }

    if (data.type === "payroll") {
      const { data: rows } = await supabase
        .from("payroll")
        .select("period, base_salary, allowances, deductions, net_salary, status, employees(full_name, employee_code)")
        .gte("period", data.from)
        .lte("period", data.to)
        .order("period", { ascending: false })
        .limit(2000);
      return {
        type: data.type,
        headers: ["Employee", "Code", "Period", "Base", "Allowances", "Deductions", "Net", "Status"],
        rows: (rows ?? []).map((r) => {
          const e = r.employees as unknown as { full_name: string; employee_code: string } | null;
          return [e?.full_name ?? "", e?.employee_code ?? "", r.period, r.base_salary, r.allowances, r.deductions, r.net_salary, r.status];
        }),
        generatedAt,
      };
    }

    const { data: rows } = await supabase
      .from("employees")
      .select("full_name, employee_code, email, phone, job_title, employment_status, joining_date, departments(name)")
      .order("full_name")
      .limit(2000);
    return {
      type: data.type,
      headers: ["Name", "Code", "Email", "Phone", "Job Title", "Department", "Status", "Joined"],
      rows: (rows ?? []).map((r) => {
        const d = r.departments as unknown as { name: string } | null;
        return [r.full_name, r.employee_code, r.email, r.phone ?? "", r.job_title, d?.name ?? "", r.employment_status, r.joining_date];
      }),
      generatedAt,
    };
  });
