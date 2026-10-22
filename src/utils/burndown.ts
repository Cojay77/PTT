import { format, parseISO, differenceInDays, addDays, subDays, isValid } from 'date-fns';
import type { Task, ProjectConfig, Milestone } from '../types';

export interface BurndownPoint {
  period: string;
  dateStr: string;
  isToday?: boolean;
  Ideal: number;
  Remaining?: number;
}

export interface BurndownAnalysis {
  data: BurndownPoint[];
  totalTasks: number;
  doneTasks: number;
  remainingTasks: number;
  completionRate: number;
  velocityPerWeek: number;
  idealRemainingToday: number;
  paceVariance: number; // < 0 means ahead of pace (fewer tasks left), > 0 means behind pace
  targetDate: string | null;
  startDate: string | null;
  status: 'completed' | 'ahead' | 'on-track' | 'at-risk' | 'behind' | 'not-started';
  statusLabel: string;
  statusColor: string;
}

function parseValidDate(str?: string | null): Date | null {
  if (!str) return null;
  try {
    const d = parseISO(str);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function computeBurndown(
  tasks: Task[],
  config?: ProjectConfig | null,
  milestones: Milestone[] = []
): BurndownAnalysis {
  const activeTasks = tasks.filter(t => !t.isBacklog);
  const totalTasks = activeTasks.length;
  const doneTasks = activeTasks.filter(t => t.status === 'done').length;
  const remainingTasks = Math.max(0, totalTasks - doneTasks);
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (totalTasks === 0) {
    return {
      data: [],
      totalTasks: 0,
      doneTasks: 0,
      remainingTasks: 0,
      completionRate: 0,
      velocityPerWeek: 0,
      idealRemainingToday: 0,
      paceVariance: 0,
      targetDate: null,
      startDate: null,
      status: 'not-started',
      statusLabel: 'No active tasks',
      statusColor: 'var(--text-muted)',
    };
  }

  // 1. Determine Project Start Date
  let startDate = parseValidDate(config?.startDate);
  if (!startDate) {
    for (const t of activeTasks) {
      const d1 = parseValidDate(t.startDate);
      const d2 = parseValidDate(t.createdAt);
      const d = d1 || d2;
      if (d && (!startDate || d < startDate)) startDate = d;
    }
  }
  if (!startDate || startDate > today) {
    startDate = subDays(today, 28);
  }
  startDate.setHours(0, 0, 0, 0);

  // 2. Determine Project Target Date
  let targetDate = parseValidDate(config?.targetDate);
  if (!targetDate) {
    for (const m of milestones) {
      const d = parseValidDate(m.targetDate);
      if (d && (!targetDate || d > targetDate)) targetDate = d;
    }
    for (const t of activeTasks) {
      const d = parseValidDate(t.dueDate);
      if (d && (!targetDate || d > targetDate)) targetDate = d;
    }
  }
  if (!targetDate || targetDate <= startDate) {
    targetDate = addDays(today, 28);
  }
  targetDate.setHours(0, 0, 0, 0);

  // 3. Determine Pace vs Ideal Planned Schedule at Today
  const totalDays = Math.max(1, differenceInDays(targetDate, startDate));
  const todayOffset = Math.max(0, differenceInDays(today, startDate));
  const idealProgressFrac = Math.max(0, Math.min(1, todayOffset / totalDays));
  const idealRemainingToday = Math.round(totalTasks * (1 - idealProgressFrac));
  const paceVariance = remainingTasks - idealRemainingToday;

  const daysElapsed = Math.max(1, differenceInDays(today, startDate));
  const velocityPerWeek = Math.round((doneTasks / daysElapsed) * 7 * 10) / 10;

  let status: BurndownAnalysis['status'] = 'on-track';
  let statusLabel = 'On pace with target';
  let statusColor = 'var(--success)';

  if (remainingTasks === 0) {
    status = 'completed';
    statusLabel = 'Completed';
    statusColor = 'var(--success)';
  } else if (doneTasks === 0 && today > startDate && idealRemainingToday < totalTasks) {
    status = 'behind';
    statusLabel = `${totalTasks - idealRemainingToday} tasks behind pace`;
    statusColor = 'var(--danger)';
  } else if (doneTasks === 0) {
    status = 'not-started';
    statusLabel = 'Not started';
    statusColor = 'var(--text-muted)';
  } else if (paceVariance < -1) {
    status = 'ahead';
    statusLabel = `${Math.abs(paceVariance)} task${Math.abs(paceVariance) !== 1 ? 's' : ''} ahead of pace`;
    statusColor = 'var(--success)';
  } else if (paceVariance >= -1 && paceVariance <= 1) {
    status = 'on-track';
    statusLabel = 'On pace with target';
    statusColor = 'var(--success)';
  } else if (paceVariance > 1 && paceVariance <= 3) {
    status = 'at-risk';
    statusLabel = `${paceVariance} tasks behind pace`;
    statusColor = 'var(--warning)';
  } else {
    status = 'behind';
    statusLabel = `${paceVariance} tasks behind pace`;
    statusColor = 'var(--danger)';
  }

  // 4. Generate Timeline Intervals
  // Points: Start Date, Mid Past (if >= 14 days), Today, Mid Future (if >= 14 days), Target Date
  const points: { date: Date; label: string; isToday?: boolean }[] = [];

  points.push({ date: startDate, label: `Start (${format(startDate, 'MMM d')})` });

  const pastSpan = differenceInDays(today, startDate);
  if (pastSpan >= 16) {
    const midPast = addDays(startDate, Math.round(pastSpan / 2));
    points.push({ date: midPast, label: format(midPast, 'MMM d') });
  }

  points.push({ date: today, label: `Today (${format(today, 'MMM d')})`, isToday: true });

  const futureSpan = differenceInDays(targetDate, today);
  if (futureSpan >= 16) {
    const midFuture = addDays(today, Math.round(futureSpan / 2));
    points.push({ date: midFuture, label: format(midFuture, 'MMM d') });
  }

  points.push({ date: targetDate, label: `Target (${format(targetDate, 'MMM d')})` });

  // 5. Compute Ideal and Actual Remaining for each point
  const data: BurndownPoint[] = points.map(pt => {
    // Ideal descent from totalTasks at startDate to 0 at targetDate
    let ideal = 0;
    if (pt.date <= startDate) {
      ideal = totalTasks;
    } else if (pt.date >= targetDate) {
      ideal = 0;
    } else {
      const frac = differenceInDays(pt.date, startDate) / totalDays;
      ideal = Math.max(0, Math.round(totalTasks * (1 - frac)));
    }

    // Actual remaining up to Today (future points remain undefined so actual line stops at Today)
    let remaining: number | undefined = undefined;
    if (pt.date <= today) {
      if (pt.isToday || pt.date.getTime() === today.getTime()) {
        remaining = remainingTasks;
      } else {
        const elapsedFrac = differenceInDays(pt.date, startDate) / Math.max(1, pastSpan);
        const tasksCompletedByThen = Math.round(doneTasks * Math.max(0, Math.min(1, elapsedFrac)));
        remaining = Math.max(remainingTasks, totalTasks - tasksCompletedByThen);
      }
    }

    return {
      period: pt.label,
      dateStr: format(pt.date, 'yyyy-MM-dd'),
      isToday: pt.isToday,
      Ideal: ideal,
      Remaining: remaining,
    };
  });

  return {
    data,
    totalTasks,
    doneTasks,
    remainingTasks,
    completionRate,
    velocityPerWeek,
    idealRemainingToday,
    paceVariance,
    targetDate: format(targetDate, 'yyyy-MM-dd'),
    startDate: format(startDate, 'yyyy-MM-dd'),
    status,
    statusLabel,
    statusColor,
  };
}
