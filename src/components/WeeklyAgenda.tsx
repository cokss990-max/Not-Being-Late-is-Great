import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Appointment, TodoItem } from '../types/schedule';
import {
  addDays,
  formatShortDay,
  formatTime12h,
  formatWeekRange,
  getWeekDateKeys,
} from '../utils/dates';

interface WeeklyAgendaProps {
  todayKey: string;
  selectedDate: string;
  appointments: Appointment[];
  todos: TodoItem[];
  onSelectDate: (dateKey: string) => void;
  onQuickAddAppointment: (dateKey: string) => void;
}

export function WeeklyAgenda({
  todayKey,
  selectedDate,
  appointments,
  todos,
  onSelectDate,
  onQuickAddAppointment,
}: WeeklyAgendaProps) {
  const weekKeys = getWeekDateKeys(selectedDate);
  const weekRangeLabel = formatWeekRange(weekKeys);

  const weekAppointmentsCount = appointments.filter((a) => weekKeys.includes(a.date)).length;
  const weekOpenTodosCount = todos.filter((t) => weekKeys.includes(t.date) && !t.completed).length;

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Weekly Agenda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {weekRangeLabel} · {weekAppointmentsCount} appointments · {weekOpenTodosCount} open tasks
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, -7))}
            aria-label="Previous week"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectDate(todayKey)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            This Week
          </button>

          <button
            type="button"
            onClick={() => onSelectDate(addDays(selectedDate, 7))}
            aria-label="Next week"
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        {weekKeys.map((dayKey) => {
          const { weekday, dayNum } = formatShortDay(dayKey);
          const isToday = dayKey === todayKey;
          const isSelected = dayKey === selectedDate;

          const dayAppointments = appointments
            .filter((a) => a.date === dayKey)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const dayTodos = todos.filter((t) => t.date === dayKey);
          const remainingTodos = dayTodos.filter((t) => !t.completed);

          return (
            <div
              key={dayKey}
              className={`min-h-[260px] flex flex-col transition-colors ${
                isSelected ? 'bg-sky-50/40' : 'bg-white'
              }`}
            >
              {/* Day column header */}
              <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectDate(dayKey)}
                  className="text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 rounded"
                >
                  <span className="block text-xs font-medium text-slate-500">{weekday}</span>
                  <span
                    className={`inline-flex items-baseline gap-1.5 font-mono tabular-nums text-lg font-semibold ${
                      isToday
                        ? 'text-sky-700'
                        : isSelected
                          ? 'text-slate-900'
                          : 'text-slate-800 group-hover:text-slate-950'
                    }`}
                  >
                    {dayNum}
                    {isToday && (
                      <span className="font-sans text-[11px] font-semibold text-sky-700">Today</span>
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onQuickAddAppointment(dayKey)}
                  aria-label={`Add appointment on ${dayKey}`}
                  className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Appointments & Tasks summary inside day column */}
              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                {dayAppointments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Open schedule</p>
                ) : (
                  <ul className="space-y-2.5">
                    {dayAppointments.map((apt) => (
                      <li
                        key={apt.id}
                        className="pb-2.5 border-b border-slate-100 last:border-b-0 last:pb-0"
                      >
                        <p className="font-mono tabular-nums text-[11px] font-medium text-slate-500">
                          {formatTime12h(apt.startTime)}
                        </p>
                        <p className="text-xs font-medium text-slate-900 leading-snug mt-0.5">
                          {apt.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {apt.category}
                          {apt.location ? ` · ${apt.location}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {dayTodos.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100 text-[11px] font-mono tabular-nums text-slate-600">
                    {remainingTodos.length === 0 ? (
                      <span className="text-emerald-700 font-medium">
                        All {dayTodos.length} tasks done
                      </span>
                    ) : (
                      <span>
                        {remainingTodos.length} open {remainingTodos.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
