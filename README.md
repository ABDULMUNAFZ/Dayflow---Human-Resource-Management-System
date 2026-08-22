# Dayflow HR Suite

DAYFLOW — PREMIUM HUMAN RESOURCE MANAGEMENT SYSTEM

Build Brief + UI/UX + Engineering Specification

You are acting as a Senior Product Engineer, UI/UX Designer, Frontend Architect, Motion Designer, and Full-Stack Engineer.

Your job is to build Dayflow — Human Resource Management System, a production-quality HR platform based on the functional requirements below and the attached visual references.

Do NOT create a basic CRUD dashboard.

Build a premium, modern, highly interactive SaaS product that looks like a serious startup product / award-winning web application while remaining extremely usable for HR teams and employees.

1. CORE PRODUCT

Product Name

Dayflow

Tagline

Every workday, perfectly aligned.

Dayflow is a modern HR management platform that digitizes and streamlines:

Employee onboarding

Employee profile management

Attendance

Check-in / check-out

Leave and time-off

HR approvals

Payroll visibility

Salary information

Notifications

HR analytics

Reports

Employee management

The functional requirements in the supplied Dayflow HRMS specification are the source of truth for functionality.

Do not remove required functionality.

Do not turn required functionality into static mockups.

Everything should be implemented as a real working feature wherever the existing project architecture allows it.

2. IMPORTANT — VISUAL REFERENCES

The attached reference images are DESIGN REFERENCES ONLY.

Study them carefully before implementing the UI.

DO NOT COPY:

Text

Headlines

Logos

Brand names

Product names

People

Specific illustrations

Exact marketing content

Any unrelated information shown inside the references

The words inside the reference images are irrelevant.

Use ONLY their:

Visual hierarchy

Composition

Grid systems

Card layouts

Spacing

Typography scale

Dark/light contrast

Accent-color strategy

Rounded containers

Image treatment

Editorial layout

Motion feeling

Interactive elements

Background treatment

Navigation concepts

Data presentation style

3. VISUAL DIRECTION

The final Dayflow interface should combine the visual characteristics of the supplied references into one coherent design system.

Overall aesthetic

Think:

Premium SaaS + editorial design + futuristic productivity platform + modern HR dashboard

Not:

Generic Bootstrap dashboard

Typical admin template

Plain Tailwind dashboard

Overly corporate enterprise software

Excessively glassy UI

AI-generated-looking interface

The product should feel intentionally designed.

4. COLOR SYSTEM

Create a sophisticated dark visual system.

Primary background

Near-black / charcoal.

Example direction:

#0A0A0A

#0D0D0D

#111111

Do not make every surface the exact same black.

Use multiple levels:

page background

elevated surface

card surface

nested card

modal surface

hover surface

Accent

Use a strong warm orange / vermillion / coral accent inspired by the references.

Use it for:

Primary CTAs

Important statistics

Active states

Attendance status

Approval actions

Progress

Highlights

Important UI moments

Motion accents

Do not flood the entire interface with orange.

Use it strategically.

Supporting colors

Use restrained:

off-white

soft gray

muted gray

pale warm gray

subtle orange gradients

Statuses can use semantic colors:

Green → approved / present

Orange → pending / half-day

Red → rejected / absent

Blue or violet → informational

Keep them sophisticated rather than overly saturated.

5. TYPOGRAPHY

Typography is extremely important.

Use a premium modern font system.

Prefer combinations such as:

Inter

Geist

Manrope

Plus Jakarta Sans

DM Sans

Use a strong display font treatment for major page headings while maintaining excellent readability for dashboard content.

Create a clear hierarchy:

Massive hero/display typography

Large page heading

Section heading

Card heading

Body

Metadata

Labels

Numbers

Use typography as a major visual element.

Large statistics should feel editorial.

Example:

184

ACTIVE EMPLOYEES

rather than a generic small KPI card.

6. GRID + LAYOUT SYSTEM

The references heavily use modular grids.

Build Dayflow using a strong responsive grid.

Desktop:

12-column layout

large gutters

generous whitespace

asymmetric compositions where appropriate

Tablet:

8-column layout

