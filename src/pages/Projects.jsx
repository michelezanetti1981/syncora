import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FolderKanban, Trash2, Pencil, User, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/shared/EmptyState';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  on_hold: 'bg-amber-100 text-amber-700',
};
const statusLabels = { active: 'Attivo', completed: 'Completato', on_hold: 'In pausa' };

const gradients = {
  indigo: 'from-indigo-500 to-indigo-600',
  violet: 'from-violet-500 to-violet-600',
  emerald: 'from-emerald-500 to-emerald-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  sky: 'from-sky-500 to-sky-600',
  orange: 'from-orange-500 to-orange-600',
};

const emptyForm = {
  name: '', description: '', client: '', status: 'active', color: 'indigo',
  project_manager_email: '', project_manager_name: '',
  responsible_email: '', responsible_name: '',
  start_date: '', end_date: '',
};

export default function Projects() {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingProject, setEditingProject] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listUsers', {});
      return res.data?.users || [];
    },
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: () => base44.entities.Board.list('-created_date'),
  });

  const save = useMutation({
    mutationFn: (data) => editingProject
      ? base44.entities.Project.update(editingProject.id, data)
      : base44.entities.Project.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowDialog(false);
      setForm(emptyForm);
      setEditingProject(null);
    },
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const openEdit = (p) => {
    setEditingProject(p);
    setForm({
      name: p.name || '', description: p.description || '', client: p.client || '',
      status: p.status || 'active', color: p.color || 'indigo',
      project_manager_email: p.project_manager_email || '',
      project_manager_name: p.project_manager_name || '',
      responsible_email: p.responsible_email || '',
      responsible_name: p.responsible_name || '',
      start_date: p.start_date || '', end_date: p.end_date || '',
    });
    setShowDialog(true);
  };

  const handleUserSelect = (field_email, field_name, email) => {
    const user = users.find(u => u.email === email);
    setForm(f => ({ ...f, [field_email]: email, [field_name]: user?.full_name || email }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Progetti</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.filter(p => p.status === 'active').length} progetti attivi</p>
        </div>
        <Button onClick={() => { setEditingProject(null); setForm(emptyForm); setShowDialog(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Nuovo progetto
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto"
          description="Crea il primo progetto per organizzare le bacheche"
          action={<Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="w-4 h-4" /> Crea progetto</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => {
            const projectBoards = boards.filter(b => b.project_id === p.id);
            return (
              <div key={p.id} className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className={`h-2 bg-gradient-to-r ${gradients[p.color] || gradients.indigo}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{p.name}</h3>
                      {p.client && <p className="text-xs text-slate-500">{p.client}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Modifica">
                        <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button onClick={() => deleteProject.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Elimina">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {p.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{p.description}</p>}

                  <div className="space-y-1.5 mt-3">
                    {p.project_manager_name && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <UserCog className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="text-slate-400">PM:</span> {p.project_manager_name}
                      </div>
                    )}
                    {p.responsible_name && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <User className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="text-slate-400">Resp:</span> {p.responsible_name}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>{projectBoards.length} bachech{projectBoards.length === 1 ? 'a' : 'e'}</span>
                    {p.end_date && <span>Scadenza: {new Date(p.end_date).toLocaleDateString('it-IT')}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) { setEditingProject(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Modifica progetto' : 'Nuovo progetto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome progetto" />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Nome cliente" />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stato</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Attivo</SelectItem>
                    <SelectItem value="on_hold">In pausa</SelectItem>
                    <SelectItem value="completed">Completato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colore</Label>
                <Select value={form.color} onValueChange={v => setForm({ ...form, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(gradients).map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Project Manager</Label>
              <Select value={form.project_manager_email || 'none'} onValueChange={v => handleUserSelect('project_manager_email', 'project_manager_name', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona PM" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsabile progetto</Label>
              <Select value={form.responsible_email || 'none'} onValueChange={v => handleUserSelect('responsible_email', 'responsible_name', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona responsabile" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data inizio</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Data fine</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={() => save.mutate(form)} disabled={!form.name || save.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {save.isPending ? 'Salvataggio...' : editingProject ? 'Salva modifiche' : 'Crea progetto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}