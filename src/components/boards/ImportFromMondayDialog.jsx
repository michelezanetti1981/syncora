import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';

export default function ImportFromMondayDialog({ open, onOpenChange, targetBoardId, onSuccess }) {
  const [apiKey, setApiKey] = useState('');
  const [mondayBoardId, setMondayBoardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await base44.functions.invoke('importFromMonday', { apiKey, mondayBoardId, targetBoardId });
    setLoading(false);
    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setResult(res.data?.imported);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-500" /> Importa da Monday.com
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>API Token Monday.com</Label>
            <Input
              type="password"
              placeholder="eyJhbGci..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>ID Bacheca Monday</Label>
            <Input
              placeholder="es. 1234567890"
              value={mondayBoardId}
              onChange={e => setMondayBoardId(e.target.value)}
            />
            <p className="text-xs text-slate-500">Trovi l'ID nella URL di Monday: monday.com/boards/<strong>ID</strong></p>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {result != null && (
            <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              ✓ Importati {result} task con successo!
            </p>
          )}

          <Button
            onClick={handleImport}
            disabled={!apiKey || !mondayBoardId || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? 'Importazione...' : 'Importa task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}