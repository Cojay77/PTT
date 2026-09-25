import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckSquare, StickyNote, AlertTriangle, Zap, Scale, MessageSquare, CalendarCheck, Flame, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useDataStore } from '../../store/useDataStore';
import type { QuickCaptureType } from '../../types';

const TYPES: Array<{ type: QuickCaptureType; icon: React.ElementType; label: string; color: string }> = [
  { type: 'task', icon: CheckSquare, label: 'Task', color: 'var(--accent)' },
  { type: 'action', icon: Zap, label: 'Action', color: 'var(--orange)' },
  { type: 'note', icon: StickyNote, label: 'Note', color: 'var(--success)' },
  { type: 'risk', icon: AlertTriangle, label: 'Risk', color: 'var(--warning)' },
  { type: 'issue', icon: Flame, label: 'Issue', color: 'var(--danger)' },
  { type: 'decision', icon: Scale, label: 'Decision', color: 'var(--purple)' },
  { type: 'communication', icon: MessageSquare, label: 'Comm.', color: 'var(--teal)' },
  { type: 'meeting', icon: CalendarCheck, label: 'Meeting', color: 'var(--info)' },
];

const TYPE_PATHS: Record<QuickCaptureType, string> = {
  task: '/tasks', action: '/actions', note: '/notes',
  risk: '/risks', issue: '/issues', decision: '/decisions',
  communication: '/communications', meeting: '/meetings',
};

export default function QuickCapture() {
  const { quickCaptureType, setQuickCaptureOpen } = useUIStore();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<QuickCaptureType>(quickCaptureType);
  const [text, setText] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useTaskStore(s => s.createTask);
  const { createAction, createRisk, createIssue, createDecision, createNote, createCommunication, createMeeting } = useDataStore();

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickCaptureOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleSave() {
    if (!text.trim()) return;
    switch (selectedType) {
      case 'task': createTask({ title: text, owner, dueDate, status: 'planned', priority: 'medium' }); break;
      case 'action': createAction({ action: text, owner, dueDate, status: 'open' }); break;
      case 'note': createNote({ title: text, category: 'general' }); break;
      case 'risk': createRisk({ title: text, owner, status: 'identified', probability: 3, impact: 3, severity: 'medium' }); break;
      case 'issue': createIssue({ title: text, owner, status: 'open', severity: 'medium' }); break;
      case 'decision': createDecision({ title: text, owner, status: 'proposed' }); break;
      case 'communication': createCommunication({ subject: text, status: 'sent', date: new Date().toISOString().split('T')[0] }); break;
      case 'meeting': createMeeting({ title: text, date: dueDate || new Date().toISOString().split('T')[0] }); break;
    }
    setSaved(true);
    setTimeout(() => {
      setText('');
      setOwner('');
      setDueDate('');
      setSaved(false);
      inputRef.current?.focus();
    }, 800);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
  }

  const currentType = TYPES.find(t => t.type === selectedType)!;
  const Icon = currentType.icon;

  return (
    <div className="quick-capture-overlay" onClick={() => setQuickCaptureOpen(false)}>
      <div className="quick-capture-dialog" onClick={e => e.stopPropagation()}>
        {/* Type selector */}
        <div className="quick-capture-types">
          {TYPES.map(t => (
            <button
              key={t.type}
              className={`quick-type-btn${selectedType === t.type ? ' selected' : ''}`}
              style={selectedType === t.type ? { '--accent': t.color } as React.CSSProperties : {}}
              onClick={() => setSelectedType(t.type)}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Main input */}
        <div className="quick-capture-input-row">
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `${currentType.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={15} color={currentType.color} />
          </div>
          <input
            ref={inputRef}
            className="quick-capture-input"
            placeholder={`New ${currentType.label.toLowerCase()}...`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn-icon btn-ghost" onClick={() => setQuickCaptureOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Optional fields */}
        {['task', 'action', 'risk', 'issue', 'decision'].includes(selectedType) && (
          <div style={{ padding: '8px 20px', display: 'flex', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Owner"
              value={owner}
              onChange={e => setOwner(e.target.value)}
            />
            <input
              className="input"
              type="date"
              style={{ flex: 1 }}
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        )}

        {/* Footer */}
        <div className="quick-capture-footer">
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Esc to close · ⌘Enter to save
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saved && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => { navigate(TYPE_PATHS[selectedType]); setQuickCaptureOpen(false); }}
                style={{ color: 'var(--accent)', fontSize: 12 }}
              >
                View <ArrowRight size={12} />
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={!text.trim()}
              style={{ background: saved ? 'var(--success)' : undefined }}
            >
              {saved ? '✓ Saved!' : `Save ${currentType.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
