// ============================================================
// Demo Data Seeder — "Customer Portal Migration" IT Project
// ============================================================
import { taskQueries } from '../db/queries/tasks';
import {
  milestoneQueries, riskQueries, issueQueries, decisionQueries,
  actionQueries, communicationQueries, stakeholderQueries, resourceQueries,
  absenceQueries, meetingQueries, noteQueries, activityQueries,
  projectConfigQueries, weeklyReviewQueries, budgetItemQueries, changeRequestQueries,
} from '../db/queries';

export function hasDemoData(): boolean {
  const rows = taskQueries.getAll();
  return rows.length > 0;
}

export function seedDemoData(): void {
  // Project config
  projectConfigQueries.upsert({
    name: 'Customer Portal Migration',
    code: 'CPM-2026',
    description: 'Migration of the legacy customer portal (v1.3) to a modern React/Next.js stack with a microservices backend. Includes redesign of the authentication layer, customer data APIs, and reporting module.',
    objectives: '1. Replace legacy PHP portal with modern React/Node.js stack\n2. Reduce page load times by 60%\n3. Improve mobile experience (responsive design)\n4. Enable SSO integration with Azure AD\n5. Migrate 120k+ customer records without data loss',
    businessContext: 'The current portal is 8 years old, uses deprecated dependencies, and is increasingly difficult to maintain. Customer satisfaction scores have dropped 12 points in the last 6 months due to performance and UX issues.',
    scope: 'Customer-facing portal, authentication module, data APIs, reporting dashboard, admin panel',
    outOfScope: 'CRM backend system, billing engine, internal HR portal',
    owner: 'Marie Dupont',
    manager: 'Jean-Baptiste Martin',
    sponsor: 'Claire Fontaine (CTO)',
    startDate: '2026-04-01',
    targetDate: '2026-12-31',
    currentPhase: 'Development',
    status: 'at-risk',
    statusNote: 'Infrastructure delays may impact Phase 3 delivery. Risk being actively managed.',
    methodology: 'Agile / Iterative (4-week sprints)',
    technologies: 'React 18, Next.js 14, Node.js, PostgreSQL, Azure AD, Docker, Kubernetes',
    environments: 'DEV: dev-portal.internal | SIT: sit-portal.internal | UAT: uat-portal.client.com | PROD: portal.client.com',
    suppliers: 'CloudArch SARL (infrastructure) | UXStudio (UX/design) | DataMig Inc. (migration tools)',
  });

  // Milestones
  const m1 = milestoneQueries.create({ name: 'Phase 1 — Architecture & Design', description: 'Technical architecture finalized, UX wireframes approved, dev environment ready.', targetDate: '2026-05-31', status: 'completed', progress: 100, owner: 'Jean-Baptiste Martin' });
  const m2 = milestoneQueries.create({ name: 'Phase 2 — Authentication & Core APIs', description: 'SSO integration with Azure AD, customer data APIs v1, database migration scripts.', targetDate: '2026-07-31', status: 'completed', progress: 100, owner: 'Sophie Leclerc' });
  const m3 = milestoneQueries.create({ name: 'Phase 3 — Customer Portal MVP', description: 'Customer-facing portal MVP with full feature parity with legacy system.', targetDate: '2026-09-30', status: 'at-risk', progress: 55, owner: 'Jean-Baptiste Martin' });
  const m4 = milestoneQueries.create({ name: 'Phase 4 — UAT & Performance Testing', description: 'User acceptance testing with 50 pilot customers, load testing, security audit.', targetDate: '2026-11-15', status: 'planned', progress: 0, owner: 'Claire Fontaine' });
  const m5 = milestoneQueries.create({ name: 'Phase 5 — Production Migration & Cutover', description: 'Data migration, production deployment, cutover from legacy portal.', targetDate: '2026-12-31', status: 'planned', progress: 0, owner: 'Jean-Baptiste Martin' });

  // Stakeholders
  const s1 = stakeholderQueries.create({ name: 'Claire Fontaine', role: 'CTO / Project Sponsor', organization: 'Client Corp', email: 'c.fontaine@client.com', phone: '+33 6 12 34 56 78', influenceLevel: 'very-high', involvementLevel: 'high', communicationPreferences: 'Weekly email summary + monthly steering committee', projectTopics: 'Budget, strategic direction, go/no-go decisions' });
  const s2 = stakeholderQueries.create({ name: 'Marc Lefort', role: 'IT Director', organization: 'Client Corp', email: 'm.lefort@client.com', influenceLevel: 'high', involvementLevel: 'medium', communicationPreferences: 'Monthly operational committee', projectTopics: 'Infrastructure, security, hosting' });
  const s3 = stakeholderQueries.create({ name: 'Anna Schreiber', role: 'Lead Architect (Infrastructure)', organization: 'CloudArch SARL', email: 'a.schreiber@cloudarch.com', influenceLevel: 'medium', involvementLevel: 'high', communicationPreferences: 'Weekly technical sync', projectTopics: 'Kubernetes setup, firewall rules, network topology' });
  const s4 = stakeholderQueries.create({ name: 'Thomas Renard', role: 'UX Lead', organization: 'UXStudio', email: 't.renard@uxstudio.com', influenceLevel: 'medium', involvementLevel: 'medium', communicationPreferences: 'Design review meetings (bi-weekly)', projectTopics: 'UI/UX design, user testing' });
  stakeholderQueries.create({ name: 'Isabelle Moreau', role: 'Customer Success Manager', organization: 'Client Corp', email: 'i.moreau@client.com', influenceLevel: 'medium', involvementLevel: 'low', communicationPreferences: 'Monthly update', projectTopics: 'Customer impact, UAT participants, communication plan' });

  // Resources
  const r1 = resourceQueries.create({ name: 'Jean-Baptiste Martin', role: 'Project Manager', organization: 'Internal', email: 'jb.martin@company.com', allocationPercent: 80, plannedWorkload: 160, skills: 'Project management, stakeholder management, Agile', projectStartDate: '2026-04-01', projectEndDate: '2026-12-31' });
  const r2 = resourceQueries.create({ name: 'Sophie Leclerc', role: 'Lead Developer', organization: 'Internal', email: 's.leclerc@company.com', allocationPercent: 100, plannedWorkload: 400, skills: 'React, Node.js, PostgreSQL, Azure AD', projectStartDate: '2026-04-01', projectEndDate: '2026-12-31' });
  const r3 = resourceQueries.create({ name: 'Karim Benali', role: 'Backend Developer', organization: 'Internal', email: 'k.benali@company.com', allocationPercent: 100, plannedWorkload: 360, skills: 'Node.js, PostgreSQL, Redis, microservices', projectStartDate: '2026-04-01', projectEndDate: '2026-11-30' });
  const r4 = resourceQueries.create({ name: 'Lucie Vernet', role: 'QA Engineer', organization: 'Internal', email: 'l.vernet@company.com', allocationPercent: 60, plannedWorkload: 180, skills: 'Test automation, Playwright, performance testing, security', projectStartDate: '2026-06-01', projectEndDate: '2026-12-15' });
  const r5 = resourceQueries.create({ name: 'Anna Schreiber', role: 'Infrastructure Engineer', organization: 'CloudArch SARL', email: 'a.schreiber@cloudarch.com', allocationPercent: 30, plannedWorkload: 60, skills: 'Kubernetes, Docker, Azure, networking', projectStartDate: '2026-05-01', projectEndDate: '2026-12-31' });

  // Absences
  const today = new Date();
  const absStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
  const absEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
  absenceQueries.create({ resourceId: r2.id, resourceName: r2.name, type: 'vacation', startDate: absStart.toISOString().split('T')[0], endDate: absEnd.toISOString().split('T')[0], notes: 'Annual leave — pre-approved' });
  const abs2Start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
  const abs2End = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  absenceQueries.create({ resourceId: r5.id, resourceName: r5.name, type: 'business-trip', startDate: abs2Start.toISOString().split('T')[0], endDate: abs2End.toISOString().split('T')[0], notes: 'CloudArch internal summit — partial availability by remote' });
  const abs3Start = new Date(today.getFullYear(), today.getMonth() + 1, 3);
  const abs3End = new Date(today.getFullYear(), today.getMonth() + 1, 7);
  absenceQueries.create({ resourceId: r3.id, resourceName: r3.name, type: 'training', startDate: abs3Start.toISOString().split('T')[0], endDate: abs3End.toISOString().split('T')[0], notes: 'Node.js advanced training — approved by management' });

  // Tasks
  const t1 = taskQueries.create({ title: 'Complete reporting module UI', status: 'in-progress', priority: 'high', owner: 'Sophie Leclerc', dueDate: relDate(7), milestoneId: m3.id, phase: 'Development', estimatedWorkload: 16, remainingWorkload: 8, actualWorkload: 8, description: 'Build the React components for the reporting dashboard. Includes charts, filters, and export buttons.', notes: 'Waiting on UXStudio for the final mockup of the export dialog.' });
  const t2 = taskQueries.create({ title: 'Firewall rules configuration for UAT environment', status: 'blocked', priority: 'critical', owner: 'Anna Schreiber', dueDate: relDate(-3), milestoneId: m3.id, phase: 'Infrastructure', estimatedWorkload: 4, remainingWorkload: 4, actualWorkload: 0, blockingReason: 'Awaiting network security team sign-off from client IT. Ticket #NET-4421 open since 2026-09-08.', description: 'CloudArch needs to configure outbound firewall rules to allow UAT portal to communicate with Azure AD tenant.' });
  const t3 = taskQueries.create({ title: 'Customer data migration dry-run', status: 'planned', priority: 'high', owner: 'Karim Benali', dueDate: relDate(21), milestoneId: m4.id, phase: 'Migration', estimatedWorkload: 24, remainingWorkload: 24, actualWorkload: 0, description: 'Run the migration scripts against a copy of production data to validate correctness and measure duration.', dependencies: t1.id });
  const t4 = taskQueries.create({ title: 'Write API documentation', status: 'in-progress', priority: 'medium', owner: 'Sophie Leclerc', dueDate: relDate(10), milestoneId: m3.id, phase: 'Development', estimatedWorkload: 8, remainingWorkload: 3, actualWorkload: 5 });
  const t5 = taskQueries.create({ title: 'Security audit — OWASP checklist', status: 'planned', priority: 'high', owner: 'Lucie Vernet', dueDate: relDate(30), milestoneId: m4.id, phase: 'Quality', estimatedWorkload: 16, remainingWorkload: 16, actualWorkload: 0 });
  const t6 = taskQueries.create({ title: 'Performance testing — target 2000 concurrent users', status: 'planned', priority: 'high', owner: 'Lucie Vernet', dueDate: relDate(35), milestoneId: m4.id, phase: 'Quality', estimatedWorkload: 20, remainingWorkload: 20, actualWorkload: 0 });
  taskQueries.create({ title: 'Admin panel — user management screens', status: 'done', priority: 'medium', owner: 'Sophie Leclerc', dueDate: relDate(-10), milestoneId: m3.id, phase: 'Development', estimatedWorkload: 12, remainingWorkload: 0, actualWorkload: 14 });
  taskQueries.create({ title: 'Azure AD SSO integration', status: 'done', priority: 'critical', owner: 'Sophie Leclerc', dueDate: relDate(-30), milestoneId: m2.id, phase: 'Development', estimatedWorkload: 20, remainingWorkload: 0, actualWorkload: 22 });
  taskQueries.create({ title: 'Database schema migration v1 → v2', status: 'done', priority: 'high', owner: 'Karim Benali', dueDate: relDate(-45), milestoneId: m2.id, phase: 'Migration', estimatedWorkload: 16, remainingWorkload: 0, actualWorkload: 18 });
  taskQueries.create({ title: 'Identify UAT pilot customers (target: 50)', status: 'waiting', priority: 'medium', owner: 'Jean-Baptiste Martin', dueDate: relDate(14), milestoneId: m4.id, phase: 'Planning', estimatedWorkload: 4, remainingWorkload: 4, actualWorkload: 0, blockingReason: 'Waiting for Isabelle Moreau (Customer Success) to confirm participant list' });
  taskQueries.create({ title: 'Prepare production cutover runbook', status: 'planned', priority: 'high', owner: 'Jean-Baptiste Martin', dueDate: relDate(50), milestoneId: m5.id, phase: 'Planning', estimatedWorkload: 12, remainingWorkload: 12, actualWorkload: 0 });
  taskQueries.create({ title: 'Mobile responsiveness — customer dashboard', status: 'in-progress', priority: 'medium', owner: 'Sophie Leclerc', dueDate: relDate(5), milestoneId: m3.id, phase: 'Development', estimatedWorkload: 8, remainingWorkload: 3, actualWorkload: 5 });

  // Backlog
  taskQueries.create({ title: 'Dark mode support for customer portal', isBacklog: true, priority: 'low', backlogPriority: 3, businessValue: 'medium', effort: 'medium', description: 'Customer request from pilot feedback. Nice-to-have for v1.1.' });
  taskQueries.create({ title: 'Export to Excel — reporting module', isBacklog: true, priority: 'medium', backlogPriority: 1, businessValue: 'high', effort: 'low', description: 'Finance team requires Excel export for monthly reports. Quick win.' });
  taskQueries.create({ title: 'Audit log UI — admin panel', isBacklog: true, priority: 'medium', backlogPriority: 2, businessValue: 'high', effort: 'medium', description: 'Show login/action history per customer. Compliance requirement for v1.1.' });
  taskQueries.create({ title: 'Two-factor authentication (TOTP)', isBacklog: true, priority: 'high', backlogPriority: 1, businessValue: 'high', effort: 'high', description: 'Security roadmap item. Required for some enterprise customers.' });

  // Risks
  const ri1 = riskQueries.create({ title: 'Firewall delay impacts Phase 3 deadline', description: 'The UAT environment firewall rules have been pending approval from client IT for 9 days. If not resolved this week, Phase 3 delivery to client is at risk.', category: 'Infrastructure', probability: 4, impact: 5, severity: 'critical', owner: 'Jean-Baptiste Martin', mitigationStrategy: 'Daily follow-up with Marc Lefort (IT Director). Escalation to Claire Fontaine scheduled for 2026-09-19 if unresolved.', status: 'identified', targetResolutionDate: relDate(3), relatedMilestoneId: m3.id });
  const ri2 = riskQueries.create({ title: 'Lead developer absence during critical sprint', description: 'Sophie Leclerc (Lead Dev) is on leave Sep 22-Oct 1. The reporting module and mobile UI tasks are not yet completed.', category: 'Resources', probability: 5, impact: 4, severity: 'critical', owner: 'Jean-Baptiste Martin', mitigationStrategy: 'Karim Benali to take partial ownership. Sprint replanning to move lower-priority items. Consider bringing in backup developer.', status: 'identified', relatedMilestoneId: m3.id });
  riskQueries.create({ title: 'Data migration duration underestimated', description: 'Initial estimate was 4 hours for full migration. Dry-run benchmark suggests 7-10 hours depending on data volume growth.', category: 'Technical', probability: 3, impact: 4, severity: 'high', owner: 'Karim Benali', mitigationStrategy: 'Plan cutover window for Friday night (72h available). Optimize migration scripts. Test with subset first.', contingencyPlan: 'Rollback procedure tested and documented. Legacy system kept running in parallel for 2 weeks post-cutover.', status: 'analysed', relatedMilestoneId: m5.id });
  riskQueries.create({ title: 'UAT pilot customers not available in time', description: 'Customer Success team needs to confirm 50 pilot customers. Current list has only 23 confirmed.', category: 'Business', probability: 3, impact: 3, severity: 'medium', owner: 'Jean-Baptiste Martin', mitigationStrategy: 'Reduce UAT panel to 30 if necessary. Prioritize enterprise customers.', status: 'identified', relatedMilestoneId: m4.id });
  riskQueries.create({ title: 'Security audit reveals critical vulnerabilities', description: 'OWASP audit scheduled. If critical issues are found, remediation could delay UAT start.', category: 'Security', probability: 2, impact: 5, severity: 'high', owner: 'Lucie Vernet', mitigationStrategy: 'Proactive code review. Running SAST tools (Semgrep) in CI pipeline. Early fixes of known issues.', status: 'identified', relatedMilestoneId: m4.id });

  // Issues
  const iss1 = issueQueries.create({ title: 'UAT environment inaccessible — firewall blocked', description: 'The UAT portal cannot reach Azure AD tenant for authentication. All SSO tests are blocked.', impact: 'Phase 3 testing fully blocked. No UAT can begin until resolved. Risk of 2-3 week delay.', severity: 'critical', owner: 'Jean-Baptiste Martin', detectedDate: relDate(-9), resolutionTarget: relDate(2), resolutionActions: '1. Ticket #NET-4421 raised with client IT\n2. Marc Lefort (IT Director) notified by email\n3. Escalation email to Claire Fontaine drafted', status: 'open', escalationStatus: 'Escalation to CTO pending (2026-09-19)' });
  issueQueries.create({ title: 'Reporting module performance — P95 response >8s', description: 'The new reporting module queries are too slow for large datasets (>100k rows). P95 response time is 8.3 seconds.', impact: 'Fails performance SLA (target: P95 < 2s). Blocker for Phase 4 performance testing.', severity: 'high', owner: 'Karim Benali', detectedDate: relDate(-5), resolutionTarget: relDate(10), resolutionActions: 'Query optimization in progress. Adding database indexes. Considering pagination + async export.', status: 'in-progress' });

  // Decisions
  const d1 = decisionQueries.create({ title: 'Go/No-Go: Phase 3 delivery to client on 2026-09-30', context: 'Phase 3 MVP delivery date is 2026-09-30. The firewall issue and lead dev absence put this at risk. Need to decide whether to proceed, request an extension, or do a partial delivery.', decisionRequired: 'Decision by 2026-09-22: Full delivery on Sept 30 | Partial delivery (portal without reporting module) | Request 2-week extension to Oct 14', alternativesConsidered: '1. Full delivery on Sept 30 — risky but maintains commitment\n2. Partial delivery without reporting — possible if firewall resolved by Sept 25\n3. Request 2-week extension — client impact unknown', status: 'decision-required', owner: 'Jean-Baptiste Martin', deadline: relDate(5), relatedMilestoneId: m3.id });
  decisionQueries.create({ title: 'Backup developer allocation for Sophie leave period', context: 'Sophie Leclerc is on leave Sep 22 - Oct 1. The reporting module has 8 days of work remaining. Karim Benali cannot cover fully due to migration script work.', decisionRequired: 'Allocate freelance backup developer (budget +€8k) or accept reduced sprint velocity?', status: 'under-discussion', owner: 'Jean-Baptiste Martin', deadline: relDate(4) });
  decisionQueries.create({ title: 'Production cutover strategy — full vs. phased migration', context: 'Two options for production cutover: (A) Full cutover in single maintenance window, (B) Phased rollout with traffic split using feature flags.', decisionRequired: 'Select cutover strategy by 2026-11-01 (required for runbook preparation)', finalDecision: '', status: 'proposed', owner: 'Jean-Baptiste Martin', deadline: relDate(45), relatedMilestoneId: m5.id });
  decisionQueries.create({ title: 'Azure AD tenant — dedicated or shared?', context: 'Infrastructure decision: should the portal use the client\'s existing Azure AD tenant or create a dedicated one for isolation?', finalDecision: 'Use existing Azure AD tenant with dedicated App Registration. Agreed with Marc Lefort and Anna Schreiber on 2026-05-12.', status: 'approved', owner: 'Anna Schreiber', decisionDate: '2026-05-12' });

  // Actions
  const act1 = actionQueries.create({ action: 'Follow up with Marc Lefort on firewall ticket #NET-4421', owner: 'Jean-Baptiste Martin', dueDate: relDate(1), status: 'open', source: 'Weekly Project Sync' });
  const act2 = actionQueries.create({ action: 'Send escalation email to Claire Fontaine if firewall not resolved by Sept 19', owner: 'Jean-Baptiste Martin', dueDate: relDate(2), status: 'open', source: 'Weekly Project Sync' });
  const act3 = actionQueries.create({ action: 'Ask Karim to benchmark reporting queries with indexes', owner: 'Jean-Baptiste Martin', dueDate: relDate(1), status: 'open', source: 'Weekly Project Sync' });
  actionQueries.create({ action: 'Prepare sprint replanning for Sophie\'s absence period', owner: 'Jean-Baptiste Martin', dueDate: relDate(4), status: 'open', source: 'Risk: Lead developer absence' });
  actionQueries.create({ action: 'Confirm with Isabelle Moreau — UAT pilot customer list status', owner: 'Jean-Baptiste Martin', dueDate: relDate(3), status: 'open', source: 'Task: Identify UAT pilot customers' });
  actionQueries.create({ action: 'Review Thomas Renard\'s export dialog mockup', owner: 'Jean-Baptiste Martin', dueDate: relDate(2), status: 'in-progress', source: 'Task: Complete reporting module UI' });
  actionQueries.create({ action: 'Update project status report for steering committee', owner: 'Jean-Baptiste Martin', dueDate: relDate(6), status: 'open', source: 'Steering Committee 2026-09-24' });

  // Communications
  communicationQueries.create({ subject: 'Firewall rules configuration — UAT environment (Ticket #NET-4421)', type: 'email', sender: 'Jean-Baptiste Martin', recipients: 'Marc Lefort, Anna Schreiber', date: relDate(-9), channel: 'Email', summary: 'Formal request to client IT to configure outbound firewall rules for UAT → Azure AD communication.', informationRequested: 'Confirmation of firewall rule activation and timeline', expectedResponse: 'Firewall rules active, confirmation with timeline', expectedResponseDate: relDate(-6), status: 'awaiting-response', followUpRequired: true, nextFollowUpDate: relDate(1) });
  communicationQueries.create({ subject: 'Phase 3 status update — September 2026', type: 'email', sender: 'Jean-Baptiste Martin', recipients: 'Claire Fontaine, Marc Lefort', date: relDate(-7), channel: 'Email', summary: 'Weekly project status email. Phase 3 at risk due to infrastructure issue. Mitigation plan provided.', informationSent: 'Status dashboard, updated milestone plan, risk summary', status: 'sent', followUpRequired: false });
  communicationQueries.create({ subject: 'Export dialog UI mockup — reporting module', type: 'teams', sender: 'Jean-Baptiste Martin', recipients: 'Thomas Renard', date: relDate(-4), channel: 'Teams', summary: 'Requested final mockup for export dialog component. UXStudio to deliver by end of week.', informationRequested: 'Final mockup for export dialog (CSV, PDF, Excel)', expectedResponseDate: relDate(2), status: 'awaiting-response', followUpRequired: true, nextFollowUpDate: relDate(2) });
  communicationQueries.create({ subject: 'UAT pilot customer list — confirmation needed', type: 'email', sender: 'Jean-Baptiste Martin', recipients: 'Isabelle Moreau', date: relDate(-3), channel: 'Email', summary: 'Requested confirmation of 50 pilot customers for UAT phase. Currently 23 confirmed.', informationRequested: 'Complete list of 50 UAT participants with contact information', expectedResponseDate: relDate(4), status: 'awaiting-response', followUpRequired: true, nextFollowUpDate: relDate(4) });
  communicationQueries.create({ subject: 'SSO integration — Azure AD App Registration approved', type: 'email', sender: 'Marc Lefort', recipients: 'Jean-Baptiste Martin, Sophie Leclerc', date: relDate(-45), channel: 'Email', summary: 'Client IT confirms Azure AD App Registration is approved and credentials sent to Sophie.', actualResponse: 'App registration approved. Credentials sent to Sophie Leclerc. Note: Production tenant requires additional approval in November.', responseDate: relDate(-45), status: 'response-received', followUpRequired: false });

  // Meetings
  const mtg1 = meetingQueries.create({
    title: 'Weekly Project Sync — Week 37',
    date: relDate(-4),
    type: 'project-meeting',
    participants: 'Jean-Baptiste Martin, Sophie Leclerc, Karim Benali, Lucie Vernet',
    agenda: '1. Phase 3 progress update\n2. Firewall issue status\n3. Reporting module performance issue\n4. Sprint planning for next week',
    notes: '## Progress\n- Reporting module UI: 8 days remaining (Sophie)\n- Mobile responsiveness: 60% done (Sophie)\n- Migration dry-run script: ready for testing (Karim)\n\n## Firewall Issue\nStill blocked. JB to escalate if not resolved by Sept 19.\n\n## Performance Issue\nKarim found 3 unindexed queries. Fix in progress, should reduce P95 from 8.3s to <3s.',
    decisions: 'Escalate firewall to CTO on Sept 19 if unresolved.',
    actions: 'JB: Follow up with Marc daily\nKarim: Apply index fix and re-benchmark\nSophie: Complete reporting UI before leave',
    risksIdentified: 'Resource risk during Sophie leave period (Sept 22 - Oct 1)',
    blockersIdentified: 'Firewall rules — UAT environment fully blocked',
    relatedActionIds: `${act1.id},${act2.id},${act3.id}`,
    relatedTaskIds: `${t1.id},${t2.id}`,
    relatedDecisionIds: `${d1.id}`,
  });
  actionQueries.update(act1.id, { relatedMeetingId: mtg1.id });
  actionQueries.update(act2.id, { relatedMeetingId: mtg1.id });
  actionQueries.update(act3.id, { relatedMeetingId: mtg1.id });
  decisionQueries.update(d1.id, { relatedMeetingId: mtg1.id });

  meetingQueries.create({
    title: 'Steering Committee — September 2026',
    date: relDate(7),
    type: 'steering-committee',
    participants: 'Claire Fontaine, Marc Lefort, Jean-Baptiste Martin',
    agenda: '1. Phase 3 status and risks\n2. Go/No-Go decision for Sept 30 delivery\n3. Phase 4 planning\n4. Budget review',
    notes: '',
    decisions: '',
    actions: '',
    relatedDecisionIds: `${d1.id}`,
    relatedTaskIds: `${t1.id}`,
  });

  // Notes
  noteQueries.create({ title: 'Key contacts & escalation path', category: 'organization', isPinned: true, content: '## Client escalation path\n1. **First point of contact**: Marc Lefort (IT Director) — m.lefort@client.com\n2. **Escalation**: Claire Fontaine (CTO) — c.fontaine@client.com\n3. **Emergency**: Direct call to Claire +33 6 XX XX XX XX\n\n## CloudArch escalation\n1. Anna Schreiber (direct) — a.schreiber@cloudarch.com\n2. Pierre Duval (Account Manager) — p.duval@cloudarch.com\n\n## Internal escalation\n1. JB Martin (PM)\n2. Direction if budget impact > €20k\n\n## Important: Always CC Marc Lefort on infrastructure emails.' });
  noteQueries.create({ title: 'Azure AD App Registration details', category: 'technical', content: '## Production App Registration\n- **Tenant ID**: `f4a2b1c9-...` (see vault)\n- **Client ID**: `e9d3a7f2-...` (see vault)\n- **Redirect URIs**: https://portal.client.com/auth/callback\n- **Scopes**: openid, profile, email, User.Read\n\n## UAT App Registration\n- **Tenant ID**: same\n- **Client ID**: `c7b5d2e1-...`\n- **Redirect URIs**: https://uat-portal.client.com/auth/callback\n\n## Notes\n- Production approval needed from Marc Lefort before Nov 1\n- Certificates rotate annually (next: Jan 2027)' });
  noteQueries.create({ title: 'Architecture decisions log (informal)', category: 'technical', content: '## Key decisions\n\n| Decision | Date | Reasoning |\n|---|---|---|\n| Next.js (App Router) over CRA | Apr 2026 | SSR for SEO, better perf |\n| PostgreSQL over MongoDB | Apr 2026 | Data integrity, JOINs needed |\n| Kubernetes on Azure AKS | May 2026 | Scalability, client existing infra |\n| Redis for session store | Jun 2026 | Fast auth lookups, TTL support |\n| Playwright for E2E tests | Jun 2026 | Better DX than Cypress, TS native |\n\n## Rejected options\n- GraphQL API: Rejected (team unfamiliar, timeline risk)\n- MongoDB: Rejected (data integrity concerns for financial records)' });

  // Activity log
  activityQueries.log('milestone', m1.id, m1.name, 'completed', 'Phase 1 marked complete');
  activityQueries.log('milestone', m2.id, m2.name, 'completed', 'Phase 2 marked complete — SSO integration delivered');
  activityQueries.log('risk', ri1.id, ri1.title, 'created', 'Critical risk identified — firewall delay');
  activityQueries.log('issue', iss1.id, iss1.title, 'created', 'Critical blocker — UAT environment inaccessible');
  activityQueries.log('decision', d1.id, d1.title, 'escalated', 'Decision required by Sept 22');
  activityQueries.log('task', t2.id, t2.title, 'blocked', 'Blocked: awaiting firewall approval');
  activityQueries.log('task', t4.id, t4.title, 'updated', 'API documentation 62% complete');
}

function relDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function seedWeeklyReviewsIfEmpty(): void {
  try {
    const existing = weeklyReviewQueries.getAll();
    if (existing.length > 0) return;

    // Week 36 (Completed)
    weeklyReviewQueries.create({
      weekNumber: 36,
      year: 2026,
      periodStart: '2026-08-31',
      periodEnd: '2026-09-06',
      status: 'completed',
      overallHealth: 'on-track',
      summary: 'Sprint 5 review: Backend API v1 benchmarks completed successfully. Security scan resolved all high priority findings. Azure AD SSO authentication pull request merged cleanly into develop.',
      achievements: '- Merged Azure AD SSO pull request into develop with full test coverage\n- Completed automated migration script for 120k+ customer contact records\n- Finalized UX wireframes and interactive prototypes with UXStudio\n- Executed internal code review for core data access layer',
      prioritiesNextWeek: '- Prepare UAT deployment environment on Azure AKS\n- Request client IT outbound firewall rules for UAT → Azure AD handshake\n- Kick off work on reporting module and export UI components',
      blockersNotes: 'No critical blockers recorded this week.',
      snapshotJson: JSON.stringify({
        totalTasks: 16,
        completedTasks: 6,
        inProgressTasks: 5,
        blockedTasks: 0,
        overdueTasks: 0,
        activeRisks: 2,
        criticalRisks: 0,
        activeIssues: 1,
        pendingDecisions: 1,
        upcomingMilestones: 1,
        awaitingCommunications: 1,
        completedTaskTitles: [
          'Azure AD SSO integration module',
          'Database migration script for customer contacts',
          'Customer portal wireframes sign-off',
          'PostgreSQL schema indexing & constraints',
          'Security vulnerability scan & remediation',
          'Redis session caching setup',
        ],
        inProgressTaskTitles: [
          'Reporting module API endpoints',
          'Mobile responsive CSS polish',
          'UAT deployment manifests for Kubernetes',
        ],
        blockedTaskTitles: [],
        openIssueTitles: ['Session timeout bug on Safari mobile'],
        criticalRiskTitles: [],
      }),
    });

    // Week 37 (Completed)
    weeklyReviewQueries.create({
      weekNumber: 37,
      year: 2026,
      periodStart: '2026-09-07',
      periodEnd: '2026-09-13',
      status: 'completed',
      overallHealth: 'at-risk',
      summary: 'Encountered unexpected network firewall blocking on UAT cluster preventing Azure AD handshake (Ticket #NET-4421). Phase 3 MVP milestone is now under scrutiny. Development continues in local and SIT environments.',
      achievements: '- Reporting module UI components 70% completed\n- Pilot customer list initiated with 23 confirmed pilot accounts\n- Database migration dry-run executed on staging without record loss\n- API documentation written for developer partner integration',
      prioritiesNextWeek: '- Resolve firewall blocker ticket #NET-4421 with client IT (Marc Lefort)\n- Address reporting module query performance (P95 latency currently 8.3s)\n- Send weekly status update to CTO Claire Fontaine\n- Prepare for steering committee meeting',
      blockersNotes: 'Ticket #NET-4421 awaiting client IT response. UAT deployment fully blocked.',
      snapshotJson: JSON.stringify({
        totalTasks: 18,
        completedTasks: 5,
        inProgressTasks: 6,
        blockedTasks: 2,
        overdueTasks: 1,
        activeRisks: 3,
        criticalRisks: 1,
        activeIssues: 2,
        pendingDecisions: 2,
        upcomingMilestones: 1,
        awaitingCommunications: 3,
        completedTaskTitles: [
          'Reporting module data tables',
          'Customer profile view page',
          'Automated Playwright test harness',
          'Staging migration dry run script',
          'Partner API documentation draft',
        ],
        inProgressTaskTitles: [
          'Reporting module export dialog',
          'Mobile navigation menu responsive tuning',
          'UAT cluster deployment verification',
        ],
        blockedTaskTitles: [
          'Deploy to UAT environment (Blocked by firewall #NET-4421)',
          'External partner OAuth validation',
        ],
        openIssueTitles: [
          'UAT environment inaccessible (firewall blocking)',
          'Reporting module query latency (P95 > 8s)',
        ],
        criticalRiskTitles: ['Firewall configuration delay impacting Phase 3 delivery'],
      }),
    });

    // Week 38 (Current - Draft)
    weeklyReviewQueries.create({
      weekNumber: 38,
      year: 2026,
      periodStart: '2026-09-14',
      periodEnd: '2026-09-20',
      status: 'draft',
      overallHealth: 'at-risk',
      summary: 'Current week review: Active follow-up with Marc Lefort on firewall ticket. Escalation planned for Friday if no progress. Karim Benali identified 3 unindexed queries to solve reporting latency.',
      achievements: '- Identified database index optimizations reducing reporting queries by 65%\n- Drafted Steering Committee agenda and presentation pack\n- Finalized export modal UI with UXStudio',
      prioritiesNextWeek: '- Obtain sign-off on firewall configuration\n- Deliver Phase 3 customer portal MVP\n- Conduct dry run with pilot group users\n- Present status at Steering Committee on Sept 24',
      blockersNotes: 'Firewall rules configuration — UAT environment still pending.',
      snapshotJson: JSON.stringify({
        totalTasks: 20,
        completedTasks: 4,
        inProgressTasks: 5,
        blockedTasks: 2,
        overdueTasks: 2,
        activeRisks: 3,
        criticalRisks: 1,
        activeIssues: 2,
        pendingDecisions: 2,
        upcomingMilestones: 1,
        awaitingCommunications: 2,
        completedTaskTitles: [
          'Reporting module query optimization indices',
          'Export modal UI layout',
          'Steering committee briefing slide deck',
          'Customer search debounce optimization',
        ],
        inProgressTaskTitles: [
          'Phase 3 customer portal MVP acceptance testing',
          'Export dialog backend endpoints',
          'UAT environment smoke tests',
        ],
        blockedTaskTitles: ['Deploy to UAT environment (Ticket #NET-4421)'],
        openIssueTitles: ['Firewall rules configuration pending'],
        criticalRiskTitles: ['Phase 3 MVP delay risk'],
      }),
    });
  } catch (err) {
    console.error('Failed to seed weekly reviews:', err);
  }
}

