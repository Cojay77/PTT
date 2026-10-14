import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Users, Check, X, ChevronDown, Briefcase, UserCheck } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { Avatar } from './shared';

export interface PersonOption {
  id: string;
  name: string;
  role: string;
  organization: string;
  type: 'resource' | 'stakeholder';
}

export function usePeople() {
  const resources = useDataStore(s => s.resources);
  const stakeholders = useDataStore(s => s.stakeholders);

  const people = useMemo<PersonOption[]>(() => {
    const list: PersonOption[] = [];
    resources.forEach(r => {
      if (r.name?.trim()) {
        list.push({
          id: r.id,
          name: r.name.trim(),
          role: r.role || '',
          organization: r.organization || '',
          type: 'resource',
        });
      }
    });
    stakeholders.forEach(s => {
      if (s.name?.trim()) {
        list.push({
          id: s.id,
          name: s.name.trim(),
          role: s.role || '',
          organization: s.organization || '',
          type: 'stakeholder',
        });
      }
    });
    return list;
  }, [resources, stakeholders]);

  const peopleByName = useMemo(() => {
    const map = new Map<string, PersonOption>();
    people.forEach(p => map.set(p.name.toLowerCase(), p));
    return map;
  }, [people]);

  return { resources, stakeholders, people, peopleByName };
}

interface PersonSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  id?: string;
}

/**
 * Single-person selector with instant Resource & Stakeholder auto-complete,
 * popover picker, and fallback to freeform text.
 */
