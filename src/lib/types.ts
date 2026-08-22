export type AppRole = "admin" | "hr" | "employee";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type EmploymentStatus = "active" | "on_leave" | "inactive";
export type PayrollStatus = "pending" | "paid";
export type NotificationType = "info" | "success" | "warning" | "leave" | "payroll" | "attendance";
export type DocType = "offer_letter" | "id_proof" | "certificate" | "contract" | "other";

export interface Company {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
}

export interface LeaveType {
  id: string;
  name: string;
  annual_allowance: number;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  job_title: string;
  department_id: string | null;
  manager_id: string | null;
  joining_date: string;
  employment_status: EmploymentStatus;
  company_id: string | null;
  company: string | null;
  needs_password_change: boolean;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | null;
  manager?: { full_name: string } | null;
  // Resume info
  about_summary?: string | null;
  skills?: string[] | null;
  certifications?: string[] | null;
  // Private info
  date_of_birth?: string | null;
  nationality?: string | null;
  personal_email?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  // Bank details
  bank_account_no?: string | null;
  bank_name?: string | null;
  ifsc_code?: string | null;
  pan_no?: string | null;
  uan_no?: string | null;
  // Credentials
  password?: string | null;
}

export interface EmployeeWithToday extends Employee {
  today_status: AttendanceStatus | null;
  today_check_in: string | null;
  today_check_out?: string | null;
  work_status: "present" | "on_leave" | "absent";
}

export interface Attendance {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  work_hours?: number;
  extra_hours?: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  remarks: string | null;
  status: LeaveStatus;
  reviewer_id: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  attachment_url?: string | null;
  leave_types?: { name: string } | null;
  employees?: Pick<Employee, "full_name" | "employee_code" | "job_title" | "avatar_url"> | null;
  reviewer?: { full_name: string } | null;
}

export interface Payroll {
  id: string;
  employee_id: string;
  period: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  pay_date: string | null;
  status: PayrollStatus;
  employees?: Pick<Employee, "full_name" | "employee_code" | "job_title"> | null;
  // Auditing & Calculation Breakdown
  working_days?: number;
  present_days?: number;
  paid_leaves?: number;
  unpaid_leaves?: number;
  absent_days?: number;
  half_days?: number;
  payable_days?: number;
  salary_basis?: number;
  adjustments?: number;
}

export interface SalaryComponent {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  calculation_base_id: string | null; // ID of the parent component, or 'wage'
}

export interface SalaryConfig {
  id: string;
  employee_id: string;
  wage_type: "fixed" | "monthly" | "yearly";
  wage_amount: number;
  working_days_per_week: number;
  working_hours_per_day: number;
  pf_rate: number;
  employer_pf_rate: number;
  professional_tax: number;
  components: SalaryComponent[];
}

export interface SalaryHistory {
  id: string;
  employee_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  effective_from: string;
  created_at: string;
}

export interface HrDocument {
  id: string;
  employee_id: string;
  title: string;
  doc_type: DocType;
  file_url: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  employee_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  employee: Employee | null;
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
}

export interface LeaveBalance {
  typeId: string;
  name: string;
  allowance: number;
  used: number;
  pending: number;
}
