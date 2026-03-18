const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_date DESC');
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { name, description, client, status, project_manager_email, project_manager_name,
      responsible_email, responsible_name, start_date, end_date, color, allowed_user_emails } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO projects (name,description,client,status,project_manager_email,project_manager_name,
        responsible_email,responsible_name,start_date,end_date,color,allowed_user_emails,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name,description,client,status,project_manager_email,project_manager_name,
       responsible_email,responsible_name,start_date,end_date,color,allowed_user_emails,req.user.email]
    );
    res.json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const fields = ['name','description','client','status','project_manager_email','project_manager_name',
      'responsible_email','responsible_name','start_date','end_date','color','allowed_user_emails'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.json({});
    const set = updates.map((f, i) => `${f}=$${i + 2}`).join(',');
    const vals = updates.map(f => req.body[f]);
    const { rows } = await pool.query(`UPDATE projects SET ${set} WHERE id=$1 RETURNING *`, [req.params.id, ...vals]);
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};