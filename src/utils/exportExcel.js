import * as XLSX from 'xlsx';

export function exportTasksToExcel(tasks, filename = 'tasks') {
  const rows = tasks.map(t => ({
    'Titolo': t.title || '',
    'Descrizione': t.description || '',
    'Stato': ({ backlog: 'Backlog', todo: 'Da fare', in_progress: 'In corso', review: 'Revisione', done: 'Completato' })[t.status] || t.status,
    'Priorità': ({ low: 'Bassa', medium: 'Media', high: 'Alta', urgent: 'Urgente' })[t.priority] || t.priority,
    'Assegnato a': t.assignee_name || '',
    'Deadline': t.deadline || '',
    'Ore stimate': t.estimated_hours || 0,
    'Ore registrate': t.logged_hours || 0,
    'Gruppo': t.group_name || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Task');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportCommissionsToExcel(commissions) {
  const rows = commissions.map(c => ({
    'Nome': c.name || '',
    'Cliente': c.client || '',
    'Stato': ({ active: 'Attiva', completed: 'Completata', on_hold: 'In pausa' })[c.status] || c.status,
    'Ore prepagate': c.prepaid_hours || 0,
    'Ore utilizzate': c.used_hours || 0,
    'Ore rimanenti': (c.prepaid_hours || 0) - (c.used_hours || 0),
    'Data inizio': c.start_date || '',
    'Data fine': c.end_date || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Commesse');
  XLSX.writeFile(wb, 'commesse.xlsx');
}