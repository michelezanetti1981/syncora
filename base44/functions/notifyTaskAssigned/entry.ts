import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data?.assignee_email) return Response.json({ ok: true });

    // Only notify if assignee changed (or newly set)
    const oldAssignee = old_data?.assignee_email;
    const newAssignee = data.assignee_email;
    if (oldAssignee === newAssignee) return Response.json({ ok: true });

    await base44.asServiceRole.entities.Notification.create({
      user_email: newAssignee,
      type: 'task_assigned',
      title: 'Nuovo task assegnato',
      message: `Sei stato assegnato al task: "${data.title}"`,
      read: false,
      board_id: data.board_id,
      task_id: data.id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});