Mobile:

4-column layout

Use CSS Grid extensively.

Avoid stacking everything into identical cards.

Mix:

wide cards

compact cards

split cards

horizontal cards

large visual blocks

tables

timeline sections

charts

metric blocks

The dashboard should feel composed rather than generated.

7. BACKGROUND DESIGN

Use subtle animated backgrounds.

The background should NEVER distract from the application.

Possible techniques:

radial gradients

moving gradient blobs

subtle grid lines

noise texture

animated glow

very subtle dot matrix

soft spotlight following cursor

animated border gradients

slow orbital elements

Use animation sparingly.

The application must still feel professional.

Do not create a gaming website.

8. REACT BITS / MOTION

Use React Bits-style components and motion concepts where they genuinely improve the experience.

Use:

animated text

split text

blur reveal

fade-up

magnetic buttons

animated counters

spotlight effects

hover cards

animated gradients

scroll reveal

shimmer

subtle parallax

cursor interaction

animated tabs

smooth page transitions

Use Framer Motion / Motion where appropriate.

Do NOT animate everything.

Motion should communicate:

hierarchy

state

feedback

navigation

progress

interaction

Respect:

prefers-reduced-motion.

9. LANDING / ENTRY EXPERIENCE

Create a premium Dayflow entry experience.

Hero:

DAYFLOW

Every workday, perfectly aligned.

Supporting text explaining that Dayflow brings attendance, leave, payroll, employee profiles and HR workflows into one unified workspace.

Include:

primary CTA

secondary CTA

animated statistics

subtle background animation

product preview

floating dashboard cards

smooth reveal animations

Example visual stats:

Active Employees

Attendance Today

Pending Requests

Leave Balance

These should be dynamically generated from application data rather than hardcoded marketing-only elements once the application is connected.

10. APPLICATION SHELL

After authentication, create a premium application shell.

Desktop:

Left sidebar / navigation rail.

Main content area.

Optional contextual right-side panel where useful.

Navigation should include:

Employee

Overview

My Profile

Attendance

Leave

Payroll

Documents

Notifications

Admin / HR

Overview

Employees

Attendance

Leave Requests

Payroll

Reports

Analytics

Notifications

Settings

Sidebar should support:

active state

icons

tooltips

collapse

keyboard navigation

responsive behavior

Use elegant animated transitions.

11. EMPLOYEE DASHBOARD

Create a beautiful employee dashboard.

Top section:

Good morning, [Employee Name]

Show:

current date

current working status

check-in status

working duration

Primary attendance widget:

Today's Attendance

Display:

Check In

Current duration

Check Out

status

timeline

Make check-in/check-out a major interaction.

Example:

08:57 AM

WORKING

04h 32m

Button:

Check Out

When checked out:

Show completed state.

12. EMPLOYEE DASHBOARD GRID

Use a modular grid.

Cards / sections:

Attendance

Today's attendance.

Leave Balance

Show:

Paid Leave

Sick Leave

Unpaid Leave

Recent Requests

Show latest leave requests.

Payroll Snapshot

Show salary information / latest payroll information.

Recent Activity

Timeline of:

check-in

leave submitted

leave approved

profile updated

payroll update

Quick Actions

Apply Leave

View Attendance

View Payroll

Edit Profile

Do not make every card visually identical.

13. ADMIN / HR DASHBOARD

The admin dashboard should feel significantly more powerful.

Header:

Good morning, HR

Show organizational overview.

Important metrics:

Total Employees

Present Today

Absent Today

On Leave

Pending Requests

Payroll Total

Attendance Rate

Use large editorial KPI blocks.

14. ADMIN EMPLOYEE MANAGEMENT

Create a powerful employee management interface.

Features:

Search

Filter

Sort

Department filter

Employment status

Attendance status

Role

Pagination

Employee selection

Bulk actions

Employee table should be modern.

Columns:

Employee

Employee ID

Department

Role

Attendance

Leave

Status

Actions

Rows should have:

avatar

name

role

status badge

hover interaction

contextual actions

Clicking an employee should open a detailed employee workspace / profile drawer or page.