export function seedBudgetIfEmpty(): void {
  try {
    const existing = budgetItemQueries.getAll();
    if (existing.length > 0) return;

    // OPEX — Resources (internal team)
    budgetItemQueries.create({ category: 'Team', description: 'Project Manager — JB Martin (80% allocation, 9 months)', type: 'opex', vendor: 'Internal', plannedAmount: 54000, actualAmount: 36000, forecastAmount: 54000, currency: 'EUR', status: 'committed', phase: 'All Phases' });
    budgetItemQueries.create({ category: 'Team', description: 'Lead Developer — Sophie Leclerc (100% allocation, 9 months)', type: 'opex', vendor: 'Internal', plannedAmount: 81000, actualAmount: 54000, forecastAmount: 81000, currency: 'EUR', status: 'committed', phase: 'All Phases' });
    budgetItemQueries.create({ category: 'Team', description: 'Backend Developer — Karim Benali (100% allocation, 8 months)', type: 'opex', vendor: 'Internal', plannedAmount: 64000, actualAmount: 42000, forecastAmount: 64000, currency: 'EUR', status: 'committed', phase: 'Phase 2–4' });
    budgetItemQueries.create({ category: 'Team', description: 'QA Engineer — Lucie Vernet (60% allocation, 7 months)', type: 'opex', vendor: 'Internal', plannedAmount: 29400, actualAmount: 8400, forecastAmount: 29400, currency: 'EUR', status: 'planned', phase: 'Phase 3–5' });

    // CAPEX — Infrastructure
    budgetItemQueries.create({ category: 'Infrastructure', description: 'Azure AKS Kubernetes cluster — DEV + SIT + UAT environments', type: 'capex', vendor: 'Microsoft Azure', plannedAmount: 18000, actualAmount: 9000, forecastAmount: 19500, currency: 'EUR', status: 'committed', phase: 'Phase 1–5', purchaseOrder: 'PO-2026-031', notes: 'Forecast slightly above plan due to additional dev cluster usage' });
    budgetItemQueries.create({ category: 'Infrastructure', description: 'Azure AD production tenant — SSO integration licensing', type: 'capex', vendor: 'Microsoft', plannedAmount: 4800, actualAmount: 4800, forecastAmount: 4800, currency: 'EUR', status: 'paid', phase: 'Phase 2', purchaseOrder: 'PO-2026-018', invoiceDate: relDate(-90), paymentDate: relDate(-75) });
    budgetItemQueries.create({ category: 'Infrastructure', description: 'PostgreSQL production managed DB — Azure Database service', type: 'capex', vendor: 'Microsoft Azure', plannedAmount: 7200, actualAmount: 3600, forecastAmount: 7200, currency: 'EUR', status: 'committed', phase: 'Phase 3–5' });

    // License costs
    budgetItemQueries.create({ category: 'Licenses', description: 'Playwright Enterprise license — test automation', type: 'license', vendor: 'Microsoft', plannedAmount: 1200, actualAmount: 1200, forecastAmount: 1200, currency: 'EUR', status: 'paid', phase: 'Phase 3', invoiceDate: relDate(-60), paymentDate: relDate(-55) });
    budgetItemQueries.create({ category: 'Licenses', description: 'DataMig Pro license — customer record migration tooling', type: 'license', vendor: 'DataMig Inc.', plannedAmount: 9000, actualAmount: 9000, forecastAmount: 9000, currency: 'EUR', status: 'paid', phase: 'Phase 5', purchaseOrder: 'PO-2026-022', invoiceDate: relDate(-30), paymentDate: relDate(-25) });

    // Consulting / External
    budgetItemQueries.create({ category: 'Consulting', description: 'UXStudio — UX design & prototyping (Phase 1–3)', type: 'consulting', vendor: 'UXStudio', plannedAmount: 22000, actualAmount: 18000, forecastAmount: 22000, currency: 'EUR', status: 'invoiced', phase: 'Phase 1–3', purchaseOrder: 'PO-2026-012', invoiceDate: relDate(-14) });
    budgetItemQueries.create({ category: 'Consulting', description: 'CloudArch SARL — Infrastructure architecture (30% allocation)', type: 'consulting', vendor: 'CloudArch SARL', plannedAmount: 15000, actualAmount: 9000, forecastAmount: 16500, currency: 'EUR', status: 'committed', phase: 'Phase 1–5', notes: 'Overage of €1500 expected for additional firewall troubleshooting work' });
    budgetItemQueries.create({ category: 'Consulting', description: 'Security audit — external penetration testing', type: 'consulting', vendor: 'SecureOps Ltd.', plannedAmount: 8000, actualAmount: 0, forecastAmount: 8000, currency: 'EUR', status: 'planned', phase: 'Phase 4', notes: 'Scheduled for UAT phase before production release' });

    // Contingency reserve
    budgetItemQueries.create({ category: 'Reserve', description: 'Contingency reserve (10% of total budget)', type: 'other', vendor: 'N/A', plannedAmount: 31400, actualAmount: 0, forecastAmount: 31400, currency: 'EUR', status: 'planned', phase: 'All Phases', notes: 'Contingency reserve to be released by project sponsor approval only' });
  } catch (err) {
    console.error('Failed to seed budget items:', err);
  }
}

