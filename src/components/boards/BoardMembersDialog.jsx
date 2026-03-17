import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Users, Mail, Crown, Eye } from 'lucide-react';

export default function BoardMembersDialog({ open, onClose, boardId }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviteMode, setInviteMode] = useState('existing'); // 'existing' or 'guest'
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: members = [] } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: () => base44.entities.BoardMember.filter({ board_id: boardId }),
    enabled: !!boardId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (inviteMode === 'existing') {
        const user = users.find(u => u.id === selectedUserId);
        if (!user) return;
        // Check if already member
        const already = members.find(m => m.user_email === user.email);
        if (already) return;
        return base44.entities.BoardMember.create({
          board_id: boardId,
          user_email: user.email,
          user_name: user.full_name || user.email,
          role,
        });
      } else {
        // Guest invite: invite to app as 'user' and add as board member
        await base44.users.inviteUser(email, 'user');
        const already = members.find(m => m.user_email === email);
        if (!already) {
          return base44.entities.BoardMember.create({
            board_id: boardId,
            user_email: email,
            user_name: email,
            role: 'guest',
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members', boardId] });
      setEmail('');
      setSelectedUserId('');
    },
  });

  const removeMember = useMutation({
    mutationFn: (id) => base44.entities.BoardMember.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-members', boardId] }),
  });

  const alreadyMemberIds = new Set(members.map(m => m.user_email));
  const availableUsers = users.filter(u => !alreadyMemberIds.has(u.email));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Membri della bacheca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Mode toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setInviteMode('existing')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${inviteMode === 'existing' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Utenti esistenti
            </button>
            <button
              onClick={() => setInviteMode('guest')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${inviteMode === 'guest' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              Invita ospite
            </button>
          </div>

          {inviteMode === 'existing' ? (
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleziona utente" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="guest">Ospite</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => addMember.mutate()} disabled={!selectedUserId || addMember.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                Aggiungi
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="email@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={() => addMember.mutate()} disabled={!email || addMember.isPending} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Mail className="w-4 h-4" /> Invita come ospite
              </Button>
              <p className="text-xs text-slate-500">L'utente riceverà un invito via email e sarà aggiunto come ospite.</p>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nessun membro aggiunto</p>
            ) : (
              members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-indigo-600">
                        {(m.user_name || m.user_email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-slate-400">{m.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.role === 'guest' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {m.role === 'guest' ? <Eye className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                      {m.role === 'guest' ? 'Ospite' : 'Membro'}
                    </span>
                    <button onClick={() => removeMember.mutate(m.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}