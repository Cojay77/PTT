// ============================================================
// Database Schema — SQLite DDL
// ============================================================

export const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Project configuration (single row)
CREATE TABLE IF NOT EXISTS project_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT NOT NULL DEFAULT 'New Project',
  code TEXT DEFAULT '',
  description TEXT DEFAULT '',
  objectives TEXT DEFAULT '',
  business_context TEXT DEFAULT '',
  scope TEXT DEFAULT '',
  out_of_scope TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  manager TEXT DEFAULT '',
  sponsor TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  target_date TEXT DEFAULT '',
  current_phase TEXT DEFAULT '',
  status TEXT DEFAULT 'on-track',
  status_note TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  methodology TEXT DEFAULT '',
  technologies TEXT DEFAULT '',
  important_links TEXT DEFAULT '',
  documentation_locations TEXT DEFAULT '',
  environments TEXT DEFAULT '',
  suppliers TEXT DEFAULT '',
  team TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tasks (also serves as backlog when is_backlog = 1)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  owner TEXT DEFAULT '',
  contributors TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  start_date TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  estimated_workload REAL DEFAULT 0,
  remaining_workload REAL DEFAULT 0,
  actual_workload REAL DEFAULT 0,
  category TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  phase TEXT DEFAULT '',
  milestone_id TEXT DEFAULT NULL,
  dependencies TEXT DEFAULT '',
  blocking_reason TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  ref_links TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  is_backlog INTEGER DEFAULT 0,
  backlog_priority INTEGER DEFAULT 0,
  effort TEXT DEFAULT '',
  business_value TEXT DEFAULT '',
  technical_value TEXT DEFAULT '',
  FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);
CREATE INDEX IF NOT EXISTS idx_tasks_is_backlog ON tasks(is_backlog);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_date TEXT DEFAULT '',
  status TEXT DEFAULT 'planned',
  progress INTEGER DEFAULT 0,
  owner TEXT DEFAULT '',
  dependencies TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);

-- Communications
CREATE TABLE IF NOT EXISTS communications (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  type TEXT DEFAULT 'email',
  sender TEXT DEFAULT '',
  recipients TEXT DEFAULT '',
  date TEXT DEFAULT '',
  channel TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  information_sent TEXT DEFAULT '',
  information_requested TEXT DEFAULT '',
  expected_response TEXT DEFAULT '',
  expected_response_date TEXT DEFAULT '',
  actual_response TEXT DEFAULT '',
  response_date TEXT DEFAULT '',
  status TEXT DEFAULT 'sent',
  follow_up_required INTEGER DEFAULT 0,
  next_follow_up_date TEXT DEFAULT '',
  related_task_id TEXT DEFAULT NULL,
  related_risk_id TEXT DEFAULT NULL,
  related_milestone_id TEXT DEFAULT NULL,
  ref_links TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comm_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_comm_date ON communications(date);
CREATE INDEX IF NOT EXISTS idx_comm_follow_up ON communications(follow_up_required, next_follow_up_date);

-- Stakeholders
CREATE TABLE IF NOT EXISTS stakeholders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  responsibilities TEXT DEFAULT '',
  influence_level TEXT DEFAULT 'medium',
  involvement_level TEXT DEFAULT 'medium',
  communication_preferences TEXT DEFAULT '',
  project_topics TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Resources
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  organization TEXT DEFAULT '',
  email TEXT DEFAULT '',
  allocation_percent INTEGER DEFAULT 100,
  planned_workload REAL DEFAULT 0,
  skills TEXT DEFAULT '',
  project_start_date TEXT DEFAULT '',
  project_end_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Absences / Availability
CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  resource_name TEXT DEFAULT '',
  type TEXT DEFAULT 'vacation',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_absences_resource ON absences(resource_id);

-- Risks
CREATE TABLE IF NOT EXISTS risks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  probability INTEGER DEFAULT 3,
  impact INTEGER DEFAULT 3,
  severity TEXT DEFAULT 'medium',
  owner TEXT DEFAULT '',
  mitigation_strategy TEXT DEFAULT '',
  contingency_plan TEXT DEFAULT '',
  status TEXT DEFAULT 'identified',
  target_resolution_date TEXT DEFAULT '',
  related_milestone_id TEXT DEFAULT NULL,
  related_task_ids TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);

-- Issues / Blockers
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  impact TEXT DEFAULT '',
  severity TEXT DEFAULT 'medium',
  owner TEXT DEFAULT '',
  detected_date TEXT DEFAULT '',
  resolution_target TEXT DEFAULT '',
  resolution_actions TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  related_task_ids TEXT DEFAULT '',
  related_communication_ids TEXT DEFAULT '',
  escalation_status TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);

-- Decisions
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  context TEXT DEFAULT '',
  decision_required TEXT DEFAULT '',
  alternatives_considered TEXT DEFAULT '',
  final_decision TEXT DEFAULT '',
  owner TEXT DEFAULT '',
  contributors TEXT DEFAULT '',
  decision_date TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  impact TEXT DEFAULT '',
  status TEXT DEFAULT 'proposed',
  related_task_ids TEXT DEFAULT '',
  related_risk_ids TEXT DEFAULT '',
  related_milestone_id TEXT DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_deadline ON decisions(deadline);

-- Actions Log
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  owner TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  source TEXT DEFAULT '',
  related_meeting_id TEXT DEFAULT NULL,
  related_task_id TEXT DEFAULT NULL,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_owner ON actions(owner);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT DEFAULT '',
  type TEXT DEFAULT 'project-meeting',
  participants TEXT DEFAULT '',
  agenda TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  decisions TEXT DEFAULT '',
  actions TEXT DEFAULT '',
  risks_identified TEXT DEFAULT '',
  blockers_identified TEXT DEFAULT '',
  follow_ups TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

-- Notes / Notebook
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  tags TEXT DEFAULT '',
  related_entity_type TEXT DEFAULT '',
  related_entity_id TEXT DEFAULT NULL,
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);

-- Activity Log (audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_title TEXT DEFAULT '',
  action TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id);

-- Weekly Reviews
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id TEXT PRIMARY KEY,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  overall_health TEXT DEFAULT 'on-track',
  summary TEXT DEFAULT '',
  achievements TEXT DEFAULT '',
  priorities_next_week TEXT DEFAULT '',
  blockers_notes TEXT DEFAULT '',
  snapshot_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(year DESC, week_number DESC);

-- App settings (key/value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Schema version
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now'))
);
`;

export const SCHEMA_VERSION = 2;
