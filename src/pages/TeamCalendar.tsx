import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Users, Clock,
  Search, Filter, Trash2, Edit2, AlertCircle, CheckCircle2, X, ArrowUpDown,
  UserCheck, UserX, Briefcase, Flag, AlertTriangle, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { Avatar, Modal, EmptyState } from '../components/ui/shared';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO,
  isWithinInterval, addMonths, subMonths, isWeekend, startOfWeek, endOfWeek,
  differenceInCalendarDays
} from 'date-fns';
import type { Absence, Resource, Stakeholder, Milestone } from '../types';

export const ABSENCE_TYPES = [
  { value: 'vacation', label: 'Vacation / Annual Leave', color: '#4f8ef7', short: 'VAC' },
  { value: 'RTT', label: 'RTT / Comp Time', color: '#7c6af7', short: 'RTT' },
  { value: 'sick', label: 'Sick Leave', color: '#f74f4f', short: 'SCK' },
  { value: 'training', label: 'Training & Development', color: '#f7d14f', short: 'TRN' },
  { value: 'business-trip', label: 'Business Trip / Mission', color: '#4fd9f7', short: 'TRP' },
  { value: 'remote', label: 'Remote / Telework', color: '#8ef74f', short: 'RMT' },
  { value: 'partial-availability', label: 'Partial Availability', color: '#f79a4f', short: 'PRT' },
];

export const ABSENCE_COLORS: Record<string, string> = {
  vacation: '#4f8ef7',
  RTT: '#7c6af7',
  sick: '#f74f4f',
  training: '#f7d14f',
  'business-trip': '#4fd9f7',
  remote: '#8ef74f',
  'partial-availability': '#f79a4f',
};

function calculateDays(startDateStr: string, endDateStr: string): { businessDays: number; totalDays: number } {
  if (!startDateStr || !endDateStr) return { businessDays: 0, totalDays: 0 };
  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (end < start) return { businessDays: 0, totalDays: 0 };
    const totalDays = differenceInCalendarDays(end, start) + 1;
    const allDays = eachDayOfInterval({ start, end });
    const businessDays = allDays.filter(d => !isWeekend(d)).length;
    return { businessDays, totalDays };
  } catch {
    return { businessDays: 0, totalDays: 0 };
  }
}

interface AbsenceModalProps {
  absence: Absence | null;
  initialResourceId?: string;
  initialDate?: string;
  resources: Resource[];
  onClose: () => void;
  onSave: (data: Partial<Absence>) => void;
  onDelete?: (id: string) => void;
}

