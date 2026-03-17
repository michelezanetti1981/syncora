import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const fieldTypes = ['text', 'number', 'date', 'select', 'checkbox'];

export default function CustomFieldsManager({ boardId, open, onOpenChange }) {
  const qc = useQueryClient();
  const [newField, setNewField] = useState({ label: '', key: '', type: 'text', options: [] });
  const [optionInput, setOptionInput] = useState('');

  const { data: customFields = [] } = useQuery({
    queryKey: ['custom-fields', boardId],
    queryFn: () => base44.entities.CustomField.filter({ board_id: boardId }),
    enabled: !!boardId,
  });

  const createField = useMutation({
    mutationFn: (data) => base44.entities.CustomField.create({
      board_id: boardId,
      ...data,
      position: customFields.length,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-fields', boardId] });
      setNewField({ label: '', key: '', type: 'text', options: [] });
      setOptionInput('');
    },
  });

  const deleteField = useMutation({
    mutationFn: (id) => base44.entities.CustomField.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-fields', boardId] }),
  });

  const handleCreateField = () => {
    if (!newField.label || !newField.key) return;
    createField.mutate({
      label: newField.label,
      key: newField.key,
      type: newField.type,
      options: newField.type === 'select' ? newField.options : [],
    });
  };

  const addOption = () => {
    if (optionInput.trim()) {
      setNewField(f => ({
        ...f,
        options: [...f.options, optionInput.trim()],
      }));
      setOptionInput('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestisci campi personalizzati</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo input per nuovo field */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Input
              placeholder="Nome campo"
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
            />
            <Input
              placeholder="Chiave univoca (es: custom_color)"
              value={newField.key}
              onChange={(e) => setNewField({ ...newField, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            />
            <Select value={newField.type} onValueChange={(v) => setNewField({ ...newField, type: v, options: [] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {fieldTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {newField.type === 'select' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Aggiungi opzione"
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOption()}
                  />
                  <Button onClick={addOption} variant="outline" size="sm">Aggiungi</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newField.options.map((opt, idx) => (
                    <span key={idx} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {opt}
                      <button onClick={() => setNewField(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))} className="ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleCreateField} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!newField.label || !newField.key || createField.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Crea campo
            </Button>
          </div>

          {/* Lista campi existenti */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">Campi creati</h3>
            {customFields.length === 0 ? (
              <p className="text-xs text-slate-400">Nessun campo personalizzato ancora</p>
            ) : (
              customFields.map(field => (
                <div key={field.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{field.label}</p>
                    <p className="text-xs text-slate-400">{field.type}</p>
                  </div>
                  <button
                    onClick={() => deleteField.mutate(field.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}