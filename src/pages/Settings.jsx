import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Image, Mail, Save, Upload } from 'lucide-react';

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    company_name: '', logo_url: '',
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '',
    smtp_from_name: '', smtp_from_email: '', smtp_secure: false,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const { data: settings = [] } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const existingSettings = settings[0];

  useEffect(() => {
    if (existingSettings) {
      setForm({
        company_name: existingSettings.company_name || '',
        logo_url: existingSettings.logo_url || '',
        smtp_host: existingSettings.smtp_host || '',
        smtp_port: existingSettings.smtp_port || 587,
        smtp_user: existingSettings.smtp_user || '',
        smtp_password: existingSettings.smtp_password || '',
        smtp_from_name: existingSettings.smtp_from_name || '',
        smtp_from_email: existingSettings.smtp_from_email || '',
        smtp_secure: existingSettings.smtp_secure || false,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingSettings) {
        return base44.entities.AppSettings.update(existingSettings.id, data);
      } else {
        return base44.entities.AppSettings.create(data);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-settings'] }),
  });

  const handleLogoUpload = async (file) => {
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, logo_url: file_url }));
    setUploadingLogo(false);
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setTestResult(null);
    const user = await base44.auth.me();
    const res = await base44.functions.invoke('sendEmailSMTP', {
      to: user.email,
      subject: 'Test SMTP — WorkBoard',
      body: '<p>Questo è un messaggio di test per verificare la configurazione SMTP.</p>',
    });
    if (res.data?.sent) {
      setTestResult({ ok: true, msg: `Email di test inviata a ${user.email}` });
    } else {
      setTestResult({ ok: false, msg: res.data?.error || 'Errore invio' });
    }
    setTestingSmtp(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6" /> Impostazioni
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configura il logo e le impostazioni email dell'app</p>
      </div>

      {/* Generale */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Image className="w-4 h-4 text-indigo-500" /> Generale
        </h2>
        <div>
          <Label>Nome azienda</Label>
          <Input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Es. Acme Srl" className="mt-1" />
        </div>
        <div>
          <Label>Logo</Label>
          <div className="mt-1 flex items-center gap-4">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-14 w-auto rounded-lg border border-slate-200 object-contain" />
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0])} />
              <span className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <Upload className="w-4 h-4" /> {uploadingLogo ? 'Caricamento...' : 'Carica logo'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-500" /> Configurazione SMTP
        </h2>
        <p className="text-xs text-slate-500">Usato per inviare email ai referenti delle commesse.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Host SMTP</Label>
            <Input value={form.smtp_host} onChange={e => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.esempio.com" className="mt-1" />
          </div>
          <div>
            <Label>Porta</Label>
            <Input type="number" value={form.smtp_port} onChange={e => setForm({ ...form, smtp_port: Number(e.target.value) })} placeholder="587" className="mt-1" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={form.smtp_user} onChange={e => setForm({ ...form, smtp_user: e.target.value })} placeholder="user@esempio.com" className="mt-1" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.smtp_password} onChange={e => setForm({ ...form, smtp_password: e.target.value })} placeholder="••••••••" className="mt-1" />
          </div>
          <div>
            <Label>Nome mittente</Label>
            <Input value={form.smtp_from_name} onChange={e => setForm({ ...form, smtp_from_name: e.target.value })} placeholder="WorkBoard" className="mt-1" />
          </div>
          <div>
            <Label>Email mittente</Label>
            <Input value={form.smtp_from_email} onChange={e => setForm({ ...form, smtp_from_email: e.target.value })} placeholder="noreply@esempio.com" className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={form.smtp_secure} onCheckedChange={v => setForm({ ...form, smtp_secure: v })} />
          <Label>Usa SSL/TLS (porta 465)</Label>
        </div>

        {testResult && (
          <div className={`text-sm px-4 py-2 rounded-lg ${testResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {testResult.msg}
          </div>
        )}

        <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp || !form.smtp_host} className="gap-2">
          <Mail className="w-4 h-4" /> {testingSmtp ? 'Invio test...' : 'Invia email di test'}
        </Button>
      </div>

      <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
        <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Salvataggio...' : 'Salva impostazioni'}
      </Button>
    </div>
  );
}