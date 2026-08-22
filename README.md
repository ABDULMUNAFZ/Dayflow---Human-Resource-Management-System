# Dayflow - Human Resource Management System (HRMS)

Dayflow is a modern, high-performance Human Resource Management System (HRMS) built on TanStack Start, TailwindCSS, and React. It features a fully database-free local persistence layer, pre-populating 20 days of detailed employee attendance history, leave request workflows, and payroll structures for instant evaluation.

## 🌟 Key Features

- **No Remote Database Requirement**: Authenticates and processes all requests server-side using a locally persisted JSON file database (`mock_db.json`).
- **HR/Admin Employee Creation**: Admins and HR specialists can create new employee accounts directly. Self-registration is disabled for secure control.
- **Dynamic 20-Day Dummy History**: Pre-generates 20 workdays of attendance logs, check-ins/check-outs, leave workflows, and salary records relative to the run date.
- **On-the-Fly User Creation**: Enter any email address to automatically register a mock profile with HR, Admin, or Employee permissions.
- **Interactive Check-In / Check-Out**: Real-time attendance logging directly reflected in the employee dashboard calendar.

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Node.js (v18+) installed.

### Setup and Start

1. Clone this repository:
   ```bash
   git clone https://github.com/ABDULMUNAFZ/Dayflow---Human-Resource-Management-System.git
   cd Dayflow---Human-Resource-Management-System
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

The application will run locally at `http://localhost:3000`.

### Building for Production
To test the build locally before deployment:
```bash
npm run build
```

---

## 🛠️ How It Works (Architecture)

### 📦 Local Persistence & Mocking
The codebase is fully bypassed from standard Supabase calls and routes operations through [`src/lib/mock-db.ts`](src/lib/mock-db.ts). It reads/writes a local `mock_db.json` database.
- **Dynamic Seeding**: If `mock_db.json` is missing or empty, it automatically populates:
  - 20 days of historical attendance logs for default test profiles.
  - Active & historical leave request objects.
  - Current & past payroll items.

### 🔐 Authentication Flow
- Any email entered in the Login screen is authenticated.
- If it contains `admin` or `hr`, it automatically assigns the corresponding administrative role. Otherwise, it defaults to a standard employee profile.
- Direct click shortcut buttons are provided for instant access to the **Admin User** and **John Doe** profiles.

### ⚡ Deployment on Vercel
Deployment configuration is optimized for TanStack Start SSR deployment utilizing a custom Vite `nitro` plugin configuration and Vercel routing rules:
- **Build preset**: `preset: "vercel"`
- **Output directory**: `.vercel/output`
