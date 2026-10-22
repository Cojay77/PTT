import { useState, useRef, useMemo } from 'react';
import { useDataStore } from '../store/useDataStore';
import { useTaskStore } from '../store/useTaskStore';
import { ProgressBar, MilestoneBadge } from '../components/ui/shared';
import { format, parseISO, differenceInDays, subDays, addDays, isValid } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

type DatePreset = 'all' | 'current_quarter' | 'next_3m' | 'past_3m' | 'this_year' | 'custom';

const ZOOM_LEVELS = [100, 125, 150, 200, 250, 300];

export default function Timeline() {
  const { milestones } = useDataStore();
  const { tasks } = useTaskStore();
  const [showTaskLanes, setShowTaskLanes] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Date range and view scale state
  const [dateRangePreset, setDateRangePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function toggleMilestone(id: string) {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Filter milestones that have a target date (undated ones would produce Invalid Date)
  const sorted = useMemo(() => {
    return milestones
      .filter(m => m.targetDate)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  }, [milestones]);

  const undated = useMemo(() => {
    return milestones.filter(m => !m.targetDate);
  }, [milestones]);

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  // Baseline timeline bounds derived from all milestone dates
  const { autoStartDate, autoEndDate } = useMemo(() => {
    if (sorted.length === 0) {
      return { autoStartDate: subDays(today, 30), autoEndDate: addDays(today, 30) };
    }
    const allDates = sorted
      .flatMap(m => [m.targetDate, m.actualDate].filter(Boolean) as string[])
      .sort();
    const firstDate = allDates[0] || sorted[0].targetDate;
    const lastDate = allDates[allDates.length - 1] || sorted[sorted.length - 1].targetDate;
    return {
      autoStartDate: subDays(parseISO(firstDate), 30),
      autoEndDate: addDays(parseISO(lastDate), 30),
    };
  }, [sorted, today]);

  // Calculate effective start and end dates based on preset or custom selections
  const { startDate, endDate, totalDays, isTodayInRange, todayPct } = useMemo(() => {
    let s: Date;
    let e: Date;

    if (dateRangePreset === 'all') {
      s = autoStartDate;
      e = autoEndDate;
    } else if (dateRangePreset === 'current_quarter') {
      const q = Math.floor(today.getMonth() / 3);
      s = new Date(today.getFullYear(), q * 3, 1);
      e = new Date(today.getFullYear(), q * 3 + 3, 0);
    } else if (dateRangePreset === 'next_3m') {
      s = subDays(today, 7);
      e = addDays(today, 90);
    } else if (dateRangePreset === 'past_3m') {
      s = subDays(today, 90);
      e = addDays(today, 14);
    } else if (dateRangePreset === 'this_year') {
      s = new Date(today.getFullYear(), 0, 1);
      e = new Date(today.getFullYear(), 11, 31);
    } else {
      // Custom preset
      const parsedS = customStartDate ? parseISO(customStartDate) : null;
      const parsedE = customEndDate ? parseISO(customEndDate) : null;
      s = parsedS && isValid(parsedS) ? parsedS : autoStartDate;
      e = parsedE && isValid(parsedE) ? parsedE : autoEndDate;
    }

    if (e <= s) {
      e = addDays(s, 30);
    }

    const days = Math.max(1, differenceInDays(e, s));
    const offset = differenceInDays(today, s);
    const inRange = offset >= 0 && offset <= days;
    const pct = (offset / days) * 100;

    return {
      startDate: s,
      endDate: e,
      totalDays: days,
      isTodayInRange: inRange,
      todayPct: pct,
    };
  }, [dateRangePreset, customStartDate, customEndDate, autoStartDate, autoEndDate, today]);

  function handlePresetChange(preset: DatePreset) {
    setDateRangePreset(preset);
    if (preset === 'all') {
      setCustomStartDate(format(autoStartDate, 'yyyy-MM-dd'));
      setCustomEndDate(format(autoEndDate, 'yyyy-MM-dd'));
    } else if (preset === 'current_quarter') {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      const end = new Date(today.getFullYear(), q * 3 + 3, 0);
      setCustomStartDate(format(start, 'yyyy-MM-dd'));
      setCustomEndDate(format(end, 'yyyy-MM-dd'));
    } else if (preset === 'next_3m') {
      const start = subDays(today, 7);
      const end = addDays(today, 90);
      setCustomStartDate(format(start, 'yyyy-MM-dd'));
      setCustomEndDate(format(end, 'yyyy-MM-dd'));
    } else if (preset === 'past_3m') {
      const start = subDays(today, 90);
      const end = addDays(today, 14);
      setCustomStartDate(format(start, 'yyyy-MM-dd'));
      setCustomEndDate(format(end, 'yyyy-MM-dd'));
    } else if (preset === 'this_year') {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      setCustomStartDate(format(start, 'yyyy-MM-dd'));
      setCustomEndDate(format(end, 'yyyy-MM-dd'));
    }
  }

  function zoomIn() {
    setZoom(prev => {
      const nextIdx = ZOOM_LEVELS.findIndex(z => z > prev);
      return nextIdx !== -1 ? ZOOM_LEVELS[nextIdx] : prev;
    });
  }

  function zoomOut() {
    setZoom(prev => {
      const rev = [...ZOOM_LEVELS].reverse();
      const nextVal = rev.find(z => z < prev);
      return nextVal !== undefined ? nextVal : prev;
    });
  }

  function scrollToToday() {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    // Track width is total width minus sticky left column (240px) and right column (76px)
    const trackWidth = container.scrollWidth - 316;
    const todayPx = 240 + (Math.max(0, Math.min(100, todayPct)) / 100) * trackWidth;
    const targetScrollLeft = todayPx - container.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
  }

  function getPct(dateStr: string): number {
    try {
      const d = parseISO(dateStr);
      const offset = differenceInDays(d, startDate);
      return (offset / totalDays) * 100;
    } catch {
      return 0;
    }
  }

  const todayX = `${Math.max(0, Math.min(100, todayPct))}%`;

  // Compute minimum comfortable width based on totalDays and zoom
  const timelineWidth = useMemo(() => {
    const baseFromDays = Math.max(960, Math.round(totalDays * 3.5));
    if (zoom === 100 && totalDays <= 120) {
      return '100%';
    }
    const scaled = Math.round(baseFromDays * (zoom / 100));
    return `${scaled}px`;
  }, [totalDays, zoom]);

  // Generate dynamic date ticks for the time axis header
  const ticks = useMemo(() => {
    let tickCount: number;
    if (totalDays <= 30) tickCount = Math.min(totalDays, 8);
    else if (totalDays <= 90) tickCount = 8;
    else if (totalDays <= 180) tickCount = Math.round(10 * (zoom / 100));
    else if (totalDays <= 365) tickCount = Math.round(12 * (zoom / 100));
    else tickCount = Math.min(24, Math.round(16 * (zoom / 100)));

    const count = Math.max(4, Math.min(26, tickCount));
    const list: { date: Date; pct: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const d = new Date(startDate);
      const dayOffset = Math.round((totalDays / count) * i);
      d.setDate(d.getDate() + dayOffset);
      const pct = (differenceInDays(d, startDate) / totalDays) * 100;
      list.push({ date: d, pct });
    }
    return list;
  }, [startDate, totalDays, zoom]);

  if (milestones.length === 0) {
    return (
      <div>
        <h1 className="page-title mb-6">Project Timeline</h1>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          No milestones to display. Add milestones to see the timeline.
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div>
        <h1 className="page-title mb-6">Project Timeline</h1>
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          All {milestones.length} milestone{milestones.length > 1 ? 's have' : ' has'} no target date set. Add dates to see the timeline.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Project Timeline</h1>
        <p className="page-subtitle">
          {sorted.length} milestone{sorted.length !== 1 ? 's' : ''} on timeline
          {undated.length > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {undated.length} without date</span>}
        </p>
      </div>

      {/* Gantt-style timeline Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Top Header Row with Title, Legend and Task lanes toggle */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="section-title">Milestone & Task Gantt Timeline</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 9, height: 9, border: '1.5px dashed var(--text-muted)', transform: 'rotate(45deg)', display: 'inline-block' }} />
                <span>Target Date</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: 'var(--success)', transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 2 }} />
                <span>Early / On-time</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, background: 'var(--danger)', transform: 'rotate(45deg)', display: 'inline-block', borderRadius: 2 }} />
                <span>Late</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 16, height: 6, background: 'repeating-linear-gradient(45deg, rgba(79, 247, 168, 0.4), rgba(79, 247, 168, 0.4) 3px, rgba(79, 247, 168, 0.8) 3px, rgba(79, 247, 168, 0.8) 6px)', borderRadius: 2, display: 'inline-block' }} />
                <span>Variance</span>
              </div>
            </div>
            <label className="flex items-center gap-2" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={showTaskLanes}
                onChange={e => setShowTaskLanes(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Show Task Gantt Lanes</span>
            </label>
          </div>
        </div>

        {/* Timeline Controls Toolbar: Date Range Presets, Custom Range, Jump to Today & Zoom */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: Date Range Presets & Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Calendar size={14} color="var(--accent)" />
              <span>Range:</span>
            </div>

            <select
              value={dateRangePreset}
              onChange={e => handlePresetChange(e.target.value as DatePreset)}
              style={{
                fontSize: 12,
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <option value="all">Full Project Timeline</option>
              <option value="current_quarter">Current Quarter</option>
              <option value="next_3m">Next 3 Months</option>
              <option value="past_3m">Past 3 Months</option>
              <option value="this_year">Current Year</option>
              <option value="custom">Custom Date Range...</option>
            </select>

            {/* Custom Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>From:</span>
              <input
                type="date"
                value={customStartDate || format(startDate, 'yyyy-MM-dd')}
                onChange={e => {
                  setCustomStartDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>To:</span>
              <input
                type="date"
                value={customEndDate || format(endDate, 'yyyy-MM-dd')}
                onChange={e => {
                  setCustomEndDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Reset to Full Project button */}
            {dateRangePreset !== 'all' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handlePresetChange('all')}
                title="Reset to Full Project Timeline"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11 }}
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}

            {/* Date Span Summary */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>
              ({totalDays} days · {format(startDate, totalDays > 365 ? 'MMM d, yyyy' : 'MMM d')} – {format(endDate, totalDays > 365 ? 'MMM d, yyyy' : 'MMM d')})
            </span>
          </div>

          {/* Right: Jump to Today & Zoom / Horizontal Scale Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Jump to Today Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (!isTodayInRange) {
                  handlePresetChange('all');
                  setTimeout(scrollToToday, 50);
                } else {
                  scrollToToday();
                }
              }}
              title={isTodayInRange ? 'Center timeline on Today' : 'Today is outside range - Click to expand and jump to Today'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                fontSize: 11,
                fontWeight: 600,
                color: isTodayInRange ? 'var(--text-primary)' : 'var(--text-muted)',
                border: isTodayInRange ? '1px solid var(--danger)' : '1px solid var(--border)',
                background: isTodayInRange ? 'rgba(247, 79, 79, 0.08)' : 'var(--bg-surface)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
              <span>{isTodayInRange ? 'Jump to Today' : 'Show Today'}</span>
            </button>

            {/* Zoom / Scale Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-surface)', padding: '2px 4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= 100}
                title="Zoom Out"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: zoom <= 100 ? 'not-allowed' : 'pointer',
                  opacity: zoom <= 100 ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-primary)',
                }}
              >
                <ZoomOut size={14} />
              </button>

              <select
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                <option value={100}>100% (Fit)</option>
                <option value={125}>125%</option>
                <option value={150}>150%</option>
                <option value={200}>200%</option>
                <option value={250}>250%</option>
                <option value={300}>300%</option>
              </select>

              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= 300}
                title="Zoom In"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: zoom >= 300 ? 'not-allowed' : 'pointer',
                  opacity: zoom >= 300 ? 0.35 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-primary)',
                }}
              >
                <ZoomIn size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontally scrollable canvas */}
        <div
          ref={scrollContainerRef}
          style={{
            overflowX: 'auto',
            position: 'relative',
            scrollbarWidth: 'thin',
          }}
        >
          <div style={{ minWidth: timelineWidth, width: timelineWidth, padding: '20px 0' }}>
            {/* Time axis Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 38, marginBottom: 14 }}>
              {/* Left sticky column header */}
              <div
                style={{
                  width: 240,
                  flexShrink: 0,
                  position: 'sticky',
                  left: 0,
                  background: 'var(--bg-surface)',
                  zIndex: 15,
                  paddingLeft: 24,
                  paddingRight: 16,
                  borderRight: '1px solid var(--border)',
                  boxSizing: 'border-box',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Milestone / Task
              </div>

              {/* Middle track */}
              <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                {ticks.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${t.pct}%`,
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <span>{format(t.date, totalDays > 365 ? 'MMM d, yyyy' : 'MMM d')}</span>
                    <div style={{ width: 1, height: 6, background: 'var(--border)', marginTop: 4 }} />
                  </div>
                ))}

                {/* Header Today line & pin */}
                {isTodayInRange && (
                  <div
                    style={{
                      position: 'absolute',
                      left: todayX,
                      top: -6,
                      width: 2,
                      height: 'calc(100% + 6px)',
                      background: 'var(--danger)',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--danger)',
                        color: '#ffffff',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(247, 79, 79, 0.4)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      TODAY
                    </div>
                  </div>
                )}
              </div>

              {/* Right spacer / Progress column header */}
              <div
                style={{
                  width: 76,
                  flexShrink: 0,
                  paddingRight: 24,
                  paddingLeft: 12,
                  textAlign: 'right',
                  boxSizing: 'border-box',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Progress
              </div>
            </div>

            {/* Milestone rows */}
            {sorted.map(m => {
              const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isBacklog);
              const isCompleted = m.status === 'completed';
              const hasActual = Boolean(m.actualDate);
              const varianceDays = (m.actualDate && m.targetDate) ? differenceInDays(parseISO(m.actualDate), parseISO(m.targetDate)) : null;
              const daysLeft = m.targetDate ? differenceInDays(parseISO(m.targetDate), today) : null;
              const isLate = m.targetDate && m.targetDate < todayStr && !isCompleted && !hasActual;
              const isEarlyActual = varianceDays !== null && varianceDays < 0;
              const isLateActual = varianceDays !== null && varianceDays > 0;
              const targetPct = m.targetDate ? getPct(m.targetDate) : null;
              const actualPct = m.actualDate ? getPct(m.actualDate) : null;
              const isExpanded = showTaskLanes || expandedMilestones.has(m.id);

              return (
                <div key={m.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
                    {/* Left sticky column: Milestone Name & Status */}
                    <div
                      style={{
                        width: 240,
                        flexShrink: 0,
                        position: 'sticky',
                        left: 0,
                        background: 'var(--bg-surface)',
                        zIndex: 12,
                        paddingLeft: 24,
                        paddingRight: 16,
                        borderRight: '1px solid var(--border)',
                        boxSizing: 'border-box',
                        cursor: mTasks.length > 0 ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      onClick={() => mTasks.length > 0 && toggleMilestone(m.id)}
                    >
                      {mTasks.length > 0 ? (
                        isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />
                      ) : <span style={{ width: 14 }} />}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <MilestoneBadge status={isLate ? 'delayed' : m.status} />
                          {varianceDays !== null && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: varianceDays <= 0 ? 'var(--success)' : 'var(--danger)',
                              padding: '0 4px',
                              borderRadius: 3,
                              background: varianceDays <= 0 ? 'rgba(79, 247, 168, 0.15)' : 'rgba(247, 79, 79, 0.15)',
                            }}>
                              {varianceDays < 0 ? `${Math.abs(varianceDays)}d early` : varianceDays > 0 ? `${varianceDays}d late` : 'On time'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle track */}
                    <div style={{ flex: 1, position: 'relative', height: 36, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                      {/* Today line */}
                      {isTodayInRange && (
                        <div style={{ position: 'absolute', left: todayX, top: 0, width: 2, height: '100%', background: 'var(--danger)', opacity: 0.7, zIndex: 1, pointerEvents: 'none' }} />
                      )}

                      {/* Variance Connector Band (Difference between Target and Actual) */}
                      {targetPct !== null && actualPct !== null && varianceDays !== null && varianceDays !== 0 && (() => {
                        const minP = Math.max(0, Math.min(targetPct, actualPct));
                        const maxP = Math.min(100, Math.max(targetPct, actualPct));
                        if (maxP <= 0 || minP >= 100) return null;
                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${minP}%`,
                              width: `${Math.max(1, maxP - minP)}%`,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: 10,
                              borderRadius: 4,
                              background: isEarlyActual
                                ? 'repeating-linear-gradient(45deg, rgba(79, 247, 168, 0.25), rgba(79, 247, 168, 0.25) 5px, rgba(79, 247, 168, 0.45) 5px, rgba(79, 247, 168, 0.45) 10px)'
                                : 'repeating-linear-gradient(45deg, rgba(247, 79, 79, 0.25), rgba(247, 79, 79, 0.25) 5px, rgba(247, 79, 79, 0.45) 5px, rgba(247, 79, 79, 0.45) 10px)',
                              border: `1px dashed ${isEarlyActual ? 'var(--success)' : 'var(--danger)'}`,
                              zIndex: 2,
                            }}
                            title={`Variance: ${Math.abs(varianceDays)} days ${isEarlyActual ? 'early' : 'late'} (${m.targetDate} → ${m.actualDate})`}
                          />
                        );
                      })()}

                      {/* Target Date Marker */}
                      {targetPct !== null && targetPct >= -2 && targetPct <= 102 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${Math.max(0, Math.min(100, targetPct))}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: hasActual ? 3 : 4,
                          }}
                          title={hasActual ? `Target Date: ${m.targetDate}` : `${m.name}: ${m.targetDate}`}
                        >
                          {hasActual ? (
                            <div
                              style={{
                                width: 14,
                                height: 14,
                                background: 'var(--bg-surface)',
                                border: '2px dashed var(--text-muted)',
                                borderRadius: 2,
                                transform: 'rotate(45deg)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                background: isCompleted ? 'var(--success)' : isLate ? 'var(--danger)' : m.status === 'at-risk' ? 'var(--warning)' : 'var(--accent)',
                                borderRadius: 3,
                                transform: 'rotate(45deg)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Actual Date Marker */}
                      {actualPct !== null && actualPct >= -2 && actualPct <= 102 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${Math.max(0, Math.min(100, actualPct))}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 5,
                          }}
                          title={`Actual Date: ${m.actualDate} (${varianceDays !== null ? (varianceDays < 0 ? `${Math.abs(varianceDays)}d early` : varianceDays > 0 ? `${varianceDays}d late` : 'On time') : 'Completed'})`}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              background: isLateActual ? 'var(--danger)' : 'var(--success)',
                              borderRadius: 3,
                              transform: 'rotate(45deg)',
                              boxShadow: `0 2px 6px ${isLateActual ? 'rgba(247, 79, 79, 0.4)' : 'rgba(79, 247, 168, 0.4)'}`,
                              border: '2px solid var(--bg-surface)',
                            }}
                          />
                        </div>
                      )}

                      {/* Task indicators dots when collapsed */}
                      {!isExpanded && mTasks.filter(t => t.dueDate).slice(0, 8).map(t => {
                        const dPct = getPct(t.dueDate!);
                        if (dPct < 0 || dPct > 100) return null;
                        return (
                          <div key={t.id} style={{
                            position: 'absolute', left: `${dPct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                            width: 6, height: 6, borderRadius: '50%',
                            background: t.status === 'done' ? 'var(--success)' : t.status === 'blocked' ? 'var(--danger)' : 'var(--accent)',
                            opacity: 0.8, zIndex: 1,
                          }} title={`${t.title} (${t.status})`} />
                        );
                      })}

                      {/* Progress fill from start */}
                      {m.targetDate && m.progress > 0 && targetPct !== null && targetPct > 0 && (
                        <div style={{
                          position: 'absolute', left: 0, top: '25%', height: '50%',
                          width: `${Math.min(100, targetPct) * (m.progress / 100)}%`,
                          background: 'var(--accent)', opacity: 0.25, borderRadius: 4,
                        }} />
                      )}

                      {/* Date & Variance label */}
                      <div style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        fontSize: 10,
                        color: varianceDays !== null
                          ? (varianceDays <= 0 ? 'var(--success)' : 'var(--danger)')
                          : isCompleted
                            ? 'var(--success)'
                            : isLate
                              ? 'var(--danger)'
                              : 'var(--text-muted)',
                        fontWeight: hasActual || isCompleted || (daysLeft !== null && Math.abs(daysLeft) <= 7) ? 700 : 400,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        pointerEvents: 'none',
                      }}>
                        {hasActual && m.actualDate ? (
                          <>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                              Target: {format(parseISO(m.targetDate), 'MMM d')}
                            </span>
                            <span>→</span>
                            <span>
                              Actual: {format(parseISO(m.actualDate), 'MMM d')} ({varianceDays !== null ? (varianceDays < 0 ? `${Math.abs(varianceDays)}d early` : varianceDays > 0 ? `${varianceDays}d late` : 'On time') : 'Done'})
                            </span>
                          </>
                        ) : (
                          <>
                            {format(parseISO(m.targetDate), 'MMM d')}
                            {isCompleted ? ' (Completed)' : daysLeft !== null && ` (${daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d`})`}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right column: Progress % */}
                    <div style={{ width: 76, flexShrink: 0, textAlign: 'right', paddingRight: 24, paddingLeft: 12, boxSizing: 'border-box', fontSize: 12, fontWeight: 700, color: m.progress === 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {m.progress}%
                    </div>
                  </div>

                  {/* Task Gantt Lanes under Milestone */}
                  {isExpanded && mTasks.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {mTasks.map(t => {
                        const estDays = Math.max(1, Math.round((t.estimatedWorkload || 8) / 8));
                        const tDueDate = t.dueDate || m.targetDate;
                        const tStartDate = t.startDate || (tDueDate ? format(subDays(parseISO(tDueDate), estDays), 'yyyy-MM-dd') : null);
                        const startPct = tStartDate ? getPct(tStartDate) : 0;
                        const endPct = tDueDate ? getPct(tDueDate) : startPct;
                        const leftPct = Math.min(startPct, endPct);
                        const widthPct = Math.max(1.5, Math.abs(endPct - startPct));
                        const isTaskOverdue = t.dueDate && t.dueDate < todayStr && t.status !== 'done';
                        const taskColor = t.status === 'done' ? 'var(--success)' : isTaskOverdue ? 'var(--danger)' : t.status === 'blocked' ? 'var(--danger)' : t.status === 'in-progress' ? 'var(--accent)' : 'var(--text-muted)';
                        const isVisible = (leftPct + widthPct) >= 0 && leftPct <= 100;
                        const clampedLeft = Math.max(0, leftPct);
                        const clampedWidth = Math.min(100 - clampedLeft, Math.max(1.5, widthPct - (clampedLeft - leftPct)));

                        return (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', minHeight: 26 }}>
                            {/* Left sticky column: Task title */}
                            <div
                              style={{
                                width: 240,
                                flexShrink: 0,
                                position: 'sticky',
                                left: 0,
                                background: 'var(--bg-surface)',
                                zIndex: 11,
                                paddingLeft: 40,
                                paddingRight: 12,
                                borderRight: '1px solid var(--border)',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span style={{ fontSize: 9, color: taskColor }}>●</span>
                              <div className="truncate" style={{ fontSize: 11, color: 'var(--text-secondary)' }} title={t.title}>
                                {t.title}
                              </div>
                            </div>

                            {/* Middle track */}
                            <div style={{ flex: 1, position: 'relative', height: 20, background: 'var(--bg-elevated)', borderRadius: 3 }}>
                              {/* Today line marker */}
                              {isTodayInRange && (
                                <div style={{ position: 'absolute', left: todayX, top: 0, width: 2, height: '100%', background: 'var(--danger)', opacity: 0.45, zIndex: 1, pointerEvents: 'none' }} />
                              )}

                              {/* Task horizontal Gantt bar */}
                              {isVisible && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `${clampedLeft}%`,
                                    width: `${clampedWidth}%`,
                                    top: 1,
                                    height: 18,
                                    background: `${taskColor}33`,
                                    border: `1px solid ${taskColor}`,
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 4px',
                                    zIndex: 2,
                                    overflow: 'hidden',
                                  }}
                                  title={`${t.title} (${t.status}) · ${tStartDate || 'Start'} → ${tDueDate || 'Due'} · Assignee: ${t.owner || 'Unassigned'}`}
                                >
                                  {t.owner && (
                                    <span style={{ fontSize: 9, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                      {t.owner.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Right column: Due date / status indicator */}
                            <div style={{ width: 76, flexShrink: 0, textAlign: 'right', paddingRight: 24, paddingLeft: 12, boxSizing: 'border-box', fontSize: 10, color: 'var(--text-muted)' }}>
                              {t.status === 'done' ? '✓' : t.dueDate ? format(parseISO(t.dueDate), 'MMM d') : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone Details table */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="section-title">Milestone Details</span></div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Milestone</th>
                <th>Status</th>
                <th>Target Date</th>
                <th>Actual Date</th>
                <th>Variance / Days Left</th>
                <th>Progress</th>
                <th>Owner</th>
                <th>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const mTasks = tasks.filter(t => t.milestoneId === m.id && !t.isBacklog);
                const isCompleted = m.status === 'completed';
                const varianceDays = (m.actualDate && m.targetDate) ? differenceInDays(parseISO(m.actualDate), parseISO(m.targetDate)) : null;
                const daysLeft = m.targetDate ? differenceInDays(parseISO(m.targetDate), today) : null;
                const isLate = m.targetDate && m.targetDate < todayStr && !isCompleted && !m.actualDate;
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MilestoneBadge status={isLate ? 'delayed' : m.status} />
                        {varianceDays !== null && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: varianceDays <= 0 ? 'var(--success)' : 'var(--danger)',
                              padding: '1px 5px',
                              borderRadius: 3,
                              background: varianceDays <= 0 ? 'rgba(79, 247, 168, 0.15)' : 'rgba(247, 79, 79, 0.15)',
                              border: `1px solid ${varianceDays <= 0 ? 'rgba(79, 247, 168, 0.3)' : 'rgba(247, 79, 79, 0.3)'}`,
                            }}
                          >
                            {varianceDays < 0 ? `${Math.abs(varianceDays)}d early` : varianceDays > 0 ? `${varianceDays}d late` : 'On time'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{m.targetDate ? format(parseISO(m.targetDate), 'MMM d, yyyy') : '—'}</td>
                    <td style={{
                      fontWeight: m.actualDate ? 600 : 400,
                      color: m.actualDate ? 'var(--text-primary)' : 'var(--text-muted)'
                    }}>
                      {m.actualDate ? format(parseISO(m.actualDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td style={{
                      color: varianceDays !== null
                        ? (varianceDays <= 0 ? 'var(--success)' : 'var(--danger)')
                        : isCompleted
                          ? 'var(--success)'
                          : daysLeft !== null && daysLeft < 0
                            ? 'var(--danger)'
                            : daysLeft !== null && daysLeft <= 14
                              ? 'var(--warning)'
                              : 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {varianceDays !== null
                        ? (varianceDays < 0 ? `${Math.abs(varianceDays)}d early` : varianceDays > 0 ? `${varianceDays}d late` : 'On time')
                        : isCompleted
                          ? 'Completed'
                          : daysLeft === null
                            ? '—'
                            : daysLeft < 0
                              ? `${Math.abs(daysLeft)}d late`
                              : `${daysLeft}d`}
                    </td>
                    <td style={{ minWidth: 150 }}><ProgressBar value={m.progress} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.owner || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{mTasks.filter(t => t.status === 'done').length}/{mTasks.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
