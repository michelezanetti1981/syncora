import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STATUS_MAP = {
  'Done': 'done',
  'Working on it': 'in_progress',
  'Stuck': 'todo',
  'Not Started': 'todo',
  "In Progress": 'in_progress',
  'Review': 'review',
  'Completed': 'done',
};

function mapStatus(mondayStatus) {
  if (!mondayStatus) return 'todo';
  return STATUS_MAP[mondayStatus] || 'todo';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { apiKey, mondayBoardId, targetBoardId } = await req.json();

    if (!apiKey || !mondayBoardId || !targetBoardId) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const query = `
      query {
        boards(ids: [${mondayBoardId}]) {
          items_page(limit: 200) {
            items {
              id
              name
              column_values {
                id
                title
                text
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (data.errors) {
      return Response.json({ error: data.errors[0].message }, { status: 400 });
    }

    const items = data?.data?.boards?.[0]?.items_page?.items || [];

    const tasks = items.map((item, idx) => {
      const statusCol = item.column_values.find(c => c.id === 'status' || c.title?.toLowerCase() === 'status' || c.title?.toLowerCase() === 'stato');
      return {
        title: item.name,
        board_id: targetBoardId,
        status: mapStatus(statusCol?.text),
        position: idx,
      };
    });

    await base44.asServiceRole.entities.Task.bulkCreate(tasks);

    return Response.json({ imported: tasks.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});