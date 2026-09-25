import { query, queryOne, execute, generateId } from '../db';
import type { Milestone, Risk, Issue, Decision, Action, Communication, Stakeholder, Resource, Absence, Meeting, Note, ActivityLog, ProjectConfig, WeeklyReview, BudgetItem, ChangeRequest } from '../../types';

// ============================================================
// Milestone queries
// ============================================================
function rowToMilestone(r: Record<string, unknown>): Milestone {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) || '',
    targetDate: (r.target_date as string) || '',
    status: r.status as Milestone['status'],
    progress: (r.progress as number) || 0,
    owner: (r.owner as string) || '',
    dependencies: (r.dependencies as string) || '',
    notes: (r.notes as string) || '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export const milestoneQueries = {
  getAll(): Milestone[] {
    return query<Record<string, unknown>>(`SELECT * FROM milestones ORDER BY target_date ASC`).map(rowToMilestone);
  },
  getById(id: string): Milestone | null {
    const r = queryOne<Record<string, unknown>>(`SELECT * FROM milestones WHERE id = ?`, [id]);
    return r ? rowToMilestone(r) : null;
  },
  getUpcoming(days = 30): Milestone[] {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    return query<Record<string, unknown>>(
      `SELECT * FROM milestones WHERE target_date >= ? AND target_date <= ? AND status != 'completed' ORDER BY target_date ASC`,
      [today, future]
    ).map(rowToMilestone);
  },
  create(m: Partial<Milestone>): Milestone {
    const id = generateId();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO milestones (id, name, description, target_date, status, progress, owner, dependencies, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.name || 'New Milestone', m.description || '', m.targetDate || '', m.status || 'planned', m.progress || 0, m.owner || '', m.dependencies || '', m.notes || '', now, now]
    );
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Milestone>): Milestone | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { name: 'name', description: 'description', targetDate: 'target_date', status: 'status', progress: 'progress', owner: 'owner', dependencies: 'dependencies', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Milestone] as string | number); }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE milestones SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM milestones WHERE id = ?`, [id]); },
};

// ============================================================
// Risk queries
// ============================================================
function rowToRisk(r: Record<string, unknown>): Risk {
  return {
    id: r.id as string, title: r.title as string, description: (r.description as string) || '',
    category: (r.category as string) || '', probability: r.probability as Risk['probability'],
    impact: r.impact as Risk['impact'], severity: r.severity as Risk['severity'],
    owner: (r.owner as string) || '', mitigationStrategy: (r.mitigation_strategy as string) || '',
    contingencyPlan: (r.contingency_plan as string) || '', status: r.status as Risk['status'],
    targetResolutionDate: (r.target_resolution_date as string) || '',
    relatedMilestoneId: (r.related_milestone_id as string) || null,
    relatedTaskIds: (r.related_task_ids as string) || '',
    notes: (r.notes as string) || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const riskQueries = {
  getAll(): Risk[] { return query<Record<string, unknown>>(`SELECT * FROM risks ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`).map(rowToRisk); },
  getById(id: string): Risk | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM risks WHERE id = ?`, [id]); return r ? rowToRisk(r) : null; },
  getOpen(): Risk[] { return query<Record<string, unknown>>(`SELECT * FROM risks WHERE status NOT IN ('closed','mitigated') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`).map(rowToRisk); },
  create(m: Partial<Risk>): Risk {
    const id = generateId(); const now = new Date().toISOString();
    const sev = m.severity || computeSeverity(m.probability || 3, m.impact || 3);
    execute(`INSERT INTO risks (id, title, description, category, probability, impact, severity, owner, mitigation_strategy, contingency_plan, status, target_resolution_date, related_milestone_id, related_task_ids, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.title || 'New Risk', m.description || '', m.category || '', m.probability || 3, m.impact || 3, sev, m.owner || '', m.mitigationStrategy || '', m.contingencyPlan || '', m.status || 'identified', m.targetResolutionDate || '', m.relatedMilestoneId || null, m.relatedTaskIds || '', m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Risk>): Risk | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { title: 'title', description: 'description', category: 'category', probability: 'probability', impact: 'impact', severity: 'severity', owner: 'owner', mitigationStrategy: 'mitigation_strategy', contingencyPlan: 'contingency_plan', status: 'status', targetResolutionDate: 'target_resolution_date', relatedMilestoneId: 'related_milestone_id', relatedTaskIds: 'related_task_ids', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Risk] as string | number | null); }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE risks SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM risks WHERE id = ?`, [id]); },
  getStats() {
    const rows = query<Record<string, unknown>>(`SELECT severity, COUNT(*) as count FROM risks WHERE status NOT IN ('closed') GROUP BY severity`);
    return rows;
  },
};

