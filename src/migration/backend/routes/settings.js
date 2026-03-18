const { Router } = require('express');
const nodemailer = require('nodemailer');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM app_settings LIMIT 1');
    res.json(rows[0] || {});
  });

  router.put('/', async (req, res) => {
    const { logo_url, company_name, smtp_host, smtp_port, smtp_user, smtp_password,
      smtp_from_name, smtp_from_email, smtp_secure } = req.body;
    const { rows: existing } = await pool.query('SELECT id FROM app_settings LIMIT 1');
    if (existing[0]) {
      const { rows } = await pool.query(
        `UPDATE app_settings SET logo_url=$1,company_name=$2,smtp_host=$3,smtp_port=$4,
         smtp_user=$5,smtp_password=$6,smtp_from_name=$7,smtp_from_email=$8,smtp_secure=$9
         WHERE id=$10 RETURNING *`,
        [logo_url,company_name,smtp_host,smtp_port,smtp_user,smtp_password,
         smtp_from_name,smtp_from_email,smtp_secure,existing[0].id]
      );
      res.json(rows[0]);
    } else {
      const { rows } = await pool.query(
        `INSERT INTO app_settings (logo_url,company_name,smtp_host,smtp_port,smtp_user,smtp_password,smtp_from_name,smtp_from_email,smtp_secure)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [logo_url,company_name,smtp_host,smtp_port,smtp_user,smtp_password,smtp_from_name,smtp_from_email,smtp_secure]
      );
      res.json(rows[0]);
    }
  });

  // Test SMTP
  router.post('/test-smtp', async (req, res) => {
    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_secure } = req.body;
    const transporter = nodemailer.createTransport({
      host: smtp_host, port: smtp_port || 587, secure: smtp_secure || false,
      auth: { user: smtp_user, pass: smtp_password },
    });
    await transporter.verify();
    res.json({ success: true });
  });

  return router;
};