import { create } from 'zustand';
import type { Milestone, Risk, Issue, Decision, Action, Communication, Stakeholder, Resource, Absence, Meeting, Note, ActivityLog, ProjectConfig, WeeklyReview, BudgetItem, ChangeRequest, PortfolioProject } from '../types';
import {
  milestoneQueries, riskQueries, issueQueries, decisionQueries, actionQueries,
  communicationQueries, stakeholderQueries, resourceQueries, absenceQueries,
  meetingQueries, noteQueries, activityQueries, projectConfigQueries, weeklyReviewQueries,
  budgetItemQueries, changeRequestQueries, portfolioQueries,
} from '../db/queries';
import { useTaskStore } from './useTaskStore';

interface DataState {
  projectConfig: ProjectConfig | null;
  milestones: Milestone[];
  risks: Risk[];
  issues: Issue[];
  decisions: Decision[];
  actions: Action[];
  communications: Communication[];
  stakeholders: Stakeholder[];
  resources: Resource[];
  absences: Absence[];
  meetings: Meeting[];
  notes: Note[];
  activityLog: ActivityLog[];
  weeklyReviews: WeeklyReview[];
  budgetItems: BudgetItem[];
  changeRequests: ChangeRequest[];
  portfolioProjects: PortfolioProject[];
  isLoaded: boolean;

  loadAll: () => void;
  loadProjectConfig: () => void;
  updateProjectConfig: (data: Record<string, string>) => void;
  loadMilestones: () => void;
  loadRisks: () => void;
  loadIssues: () => void;
  loadDecisions: () => void;
  loadActions: () => void;
  loadCommunications: () => void;
  loadStakeholders: () => void;
  loadResources: () => void;
  loadAbsences: () => void;
  loadMeetings: () => void;
  loadNotes: () => void;
  loadActivity: () => void;
  loadWeeklyReviews: () => void;
  loadBudgetItems: () => void;
  loadChangeRequests: () => void;
  loadPortfolioProjects: () => void;

  createPortfolioProject: (p: Partial<PortfolioProject>) => PortfolioProject;
  updatePortfolioProject: (id: string, u: Partial<PortfolioProject>) => void;
  deletePortfolioProject: (id: string) => void;
  revertActivity: (activityId: string) => { success: boolean; message: string };


  // Weekly Reviews
  createWeeklyReview: (w: Partial<WeeklyReview>) => WeeklyReview;
  updateWeeklyReview: (id: string, u: Partial<WeeklyReview>) => void;
  deleteWeeklyReview: (id: string) => void;

  // Budget Items
  createBudgetItem: (b: Partial<BudgetItem>) => BudgetItem;
  updateBudgetItem: (id: string, u: Partial<BudgetItem>) => void;
  deleteBudgetItem: (id: string) => void;

  // Change Requests
  createChangeRequest: (c: Partial<ChangeRequest>) => ChangeRequest;
  updateChangeRequest: (id: string, u: Partial<ChangeRequest>) => void;
  deleteChangeRequest: (id: string) => void;