function computeSeverity(p: number, i: number): Risk['severity'] {
  const score = p * i;
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// ============================================================
// Issue queries
// ============================================================
function rowToIssue(r: Record<string, unknown>): Issue {
  return {
    id: r.id as string, title: r.title as string, description: (r.description as string) || '',
    impact: (r.impact as string) || '', severity: r.severity as Issue['severity'],
    owner: (r.owner as string) || '', detectedDate: (r.detected_date as string) || '',
    resolutionTarget: (r.resolution_target as string) || '', resolutionActions: (r.resolution_actions as string) || '',
    status: r.status as Issue['status'], relatedTaskIds: (r.related_task_ids as string) || '',
    relatedCommunicationIds: (r.related_communication_ids as string) || '',
    escalationStatus: (r.escalation_status as string) || '', notes: (r.notes as string) || '',
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const issueQueries = {
  getAll(): Issue[] { return query<Record<string, unknown>>(`SELECT * FROM issues ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`).map(rowToIssue); },
  getById(id: string): Issue | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM issues WHERE id = ?`, [id]); return r ? rowToIssue(r) : null; },
  getOpen(): Issue[] { return query<Record<string, unknown>>(`SELECT * FROM issues WHERE status NOT IN ('resolved','closed') ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`).map(rowToIssue); },
  create(m: Partial<Issue>): Issue {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO issues (id, title, description, impact, severity, owner, detected_date, resolution_target, resolution_actions, status, related_task_ids, related_communication_ids, escalation_status, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.title || 'New Issue', m.description || '', m.impact || '', m.severity || 'medium', m.owner || '', m.detectedDate || now.split('T')[0], m.resolutionTarget || '', m.resolutionActions || '', m.status || 'open', m.relatedTaskIds || '', m.relatedCommunicationIds || '', m.escalationStatus || '', m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Issue>): Issue | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { title: 'title', description: 'description', impact: 'impact', severity: 'severity', owner: 'owner', detectedDate: 'detected_date', resolutionTarget: 'resolution_target', resolutionActions: 'resolution_actions', status: 'status', relatedTaskIds: 'related_task_ids', relatedCommunicationIds: 'related_communication_ids', escalationStatus: 'escalation_status', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Issue] as string | null); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE issues SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM issues WHERE id = ?`, [id]); },
};

// ============================================================
// Decision queries
// ============================================================
function rowToDecision(r: Record<string, unknown>): Decision {
  return {
    id: r.id as string, title: r.title as string, context: (r.context as string) || '',
    decisionRequired: (r.decision_required as string) || '', alternativesConsidered: (r.alternatives_considered as string) || '',
    finalDecision: (r.final_decision as string) || '', owner: (r.owner as string) || '',
    contributors: (r.contributors as string) || '', decisionDate: (r.decision_date as string) || '',
    deadline: (r.deadline as string) || '', impact: (r.impact as string) || '',
    status: r.status as Decision['status'], relatedTaskIds: (r.related_task_ids as string) || '',
    relatedRiskIds: (r.related_risk_ids as string) || '', relatedMilestoneId: (r.related_milestone_id as string) || null,
    relatedMeetingId: (r.related_meeting_id as string) || null,
    notes: (r.notes as string) || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const decisionQueries = {
  getAll(): Decision[] { return query<Record<string, unknown>>(`SELECT * FROM decisions ORDER BY CASE status WHEN 'decision-required' THEN 0 WHEN 'under-discussion' THEN 1 WHEN 'proposed' THEN 2 ELSE 3 END, created_at DESC`).map(rowToDecision); },
  getById(id: string): Decision | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM decisions WHERE id = ?`, [id]); return r ? rowToDecision(r) : null; },
  getPending(): Decision[] { return query<Record<string, unknown>>(`SELECT * FROM decisions WHERE status IN ('proposed','under-discussion','decision-required') ORDER BY deadline ASC, created_at DESC`).map(rowToDecision); },
  create(m: Partial<Decision>): Decision {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO decisions (id, title, context, decision_required, alternatives_considered, final_decision, owner, contributors, decision_date, deadline, impact, status, related_task_ids, related_risk_ids, related_milestone_id, related_meeting_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.title || 'New Decision', m.context || '', m.decisionRequired || '', m.alternativesConsidered || '', m.finalDecision || '', m.owner || '', m.contributors || '', m.decisionDate || '', m.deadline || '', m.impact || '', m.status || 'proposed', m.relatedTaskIds || '', m.relatedRiskIds || '', m.relatedMilestoneId || null, m.relatedMeetingId || null, m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Decision>): Decision | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { title: 'title', context: 'context', decisionRequired: 'decision_required', alternativesConsidered: 'alternatives_considered', finalDecision: 'final_decision', owner: 'owner', contributors: 'contributors', decisionDate: 'decision_date', deadline: 'deadline', impact: 'impact', status: 'status', relatedTaskIds: 'related_task_ids', relatedRiskIds: 'related_risk_ids', relatedMilestoneId: 'related_milestone_id', relatedMeetingId: 'related_meeting_id', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Decision] as string | null); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE decisions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM decisions WHERE id = ?`, [id]); },
};

// ============================================================
// Action queries
// ============================================================
function rowToAction(r: Record<string, unknown>): Action {
  return {
    id: r.id as string, action: r.action as string, owner: (r.owner as string) || '',
    dueDate: (r.due_date as string) || '', status: r.status as Action['status'],
    source: (r.source as string) || '', relatedMeetingId: (r.related_meeting_id as string) || null,
    relatedTaskId: (r.related_task_id as string) || null, notes: (r.notes as string) || '',
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const actionQueries = {
  getAll(): Action[] { return query<Record<string, unknown>>(`SELECT * FROM actions ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in-progress' THEN 1 ELSE 2 END, due_date ASC, created_at DESC`).map(rowToAction); },
  getById(id: string): Action | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM actions WHERE id = ?`, [id]); return r ? rowToAction(r) : null; },
  getOpen(): Action[] { return query<Record<string, unknown>>(`SELECT * FROM actions WHERE status NOT IN ('done','cancelled') ORDER BY due_date ASC`).map(rowToAction); },
  getOverdue(): Action[] {
    const today = new Date().toISOString().split('T')[0];
    return query<Record<string, unknown>>(`SELECT * FROM actions WHERE due_date != '' AND due_date < ? AND status NOT IN ('done','cancelled') ORDER BY due_date ASC`, [today]).map(rowToAction);
  },
  create(m: Partial<Action>): Action {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO actions (id, action, owner, due_date, status, source, related_meeting_id, related_task_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.action || '', m.owner || '', m.dueDate || '', m.status || 'open', m.source || '', m.relatedMeetingId || null, m.relatedTaskId || null, m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Action>): Action | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { action: 'action', owner: 'owner', dueDate: 'due_date', status: 'status', source: 'source', relatedMeetingId: 'related_meeting_id', relatedTaskId: 'related_task_id', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Action] as string | null); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE actions SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM actions WHERE id = ?`, [id]); },
};

// ============================================================
// Communication queries
// ============================================================
function rowToComm(r: Record<string, unknown>): Communication {
  return {
    id: r.id as string, subject: r.subject as string, type: (r.type as string) || 'email',
    sender: (r.sender as string) || '', recipients: (r.recipients as string) || '',
    date: (r.date as string) || '', channel: (r.channel as string) || '',
    summary: (r.summary as string) || '', informationSent: (r.information_sent as string) || '',
    informationRequested: (r.information_requested as string) || '', expectedResponse: (r.expected_response as string) || '',
    expectedResponseDate: (r.expected_response_date as string) || '', actualResponse: (r.actual_response as string) || '',
    responseDate: (r.response_date as string) || '', status: r.status as Communication['status'],
    followUpRequired: Boolean(r.follow_up_required), nextFollowUpDate: (r.next_follow_up_date as string) || '',
    relatedTaskId: (r.related_task_id as string) || null, relatedRiskId: (r.related_risk_id as string) || null,
    relatedMilestoneId: (r.related_milestone_id as string) || null, references: (r.ref_links as string) || (r.references as string) || '',
    notes: (r.notes as string) || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const communicationQueries = {
  getAll(): Communication[] { return query<Record<string, unknown>>(`SELECT * FROM communications ORDER BY date DESC, created_at DESC`).map(rowToComm); },
  getById(id: string): Communication | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM communications WHERE id = ?`, [id]); return r ? rowToComm(r) : null; },
  getAwaitingResponse(): Communication[] { return query<Record<string, unknown>>(`SELECT * FROM communications WHERE status = 'awaiting-response' ORDER BY expected_response_date ASC`).map(rowToComm); },
  getFollowUpNeeded(): Communication[] {
    const today = new Date().toISOString().split('T')[0];
    return query<Record<string, unknown>>(
      `SELECT * FROM communications WHERE follow_up_required = 1 AND next_follow_up_date != '' AND next_follow_up_date <= ? AND status NOT IN ('closed','response-received') ORDER BY next_follow_up_date ASC`,
      [today]
    ).map(rowToComm);
  },
  getOverdueResponses(): Communication[] {
    const today = new Date().toISOString().split('T')[0];
    return query<Record<string, unknown>>(`SELECT * FROM communications WHERE status = 'awaiting-response' AND expected_response_date != '' AND expected_response_date < ? ORDER BY expected_response_date ASC`, [today]).map(rowToComm);
  },
  create(m: Partial<Communication>): Communication {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO communications (id, subject, type, sender, recipients, date, channel, summary, information_sent, information_requested, expected_response, expected_response_date, actual_response, response_date, status, follow_up_required, next_follow_up_date, related_task_id, related_risk_id, related_milestone_id, ref_links, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.subject || '', m.type || 'email', m.sender || '', m.recipients || '', m.date || now.split('T')[0], m.channel || '', m.summary || '', m.informationSent || '', m.informationRequested || '', m.expectedResponse || '', m.expectedResponseDate || '', m.actualResponse || '', m.responseDate || '', m.status || 'sent', m.followUpRequired ? 1 : 0, m.nextFollowUpDate || '', m.relatedTaskId || null, m.relatedRiskId || null, m.relatedMilestoneId || null, m.references || '', m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Communication>): Communication | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { subject: 'subject', type: 'type', sender: 'sender', recipients: 'recipients', date: 'date', channel: 'channel', summary: 'summary', informationSent: 'information_sent', informationRequested: 'information_requested', expectedResponse: 'expected_response', expectedResponseDate: 'expected_response_date', actualResponse: 'actual_response', responseDate: 'response_date', status: 'status', followUpRequired: 'follow_up_required', nextFollowUpDate: 'next_follow_up_date', relatedTaskId: 'related_task_id', relatedRiskId: 'related_risk_id', relatedMilestoneId: 'related_milestone_id', references: 'ref_links', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) {
        fields.push(`${col} = ?`);
        const val = updates[k as keyof Communication];
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : (val as string | null));
      }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE communications SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM communications WHERE id = ?`, [id]); },
};

// ============================================================
// Stakeholder queries
// ============================================================
function rowToStakeholder(r: Record<string, unknown>): Stakeholder {
  return {
    id: r.id as string, name: r.name as string, role: (r.role as string) || '',
    organization: (r.organization as string) || '', email: (r.email as string) || '',
    phone: (r.phone as string) || '', responsibilities: (r.responsibilities as string) || '',
    influenceLevel: (r.influence_level as string) || 'medium', involvementLevel: (r.involvement_level as string) || 'medium',
    communicationPreferences: (r.communication_preferences as string) || '', projectTopics: (r.project_topics as string) || '',
    notes: (r.notes as string) || '', createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const stakeholderQueries = {
  getAll(): Stakeholder[] { return query<Record<string, unknown>>(`SELECT * FROM stakeholders ORDER BY name ASC`).map(rowToStakeholder); },
  getById(id: string): Stakeholder | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM stakeholders WHERE id = ?`, [id]); return r ? rowToStakeholder(r) : null; },
  create(m: Partial<Stakeholder>): Stakeholder {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO stakeholders (id, name, role, organization, email, phone, responsibilities, influence_level, involvement_level, communication_preferences, project_topics, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.name || 'New Stakeholder', m.role || '', m.organization || '', m.email || '', m.phone || '', m.responsibilities || '', m.influenceLevel || 'medium', m.involvementLevel || 'medium', m.communicationPreferences || '', m.projectTopics || '', m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Stakeholder>): Stakeholder | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { name: 'name', role: 'role', organization: 'organization', email: 'email', phone: 'phone', responsibilities: 'responsibilities', influenceLevel: 'influence_level', involvementLevel: 'involvement_level', communicationPreferences: 'communication_preferences', projectTopics: 'project_topics', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Stakeholder] as string); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE stakeholders SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM stakeholders WHERE id = ?`, [id]); },
};

// ============================================================
// Resource queries
// ============================================================
function rowToResource(r: Record<string, unknown>): Resource {
  return {
    id: r.id as string, name: r.name as string, role: (r.role as string) || '',
    organization: (r.organization as string) || '', email: (r.email as string) || '',
    allocationPercent: (r.allocation_percent as number) || 100, plannedWorkload: (r.planned_workload as number) || 0,
    skills: (r.skills as string) || '', projectStartDate: (r.project_start_date as string) || '',
    projectEndDate: (r.project_end_date as string) || '', notes: (r.notes as string) || '',
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const resourceQueries = {
  getAll(): Resource[] { return query<Record<string, unknown>>(`SELECT * FROM resources ORDER BY name ASC`).map(rowToResource); },
  getById(id: string): Resource | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM resources WHERE id = ?`, [id]); return r ? rowToResource(r) : null; },
  create(m: Partial<Resource>): Resource {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO resources (id, name, role, organization, email, allocation_percent, planned_workload, skills, project_start_date, project_end_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.name || 'New Resource', m.role || '', m.organization || '', m.email || '', m.allocationPercent || 100, m.plannedWorkload || 0, m.skills || '', m.projectStartDate || '', m.projectEndDate || '', m.notes || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Resource>): Resource | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { name: 'name', role: 'role', organization: 'organization', email: 'email', allocationPercent: 'allocation_percent', plannedWorkload: 'planned_workload', skills: 'skills', projectStartDate: 'project_start_date', projectEndDate: 'project_end_date', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Resource] as string | number); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM resources WHERE id = ?`, [id]); },
};

// ============================================================
// Absence queries
// ============================================================
function rowToAbsence(r: Record<string, unknown>): Absence {
  return {
    id: r.id as string, resourceId: r.resource_id as string, resourceName: (r.resource_name as string) || '',
    type: r.type as string, startDate: r.start_date as string, endDate: r.end_date as string,
    notes: (r.notes as string) || '', createdAt: r.created_at as string,
  };
}

export const absenceQueries = {
  getAll(): Absence[] { return query<Record<string, unknown>>(`SELECT * FROM absences ORDER BY start_date ASC`).map(rowToAbsence); },
  getByResource(resourceId: string): Absence[] { return query<Record<string, unknown>>(`SELECT * FROM absences WHERE resource_id = ? ORDER BY start_date ASC`, [resourceId]).map(rowToAbsence); },
  getUpcoming(days = 30): Absence[] {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    return query<Record<string, unknown>>(`SELECT * FROM absences WHERE end_date >= ? AND start_date <= ? ORDER BY start_date ASC`, [today, future]).map(rowToAbsence);
  },
  getById(id: string): Absence | null {
    const r = queryOne<Record<string, unknown>>(`SELECT * FROM absences WHERE id = ?`, [id]);
    return r ? rowToAbsence(r) : null;
  },
  create(m: Partial<Absence>): Absence {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO absences (id, resource_id, resource_name, type, start_date, end_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [id, m.resourceId || '', m.resourceName || '', m.type || 'vacation', m.startDate || '', m.endDate || '', m.notes || '', now]);
    const r = queryOne<Record<string, unknown>>(`SELECT * FROM absences WHERE id = ?`, [id])!;
    return rowToAbsence(r);
  },
  update(id: string, updates: Partial<Absence>): Absence | null {
    const map: Record<string, string> = {
      resourceId: 'resource_id',
      resourceName: 'resource_name',
      type: 'type',
      startDate: 'start_date',
      endDate: 'end_date',
      notes: 'notes',
    };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) {
        fields.push(`${col} = ?`);
        values.push(updates[k as keyof Absence] as string);
      }
    }
    if (fields.length > 0) {
      values.push(id);
      execute(`UPDATE absences SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM absences WHERE id = ?`, [id]); },
};