export function seedChangeRequestsIfEmpty(): void {
  try {
    const existing = changeRequestQueries.getAll();
    if (existing.length > 0) return;

    changeRequestQueries.create({
      title: 'Add multi-language support (EN/FR) to customer portal',
      description: 'Client has requested French language support be added to the customer portal MVP. Originally out of scope, but customer satisfaction surveys indicate 34% of users prefer French UI.',
      category: 'scope',
      requestor: 'Isabelle Moreau (Customer Success)',
      requestDate: relDate(-18),
      priority: 'medium',
      status: 'under-review',
      impactScope: 'Adds i18n/l10n layer to all portal screens (approx. 85 text keys). Requires translation workflow and QA pass in both languages.',
      impactSchedule: 'Estimated +3 weeks to Phase 3 delivery if approved. Phase 4 UAT must include French-speaking test users.',
      impactBudget: 'Estimated +€12,000 (translation services €4k, developer effort €6k, QA €2k)',
      impactResources: 'Sophie Leclerc and Lucie Vernet will need to reprioritize scope for 3 weeks.',
      impactRisk: 'Risk of rework if translation keys are added post-development.',
      estimatedCost: 12000,
      estimatedDurationDays: 21,
      justification: 'Customer data shows 34% prefer French. Customer satisfaction is a KPI for project success. Risk of negative adoption post-launch.',
      alternatives: '1. Add French only to authentication screens (lower effort, partial solution).\n2. Defer to v2 release post-launch.',
      recommendation: 'Approve scope change with schedule extension to Oct 21. Reject if PM board cannot accept schedule impact.',
      approver: 'Claire Fontaine',
      notes: 'Steering committee to decide on Sept 24.',
    });

    changeRequestQueries.create({
      title: 'Migrate production database to Azure Flexible Server (PostgreSQL 15)',
      description: 'The original architecture spec selected PostgreSQL 13 on Azure Database. Microsoft has announced end-of-life for Pg13 in November 2026. Client IT requests migration to PostgreSQL 15 Flexible Server before production go-live.',
      category: 'technical',
      requestor: 'Marc Lefort (IT Director)',
      requestDate: relDate(-10),
      priority: 'high',
      status: 'approved',
      impactScope: 'No functional scope change. Minor schema adjustments required for Pg15 compatibility.',
      impactSchedule: 'Estimated +1 week for migration scripts and validation. Can overlap with Phase 4 UAT.',
      impactBudget: 'Negligible — Azure Flexible Server pricing similar to original plan. Estimated +€800/year.',
      impactResources: 'Karim Benali to lead DB migration. Anna Schreiber (CloudArch) to validate AKS configuration.',
      impactRisk: 'Low risk. Migration scripts already drafted. Full rollback plan available.',
      estimatedCost: 800,
      estimatedDurationDays: 7,
      justification: 'Required for production stability and security compliance. PostgreSQL 13 EOL before project end date.',
      alternatives: '1. Proceed with PostgreSQL 13 and plan migration in v2 post-launch (high risk).\n2. Use AWS RDS instead (not accepted — client is Azure-only).',
      recommendation: 'Approve immediately. Low risk, high necessity, minimal schedule impact.',
      approver: 'Jean-Baptiste Martin',
      approvalDate: relDate(-5),
      decisionNotes: 'Approved by PM. Client IT and CloudArch notified. Migration sprint added to Week 40.',
    });

    changeRequestQueries.create({
      title: 'Scope reduction — defer admin panel to Phase 6 post-launch',
      description: 'Due to Phase 3 schedule pressure caused by the firewall issue, the team proposes deferring the internal admin panel (user management, audit logs, role configuration) to a post-launch Phase 6. Customer-facing features remain unaffected.',
      category: 'scope',
      requestor: 'Jean-Baptiste Martin (PM)',
      requestDate: relDate(-4),
      priority: 'critical',
      status: 'submitted',
      impactScope: 'Admin panel (user management, role editor, audit logs UI) deferred. External customer features unaffected. Internal administrators will use direct DB access temporarily.',
      impactSchedule: 'Saves 2 weeks on Phase 3. Enables Phase 3 MVP delivery on Sept 30 deadline.',
      impactBudget: 'Phase 3 saves approx. €6,000 (10 days dev effort). Phase 6 cost TBD.',
      impactResources: 'Sophie Leclerc freed up for mobile responsiveness and UAT support.',
      impactRisk: 'Admin operations manually managed during interim period. Risk: IT team must be briefed on manual procedures.',
      estimatedCost: -6000,
      estimatedDurationDays: -14,
      justification: 'Admin panel is internal-only. Deferring keeps the September 30 milestone intact and reduces risk of full Phase 3 failure.',
      alternatives: '1. Keep scope and request 2-week extension to Phase 3 deadline.\n2. Bring in a contractor for admin panel (additional €15k).',
      recommendation: 'Approve scope reduction. Admin panel to be scheduled in Phase 6 with separate budget request.',
      approver: 'Claire Fontaine',
      notes: 'Awaiting sponsor approval. Steering committee Sept 24 is the decision point.',
    });
  } catch (err) {
    console.error('Failed to seed change requests:', err);
  }
}

