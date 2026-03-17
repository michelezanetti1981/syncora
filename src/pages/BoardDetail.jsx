import React, { useState } from 'react';
import ImportFromMondayDialog from '@/components/boards/ImportFromMondayDialog';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Trash2, Download, Users, MessageSquare } from 'lucide-react';
import { exportTasksToExcel } from '@/utils/exportExcel';
import BoardMembersDialog from '@/components/boards/BoardMembersDialog';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import TaskDialog from '@/components/tasks/TaskDialog';
import TaskDetailPanel from '@/components/tasks/TaskDetailPanel';
import EmptyState from '@/components/shared/EmptyState';
import { format, isPast, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import BoardChat from '@/components/commissions/CommissionChat';
import MondayTableView from '@/components/tasks/MondayTableView';
import CustomFieldsManager from '@/components/boards/CustomFieldsManager';

const statusColumns = [
  { key: 'backlog', label: 'Backlog', color: 'border-slate-300' },
  { key: 'todo', label: 'Da fare', color: 'border-blue-400' },
  { key: 'in_progress', label: 'In corso', color: 'border-amber-400' },
  { key: 'review', label: 'Revisione', color: 'border-purple-400' },
  { key: 'done', label: 'Completato', color: 'border-emerald-400' },
];

export default function BoardDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get('id');
  const qc = useQueryClient();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewMode, setViewMode] = useState('kanban');
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mondayImportOpen, setMondayImportOpen] = useState(false);

  const { data: board } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const boards = await base44.entities.Board.filter({ id: boardId });
      return boards[0];
    },
    enabled: !!boardId,
  });

  const { data: boardMembers = [] } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => base44.entities.BoardMember.filter({ board_id: boardId }),
    enabled: !!boardId,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', boardId],
    queryFn: () => base44.entities.Task.filter({ board_id: boardId }, '-created_date', 500),
    enabled: !!boardId,
  });

  const { data: allComments = [] } = useQuery({
    queryKey: ['comments-board', boardId],
    queryFn: async () => {
      if (!tasks.length) return [];
      const taskIds = new Set(tasks.map(t => t.id));
      const comments = await base44.entities.Comment.list('-created_date', 1000);
      return comments.filter(c => taskIds.has(c.task_id));
    },
    enabled: tasks.length > 0,
  });

  const commentCountByTask = allComments.reduce((acc, c) => {
    acc[c.task_id] = (acc[c.task_id] || 0) + 1;
    return acc;
  }, {});

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Task.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (task) => {
      // Restore hours to commission
      if (task.commission_id && task.logged_hours > 0) {
        const comms = await base44.entities.Commission.filter({ id: task.commission_id });
        if (comms[0]) {
          await base44.entities.Commission.update(comms[0].id, {
            used_hours: Math.max(0, (comms[0].used_hours || 0) - (task.logged_hours || 0))
          });
        }
      }
      return base44.entities.Task.delete(task.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });

  const handleEdit = (task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  if (!board && !isLoading) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Bacheca non trovata</p>
        <Link to="/Boards" className="text-indigo-600 text-sm mt-2 inline-block">Torna alle bacheche</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/Boards" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{board?.name}</h1>
            {board?.description && <p className="text-sm text-slate-500">{board.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Tabella
            </button>
          </div>
          <Button variant="outline" onClick={() => setChatOpen(o => !o)} className="gap-2">
            <MessageSquare className="w-4 h-4" /> Chat
          </Button>
          <Button variant="outline" onClick={() => setMembersDialogOpen(true)} className="gap-2">
            <Users className="w-4 h-4" /> Membri
            {boardMembers.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">{boardMembers.length}</span>
            )}
          </Button>
          <Button variant="outline" onClick={() => setMondayImportOpen(true)} className="gap-2">
            <Download className="w-4 h-4" /> Importa da Monday
          </Button>
          <Button variant="outline" onClick={() => exportTasksToExcel(tasks, board?.name || 'tasks')} className="gap-2">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
          <Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" /> Nuovo task
          </Button>
        </div>
      </div>

      {tasks.length === 0 && !isLoading ? (
        <EmptyState
          icon={Plus}
          title="Nessun task"
          description="Crea il primo task per questa bacheca"
          action={<Button onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="w-4 h-4" /> Crea task</Button>}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView tasks={tasks} statusColumns={statusColumns} onSelect={setSelectedTask} onStatusChange={updateStatus} onDelete={deleteTask} commentCountByTask={commentCountByTask} />
      ) : (
        <MondayTableView tasks={tasks} boardId={boardId} onSelect={setSelectedTask} />
      )}

      <TaskDialog
        open={taskDialogOpen}
        onClose={() => { setTaskDialogOpen(false); setEditingTask(null); }}
        task={editingTask}
        boardId={boardId}
      />

      <TaskDetailPanel
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onEdit={handleEdit}
        boardMembers={boardMembers}
      />

      <BoardMembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        boardId={boardId}
      />

      <ImportFromMondayDialog
        open={mondayImportOpen}
        onOpenChange={setMondayImportOpen}
        targetBoardId={boardId}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['tasks', boardId] })}
      />

      {chatOpen && <BoardChat boardId={boardId} />}
    </div>
  );
}