15. EMPLOYEE PROFILE

Create a premium employee profile page.

Hero section:

Profile image

Full name

Employee ID

Job title

Department

Joining date

Employment status

Sections:

Personal Information

Full name

Email

Phone

Address

Job Information

Employee ID

Role

Department

Manager

Joining date

Salary Structure

Display salary information elegantly.

Documents

Display:

Offer Letter

ID documents

Certificates

Other HR documents

Activity

Timeline of important employee events.

Employees can edit only permitted fields.

Admin / HR can edit all employee information.

16. ATTENDANCE SYSTEM

Attendance is a major product feature.

Create both:

Employee attendance

and

Admin attendance management.

Employee view:

Daily

Weekly

Monthly

Calendar / timeline visualization.

Statuses:

Present

Absent

Half-day

Leave

Use strong visual status indicators.

Admin view:

All employees

Date selector

Department

Search

Status filters

Create attendance analytics:

Attendance rate

Present count

Absent count

Late count

Leave count

Charts should be interactive.

17. ATTENDANCE VISUALIZATION

Do not use generic charts without design.

Use:

attendance heatmap

weekly bar chart

monthly trend

status distribution

employee comparison

Use tooltips.

Animations should be subtle.

Charts must be responsive.

18. LEAVE MANAGEMENT

Employee:

Apply for Leave

Fields:

Leave Type

Start Date

End Date

Remarks

Leave types:

Paid

Sick

Unpaid

Status:

Pending

Approved

Rejected

After submission:

Show animated confirmation.

19. ADMIN LEAVE APPROVAL

Create an approval center.

Show:

employee

leave type

date range

duration

reason

submitted date

status

Actions:

Approve

Reject

Add Comment

Changes should immediately update the employee record.

Use optimistic UI where appropriate.

Include:

filtering

sorting

search

status tabs

Example tabs:

All

Pending

Approved

Rejected

20. PAYROLL

Employee payroll is read-only.

Create a beautiful salary overview.

Show:

Base Salary

Allowances

Deductions

Net Salary

Pay Date

Salary History

Use a clean salary breakdown visualization.

Admin:

View all employees

Update salary structure

Salary history

Payroll status

Payroll analytics

Do not expose sensitive payroll information to unauthorized roles.

21. SALARY SLIPS

Create a professional salary slip interface.

Users should be able to:

view

preview

download

salary slips.

Use a polished document-like design.

22. ANALYTICS

Create an analytics dashboard.

Sections:

Workforce

Total employees

Active employees

New hires

Attrition if data exists

Attendance

Attendance rate

Absence rate

Leave rate

Trends

Leave

Leave utilization

Leave types

Pending requests

Payroll

Total payroll

Salary distribution

Payroll trends

Only show metrics that can actually be derived from the application's data.

Do not invent fake analytics and present them as real.

For demo/development mode, clearly identify seeded/demo data.

23. REPORTS

Create reports for:

Attendance

Leave

Payroll

Employee information

Allow:

filtering

date ranges

preview

export

Preferred export formats:

PDF

CSV

If implementation is possible in the existing stack, make the exports actually functional.

24. NOTIFICATIONS

Create a proper notification center.

Notification examples:

Leave approved

Leave rejected

Leave pending

Attendance reminder

Payroll updated

Profile updated

Include:

unread count

read/unread state

timestamps

notification grouping

Use toast notifications for immediate actions.

25. AUTHENTICATION

Implement real authentication.

Sign Up:

Employee ID

Email

Password

Role

Roles:

Employee

HR

Admin

Password validation.

Email verification.

Sign In:

Email

Password

Incorrect credentials:

Show useful error states.

Successful authentication:

Redirect to appropriate dashboard.

Protect routes.

Do not rely only on frontend role checks.

Authorization must be enforced at the backend/data layer.

26. ROLE-BASED ACCESS CONTROL

Implement strict RBAC.

Employee

Can:

View own profile

Edit permitted personal fields

View own attendance

Check in/out

Apply leave

View leave status

View own payroll

View own documents

View notifications

Cannot:

View other employees

Modify other employees

Approve leave

Modify payroll

HR

