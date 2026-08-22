# Dayflow - Human Resource Management System (HRMS)

> **GitHub Repository Description (under 350 characters):**
> Dayflow is a premium, high-performance Human Resource Management System (HRMS) built using TanStack Start, React, and Tailwind. It features a fully-functional local database-free persistence layer, pre-populating 20 days of historical employee attendance, leave request workflows, and salary configurations for instant evaluation.

### 🏷️ GitHub Topics
`hrms`, `hr-management`, `tanstack-start`, `react`, `tailwind-css`, `server-functions`, `vite`, `mock-database`, `employee-portal`, `attendance-tracking`, `payroll-management`

---

## 🌟 Key Use Cases

1. **Roster & Attendance Management**: Allows employees to punch in and punch out (with state transition animations). Calculates durations, half-days, and overtime dynamically based on configured employee schedules.
2. **Time Off & Leave Approvals**: Supports leave balances tracking, sick leave attachments requirements, calendar views, overlap checking, and direct manager reviews (approving or adding rejection remarks).
3. **Statutory Salary Structuring**: Engine for calculating monthly base salary, allowances, employer/employee PF rates, and professional tax. Proposes transparent auditing breakdowns for Admins.
4. **Flexible Demo Environments**: Autofill shortcuts to switch between **Admin User**, **John Doe (Employee)**, **John (Employee)**, and **Admin** profiles with a single click.

---

## 🚀 How to Run Locally

### Prerequisites
Ensure you have **Node.js (v18+)** installed.

### Setup and Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ABDULMUNAFZ/Dayflow---Human-Resource-Management-System.git
   cd Dayflow---Human-Resource-Management-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

The application will run locally at **`http://localhost:3000`**.

### Building for Production
To build a production bundle locally:
```bash
npm run build
```
