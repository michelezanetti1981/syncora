import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data } = body;

    if (!data?.board_id || !data?.content) return Response.json({ ok: true });

    // Get all board members
    const members = await base44.asServiceRole.entities.BoardMember.filter({ board_id: data.board_id });

    // Get board info
    const boards = await base44.asServiceRole.entities.Board.filter({ id: data.board_id });
    const boardName = boards[0]?.name || 'Progetto';

    const senderEmail = data.author_email;
    const senderName = data.author_name || senderEmail;

    const notifications = members
      .filter(m => m.user_email !== senderEmail)
      .map(m => ({
        user_email: m.user_email,
        type: 'chat_message',
        title: `Nuovo messaggio in "${boardName}"`,
        message: `${senderName}: ${data.content.substring(0, 80)}${data.content.length > 80 ? '...' : ''}`,
        read: false,
        board_id: data.board_id,
      }));

    for (const n of notifications) {
      await base44.asServiceRole.entities.Notification.create(n);
    }

    return Response.json({ ok: true, count: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});