export function seedStakeholderAbsencesIfEmpty(): void {
  try {
    const allAbsences = absenceQueries.getAll();
    const allStakeholders = stakeholderQueries.getAll();
    if (allStakeholders.length === 0) return;

    const hasStakeholderAbsence = allAbsences.some(a =>
      allStakeholders.some(s => s.id === a.resourceId)
    );

    if (!hasStakeholderAbsence) {
      const claire = allStakeholders.find(s => s.name.includes('Claire Fontaine')) || allStakeholders[0];
      const today = new Date();
      // Claire Fontaine away Sept 27 to Oct 03 (overlapping with Sept 30 MVP milestone!)
      const s1Start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);
      const s1End = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 16);
      absenceQueries.create({
        resourceId: claire.id,
        resourceName: claire.name,
        type: 'vacation',
        startDate: s1Start.toISOString().split('T')[0],
        endDate: s1End.toISOString().split('T')[0],
        notes: 'Executive retreat & annual leave — Steering Committee sign-off delegate: Marc Lefort',
      });

      const marc = allStakeholders.find(s => s.name.includes('Marc Lefort'));
      if (marc) {
        const s2Start = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
        const s2End = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
        absenceQueries.create({
          resourceId: marc.id,
          resourceName: marc.name,
          type: 'business-trip',
          startDate: s2Start.toISOString().split('T')[0],
          endDate: s2End.toISOString().split('T')[0],
          notes: 'Paris Tech Summit — available via mobile for emergencies',
        });
      }
    }
  } catch (err) {
    console.error('Failed to seed stakeholder absences:', err);
  }
}
