const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { board_id, user_email } = req.query;
    let q = 'SELECT * FROM board_members WHERE 1=1';
    const vals = [];
    if (board_id)   { vals.push(board_id);   q += ` AND board_id=$${vals.length}`; }
    if (user_email) { vals.push(user_email); q += ` AND user_email=$${vals.length}`; }
    const { rows } = await pool.query(q, vals);
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { board_id, user_email, user_name, role } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO board_members (board_id,user_email,user_name,role) VALUES ($1,$2,$3,$4) ON CONFLICT (board_id,user_email) DO NOTHING RETURNING *',
      [board_id, user_email, user_name, role || 'member']
    );
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM board_members WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};