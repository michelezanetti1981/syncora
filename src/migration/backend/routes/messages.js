const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { board_id } = req.query;
    if (!board_id) return res.status(400).json({ error: 'board_id required' });
    const { rows } = await pool.query(
      'SELECT * FROM project_messages WHERE board_id=$1 ORDER BY created_date ASC LIMIT 200',
      [board_id]
    );
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { board_id, content, author_email, author_name } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO project_messages (board_id,content,author_email,author_name,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [board_id, content, author_email || req.user.email, author_name || req.user.full_name, req.user.email]
    );
    res.json(rows[0]);
  });

  return router;
};