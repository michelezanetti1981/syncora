const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { task_id } = req.query;
    const q = task_id
      ? 'SELECT * FROM comments WHERE task_id=$1 ORDER BY created_date DESC'
      : 'SELECT * FROM comments ORDER BY created_date DESC';
    const { rows } = await pool.query(q, task_id ? [task_id] : []);
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { task_id, content, author_email, author_name, file_urls } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO comments (task_id,content,author_email,author_name,file_urls,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [task_id, content, author_email || req.user.email, author_name || req.user.full_name, file_urls || [], req.user.email]
    );
    res.json(rows[0]);
  });

  router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM comments WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  return router;
};