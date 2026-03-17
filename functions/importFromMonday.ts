import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const STATUS_MAP = {
  'Done': 'done',
  'Working on it': 'in_progress',
  'Stuck': 'todo',
  'Not Started': 'todo',
  'In Progress': 'in_progress',
  'Review': 'review',
  'Completed': 'done',
};

function mapStatus(mondayStatus) {
  if (!mondayStatus) return 'todo';
  return STATUS_MAP[mondayStatus] || 'todo';
}

Deno.serve(async (req) => {
  try {
    // Read body first as text so we can parse it without consuming the stream twice
    const bodyText = await req.text();
    let body = {};
    try { body = JSON.parse(bodyText); } catch (_) {}

    const { apiKey, mondayBoardId, targetBoardId } = body;

    // Create a new request with the body restored so the SDK can read auth headers
    const restoredReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
    });

    const base44 = createClientFromRequest(restoredReq);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!apiKey || !mondayBoardId || !targetBoardId) {
      return Response.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const query = `
      query {
        boards(ids: [${mondayBoardId}]) {
          columns { id title type }
          items_page(limit: 500) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;

    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({ query }),
    });

    const data = await mondayRes.json();

    if (data.errors?.length) {
      return Response.json({ error: data.errors[0].message }, { status: 400 });
    }

    const items = data?.data?.boards?.[0]?.items_page?.items;
    if (!items) {
      return Response.json({ error: 'Bacheca non trovata o API key non valida' }, { status: 400 });
    }

    if (items.length === 0) {
      return Response.json({ imported: 0 });
    }

    const tasks = items.map((item, idx) => {
      // Look for status column
      const statusCol = item.column_values.find(c =>
        c.id === 'status' ||
        c.title?.toLowerCase() === 'status' ||
        c.title?.toLowerCase() === 'stato'
      );

      // Look for description/notes column
      const descCol = item.column_values.find(c =>
        c.id === 'text' ||
        c.title?.toLowerCase() === 'notes' ||
        c.title?.toLowerCase() === 'description' ||
        c.title?.toLowerCase() === 'descrizione'
      );

      // Look for person column (assignee)
      const personCol = item.column_values.find(c =>
        c.id === 'person' ||
        c.title?.toLowerCase() === 'person' ||
        c.title?.toLowerCase() === 'owner' ||
        c.title?.toLowerCase() === 'assegnato'
      );

      return {
        title: item.name,
        board_id: targetBoardId,
        status: mapStatus(statusCol?.text),
        description: descCol?.text || '',
        assignee_name: personCol?.text || '',
        position: idx,
      };
    });

    await base44.asServiceRole.entities.Task.bulkCreate(tasks);

    return Response.json({ imported: tasks.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});