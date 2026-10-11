# Project Tracking Tool (PTT) — Local-First Project Pilot Workspace

A fast, lightweight, and completely private **project management and pilot control center** designed specifically for IT Project Managers, Project Leads, and Project Pilots.

PTT acts as the **single source of truth** for piloting a complex IT project, providing complete situational awareness without the friction, account requirements, cloud dependencies, or latency of enterprise SaaS tools.

---

## Features Overview

- **Command Center Dashboard**: Real-time KPI metrics, urgent attention items, workload counters, milestone status, and audit activity stream.
- **Task Management**: Tabular and Kanban board views with filters by status, priority, owner, and search.
- **Backlog Grooming**: Dedicated backlog priority rank, business & technical value assessment, and one-click promotion to active tasks.
- **Planning & Milestones**: Roadmap timeline, target date tracking, milestone completion percentages, and status badges.
- **RAID Register**: Consolidated view and dedicated logs for **Risks**, **Actions**, **Issues & Blockers**, and **Decisions**.
- **Communications Tracker**: Track outbound and inbound communications, pending responses, overdue replies, and next follow-up dates.
- **People & Team Availability**: Stakeholder directory, resource allocations, and interactive presence/absence team calendar.
- **Meeting Notes & Action Items**: Structured minutes, agenda items, decisions recorded, and linked action follow-ups.
- **Project Notebook**: Markdown notes with pinning and entity associations.
- **Executive Presentation Mode (Section 21)**: Simplified, presentation-ready stakeholder view with selectable sections and one-click Markdown brief export.
- **Weekly Review & Handover**: One-click generation of weekly project reports and comprehensive project handover documentation.
- **Global Search & Quick Capture (Ctrl+K)**: Instant capture of tasks, risks, notes, and issues from anywhere in the app.

---

## Installation

Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher) installed on your system.

Clone or copy this repository into your desired workspace directory, open a terminal, and run:

```bash
npm install
```

---

## Start

To start the application locally with hot module replacement (HMR):

```bash
npm run dev
```

Then open your browser and navigate to:
```
http://localhost:5173/
```

On first launch, PTT automatically initializes the local SQLite database schema and seeds a realistic sample IT project scenario (*"Customer Portal Migration"*).

---

## Production / Local Usage

To create an optimized, standalone production build:

```bash
npm run build
```

You can preview or run the production bundle locally with:

```bash
npm run preview
```

Because PTT runs entirely client-side using WebAssembly-compiled SQLite (`sql.js`), it does not require any background database servers (e.g. PostgreSQL, MySQL) or internet connectivity. All data remains strictly on your local machine.

---

## Vercel & Web Deployment (Company Computers / No .exe)

PTT is designed to run completely inside your browser as a **static WebAssembly Single Page Application**. You do **not** need an `.exe` file or a Google Drive synced folder to manage multiple projects.

### Deploy to Vercel:
1. Push this repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com), click **Add New...** > **Project** and select your repository.
3. Vercel automatically detects **Vite**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

Once deployed, your private URL (e.g. `https://my-ptt.vercel.app`) works on any computer, including locked-down enterprise laptops without admin privileges or `.exe` execution rights.

---

## Multi-Project Workspace

You can now manage **multiple independent projects** directly in the browser without duplicating folders:

1. **Quick Switcher (`Alt+P`)**:
   - Press `Alt+P` (or `Ctrl+Shift+P`) from any screen, or click the project name in the top bar / sidebar.
   - Search by project name, code, or manager, and press `Enter` to switch instantly.
2. **Projects Hub (`/projects`)**:
   - View all your projects with key KPIs (open tasks, overdue items, blockers, critical risks, milestones progress).
   - Create new projects (Blank, Clone active project, or Demo scenario).
   - Edit project names, codes, and custom color tags.
   - Duplicate or delete projects.
3. **Storage & Privacy**:
   - Every project runs in an isolated, high-performance SQLite WASM instance.
   - Automatically persisted to the browser's **IndexedDB** on every edit.
   - Your data stays strictly on your computer and is never sent to any external server or cloud.

---

## Backup & Portability

- **Single Project Export (`.ptt`)**:
  - Export any project as an open SQLite database (`.ptt` / `.db`).
  - Import it back on any other machine or browser.
- **Full Workspace Bundle (`.pttw`)**:
  - In **Projects Hub** or **Settings**, click **Backup All (.pttw)** to export every project in your workspace into a single JSON file.
  - Click **Restore Bundle** to restore all projects at once.
- **CSV & JSON Exports**:
  - Export Tasks, RAID Logs, and Audit Trails to CSV for Excel / Google Sheets compatibility.

---

## Restore

To restore project data from a previously saved backup:

1. Open PTT in your browser.
2. Navigate to **Settings** (`/settings`).
3. Under **Database Backup & Restore**, click **Import Database (.db)**.
4. Select your backup `.db` file.
5. The application instantly loads the database and refreshes all views and stores.

---

## Architecture

PTT is built with a modern, high-performance, local-first stack:

| Component | Technology | Role |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | Strongly typed, modular component architecture |
| **Build & Dev Tool** | Vite 8 + Rolldown | Ultra-fast build and zero-latency HMR |
| **Local Database** | `sql.js` (SQLite WASM) | Full relational SQLite engine running locally in-browser |
| **State Management** | Zustand | Lightweight, decoupled stores per domain (`useTaskStore`, `useDataStore`, `useUIStore`) |
| **Styling & Theming** | Vanilla CSS Tokens | Curated design system with dark/light mode and zero CSS-in-JS overhead |
| **Charts & Analytics** | Recharts | Composable, responsive radar charts, pie charts, and workload bars |
| **Date Calculations** | date-fns | Functional date math for milestone deadlines and absence tracking |
| **Portability & Export** | FileSaver.js | Client-side export to SQLite `.db`, JSON, CSV, and Markdown |

### Database Schema

The database includes full relational tables with indexes and foreign keys:
- `project_config`: Core metadata, sponsor, manager, phase, status, and context.
- `tasks`: Full task entity with workload tracking (estimated, actual, remaining), dependencies, and backlog rank.
- `milestones`: Delivery target dates, owners, and progress percentage.
- `risks`: Risk register with probability/impact matrix, mitigation, and contingency plans.
- `issues`: Issue tracker with severity, detection date, impact, and resolution targets.
- `decisions`: Decision register tracking context, alternatives, and status lifecycle.
- `actions`: Lightweight action log with owners, due dates, and linked sources.
- `communications`: Communication log with sent/requested data, expected response dates, and follow-ups.
- `stakeholders`: Directory with influence, involvement, and communication preferences.
- `resources` & `absences`: Team allocation, planned workloads, and vacation/RTT calendar tracking.
- `meetings`: Agendas, notes, and identified blockers/risks.
- `notes`: Markdown notebook with pinning and entity linking.
- `activity_log`: Automatic audit trail of changes made across the project.
