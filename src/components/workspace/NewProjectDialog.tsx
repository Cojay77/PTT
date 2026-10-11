import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FilePlus2, Copy, Sparkles, Loader2, Check } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useDataStore } from '../../store/useDataStore';
import { createProject, saveDbNow, PROJECT_COLORS, type NewProjectTemplate } from '../../db';
import { projectConfigQueries } from '../../db/queries';
import {
  seedDemoData, seedWeeklyReviewsIfEmpty, seedBudgetIfEmpty, seedChangeRequestsIfEmpty,
  seedStakeholderAbsencesIfEmpty, seedPortfolioIfEmpty,
} from '../../data/demoData';
import { ProjectAvatar } from './workspaceUtils';

const TEMPLATES: Array<{ id: NewProjectTemplate; title: string; desc: string; icon: typeof FilePlus2 }> = [
  { id: 'blank', title: 'Blank project', desc: 'Start from a clean slate', icon: FilePlus2 },
  { id: 'duplicate', title: 'Copy of current', desc: 'Clone the active project with all its data', icon: Copy },
  { id: 'demo', title: 'Demo data', desc: 'Sample IT project to explore features', icon: Sparkles },
];

export default function NewProjectDialog() {
  const navigate = useNavigate();
  const { setNewProjectOpen, newProjectDraft } = useWorkspaceStore();
  const loadTasks = useTaskStore((s) => s.load);
  const loadAll = useDataStore((s) => s.loadAll);

  const [name, setName] = useState(newProjectDraft || '');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)]);
  const [template, setTemplate] = useState<NewProjectTemplate>('blank');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const close = () => { if (!busy) setNewProjectOpen(false); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalName = name.trim();
    if (!finalName) { setError('Please give your project a name.'); return; }
    setBusy(true);
    setError(null);
    try {
      await createProject({ name: finalName, code: code.trim(), color, template });
      if (template === 'demo') {
        seedDemoData();
        seedWeeklyReviewsIfEmpty();
        seedBudgetIfEmpty();
        seedChangeRequestsIfEmpty();
        seedStakeholderAbsencesIfEmpty();
        seedPortfolioIfEmpty();
        // Keep the name the user chose
        projectConfigQueries.upsert({ name: finalName, code: code.trim() });
        await saveDbNow();
        loadTasks();
        loadAll();
      }
      setNewProjectOpen(false);
      navigate(template === 'blank' ? '/overview' : '/dashboard');
    } catch (err) {
      setError(`Could not create project: ${String(err)}`);
      setBusy(false);
    }
  }

  return (
    <div className="ws-backdrop" onMouseDown={close} role="presentation">
      <form
        className="ws-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        onKeyDown={(e) => { if (e.key === 'Escape') close(); }}
      >
        <div className="ws-dialog-header">
          <ProjectAvatar project={{ name: name || 'New Project', color }} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="new-project-title" className="ws-dialog-title">New project</h2>
            <p className="ws-dialog-sub">Each project has its own tasks, RAID, meetings, budget and notes.</p>
          </div>
          <button type="button" className="btn-icon btn-ghost" onClick={close} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="ws-dialog-body">
          <div className="ws-form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label" htmlFor="new-project-name">Project name *</label>
              <input
                ref={nameRef}
                id="new-project-name"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ERP Rollout Phase 2"
                maxLength={120}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="new-project-code">Code</label>
              <input
                id="new-project-code"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ERP-02"
                maxLength={24}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="ws-swatches">
              {PROJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`ws-swatch${c === color ? ' selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                >
                  {c === color && <Check size={12} />}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Start from</label>
            <div className="ws-templates">
              {TEMPLATES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  id={`new-project-template-${t.id}`}
                  className={`ws-template${template === t.id ? ' selected' : ''}`}
                  onClick={() => setTemplate(t.id)}
                >
                  <t.icon size={18} />
                  <span className="ws-template-title">{t.title}</span>
                  <span className="ws-template-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="ws-error" style={{ margin: 0 }}>{error}</div>}
        </div>

        <div className="ws-dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={close} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" id="new-project-submit" disabled={busy || !name.trim()}>
            {busy ? <Loader2 size={14} className="ws-spin" /> : <FilePlus2 size={14} />}
            Create &amp; open
          </button>
        </div>
      </form>
    </div>
  );
}