Can:

View employees

Manage employee information

View attendance

Approve/reject leave

View payroll

Manage HR workflows

View reports

View analytics

Admin

Full management access.

27. DATABASE / DATA MODEL

Create a proper relational data model.

At minimum consider:

users

employees

employee_profiles

departments

attendance

leave_requests

leave_types

payroll

salary_history

documents

notifications

audit_logs

Create proper relationships.

Use IDs, timestamps, status fields, and appropriate indexes.

Do not store everything in one giant user table.

28. AUDIT LOGGING

For important HR actions create audit records.

Examples:

Employee created

Employee updated

Salary updated

Leave approved

Leave rejected

Attendance modified

Show relevant activity to authorized HR/Admin users.

29. DATA INTEGRITY

Important:

Do not allow:

duplicate employee IDs

invalid leave dates

unauthorized payroll access

employees modifying their own salary

employees approving their own leave

invalid attendance states

unauthorized profile access

Validate on both client and server.

30. UX DETAILS

Every interaction needs proper states.

Implement:

Loading

skeleton screens

contextual loaders

Empty states

Examples:

"No leave requests yet."

"No attendance records for this period."

"No employees found."

Error states

Useful human-readable messages.

Success

Animated success feedback.

Confirmation

Use confirmation dialogs for destructive or sensitive actions.

Disabled

Buttons must communicate why they are disabled where appropriate.

31. MICRO-INTERACTIONS

Add high-quality micro-interactions:

Button hover

Card hover

Navigation transitions

Tab transitions

Modal transitions

Dropdown animation

Tooltip animation

Table row hover

Avatar interactions

Number counters

Progress animation

Status transitions

Keep everything fast and subtle.

32. PAGE TRANSITIONS

Use smooth transitions between major application sections.

Do not make transitions slow.

Target approximately:

150–400ms for normal UI transitions.

Respect reduced motion preferences.

33. RESPONSIVE DESIGN

The entire application must work on:

Desktop

Laptop

Tablet

Mobile

Mobile is NOT simply desktop stacked vertically.

Design dedicated mobile experiences.

Mobile navigation:

bottom navigation or compact drawer

floating action buttons where appropriate

responsive tables

horizontally scrollable data where necessary

mobile-friendly forms

34. ACCESSIBILITY

Implement proper:

semantic HTML

ARIA labels

keyboard navigation

focus states

screen reader support

sufficient contrast

reduced motion

accessible forms

accessible dialogs

accessible tables

Never sacrifice accessibility for visual design.

35. ICONOGRAPHY

Use a consistent icon ecosystem.

Prefer:

Lucide

Radix icons

another coherent modern icon library

Do not mix random icon styles.

Icons should support the interface rather than dominate it.

36. IMAGES / VISUAL ASSETS

Use images only where they improve the product.

Possible places:

onboarding

empty states

employee avatars

documents

subtle dashboard visual sections

Do not turn the HRMS into an image-heavy marketing website.

For avatars/demo content, use appropriate placeholders or generated initials.

Do not use copyrighted assets without appropriate licensing.

37. COMPONENT ARCHITECTURE

Create reusable components.

Examples:

components/
  ui/
  layout/
  navigation/
  dashboard/
  employees/
  attendance/
  leave/
  payroll/
  analytics/
  notifications/
  reports/
  profile/
  charts/
  forms/


Build reusable:

Button

Card

Badge

Modal

Drawer

DataTable

DatePicker

Tabs

Dropdown

Tooltip

Avatar

EmptyState

Skeleton

Toast

StatCard

ChartCard

Do not duplicate UI code.

38. TECH STACK

Before making architecture changes:

Inspect the existing repository first.

Identify:

framework

package manager

frontend

backend

database

authentication

styling system

existing components

existing routes

environment variables

current API architecture

Then choose the best implementation compatible with the existing project.

Preferred ecosystem if architecture is not already established:

Frontend

React

TypeScript

Vite or Next.js depending on existing project

Tailwind CSS

shadcn/ui

Radix UI

Lucide Icons

Motion / Framer Motion

React Bits-inspired motion components

Data

TanStack Query

