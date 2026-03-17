import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Clock, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import EmptyState from '@/components/shared/EmptyState';

const statusOrder = ['in_progress', 'todo', 'review', 'backlog', 'done'];

export default function MyWork() {
  const [filter, setFilter] = useState('active');

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ assignee_email: currentUser.email }, '-created_date', 500),
    enabled: !!currentUser?.email,
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.list(),
  });

  const boardMap = Object.fromEntries(boards.map(b => [b.id, b]));

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const overdue = activeTasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)));

  const displayed = filter === 'active' ? activeTasks : filter === 'done' ? doneTasks : overdue;
  const sorted = [...displayed].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Il mio lavoro</h1>
        <p className="text-sm text-slate-500 mt-1">I task assegnati a te</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFilter('active')} className={`bg-white rounded-2xl border p-5 text-left transition-all ${filter === 'active' ? 'border-indigo-400 shadow-md' : 'border-slate-200/60 shadow-sm'}`}>
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeTasks.length}</p>
          <p className="text-xs text-slate-500">In corso</p>
        </button>
        <button onClick={() => setFilter('overdue')} className={`bg-white rounded-2xl border p-5 text-left transition-all ${filter === 'overdue' ? 'border-red-400 shadow-md' : 'border-slate-200/60 shadow-sm'}`}>
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-xs text-slate-500">In scadenza</p>
        </button>
        <button onClick={() => setFilter('done')} className={`bg-white rounded-2xl border p-5 text-left transition-all ${filter === 'done' ? 'border-emerald-400 shadow-md' : 'border-slate-200/60 shadow-sm'}`}>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{doneTasks.length}</p>
          <p className="text-xs text-slate-500">Completati</p>
        </button>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={ListTodo} title="Nessun task" description="Non hai task in questa categoria" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-50">
          {sorted.map(task => {
            const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) && task.status !== 'done';
            return (
              <Link
                key={task.id}
                to={`/BoardDetail?id=${task.board_id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    {boardMap[task.board_id] && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                        {boardMap[task.board_id].name}
                      </span>
                    )}
                    {task.deadline && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {format(new Date(task.deadline), 'd MMM yyyy', { locale: it })}
                      </span>
                    )}
                  </div>
                </div>
                {(task.logged_hours > 0 || task.estimated_hours > 0) && (
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-slate-700">{task.logged_hours || 0}h</p>
                    <p className="text-xs text-slate-400">su {task.estimated_hours || '—'}h</p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}