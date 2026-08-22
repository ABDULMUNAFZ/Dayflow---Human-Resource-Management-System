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
  Company,
} from "@/lib/types";

export const getEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        search: z.string().optional(),
        departmentId: z.string().optional(),
        status: z.enum(["all", "active", "on_leave", "inactive"]).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<EmployeeWithToday[]> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();
    let list = [...db.employees];
    
    if (data.search) {
      const q = data.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q)
      );
    }
    if (data.departmentId && data.departmentId !== "all") {
      list = list.filter((e) => e.department_id === data.departmentId);
    }
    if (data.status && data.status !== "all") {
      list = list.filter((e) => e.employment_status === data.status);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    return list.map((e) => {
      const dept = db.departments.find((d) => d.id === e.department_id);
      
      // Calculate work_status
      const checkin = db.attendance.find(
        (a) => a.employee_id === e.id && a.work_date === todayStr
      );
      const onLeave = db.leave_requests.find(
        (l) => l.employee_id === e.id && l.status === "approved"
      );
      
      const work_status = checkin ? "present" : onLeave ? "on_leave" : "absent";
      const today_status = checkin ? (checkin.check_out ? "checked_out" : "checked_in") : "absent";

      return {
        ...e,
        departments: dept ? { name: dept.name } : null,
        work_status,
        today_status,
      } as any;
    });
  });

export interface EmployeeDetail {
  employee: Employee;
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payroll: Payroll[];
  documents: HrDocument[];
  audit: AuditLog[];
}

export const getEmployeeDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }): Promise<EmployeeDetail> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();
    
    const emp = db.employees.find((e) => e.id === data.id || e.user_id === data.id);
    if (!emp) throw new Error("Employee not found");

    const dept = db.departments.find((d) => d.id === emp.department_id);
    const manager = db.employees.find((e) => e.id === emp.manager_id);
    
    const attendance = db.attendance.filter((a) => a.employee_id === emp.id);
    const leaveRequests = db.leave_requests.filter((l) => l.employee_id === emp.id);
    const payroll = db.payroll.filter((p) => p.employee_id === emp.id);
    const documents = db.documents.filter((d) => d.employee_id === emp.id);
    const audit = db.audit_logs.filter((a) => a.entity_id === emp.id);

    return {
      employee: {
        ...emp,
        departments: dept ? { name: dept.name } : null,
        manager: manager ? { full_name: manager.full_name } : null,
      } as any,
      attendance,
      leaveRequests,
      payroll,
      documents,
      audit,
    };
  });

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string(),
        full_name: z.string(),
        phone: z.string().nullable(),
        address: z.string().nullable(),
        job_title: z.string(),
        department_id: z.string().nullable(),
        manager_id: z.string().nullable(),
        employment_status: z.enum(["active", "on_leave", "inactive"]),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    const emp = db.employees.find((e) => e.id === data.id);
    if (emp) {
      emp.full_name = data.full_name;
      emp.phone = data.phone;
      emp.address = data.address;
      emp.job_title = data.job_title;
      emp.department_id = data.department_id;
      emp.manager_id = data.manager_id;
      emp.employment_status = data.employment_status;
      saveDb(db);
    }
    return emp;
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        employeeId: z.string(),
        title: z.string(),
        docType: z.string(),
        fileUrl: z.string(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<HrDocument> => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    const crypto = await import("crypto");
    const doc = {
      id: crypto.randomUUID(),
      employee_id: data.employeeId,
      title: data.title,
      doc_type: data.docType,
      file_url: data.fileUrl,
      created_at: new Date().toISOString(),
    };
    db.documents.push(doc);
    saveDb(db);
    return doc as any;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    db.documents = db.documents.filter((d) => d.id !== data.id);
    saveDb(db);
    return { ok: true };
  });