// ============================================================
// Meeting queries
// ============================================================
function rowToMeeting(r: Record<string, unknown>): Meeting {
  return {
    id: r.id as string, title: r.title as string, date: (r.date as string) || '',
    type: (r.type as string) || '', participants: (r.participants as string) || '',
    agenda: (r.agenda as string) || '', notes: (r.notes as string) || '',
    decisions: (r.decisions as string) || '', actions: (r.actions as string) || '',
    risksIdentified: (r.risks_identified as string) || '', blockersIdentified: (r.blockers_identified as string) || '',
    followUps: (r.follow_ups as string) || '',
    relatedActionIds: (r.related_action_ids as string) || '',
    relatedTaskIds: (r.related_task_ids as string) || '',
    relatedDecisionIds: (r.related_decision_ids as string) || '',
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const meetingQueries = {
  getAll(): Meeting[] { return query<Record<string, unknown>>(`SELECT * FROM meetings ORDER BY date DESC, created_at DESC`).map(rowToMeeting); },
  getById(id: string): Meeting | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM meetings WHERE id = ?`, [id]); return r ? rowToMeeting(r) : null; },
  create(m: Partial<Meeting>): Meeting {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO meetings (id, title, date, type, participants, agenda, notes, decisions, actions, risks_identified, blockers_identified, follow_ups, related_action_ids, related_task_ids, related_decision_ids, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, m.title || 'New Meeting', m.date || now.split('T')[0], m.type || 'project-meeting', m.participants || '', m.agenda || '', m.notes || '', m.decisions || '', m.actions || '', m.risksIdentified || '', m.blockersIdentified || '', m.followUps || '', m.relatedActionIds || '', m.relatedTaskIds || '', m.relatedDecisionIds || '', now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Meeting>): Meeting | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = {
      title: 'title', date: 'date', type: 'type', participants: 'participants',
      agenda: 'agenda', notes: 'notes', decisions: 'decisions', actions: 'actions',
      risksIdentified: 'risks_identified', blockersIdentified: 'blockers_identified',
      followUps: 'follow_ups', relatedActionIds: 'related_action_ids',
      relatedTaskIds: 'related_task_ids', relatedDecisionIds: 'related_decision_ids'
    };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) { if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof Meeting] as string); } }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM meetings WHERE id = ?`, [id]); },
};

