import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge';
import { Clock, Paperclip, MessageSquare, Trash2, Upload, User } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import CommentInput from './CommentInput';

export default function TaskDetailPanel({ open, onClose, task, onEdit, boardMembers = [] }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [logHours, setLogHours] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', task?.id],
    queryFn: () => base44.entities.Comment.filter({ task_id: task.id }, '-created_date'),
    enabled: !!task?.id,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.Commission.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const addComment = useMutation({
    mutationFn: async ({ content, mentionedEmails }) => {
      const user = await base44.auth.me();
      await base44.entities.Comment.create({
        task_id: task.id,
        content,
        author_email: user.email,
        author_name: user.full_name || user.email,
      });
      // Send mention notifications
      if (mentionedEmails?.length) {
        await base44.functions.invoke('sendMentionNotification', {
          mentionedEmails,
          commentContent: content,
          taskTitle: task.title,
          authorName: user.full_name || user.email,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments', task.id] }); },
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', task.id] }),
  });

  const logTimeMutation = useMutation({
    mutationFn: async (hours) => {
      const h = parseFloat(hours);
      const newLogged = (task.logged_hours || 0) + h;
      await base44.entities.Task.update(task.id, { logged_hours: newLogged });
      // Update commission used_hours
      if (task.commission_id) {
        const comm = commissions.find(c => c.id === task.commission_id);
        if (comm) {
          await base44.entities.Commission.update(comm.id, {
            used_hours: (comm.used_hours || 0) + h,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      setLogHours('');
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Task.update(task.id, {
        file_urls: [...(task.file_urls || []), file_url],
        file_names: [...(task.file_names || []), file.name],
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const removeFile = useMutation({
    mutationFn: async (index) => {
      const newUrls = [...(task.file_urls || [])];
      const newNames = [...(task.file_names || [])];
      newUrls.splice(index, 1);
      newNames.splice(index, 1);
      await base44.entities.Task.update(task.id, { file_urls: newUrls, file_names: newNames });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  if (!task) return null;

  const commission = commissions.find(c => c.id === task.commission_id);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left pr-6">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.assignee_name && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600">
                <User className="w-3 h-3" /> {task.assignee_name}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Descrizione</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Time tracking */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Clock className="w-4 h-4" /> Tempo
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900">{task.estimated_hours || '—'}</p>
                <p className="text-xs text-slate-500">Stimato</p>
              </div>
              <div>
                <p className="text-lg font-bold text-indigo-600">{task.logged_hours || 0}</p>
                <p className="text-xs text-slate-500">Registrato</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {task.estimated_hours ? Math.max(0, task.estimated_hours - (task.logged_hours || 0)).toFixed(1) : '—'}
                </p>
                <p className="text-xs text-slate-500">Rimanente</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0.25"
                step="0.25"
                placeholder="Ore"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => logTimeMutation.mutate(logHours)}
                disabled={!logHours || logTimeMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Registra
              </Button>
            </div>
          </div>

          {/* Commission info */}
          {commission && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-xs font-medium text-indigo-600 mb-1">Commessa</p>
              <p className="text-sm font-semibold text-slate-800">{commission.name}</p>
              <p className="text-xs text-slate-500">{commission.client} — {((commission.prepaid_hours || 0) - (commission.used_hours || 0)).toFixed(1)}h rimanenti</p>
            </div>
          )}

          {/* Deadline */}
          {task.deadline && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Deadline</p>
              <p className="text-sm text-slate-700">{format(new Date(task.deadline), 'd MMMM yyyy', { locale: it })}</p>
            </div>
          )}

          {/* Files */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Allegati ({(task.file_urls || []).length})
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && uploadFile.mutate(e.target.files[0])}
                />
                <span className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  <Upload className="w-3 h-3" /> Carica
                </span>
              </label>
            </div>
            {(task.file_urls || []).map((url, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-lg mb-1">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 truncate flex-1">
                  {(task.file_names || [])[i] || `File ${i + 1}`}
                </a>
                <button onClick={() => removeFile.mutate(i)} className="text-slate-400 hover:text-red-500 ml-2">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mb-3">
              <MessageSquare className="w-3 h-3" /> Commenti ({comments.length})
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
              {comments.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-700">{c.author_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400">
                        {format(new Date(c.created_date), 'd MMM HH:mm', { locale: it })}
                      </p>
                      <button onClick={() => deleteComment.mutate(c.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Scrivi un commento..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={() => addComment.mutate(comment)}
                disabled={!comment.trim() || addComment.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={() => { onClose(); onEdit(task); }} className="w-full">
            Modifica task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}