import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statuses = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Da fare' },
  { value: 'in_progress', label: 'In corso' },
  { value: 'review', label: 'Revisione' },
  { value: 'done', label: 'Completato' },
];

const priorities = [
  { value: 'low', label: 'Bassa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export default function TaskDialog({ open, onClose, task, boardId }) {
  const qc = useQueryClient();
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    deadline: '', estimated_hours: '', assignee_email: '', assignee_name: '',
    commission_id: '', group_name: 'Generale',
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        deadline: task.deadline || '',
        estimated_hours: task.estimated_hours || '',
        assignee_email: task.assignee_email || '',
        assignee_name: task.assignee_name || '',
        commission_id: task.commission_id || '',
        group_name: task.group_name || 'Generale',
      });
    } else {
      setForm({
        title: '', description: '', status: 'todo', priority: 'medium',
        deadline: '', estimated_hours: '', assignee_email: '', assignee_name: '',
        commission_id: '', group_name: 'Generale',
      });
    }
  }, [task, open]);

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

  // Build assignable users: board members + all app users with matching email
  const assignableUsers = boardMembers.length > 0
    ? boardMembers.map(m => ({ email: m.user_email, name: m.user_name || m.user_email }))
    : users.map(u => ({ email: u.email, name: u.full_name || u.email }));

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions-active'],
    queryFn: () => base44.entities.Commission.filter({ status: 'active' }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        board_id: boardId,
        estimated_hours: data.estimated_hours ? Number(data.estimated_hours) : null,
      };
      if (isEdit) {
        // If commission changed, update hours on old/new commission
        const oldTask = task;
        const result = await base44.entities.Task.update(task.id, payload);
        if (oldTask.commission_id !== payload.commission_id && oldTask.logged_hours > 0) {
          // Restore hours on old commission
          if (oldTask.commission_id) {
            const oldComm = commissions.find(c => c.id === oldTask.commission_id);
            if (oldComm) {
              await base44.entities.Commission.update(oldComm.id, {
                used_hours: Math.max(0, (oldComm.used_hours || 0) - (oldTask.logged_hours || 0))
              });
            }
          }
          // Add hours to new commission
          if (payload.commission_id) {
            const newComm = commissions.find(c => c.id === payload.commission_id);
            if (newComm) {
              await base44.entities.Commission.update(newComm.id, {
                used_hours: (newComm.used_hours || 0) + (oldTask.logged_hours || 0)
              });
            }
          }
        }
        return result;
      } else {
        return base44.entities.Task.create(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      onClose();
    },
  });

  const handleUserChange = (email) => {
    const member = assignableUsers.find(u => u.email === email);
    setForm({ ...form, assignee_email: email, assignee_name: member?.name || email });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifica task' : 'Nuovo task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Titolo *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titolo del task" />
          </div>
          <div>
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrizione..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stato</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorità</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <Label>Ore stimate</Label>
              <Input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Assegnato a</Label>
            <Select value={form.assignee_email || "unassigned"} onValueChange={(v) => handleUserChange(v === "unassigned" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona membro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assegnato</SelectItem>
                {assignableUsers.map(u => <SelectItem key={u.email} value={u.email}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Commessa</Label>
            <Select value={form.commission_id || "none"} onValueChange={(v) => setForm({ ...form, commission_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona commessa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna commessa</SelectItem>
                {commissions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gruppo</Label>
            <Input value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="Nome gruppo" />
          </div>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={!form.title || saveMutation.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {saveMutation.isPending ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}