// ============================================================
// Note queries
// ============================================================
function rowToNote(r: Record<string, unknown>): Note {
  return {
    id: r.id as string, title: r.title as string, content: (r.content as string) || '',
    category: (r.category as string) || 'general', tags: (r.tags as string) || '',
    relatedEntityType: (r.related_entity_type as string) || '', relatedEntityId: (r.related_entity_id as string) || null,
    isPinned: Boolean(r.is_pinned), createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

export const noteQueries = {
  getAll(): Note[] { return query<Record<string, unknown>>(`SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC`).map(rowToNote); },
  getById(id: string): Note | null { const r = queryOne<Record<string, unknown>>(`SELECT * FROM notes WHERE id = ?`, [id]); return r ? rowToNote(r) : null; },
  getByCategory(category: string): Note[] { return query<Record<string, unknown>>(`SELECT * FROM notes WHERE category = ? ORDER BY is_pinned DESC, updated_at DESC`, [category]).map(rowToNote); },
  create(m: Partial<Note>): Note {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO notes (id, title, content, category, tags, related_entity_type, related_entity_id, is_pinned, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, m.title || 'New Note', m.content || '', m.category || 'general', m.tags || '', m.relatedEntityType || '', m.relatedEntityId || null, m.isPinned ? 1 : 0, now, now]);
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<Note>): Note | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { title: 'title', content: 'content', category: 'category', tags: 'tags', relatedEntityType: 'related_entity_type', relatedEntityId: 'related_entity_id', isPinned: 'is_pinned' };
    const fields: string[] = [], values: (string | number | null | boolean)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) {
        fields.push(`${col} = ?`);
        const val = updates[k as keyof Note];
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : (val as string | null));
      }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM notes WHERE id = ?`, [id]); },
};

// ============================================================
// Activity Log queries
// ============================================================
function rowToActivity(r: Record<string, unknown>): ActivityLog {
  return {
    id: r.id as string, entityType: r.entity_type as string, entityId: r.entity_id as string,
    entityTitle: (r.entity_title as string) || '', action: r.action as string,
    description: (r.description as string) || '', createdAt: r.created_at as string,
  };
}

export const activityQueries = {
  getRecent(limit = 50): ActivityLog[] {
    return query<Record<string, unknown>>(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`, [limit]).map(rowToActivity);
  },
  log(entityType: string, entityId: string, entityTitle: string, action: string, description = ''): void {
    const id = generateId(); const now = new Date().toISOString();
    execute(`INSERT INTO activity_log (id, entity_type, entity_id, entity_title, action, description, created_at) VALUES (?,?,?,?,?,?,?)`,
      [id, entityType, entityId, entityTitle, action, description, now]);
  },
};

