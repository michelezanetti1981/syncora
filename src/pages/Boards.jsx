import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Kanban, MoreHorizontal, Trash2, Archive } from 'lucide-react';
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
        <Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeBoards.map((board) => {
            const boardTasks = tasks.filter(t => t.board_id === board.id);
            const doneTasks = boardTasks.filter(t => t.status === 'done');
            return (
              <Link
                key={board.id}
                to={`/BoardDetail?id=${board.id}`}
                className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div className={`h-2 bg-gradient-to-r ${boardColors[board.color] || boardColors.indigo}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{board.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                        <button className="p-1 rounded-lg hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.preventDefault(); deleteBoard.mutate(board.id); }} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {board.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{board.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                    <span>{boardTasks.length} task</span>
                    <span>{doneTasks.length} completati</span>
                  </div>
                </div>
              </Link>
            );
          })}
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
            <Button onClick={() => createBoard.mutate(form)} disabled={!form.name || createBoard.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {createBoard.isPending ? 'Creazione...' : 'Crea bacheca'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}