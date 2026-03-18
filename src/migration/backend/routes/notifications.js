const { Router } = require('express');

module.exports = (pool) => {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE user_email=$1 ORDER BY created_date DESC LIMIT 50',
      [req.user.email]
    );
    res.json(rows);
  });

  router.post('/', async (req, res) => {
    const { user_email, type, title, message, board_id, task_id } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO notifications (user_email,type,title,message,board_id,task_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [user_email, type, title, message, board_id || null, task_id || null, req.user.email]
    );
    res.json(rows[0]);
  });

  router.patch('/:id/read', async (req, res) => {
    await pool.query('UPDATE notifications SET read=TRUE WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  });

  router.patch('/read-all', async (req, res) => {
    await pool.query('UPDATE notifications SET read=TRUE WHERE user_email=$1', [req.user.email]);
    res.json({ success: true });
  });

  return router;
};