// ============================================================
// Project Config queries
// ============================================================
function rowToProjectConfig(r: Record<string, unknown>): ProjectConfig {
  return {
    id: (r.id as string) || 'main',
    name: (r.name as string) || 'New Project',
    code: (r.code as string) || '',
    description: (r.description as string) || '',
    objectives: (r.objectives as string) || '',
    businessContext: (r.business_context as string) || '',
    scope: (r.scope as string) || '',
    outOfScope: (r.out_of_scope as string) || '',
    owner: (r.owner as string) || '',
    manager: (r.manager as string) || '',
    sponsor: (r.sponsor as string) || '',
    startDate: (r.start_date as string) || '',
    targetDate: (r.target_date as string) || '',
    currentPhase: (r.current_phase as string) || '',
    status: (r.status as ProjectConfig['status']) || 'on-track',
    statusNote: (r.status_note as string) || '',
    budget: (r.budget as string) || '',
    methodology: (r.methodology as string) || '',
    technologies: (r.technologies as string) || '',
    importantLinks: (r.important_links as string) || '',
    documentationLocations: (r.documentation_locations as string) || '',
    environments: (r.environments as string) || '',
    suppliers: (r.suppliers as string) || '',
    team: (r.team as string) || '',
    createdAt: (r.created_at as string) || '',
    updatedAt: (r.updated_at as string) || '',
  };
}

export const projectConfigQueries = {
  get(): ProjectConfig | null {
    const r = queryOne<Record<string, unknown>>(`SELECT * FROM project_config WHERE id = 'main'`);
    return r ? rowToProjectConfig(r) : null;
  },
  upsert(data: Record<string, string>) {
    const existing = this.get();
    const now = new Date().toISOString();
    if (!existing) {
      const cols = ['id', ...Object.keys(data).map(k => toSnake(k)), 'created_at', 'updated_at'].join(',');
      const placeholders = Array(Object.keys(data).length + 3).fill('?').join(',');
      execute(`INSERT INTO project_config (${cols}) VALUES (${placeholders})`,
        ['main', ...Object.values(data), now, now]);
    } else {
      const sets = Object.keys(data).map(k => `${toSnake(k)} = ?`).join(', ');
      execute(`UPDATE project_config SET ${sets}, updated_at = ? WHERE id = 'main'`,
        [...Object.values(data), now]);
    }
  },
};