TanStack Table

Zod

Forms

React Hook Form

Zod validation

Charts

Recharts or another mature charting library

Backend

Use the existing backend if present.

If no backend exists, choose a clean production-ready architecture appropriate to the repository.

39. DO NOT REBUILD THE PROJECT BLINDLY

First inspect the repository.

Run appropriate commands to understand:

file structure

package.json

existing routes

components

database

API

authentication

environment configuration

Then create a plan.

Do not overwrite functioning functionality unnecessarily.

Do not replace working architecture just because you prefer another stack.

Preserve existing working features.

40. REAL FUNCTIONALITY OVER MOCKUPS

This is extremely important.

Do NOT build:

fake buttons

fake charts

fake navigation

fake forms

fake authentication

fake approval workflows

fake check-in buttons

If a button exists, it should perform the expected action.

If a form exists, validate it.

If data is stored, persist it.

If the UI displays data, load it from the actual data source.

If backend functionality is missing, implement it.

If something genuinely cannot be implemented because infrastructure/configuration is missing, clearly isolate it and document what configuration is required.

41. DEMO DATA

Create realistic seed/demo data for development.

Include:

multiple employees

multiple departments

different roles

attendance history

leave requests

payroll records

notifications

Do not use obviously fake-looking names everywhere.

Create realistic but clearly fictional demo data.

42. SECURITY

Treat this as an HR application.

Protect:

employee information

salary information

documents

authentication

authorization

Never expose sensitive information through unauthorized API responses.

Never trust role information coming only from the frontend.

Validate permissions server-side.

Avoid leaking secrets to client-side code.

Do not hardcode API keys.

Use environment variables.

43. PERFORMANCE

The UI should feel extremely fast.

Optimize:

unnecessary renders

large tables

charts

images

animations

API calls

Use:

lazy loading

pagination

memoization where useful

caching

debounced search

Do not prematurely optimize everything.

Measure actual bottlenecks.

44. DESIGN SYSTEM

Create a central design token system.

Define:

colors

spacing

radius

typography

shadows

borders

animation timing

breakpoints

Example direction:

Background:
near-black

Surface:
dark charcoal

Accent:
warm orange / vermillion

Text:
off-white

Muted:
gray

Border:
subtle white/gray opacity

Radius:
medium to large

Shadow:
soft and restrained


Do not scatter arbitrary values throughout the codebase.

45. IMPORTANT VISUAL RULE

The attached reference designs have a strong identity built from:

black backgrounds

bright orange accents

oversized typography

rounded rectangular panels

modular cards

thin borders

large spacing

asymmetric grids

image + information compositions

editorial layouts

subtle gradients

high contrast

minimal but expressive UI

Translate these principles into Dayflow's HR context.

For example:

Instead of copying an image-based marketing card, create:

Attendance Intelligence

94.8%

with a beautiful attendance visualization.

Instead of copying a product showcase card, create:

Today's Workforce

with a dynamic employee status visualization.

Instead of copying unrelated reference content, reinterpret the layout around:

Employees

Attendance

Leave

Payroll

HR analytics

46. DASHBOARD VISUAL LANGUAGE

Avoid this:

[ Total Employees ]
[ Present ]
[ Absent ]
[ Leave ]


as four identical cards.

Instead create a composition such as:

┌───────────────────────────────┬───────────────┐
│                               │               │
│        WORKFORCE              │  TODAY        │
│        184                    │  168 PRESENT  │
│                               │               │
│        attendance trend       │  91.3%        │
│                               │               │
├───────────────────┬───────────┴───────────────┤
│ ATTENDANCE        │ LEAVE REQUESTS             │
│                   │                            │
│ visualization     │ pending / approved        │
│                   │                            │
└───────────────────┴────────────────────────────┘


Think in compositions.

47. EMPTY STATES

Design beautiful empty states.

Example:

No Leave Requests

Nothing pending.

Your leave requests will appear here once submitted.

[Apply for leave]

Do not show a blank table.

48. SEARCH

Global search would be a valuable premium feature.

Implement a command-palette style search if appropriate.

Example:

⌘ K

Search:

