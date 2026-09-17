import { useState } from 'react';
import { Save, Edit3 } from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { projectConfigQueries } from '../db/queries';
import { saveDbNow } from '../db';

const FIELDS = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'code', label: 'Project Code / Identifier' },
  { key: 'description', label: 'Description', multiline: true },
  { key: 'objectives', label: 'Objectives', multiline: true },
  { key: 'businessContext', label: 'Business Context', multiline: true },
  { key: 'scope', label: 'Scope', multiline: true },
  { key: 'outOfScope', label: 'Out of Scope', multiline: true },
  { key: 'owner', label: 'Project Owner' },
  { key: 'manager', label: 'Project Manager' },
  { key: 'sponsor', label: 'Sponsor' },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'targetDate', label: 'Target Delivery Date', type: 'date' },
  { key: 'currentPhase', label: 'Current Phase' },
  { key: 'status', label: 'Project Status', type: 'select', options: ['on-track', 'at-risk', 'off-track', 'on-hold', 'completed'] },
  { key: 'statusNote', label: 'Status Note / Context' },
  { key: 'budget', label: 'Budget (optional)' },
  { key: 'methodology', label: 'Methodology' },
  { key: 'technologies', label: 'Technologies' },
  { key: 'importantLinks', label: 'Important Links', multiline: true },
  { key: 'documentationLocations', label: 'Documentation Locations', multiline: true },
  { key: 'environments', label: 'Environments', multiline: true },
  { key: 'suppliers', label: 'Suppliers / Vendors', multiline: true },
  { key: 'team', label: 'Project Team', multiline: true },
];

function toSnake(s: string) { return s.replace(/([A-Z])/g, '_$1').toLowerCase(); }
function toCamel(s: string) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }

export default function ProjectOverview() {
  const raw = (projectConfigQueries.get() || {}) as unknown as Record<string, unknown>;
  const initial: Record<string, string> = {};
  FIELDS.forEach(f => {
    initial[f.key] = (raw[f.key] as string) || (raw[toSnake(f.key)] as string) || '';
  });

  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const { updateProjectConfig } = useDataStore();

  function handleSave() {
    updateProjectConfig(form);
    saveDbNow();
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const statusColors: Record<string, string> = {
    'on-track': 'var(--success)', 'at-risk': 'var(--warning)',
    'off-track': 'var(--danger)', 'on-hold': 'var(--text-muted)', completed: 'var(--teal)',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="page-title">{form.name || 'New Project'}</h1>
          <div className="flex items-center gap-2 mt-2">
            {form.code && <span className="badge status-in-progress">{form.code}</span>}
            <span className="badge" style={{
              background: `${statusColors[form.status] || 'var(--text-muted)'}22`,
              color: statusColors[form.status] || 'var(--text-muted)',
              borderColor: `${statusColors[form.status] || 'var(--text-muted)'}44`,
            }}>
              {form.status?.replace(/-/g, ' ') || 'No status'}
            </span>
            {form.currentPhase && <span className="text-muted text-sm">Phase: {form.currentPhase}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Edit3 size={14} /> Edit
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={14} /> {saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {[
          { section: 'Project Identity', keys: ['name', 'code', 'description', 'objectives', 'businessContext'] },
          { section: 'Scope', keys: ['scope', 'outOfScope'] },
          { section: 'People', keys: ['owner', 'manager', 'sponsor', 'team'] },
          { section: 'Planning', keys: ['startDate', 'targetDate', 'currentPhase', 'status', 'statusNote', 'budget', 'methodology'] },
          { section: 'Technical', keys: ['technologies', 'environments', 'importantLinks', 'documentationLocations'] },
          { section: 'External', keys: ['suppliers'] },
        ].map(({ section, keys }) => (
          <div key={section} className="card">
            <div className="card-header">
              <span className="section-title">{section}</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {keys.map(key => {
                const field = FIELDS.find(f => f.key === key)!;
                if (!field) return null;
                const value = form[key] || '';
                if (!editing) {
                  return (
                    <div key={key}>
                      <div className="label" style={{ marginBottom: 4 }}>{field.label}</div>
                      {value ? (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {value}
                        </div>
                      ) : (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-placeholder)', fontStyle: 'italic' }}>Not specified</div>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={key} className="form-group">
                    <label className="form-label">{field.label}</label>
                    {field.type === 'select' ? (
                      <select className="select" value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}>
                        {field.options?.map(o => <option key={o} value={o}>{o.replace(/-/g, ' ')}</option>)}
                      </select>
                    ) : field.multiline ? (
                      <textarea className="textarea" rows={3} value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    ) : (
                      <input className="input" type={field.type || 'text'} value={value} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