function toSnake(camel: string): string {
  return camel.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// ============================================================
// Weekly Review queries
// ============================================================
function rowToWeeklyReview(r: Record<string, unknown>): WeeklyReview {
  return {
    id: r.id as string,
    weekNumber: (r.week_number as number) || 1,
    year: (r.year as number) || new Date().getFullYear(),
    periodStart: (r.period_start as string) || '',
    periodEnd: (r.period_end as string) || '',
    status: (r.status as WeeklyReview['status']) || 'draft',
    overallHealth: (r.overall_health as WeeklyReview['overallHealth']) || 'on-track',
    summary: (r.summary as string) || '',
    achievements: (r.achievements as string) || '',
    prioritiesNextWeek: (r.priorities_next_week as string) || '',
    blockersNotes: (r.blockers_notes as string) || '',
    snapshotJson: (r.snapshot_json as string) || '{}',
    createdAt: (r.created_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
  };
}

export const weeklyReviewQueries = {
  getAll(): WeeklyReview[] {
    try {
      return query<Record<string, unknown>>(
        `SELECT * FROM weekly_reviews ORDER BY year DESC, week_number DESC`
      ).map(rowToWeeklyReview);
    } catch {
      return [];
    }
  },
  getById(id: string): WeeklyReview | null {
    try {
      const r = queryOne<Record<string, unknown>>(`SELECT * FROM weekly_reviews WHERE id = ?`, [id]);
      return r ? rowToWeeklyReview(r) : null;
    } catch {
      return null;
    }
  },
  getByWeek(year: number, weekNumber: number): WeeklyReview | null {
    try {
      const r = queryOne<Record<string, unknown>>(
        `SELECT * FROM weekly_reviews WHERE year = ? AND week_number = ?`,
        [year, weekNumber]
      );
      return r ? rowToWeeklyReview(r) : null;
    } catch {
      return null;
    }
  },
  create(w: Partial<WeeklyReview>): WeeklyReview {
    const id = generateId();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO weekly_reviews (
        id, week_number, year, period_start, period_end, status, overall_health,
        summary, achievements, priorities_next_week, blockers_notes, snapshot_json,
        created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        w.weekNumber ?? 1,
        w.year ?? new Date().getFullYear(),
        w.periodStart || '',
        w.periodEnd || '',
        w.status || 'draft',
        w.overallHealth || 'on-track',
        w.summary || '',
        w.achievements || '',
        w.prioritiesNextWeek || '',
        w.blockersNotes || '',
        w.snapshotJson || '{}',
        now,
        now,
      ]
    );
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<WeeklyReview>): WeeklyReview | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = {
      weekNumber: 'week_number',
      year: 'year',
      periodStart: 'period_start',
      periodEnd: 'period_end',
      status: 'status',
      overallHealth: 'overall_health',
      summary: 'summary',
      achievements: 'achievements',
      prioritiesNextWeek: 'priorities_next_week',
      blockersNotes: 'blockers_notes',
      snapshotJson: 'snapshot_json',
    };
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) {
        fields.push(`${col} = ?`);
        values.push(updates[k as keyof WeeklyReview] as string | number);
      }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?');
    values.push(now, id);
    execute(`UPDATE weekly_reviews SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) {
    execute(`DELETE FROM weekly_reviews WHERE id = ?`, [id]);
  },
};

// ============================================================
// Settings queries
// ============================================================
export const settingsQueries = {
  get(key: string): string | null {
    const r = queryOne<Record<string, unknown>>(`SELECT value FROM settings WHERE key = ?`, [key]);
    return r ? (r.value as string) : null;
  },
  set(key: string, value: string): void {
    execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)`, [key, value]);
  },
};

