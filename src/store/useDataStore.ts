import { create } from 'zustand';
import type { Milestone, Risk, Issue, Decision, Action, Communication, Stakeholder, Resource, Absence, Meeting, Note, ActivityLog } from '../types';
import {
  milestoneQueries, riskQueries, issueQueries, decisionQueries, actionQueries,
  communicationQueries, stakeholderQueries, resourceQueries, absenceQueries,
  meetingQueries, noteQueries, activityQueries,
} from '../db/queries';

interface DataState {
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
  isLoaded: boolean;

  loadAll: () => void;
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
  milestones: [], risks: [], issues: [], decisions: [], actions: [],
  communications: [], stakeholders: [], resources: [], absences: [],
  meetings: [], notes: [], activityLog: [], isLoaded: false,

  loadAll: () => {
    set({
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
      isLoaded: true,
    });
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

  // Milestones
  createMilestone: (m) => { const r = milestoneQueries.create(m); activityQueries.log('milestone', r.id, r.name, 'created'); get().loadMilestones(); get().loadActivity(); return r; },
  updateMilestone: (id, u) => { milestoneQueries.update(id, u); get().loadMilestones(); get().loadActivity(); },
  deleteMilestone: (id) => { milestoneQueries.delete(id); get().loadMilestones(); },

  // Risks
  createRisk: (r) => { const created = riskQueries.create(r); activityQueries.log('risk', created.id, created.title, 'created'); get().loadRisks(); get().loadActivity(); return created; },
  updateRisk: (id, u) => { riskQueries.update(id, u); get().loadRisks(); get().loadActivity(); },
  deleteRisk: (id) => { riskQueries.delete(id); get().loadRisks(); },

  // Issues
  createIssue: (i) => { const created = issueQueries.create(i); activityQueries.log('issue', created.id, created.title, 'created'); get().loadIssues(); get().loadActivity(); return created; },
  updateIssue: (id, u) => { issueQueries.update(id, u); get().loadIssues(); get().loadActivity(); },
  deleteIssue: (id) => { issueQueries.delete(id); get().loadIssues(); },

  // Decisions
  createDecision: (d) => { const created = decisionQueries.create(d); activityQueries.log('decision', created.id, created.title, 'created'); get().loadDecisions(); get().loadActivity(); return created; },
  updateDecision: (id, u) => { decisionQueries.update(id, u); get().loadDecisions(); get().loadActivity(); },
  deleteDecision: (id) => { decisionQueries.delete(id); get().loadDecisions(); },

  // Actions
  createAction: (a) => { const created = actionQueries.create(a); activityQueries.log('action', created.id, created.action, 'created'); get().loadActions(); get().loadActivity(); return created; },
  updateAction: (id, u) => { actionQueries.update(id, u); get().loadActions(); get().loadActivity(); },
  deleteAction: (id) => { actionQueries.delete(id); get().loadActions(); },

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
  deleteAbsence: (id) => { absenceQueries.delete(id); get().loadAbsences(); },

  // Meetings
  createMeeting: (m) => { const created = meetingQueries.create(m); activityQueries.log('meeting', created.id, created.title, 'created'); get().loadMeetings(); get().loadActivity(); return created; },
  updateMeeting: (id, u) => { meetingQueries.update(id, u); get().loadMeetings(); get().loadActivity(); },
  deleteMeeting: (id) => { meetingQueries.delete(id); get().loadMeetings(); },

  // Notes
  createNote: (n) => { const created = noteQueries.create(n); activityQueries.log('note', created.id, created.title, 'created'); get().loadNotes(); get().loadActivity(); return created; },
  updateNote: (id, u) => { noteQueries.update(id, u); get().loadNotes(); },
  deleteNote: (id) => { noteQueries.delete(id); get().loadNotes(); },
}));
