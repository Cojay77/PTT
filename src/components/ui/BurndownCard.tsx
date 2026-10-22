import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Clock, CheckCircle2, AlertTriangle, Zap, Target } from 'lucide-react';
import type { Task, ProjectConfig, Milestone } from '../../types';
import { computeBurndown } from '../../utils/burndown';

interface BurndownCardProps {
  tasks: Task[];
  config?: ProjectConfig | null;
  milestones?: Milestone[];
  height?: number;
  title?: string;
  showKpis?: boolean;
}

export function BurndownCard({
  tasks,
  config,
  milestones = [],
  height = 220,
  title = 'Task Burndown & Trajectory',
  showKpis = true,
}: BurndownCardProps) {
  const burndown = useMemo(
    () => computeBurndown(tasks, config, milestones),
    [tasks, config, milestones]
  );

  if (burndown.totalTasks === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <TrendingUp size={18} color="var(--accent)" />
          <span className="section-title">{title}</span>
        </div>
        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
          No active tasks recorded. Add tasks to see the project burndown trajectory.
        </div>
      </div>
    );
  }

  const StatusIcon =
    burndown.status === 'completed'
      ? CheckCircle2
      : burndown.status === 'on-track'
      ? Zap
      : AlertTriangle;

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} color="var(--accent)" />
          <span className="section-title">{title}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <span
            className="badge"
            style={{
              background: `color-mix(in srgb, ${burndown.statusColor} 15%, transparent)`,
              color: burndown.statusColor,
              border: `1px solid color-mix(in srgb, ${burndown.statusColor} 30%, transparent)`,
              fontSize: 11,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <StatusIcon size={12} />
            {burndown.statusLabel}
          </span>
          <span className="badge badge-primary" style={{ fontSize: 11 }}>
            {burndown.doneTasks} of {burndown.totalTasks} completed ({burndown.completionRate}%)
          </span>
        </div>
      </div>

      {showKpis && (
        <div
          style={{
            padding: '10px 16px 0 16px',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 11,
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Zap size={12} color="var(--accent)" />
            <span>Velocity:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{burndown.velocityPerWeek} tasks/week</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="var(--text-secondary)" />
            <span>Remaining:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{burndown.remainingTasks} open tasks</strong>
          </div>
          {burndown.targetDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Target size={12} color="var(--purple, #7c6af7)" />
              <span>Target Delivery:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{burndown.targetDate}</strong>
            </div>
          )}
        </div>
      )}

      <div style={{ height, padding: '12px 16px 8px 8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={burndown.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
            <XAxis
              dataKey="period"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              allowDecimals={false}
              label={{ value: 'Remaining Tasks', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10, offset: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: 'var(--shadow-md)',
              }}
              formatter={(value: any, name: any) => {
                if (value === undefined || value === null) return [null, null];
                const labelMap: Record<string, string> = {
                  Ideal: 'Ideal Planned Pace',
                  Remaining: 'Actual Remaining',
                  Projected: 'Projected Remaining',
                };
                return [`${value} task${value !== 1 ? 's' : ''}`, labelMap[name] || name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              formatter={(val: string) => {
                const legendMap: Record<string, string> = {
                  Ideal: 'Ideal Burn (Linear Pace)',
                  Remaining: 'Actual Remaining Tasks',
                  Projected: 'Projected Trajectory (Velocity)',
                };
                return legendMap[val] || val;
              }}
            />
            <Line
              type="monotone"
              dataKey="Ideal"
              name="Ideal"
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="Remaining"
              name="Remaining"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'var(--accent)' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Projected"
              name="Projected"
              stroke="#4ff7a8"
              strokeDasharray="3 3"
              strokeWidth={2}
              dot={{ r: 3, fill: '#4ff7a8' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
