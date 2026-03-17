import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Kanban, Briefcase, CheckCircle2, Clock, AlertTriangle, FolderKanban, MessageSquare, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';

// ─── Admin Dashboard ────────────────────────────────────────────────────────
function AdminDashboard({ currentUser }) {
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Task recenti</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTasks.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">Nessun task ancora</p>
            ) : (
              recentTasks.map((task) => (
                <Link key={task.id} to={`/BoardDetail?id=${task.board_id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
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
                  <Link key={c.id} to={`/CommissionDetail?id=${c.id}`}
                    className="p-4 block hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{c.client}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
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

// ─── User Dashboard ──────────────────────────────────────────────────────────
const gradients = {
  indigo: 'from-indigo-500 to-indigo-600',
  violet: 'from-violet-500 to-violet-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  sky: 'from-sky-500 to-sky-600',
  orange: 'from-orange-500 to-orange-600',
};

function UserDashboard({ currentUser }) {
  // Projects visible to user
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });
  const myProjects = allProjects.filter(p =>
    !p.allowed_user_emails?.length || p.allowed_user_emails.includes(currentUser?.email)
  );

  // Commissions visible to user
  const { data: allCommissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.filter({ status: 'active' }),
  });
  const myCommissions = allCommissions.filter(c =>
    !c.allowed_user_emails?.length || c.allowed_user_emails.includes(currentUser?.email)
  );

  // Boards (for project board counts)
  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.list('-created_date'),
  });

  // Recent chat messages across all boards
  const { data: recentMessages = [] } = useQuery({
    queryKey: ['recent-messages'],
    queryFn: () => base44.entities.ProjectMessage.list('-created_date', 20),
    refetchInterval: 15000,
  });

  // Get unique board ids from messages to look up board names
  const messageBoardIds = [...new Set(recentMessages.map(m => m.board_id))];
  const boardMap = Object.fromEntries(boards.map(b => [b.id, b]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Ciao, {currentUser?.full_name?.split(' ')[0] || 'benvenuto'} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">Ecco una panoramica delle tue attività</p>
      </div>

      {/* My Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-500" /> I miei progetti
          </h2>
          <Link to="/Projects" className="text-xs text-indigo-600 hover:underline">Vedi tutti</Link>
        </div>
        {myProjects.length === 0 ? (
          <p className="text-sm text-slate-400">Nessun progetto assegnato.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProjects.slice(0, 6).map(p => {
              const projectBoards = boards.filter(b => b.project_id === p.id);
              return (
                <Link key={p.id} to="/Boards" className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all block">
                  <div className={`h-1.5 bg-gradient-to-r ${gradients[p.color] || gradients.indigo}`} />
                  <div className="p-4">
                    <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                    {p.client && <p className="text-xs text-slate-400 mt-0.5">{p.client}</p>}
                    <p className="text-xs text-slate-400 mt-2">{projectBoards.length} bachech{projectBoards.length === 1 ? 'a' : 'e'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Commissions */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" /> Commesse
            </h2>
            <Link to="/Commissions" className="text-xs text-indigo-600 hover:underline">Vedi tutte</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {myCommissions.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">Nessuna commessa</p>
            ) : (
              myCommissions.slice(0, 6).map((c) => {
                const remaining = (c.prepaid_hours || 0) - (c.used_hours || 0);
                const pct = c.prepaid_hours ? ((c.used_hours || 0) / c.prepaid_hours) * 100 : 0;
                return (
                  <Link key={c.id} to={`/CommissionDetail?id=${c.id}`}
                    className="p-4 block hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{c.client}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{remaining.toFixed(1)}h rimanenti su {c.prepaid_hours}h</p>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent chat messages */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-500" /> Ultimi messaggi chat
            </h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {recentMessages.length === 0 ? (
              <p className="p-5 text-sm text-slate-500 text-center">Nessun messaggio recente</p>
            ) : (
              recentMessages.map((msg) => {
                const board = boardMap[msg.board_id];
                const isMe = msg.author_email === currentUser?.email;
                return (
                  <Link key={msg.id} to={`/BoardDetail?id=${msg.board_id}`}
                    className="flex gap-3 p-4 hover:bg-slate-50 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-indigo-600">
                        {(msg.author_name || msg.author_email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">{isMe ? 'Tu' : (msg.author_name || msg.author_email)}</span>
                        {board && <span className="text-xs text-slate-400">in {board.name}</span>}
                        <span className="text-xs text-slate-300 ml-auto whitespace-nowrap">
                          {format(new Date(msg.created_date), 'd MMM HH:mm', { locale: it })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 truncate mt-0.5">{msg.content}</p>
                    </div>
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

// ─── Root ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentUser.role === 'admin') {
    return <AdminDashboard currentUser={currentUser} />;
  }

  return <UserDashboard currentUser={currentUser} />;
}