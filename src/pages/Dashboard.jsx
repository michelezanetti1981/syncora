import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Kanban, Briefcase, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Dashboard() {
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Accesso negato</h2>
        <p className="text-sm text-slate-500 mt-1">Solo gli amministratori possono accedere alla dashboard.</p>
      </div>
    );
  }

  const { data: allBoards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.filter({ status: 'active' }),
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', currentUser?.email],
    queryFn: () => base44.entities.BoardMember.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const memberBoardIds = new Set(myMemberships.map(m => m.board_id));
  const boards = allBoards.filter(b => b.created_by === currentUser?.email || memberBoardIds.has(b.id));

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.filter({ status: 'active' }),
  });

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');
  const overdueTasks = activeTasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)));
  const totalLogged = tasks.reduce((sum, t) => sum + (t.logged_hours || 0), 0);

  const stats = [
    { label: 'Bacheche attive', value: boards.length, icon: Kanban, color: 'bg-indigo-500' },
    { label: 'Task attivi', value: activeTasks.length, icon: Clock, color: 'bg-amber-500' },
    { label: 'Completati', value: completedTasks.length, icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'In scadenza', value: overdueTasks.length, icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const recentTasks = [...tasks].slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Panoramica del tuo lavoro</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Task recenti</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">Nessun task ancora</p>
            ) : (
              recentTasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/BoardDetail?id=${task.board_id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>
                  {task.deadline && (
                    <span className="text-xs text-slate-500 ml-4 whitespace-nowrap">
                      {format(new Date(task.deadline), 'd MMM', { locale: it })}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Commissions summary */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Commesse attive</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {commissions.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">Nessuna commessa</p>
            ) : (
              commissions.map((c) => {
                const remaining = (c.prepaid_hours || 0) - (c.used_hours || 0);
                const pct = c.prepaid_hours ? ((c.used_hours || 0) / c.prepaid_hours) * 100 : 0;
                return (
                  <Link
                    key={c.id}
                    to={`/CommissionDetail?id=${c.id}`}
                    className="p-4 block hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{c.client}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{remaining.toFixed(1)}h rimanenti su {c.prepaid_hours}h</p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}