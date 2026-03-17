import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Briefcase, Trash2, Download } from 'lucide-react';
import { exportCommissionsToExcel } from '@/utils/exportExcel';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/shared/EmptyState';

const statusLabels = { active: 'Attiva', completed: 'Completata', on_hold: 'In pausa' };
const statusColors = { active: 'bg-emerald-100 text-emerald-700', completed: 'bg-slate-100 text-slate-600', on_hold: 'bg-amber-100 text-amber-700' };

export default function Commissions() {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: '', client: '', description: '', prepaid_hours: '', start_date: '', end_date: '', status: 'active' });
  const qc = useQueryClient();

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.list('-created_date'),
  });

  const createCommission = useMutation({
    mutationFn: (data) => base44.entities.Commission.create({ ...data, prepaid_hours: Number(data.prepaid_hours), used_hours: 0 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] });
      setShowDialog(false);
      setForm({ name: '', client: '', description: '', prepaid_hours: '', start_date: '', end_date: '', status: 'active' });
    },
  });

  const deleteCommission = useMutation({
    mutationFn: (id) => base44.entities.Commission.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commesse</h1>
          <p className="text-sm text-slate-500 mt-1">Gestisci le commesse e le ore prepagate</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          <Plus className="w-4 h-4" /> Nuova commessa
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />)}
        </div>
      ) : commissions.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nessuna commessa"
          description="Crea la tua prima commessa per tracciare le ore prepagate"
          action={<Button onClick={() => setShowDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="w-4 h-4" /> Crea commessa</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commissions.map((c) => {
            const remaining = (c.prepaid_hours || 0) - (c.used_hours || 0);
            const pct = c.prepaid_hours ? ((c.used_hours || 0) / c.prepaid_hours) * 100 : 0;
            return (
              <Link key={c.id} to={`/CommissionDetail?id=${c.id}`} className="group bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                    <p className="text-sm text-slate-500">{c.client}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteCommission.mutate(c.id); }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Ore utilizzate</span>
                    <span className="font-medium text-slate-700">{(c.used_hours || 0).toFixed(1)} / {c.prepaid_hours}h</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs font-medium ${remaining < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {remaining >= 0 ? `${remaining.toFixed(1)}h rimanenti` : `${Math.abs(remaining).toFixed(1)}h in eccesso`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova commessa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome commessa *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome della commessa" />
            </div>
            <div>
              <Label>Cliente *</Label>
              <Input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Nome del cliente" />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrizione..." rows={2} />
            </div>
            <div>
              <Label>Ore prepagate *</Label>
              <Input type="number" min="1" value={form.prepaid_hours} onChange={(e) => setForm({ ...form, prepaid_hours: e.target.value })} placeholder="100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data inizio</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Data fine</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <Button
              onClick={() => createCommission.mutate(form)}
              disabled={!form.name || !form.client || !form.prepaid_hours || createCommission.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {createCommission.isPending ? 'Creazione...' : 'Crea commessa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}