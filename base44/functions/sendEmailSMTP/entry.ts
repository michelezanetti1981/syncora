import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import nodemailer from 'npm:nodemailer@6.9.9';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { to, subject, body } = await req.json();

  // Load SMTP settings from AppSettings entity
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const cfg = settings[0];

  if (!cfg?.smtp_host || !cfg?.smtp_user || !cfg?.smtp_password) {
    return Response.json({ error: 'SMTP non configurato nelle impostazioni' }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: cfg.smtp_port || 587,
    secure: cfg.smtp_secure || false,
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_password,
    },
  });

  const fromName = cfg.smtp_from_name || cfg.company_name || 'WorkBoard';
  const fromEmail = cfg.smtp_from_email || cfg.smtp_user;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: body,
  });

  return Response.json({ sent: true });
});