function KanbanView({ tasks, statusColumns, onSelect, onStatusChange, onDelete, commentCountByTask }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8">
      {statusColumns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
              <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
            </div>
            <div className="space-y-2">
              {colTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => onSelect(task)} onDelete={onDelete} commentCount={commentCountByTask[task.id] || 0} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onClick, onDelete, commentCount }) {
  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) && task.status !== 'done';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-sm hover:shadow-md cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-800 flex-1">{task.title}</h4>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete.mutate(task); }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityBadge priority={task.priority} />
        {task.deadline && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
            {format(new Date(task.deadline), 'd MMM', { locale: it })}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {task.assignee_name ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-[10px] font-medium text-indigo-600">{task.assignee_name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs text-slate-500">{task.assignee_name}</span>
          </div>
        ) : <span />}
        <div className="flex items-center gap-2">
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MessageSquare className="w-3 h-3" /> {commentCount}
            </span>
          )}
          {(task.logged_hours > 0 || task.estimated_hours > 0) && (
            <span className="text-xs text-slate-400">{task.logged_hours || 0}h/{task.estimated_hours || '—'}h</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TableView({ tasks, onSelect, onDelete, commentCountByTask }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left p-4 font-medium text-slate-500">Task</th>
            <th className="text-left p-4 font-medium text-slate-500">Stato</th>
            <th className="text-left p-4 font-medium text-slate-500">Priorità</th>
            <th className="text-left p-4 font-medium text-slate-500">Assegnato</th>
            <th className="text-left p-4 font-medium text-slate-500">Deadline</th>
            <th className="text-left p-4 font-medium text-slate-500">Ore</th>
            <th className="text-left p-4 font-medium text-slate-500"></th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr
              key={task.id}
              onClick={() => onSelect(task)}
              className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td className="p-4 font-medium text-slate-800">{task.title}</td>
              <td className="p-4"><StatusBadge status={task.status} /></td>
              <td className="p-4"><PriorityBadge priority={task.priority} /></td>
              <td className="p-4 text-slate-600">{task.assignee_name || '—'}</td>
              <td className="p-4 text-slate-600">
                {task.deadline ? format(new Date(task.deadline), 'd MMM yyyy', { locale: it }) : '—'}
              </td>
              <td className="p-4 text-slate-600">{task.logged_hours || 0}h / {task.estimated_hours || '—'}h</td>
              <td className="p-4">
                {(commentCountByTask[task.id] || 0) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <MessageSquare className="w-3.5 h-3.5" /> {commentCountByTask[task.id]}
                  </span>
                )}
              </td>
              <td className="p-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete.mutate(task); }}
                  className="p-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}