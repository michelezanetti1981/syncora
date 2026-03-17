import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUSES = [
  { value: 'backlog', label: 'Backlog', color: 'bg-slate-200 text-slate-700' },
  { value: 'todo', label: 'Da fare', color: 'bg-blue-200 text-blue-800' },
  { value: 'in_progress', label: 'In corso', color: 'bg-amber-200 text-amber-800' },
  { value: 'review', label: 'Revisione', color: 'bg-purple-200 text-purple-800' },
  { value: 'done', label: 'Completato', color: 'bg-emerald-200 text-emerald-800' },
];

const PRIORITIES = [
  { value: 'low', label: 'Bassa', color: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Media', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

function DropdownCell({ value, options, onSave, renderLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative w-full h-full">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center cursor-pointer w-full h-full px-2 py-1"
      >
        {current ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${current.color}`}>{current.label}</span>
        ) : <span className="text-slate-300 text-xs">—</span>}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[140px] py-1 overflow-hidden">
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onSave(o.value); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
            >
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${o.color}`}>{o.label}</span>
              {o.value === value && <Check className="w-3 h-3 text-indigo-500 ml-auto" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableTextCell({ value, onSave, placeholder = '—', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (val !== (value || '')) onSave(val);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value || ''); setEditing(false); } }}
        className={`w-full h-full px-2 py-1 text-sm bg-transparent outline-none border-0 ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => { setVal(value || ''); setEditing(true); }}
      className={`w-full h-full px-2 py-1 text-sm cursor-text truncate ${value ? 'text-slate-800' : 'text-slate-300'} ${className}`}
    >
      {value || placeholder}
    </div>
  );
}

function EditableNumberCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = val === '' ? null : Number(val);
    if (num !== (value ?? null)) onSave(num);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); } }}
        className="w-full h-full px-2 py-1 text-sm text-center bg-transparent outline-none border-0"
      />
    );
  }

  return (
    <div
      onClick={() => { setVal(value ?? ''); setEditing(true); }}
      className={`w-full h-full px-2 py-1 text-sm text-center cursor-text ${value != null ? 'text-slate-800' : 'text-slate-300'}`}
    >
      {value != null ? value : '—'}
    </div>
  );
}

function AssigneeCell({ value, options, onSave }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full h-full">
      <div onClick={() => setOpen(o => !o)} className="flex items-center justify-center w-full h-full px-2 cursor-pointer">
        {value ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-semibold text-indigo-600">
              {value.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-700 truncate max-w-[80px]">{value}</span>
          </div>
        ) : <span className="text-slate-300 text-xs">—</span>}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[160px] py-1">
          <div
            onClick={() => { onSave('', ''); setOpen(false); }}
            className="px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-500"
          >Non assegnato</div>
          {options.map(u => (
            <div
              key={u.email}
              onClick={() => { onSave(u.email, u.name); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-semibold text-indigo-600">
                {(u.name || u.email).charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-700">{u.name || u.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MondayTableView({ tasks, boardId, onSelect }) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [addingRow, setAddingRow] = useState(false);
  const newInputRef = useRef(null);

  const { data: boardMembers = [] } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => base44.entities.BoardMember.filter({ board_id: boardId }),
    enabled: !!boardId,
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data?.users || [];
    },
  });
  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions-active'],
    queryFn: () => base44.entities.Commission.filter({ status: 'active' }),
  });

  const assignableUsers = boardMembers.length > 0
    ? boardMembers.map(m => ({ email: m.user_email, name: m.user_name || m.user_email }))
    : users.map(u => ({ email: u.email, name: u.full_name || u.email }));

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  });

  const createTask = useMutation({
    mutationFn: (title) => base44.entities.Task.create({ title, board_id: boardId, status: 'todo', priority: 'medium' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', boardId] });
      setNewTitle('');
      setAddingRow(false);
    },
  });

  useEffect(() => {
    if (addingRow) newInputRef.current?.focus();
  }, [addingRow]);

  const save = (task, field, value) => updateTask.mutate({ id: task.id, data: { [field]: value } });

  const cols = [
    { label: 'Task', width: 'min-w-[260px] flex-1' },
    { label: 'Stato', width: 'w-32' },
    { label: 'Priorità', width: 'w-28' },
    { label: 'Assegnato', width: 'w-36' },
    { label: 'Stimate', width: 'w-20' },
    { label: 'Registrate', width: 'w-24' },
    { label: 'Commessa', width: 'w-36' },
    { label: 'Deadline', width: 'w-28' },
    { label: '', width: 'w-10' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <div className="w-8 flex-shrink-0 px-3 py-3"></div>
        {cols.map((col, i) => (
          <div key={i} className={`${col.width} flex-shrink-0 px-2 py-3 ${i === 0 ? '' : 'text-center'}`}>
            {col.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          assignableUsers={assignableUsers}
          commissions={commissions}
          onSave={save}
          onDelete={() => deleteTask.mutate(task.id)}
          onSelect={() => onSelect(task)}
        />
      ))}

      {/* Add row */}
      {addingRow ? (
        <div className="flex items-center border-t border-slate-100 bg-blue-50/40">
          <div className="w-8 flex-shrink-0" />
          <div className="min-w-[260px] flex-1 px-2 py-2">
            <input
              ref={newInputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTitle.trim()) createTask.mutate(newTitle.trim());
                if (e.key === 'Escape') { setAddingRow(false); setNewTitle(''); }
              }}
              onBlur={() => { if (newTitle.trim()) createTask.mutate(newTitle.trim()); else { setAddingRow(false); setNewTitle(''); } }}
              placeholder="Nome del task..."
              className="w-full text-sm px-2 py-1 rounded-lg border border-indigo-300 outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => setAddingRow(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer border-t border-slate-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Aggiungi task
        </div>
      )}

      {/* Footer totals */}
      {tasks.length > 0 && (
        <div className="flex items-center border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium">
          <div className="w-8 flex-shrink-0" />
          <div className="min-w-[260px] flex-1 px-2 py-2.5"></div>
          <div className="w-32 flex-shrink-0 px-2 py-2.5 text-center"></div>
          <div className="w-28 flex-shrink-0 px-2 py-2.5 text-center"></div>
          <div className="w-36 flex-shrink-0 px-2 py-2.5 text-center"></div>
          <div className="w-20 flex-shrink-0 px-2 py-2.5 text-center font-semibold text-slate-700">
            {tasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)}h
          </div>
          <div className="w-24 flex-shrink-0 px-2 py-2.5 text-center font-semibold text-slate-700">
            {tasks.reduce((s, t) => s + (t.logged_hours || 0), 0)}h
          </div>
          <div className="w-36 flex-shrink-0 px-2 py-2.5 text-center"></div>
          <div className="w-28 flex-shrink-0 px-2 py-2.5 text-center"></div>
          <div className="w-10 flex-shrink-0"></div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, assignableUsers, commissions, onSave, onDelete, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const [checked, setChecked] = useState(task.status === 'done');

  const toggleDone = (e) => {
    e.stopPropagation();
    const newStatus = checked ? 'todo' : 'done';
    setChecked(!checked);
    onSave(task, 'status', newStatus);
  };

  const commission = commissions.find(c => c.id === task.commission_id);

  return (
    <div
      className={`flex items-center border-b border-slate-50 transition-colors ${hovered ? 'bg-slate-50/70' : 'bg-white'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center py-2">
        <div
          onClick={toggleDone}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-indigo-400'}`}
        >
          {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
      </div>

      {/* Title */}
      <div
        className="min-w-[260px] flex-1 flex-shrink-0 border-r border-slate-100 cursor-pointer"
        onClick={onSelect}
      >
        <div className={`px-2 py-2 text-sm font-medium truncate ${checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {task.title}
        </div>
      </div>

      {/* Status */}
      <div className="w-32 flex-shrink-0 border-r border-slate-100 h-full" onClick={e => e.stopPropagation()}>
        <DropdownCell
          value={task.status}
          options={STATUSES}
          onSave={v => onSave(task, 'status', v)}
        />
      </div>

      {/* Priority */}
      <div className="w-28 flex-shrink-0 border-r border-slate-100 h-full" onClick={e => e.stopPropagation()}>
        <DropdownCell
          value={task.priority}
          options={PRIORITIES}
          onSave={v => onSave(task, 'priority', v)}
        />
      </div>

      {/* Assignee */}
      <div className="w-36 flex-shrink-0 border-r border-slate-100 h-full" onClick={e => e.stopPropagation()}>
        <AssigneeCell
          value={task.assignee_name}
          options={assignableUsers}
          onSave={(email, name) => onSave(task, 'assignee_email', email) || onSave(task, 'assignee_name', name)}
        />
      </div>

      {/* Estimated hours */}
      <div className="w-20 flex-shrink-0 border-r border-slate-100" onClick={e => e.stopPropagation()}>
        <EditableNumberCell
          value={task.estimated_hours}
          onSave={v => onSave(task, 'estimated_hours', v)}
        />
      </div>

      {/* Logged hours */}
      <div className="w-24 flex-shrink-0 border-r border-slate-100" onClick={e => e.stopPropagation()}>
        <EditableNumberCell
          value={task.logged_hours}
          onSave={v => onSave(task, 'logged_hours', v)}
        />
      </div>

      {/* Commission */}
      <div className="w-36 flex-shrink-0 border-r border-slate-100 h-full" onClick={e => e.stopPropagation()}>
        <CommissionCell value={task.commission_id} commissions={commissions} onSave={v => onSave(task, 'commission_id', v)} />
      </div>

      {/* Deadline */}
      <div className="w-28 flex-shrink-0 border-r border-slate-100 h-full" onClick={e => e.stopPropagation()}>
        <DateCell value={task.deadline} onSave={v => onSave(task, 'deadline', v)} />
      </div>

      {/* Delete */}
      <div className="w-10 flex-shrink-0 flex items-center justify-center">
        {hovered && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}