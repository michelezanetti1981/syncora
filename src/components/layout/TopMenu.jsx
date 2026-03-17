import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, ListTodo, Settings, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TopMenu({ direction = 'down' }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const menuItems = [
    { label: 'Dashboard', path: '/Dashboard', icon: LayoutDashboard },
    { label: 'Il mio lavoro', path: '/MyWork', icon: ListTodo },
  ];

  if (currentUser?.role === 'admin') {
    menuItems.push({ label: 'Impostazioni', path: '/Settings', icon: Settings });
  }

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium">Menu</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="fixed w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-[9999]"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-slate-100 last:border-b-0 block"
              >
                <Icon className="w-4 h-4 text-slate-400" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}