function AbsenceModal({
  absence,
  initialResourceId,
  initialDate,
  resources,
  onClose,
  onSave,
  onDelete,
}: AbsenceModalProps) {
  const isEdit = !!absence;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultDate = initialDate || todayStr;

  const [resourceId, setResourceId] = useState<string>(
    absence?.resourceId || initialResourceId || (resources[0]?.id ?? '')
  );
  const [type, setType] = useState<string>(absence?.type || 'vacation');
  const [startDate, setStartDate] = useState<string>(absence?.startDate || defaultDate);
  const [endDate, setEndDate] = useState<string>(absence?.endDate || defaultDate);
  const [notes, setNotes] = useState<string>(absence?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);

  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (!endDate || endDate < val) {
      setEndDate(val);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resourceId) {
      setError('Please select a team member.');
      return;
    }
    if (!startDate) {
      setError('Please specify a start date.');
      return;
    }
    if (!endDate) {
      setError('Please specify an end date.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    const selectedResource = resources.find(r => r.id === resourceId);
    onSave({
      resourceId,
      resourceName: selectedResource?.name || '',
      type,
      startDate,
      endDate,
      notes: notes.trim(),
    });
    onClose();
  }

  return (
    <Modal
      title={isEdit ? 'Edit Absence / Leave' : 'Log Team Absence / Leave'}
      onClose={onClose}
      size="sm"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {isEdit && onDelete ? (
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Confirm deletion?</span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      onDelete(absence.id);
                      onClose();
                    }}
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                </button>
              )}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit}>
              {isEdit ? 'Save Changes' : 'Record Absence'}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Resource Selection */}
        <div className="form-group">
          <label className="form-label required">Team Member</label>
          {resources.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--danger)' }}>
              No resources available. Please add resources first in the Resources section.
            </div>
          ) : (
            <select
              className="select"
              value={resourceId}
              onChange={e => setResourceId(e.target.value)}
              required
            >
              <option value="">Select team member...</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.role ? `(${r.role})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Absence Type */}
        <div className="form-group">
          <label className="form-label required">Absence / Event Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {ABSENCE_TYPES.map(t => {
              const isSelected = type === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  className={`absence-type-chip${isSelected ? ' selected' : ''}`}
                  style={{
                    background: isSelected ? `${t.color}25` : 'var(--bg-elevated)',
                    color: isSelected ? t.color : 'var(--text-secondary)',
                    borderColor: isSelected ? t.color : 'var(--border)',
                  }}
                  onClick={() => setType(t.value)}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: t.color,
                    }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label required">Start Date</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label required">End Date</label>
            <input
              type="date"
              className="input"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Duration Calculation Indicator */}
        {startDate && endDate && duration.totalDays > 0 && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-2">
              <Clock size={14} color="var(--accent)" />
              <span>Calculated Impact:</span>
            </div>
            <div style={{ fontWeight: 600 }}>
              <span style={{ color: 'var(--accent)' }}>{duration.businessDays} working days</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                ({duration.totalDays} calendar {duration.totalDays === 1 ? 'day' : 'days'})
              </span>
            </div>
          </div>
        )}

        {/* Notes / Reason */}
        <div className="form-group">
          <label className="form-label">Notes & Coverage Details</label>
          <textarea
            className="textarea"
            rows={2}
            placeholder="e.g. Annual leave, backups: Marc Lefort, urgent escalations by phone..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

interface StakeholderAbsenceModalProps {
  absence: Absence | null;
  initialStakeholderId?: string;
  initialDate?: string;
  stakeholders: Stakeholder[];
  onClose: () => void;
  onSave: (data: Partial<Absence>) => void;
  onDelete?: (id: string) => void;
}

function StakeholderAbsenceModal({
  absence,
  initialStakeholderId,
  initialDate,
  stakeholders,
  onClose,
  onSave,
  onDelete,
}: StakeholderAbsenceModalProps) {
  const isEdit = !!absence;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultDate = initialDate || todayStr;

  const [stakeholderId, setStakeholderId] = useState<string>(
    absence?.resourceId || initialStakeholderId || (stakeholders[0]?.id ?? '')
  );
  const [type, setType] = useState<string>(absence?.type || 'vacation');
  const [startDate, setStartDate] = useState<string>(absence?.startDate || defaultDate);
  const [endDate, setEndDate] = useState<string>(absence?.endDate || defaultDate);
  const [notes, setNotes] = useState<string>(absence?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duration = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);

  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (!endDate || endDate < val) {
      setEndDate(val);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stakeholderId) {
      setError('Please select a stakeholder.');
      return;
    }
    if (!startDate) {
      setError('Please specify a start date.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    const stk = stakeholders.find(s => s.id === stakeholderId);
    onSave({
      resourceId: stakeholderId,
      resourceName: stk ? stk.name : '',
      type,
      startDate,
      endDate,
      notes,
    });
    onClose();
  }

  return (
    <Modal
      title={isEdit ? 'Edit Stakeholder Absence' : 'Log Stakeholder Absence / Leave'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          {isEdit && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Delete?</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: 'var(--danger)', color: 'white' }}
                  onClick={() => { onDelete(absence.id); onClose(); }}
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} /> Delete
              </button>
            )
          ) : <div />}

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit}>
              {isEdit ? 'Save Changes' : 'Record Absence'}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div className="alert-banner" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Stakeholder / Decision Maker *</label>
          <select
            className="select"
            value={stakeholderId}
            onChange={e => setStakeholderId(e.target.value)}
            disabled={isEdit}
          >
            {stakeholders.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.role} ({s.organization})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Absence Type</label>
          <select className="select" value={type} onChange={e => setType(e.target.value)}>
            <option value="vacation">Vacation / Annual Leave</option>
            <option value="business-trip">Business Trip / Summit / Offsite</option>
            <option value="training">Training / Conference</option>
            <option value="remote">Out of Office / Telework</option>
            <option value="other">Other Unavailability</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Start Date *</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">End Date *</label>
            <input
              type="date"
              className="input"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        {startDate && endDate && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Duration: <strong>{duration.businessDays} business days</strong> ({duration.totalDays} calendar days)
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Milestone Delegation / Coverage Notes</label>
          <textarea
            className="textarea"
            rows={2}
            placeholder="e.g. Steering committee delegate: Marc Lefort (IT Director). Escalations by phone."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}

export default function TeamCalendar() {
  const {
    resources, absences, stakeholders, milestones,
    createAbsence, updateAbsence, deleteAbsence
  } = useDataStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'team' | 'month' | 'list'>('team');
  const [showWeekends, setShowWeekends] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResource, setFilterResource] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Modal State for Team
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);
  const [modalInitialResource, setModalInitialResource] = useState<string | undefined>(undefined);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);

  // Modal State for Stakeholders
  const [isStakeholderModalOpen, setIsStakeholderModalOpen] = useState(false);
  const [editingStakeholderAbsence, setEditingStakeholderAbsence] = useState<Absence | null>(null);
  const [modalStakeholderId, setModalStakeholderId] = useState<string | undefined>(undefined);
  const [modalStakeholderDate, setModalStakeholderDate] = useState<string | undefined>(undefined);

  function handleOpenStakeholderCreate(stakeholderId?: string, date?: string) {
    setEditingStakeholderAbsence(null);
    setModalStakeholderId(stakeholderId);
    setModalStakeholderDate(date);
    setIsStakeholderModalOpen(true);
  }

  function handleOpenStakeholderEdit(abs: Absence) {
    setEditingStakeholderAbsence(abs);
    setModalStakeholderId(abs.resourceId);
    setModalStakeholderDate(abs.startDate);
    setIsStakeholderModalOpen(true);
  }

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Separate team absences from stakeholder absences
  const teamResourceIds = useMemo(() => new Set(resources.map(r => r.id)), [resources]);
  const stakeholderIds = useMemo(() => new Set(stakeholders.map(s => s.id)), [stakeholders]);

  const teamAbsences = useMemo(() => {
    return absences.filter(a => teamResourceIds.has(a.resourceId));
  }, [absences, teamResourceIds]);

  const stakeholderAbsences = useMemo(() => {
    return absences.filter(a => stakeholderIds.has(a.resourceId));
  }, [absences, stakeholderIds]);

  // Filtered resources
  const displayedResources = useMemo(() => {
    let list = resources;
    if (filterResource !== 'all') {
      list = list.filter(r => r.id === filterResource);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q));
    }
    return list;
  }, [resources, filterResource, searchQuery]);

  // Filtered absences for Team Calendar
  const filteredAbsences = useMemo(() => {
    return teamAbsences.filter(a => {
      if (filterResource !== 'all' && a.resourceId !== filterResource) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (a.resourceName || '').toLowerCase().includes(q);
        const matchNotes = (a.notes || '').toLowerCase().includes(q);
        const matchType = a.type.toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchType) return false;
      }
      return true;
    });
  }, [teamAbsences, filterResource, filterType, searchQuery]);

  // Milestones mapped by date (yyyy-MM-dd)
  const milestonesByDate = useMemo(() => {
    const map: Record<string, Milestone[]> = {};
    milestones.forEach(m => {
      if (!m.targetDate) return;
      if (!map[m.targetDate]) map[m.targetDate] = [];
      map[m.targetDate].push(m);
    });
    return map;
  }, [milestones]);

  // Milestones in current month
  const monthMilestones = useMemo(() => {
    return milestones.filter(m => {
      if (!m.targetDate) return false;
      try {
        const d = parseISO(m.targetDate);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
  }, [milestones, monthStart, monthEnd]);

  // Stakeholder Absences vs Milestone Scheduling Conflicts
  const stakeholderMilestoneConflicts = useMemo(() => {
    const conflicts: Array<{
      milestone: Milestone;
      stakeholder: Stakeholder;
      absence: Absence;
      dateStr: string;
    }> = [];

    stakeholders.forEach(stk => {
      const stkAbs = stakeholderAbsences.filter(a => a.resourceId === stk.id);
      stkAbs.forEach(abs => {
        try {
          const start = parseISO(abs.startDate);
          const end = parseISO(abs.endDate);
          const days = eachDayOfInterval({ start, end });
          days.forEach(day => {
            const dStr = format(day, 'yyyy-MM-dd');
            const msList = milestonesByDate[dStr];
            if (msList && msList.length > 0) {
              msList.forEach(m => {
                conflicts.push({
                  milestone: m,
                  stakeholder: stk,
                  absence: abs,
                  dateStr: dStr,
                });
              });
            }
          });
        } catch {}
      });
    });

    return conflicts;
  }, [stakeholders, stakeholderAbsences, milestonesByDate]);

  // Helper: Absences for a stakeholder on a specific day
  function getAbsencesForStakeholderDay(stakeholderId: string, day: Date): Absence[] {
    return stakeholderAbsences.filter(a => {
      if (a.resourceId !== stakeholderId) return false;
      try {
        return isWithinInterval(day, { start: parseISO(a.startDate), end: parseISO(a.endDate) });
      } catch {
        return false;
      }
    });
  }

  // Helper: Absences for a resource on a specific day
  function getAbsencesForResourceDay(resourceId: string, day: Date): Absence[] {
    return filteredAbsences.filter(a => {
      if (a.resourceId !== resourceId) return false;
      try {
        return isWithinInterval(day, { start: parseISO(a.startDate), end: parseISO(a.endDate) });
      } catch {
        return false;
      }
    });
  }

  // Helper: Absences on a specific calendar day
  function getAbsencesForDay(day: Date): Array<{ resource?: Resource; absence: Absence }> {
    const result: Array<{ resource?: Resource; absence: Absence }> = [];
    for (const a of filteredAbsences) {
      try {
        if (isWithinInterval(day, { start: parseISO(a.startDate), end: parseISO(a.endDate) })) {
          const r = resources.find(res => res.id === a.resourceId);
          result.push({ resource: r, absence: a });
        }
      } catch {}
    }
    return result;
  }

  // Days to show in Team View
  const teamViewDays = useMemo(() => {
    if (showWeekends) return daysInMonth;
    return daysInMonth.filter(d => !isWeekend(d));
  }, [daysInMonth, showWeekends]);

  // Calendar days for Month View (including leading/trailing padding days)
  const monthCalendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [monthStart, monthEnd]);

  // Statistics
  const stats = useMemo(() => {
    // Currently away today
    const awayToday = absences.filter(a => {
      try {
        return isWithinInterval(today, { start: parseISO(a.startDate), end: parseISO(a.endDate) });
      } catch {
        return false;
      }
    });

    // Absences active in current month
    const thisMonthAbsences = absences.filter(a => {
      try {
        const start = parseISO(a.startDate);
        const end = parseISO(a.endDate);
        return start <= monthEnd && end >= monthStart;
      } catch {
        return false;
      }
    });

    // Total business days impacted in month across all resources
    let impactedWorkDays = 0;
    for (const d of daysInMonth) {
      if (isWeekend(d)) continue;
      for (const a of absences) {
        try {
          if (isWithinInterval(d, { start: parseISO(a.startDate), end: parseISO(a.endDate) })) {
            impactedWorkDays++;
          }
        } catch {}
      }
    }

    const totalWorkingDaysInMonth = daysInMonth.filter(d => !isWeekend(d)).length;
    const totalPotentialManDays = (resources.length || 1) * totalWorkingDaysInMonth;
    const availabilityRate = Math.max(
      0,
      Math.round(((totalPotentialManDays - impactedWorkDays) / (totalPotentialManDays || 1)) * 100)
    );

    return {
      awayToday,
      thisMonthCount: thisMonthAbsences.length,
      impactedWorkDays,
      availabilityRate,
    };
  }, [absences, today, monthStart, monthEnd, daysInMonth, resources.length]);

  // Calculate days off for a specific resource in the current month
  function getResourceMonthDaysOff(resourceId: string): number {
    let daysOff = 0;
    for (const d of teamViewDays) {
      const abs = getAbsencesForResourceDay(resourceId, d);
      if (abs.length > 0) daysOff++;
    }
    return daysOff;
  }

  // Open modal for creation
  function handleOpenCreate(resourceId?: string, date?: string) {
    setEditingAbsence(null);
    setModalInitialResource(resourceId);
    setModalInitialDate(date);
    setIsModalOpen(true);
  }

  // Open modal for editing an existing absence
  function handleOpenEdit(absence: Absence) {
    setEditingAbsence(absence);
    setModalInitialResource(absence.resourceId);
    setModalInitialDate(absence.startDate);
    setIsModalOpen(true);
  }

  function handleSaveAbsence(data: Partial<Absence>) {
    if (editingAbsence) {
      updateAbsence(editingAbsence.id, data);
    } else {
      createAbsence(data);
    }
  }

  function handleDeleteAbsence(id: string) {
    deleteAbsence(id);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Team Calendar & Availability</h1>
          <p className="page-subtitle">
            {format(currentMonth, 'MMMM yyyy')} · {resources.length} team members · {filteredAbsences.length} scheduled absences
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* View switcher */}
          <div className="tabs" style={{ border: 'none' }}>
            <button
              className={`tab${view === 'team' ? ' active' : ''}`}
              onClick={() => setView('team')}
            >
              Team View
            </button>
            <button
              className={`tab${view === 'month' ? ' active' : ''}`}
              onClick={() => setView('month')}
            >
              Month View
            </button>
            <button
              className={`tab${view === 'list' ? ' active' : ''}`}
              onClick={() => setView('list')}
            >
              Absence Log ({filteredAbsences.length})
            </button>
          </div>

          {/* Month Navigation */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentMonth(m => subMonths(m, 1))}
            title="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentMonth(new Date())}
            title="Jump to current month"
          >
            Today
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setCurrentMonth(m => addMonths(m, 1))}
            title="Next month"
          >
            <ChevronRight size={15} />
          </button>

          {/* Primary Add Button */}
          <button
            className="btn btn-primary"
            onClick={() => handleOpenCreate()}
            id="add-absence-btn"
          >
            <Plus size={15} style={{ marginRight: 4 }} /> Log Absence
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="calendar-stats">
        {/* Card 1: Currently Away */}
        <div className="calendar-stat-card">
          <div
            className="calendar-stat-icon"
            style={{
              background: stats.awayToday.length > 0 ? 'var(--warning-bg)' : 'var(--success-bg)',
              color: stats.awayToday.length > 0 ? 'var(--warning)' : 'var(--success)',
            }}
          >
            {stats.awayToday.length > 0 ? <UserX size={18} /> : <UserCheck size={18} />}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Away Today
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.awayToday.length}{' '}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>
                / {resources.length} members
              </span>
            </div>
            {stats.awayToday.length > 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }} className="truncate">
                {stats.awayToday.map(a => a.resourceName).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Leaves this Month */}
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Leaves this Month
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.thisMonthCount}{' '}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>events</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              Across active team members
            </div>
          </div>
        </div>

        {/* Card 3: Days Off Impact */}
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon" style={{ background: 'rgba(247, 106, 247, 0.15)', color: '#c05bf7' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Working Days Impact
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.impactedWorkDays}{' '}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>days</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              Scheduled out of office
            </div>
          </div>
        </div>

        {/* Card 4: Team Availability */}
        <div className="calendar-stat-card">
          <div className="calendar-stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <Briefcase size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Team Availability
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.availabilityRate}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              Capacity for {format(currentMonth, 'MMMM')}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="calendar-filters-bar">
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search member, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Member filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Member:</label>
          <select
            className="select"
            value={filterResource}
            onChange={e => setFilterResource(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: '0 8px' }}
          >
            <option value="all">All Members ({resources.length})</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Type:</label>
          <select
            className="select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{ height: 32, fontSize: 12, padding: '0 8px' }}
          >
            <option value="all">All Leave Types</option>
            {ABSENCE_TYPES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Show Weekends Toggle (in Team View) */}
        {view === 'team' && (
          <label className="flex items-center gap-2" style={{ fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
            <input
              type="checkbox"
              checked={showWeekends}
              onChange={e => setShowWeekends(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>Show weekends</span>
          </label>
        )}

        {(filterResource !== 'all' || filterType !== 'all' || searchQuery) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilterResource('all');
              setFilterType('all');
              setSearchQuery('');
            }}
            style={{ fontSize: 11, height: 30 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* VIEW 1: Team Matrix View */}
      {view === 'team' && (
        <div>
          <div className="team-matrix-wrapper">
            <table className="team-matrix-table">
              <thead>
                <tr>
                  <th
                    style={{
                      width: 220,
                      minWidth: 220,
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      position: 'sticky',
                      left: 0,
                      zIndex: 3,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>Team Member</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                        {displayedResources.length} shown
                      </span>
                    </div>
                  </th>
                  {teamViewDays.map(d => {
                    const isCurrentDay = isSameDay(d, today);
                    const isSatSun = isWeekend(d);
                    return (
                      <th
                        key={d.toISOString()}
                        style={{
                          padding: '6px 2px',
                          textAlign: 'center',
                          minWidth: 34,
                          background: isCurrentDay
                            ? 'var(--accent-soft)'
                            : isSatSun
                            ? 'var(--bg-hover)'
                            : 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          color: isCurrentDay ? 'var(--accent)' : 'var(--text-secondary)',
                          fontWeight: isCurrentDay ? 700 : 600,
                        }}
                      >
                        <div style={{ fontSize: 12 }}>{format(d, 'd')}</div>
                        <div style={{ fontSize: 9, opacity: 0.8, textTransform: 'uppercase' }}>
                          {format(d, 'EEE')}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayedResources.length === 0 ? (
                  <tr>
                    <td
                      colSpan={teamViewDays.length + 1}
                      style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      No team members found matching current filters.
                    </td>
                  </tr>
                ) : (
                  displayedResources.map(r => {
                    const monthDaysOff = getResourceMonthDaysOff(r.id);
                    return (
                      <tr key={r.id}>
                        {/* Member Frozen Column */}
                        <td
                          style={{
                            padding: '8px 12px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            position: 'sticky',
                            left: 0,
                            zIndex: 2,
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                              <Avatar name={r.name} size={28} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 12 }} className="truncate">
                                  {r.name}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 10 }} className="truncate">
                                  {r.role || 'Member'}
                                </div>
                              </div>
                            </div>
                            {monthDaysOff > 0 && (
                              <span
                                className="badge"
                                style={{
                                  fontSize: 10,
                                  padding: '2px 6px',
                                  background: 'var(--bg-elevated)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border)',
                                }}
                                title={`${monthDaysOff} days absent in ${format(currentMonth, 'MMMM')}`}
                              >
                                {monthDaysOff}d off
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Calendar Day Cells */}
                        {teamViewDays.map(d => {
                          const isCurrentDay = isSameDay(d, today);
                          const isSatSun = isWeekend(d);
                          const dayAbsences = getAbsencesForResourceDay(r.id, d);
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const hasAbsence = dayAbsences.length > 0;

                          return (
                            <td
                              key={d.toISOString()}
                              className={`team-matrix-cell${hasAbsence ? ' has-absence' : ' empty-cell'}`}
                              style={{
                                background: isCurrentDay
                                  ? 'var(--accent-soft)'
                                  : isSatSun
                                  ? 'var(--bg-hover)'
                                  : hasAbsence
                                  ? `${ABSENCE_COLORS[dayAbsences[0].type] || '#4f8ef7'}22`
                                  : 'var(--bg-surface)',
                              }}
                              onClick={() => {
                                if (hasAbsence) {
                                  handleOpenEdit(dayAbsences[0]);
                                } else {
                                  handleOpenCreate(r.id, dateStr);
                                }
                              }}
                              title={
                                hasAbsence
                                  ? `${r.name}: ${dayAbsences[0].type.toUpperCase()}\n${dayAbsences[0].startDate} → ${dayAbsences[0].endDate}\n${dayAbsences[0].notes || 'No notes'}\n(Click to edit)`
                                  : `Click to log absence for ${r.name} on ${dateStr}`
                              }
                            >
                              {hasAbsence && (
                                <div
                                  className="team-matrix-absence-block"
                                  style={{
                                    background: ABSENCE_COLORS[dayAbsences[0].type] || '#4f8ef7',
                                    color: '#ffffff',
                                  }}
                                >
                                  {(ABSENCE_TYPES.find(t => t.value === dayAbsences[0].type)?.short ||
                                    dayAbsences[0].type.slice(0, 3)
                                  ).toUpperCase()}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 11,
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <span>💡 <strong>Tip:</strong> Click any empty cell to quickly log an absence for that member and date. Click an existing colored block to edit or delete it.</span>
          </div>
        </div>
      )}

      {/* VIEW 2: Monthly Calendar Grid View */}
      {view === 'month' && (
        <div>
          <div className="month-calendar-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => (
              <div key={dayName} className="month-calendar-header">
                {dayName}
              </div>
            ))}

            {monthCalendarDays.map(d => {
              const inMonth = d.getMonth() === currentMonth.getMonth();
              const isCurrentDay = isSameDay(d, today);
              const dayAbsences = getAbsencesForDay(d);
              const dateStr = format(d, 'yyyy-MM-dd');

              return (
                <div
                  key={d.toISOString()}
                  className="month-calendar-cell"
                  style={{
                    opacity: inMonth ? 1 : 0.35,
                    background: isCurrentDay ? 'var(--accent-soft)' : 'var(--bg-surface)',
                  }}
                  onClick={e => {
                    // Only open create modal if clicking on the cell container directly
                    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('cell-bg')) {
                      handleOpenCreate(undefined, dateStr);
                    }
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isCurrentDay ? 800 : 600,
                        color: isCurrentDay ? '#ffffff' : inMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: isCurrentDay ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {format(d, 'd')}
                    </span>

                    <button
                      className="btn-icon btn-ghost add-day-btn"
                      style={{ width: 20, height: 20, padding: 0 }}
                      title={`Add absence on ${dateStr}`}
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenCreate(undefined, dateStr);
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Absences on this date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    {dayAbsences.slice(0, 4).map(({ resource: res, absence }) => {
                      const color = ABSENCE_COLORS[absence.type] || '#4f8ef7';
                      const resName = res?.name || absence.resourceName || 'Unknown';
                      const firstName = resName.split(' ')[0];

                      return (
                        <div
                          key={`${absence.id}-${dateStr}`}
                          className="month-absence-pill"
                          style={{
                            background: `${color}25`,
                            color: color,
                            borderLeft: `3px solid ${color}`,
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenEdit(absence);
                          }}
                          title={`${resName} (${absence.type})\n${absence.startDate} → ${absence.endDate}\n${absence.notes || ''}\n(Click to edit)`}
                        >
                          <span style={{ fontWeight: 700 }}>{firstName}:</span>
                          <span style={{ opacity: 0.85 }}>{absence.type}</span>
                        </div>
                      );
                    })}

                    {dayAbsences.length > 4 && (
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          padding: '1px 4px',
                        }}
                      >
                        +{dayAbsences.length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            💡 <strong>Tip:</strong> Hover over any day and click the <Plus size={10} style={{ display: 'inline' }} /> icon or click an empty day card to log an absence on that date. Click an absence pill to edit or delete it.
          </div>
        </div>
      )}

      {/* VIEW 3: Absence Log / List View */}
      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-elevated)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              All Recorded Absences & Leaves ({filteredAbsences.length})
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenCreate()}
            >
              <Plus size={13} style={{ marginRight: 4 }} /> Add New Absence
            </button>
          </div>

          {filteredAbsences.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center' }}>
              <EmptyState
                icon={CalendarIcon}
                title="No absences recorded"
                desc={
                  searchQuery || filterResource !== 'all' || filterType !== 'all'
                    ? 'No absences match your selected filters. Try clearing filters.'
                    : 'Your team currently has no scheduled absences or leaves.'
                }
                action={
                  <button className="btn btn-primary" onClick={() => handleOpenCreate()}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Record Absence
                  </button>
                }
              />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Team Member</th>
                    <th>Type</th>
                    <th>Date Range</th>
                    <th>Duration</th>
                    <th>Notes & Handover</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbsences.map(abs => {
                    const res = resources.find(r => r.id === abs.resourceId);
                    const dur = calculateDays(abs.startDate, abs.endDate);
                    const color = ABSENCE_COLORS[abs.type] || '#4f8ef7';
                    const isUpcoming = abs.startDate > todayStr;
                    const isCurrent = abs.startDate <= todayStr && abs.endDate >= todayStr;

                    return (
                      <tr key={abs.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={abs.resourceName || res?.name || 'Unknown'} size={26} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{abs.resourceName || res?.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {res?.role || 'Team Member'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: `${color}20`,
                              color: color,
                              borderColor: `${color}40`,
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: color,
                                marginRight: 6,
                              }}
                            />
                            {ABSENCE_TYPES.find(t => t.value === abs.type)?.label || abs.type}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {abs.startDate} → {abs.endDate}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {isCurrent ? (
                              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>● Away Today</span>
                            ) : isUpcoming ? (
                              <span style={{ color: 'var(--accent)' }}>Upcoming</span>
                            ) : (
                              'Past'
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{dur.businessDays} business days</span>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            ({dur.totalDays} calendar {dur.totalDays === 1 ? 'day' : 'days'})
                          </div>
                        </td>
                        <td style={{ maxWidth: 300 }}>
                          <span style={{ color: abs.notes ? 'var(--text-secondary)' : 'var(--text-placeholder)' }}>
                            {abs.notes || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn-icon btn-ghost btn-sm"
                              onClick={() => handleOpenEdit(abs)}
                              title="Edit absence"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn-icon btn-ghost btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => {
                                if (window.confirm(`Delete absence for ${abs.resourceName}?`)) {
                                  handleDeleteAbsence(abs.id);
                                }
                              }}
                              title="Delete absence"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Leave Legend:
        </div>
        <div className="flex gap-3 flex-wrap">
          {ABSENCE_TYPES.map(t => (
            <div
              key={t.value}
              className="flex items-center gap-1.5"
              style={{
                fontSize: 11,
                cursor: 'pointer',
                opacity: filterType === 'all' || filterType === t.value ? 1 : 0.4,
              }}
              onClick={() => setFilterType(prev => (prev === t.value ? 'all' : t.value))}
              title={`Click to filter by ${t.label}`}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: t.color,
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          SECTION 2: Stakeholders Calendar & Milestone Guard
          ============================================================ */}
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} color="var(--accent)" />
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Stakeholders Calendar & Milestone Guard
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                {stakeholders.length} Key Stakeholders
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
              High-level availability of key business owners and decision-makers. Detects scheduling conflicts during critical milestone gates and sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              onClick={() => handleOpenStakeholderCreate()}
            >
              <Plus size={14} /> Log Stakeholder Leave
            </button>
          </div>
        </div>

        {/* Milestone Conflict Alert Banner */}
        {stakeholderMilestoneConflicts.length > 0 ? (
          <div
            className="alert-banner"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
            }}
          >
            <AlertTriangle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13, marginBottom: 4 }}>
                ⚠️ Milestone Availability Conflict Detected ({stakeholderMilestoneConflicts.length})
              </div>
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-primary)' }}>
                {stakeholderMilestoneConflicts.map((c, idx) => (
                  <div key={idx}>
                    • <strong>{c.stakeholder.name}</strong> ({c.stakeholder.role}) is unavailable on <strong>{c.dateStr}</strong> during critical milestone <strong>"{c.milestone.name}"</strong> (Leave: {c.absence.startDate} → {c.absence.endDate}).
                    {c.absence.notes && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>[{c.absence.notes}]</span>}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 6, fontWeight: 500 }}>
                Action Recommended: Reschedule the milestone gate, or confirm an authorized decision-maker delegation.
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          >
            <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
            <div>
              <strong>All Clear:</strong> No scheduling conflicts detected. All required stakeholders are available on scheduled milestone dates for {format(currentMonth, 'MMMM yyyy')}.
            </div>
          </div>
        )}

        {/* Milestones Strip for this month */}
        {monthMilestones.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11, background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 10 }}>
              Milestones This Month:
            </span>
            {monthMilestones.map(m => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--bg-surface)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span>🎯</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.targetDate}:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                <span className={`badge badge-sm badge-${m.status === 'completed' ? 'success' : m.status === 'at-risk' ? 'danger' : 'primary'}`} style={{ fontSize: 9 }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Stakeholder Calendar Matrix */}
        <div className="team-matrix-wrapper">
          <table className="team-matrix-table">
            <thead>
              <tr>
                <th
                  style={{
                    width: 260,
                    minWidth: 260,
                    textAlign: 'left',
                    padding: '8px 12px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    position: 'sticky',
                    left: 0,
                    zIndex: 3,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>Key Stakeholder</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Influence / Role</span>
                  </div>
                </th>
                {teamViewDays.map(d => {
                  const dateStr = format(d, 'yyyy-MM-dd');
                  const isCurrentDay = isSameDay(d, today);
                  const isSatSun = isWeekend(d);
                  const dayMilestones = milestonesByDate[dateStr];
                  const hasMilestone = dayMilestones && dayMilestones.length > 0;

                  return (
                    <th
                      key={d.toISOString()}
                      style={{
                        padding: '6px 2px',
                        textAlign: 'center',
                        minWidth: 34,
                        background: hasMilestone
                          ? 'rgba(247, 154, 79, 0.2)'
                          : isCurrentDay
                          ? 'var(--accent-soft)'
                          : isSatSun
                          ? 'var(--bg-hover)'
                          : 'var(--bg-elevated)',
                        border: hasMilestone ? '2px solid var(--warning)' : '1px solid var(--border)',
                        color: hasMilestone ? 'var(--warning)' : isCurrentDay ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: hasMilestone || isCurrentDay ? 700 : 600,
                      }}
                      title={hasMilestone ? `Milestone Gate: ${dayMilestones.map(m => m.name).join(', ')}` : undefined}
                    >
                      <div style={{ fontSize: 11 }}>{format(d, 'd')}</div>
                      {hasMilestone ? (
                        <div style={{ fontSize: 9, color: 'var(--warning)', fontWeight: 800 }}>🎯</div>
                      ) : (
                        <div style={{ fontSize: 8, opacity: 0.7, textTransform: 'uppercase' }}>
                          {format(d, 'EEE')}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {stakeholders.map(stk => {
                return (
                  <tr key={stk.id}>
                    {/* Stakeholder Info Column */}
                    <td
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={stk.name} size={26} />
                          <div className="min-w-0">
                            <div style={{ fontWeight: 600, fontSize: 12 }} className="truncate">
                              {stk.name}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10 }} className="truncate">
                              {stk.role} · {stk.organization}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`badge badge-${
                            stk.influenceLevel === 'very-high'
                              ? 'danger'
                              : stk.influenceLevel === 'high'
                              ? 'warning'
                              : 'neutral'
                          }`}
                          style={{ fontSize: 9, padding: '1px 5px', flexShrink: 0 }}
                        >
                          {stk.influenceLevel}
                        </span>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {teamViewDays.map(d => {
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const dayAbsences = getAbsencesForStakeholderDay(stk.id, d);
                      const hasAbsence = dayAbsences.length > 0;
                      const dayMilestones = milestonesByDate[dateStr];
                      const isMilestoneDay = dayMilestones && dayMilestones.length > 0;
                      const hasConflict = hasAbsence && isMilestoneDay;
                      const isCurrentDay = isSameDay(d, today);
                      const isSatSun = isWeekend(d);

                      return (
                        <td
                          key={d.toISOString()}
                          className={`team-matrix-cell${hasAbsence ? ' has-absence' : ' empty-cell'}`}
                          style={{
                            background: hasConflict
                              ? 'rgba(239, 68, 68, 0.2)'
                              : isCurrentDay
                              ? 'var(--accent-soft)'
                              : isSatSun
                              ? 'var(--bg-hover)'
                              : 'var(--bg-surface)',
                            border: hasConflict
                              ? '2px solid var(--danger)'
                              : isMilestoneDay
                              ? '1px dashed var(--warning)'
                              : '1px solid var(--border)',
                          }}
                          onClick={() => {
                            if (hasAbsence) {
                              handleOpenStakeholderEdit(dayAbsences[0]);
                            } else {
                              handleOpenStakeholderCreate(stk.id, dateStr);
                            }
                          }}
                          title={
                            hasConflict
                              ? `⚠️ CONFLICT: ${stk.name} is absent during Milestone: ${dayMilestones.map(m => m.name).join(', ')} (${dayAbsences[0].startDate} → ${dayAbsences[0].endDate})\nNotes: ${dayAbsences[0].notes || 'None'}`
                              : hasAbsence
                              ? `${stk.name}: ${dayAbsences[0].type.toUpperCase()} (${dayAbsences[0].startDate} → ${dayAbsences[0].endDate})\n${dayAbsences[0].notes || ''}`
                              : isMilestoneDay
                              ? `Milestone: ${dayMilestones.map(m => m.name).join(', ')}. Click to log absence for ${stk.name}.`
                              : `Click to log absence for ${stk.name} on ${dateStr}`
                          }
                        >
                          {hasConflict ? (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: 'var(--danger)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 700,
                                borderRadius: 'var(--radius-xs)',
                              }}
                            >
                              ⚠️ GATE
                            </div>
                          ) : hasAbsence ? (
                            <div
                              className="team-matrix-absence-block"
                              style={{
                                background: ABSENCE_COLORS[dayAbsences[0].type] || '#7c6af7',
                                color: '#ffffff',
                              }}
                            >
                              {(ABSENCE_TYPES.find(t => t.value === dayAbsences[0].type)?.short ||
                                dayAbsences[0].type.slice(0, 3)
                              ).toUpperCase()}
                            </div>
                          ) : isMilestoneDay ? (
                            <div
                              style={{
                                fontSize: 10,
                                opacity: 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                              }}
                            >
                              🎯
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>💡 <strong>Milestone Guard:</strong> Red cells (⚠️ GATE) indicate a stakeholder will be absent on a milestone target date. Click any cell to record or edit their availability.</span>
        </div>
      </div>

      {/* Absence Modal (Team Members) */}
      {isModalOpen && (
        <AbsenceModal
          absence={editingAbsence}
          initialResourceId={modalInitialResource}
          initialDate={modalInitialDate}
          resources={resources}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAbsence(null);
          }}
          onSave={handleSaveAbsence}
          onDelete={handleDeleteAbsence}
        />
      )}

      {/* Stakeholder Absence Modal */}
      {isStakeholderModalOpen && (
        <StakeholderAbsenceModal
          absence={editingStakeholderAbsence}
          initialStakeholderId={modalStakeholderId}
          initialDate={modalStakeholderDate}
          stakeholders={stakeholders}
          onClose={() => {
            setIsStakeholderModalOpen(false);
            setEditingStakeholderAbsence(null);
          }}
          onSave={handleSaveAbsence}
          onDelete={handleDeleteAbsence}
        />
      )}
    </div>
  );
}
