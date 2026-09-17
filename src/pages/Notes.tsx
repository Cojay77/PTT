import { useState } from 'react';
import { Plus, Trash2, Edit3, Star, BookOpen } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { Modal, ConfirmDialog, EmptyState } from '../components/ui/shared';
import type { Note } from '../types';

const CATEGORIES = ['general', 'technical', 'organization', 'process', 'meeting', 'risk', 'decision', 'communication', 'reference'];
const CATEGORY_COLORS: Record<string, string> = {
  general: 'var(--text-muted)', technical: 'var(--accent)', organization: 'var(--purple)',
  process: 'var(--orange)', meeting: 'var(--teal)', risk: 'var(--warning)', decision: 'var(--success)',
  communication: 'var(--info)', reference: 'var(--text-secondary)',
};

function NoteModal({ note, onClose }: { note?: Partial<Note>; onClose: () => void }) {
  const { createNote, updateNote } = useDataStore();
  const isEdit = Boolean(note?.id);
  const [form, setForm] = useState<Partial<Note>>({ title: '', category: 'general', content: '', isPinned: false, tags: '', ...note });
  function save() { if (!form.title?.trim()) return; if (isEdit) updateNote(note!.id!, form); else createNote(form); onClose(); }
  return (
    <Modal title={isEdit ? 'Edit Note' : 'New Note'} onClose={onClose} size="xl"
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save</button></>}
    >
      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label required">Title</label><input className="input" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus /></div>
        <div className="form-group"><label className="form-label">Category</label><select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Tags</label><input className="input" value={form.tags || ''} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Comma separated" /></div>
        <div className="form-group">
          <label className="form-label">Pin</label>
          <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
            <input type="checkbox" id="pin-note" checked={form.isPinned || false} onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} />
            <label htmlFor="pin-note" style={{ fontSize: 'var(--text-sm)' }}>Pinned note</label>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Content (Markdown supported)</label>
        <textarea className="textarea" rows={18} value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7 }} />
      </div>
    </Modal>
  );
}

export default function Notes() {
  const { notes, deleteNote, updateNote } = useDataStore();
  const [edit, setEdit] = useState<Partial<Note> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const pinned = notes.filter(n => n.isPinned);
  const filtered = notes.filter(n => {
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unpinnedFiltered = filtered.filter(n => !n.isPinned);
  const pinnedFiltered = filtered.filter(n => n.isPinned);
  const usedCategories = [...new Set(notes.map(n => n.category))];

  function togglePin(n: Note, e: React.MouseEvent) {
    e.stopPropagation();
    updateNote(n.id, { isPinned: !n.isPinned });
  }

  function NoteCard({ n }: { n: Note }) {
    const color = CATEGORY_COLORS[n.category] || 'var(--text-muted)';
    return (
      <div className="card" style={{ cursor: 'pointer', borderTop: `3px solid ${color}` }} onClick={() => setEdit(n)}>
        <div className="card-body">
          <div className="flex items-start gap-2">
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2 mb-1">
                {n.isPinned && <Star size={12} color="var(--warning)" fill="var(--warning)" />}
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{n.title}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge" style={{ background: `${color}22`, color, fontSize: 10 }}>{n.category}</span>
                {n.tags && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.tags}</span>}
              </div>
              {n.content && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflow: 'hidden', maxHeight: 80, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                  {n.content.replace(/[#*`]/g, '').slice(0, 200)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1 mt-2 justify-end" onClick={e => e.stopPropagation()}>
            <button className="btn-icon btn-ghost" onClick={e => togglePin(n, e)} title={n.isPinned ? 'Unpin' : 'Pin'}>
              <Star size={12} color={n.isPinned ? 'var(--warning)' : 'var(--text-muted)'} fill={n.isPinned ? 'var(--warning)' : 'none'} />
            </button>
            <button className="btn-icon btn-ghost" onClick={() => setEdit(n)}><Edit3 size={12} /></button>
            <button className="btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setDeleteId(n.id); }}><Trash2 size={12} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div><h1 className="page-title">Project Notebook</h1><p className="page-subtitle">{notes.length} notes · {pinned.length} pinned</p></div>
        <div className="ml-auto flex gap-2">
          <input className="input" style={{ width: 200 }} placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setEdit({})}><Plus size={14} /> New Note</button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', ...usedCategories].map(c => (
          <button key={c} className={`filter-chip${activeCategory === c ? ' active' : ''}`} onClick={() => setActiveCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={BookOpen} title="Notebook is empty" desc="Capture technical decisions, contacts, important info, and anything you need to remember." action={<button className="btn btn-primary" onClick={() => setEdit({})}>Add First Note</button>} />
      ) : (
        <>
          {pinnedFiltered.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="section-title mb-3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} color="var(--warning)" fill="var(--warning)" /> Pinned
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {pinnedFiltered.map(n => <NoteCard key={n.id} n={n} />)}
              </div>
            </div>
          )}
          {unpinnedFiltered.length > 0 && (
            <div>
              {pinnedFiltered.length > 0 && <div className="section-title mb-3">All Notes</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {unpinnedFiltered.map(n => <NoteCard key={n.id} n={n} />)}
              </div>
            </div>
          )}
        </>
      )}

      {edit !== null && <NoteModal note={edit} onClose={() => setEdit(null)} />}
      {deleteId && <ConfirmDialog message="Delete this note?" onConfirm={() => { deleteNote(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}
