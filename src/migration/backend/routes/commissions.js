const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { status } = req.query;
    const q = status
      ? 'SELECT * FROM commissions WHERE status=$1 ORDER BY created_date DESC'
      : 'SELECT * FROM commissions ORDER BY created_date DESC';
    const { rows } = await pool.query(q, status ? [status] : []);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM commissions WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const { name, client, description, prepaid_hours, status, start_date, end_date,
      referenti, report_frequency, allowed_user_emails } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO commissions (name,client,description,prepaid_hours,status,start_date,end_date,
        referenti,report_frequency,allowed_user_emails,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name,client,description,prepaid_hours,status||'active',start_date||null,end_date||null,
       referenti||[],report_frequency||'none',allowed_user_emails||[],req.user.email]
    );
    res.json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const fields = ['name','client','description','prepaid_hours','used_hours','status',
      'start_date','end_date','referenti','report_frequency','allowed_user_emails'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.json({});
    const set = updates.map((f, i) => `${f}=$${i + 2}`).join(',');
    const vals = updates.map(f => req.body[f]);
    const { rows } = await pool.query(`UPDATE commissions SET ${set} WHERE id=$1 RETURNING *`, [req.params.id, ...vals]);
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM commissions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};