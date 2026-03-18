const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { board_id } = req.query;
    const q = board_id
      ? 'SELECT * FROM custom_fields WHERE board_id=$1 ORDER BY position ASC'
      : 'SELECT * FROM custom_fields ORDER BY position ASC';
    const { rows } = await pool.query(q, board_id ? [board_id] : []);
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { board_id, label, key, type, options, position } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO custom_fields (board_id,label,key,type,options,position,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [board_id, label, key, type || 'text', options || [], position || 0, req.user.email]
    );
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM custom_fields WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};