import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Kanban, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/shared/EmptyState';

const boardColors = {
  indigo: 'from-indigo-500 to-indigo-600',
  violet: 'from-violet-500 to-violet-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  sky: 'from-sky-500 to-sky-600',
  orange: 'from-orange-500 to-orange-600',
};

export default function Boards() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: 'indigo', project_id: '' });
  const qc = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allBoards = [], isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.list('-created_date'),
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-memberships', currentUser?.email],
    queryFn: () => base44.entities.BoardMember.filter({ user_email: currentUser.email }),
    enabled: !!currentUser?.email,
  });

  const memberBoardIds = new Set(myMemberships.map(m => m.board_id));
  const isAdmin = currentUser?.role === 'admin';
  const boards = isAdmin
    ? allBoards
    : allBoards.filter(b => b.created_by === currentUser?.email || memberBoardIds.has(b.id));

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 500),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createBoard = useMutation({
    mutationFn: (data) => base44.entities.Board.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boards'] }); setShowDialog(false); setForm({ name: '', description: '', color: 'indigo', project_id: '' }); },
  });

  const updateBoard = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Board.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['boards'] }); setShowDialog(false); setEditingBoard(null); setForm({ name: '', description: '', color: 'indigo', project_id: '' }); },
  });

  const openEdit = (board) => {
    setEditingBoard(board);
    setForm({ name: board.name, description: board.description || '', color: board.color || 'indigo', project_id: board.project_id || '' });
    setShowDialog(true);
  };

  const deleteBoard = useMutation({
    mutationFn: (id) => base44.entities.Board.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  const activeBoards = boards.filter(b => b.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bacheche</h1>
          <p className="text-sm text-slate-500 mt-1">{activeBoards.length} bacheche attive</p>
        </div>
        <Button onClick={() => { setEditingBoard(null); setForm({ name: '', description: '', color: 'indigo', project_id: '' }); setShowDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Nuova bacheca
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : activeBoards.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Nessuna bacheca"
          description="Crea la tua prima bacheca per iniziare a organizzare i task"
          action={<Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="w-4 h-4" /> Crea bacheca</Button>}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Bacheca</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Progetto</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Task</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Completati</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {activeBoards.map((board) => {
                const boardTasks = tasks.filter(t => t.board_id === board.id);
                const doneTasks = boardTasks.filter(t => t.status === 'done');
                const project = projects.find(p => p.id === board.project_id);
                return (
                  <tr key={board.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link to={`/BoardDetail?id=${board.id}`} className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br flex-shrink-0 ${boardColors[board.color] || boardColors.indigo}`} style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
                        <div className={`w-1 h-8 rounded-full bg-gradient-to-b flex-shrink-0 ${boardColors[board.color] || boardColors.indigo}`} />
                        <div>
                          <p className="font-medium text-slate-800 hover:text-indigo-600 transition-colors">{board.name}</p>
                          {board.description && <p className="text-xs text-slate-400 line-clamp-1">{board.description}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{project ? project.name : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{boardTasks.length}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{doneTasks.length}</span>
                      {boardTasks.length > 0 && (
                        <span className="text-slate-400 ml-1 text-xs">({Math.round(doneTasks.length / boardTasks.length * 100)}%)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteBoard.mutate(board.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova bacheca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="Nome bacheca" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea placeholder="Descrizione (opzionale)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
              <SelectTrigger><SelectValue placeholder="Colore" /></SelectTrigger>
              <SelectContent>
                {Object.keys(boardColors).map(c => (
                  <SelectItem key={c} value={c}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${boardColors[c]}`} />
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.project_id || 'none'} onValueChange={v => setForm({ ...form, project_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Progetto (opzionale)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun progetto</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => createBoard.mutate(form)} disabled={!form.name || createBoard.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {createBoard.isPending ? 'Creazione...' : 'Crea bacheca'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}