// ============================================================
// Global search
// ============================================================
export function globalSearch(term: string): Array<{ type: string; id: string; title: string; subtitle: string }> {
  if (!term || term.trim().length < 2) return [];

  const tokens = term.trim().split(/\s+/);
  let filterType: string | null = null;
  let filterOwner: string | null = null;
  let filterStatus: string | null = null;
  let isOverdue = false;
  let isBlocked = false;
  const textWords: string[] = [];

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower.startsWith('type:')) {
      filterType = lower.slice(5).trim();
    } else if (lower.startsWith('owner:')) {
      filterOwner = token.slice(6).trim();
    } else if (lower.startsWith('status:')) {
      filterStatus = lower.slice(7).trim();
    } else if (lower === 'is:overdue') {
      isOverdue = true;
    } else if (lower === 'is:blocked') {
      isBlocked = true;
    } else {
      textWords.push(token);
    }
  }

  const queryText = textWords.join(' ');
  const like = queryText ? `%${queryText}%` : '%';
  const today = new Date().toISOString().split('T')[0];
  const results: Array<{ type: string; id: string; title: string; subtitle: string }> = [];

  const shouldSearch = (t: string) => !filterType || filterType === t || `${t}s` === filterType;

  // Tasks: title, description, owner, tags, phase, category
  if (shouldSearch('task')) {
    let sql = `SELECT id, title, status, owner, due_date FROM tasks WHERE (title LIKE ? OR description LIKE ? OR owner LIKE ? OR tags LIKE ? OR phase LIKE ? OR category LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like, like, like, like];

    if (filterOwner) {
      sql += ` AND owner LIKE ?`;
      params.push(`%${filterOwner}%`);
    }
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    if (isOverdue) {
      sql += ` AND due_date != '' AND due_date < ? AND status NOT IN ('done', 'cancelled')`;
      params.push(today);
    }
    if (isBlocked) {
      sql += ` AND status = 'blocked'`;
    }
    sql += ` LIMIT 15`;

    const tasks = query<Record<string, unknown>>(sql, params);
    tasks.forEach(t => results.push({
      type: 'task',
      id: t.id as string,
      title: t.title as string,
      subtitle: `${t.status} · ${(t.owner as string) || 'Unassigned'}${t.due_date ? ` · Due: ${t.due_date}` : ''}`
    }));
  }

  // Risks: title, description, owner, category
  if (shouldSearch('risk') && !isBlocked) {
    let sql = `SELECT id, title, status, owner, severity FROM risks WHERE (title LIKE ? OR description LIKE ? OR owner LIKE ? OR category LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like, like];
    if (filterOwner) {
      sql += ` AND owner LIKE ?`;
      params.push(`%${filterOwner}%`);
    }
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    sql += ` LIMIT 8`;

    const risks = query<Record<string, unknown>>(sql, params);
    risks.forEach(r => results.push({
      type: 'risk',
      id: r.id as string,
      title: r.title as string,
      subtitle: `${r.severity || ''} · ${r.status} · ${(r.owner as string) || ''}`
    }));
  }

  // Issues: title, description, owner, category
  if (shouldSearch('issue')) {
    let sql = `SELECT id, title, status, owner, severity FROM issues WHERE (title LIKE ? OR description LIKE ? OR owner LIKE ? OR category LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like, like];
    if (filterOwner) {
      sql += ` AND owner LIKE ?`;
      params.push(`%${filterOwner}%`);
    }
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    sql += ` LIMIT 8`;

    const issues = query<Record<string, unknown>>(sql, params);
    issues.forEach(i => results.push({
      type: 'issue',
      id: i.id as string,
      title: i.title as string,
      subtitle: `${i.severity || ''} · ${i.status} · ${(i.owner as string) || ''}`
    }));
  }

  // Decisions: title, context, owner
  if (shouldSearch('decision') && !isBlocked) {
    let sql = `SELECT id, title, status, owner FROM decisions WHERE (title LIKE ? OR context LIKE ? OR owner LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like];
    if (filterOwner) {
      sql += ` AND owner LIKE ?`;
      params.push(`%${filterOwner}%`);
    }
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    sql += ` LIMIT 8`;

    const decisions = query<Record<string, unknown>>(sql, params);
    decisions.forEach(d => results.push({
      type: 'decision',
      id: d.id as string,
      title: d.title as string,
      subtitle: `${d.status} · ${(d.owner as string) || ''}`
    }));
  }

  // Communications: subject, summary, recipients, sender
  if (shouldSearch('communication') && !isBlocked) {
    let sql = `SELECT id, subject, status, recipients, sender, expected_response_date FROM communications WHERE (subject LIKE ? OR summary LIKE ? OR recipients LIKE ? OR sender LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like, like];
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    if (isOverdue) {
      sql += ` AND expected_response_date != '' AND expected_response_date < ? AND status NOT IN ('closed', 'response-received')`;
      params.push(today);
    }
    sql += ` LIMIT 8`;

    const comms = query<Record<string, unknown>>(sql, params);
    comms.forEach(c => results.push({
      type: 'communication',
      id: c.id as string,
      title: c.subject as string,
      subtitle: `${c.status} · ${(c.recipients as string) || ''}`
    }));
  }

  // Milestones: name, description, owner
  if (shouldSearch('milestone') && !isBlocked) {
    let sql = `SELECT id, name, status, owner, target_date FROM milestones WHERE (name LIKE ? OR description LIKE ? OR owner LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like];
    if (filterOwner) {
      sql += ` AND owner LIKE ?`;
      params.push(`%${filterOwner}%`);
    }
    if (filterStatus) {
      sql += ` AND status LIKE ?`;
      params.push(`%${filterStatus}%`);
    }
    sql += ` LIMIT 8`;

    const milestones = query<Record<string, unknown>>(sql, params);
    milestones.forEach(m => results.push({
      type: 'milestone',
      id: m.id as string,
      title: m.name as string,
      subtitle: `${m.status} · ${(m.owner as string) || ''}${m.target_date ? ` · ${m.target_date}` : ''}`
    }));
  }

  // Notes: title, content, tags, category
  if (shouldSearch('note') && !isBlocked && !isOverdue) {
    let sql = `SELECT id, title, category FROM notes WHERE (title LIKE ? OR content LIKE ? OR tags LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like];
    sql += ` LIMIT 8`;

    const notes = query<Record<string, unknown>>(sql, params);
    notes.forEach(n => results.push({
      type: 'note',
      id: n.id as string,
      title: n.title as string,
      subtitle: (n.category as string) || 'Note'
    }));
  }

  // Stakeholders: name, role, email, organization
  if (shouldSearch('stakeholder') && !isBlocked && !isOverdue) {
    let sql = `SELECT id, name, role, organization FROM stakeholders WHERE (name LIKE ? OR role LIKE ? OR email LIKE ? OR organization LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like, like];
    sql += ` LIMIT 8`;

    const stakeholders = query<Record<string, unknown>>(sql, params);
    stakeholders.forEach(s => results.push({
      type: 'stakeholder',
      id: s.id as string,
      title: s.name as string,
      subtitle: `${(s.role as string) || ''} · ${(s.organization as string) || ''}`
    }));
  }

  // Meetings: title, participants, agenda
  if (shouldSearch('meeting') && !isBlocked && !isOverdue) {
    let sql = `SELECT id, title, date, participants FROM meetings WHERE (title LIKE ? OR participants LIKE ? OR agenda LIKE ?)`;
    const params: (string | number | null | boolean)[] = [like, like, like];
    sql += ` LIMIT 8`;

    const meetings = query<Record<string, unknown>>(sql, params);
    meetings.forEach(m => results.push({
      type: 'meeting',
      id: m.id as string,
      title: m.title as string,
      subtitle: `${(m.date as string) || ''} · ${(m.participants as string) || ''}`
    }));
  }

  return results;
}

