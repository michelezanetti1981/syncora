import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { mentionedEmails, commentContent, taskTitle, authorName } = await req.json();

  if (!mentionedEmails?.length) return Response.json({ sent: 0 });

  const results = await Promise.allSettled(
    mentionedEmails.map(email =>
      base44.integrations.Core.SendEmail({
        to: email,
        subject: `${authorName} ti ha menzionato in un commento`,
        body: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#4f46e5;">Sei stato menzionato!</h2>
            <p><strong>${authorName}</strong> ti ha menzionato in un commento sul task:</p>
            <div style="background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:12px 0;">
              <p style="margin:0;font-weight:600;color:#1e293b;">${taskTitle}</p>
            </div>
            <div style="background:#f8fafc;border-left:3px solid #4f46e5;padding:12px 16px;border-radius:0 8px 8px 0;">
              <p style="margin:0;color:#334155;">${commentContent}</p>
            </div>
          </div>
        `,
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return Response.json({ sent });
});