Employees

Attendance

Leave

Payroll

Reports

Use keyboard navigation.

49. COMMAND PALETTE

Create a polished command palette.

Possible commands:

Go to Dashboard

Go to Employees

Apply Leave

View Attendance

View Payroll

Search Employee

Open Notifications

Open Settings

Logout

This should feel like a modern SaaS application.

50. DARK MODE

The primary experience should follow the supplied dark visual direction.

If the project already has a theme system, implement a polished light mode as an optional theme rather than breaking the existing system.

Both themes must preserve the Dayflow design language.

51. SETTINGS

Create settings for:

Profile

Account

Notifications

Appearance

Security

Admin settings may include:

Organization

Departments

Leave Types

Payroll configuration

Employee policies

Only implement settings that are meaningful to the existing architecture.

52. FINAL QUALITY BAR

Before declaring completion, verify:

UI

No generic dashboard appearance

No inconsistent spacing

No random colors

No inconsistent iconography

No broken responsive layouts

No placeholder-looking sections

UX

Every major action has feedback

Loading states exist

Empty states exist

Errors are handled

Forms validate

Navigation works

Mobile works

Functionality

Authentication works

RBAC works

Employee management works

Attendance works

Leave workflow works

Payroll visibility works

Notifications work

Analytics work from actual data

Reports work where implemented

Code

TypeScript types are clean

Components are reusable

No unnecessary duplication

No dead code

No obvious console errors

No broken imports

No hardcoded secrets

53. DEVELOPMENT WORKFLOW

Follow this process.

STEP 1 — INSPECT

Inspect the complete repository.

Understand the existing architecture before changing anything.

STEP 2 — PLAN

Create an implementation plan covering:

UI

routes

components

data model

APIs

authentication

authorization

state management

animations

responsive design

STEP 3 — DESIGN SYSTEM

Implement the Dayflow design tokens and reusable UI foundation first.

STEP 4 — APPLICATION SHELL

Build:

sidebar

top navigation

command palette

notifications

responsive shell

STEP 5 — AUTH

Implement authentication and protected routes.

STEP 6 — CORE MODULES

Implement:

Dashboard

Employees

Profiles

Attendance

Leave

Payroll

Analytics

Reports

Notifications

Settings

STEP 7 — MOTION

Add React Bits / Motion-style animations after core functionality is stable.

Do not use animations to hide incomplete functionality.

STEP 8 — RESPONSIVENESS

Test desktop, tablet and mobile.

STEP 9 — QA

Run:

build

lint

type checking

tests if configured

Fix all errors.

STEP 10 — POLISH

Perform a final visual audit.

Check:

spacing

typography

contrast

alignment

animation

responsiveness

interaction states

accessibility

54. IMPORTANT IMPLEMENTATION RULES

Do not stop after creating the UI.

Do not say:

"Backend can be added later."

Do not create a prototype when a working application is expected.

Do not use static fake data for features that should be backed by the database.

Do not make every page look identical.

Do not copy the reference images.

Do not copy text from the reference images.

Do not sacrifice usability for visual effects.

Do not use excessive blur/glassmorphism.

Do not over-animate.

Do not introduce unnecessary dependencies.

Do not rewrite working project architecture without a strong reason.

55. SUCCESS CRITERIA

The finished Dayflow application should feel like a product that could realistically be launched as a modern HR SaaS.

When someone opens it, the reaction should be:

"This looks like a premium modern SaaS product."

not:

"This looks like a student admin dashboard."

The reference images are the inspiration for the visual quality.

The Dayflow HRMS specification is the source of truth for the product functionality.

Build the application accordingly.

FINAL INSTRUCTION

Start by inspecting the repository and existing implementation.

Then determine the current architecture.

Then implement Dayflow incrementally.

Do not merely explain what should be built.

Actually build it.

After implementation, run the project, inspect the rendered UI, fix visual issues, fix functional issues, and continue iterating until the result is polished, responsive, accessible, and production-quality.

Prioritize:

FUNCTIONALITY → UX → DESIGN SYSTEM → MOTION → POLISH

while maintaining the premium visual language of the supplied references.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
