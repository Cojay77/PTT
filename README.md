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

## Create a New Project

PTT is designed as a **reusable project template**. Each project has its own independent workspace:

```text
/projects/
    Project-Alpha/
        ptt/          <-- Application instance for Project Alpha
    Project-Beta/
        ptt/          <-- Application instance for Project Beta
```

To create a new project:

1. Duplicate or copy the `PTT` directory to your new project folder (e.g., `projects/Project-Beta/`).
2. Run `npm install` (or share the `node_modules` cache).
3. Start the application with `npm run dev`.
4. Navigate to **Settings** (`/settings`):
   - In the **Danger Zone**, click **Reset All Data** to clear the demo data and start with a clean slate.
5. Go to **Project Overview** (`/overview`) and enter your project's name, code, sponsor, objectives, and parameters.

---

## Backup

All application data is managed locally in an in-browser SQLite database and persisted automatically to your browser's local storage after every write.

To create backups:

1. **SQLite Database Backup (`.db` file)**:
   - Navigate to **Settings** (`/settings`).
   - Under **Database Backup & Restore**, click **Export Backup (.db)**.
   - This downloads a standard, portable SQLite binary database file (`project-backup-YYYY-MM-DD.db`).
2. **Full JSON Export**:
   - Under **Data Export & Portability**, click **Export All (JSON)**.
   - This exports all entities (tasks, milestones, risks, issues, decisions, actions, communications, stakeholders, resources) into a structured JSON file.
3. **CSV Export**:
   - Click **Export Tasks (CSV)** or **Export RAID Log (CSV)** for spreadsheet compatibility (Excel / Google Sheets).

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
