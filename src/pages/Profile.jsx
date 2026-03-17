import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Upload, User } from 'lucide-react';

export default function Profile() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: '', avatar_url: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  useEffect(() => {
    if (currentUser) {
      setForm({
        full_name: currentUser.full_name || '',
        avatar_url: currentUser.avatar_url || '',
      });
    }
  }, [currentUser]);

  const handleAvatarUpload = async (file) => {
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, avatar_url: file_url }));
    setUploadingAvatar(false);
  };

  const handleSave = async () => {
    await base44.auth.updateMe({ full_name: form.full_name, avatar_url: form.avatar_url });
    qc.invalidateQueries({ queryKey: ['me'] });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="w-6 h-6" /> Profilo
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gestisci le tue informazioni personali</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-600">
                {(form.full_name || currentUser?.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleAvatarUpload(e.target.files[0])} />
              <span className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4" /> {uploadingAvatar ? 'Caricamento...' : 'Cambia foto'}
              </span>
            </label>
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG o GIF. Max 5MB.</p>
          </div>
        </div>

        {/* Nome */}
        <div>
          <Label>Nome completo</Label>
          <Input
            value={form.full_name}
            onChange={e => setForm({ ...form, full_name: e.target.value })}
            placeholder="Mario Rossi"
            className="mt-1"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <Label>Email</Label>
          <Input value={currentUser?.email || ''} disabled className="mt-1 bg-slate-50 text-slate-400" />
        </div>

        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 gap-2 w-full">
          <Save className="w-4 h-4" /> {saved ? 'Salvato!' : 'Salva modifiche'}
        </Button>
      </div>
    </div>
  );
}