// ============================================================
// Budget Item queries
// ============================================================
function rowToBudgetItem(r: Record<string, unknown>): BudgetItem {
  return {
    id: r.id as string,
    category: (r.category as string) || 'general',
    description: (r.description as string) || '',
    type: (r.type as BudgetItem['type']) || 'opex',
    vendor: (r.vendor as string) || '',
    plannedAmount: (r.planned_amount as number) || 0,
    actualAmount: (r.actual_amount as number) || 0,
    forecastAmount: (r.forecast_amount as number) || 0,
    currency: (r.currency as string) || 'EUR',
    status: (r.status as BudgetItem['status']) || 'planned',
    invoiceDate: (r.invoice_date as string) || '',
    paymentDate: (r.payment_date as string) || '',
    purchaseOrder: (r.purchase_order as string) || '',
    phase: (r.phase as string) || '',
    milestoneId: (r.milestone_id as string) || null,
    notes: (r.notes as string) || '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export const budgetItemQueries = {
  getAll(): BudgetItem[] {
    try {
      return query<Record<string, unknown>>(`SELECT * FROM budget_items ORDER BY category, description`).map(rowToBudgetItem);
    } catch { return []; }
  },
  getById(id: string): BudgetItem | null {
    try {
      const r = queryOne<Record<string, unknown>>(`SELECT * FROM budget_items WHERE id = ?`, [id]);
      return r ? rowToBudgetItem(r) : null;
    } catch { return null; }
  },
  create(b: Partial<BudgetItem>): BudgetItem {
    const id = generateId();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO budget_items (id, category, description, type, vendor, planned_amount, actual_amount, forecast_amount, currency, status, invoice_date, payment_date, purchase_order, phase, milestone_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, b.category || 'general', b.description || '', b.type || 'opex', b.vendor || '', b.plannedAmount || 0, b.actualAmount || 0, b.forecastAmount || 0, b.currency || 'EUR', b.status || 'planned', b.invoiceDate || '', b.paymentDate || '', b.purchaseOrder || '', b.phase || '', b.milestoneId || null, b.notes || '', now, now]
    );
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<BudgetItem>): BudgetItem | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { category: 'category', description: 'description', type: 'type', vendor: 'vendor', plannedAmount: 'planned_amount', actualAmount: 'actual_amount', forecastAmount: 'forecast_amount', currency: 'currency', status: 'status', invoiceDate: 'invoice_date', paymentDate: 'payment_date', purchaseOrder: 'purchase_order', phase: 'phase', milestoneId: 'milestone_id', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof BudgetItem] as string | number | null); }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE budget_items SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM budget_items WHERE id = ?`, [id]); },
};

// ============================================================
// Change Request queries
// ============================================================
function rowToChangeRequest(r: Record<string, unknown>): ChangeRequest {
  return {
    id: r.id as string,
    title: (r.title as string) || '',
    description: (r.description as string) || '',
    category: (r.category as ChangeRequest['category']) || 'scope',
    requestor: (r.requestor as string) || '',
    requestDate: (r.request_date as string) || '',
    priority: (r.priority as ChangeRequest['priority']) || 'medium',
    status: (r.status as ChangeRequest['status']) || 'draft',
    impactScope: (r.impact_scope as string) || '',
    impactSchedule: (r.impact_schedule as string) || '',
    impactBudget: (r.impact_budget as string) || '',
    impactResources: (r.impact_resources as string) || '',
    impactRisk: (r.impact_risk as string) || '',
    estimatedCost: (r.estimated_cost as number) || 0,
    estimatedDurationDays: (r.estimated_duration_days as number) || 0,
    justification: (r.justification as string) || '',
    alternatives: (r.alternatives as string) || '',
    recommendation: (r.recommendation as string) || '',
    approver: (r.approver as string) || '',
    approvalDate: (r.approval_date as string) || '',
    decisionNotes: (r.decision_notes as string) || '',
    linkedMilestoneId: (r.linked_milestone_id as string) || null,
    linkedTaskIds: (r.linked_task_ids as string) || '',
    notes: (r.notes as string) || '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export const changeRequestQueries = {
  getAll(): ChangeRequest[] {
    try {
      return query<Record<string, unknown>>(`SELECT * FROM change_requests ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`).map(rowToChangeRequest);
    } catch { return []; }
  },
  getById(id: string): ChangeRequest | null {
    try {
      const r = queryOne<Record<string, unknown>>(`SELECT * FROM change_requests WHERE id = ?`, [id]);
      return r ? rowToChangeRequest(r) : null;
    } catch { return null; }
  },
  getOpen(): ChangeRequest[] {
    try {
      return query<Record<string, unknown>>(`SELECT * FROM change_requests WHERE status NOT IN ('approved','rejected','withdrawn','implemented') ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`).map(rowToChangeRequest);
    } catch { return []; }
  },
  create(c: Partial<ChangeRequest>): ChangeRequest {
    const id = generateId();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO change_requests (id, title, description, category, requestor, request_date, priority, status, impact_scope, impact_schedule, impact_budget, impact_resources, impact_risk, estimated_cost, estimated_duration_days, justification, alternatives, recommendation, approver, approval_date, decision_notes, linked_milestone_id, linked_task_ids, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, c.title || '', c.description || '', c.category || 'scope', c.requestor || '', c.requestDate || '', c.priority || 'medium', c.status || 'draft', c.impactScope || '', c.impactSchedule || '', c.impactBudget || '', c.impactResources || '', c.impactRisk || '', c.estimatedCost || 0, c.estimatedDurationDays || 0, c.justification || '', c.alternatives || '', c.recommendation || '', c.approver || '', c.approvalDate || '', c.decisionNotes || '', c.linkedMilestoneId || null, c.linkedTaskIds || '', c.notes || '', now, now]
    );
    return this.getById(id)!;
  },
  update(id: string, updates: Partial<ChangeRequest>): ChangeRequest | null {
    const now = new Date().toISOString();
    const map: Record<string, string> = { title: 'title', description: 'description', category: 'category', requestor: 'requestor', requestDate: 'request_date', priority: 'priority', status: 'status', impactScope: 'impact_scope', impactSchedule: 'impact_schedule', impactBudget: 'impact_budget', impactResources: 'impact_resources', impactRisk: 'impact_risk', estimatedCost: 'estimated_cost', estimatedDurationDays: 'estimated_duration_days', justification: 'justification', alternatives: 'alternatives', recommendation: 'recommendation', approver: 'approver', approvalDate: 'approval_date', decisionNotes: 'decision_notes', linkedMilestoneId: 'linked_milestone_id', linkedTaskIds: 'linked_task_ids', notes: 'notes' };
    const fields: string[] = [], values: (string | number | null)[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in updates) { fields.push(`${col} = ?`); values.push(updates[k as keyof ChangeRequest] as string | number | null); }
    }
    if (!fields.length) return this.getById(id);
    fields.push('updated_at = ?'); values.push(now, id);
    execute(`UPDATE change_requests SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },
  delete(id: string) { execute(`DELETE FROM change_requests WHERE id = ?`, [id]); },
};
