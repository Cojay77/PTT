// ============================================================
// PTT Core Types
// ============================================================

export type ID = string;

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type TaskStatus = 'backlog' | 'planned' | 'ready' | 'in-progress' | 'blocked' | 'waiting' | 'done' | 'cancelled';
export type RiskStatus = 'identified' | 'analysed' | 'mitigated' | 'accepted' | 'closed';
export type IssueStatus = 'open' | 'in-progress' | 'resolved' | 'escalated' | 'closed';
export type DecisionStatus = 'proposed' | 'under-discussion' | 'decision-required' | 'approved' | 'rejected' | 'superseded';
export type MilestoneStatus = 'planned' | 'in-progress' | 'completed' | 'delayed' | 'at-risk' | 'cancelled';
export type CommunicationStatus = 'sent' | 'received' | 'awaiting-response' | 'response-received' | 'follow-up-needed' | 'closed';
export type ActionStatus = 'open' | 'in-progress' | 'done' | 'cancelled';
export type ProjectStatus = 'on-track' | 'at-risk' | 'off-track' | 'on-hold' | 'completed';
export type AlertLevel = 'critical' | 'warning' | 'info' | 'success';
export type BacklogStatus = 'new' | 'refined' | 'promoted' | 'rejected';
export type Probability = 1 | 2 | 3 | 4 | 5;
export type Impact = 1 | 2 | 3 | 4 | 5;
export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type BudgetItemType = 'capex' | 'opex' | 'resource' | 'infrastructure' | 'license' | 'consulting' | 'other';
export type BudgetItemStatus = 'planned' | 'committed' | 'invoiced' | 'paid' | 'cancelled';
export type ChangeRequestStatus = 'draft' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'withdrawn' | 'implemented';
export type ChangeRequestCategory = 'scope' | 'schedule' | 'budget' | 'resources' | 'technical' | 'quality' | 'other';
export type ChangeRequestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ProjectConfig {
  id: ID;
  name: string;
  code: string;
  description: string;
  objectives: string;
  businessContext: string;
  scope: string;
  outOfScope: string;
  owner: string;
  manager: string;
  sponsor: string;
  startDate: string;
  targetDate: string;
  currentPhase: string;
  status: ProjectStatus;
  statusNote: string;
  budget: string;
  methodology: string;
  technologies: string;
  importantLinks: string;
  documentationLocations: string;
  environments: string;
  suppliers: string;
  team: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  owner: string;
  contributors: string;
  createdAt: string;
  startDate: string;
  dueDate: string;
  estimatedWorkload: number;
  remainingWorkload: number;
  actualWorkload: number;
  category: string;
  tags: string;
  phase: string;
  milestoneId: ID | null;
  dependencies: string;
  blockingReason: string;
  notes: string;
  references: string;
  updatedAt: string;
  isBacklog: boolean;
  backlogPriority: number;
  effort: string;
  businessValue: string;
  technicalValue: string;
}