  // Milestones
  createMilestone: (m: Partial<Milestone>) => Milestone;
  updateMilestone: (id: string, u: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;

  // Risks
  createRisk: (r: Partial<Risk>) => Risk;
  updateRisk: (id: string, u: Partial<Risk>) => void;
  deleteRisk: (id: string) => void;

  // Issues
  createIssue: (i: Partial<Issue>) => Issue;
  updateIssue: (id: string, u: Partial<Issue>) => void;
  deleteIssue: (id: string) => void;

  // Decisions
  createDecision: (d: Partial<Decision>) => Decision;
  updateDecision: (id: string, u: Partial<Decision>) => void;
  deleteDecision: (id: string) => void;

  // Actions
  createAction: (a: Partial<Action>) => Action;
  updateAction: (id: string, u: Partial<Action>) => void;
  deleteAction: (id: string) => void;

  // Communications
  createCommunication: (c: Partial<Communication>) => Communication;
  updateCommunication: (id: string, u: Partial<Communication>) => void;
  deleteCommunication: (id: string) => void;

  // Stakeholders
  createStakeholder: (s: Partial<Stakeholder>) => Stakeholder;
  updateStakeholder: (id: string, u: Partial<Stakeholder>) => void;
  deleteStakeholder: (id: string) => void;

  // Resources
  createResource: (r: Partial<Resource>) => Resource;
  updateResource: (id: string, u: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  // Absences
  createAbsence: (a: Partial<Absence>) => Absence;
  updateAbsence: (id: string, u: Partial<Absence>) => void;
  deleteAbsence: (id: string) => void;

  // Meetings
  createMeeting: (m: Partial<Meeting>) => Meeting;
  updateMeeting: (id: string, u: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  // Notes
  createNote: (n: Partial<Note>) => Note;
  updateNote: (id: string, u: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  projectConfig: null,
  milestones: [], risks: [], issues: [], decisions: [], actions: [],
  communications: [], stakeholders: [], resources: [], absences: [],
  meetings: [], notes: [], activityLog: [], weeklyReviews: [], budgetItems: [], changeRequests: [],
  portfolioProjects: [], isLoaded: false,

  loadAll: () => {
    set({
      projectConfig: projectConfigQueries.get(),
      milestones: milestoneQueries.getAll(),
      risks: riskQueries.getAll(),
      issues: issueQueries.getAll(),
      decisions: decisionQueries.getAll(),
      actions: actionQueries.getAll(),
      communications: communicationQueries.getAll(),
      stakeholders: stakeholderQueries.getAll(),
      resources: resourceQueries.getAll(),
      absences: absenceQueries.getAll(),
      meetings: meetingQueries.getAll(),
      notes: noteQueries.getAll(),
      activityLog: activityQueries.getRecent(60),
      weeklyReviews: weeklyReviewQueries.getAll(),
      budgetItems: budgetItemQueries.getAll(),
      changeRequests: changeRequestQueries.getAll(),
      portfolioProjects: portfolioQueries.getAll(),
      isLoaded: true,
    });
  },

  loadProjectConfig: () => set({ projectConfig: projectConfigQueries.get() }),
  updateProjectConfig: (data) => {
    projectConfigQueries.upsert(data);
    get().loadProjectConfig();
    get().loadActivity();
  },
  loadMilestones: () => set({ milestones: milestoneQueries.getAll() }),
  loadRisks: () => set({ risks: riskQueries.getAll() }),
  loadIssues: () => set({ issues: issueQueries.getAll() }),
  loadDecisions: () => set({ decisions: decisionQueries.getAll() }),
  loadActions: () => set({ actions: actionQueries.getAll() }),
  loadCommunications: () => set({ communications: communicationQueries.getAll() }),
  loadStakeholders: () => set({ stakeholders: stakeholderQueries.getAll() }),
  loadResources: () => set({ resources: resourceQueries.getAll() }),
  loadAbsences: () => set({ absences: absenceQueries.getAll() }),
  loadMeetings: () => set({ meetings: meetingQueries.getAll() }),
  loadNotes: () => set({ notes: noteQueries.getAll() }),
  loadActivity: () => set({ activityLog: activityQueries.getRecent(60) }),
  loadWeeklyReviews: () => set({ weeklyReviews: weeklyReviewQueries.getAll() }),
  loadBudgetItems: () => set({ budgetItems: budgetItemQueries.getAll() }),
  loadChangeRequests: () => set({ changeRequests: changeRequestQueries.getAll() }),
  loadPortfolioProjects: () => set({ portfolioProjects: portfolioQueries.getAll() }),

  // Portfolio Projects
  createPortfolioProject: (p) => {
    const created = portfolioQueries.create(p);
    activityQueries.log('portfolio', created.id, created.name, 'created', `Added project "${created.name}" to portfolio`);
    get().loadPortfolioProjects();
    get().loadActivity();
    return created;
  },
  updatePortfolioProject: (id, u) => {
    const prev = portfolioQueries.getById(id);
    portfolioQueries.update(id, u);
    if (prev) {
      activityQueries.log('portfolio', id, prev.name, 'updated', `Updated portfolio project "${prev.name}"`, JSON.stringify(prev));
    }
    get().loadPortfolioProjects();
    get().loadActivity();
  },
  deletePortfolioProject: (id) => {
    const prev = portfolioQueries.getById(id);
    if (prev) {
      portfolioQueries.delete(id);
      activityQueries.log('portfolio', id, prev.name, 'deleted', `Removed "${prev.name}" from portfolio`, JSON.stringify(prev));
    } else {
      portfolioQueries.delete(id);
    }
    get().loadPortfolioProjects();
    get().loadActivity();
  },

  revertActivity: (activityId) => {
    const res = activityQueries.revert(activityId);
    get().loadAll();
    useTaskStore.getState().load();
    return res;
  },

  // Weekly Reviews
  createWeeklyReview: (w) => {
    const created = weeklyReviewQueries.create(w);
    activityQueries.log('weekly-review', created.id, `Week ${created.weekNumber} (${created.year})`, 'created');
    get().loadWeeklyReviews();
    get().loadActivity();
    return created;
  },
  updateWeeklyReview: (id, u) => {
    weeklyReviewQueries.update(id, u);
    get().loadWeeklyReviews();
  },
  deleteWeeklyReview: (id) => {
    weeklyReviewQueries.delete(id);
    get().loadWeeklyReviews();
  },

  // Milestones
  createMilestone: (m) => { const r = milestoneQueries.create(m); activityQueries.log('milestone', r.id, r.name, 'created'); get().loadMilestones(); get().loadActivity(); return r; },
  updateMilestone: (id, u) => {
    const prev = milestoneQueries.getById(id);
    milestoneQueries.update(id, u);
    if (prev) activityQueries.log('milestone', id, prev.name, 'updated', `Updated milestone "${prev.name}"`, JSON.stringify(prev));
    get().loadMilestones();
    get().loadActivity();
  },
  deleteMilestone: (id) => {
    const prev = milestoneQueries.getById(id);
    if (prev) activityQueries.log('milestone', id, prev.name, 'deleted', `Deleted milestone "${prev.name}"`, JSON.stringify(prev));
    milestoneQueries.delete(id);
    get().loadMilestones();
    get().loadActivity();
  },

  // Risks
  createRisk: (r) => { const created = riskQueries.create(r); activityQueries.log('risk', created.id, created.title, 'created'); get().loadRisks(); get().loadActivity(); return created; },
  updateRisk: (id, u) => {
    const prev = riskQueries.getById(id);
    riskQueries.update(id, u);
    if (prev) activityQueries.log('risk', id, prev.title, 'updated', `Updated risk "${prev.title}"`, JSON.stringify(prev));
    get().loadRisks();
    get().loadActivity();
  },
  deleteRisk: (id) => {
    const prev = riskQueries.getById(id);
    if (prev) activityQueries.log('risk', id, prev.title, 'deleted', `Deleted risk "${prev.title}"`, JSON.stringify(prev));
    riskQueries.delete(id);
    get().loadRisks();
    get().loadActivity();
  },

  // Issues
  createIssue: (i) => { const created = issueQueries.create(i); activityQueries.log('issue', created.id, created.title, 'created'); get().loadIssues(); get().loadActivity(); return created; },
  updateIssue: (id, u) => {
    const prev = issueQueries.getById(id);
    issueQueries.update(id, u);
    if (prev) activityQueries.log('issue', id, prev.title, 'updated', `Updated issue "${prev.title}"`, JSON.stringify(prev));
    get().loadIssues();
    get().loadActivity();
  },
  deleteIssue: (id) => {
    const prev = issueQueries.getById(id);
    if (prev) activityQueries.log('issue', id, prev.title, 'deleted', `Deleted issue "${prev.title}"`, JSON.stringify(prev));
    issueQueries.delete(id);
    get().loadIssues();
    get().loadActivity();
  },

  // Decisions
  createDecision: (d) => { const created = decisionQueries.create(d); activityQueries.log('decision', created.id, created.title, 'created'); get().loadDecisions(); get().loadActivity(); return created; },
  updateDecision: (id, u) => {
    const prev = decisionQueries.getById(id);
    decisionQueries.update(id, u);
    if (prev) activityQueries.log('decision', id, prev.title, 'updated', `Updated decision "${prev.title}"`, JSON.stringify(prev));
    get().loadDecisions();
    get().loadActivity();
  },
  deleteDecision: (id) => {
    const prev = decisionQueries.getById(id);
    if (prev) activityQueries.log('decision', id, prev.title, 'deleted', `Deleted decision "${prev.title}"`, JSON.stringify(prev));
    decisionQueries.delete(id);
    get().loadDecisions();
    get().loadActivity();
  },

  // Actions
  createAction: (a) => { const created = actionQueries.create(a); activityQueries.log('action', created.id, created.action, 'created'); get().loadActions(); get().loadActivity(); return created; },
  updateAction: (id, u) => {
    const prev = actionQueries.getById(id);
    actionQueries.update(id, u);
    if (prev) activityQueries.log('action', id, prev.action, 'updated', `Updated action "${prev.action}"`, JSON.stringify(prev));
    get().loadActions();
    get().loadActivity();
  },
  deleteAction: (id) => {
    const prev = actionQueries.getById(id);
    if (prev) activityQueries.log('action', id, prev.action, 'deleted', `Deleted action "${prev.action}"`, JSON.stringify(prev));
    actionQueries.delete(id);
    get().loadActions();
    get().loadActivity();
  },

  // Communications
  createCommunication: (c) => { const created = communicationQueries.create(c); activityQueries.log('communication', created.id, created.subject, 'created'); get().loadCommunications(); get().loadActivity(); return created; },
  updateCommunication: (id, u) => { communicationQueries.update(id, u); get().loadCommunications(); get().loadActivity(); },
  deleteCommunication: (id) => { communicationQueries.delete(id); get().loadCommunications(); },

  // Stakeholders
  createStakeholder: (s) => { const created = stakeholderQueries.create(s); activityQueries.log('stakeholder', created.id, created.name, 'created'); get().loadStakeholders(); get().loadActivity(); return created; },
  updateStakeholder: (id, u) => { stakeholderQueries.update(id, u); get().loadStakeholders(); },
  deleteStakeholder: (id) => { stakeholderQueries.delete(id); get().loadStakeholders(); },

  // Resources
  createResource: (r) => { const created = resourceQueries.create(r); activityQueries.log('resource', created.id, created.name, 'created'); get().loadResources(); get().loadActivity(); return created; },
  updateResource: (id, u) => { resourceQueries.update(id, u); get().loadResources(); },
  deleteResource: (id) => { resourceQueries.delete(id); get().loadResources(); },

  // Absences
  createAbsence: (a) => { const created = absenceQueries.create(a); activityQueries.log('absence', created.id, created.resourceName, 'absence-added', `${created.type}: ${created.startDate} — ${created.endDate}`); get().loadAbsences(); get().loadActivity(); return created; },
  updateAbsence: (id, u) => { const updated = absenceQueries.update(id, u); if (updated) activityQueries.log('absence', id, updated.resourceName, 'absence-updated', `${updated.type}: ${updated.startDate} — ${updated.endDate}`); get().loadAbsences(); get().loadActivity(); },
  deleteAbsence: (id) => { absenceQueries.delete(id); get().loadAbsences(); get().loadActivity(); },

  // Meetings
  createMeeting: (m) => { const created = meetingQueries.create(m); activityQueries.log('meeting', created.id, created.title, 'created'); get().loadMeetings(); get().loadActivity(); return created; },
  updateMeeting: (id, u) => { meetingQueries.update(id, u); get().loadMeetings(); get().loadActivity(); },
  deleteMeeting: (id) => { meetingQueries.delete(id); get().loadMeetings(); },

  // Notes
  createNote: (n) => { const created = noteQueries.create(n); activityQueries.log('note', created.id, created.title, 'created'); get().loadNotes(); get().loadActivity(); return created; },
  updateNote: (id, u) => { noteQueries.update(id, u); get().loadNotes(); },
  deleteNote: (id) => { noteQueries.delete(id); get().loadNotes(); },

  // Budget Items
  createBudgetItem: (b) => { const created = budgetItemQueries.create(b); activityQueries.log('budget', created.id, created.description, 'created'); get().loadBudgetItems(); get().loadActivity(); return created; },
  updateBudgetItem: (id, u) => { budgetItemQueries.update(id, u); get().loadBudgetItems(); get().loadActivity(); },
  deleteBudgetItem: (id) => { budgetItemQueries.delete(id); get().loadBudgetItems(); },

  // Change Requests
  createChangeRequest: (c) => { const created = changeRequestQueries.create(c); activityQueries.log('change-request', created.id, created.title, 'created'); get().loadChangeRequests(); get().loadActivity(); return created; },
  updateChangeRequest: (id, u) => { changeRequestQueries.update(id, u); get().loadChangeRequests(); get().loadActivity(); },
  deleteChangeRequest: (id) => { changeRequestQueries.delete(id); get().loadChangeRequests(); },
}));

