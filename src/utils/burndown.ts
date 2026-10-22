import { format, parseISO, differenceInDays, addDays, subDays, isValid } from 'date-fns';
import type { Task, ProjectConfig, Milestone } from '../types';

export interface BurndownPoint {
  period: string;
  dateStr: string;
  isToday?: boolean;
  Ideal: number;
  Remaining?: number;
  Projected?: number;
}

export interface BurndownAnalysis {
  data: BurndownPoint[];
  totalTasks: number;
  doneTasks: number;
  remainingTasks: number;
  completionRate: number;
  velocityPerWeek: number;
  projectedFinishDate: string | null;
  targetDate: string | null;
  status: 'completed' | 'on-track' | 'at-risk' | 'behind' | 'not-started';
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
      projectedFinishDate: null,
      targetDate: null,
      status: 'not-started',
      statusLabel: 'No active tasks',
      statusColor: 'var(--text-muted)',
    };
  }

  // 1. Determine Project Start Date
  let startDate = parseValidDate(config?.startDate);
  if (!startDate) {
    // Try earliest task createdAt or startDate
    for (const t of activeTasks) {
      const d1 = parseValidDate(t.startDate);
      const d2 = parseValidDate(t.createdAt);
      const d = d1 || d2;
      if (d && (!startDate || d < startDate)) startDate = d;
    }
  }
  if (!startDate || startDate > today) {
    // Default start to 4 weeks ago if not set or in future
    startDate = subDays(today, 28);
  }
  startDate.setHours(0, 0, 0, 0);

  // 2. Determine Project Target Date
  let targetDate = parseValidDate(config?.targetDate);
  if (!targetDate) {
    // Check milestones with target dates
    for (const m of milestones) {
      const d = parseValidDate(m.targetDate);
      if (d && (!targetDate || d > targetDate)) targetDate = d;
    }
    // Check task due dates
    for (const t of activeTasks) {
      const d = parseValidDate(t.dueDate);
      if (d && (!targetDate || d > targetDate)) targetDate = d;
    }
  }
  if (!targetDate || targetDate <= startDate) {
    targetDate = addDays(today, 28);
  }
  targetDate.setHours(0, 0, 0, 0);

  // 3. Determine Velocity and Projected Finish
  const daysElapsed = Math.max(1, differenceInDays(today, startDate));
  const tasksPerDay = doneTasks / daysElapsed;
  const velocityPerWeek = Math.round(tasksPerDay * 7 * 10) / 10;

  let projectedFinishDate: Date | null = null;
  let status: BurndownAnalysis['status'] = 'on-track';
  let statusLabel = 'On track';
  let statusColor = 'var(--success)';

  if (remainingTasks === 0) {
    status = 'completed';
    statusLabel = 'Completed';
    statusColor = 'var(--success)';
  } else if (doneTasks === 0) {
    status = 'not-started';
    statusLabel = 'No tasks completed yet';
    statusColor = 'var(--warning)';
  } else {
    const daysNeeded = Math.ceil(remainingTasks / tasksPerDay);
    projectedFinishDate = addDays(today, daysNeeded);

    const daysVariance = differenceInDays(projectedFinishDate, targetDate);
    if (daysVariance <= 0) {
      status = 'on-track';
      statusLabel = `On track (projected ${format(projectedFinishDate, 'MMM d')})`;
      statusColor = 'var(--success)';
    } else if (daysVariance <= 14) {
      status = 'at-risk';
      statusLabel = `At risk: ~${daysVariance}d late (${format(projectedFinishDate, 'MMM d')})`;
      statusColor = 'var(--warning)';
    } else {
      status = 'behind';
      statusLabel = `Behind schedule (${daysVariance}d late, est. ${format(projectedFinishDate, 'MMM d')})`;
      statusColor = 'var(--danger)';
    }
  }

  // 4. Generate Timeline Intervals
  // We include: Start Date, Mid Past (if >= 10 days), Today, Mid Future (if >= 10 days), Target Date
  // Plus any overshoot point if projected finish is past target date
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

  // If projected completion is significantly past target date, add a forecast end point
  if (projectedFinishDate && projectedFinishDate > targetDate && differenceInDays(projectedFinishDate, targetDate) >= 7) {
    points.push({ date: projectedFinishDate, label: `Est. Done (${format(projectedFinishDate, 'MMM d')})` });
  }

  // 5. Compute Ideal, Remaining, and Projected for each point
  const totalDays = Math.max(1, differenceInDays(targetDate, startDate));

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

    // Actual remaining for past up to today
    let remaining: number | undefined = undefined;
    if (pt.date <= today) {
      if (pt.isToday || pt.date.getTime() === today.getTime()) {
        remaining = remainingTasks;
      } else {
        // Approximate historical progress proportionally from totalTasks to today's remaining
        const elapsedFrac = differenceInDays(pt.date, startDate) / daysElapsed;
        const tasksCompletedByThen = Math.round(doneTasks * Math.max(0, Math.min(1, elapsedFrac)));
        remaining = Math.max(remainingTasks, totalTasks - tasksCompletedByThen);
      }
    }

    // Projected from today into future (seamlessly connected at today)
    let projected: number | undefined = undefined;
    if (pt.date >= today) {
      if (pt.isToday || pt.date.getTime() === today.getTime()) {
        projected = remainingTasks;
      } else if (tasksPerDay > 0) {
        const daysFromNow = differenceInDays(pt.date, today);
        const furtherDone = Math.round(tasksPerDay * daysFromNow);
        projected = Math.max(0, remainingTasks - furtherDone);
      } else {
        projected = remainingTasks;
      }
    }

    return {
      period: pt.label,
      dateStr: format(pt.date, 'yyyy-MM-dd'),
      isToday: pt.isToday,
      Ideal: ideal,
      Remaining: remaining,
      Projected: projected,
    };
  });

  return {
    data,
    totalTasks,
    doneTasks,
    remainingTasks,
    completionRate,
    velocityPerWeek,
    projectedFinishDate: projectedFinishDate ? format(projectedFinishDate, 'yyyy-MM-dd') : null,
    targetDate: format(targetDate, 'yyyy-MM-dd'),
    status,
    statusLabel,
    statusColor,
  };
}
