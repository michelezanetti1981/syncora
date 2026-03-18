const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { status, project_id } = req.query;
    let q = 'SELECT * FROM boards WHERE 1=1';
    const vals = [];
    if (status) { vals.push(status); q += ` AND status=$${vals.length}`; }
    if (project_id) { vals.push(project_id); q += ` AND project_id=$${vals.length}`; }
    q += ' ORDER BY created_date DESC';
    const { rows } = await pool.query(q, vals);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM boards WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const { name, description, color, project_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO boards (name,description,color,project_id,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, description, color, project_id || null, req.user.email]
    );
    res.json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const fields = ['name','description','color','status','project_id'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.json({});
    const set = updates.map((f, i) => `${f}=$${i + 2}`).join(',');
    const vals = updates.map(f => req.body[f]);
    const { rows } = await pool.query(`UPDATE boards SET ${set} WHERE id=$1 RETURNING *`, [req.params.id, ...vals]);
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM boards WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};