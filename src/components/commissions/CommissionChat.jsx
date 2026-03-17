import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function BoardChat({ boardId }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: messages = [] } = useQuery({
    queryKey: ['board-messages', boardId],
    queryFn: () => base44.entities.ProjectMessage.filter({ board_id: boardId }, 'created_date', 200),
    enabled: !!boardId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    await base44.entities.ProjectMessage.create({
      board_id: boardId,
      content: text.trim(),
      author_email: currentUser?.email,
      author_name: currentUser?.full_name || currentUser?.email,
    });
    setText('');
    qc.invalidateQueries({ queryKey: ['board-messages', boardId] });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm flex flex-col" style={{ height: '420px' }}>
      <div className="p-5 border-b border-slate-100 flex-shrink-0">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Chat progetto
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center pt-8">Nessun messaggio ancora. Inizia la conversazione!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author_email === currentUser?.email;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-indigo-600">
                  {(msg.author_name || msg.author_email || '?').charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {!isMe && <p className="text-xs font-medium mb-0.5 text-indigo-600">{msg.author_name || msg.author_email}</p>}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-xs text-slate-400 px-1">
                    {msg.created_date ? format(new Date(msg.created_date), 'd MMM HH:mm', { locale: it }) : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-slate-100 flex-shrink-0 flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio... (Invio per inviare)"
          rows={2}
          className="resize-none text-sm"
        />
        <Button onClick={sendMessage} disabled={!text.trim() || sending} className="bg-indigo-600 hover:bg-indigo-700 self-end" size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}