export const getCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<Company[]> => {
    const { getDb } = await import("./mock-db");
    return getDb().companies;
  });

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        companyId: z.string(),
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        email: z.string().email(),
        phone: z.string().trim().optional().nullable(),
        joiningDate: z.string(),
        departmentId: z.string().nullable(),
        jobTitle: z.string().trim().min(2),
        role: z.enum(["admin", "hr", "employee"]),
        avatarUrl: z.string().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    
    const company = db.companies.find((c) => c.id === data.companyId) || db.companies[0];
    const joiningYear = new Date(data.joiningDate).getFullYear();
    
    const base = `${company.prefix.substring(0, 2)}${data.firstName.substring(0, 2)}${data.lastName.substring(0, 2)}${joiningYear}`.toUpperCase();
    const matches = db.employees.filter((e) => e.employee_code.startsWith(base));
    const serial = (matches.length + 1).toString().padStart(4, "0");
    const loginId = `${base}${serial}`;
    
    const crypto = await import("crypto");
    const tempPassword = crypto.randomBytes(6).toString("hex");
    
    const newUserId = crypto.randomUUID();
    const mockEmpId = crypto.randomUUID();
    
    const newEmp = {
      id: mockEmpId,
      user_id: newUserId,
      employee_code: loginId,
      full_name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone || null,
      joining_date: data.joiningDate,
      department_id: data.departmentId,
      avatar_url: data.avatarUrl || null,
      job_title: data.jobTitle,
      company_id: company.id,
      company: company.name,
      needs_password_change: true,
      employment_status: 'active',
    };
    
    db.employees.push(newEmp);
    db.user_roles.push({ user_id: newUserId, role: data.role });
    db.audit_logs.push({
      id: crypto.randomUUID(),
      action: "employee_created",
      created_at: new Date().toISOString(),
    });
    
    saveDb(db);
    
    return {
      loginId,
      tempPassword,
      email: data.email,
      fullName: `${data.firstName} ${data.lastName}`,
    };
  });

export const completePasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    const emp = db.employees.find((e) => e.user_id === context.userId);
    if (emp) {
      emp.needs_password_change = false;
      saveDb(db);
    }
    return { ok: true };
  });

export const resolveLoginId = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ loginId: z.string().trim() }).parse(data))
  .handler(async ({ data }): Promise<{ email: string | null }> => {
    const { getDb } = await import("./mock-db");
    const db = getDb();
    const emp = db.employees.find(
      (e) => e.employee_code.toLowerCase() === data.loginId.toLowerCase() || e.email.toLowerCase() === data.loginId.toLowerCase()
    );
    return { email: emp?.email ?? null };
  });

export const signInMock = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ loginInput: z.string().trim() }).parse(data))
  .handler(async ({ data }): Promise<{ userId: string | null; email: string | null; error: string | null }> => {
    const { getDb, saveDb } = await import("./mock-db");
    
    const db = getDb();
    const cleanInput = data.loginInput;
    
    let emp = db.employees.find(
      (e) => e.email.toLowerCase() === cleanInput.toLowerCase() || e.employee_code.toLowerCase() === cleanInput.toLowerCase()
    );
    
    if (!emp) {
      const isEmail = cleanInput.includes("@");
      const defaultEmail = isEmail ? cleanInput : `${cleanInput.toLowerCase()}@gmail.com`;
      const defaultCode = isEmail ? `DF${cleanInput.split("@")[0]!.substring(0, 4).toUpperCase()}20260001` : cleanInput.toUpperCase();
      
      const company = db.companies[0] || { id: 'c1', name: 'Dayflow', prefix: 'DF' };
      const department = db.departments[0] || { id: 'd1', name: 'Engineering' };
      const crypto = await import("crypto");
      const mockUserId = crypto.randomUUID();
      const mockEmpId = crypto.randomUUID();

      let role: "admin" | "hr" | "employee" = "employee";
      const emailLower = defaultEmail.toLowerCase();
      if (emailLower.includes("admin")) {
        role = "admin";
      } else if (emailLower.includes("hr")) {
        role = "hr";
      }

      emp = {
        id: mockEmpId,
        user_id: mockUserId,
        employee_code: defaultCode,
        full_name: defaultEmail.split("@")[0]!.split(".")[0]!.replace(/[0-9]/g, "").replace(/^\w/, (c) => c.toUpperCase()) || "Mock User",
        email: defaultEmail,
        job_title: role === "admin" ? "System Administrator" : role === "hr" ? "HR Specialist" : "Software Engineer",
        joining_date: new Date().toISOString().slice(0, 10),
        company_id: company.id,
        company: company.name,
        department_id: department.id,
        needs_password_change: false,
        employment_status: 'active',
      };

      db.employees.push(emp);
      db.user_roles.push({ user_id: mockUserId, role });
      saveDb(db);
    }
    
    return { userId: emp.user_id || emp.id, email: emp.email, error: null };
  });

