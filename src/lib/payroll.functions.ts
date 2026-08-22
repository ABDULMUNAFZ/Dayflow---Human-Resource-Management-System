import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Payroll, SalaryHistory } from "@/lib/types";

export const getMyPayroll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ payroll: Payroll[]; history: SalaryHistory[] }> => {
    const { supabase, userId } = context;
    const { data: emp } = await supabase.from("employees").select("id").eq("user_id", userId).maybeSingle();
    if (!emp) return { payroll: [], history: [] };

    const [{ data: payroll }, { data: history }] = await Promise.all([
      supabase.from("payroll").select("*").eq("employee_id", emp.id).order("period", { ascending: false }),
      supabase.from("salary_history").select("*").eq("employee_id", emp.id).order("effective_from", { ascending: false }),
    ]);
    return { payroll: (payroll ?? []) as Payroll[], history: (history ?? []) as SalaryHistory[] };
  });

export interface PayrollOverview {
  rows: Payroll[];
  period: string;
  totalNet: number;
  totalBase: number;
  paidCount: number;
  pendingCount: number;
}

export const getPayrollOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(data))
  .handler(async ({ context, data }): Promise<PayrollOverview> => {
    const { supabase } = context;
    const now = new Date();
    const period = data.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: rows, error } = await supabase
      .from("payroll")
      .select("*, employees(full_name, employee_code, job_title)")
      .eq("period", period)
      .order("net_salary", { ascending: false });
    if (error) throw new Error(error.message);

    const list = (rows ?? []) as unknown as Payroll[];
    return {
      rows: list,
      period,
      totalNet: list.reduce((s, r) => s + Number(r.net_salary), 0),
      totalBase: list.reduce((s, r) => s + Number(r.base_salary), 0),
      paidCount: list.filter((r) => r.status === "paid").length,
      pendingCount: list.filter((r) => r.status === "pending").length,
    };
  });

export const updateSalary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        employeeId: z.string().uuid(),
        baseSalary: z.number().min(0).max(100000000),
        allowances: z.number().min(0).max(100000000),
        deductions: z.number().min(0).max(100000000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<Payroll> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "hr" || r.role === "admin")) {
      throw new Error("Only HR or Admin can modify salary structures.");
    }

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const { data: row, error } = await supabase
      .from("payroll")
      .upsert(
        {
          employee_id: data.employeeId,
          period,
          base_salary: data.baseSalary,
          allowances: data.allowances,
          deductions: data.deductions,
        },
        { onConflict: "employee_id,period" },
      )
      .select("*, employees(full_name, employee_code, job_title)")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("salary_history").insert({
      employee_id: data.employeeId,
      base_salary: data.baseSalary,
      allowances: data.allowances,
      deductions: data.deductions,
      effective_from: now.toISOString().slice(0, 10),
      changed_by: userId,
    });

    await supabase.rpc("notify", {
      _employee_id: data.employeeId,
      _title: "Payroll updated",
      _message: "Your salary structure was updated by HR for the current period.",
      _type: "payroll",
    });
    await supabase.rpc("log_audit", {
      _action: "salary_updated",
      _entity: "employee",
      _entity_id: data.employeeId,
      _metadata: { base: data.baseSalary, allowances: data.allowances, deductions: data.deductions },
    });

    return row as unknown as Payroll;
  });

export const setPayrollStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "paid"]) }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "hr" || r.role === "admin")) {
      throw new Error("Only HR or Admin can change payroll status.");
    }
    const { data: row, error } = await supabase
      .from("payroll")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("employee_id, period")
      .single();
    if (error) throw new Error(error.message);
    if (data.status === "paid") {
      await supabase.rpc("notify", {
        _employee_id: row.employee_id,
        _title: "Salary credited",
        _message: `Your salary for ${row.period} has been marked as paid.`,
        _type: "payroll",
      });
    }
    return { ok: true };
  });
