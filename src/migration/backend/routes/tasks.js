const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { board_id, assignee_email, status, commission_id } = req.query;
    let q = 'SELECT * FROM tasks WHERE 1=1';
    const vals = [];
    if (board_id)       { vals.push(board_id);       q += ` AND board_id=$${vals.length}`; }
    if (assignee_email) { vals.push(assignee_email); q += ` AND assignee_email=$${vals.length}`; }
    if (status)         { vals.push(status);         q += ` AND status=$${vals.length}`; }
    if (commission_id)  { vals.push(commission_id);  q += ` AND commission_id=$${vals.length}`; }
    q += ' ORDER BY created_date DESC';
    const { rows } = await pool.query(q, vals);
    res.json(rows);
  });

  router.get('/:id', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  });

  router.post('/', async (req, res) => {
    const { title, description, board_id, commission_id, assignee_email, assignee_name,
      status, priority, deadline, estimated_hours, group_name, custom_fields } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tasks (title,description,board_id,commission_id,assignee_email,assignee_name,
        status,priority,deadline,estimated_hours,group_name,custom_fields,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [title,description,board_id,commission_id||null,assignee_email,assignee_name,
       status||'todo',priority||'medium',deadline||null,estimated_hours||null,
       group_name||'Generale',JSON.stringify(custom_fields||{}),req.user.email]
    );
    res.json(rows[0]);
  });

  router.patch('/:id', async (req, res) => {
    const fields = ['title','description','commission_id','assignee_email','assignee_name',
      'status','priority','deadline','estimated_hours','logged_hours','file_urls','file_names',
      'group_name','position','custom_fields'];
    const updates = fields.filter(f => req.body[f] !== undefined);
    if (!updates.length) return res.json({});
    const set = updates.map((f, i) => `${f}=$${i + 2}`).join(',');
    const vals = updates.map(f => {
      const v = req.body[f];
      return f === 'custom_fields' ? JSON.stringify(v) : v;
    });
    const { rows } = await pool.query(`UPDATE tasks SET ${set} WHERE id=$1 RETURNING *`, [req.params.id, ...vals]);
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};