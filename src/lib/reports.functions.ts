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
    const { userId } = context;
    const { getDb } = await import("./mock-db");
    const db = getDb();

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("hr") && !roles.includes("admin")) {
      throw new Error("Reports are available to HR and Admin only.");
    }

    const generatedAt = new Date().toISOString();

    if (data.type === "attendance") {
      const rows = db.attendance.filter((a) => a.work_date >= data.from && a.work_date <= data.to);
      return {
        type: data.type,
        headers: ["Date", "Employee", "Code", "Department", "Status", "Check In", "Check Out"],
        rows: rows.map((r) => {
          const e = db.employees.find((emp) => emp.id === r.employee_id);
          const d = e ? db.departments.find((dept) => dept.id === e.department_id) : null;
          return [
            r.work_date,
            e?.full_name ?? "",
            e?.employee_code ?? "",
            d?.name ?? "",
            r.status,
            r.check_in ?? "",
            r.check_out ?? ""
          ];
        }),
        generatedAt,
      };
    }

    if (data.type === "leave") {
      const rows = db.leave_requests.filter((l) => l.start_date >= data.from && l.start_date <= data.to);
      return {
        type: data.type,
        headers: ["Employee", "Code", "Type", "From", "To", "Status", "Remarks", "Submitted"],
        rows: rows.map((r) => {
          const e = db.employees.find((emp) => emp.id === r.employee_id);
          const t = db.leave_types.find((lt) => lt.id === r.leave_type_id);
          return [
            e?.full_name ?? "",
            e?.employee_code ?? "",
            t?.name ?? "",
            r.start_date,
            r.end_date,
            r.status,
            r.remarks ?? "",
            r.created_at
          ];
        }),
        generatedAt,
      };
    }

    if (data.type === "payroll") {
      const rows = db.payroll.filter((p) => p.period >= data.from && p.period <= data.to);
      return {
        type: data.type,
        headers: ["Employee", "Code", "Period", "Base", "Allowances", "Deductions", "Net", "Status"],
        rows: rows.map((r) => {
          const e = db.employees.find((emp) => emp.id === r.employee_id);
          return [
            e?.full_name ?? "",
            e?.employee_code ?? "",
            r.period ?? "",
            r.base_salary ?? 0,
            r.allowances ?? 0,
            r.deductions ?? 0,
            r.net_salary ?? 0,
            r.status ?? ""
          ];
        }),
        generatedAt,
      };
    }

    // Default: employees
    const rows = db.employees;
    return {
      type: data.type,
      headers: ["Name", "Code", "Email", "Phone", "Job Title", "Department", "Status", "Joined"],
      rows: rows.map((r) => {
        const d = db.departments.find((dept) => dept.id === r.department_id);
        return [
          r.full_name,
          r.employee_code,
          r.email,
          r.phone ?? "",
          r.job_title,
          d?.name ?? "",
          r.employment_status || "active",
          r.joining_date
        ];
      }),
      generatedAt,
    };
  });
