import { useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Plus, Trash2, Edit3, Star, BookOpen, Search, X, Check, Copy, Download,
  Eye, Code2, Bold, Italic, Heading2, List, CheckSquare, Table, Quote,
  Columns, LayoutGrid, Calendar, Tag, ArrowLeft
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { ConfirmDialog, EmptyState } from '../components/ui/shared';
import { format, parseISO } from 'date-fns';
import type { Note } from '../types';

export const CATEGORIES = [
  'general', 'technical', 'organization', 'process', 'meeting', 'risk', 'decision', 'communication', 'reference'
];

export const CATEGORY_COLORS: Record<string, string> = {
  general: 'var(--text-muted)',
  technical: '#4f8ef7',
  organization: '#a855f7',
  process: '#f97316',
  meeting: '#06b6d4',
  risk: '#eab308',
  decision: '#10b981',
  communication: '#3b82f6',
  reference: '#64748b',
};

export default function Notes() {
  const { notes, deleteNote, updateNote, createNote } = useDataStore();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'notebook' | 'grid'>('notebook');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTab, setEditTab] = useState<'write' | 'preview'>('write');
  const [copiedToast, setCopiedToast] = useState(false);

  // Edit form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formTags, setFormTags] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Categories present in notes
  const usedCategories = useMemo(() => {
    return [...new Set(notes.map(n => n.category))];
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (activeCategory !== 'all' && n.category !== activeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        const matchTags = (n.tags || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchTags) return false;
      }
      return true;
    });
  }, [notes, activeCategory, search]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.isPinned), [filteredNotes]);

  // Resolve currently active note
  const activeNote = useMemo(() => {
    if (!selectedNoteId) {
      // Pick first pinned, or first available note
      return pinnedNotes[0] || unpinnedNotes[0] || null;
    }
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [selectedNoteId, notes, pinnedNotes, unpinnedNotes]);

  // Initialize edit form when starting editing
  function startEditing(note?: Note) {
    if (note) {
      setSelectedNoteId(note.id);
      setFormTitle(note.title);
      setFormCategory(note.category);
      setFormTags(note.tags || '');
      setFormContent(note.content || '');
      setFormIsPinned(note.isPinned || false);
    } else {
      // Creating a new note
      setSelectedNoteId('new');
      setFormTitle('');
      setFormCategory(activeCategory !== 'all' ? activeCategory : 'general');
      setFormTags('');
      setFormContent('');
      setFormIsPinned(false);
    }
    setIsEditing(true);
    setEditTab('write');
  }

  function handleSave() {
    if (!formTitle.trim()) return;

    if (selectedNoteId === 'new') {
      const created = createNote({
        title: formTitle.trim(),
        category: formCategory,
        tags: formTags.trim(),
        content: formContent,
        isPinned: formIsPinned,
      });
      setSelectedNoteId(created.id);
    } else if (activeNote) {
      updateNote(activeNote.id, {
        title: formTitle.trim(),
        category: formCategory,
        tags: formTags.trim(),
        content: formContent,
        isPinned: formIsPinned,
      });
    }
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    if (selectedNoteId === 'new') {
      setSelectedNoteId(pinnedNotes[0]?.id || unpinnedNotes[0]?.id || null);
    }
  }

  function togglePin(n: Note, e?: React.MouseEvent) {
    e?.stopPropagation();
    updateNote(n.id, { isPinned: !n.isPinned });
  }

  function handleCopyMarkdown(content: string) {
    navigator.clipboard.writeText(content);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  }

  function handleExportMarkdown(note: Note) {
    const blob = new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeTitle || 'note'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Insert markdown snippet into textarea
  function insertMarkdown(prefix: string, suffix = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setFormContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 0);
  }

  // Word count and read time
  function getWordStats(content: string) {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, minutes };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="page-title">Project Notebook</h1>
          <p className="page-subtitle">
            {notes.length} notes · {notes.filter(n => n.isPinned).length} pinned · Markdown supported
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* View switcher */}
          <div className="tabs" style={{ border: 'none' }}>
            <button
              className={`tab${viewMode === 'notebook' ? ' active' : ''}`}
              onClick={() => setViewMode('notebook')}
              title="Split Notebook Reader"
            >
              <Columns size={13} style={{ marginRight: 4 }} /> Notebook
            </button>
            <button
              className={`tab${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid Cards View"
            >
              <LayoutGrid size={13} style={{ marginRight: 4 }} /> Cards
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setViewMode('notebook');
              startEditing();
            }}
            id="new-note-btn"
          >
            <Plus size={14} style={{ marginRight: 4 }} /> New Note
          </button>
        </div>
      </div>

      {/* Main Container */}
      {viewMode === 'notebook' ? (
        <div className="notebook-container">
          {/* LEFT SIDEBAR: Notes list */}
          <div className="notebook-sidebar">
            <div className="notebook-sidebar-header">
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={13}
                  style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Search in titles & content..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 28, height: 32, fontSize: 12 }}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
                <button
                  className={`filter-chip${activeCategory === 'all' ? ' active' : ''}`}
                  style={{ fontSize: 10, padding: '2px 8px', height: 22 }}
                  onClick={() => setActiveCategory('all')}
                >
                  All ({notes.length})
                </button>
                {usedCategories.map(c => (
                  <button
                    key={c}
                    className={`filter-chip${activeCategory === c ? ' active' : ''}`}
                    style={{ fontSize: 10, padding: '2px 8px', height: 22 }}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Note List Items */}
            <div className="notebook-list">
              {filteredNotes.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  No notes found.
                </div>
              ) : (
                <>
                  {/* Pinned Section */}
                  {pinnedNotes.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={10} color="var(--warning)" fill="var(--warning)" /> Pinned Notes
                      </div>
                      {pinnedNotes.map(n => {
                        const isSelected = selectedNoteId === n.id || (activeNote?.id === n.id && selectedNoteId !== 'new');
                        const catColor = CATEGORY_COLORS[n.category] || 'var(--text-muted)';
                        return (
                          <div
                            key={n.id}
                            className={`notebook-list-item${isSelected ? ' active' : ''}`}
                            onClick={() => {
                              setSelectedNoteId(n.id);
                              setIsEditing(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="badge"
                                style={{
                                  background: `${catColor}20`,
                                  color: catColor,
                                  fontSize: 9,
                                  padding: '1px 6px',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                }}
                              >
                                {n.category}
                              </span>
                              <button
                                className="btn-icon btn-ghost"
                                style={{ width: 18, height: 18, padding: 0 }}
                                onClick={e => togglePin(n, e)}
                                title="Unpin note"
                              >
                                <Star size={11} color="var(--warning)" fill="var(--warning)" />
                              </button>
                            </div>
                            <div className="notebook-item-title" style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                              {n.title}
                            </div>
                            <div className="notebook-item-snippet">
                              {n.content ? n.content.replace(/[#*`|\n-]/g, ' ').slice(0, 120) : 'Empty note'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Regular Section */}
                  {unpinnedNotes.length > 0 && (
                    <div>
                      {pinnedNotes.length > 0 && (
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px' }}>
                          Other Notes
                        </div>
                      )}
                      {unpinnedNotes.map(n => {
                        const isSelected = selectedNoteId === n.id || (activeNote?.id === n.id && selectedNoteId !== 'new');
                        const catColor = CATEGORY_COLORS[n.category] || 'var(--text-muted)';
                        return (
                          <div
                            key={n.id}
                            className={`notebook-list-item${isSelected ? ' active' : ''}`}
                            onClick={() => {
                              setSelectedNoteId(n.id);
                              setIsEditing(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="badge"
                                style={{
                                  background: `${catColor}20`,
                                  color: catColor,
                                  fontSize: 9,
                                  padding: '1px 6px',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                }}
                              >
                                {n.category}
                              </span>
                              <button
                                className="btn-icon btn-ghost"
                                style={{ width: 18, height: 18, padding: 0, opacity: 0.5 }}
                                onClick={e => togglePin(n, e)}
                                title="Pin note"
                              >
                                <Star size={11} color="var(--text-muted)" />
                              </button>
                            </div>
                            <div className="notebook-item-title" style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>
                              {n.title}
                            </div>
                            <div className="notebook-item-snippet">
                              {n.content ? n.content.replace(/[#*`|\n-]/g, ' ').slice(0, 120) : 'Empty note'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT MAIN PANE: Reader / Editor */}
          <div className="notebook-main">
            {isEditing ? (
              /* EDIT MODE */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="notebook-main-header">
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {selectedNoteId === 'new' ? 'Create New Note' : 'Editing Note'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="tabs" style={{ border: 'none', marginRight: 8 }}>
                      <button
                        className={`tab${editTab === 'write' ? ' active' : ''}`}
                        onClick={() => setEditTab('write')}
                        style={{ height: 28, fontSize: 11 }}
                      >
                        <Edit3 size={12} style={{ marginRight: 4 }} /> Write
                      </button>
                      <button
                        className={`tab${editTab === 'preview' ? ' active' : ''}`}
                        onClick={() => setEditTab('preview')}
                        style={{ height: 28, fontSize: 11 }}
                      >
                        <Eye size={12} style={{ marginRight: 4 }} /> Preview
                      </button>
                    </div>

                    <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>
                      Save Note
                    </button>
                  </div>
                </div>

                <div className="notebook-main-content">
                  <div className="notebook-content-container">
                    {/* Title */}
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label required">Note Title</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Architecture decisions log, Onboarding guidelines..."
                        value={formTitle}
                        onChange={e => setFormTitle(e.target.value)}
                        style={{ fontSize: 16, fontWeight: 600 }}
                        autoFocus
                      />
                    </div>

                    {/* Meta Row: Category, Tags, Pin */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 14 }}>
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                          className="select"
                          value={formCategory}
                          onChange={e => setFormCategory(e.target.value)}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tags</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="architecture, cloud, security"
                          value={formTags}
                          onChange={e => setFormTags(e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Pin</label>
                        <label
                          className="flex items-center gap-2"
                          style={{ height: 36, cursor: 'pointer', fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={formIsPinned}
                            onChange={e => setFormIsPinned(e.target.checked)}
                          />
                          <span>Pin to top</span>
                        </label>
                      </div>
                    </div>

                    {/* Content: Write or Preview */}
                    {editTab === 'write' ? (
                      <div className="form-group">
                        <label className="form-label">Content (Markdown supported)</label>

                        {/* Markdown Formatting Toolbar */}
                        <div className="md-toolbar">
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('**', '**')}
                            title="Bold"
                          >
                            <Bold size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('*', '*')}
                            title="Italic"
                          >
                            <Italic size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('## ')}
                            title="Heading"
                          >
                            <Heading2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('- ')}
                            title="Bullet List"
                          >
                            <List size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('- [ ] ')}
                            title="Checklist / Task"
                          >
                            <CheckSquare size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('`', '`')}
                            title="Inline Code"
                          >
                            <Code2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('```ts\n', '\n```')}
                            title="Code Block"
                          >
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{'{ }'}</span>
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('\n| Column 1 | Column 2 |\n|---|---|\n| Item 1 | Value 1 |\n')}
                            title="Table"
                          >
                            <Table size={13} />
                          </button>
                          <button
                            type="button"
                            className="md-toolbar-btn"
                            onClick={() => insertMarkdown('> ')}
                            title="Quote"
                          >
                            <Quote size={13} />
                          </button>
                        </div>

                        <textarea
                          ref={textareaRef}
                          className="textarea"
                          rows={18}
                          value={formContent}
                          onChange={e => setFormContent(e.target.value)}
                          placeholder="Write your note in Markdown... Headings, lists, tables, and code blocks are fully supported."
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            lineHeight: 1.7,
                            borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
                          Live Rendered Preview
                        </div>
                        <div
                          className="markdown-body card"
                          style={{ padding: 24, minHeight: 350, background: 'var(--bg-surface)' }}
                        >
                          {formContent.trim() ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {formContent}
                            </ReactMarkdown>
                          ) : (
                            <div style={{ color: 'var(--text-placeholder)', fontStyle: 'italic' }}>
                              No content yet. Switch to Write tab to add markdown.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activeNote ? (
              /* READ / VIEW MODE */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header Actions */}
                <div className="notebook-main-header">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="badge"
                      style={{
                        background: `${CATEGORY_COLORS[activeNote.category] || 'var(--text-muted)'}22`,
                        color: CATEGORY_COLORS[activeNote.category] || 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}
                    >
                      {activeNote.category}
                    </span>

                    {activeNote.tags &&
                      activeNote.tags.split(',').map(tag => (
                        <span
                          key={tag.trim()}
                          className="badge"
                          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                          <Tag size={10} style={{ marginRight: 4 }} />
                          {tag.trim()}
                        </span>
                      ))}

                    {activeNote.isPinned && (
                      <span className="badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--warning)' }}>
                        <Star size={11} fill="var(--warning)" style={{ marginRight: 4 }} /> Pinned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Copy Markdown */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyMarkdown(activeNote.content)}
                      title="Copy markdown content to clipboard"
                    >
                      {copiedToast ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                      <span style={{ marginLeft: 4 }}>{copiedToast ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* Export as .md file */}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleExportMarkdown(activeNote)}
                      title="Download as .md file"
                    >
                      <Download size={13} />
                      <span style={{ marginLeft: 4 }}>Export .md</span>
                    </button>

                    {/* Pin toggle */}
                    <button
                      className="btn-icon btn-ghost"
                      onClick={() => togglePin(activeNote)}
                      title={activeNote.isPinned ? 'Unpin' : 'Pin'}
                    >
                      <Star
                        size={15}
                        color={activeNote.isPinned ? 'var(--warning)' : 'var(--text-muted)'}
                        fill={activeNote.isPinned ? 'var(--warning)' : 'none'}
                      />
                    </button>

                    {/* Edit */}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => startEditing(activeNote)}
                      id="edit-note-btn"
                    >
                      <Edit3 size={13} style={{ marginRight: 4 }} /> Edit Note
                    </button>

                    {/* Delete */}
                    <button
                      className="btn-icon btn-ghost"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDeleteId(activeNote.id)}
                      title="Delete note"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Content View Area */}
                <div className="notebook-main-content">
                  <div className="notebook-content-container">
                    {/* Note Title */}
                    <h1
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        marginBottom: 8,
                        lineHeight: 1.3,
                      }}
                    >
                      {activeNote.title}
                    </h1>

                    {/* Metadata line */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        paddingBottom: 16,
                        borderBottom: '1px solid var(--border)',
                        marginBottom: 24,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} />
                        <span>
                          Updated {activeNote.updatedAt ? format(parseISO(activeNote.updatedAt), 'MMM d, yyyy · HH:mm') : 'Recently'}
                        </span>
                      </div>
                      <div>
                        {getWordStats(activeNote.content || '').words} words · {getWordStats(activeNote.content || '').minutes} min read
                      </div>
                    </div>

                    {/* Rendered Markdown Body */}
                    <div className="markdown-body">
                      {activeNote.content && activeNote.content.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeNote.content}
                        </ReactMarkdown>
                      ) : (
                        <div
                          style={{
                            padding: '40px 16px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px dashed var(--border)',
                          }}
                        >
                          <BookOpen size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                          <div style={{ fontWeight: 600 }}>This note is currently empty.</div>
                          <p style={{ fontSize: 12, marginTop: 4 }}>
                            Click "Edit Note" to add markdown documentation, tables, or code snippets.
                          </p>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: 12 }}
                            onClick={() => startEditing(activeNote)}
                          >
                            <Edit3 size={13} style={{ marginRight: 4 }} /> Add Content
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No Note Selected */
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  gap: 12,
                  color: 'var(--text-muted)',
                }}
              >
                <BookOpen size={40} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
                  No note selected
                </div>
                <div style={{ fontSize: 13 }}>
                  Select a note from the list on the left, or create a new note.
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => startEditing()}
                  style={{ marginTop: 6 }}
                >
                  <Plus size={13} style={{ marginRight: 4 }} /> Create Note
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div>
          {/* Category Filter Chips in Grid View */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              className={`filter-chip${activeCategory === 'all' ? ' active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              All ({notes.length})
            </button>
            {usedCategories.map(c => (
              <button
                key={c}
                className={`filter-chip${activeCategory === c ? ' active' : ''}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Notebook is empty"
              desc="Capture technical decisions, contacts, architecture logs, and anything you need to remember."
              action={
                <button className="btn btn-primary" onClick={() => startEditing()}>
                  <Plus size={14} style={{ marginRight: 4 }} /> Add First Note
                </button>
              }
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredNotes.map(n => {
                const color = CATEGORY_COLORS[n.category] || 'var(--text-muted)';
                return (
                  <div
                    key={n.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      borderTop: `4px solid ${color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onClick={() => {
                      setSelectedNoteId(n.id);
                      setViewMode('notebook');
                    }}
                  >
                    <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span
                          className="badge"
                          style={{
                            background: `${color}20`,
                            color,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {n.category}
                        </span>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            className="btn-icon btn-ghost"
                            style={{ width: 22, height: 22, padding: 0 }}
                            onClick={e => togglePin(n, e)}
                            title={n.isPinned ? 'Unpin' : 'Pin'}
                          >
                            <Star
                              size={13}
                              color={n.isPinned ? 'var(--warning)' : 'var(--text-muted)'}
                              fill={n.isPinned ? 'var(--warning)' : 'none'}
                            />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            style={{ width: 22, height: 22, padding: 0 }}
                            onClick={e => {
                              e.stopPropagation();
                              startEditing(n);
                              setViewMode('notebook');
                            }}
                            title="Edit note"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="btn-icon btn-ghost"
                            style={{ width: 22, height: 22, padding: 0, color: 'var(--danger)' }}
                            onClick={e => {
                              e.stopPropagation();
                              setDeleteId(n.id);
                            }}
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                        {n.title}
                      </h3>

                      {/* Markdown Preview Snippet */}
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          flex: 1,
                          maxHeight: 110,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 5,
                          WebkitBoxOrient: 'vertical',
                          marginBottom: 12,
                        }}
                      >
                        {n.content ? n.content.replace(/[#*`|\n-]/g, ' ').slice(0, 260) : 'Empty note'}
                      </div>

                      <div
                        className="flex items-center justify-between"
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          paddingTop: 10,
                          borderTop: '1px solid var(--border)',
                          marginTop: 'auto',
                        }}
                      >
                        <div>{n.tags || 'No tags'}</div>
                        <div style={{ color: 'var(--accent)', fontWeight: 600 }}>Open in reader →</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this note? This action cannot be undone."
          onConfirm={() => {
            deleteNote(deleteId);
            if (selectedNoteId === deleteId) {
              setSelectedNoteId(null);
            }
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
