import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckSquare, AlertTriangle, Zap, Scale, MessageSquare, Milestone, BookOpen, Users, CalendarCheck } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { globalSearch } from '../../db/queries';

const TYPE_ICONS: Record<string, React.ElementType> = {
  task: CheckSquare, risk: AlertTriangle, issue: Zap, decision: Scale,
  communication: MessageSquare, milestone: Milestone, note: BookOpen,
  stakeholder: Users, meeting: CalendarCheck,
};

const TYPE_PATHS: Record<string, string> = {
  task: '/tasks', risk: '/risks', issue: '/issues', decision: '/decisions',
  communication: '/communications', milestone: '/milestones', note: '/notes',
  stakeholder: '/stakeholders', meeting: '/meetings',
};

const TYPE_COLORS: Record<string, string> = {
  task: 'var(--accent)', risk: 'var(--warning)', issue: 'var(--danger)', decision: 'var(--purple)',
  communication: 'var(--teal)', milestone: 'var(--success)', note: 'var(--orange)',
  stakeholder: 'var(--info)', meeting: 'var(--accent)',
};

export default function GlobalSearch() {
  const { setSearchOpen } = useUIStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReturnType<typeof globalSearch>>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const r = globalSearch(query);
      setResults(r);
      setSelected(0);
    } else {
      setResults([]);
    }
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) {
      navigate(TYPE_PATHS[results[selected].type] || '/dashboard');
      setSearchOpen(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
      <div className="quick-capture-dialog" style={{ marginTop: 0 }} onClick={e => e.stopPropagation()}>
        <div className="quick-capture-input-row">
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            className="quick-capture-input"
            placeholder="Search tasks, risks, decisions, notes, stakeholders..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn-icon btn-ghost" onClick={() => setSearchOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {results.length > 0 ? (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {results.map((r, i) => {
              const Icon = TYPE_ICONS[r.type] || Search;
              const color = TYPE_COLORS[r.type] || 'var(--accent)';
              return (
                <div
                  key={`${r.type}-${r.id}`}
                  className="attention-item"
                  style={{ background: i === selected ? 'var(--bg-hover)' : undefined }}
                  onClick={() => { navigate(TYPE_PATHS[r.type] || '/dashboard'); setSearchOpen(false); }}
                >
                  <div className="attention-icon" style={{ background: `${color}18`, color }}>
                    <Icon size={15} />
                  </div>
                  <div className="attention-content">
                    <div className="attention-title">{r.title}</div>
                    <div className="attention-meta">{r.type} · {r.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : query.length >= 2 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            No results for "{query}"
          </div>
        ) : (
          <div style={{ padding: '20px 24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>Filter by Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {Object.entries(TYPE_ICONS).map(([type, Icon]) => (
                <button
                  key={type}
                  type="button"
                  className="filter-chip"
                  style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
                  onClick={() => {
                    setQuery(`type:${type} `);
                    inputRef.current?.focus();
                  }}
                >
                  <Icon size={12} />
                  {type}
                </button>
              ))}
            </div>

            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontSize: 13 }}>Quick Operators</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'is:overdue', desc: 'Overdue items' },
                { label: 'is:blocked', desc: 'Blocked tasks' },
                { label: 'status:in-progress', desc: 'In progress items' },
                { label: 'owner:', desc: 'Filter by owner' },
              ].map(op => (
                <button
                  key={op.label}
                  type="button"
                  className="filter-chip"
                  style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontFamily: 'monospace', fontSize: 11 }}
                  onClick={() => {
                    setQuery(prev => `${prev ? prev.trim() + ' ' : ''}${op.label}`);
                    inputRef.current?.focus();
                  }}
                  title={op.desc}
                >
                  {op.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 'var(--text-xs)', color: 'var(--text-placeholder)' }}>
              Type at least 2 characters · Use operators like type:, owner:, is:overdue · ↑↓ navigate · Enter to open · Esc to close
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