export const createMockEmployeeOnFly = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string(),
        code: z.string(),
        companyId: z.string().uuid().nullable(),
        companyName: z.string(),
        departmentId: z.string().uuid().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ data }): Promise<Employee> => {
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    
    let companyId: string | null = data.companyId;
    let companyName: string | null = data.companyName;
    if (!companyId) {
      const comp = db.companies[0] || { id: 'c1', name: 'Dayflow' };
      companyId = comp.id;
      companyName = comp.name;
    }

    let departmentId: string | null = data.departmentId;
    if (!departmentId) {
      const dept = db.departments[0] || { id: 'd1' };
      departmentId = dept.id;
    }

    let role: "admin" | "hr" | "employee" = "employee";
    const emailLower = data.email.toLowerCase();
    if (emailLower.includes("admin")) {
      role = "admin";
    } else if (emailLower.includes("hr")) {
      role = "hr";
    }

    const mockEmpId = (await import("crypto")).randomUUID();

    const emp = {
      id: mockEmpId,
      user_id: data.userId,
      employee_code: data.code,
      full_name: data.email.split("@")[0]!.split(".")[0]!.replace(/[0-9]/g, "").replace(/^\w/, (c) => c.toUpperCase()) || "Mock User",
      email: data.email,
      job_title: role === "admin" ? "System Administrator" : role === "hr" ? "HR Specialist" : "Software Engineer",
      joining_date: new Date().toISOString().slice(0, 10),
      company_id: companyId,
      company: companyName,
      department_id: departmentId,
      needs_password_change: false,
      employment_status: 'active',
    };

    db.employees.push(emp);
    db.user_roles.push({ user_id: data.userId, role });
    saveDb(db);

    return emp as any;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        full_name: z.string().trim().min(1, "Full name is required"),
        phone: z.string().trim().optional().nullable(),
        address: z.string().trim().optional().nullable(),
      })
      .parse(data)
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("Profile not found");
    emp.full_name = data.full_name;
    emp.phone = data.phone || null;
    emp.address = data.address || null;
    saveDb(db);
    return emp;
  });

