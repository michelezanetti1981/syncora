import React, { useMemo, useState, useRef } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, differenceInDays, parseISO, isToday, isWeekend } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';

const STATUS_COLORS = {
  backlog: 'bg-slate-300',
  todo: 'bg-blue-400',
  in_progress: 'bg-amber-400',
  review: 'bg-purple-400',
  done: 'bg-emerald-400',
};

const ROW_HEIGHT = 40;
const LABEL_WIDTH = 220;
const DAY_WIDTH = 32;

export default function GanttView({ tasks, onSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollRef = useRef(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(addMonths(currentDate, 1)); // show 2 months
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksWithDates = useMemo(() =>
    tasks.filter(t => t.deadline || t.created_date),
    [tasks]
  );

  const getBar = (task) => {
    const start = task.created_date ? parseISO(task.created_date) : null;
    const end = task.deadline ? parseISO(task.deadline) : null;

    const rangeStart = start && start >= monthStart ? start : monthStart;
    const rangeEnd = end && end <= monthEnd ? end : (end ? end : (start ? start : null));

    if (!rangeEnd) return null;

    const offsetDays = differenceInDays(rangeStart < monthStart ? monthStart : rangeStart, monthStart);
    const durationDays = Math.max(1, differenceInDays(rangeEnd > monthEnd ? monthEnd : rangeEnd, rangeStart < monthStart ? monthStart : rangeStart) + 1);
    const isPartialStart = start && start < monthStart;
    const isPartialEnd = end && end > monthEnd;

    return { offsetDays, durationDays, isPartialStart, isPartialEnd };
  };

  const todayOffset = differenceInDays(new Date(), monthStart);
  const todayInRange = todayOffset >= 0 && todayOffset <= days.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Diagramma di Gantt</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
            {format(monthStart, 'MMMM yyyy', { locale: it })} – {format(monthEnd, 'MMMM yyyy', { locale: it })}
          </span>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto" ref={scrollRef}>
        <div style={{ minWidth: LABEL_WIDTH + days.length * DAY_WIDTH }}>
          {/* Days header */}
          <div className="flex sticky top-0 bg-white z-10 border-b border-slate-100">
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="flex-shrink-0 px-4 py-2 text-xs font-semibold text-slate-500 border-r border-slate-100">
              Task
            </div>
            <div className="flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                  className={`flex flex-col items-center justify-center py-1.5 border-r border-slate-50 text-[10px] flex-shrink-0
                    ${isToday(day) ? 'bg-indigo-50 text-indigo-700 font-bold' : isWeekend(day) ? 'bg-slate-50 text-slate-400' : 'text-slate-500'}`}
                >
                  <span>{format(day, 'd')}</span>
                  <span className="text-[9px] opacity-60">{format(day, 'EEE', { locale: it })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Month separators row */}
          <div className="flex border-b border-slate-100 bg-slate-50/50">
            <div style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }} className="flex-shrink-0 border-r border-slate-100" />
            {days.map((day, i) => (
              <div
                key={i}
                style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                className="flex-shrink-0 border-r border-slate-50"
              >
                {day.getDate() === 1 && (
                  <div className="text-[10px] font-semibold text-indigo-500 px-1 py-0.5 whitespace-nowrap">
                    {format(day, 'MMM', { locale: it })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {tasksWithDates.length === 0 && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Nessun task con date impostate. Aggiungi una deadline ai tuoi task.
            </div>
          )}

          {/* Task rows */}
          {tasksWithDates.map((task) => {
            const bar = getBar(task);
            return (
              <div
                key={task.id}
                className="flex items-center border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Label */}
                <div
                  style={{ width: LABEL_WIDTH, minWidth: LABEL_WIDTH }}
                  className="flex-shrink-0 px-4 border-r border-slate-100 flex items-center gap-2 cursor-pointer"
                  onClick={() => onSelect(task)}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-slate-300'}`} />
                  <span className="text-xs text-slate-700 truncate font-medium group-hover:text-indigo-600 transition-colors">
                    {task.title}
                  </span>
                </div>

                {/* Timeline */}
                <div className="flex relative" style={{ height: ROW_HEIGHT }}>
                  {days.map((day, i) => (
                    <div
                      key={i}
                      style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                      className={`flex-shrink-0 border-r border-slate-50 h-full ${isWeekend(day) ? 'bg-slate-50/60' : ''} ${isToday(day) ? 'bg-indigo-50/40' : ''}`}
                    />
                  ))}

                  {/* Today line */}
                  {todayInRange && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 z-20 pointer-events-none"
                      style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                    />
                  )}

                  {/* Bar */}
                  {bar && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-5 rounded cursor-pointer z-10 flex items-center px-2 text-white text-[10px] font-medium shadow-sm hover:brightness-90 transition-all
                        ${STATUS_COLORS[task.status] || 'bg-slate-300'}
                        ${bar.isPartialStart ? 'rounded-l-none' : ''}
                        ${bar.isPartialEnd ? 'rounded-r-none' : ''}`}
                      style={{
                        left: bar.offsetDays * DAY_WIDTH,
                        width: bar.durationDays * DAY_WIDTH,
                        minWidth: DAY_WIDTH,
                      }}
                      onClick={() => onSelect(task)}
                      title={task.title}
                    >
                      <span className="truncate">{bar.durationDays > 3 ? task.title : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const labels = { backlog: 'Backlog', todo: 'Da fare', in_progress: 'In corso', review: 'Revisione', done: 'Completato' };
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-xs text-slate-500">{labels[status]}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5 ml-2">
          <div className="w-0.5 h-4 bg-indigo-400" />
          <span className="text-xs text-slate-500">Oggi</span>
        </div>
      </div>
    </div>
  );
}