import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function CommentInput({ onSubmit, boardMembers = [], allUsers = [] }) {
  const [value, setValue] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);

  // Combine board members + all users into one deduplicated list
  const mentionableUsers = React.useMemo(() => {
    const map = new Map();
    boardMembers.forEach(m => map.set(m.user_email, { email: m.user_email, name: m.user_name || m.user_email }));
    allUsers.forEach(u => map.set(u.email, { email: u.email, name: u.full_name || u.email }));
    return Array.from(map.values());
  }, [boardMembers, allUsers]);

  const suggestions = mentionableUsers.filter(u =>
    mentionQuery === '' ||
    u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 6);

  const handleChange = (e) => {
    const text = e.target.value;
    setValue(text);
    const cursor = e.target.selectionStart;

    // Find @ before cursor
    const lastAt = text.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(text[lastAt - 1]))) {
      const query = text.slice(lastAt + 1, cursor);
      if (!query.includes(' ')) {
        setMentionStart(lastAt);
        setMentionQuery(query);
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertMention = (user) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current.selectionStart);
    const newValue = `${before}@${user.name} ${after}`;
    setValue(newValue);
    setShowSuggestions(false);
    setTimeout(() => {
      const pos = mentionStart + user.name.length + 2;
      textareaRef.current.setSelectionRange(pos, pos);
      textareaRef.current.focus();
    }, 0);
  };

  const extractMentionedEmails = (text) => {
    const mentioned = [];
    const parts = text.split(/\s+/);
    parts.forEach(part => {
      if (part.startsWith('@')) {
        const name = part.slice(1).replace(/[.,!?]$/, '');
        const user = mentionableUsers.find(u => u.name === name || u.email === name);
        if (user) mentioned.push(user.email);
      }
    });
    return [...new Set(mentioned)];
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    const mentionedEmails = extractMentionedEmails(value);
    onSubmit(value, mentionedEmails);
    setValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un commento... usa @ per menzionare qualcuno"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {suggestions.map(u => (
                <button
                  key={u.email}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-indigo-600">{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}