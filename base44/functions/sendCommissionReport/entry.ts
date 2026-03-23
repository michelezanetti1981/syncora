import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Accept both manual calls (with commissionId) and automated calls (all active with report_frequency)
  let payload = {};
  try { payload = await req.json(); } catch (_) {}

  const { commissionId, frequency } = payload;

  let commissions = [];
  if (commissionId) {
    const results = await base44.asServiceRole.entities.Commission.filter({ id: commissionId });
    commissions = results;
  } else {
    // Called by automation: send to all active commissions matching the frequency
    const all = await base44.asServiceRole.entities.Commission.filter({ status: 'active' });
    commissions = frequency ? all.filter(c => c.report_frequency === frequency) : all;
  }

  let sent = 0;
  for (const commission of commissions) {
    const referenti = commission.referenti || [];
    if (!referenti.length) continue;

    const tasks = await base44.asServiceRole.entities.Task.filter({ commission_id: commission.id });
    const remaining = (commission.prepaid_hours || 0) - (commission.used_hours || 0);
    const pct = commission.prepaid_hours ? ((commission.used_hours || 0) / commission.prepaid_hours * 100).toFixed(1) : 0;

    const taskRows = tasks.map(t => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:8px 12px;color:#334155;">${t.title}</td>
        <td style="padding:8px 12px;color:#64748b;">${t.status}</td>
        <td style="padding:8px 12px;color:#64748b;">${t.assignee_name || '—'}</td>
        <td style="padding:8px 12px;color:#64748b;text-align:right;">${t.logged_hours || 0}h</td>
      </tr>`).join('');

    const body = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
        <div style="background:#4f46e5;color:white;padding:24px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;font-size:20px;">Report commessa: ${commission.name}</h1>
          <p style="margin:4px 0 0;opacity:0.8;font-size:14px;">Cliente: ${commission.client}</p>
        </div>
        <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
            <div style="background:#f8fafc;border-radius:8px;padding:16px;">
              <p style="margin:0;font-size:24px;font-weight:700;">${commission.prepaid_hours}h</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Ore prepagate</p>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:16px;">
              <p style="margin:0;font-size:24px;font-weight:700;">${(commission.used_hours || 0).toFixed(1)}h</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Ore utilizzate (${pct}%)</p>
            </div>
            <div style="background:${remaining < 0 ? '#fef2f2' : '#f0fdf4'};border-radius:8px;padding:16px;">
              <p style="margin:0;font-size:24px;font-weight:700;color:${remaining < 0 ? '#dc2626' : '#16a34a'};">${remaining.toFixed(1)}h</p>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Ore rimanenti</p>
            </div>
          </div>
          <h3 style="margin:0 0 12px;font-size:14px;color:#475569;">Task associati (${tasks.length})</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:500;">Task</th>
                <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:500;">Stato</th>
                <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:500;">Assegnato</th>
                <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:500;">Ore</th>
              </tr>
            </thead>
            <tbody>${taskRows}</tbody>
          </table>
        </div>
      </div>`;

    for (const email of referenti) {
      await base44.asServiceRole.functions.invoke('sendEmailSMTP', {
        to: email,
        subject: `Report commessa: ${commission.name} — ${commission.client}`,
        body,
      });
      sent++;
    }
  }

  return Response.json({ sent });
});