export interface Milestone {
  id: ID;
  name: string;
  description: string;
  targetDate: string;
  status: MilestoneStatus;
  progress: number;
  owner: string;
  dependencies: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Communication {
  id: ID;
  subject: string;
  type: string;
  sender: string;
  recipients: string;
  date: string;
  channel: string;
  summary: string;
  informationSent: string;
  informationRequested: string;
  expectedResponse: string;
  expectedResponseDate: string;
  actualResponse: string;
  responseDate: string;
  status: CommunicationStatus;
  followUpRequired: boolean;
  nextFollowUpDate: string;
  relatedTaskId: ID | null;
  relatedRiskId: ID | null;
  relatedMilestoneId: ID | null;
  references: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stakeholder {
  id: ID;
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
  responsibilities: string;
  influenceLevel: string;
  involvementLevel: string;
  communicationPreferences: string;
  projectTopics: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: ID;
  name: string;
  role: string;
  organization: string;
  email: string;
  allocationPercent: number;
  plannedWorkload: number;
  skills: string;
  projectStartDate: string;
  projectEndDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Absence {
  id: ID;
  resourceId: ID;
  resourceName: string;
  type: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export interface Risk {
  id: ID;
  title: string;
  description: string;
  category: string;
  probability: Probability;
  impact: Impact;
  severity: Severity;
  owner: string;
  mitigationStrategy: string;
  contingencyPlan: string;
  status: RiskStatus;
  targetResolutionDate: string;
  relatedMilestoneId: ID | null;
  relatedTaskIds: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: ID;
  title: string;
  description: string;
  impact: string;
  severity: Severity;
  owner: string;
  detectedDate: string;
  resolutionTarget: string;
  resolutionActions: string;
  status: IssueStatus;
  relatedTaskIds: string;
  relatedCommunicationIds: string;
  escalationStatus: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: ID;
  title: string;
  context: string;
  decisionRequired: string;
  alternativesConsidered: string;
  finalDecision: string;
  owner: string;
  contributors: string;
  decisionDate: string;
  deadline: string;
  impact: string;
  status: DecisionStatus;
  relatedTaskIds: string;
  relatedRiskIds: string;
  relatedMilestoneId: ID | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Action {
  id: ID;
  action: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  source: string;
  relatedMeetingId: ID | null;
  relatedTaskId: ID | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: ID;
  title: string;
  date: string;
  type: string;
  participants: string;
  agenda: string;
  notes: string;
  decisions: string;
  actions: string;
  risksIdentified: string;
  blockersIdentified: string;
  followUps: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: ID;
  title: string;
  content: string;
  category: string;
  tags: string;
  relatedEntityType: string;
  relatedEntityId: ID | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: ID;
  entityType: string;
  entityId: ID;
  entityTitle: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface BudgetItem {
  id: ID;
  category: string;
  description: string;
  type: BudgetItemType;
  vendor: string;
  plannedAmount: number;
  actualAmount: number;
  forecastAmount: number;
  currency: string;
  status: BudgetItemStatus;
  invoiceDate: string;
  paymentDate: string;
  purchaseOrder: string;
  phase: string;
  milestoneId: ID | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeRequest {
  id: ID;
  title: string;
  description: string;
  category: ChangeRequestCategory;
  requestor: string;
  requestDate: string;
  priority: ChangeRequestPriority;
  status: ChangeRequestStatus;
  impactScope: string;
  impactSchedule: string;
  impactBudget: string;
  impactResources: string;
  impactRisk: string;
  estimatedCost: number;
  estimatedDurationDays: number;
  justification: string;
  alternatives: string;
  recommendation: string;
  approver: string;
  approvalDate: string;
  decisionNotes: string;
  linkedMilestoneId: ID | null;
  linkedTaskIds: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReviewSnapshot {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  activeRisks: number;
  criticalRisks: number;
  activeIssues: number;
  criticalIssues?: number;
  pendingDecisions: number;
  upcomingMilestones: number;
  awaitingCommunications: number;
  completedTaskTitles?: string[];
  inProgressTaskTitles?: string[];
  blockedTaskTitles?: string[];
  openIssueTitles?: string[];
  criticalRiskTitles?: string[];
  upcomingMilestoneTitles?: string[];
}

export interface WeeklyReview {
  id: ID;
  weekNumber: number;
  year: number;
  periodStart: string;
  periodEnd: string;
  status: 'draft' | 'completed';
  overallHealth: 'on-track' | 'at-risk' | 'off-track';
  summary: string;
  achievements: string;
  prioritiesNextWeek: string;
  blockersNotes: string;
  snapshotJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  entityType: string;
  entityId: ID | null;
  entityTitle: string;
  link: string;
  createdAt: string;
  isDismissed: boolean;
}

// ============================================================
// UI Types
// ============================================================
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badgeCount?: number;
  badgeLevel?: 'danger' | 'warning' | 'info';
}

export interface FilterState {
  status: string[];
  priority: string[];
  owner: string;
  search: string;
  phase: string;
  tags: string[];
}

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  field: string;
  direction: SortDirection;
}

export type ViewMode = 'table' | 'kanban' | 'timeline' | 'cards';

export type QuickCaptureType = 'task' | 'note' | 'risk' | 'issue' | 'action' | 'decision' | 'communication' | 'meeting';