export function PersonSelect({
  value,
  onChange,
  placeholder = 'Select or type person...',
  disabled = false,
  required = false,
  autoFocus = false,
  className = '',
  id,
}: PersonSelectProps) {
  const { people, peopleByName } = usePeople();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const datalistId = useMemo(() => `people-list-${Math.random().toString(36).substring(2, 9)}`, []);

  const matchedPerson = useMemo(() => {
    if (!value?.trim()) return null;
    return peopleByName.get(value.trim().toLowerCase()) || null;
  }, [value, peopleByName]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <datalist id={datalistId}>
        {people.map(p => (
          <option key={p.id} value={p.name}>
            {p.role ? `${p.role} · ` : ''}{p.type === 'resource' ? 'Resource' : 'Stakeholder'}
          </option>
        ))}
      </datalist>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          className={`input ${className}`}
          list={datalistId}
          placeholder={placeholder}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          style={{
            paddingRight: 64,
            width: '100%',
          }}
        />

        <div style={{ position: 'absolute', right: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          {value ? (
            <button
              type="button"
              className="btn-icon btn-ghost btn-xs"
              onClick={() => onChange('')}
              title="Clear"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={12} />
            </button>
          ) : null}
          <button
            type="button"
            className="btn-icon btn-ghost btn-xs"
            onClick={() => setOpen(p => !p)}
            title="Pick from Resources & Stakeholders"
            style={{ color: open ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Users size={14} />
          </button>
        </div>
      </div>

      {/* Matched Person Role Info Badge */}
      {matchedPerson && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          fontSize: 11,
          color: 'var(--text-secondary)',
          background: 'var(--bg-elevated)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}>
          {matchedPerson.type === 'resource' ? (
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Team Resource</span>
          ) : (
            <span style={{ color: 'var(--info)', fontWeight: 600 }}>Stakeholder</span>
          )}
          {matchedPerson.role && <span>· {matchedPerson.role}</span>}
          {matchedPerson.organization && <span>({matchedPerson.organization})</span>}
        </div>
      )}

      {/* Popover list */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            maxHeight: 260,
            overflowY: 'auto',
            padding: 6,
          }}
        >
          {people.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No resources or stakeholders created yet. Add them in Resources or Stakeholders pages.
            </div>
          ) : (
            <div>
              {/* Resources Group */}
              {people.filter(p => p.type === 'resource').length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    padding: '4px 8px',
                  }}>
                    Team Resources ({people.filter(p => p.type === 'resource').length})
                  </div>
                  {people.filter(p => p.type === 'resource').map(p => {
                    const isSelected = value?.trim().toLowerCase() === p.name.toLowerCase();
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onChange(p.name);
                          setOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--accent-soft)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Avatar name={p.name} size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.name}
                          </div>
                          {(p.role || p.organization) && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {[p.role, p.organization].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check size={14} color="var(--accent)" />}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Stakeholders Group */}
              {people.filter(p => p.type === 'stakeholder').length > 0 && (
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--text-muted)',
                    padding: '4px 8px',
                    borderTop: people.filter(p => p.type === 'resource').length > 0 ? '1px solid var(--border)' : undefined,
                    paddingTop: 8,
                  }}>
                    Stakeholders ({people.filter(p => p.type === 'stakeholder').length})
                  </div>
                  {people.filter(p => p.type === 'stakeholder').map(p => {
                    const isSelected = value?.trim().toLowerCase() === p.name.toLowerCase();
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          onChange(p.name);
                          setOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--info-bg)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Avatar name={p.name} size={22} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {p.name}
                          </div>
                          {(p.role || p.organization) && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {[p.role, p.organization].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check size={14} color="var(--info)" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PeopleMultiSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * Multi-person selector for fields like Contributors, Participants, Recipients.
 * Stores value as comma-separated string, renders removable chips with avatars,
 * and allows 1-click addition of Resources and Stakeholders.
 */
export function PeopleMultiSelect({
  value,
  onChange,
  placeholder = 'Add participant / contributor...',
}: PeopleMultiSelectProps) {
  const { people } = usePeople();
  const [typedText, setTypedText] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedList = useMemo(() => {
    if (!value?.trim()) return [];
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }, [value]);

  const addPerson = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = selectedList.map(s => s.toLowerCase());
    if (!existing.includes(trimmed.toLowerCase())) {
      const next = [...selectedList, trimmed].join(', ');
      onChange(next);
    }
    setTypedText('');
  };

  const removePerson = (nameToRemove: string) => {
    const next = selectedList.filter(s => s.toLowerCase() !== nameToRemove.toLowerCase()).join(', ');
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPerson(typedText);
    } else if (e.key === 'Backspace' && !typedText && selectedList.length > 0) {
      removePerson(selectedList[selectedList.length - 1]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <div
        className="input"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          minHeight: 38,
          height: 'auto',
          padding: '4px 8px',
          cursor: 'text',
        }}
        onClick={() => containerRef.current?.querySelector('input')?.focus()}
      >
        {selectedList.map(name => {
          const match = people.find(p => p.name.toLowerCase() === name.toLowerCase());
          return (
            <span
              key={name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: match?.type === 'resource' ? 'var(--accent-soft)' : match?.type === 'stakeholder' ? 'var(--info-bg)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 99,
                padding: '2px 8px 2px 4px',
                fontSize: 12,
                color: 'var(--text-primary)',
              }}
            >
              <Avatar name={name} size={16} />
              <span>{name}</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  removePerson(name);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={12} />
              </button>
            </span>
          );
        })}

        <input
          type="text"
          value={typedText}
          onChange={e => setTypedText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedList.length === 0 ? placeholder : ''}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            flex: 1,
            minWidth: 100,
            fontSize: 12,
            color: 'var(--text-primary)',
            padding: '2px 4px',
          }}
        />

        <button
          type="button"
          className="btn-icon btn-ghost btn-xs"
          onClick={e => {
            e.stopPropagation();
            setShowPicker(p => !p);
          }}
          title="Pick Resources & Stakeholders"
          style={{ color: showPicker ? 'var(--accent)' : 'var(--text-muted)', marginLeft: 'auto' }}
        >
          <Users size={14} />
        </button>
      </div>

      {/* Available quick-click pill suggestions under the input */}
      {people.length > 0 && selectedList.length < people.length && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}>Quick add:</span>
          {people
            .filter(p => !selectedList.some(s => s.toLowerCase() === p.name.toLowerCase()))
            .slice(0, 8)
            .map(p => (
              <button
                key={p.id}
                type="button"
                className="btn btn-ghost btn-xs"
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  height: 20,
                  borderRadius: 99,
                  background: p.type === 'resource' ? 'rgba(79, 142, 247, 0.1)' : 'rgba(6, 182, 212, 0.1)',
                  border: `1px solid ${p.type === 'resource' ? 'rgba(79, 142, 247, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                  color: 'var(--text-primary)',
                }}
                onClick={() => addPerson(p.name)}
              >
                + {p.name}
              </button>
            ))}
        </div>
      )}

      {/* Popover list for all people */}
      {showPicker && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            maxHeight: 240,
            overflowY: 'auto',
            padding: 6,
          }}
        >
          {people.map(p => {
            const isSelected = selectedList.some(s => s.toLowerCase() === p.name.toLowerCase());
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (isSelected) removePerson(p.name);
                  else addPerson(p.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                }}
              >
                <Avatar name={p.name} size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {p.type === 'resource' ? 'Resource' : 'Stakeholder'} {p.role ? `· ${p.role}` : ''}
                  </div>
                </div>
                {isSelected ? (
                  <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Added ✓</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+ Add</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
