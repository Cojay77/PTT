import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { Avatar } from '../components/ui/shared';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isWithinInterval, addMonths, subMonths, isWeekend, startOfWeek, endOfWeek } from 'date-fns';
import type { Absence } from '../types';

const ABSENCE_COLORS: Record<string, string> = {
  vacation: '#4f8ef7', RTT: '#7c6af7', sick: '#f74f4f', training: '#f7d14f',
  'business-trip': '#4fd9f7', remote: '#8ef74f', 'partial-availability': '#f79a4f',
};

export default function TeamCalendar() {
  const { resources, absences } = useDataStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'team'>('team');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function getAbsencesForResourceDay(resourceId: string, day: Date): Absence[] {
    return absences.filter(a => {
      if (a.resourceId !== resourceId) return false;
      try {
        return isWithinInterval(day, { start: parseISO(a.startDate), end: parseISO(a.endDate) });
      } catch { return false; }
    });
  }

  function getAbsencesForDay(day: Date): Array<{ resource: typeof resources[0]; absence: Absence }> {
    const result: Array<{ resource: typeof resources[0]; absence: Absence }> = [];
    for (const r of resources) {
      for (const a of absences) {
        if (a.resourceId !== r.id) continue;
        try {
          if (isWithinInterval(day, { start: parseISO(a.startDate), end: parseISO(a.endDate) })) {
            result.push({ resource: r, absence: a });
          }
        } catch {}
      }
    }
    return result;
  }

  const today = new Date();

  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });
  const weekDays = days.filter(d => !isWeekend(d));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="page-title">Team Calendar</h1>
          <p className="page-subtitle">{format(currentMonth, 'MMMM yyyy')} · {resources.length} resources</p>
        </div>
        <div className="ml-auto flex gap-2">
          <div className="tabs" style={{ border: 'none' }}>
            <button className={`tab${view === 'team' ? ' active' : ''}`} onClick={() => setView('team')}>Team View</button>
            <button className={`tab${view === 'month' ? ' active' : ''}`} onClick={() => setView('month')}>Month View</button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => subMonths(m, 1))}><ChevronLeft size={14} /></button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(new Date())}>Today</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setCurrentMonth(m => addMonths(m, 1))}><ChevronRight size={14} /></button>
        </div>
      </div>

      {view === 'team' ? (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ width: 160, textAlign: 'left', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', position: 'sticky', left: 0, zIndex: 2 }}>Resource</th>
                  {weekDays.map(d => {
                    const isToday = isSameDay(d, today);
                    return (
                      <th key={d.toISOString()} style={{
                        padding: '4px', textAlign: 'center', minWidth: 32,
                        background: isToday ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                        fontWeight: isToday ? 700 : 600,
                      }}>
                        <div>{format(d, 'd')}</div>
                        <div style={{ fontSize: 9, opacity: 0.7 }}>{format(d, 'EEE')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {resources.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', position: 'sticky', left: 0, zIndex: 1 }}>
                      <div className="flex items-center gap-2">
                        <Avatar name={r.name} size={24} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{r.role}</div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(d => {
                      const dayAbsences = getAbsencesForResourceDay(r.id, d);
                      const isToday = isSameDay(d, today);
                      return (
                        <td key={d.toISOString()} style={{
                          padding: 2, textAlign: 'center', minWidth: 32, height: 36,
                          background: isToday ? 'var(--accent-soft)' : dayAbsences.length > 0 ? `${ABSENCE_COLORS[dayAbsences[0].type] || '#4f8ef7'}33` : 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                        }}>
                          {dayAbsences.map(a => (
                            <div key={a.id} title={`${a.type}: ${a.startDate} → ${a.endDate}\n${a.notes}`} style={{
                              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: ABSENCE_COLORS[a.type] || '#4f8ef7',
                            }}>
                              {a.type.slice(0, 1).toUpperCase()}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {Object.entries(ABSENCE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2" style={{ fontSize: 11 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: color, opacity: 0.7 }} />
                <span style={{ color: 'var(--text-muted)' }}>{type.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} style={{ background: 'var(--bg-elevated)', padding: '8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d}</div>
          ))}
          {calendarDays.map(d => {
            const inMonth = d.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(d, today);
            const dayAbsences = getAbsencesForDay(d);
            return (
              <div key={d.toISOString()} style={{
                background: isToday ? 'var(--accent-soft)' : 'var(--bg-surface)',
                padding: 6, minHeight: 80, opacity: inMonth ? 1 : 0.3,
              }}>
                <div style={{ fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>
                  {format(d, 'd')}
                </div>
                {dayAbsences.slice(0, 3).map(({ resource: res, absence }) => (
                  <div key={`${res.id}-${absence.id}`} style={{
                    fontSize: 10, borderRadius: 3, padding: '2px 4px', marginBottom: 2,
                    background: `${ABSENCE_COLORS[absence.type] || '#4f8ef7'}33`,
                    color: ABSENCE_COLORS[absence.type] || '#4f8ef7',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }} title={`${res.name}: ${absence.type}`}>
                    {res.name.split(' ')[0]}: {absence.type}
                  </div>
                ))}
                {dayAbsences.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{dayAbsences.length - 3}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
