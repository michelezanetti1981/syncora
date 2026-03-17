import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clock, Briefcase, Edit2, Check, X, Mail, Plus, Trash2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CommissionDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const commissionId = urlParams.get('id');
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newEmail, setNewEmail] = useState('');
  const [sendingReport, setSendingReport] = useState(false);

  const { data: commission } = useQuery({
    queryKey: ['commission', commissionId],
    queryFn: async () => {
      const comms = await base44.entities.Commission.filter({ id: commissionId });
      return comms[0];
    },
    enabled: !!commissionId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-commission', commissionId],
    queryFn: () => base44.entities.Task.filter({ commission_id: commissionId }, '-created_date'),
    enabled: !!commissionId,
  });

  const updateCommission = useMutation({
    mutationFn: (data) => base44.entities.Commission.update(commissionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commission', commissionId] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      setEditing(false);
    },
  });

  const addReferente = async () => {
    if (!newEmail.trim()) return;
    const current = commission.referenti || [];
    if (current.includes(newEmail.trim())) return;
    await base44.entities.Commission.update(commissionId, { referenti: [...current, newEmail.trim()] });
    qc.invalidateQueries({ queryKey: ['commission', commissionId] });
    setNewEmail('');
  };

  const removeReferente = async (email) => {
    const current = commission.referenti || [];
    await base44.entities.Commission.update(commissionId, { referenti: current.filter(e => e !== email) });
    qc.invalidateQueries({ queryKey: ['commission', commissionId] });
  };

  const sendReport = async () => {
    setSendingReport(true);
    await base44.functions.invoke('sendCommissionReport', { commissionId });
    setSendingReport(false);
  };

  if (!commission) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Commessa non trovata</p>
        <Link to="/Commissions" className="text-indigo-600 text-sm mt-2 inline-block">Torna alle commesse</Link>
      </div>
    );
  }

  const remaining = (commission.prepaid_hours || 0) - (commission.used_hours || 0);
  const pct = commission.prepaid_hours ? ((commission.used_hours || 0) / commission.prepaid_hours) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/Commissions" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{commission.name}</h1>
          <p className="text-sm text-slate-500">{commission.client}</p>
        </div>
        {!editing ? (
          <Button variant="outline" onClick={() => { setEditing(true); setEditForm({ name: commission.name, client: commission.client, prepaid_hours: commission.prepaid_hours, status: commission.status, report_frequency: commission.report_frequency || 'none' }); }} className="gap-2">
            <Edit2 className="w-4 h-4" /> Modifica
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-40"
              placeholder="Nome commessa"
            />
            <Input
              value={editForm.client}
              onChange={(e) => setEditForm({ ...editForm, client: e.target.value })}
              className="w-32"
              placeholder="Cliente"
            />
            <Input
              type="number"
              value={editForm.prepaid_hours}
              onChange={(e) => setEditForm({ ...editForm, prepaid_hours: Number(e.target.value) })}
              className="w-24"
              placeholder="Ore"
            />
            <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attiva</SelectItem>
                <SelectItem value="completed">Completata</SelectItem>
                <SelectItem value="on_hold">In pausa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={editForm.report_frequency} onValueChange={(v) => setEditForm({ ...editForm, report_frequency: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No report auto</SelectItem>
                <SelectItem value="weekly">Settimanale</SelectItem>
                <SelectItem value="monthly">Mensile</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" onClick={() => updateCommission.mutate(editForm)} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setEditing(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{commission.prepaid_hours}h</p>
          <p className="text-xs text-slate-500">Ore prepagate</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{(commission.used_hours || 0).toFixed(1)}h</p>
          <p className="text-xs text-slate-500">Ore utilizzate</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg ${remaining >= 0 ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center`}>
              <Clock className={`w-4 h-4 ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{remaining.toFixed(1)}h</p>
          <p className="text-xs text-slate-500">Ore rimanenti</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
          <p className="text-xs text-slate-500">Task associati</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Avanzamento ore</span>
          <span className="text-sm font-medium text-slate-700">{pct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Referenti */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" /> Referenti report
          </h2>
          <div className="flex items-center gap-2">
            {commission.report_frequency && commission.report_frequency !== 'none' && (
              <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium">
                Report auto: {commission.report_frequency === 'weekly' ? 'settimanale' : 'mensile'}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={sendReport} disabled={sendingReport || !(commission.referenti?.length)} className="gap-2">
              <Send className="w-3.5 h-3.5" /> {sendingReport ? 'Invio...' : 'Invia ora'}
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@referente.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addReferente()}
          />
          <Button onClick={addReferente} disabled={!newEmail.trim()} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {(commission.referenti || []).length === 0 ? (
          <p className="text-sm text-slate-400">Nessun referente aggiunto</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(commission.referenti || []).map(email => (
              <span key={email} className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full text-sm text-slate-700">
                {email}
                <button onClick={() => removeReferente(email)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tasks list */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Task associati</h2>
        </div>
        {tasks.length === 0 ? (
          <p className="p-5 text-sm text-slate-500 text-center">Nessun task associato a questa commessa</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {tasks.map(task => (
              <Link
                key={task.id}
                to={`/BoardDetail?id=${task.board_id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={task.status} />
                    {task.assignee_name && <span className="text-xs text-slate-500">{task.assignee_name}</span>}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-medium text-slate-700">{task.logged_hours || 0}h</p>
                  <p className="text-xs text-slate-400">su {task.estimated_hours || '—'}h stimate</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}