export const updateEmployeeExtendedInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      employeeId: z.string(),
      full_name: z.string().trim().min(2, "Full name is required"),
      email: z.string().email("Invalid email"),
      phone: z.string().trim().optional().nullable(),
      address: z.string().trim().optional().nullable(),
      job_title: z.string().trim().min(1, "Job title is required"),
      department_id: z.string().optional().nullable(),
      employment_status: z.enum(["active", "on_leave", "inactive"]),
      joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
      company_id: z.string().optional().nullable(),
      date_of_birth: z.string().optional().nullable(),
      nationality: z.string().optional().nullable(),
      personal_email: z.string().optional().nullable(),
      gender: z.string().optional().nullable(),
      marital_status: z.string().optional().nullable(),
      bank_account_no: z.string().optional().nullable(),
      bank_name: z.string().optional().nullable(),
      ifsc_code: z.string().optional().nullable(),
      pan_no: z.string().optional().nullable(),
      uan_no: z.string().optional().nullable(),
    })
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    
    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("hr") && !roles.includes("admin")) {
      throw new Error("Unauthorized: Only HR/Admin can update extended employee information.");
    }
    
    const emp = db.employees.find((e) => e.id === data.employeeId);
    if (!emp) throw new Error("Employee not found");
    
    emp.full_name = data.full_name;
    emp.email = data.email;
    emp.phone = data.phone || null;
    emp.address = data.address || null;
    emp.job_title = data.job_title;
    emp.department_id = data.department_id || null;
    emp.employment_status = data.employment_status;
    emp.joining_date = data.joining_date;
    emp.company_id = data.company_id || null;
    
    emp.date_of_birth = data.date_of_birth || null;
    emp.nationality = data.nationality || null;
    emp.personal_email = data.personal_email || null;
    emp.gender = data.gender || null;
    emp.marital_status = data.marital_status || null;
    emp.bank_account_no = data.bank_account_no || null;
    emp.bank_name = data.bank_name || null;
    emp.ifsc_code = data.ifsc_code || null;
    emp.pan_no = data.pan_no || null;
    emp.uan_no = data.uan_no || null;
    
    saveDb(db);
    return emp;
  });

export const updateEmployeeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      employeeId: z.string(),
      about_summary: z.string().trim().max(1000).optional().nullable(),
      skills: z.array(z.string()).optional().nullable(),
      certifications: z.array(z.string()).optional().nullable(),
    })
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    
    const targetEmp = db.employees.find((e) => e.id === data.employeeId);
    if (!targetEmp) throw new Error("Employee not found");
    
    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    const isSelf = targetEmp.user_id === userId;
    const isStaff = roles.includes("admin") || roles.includes("hr");
    
    if (!isSelf && !isStaff) {
      throw new Error("Unauthorized to edit this employee's resume.");
    }
    
    targetEmp.about_summary = data.about_summary || null;
    targetEmp.skills = data.skills || [];
    targetEmp.certifications = data.certifications || [];
    
    saveDb(db);
    return targetEmp;
  });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string(),
    })
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();
    
    const emp = db.employees.find((e) => e.user_id === userId);
    if (!emp) throw new Error("Profile not found.");
    
    const currentStored = emp.password || "password";
    if (currentStored !== data.currentPassword) {
      throw new Error("Incorrect current password.");
    }
    
    if (data.newPassword !== data.confirmPassword) {
      throw new Error("New passwords do not match.");
    }
    
    emp.password = data.newPassword;
    emp.needs_password_change = false;
    
    saveDb(db);
    return { ok: true };
  });

export const getSalaryConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ employeeId: z.string() }).parse)
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Unauthorized: Only Admin can access salary configurations.");
    }

    let config = db.salary_configs.find((s: any) => s.employee_id === data.employeeId);
    if (!config) {
      const crypto = await import("crypto");
      config = {
        id: crypto.randomUUID(),
        employee_id: data.employeeId,
        wage_type: "monthly",
        wage_amount: 50000,
        working_days_per_week: 5,
        working_hours_per_day: 8,
        pf_rate: 12,
        employer_pf_rate: 12,
        professional_tax: 200,
        components: [
          { id: crypto.randomUUID(), name: "Basic Salary", type: "percentage", value: 50, calculation_base_id: "wage" },
          { id: crypto.randomUUID(), name: "House Rent Allowance", type: "percentage", value: 50, calculation_base_id: "basic" },
        ],
      };
      db.salary_configs.push(config);
      saveDb(db);
    }
    return config;
  });

