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
