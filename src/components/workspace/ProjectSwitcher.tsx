import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Upload, LayoutGrid, Check, CornerDownLeft, AlertCircle, AlertTriangle,
  Loader2, FolderOpen, Lock, X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { switchProject, openProjectFileDialog, openProjectByFilePath } from '../../db';
import type { ProjectListItem } from '../../types/electron';
import { ProjectAvatar, formatRelative } from './workspaceUtils';

export default function ProjectSwitcher() {
  const navigate = useNavigate();
  const { projects, activeId, setSwitcherOpen, setNewProjectOpen, refresh } = useWorkspaceStore();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  const [sharedFolder, setSharedFolder] = useState<string | null>(null);
  const [folderItems, setFolderItems] = useState<ProjectListItem[]>([]);

  useEffect(() => {
    void refresh();
    inputRef.current?.focus();
    if (isElectron && window.electronAPI) {
      window.electronAPI.getSavedProjectsFolder().then(async (folder) => {
        setSharedFolder(folder);
        if (folder) setFolderItems(await window.electronAPI!.listProjectsInFolder(folder));
      }).catch(() => { /* noop */ });
    }
  }, [refresh, isElectron]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Active project first, then most recently opened
    const sorted = [...projects].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      return (b.lastOpenedAt || '').localeCompare(a.lastOpenedAt || '');
    });
    if (!q) return sorted;
    return sorted.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.summary?.manager || '').toLowerCase().includes(q)
    );
  }, [projects, activeId, search]);

  useEffect(() => { setCursor(0); }, [search]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const close = () => setSwitcherOpen(false);

  async function open(id: string) {
    if (id === activeId) { close(); return; }
    setBusyId(id);
    setError(null);
    try {
      await switchProject(id);
      close();
    } catch (err) {
      setError(`Could not open project: ${String(err)}`);
    } finally {
      setBusyId(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[cursor];
      if (target) void open(target.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  return (
    <div className="ws-backdrop" onMouseDown={close} role="presentation">
      <div
        className="ws-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Switch project"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="ws-palette-search">
          <Search size={16} />
          <input
            ref={inputRef}
            id="project-switcher-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Switch project… type a name, code or manager"
            autoComplete="off"
          />
          <kbd className="ws-kbd">Esc</kbd>
        </div>

        <div className="ws-palette-label">
          <span>Projects in this browser</span>
          <span>{projects.length}</span>
        </div>

        <div className="ws-palette-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="ws-empty">
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No project matches “{search}”</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setNewProjectOpen(true, search.trim())}>
                <Plus size={13} /> Create “{search}”
              </button>
            </div>
          ) : (
            filtered.map((p, i) => {
              const isActive = p.id === activeId;
              const s = p.summary;
              return (
                <button
                  key={p.id}
                  data-index={i}
                  id={`project-switch-${p.id}`}
                  className={`ws-row${i === cursor ? ' cursor' : ''}${isActive ? ' active' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => void open(p.id)}
                  disabled={!!busyId}
                >
                  <ProjectAvatar project={p} size={34} />
                  <div className="ws-row-main">
                    <div className="ws-row-title">
                      <span className="truncate">{p.name}</span>
                      {p.code && <span className="ws-code">{p.code}</span>}
                    </div>
                    <div className="ws-row-meta">
                      Updated {formatRelative(p.updatedAt)}
                      {s ? ` · ${s.openTasks} open task${s.openTasks === 1 ? '' : 's'}` : ''}
                      {s?.phase ? ` · ${s.phase}` : ''}
                    </div>
                  </div>
                  <div className="ws-row-side">
                    {s && s.overdueTasks > 0 && (
                      <span className="ws-chip danger" title="Overdue tasks"><AlertCircle size={11} /> {s.overdueTasks}</span>
                    )}
                    {s && s.criticalRisks > 0 && (
                      <span className="ws-chip warning" title="Critical risks"><AlertTriangle size={11} /> {s.criticalRisks}</span>
                    )}
                    {busyId === p.id ? (
                      <Loader2 size={15} className="ws-spin" />
                    ) : isActive ? (
                      <span className="ws-active-pill"><Check size={11} /> Active</span>
                    ) : (
                      <CornerDownLeft size={14} className="ws-enter-hint" />
                    )}
                  </div>
                </button>
              );
            })
          )}

          {isElectron && sharedFolder && folderItems.length > 0 && (
            <>
              <div className="ws-palette-label" style={{ marginTop: 6 }}>
                <span><FolderOpen size={11} style={{ verticalAlign: -1 }} /> Shared folder (desktop)</span>
                <span>{folderItems.length}</span>
              </div>
              {folderItems.map((item) => (
                <button
                  key={item.filePath}
                  className="ws-row"
                  onClick={async () => { await openProjectByFilePath(item.filePath); close(); }}
                >
                  <FolderOpen size={16} style={{ color: 'var(--text-muted)', margin: '0 9px' }} />
                  <div className="ws-row-main">
                    <div className="ws-row-title"><span className="truncate">{item.fileName.replace(/\.(ptt|db)$/, '')}</span></div>
                    {item.lockInfo && (
                      <div className="ws-row-meta" style={{ color: 'var(--warning)' }}>
                        <Lock size={10} /> Piloted by {item.lockInfo.pilot}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {error && (
          <div className="ws-error">
            <AlertCircle size={13} /> {error}
            <button className="btn-icon btn-ghost" onClick={() => setError(null)}><X size={12} /></button>
          </div>
        )}

        <div className="ws-palette-footer">
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm" id="project-switcher-new" onClick={() => setNewProjectOpen(true)}>
              <Plus size={13} /> New project
            </button>
            <button
              className="btn btn-secondary btn-sm"
              id="project-switcher-import"
              onClick={async () => { const res = await openProjectFileDialog(); if (res) close(); }}
            >
              <Upload size={13} /> Import .ptt
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            id="project-switcher-manage"
            onClick={() => { close(); navigate('/projects'); }}
          >
            <LayoutGrid size={13} /> Manage projects
          </button>
        </div>
        <div className="ws-palette-hints">
          <span><kbd className="ws-kbd">↑</kbd><kbd className="ws-kbd">↓</kbd> navigate</span>
          <span><kbd className="ws-kbd">↵</kbd> open</span>
          <span><kbd className="ws-kbd">Alt</kbd>+<kbd className="ws-kbd">P</kbd> toggle switcher</span>
        </div>
      </div>
    </div>
  );
}