export const saveSalaryConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      employeeId: z.string(),
      wage_type: z.enum(["fixed", "monthly", "yearly"]),
      wage_amount: z.number().min(0),
      working_days_per_week: z.number().min(1).max(7),
      working_hours_per_day: z.number().min(1).max(24),
      pf_rate: z.number().min(0).max(100),
      employer_pf_rate: z.number().min(0).max(100),
      professional_tax: z.number().min(0),
      components: z.array(
        z.object({
          id: z.string(),
          name: z.string().trim().min(1),
          type: z.enum(["fixed", "percentage"]),
          value: z.number().min(0),
          calculation_base_id: z.string().nullable(),
        })
      ),
    })
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getDb, saveDb } = await import("./mock-db");
    const db = getDb();

    const roles = db.user_roles.filter((r) => r.user_id === userId).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Unauthorized: Only Admin can update salary configurations.");
    }

    const components = data.components;
    const map = new Map(components.map((c) => [c.id, c.calculation_base_id]));
    
    const hasCycle = (id: string, visited: Set<string>, stack: Set<string>): boolean => {
      if (stack.has(id)) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      stack.add(id);
      const base = map.get(id);
      if (base && base !== "wage" && base !== "basic") {
        if (hasCycle(base, visited, stack)) return true;
      }
      stack.delete(id);
      return false;
    };

    for (const c of components) {
      if (hasCycle(c.id, new Set(), new Set())) {
        throw new Error(`Circular dependency detected in component "${c.name}".`);
      }
    }

    let config = db.salary_configs.find((s: any) => s.employee_id === data.employeeId);
    if (config) {
      config.wage_type = data.wage_type;
      config.wage_amount = data.wage_amount;
      config.working_days_per_week = data.working_days_per_week;
      config.working_hours_per_day = data.working_hours_per_day;
      config.pf_rate = data.pf_rate;
      config.employer_pf_rate = data.employer_pf_rate;
      config.professional_tax = data.professional_tax;
      config.components = data.components;
    } else {
      const crypto = await import("crypto");
      config = {
        id: crypto.randomUUID(),
        employee_id: data.employeeId,
        wage_type: data.wage_type,
        wage_amount: data.wage_amount,
        working_days_per_week: data.working_days_per_week,
        working_hours_per_day: data.working_hours_per_day,
        pf_rate: data.pf_rate,
        employer_pf_rate: data.employer_pf_rate,
        professional_tax: data.professional_tax,
        components: data.components,
      };
      db.salary_configs.push(config);
    }

    saveDb(db);
    return config;
  });

export interface ComponentResult {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  calculation_base_id: string | null;
  calculated_amount: number;
}

export function calculateSalaryComponents(
  wageAmount: number,
  components: { id: string; name: string; type: "fixed" | "percentage"; value: number; calculation_base_id: string | null }[]
): ComponentResult[] {
  const results: ComponentResult[] = [];
  const compMap = new Map<string, number>();

  const getAmountForId = (id: string | null): number => {
    if (!id || id === "wage") return wageAmount;
    if (id === "basic") {
      const basic = results.find((r) => r.name.toLowerCase().includes("basic"));
      return basic ? basic.calculated_amount : wageAmount;
    }
    return compMap.get(id) ?? 0;
  };

  const resolved = new Set<string>();
  const resolving = new Set<string>();

  const resolve = (c: typeof components[0]) => {
    if (resolved.has(c.id)) return;
    if (resolving.has(c.id)) throw new Error("Circular dependency!");
    resolving.add(c.id);

    const baseId = c.calculation_base_id;
    if (baseId && baseId !== "wage" && baseId !== "basic") {
      const parent = components.find((p) => p.id === baseId);
      if (parent) {
        resolve(parent);
      }
    }

    const baseAmount = getAmountForId(baseId);
    let amount = 0;
    if (c.type === "fixed") {
      amount = c.value;
    } else {
      amount = (c.value / 100) * baseAmount;
    }

    compMap.set(c.id, amount);
    results.push({
      ...c,
      calculated_amount: amount,
    });
    resolved.add(c.id);
    resolving.delete(c.id);
  };

  for (const c of components) {
    try {
      resolve(c);
    } catch (e) {
      results.push({
        ...c,
        calculated_amount: 0,
      });
    }
  }

  return results;
}
