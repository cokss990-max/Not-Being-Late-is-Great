import { FormEvent, useMemo, useState } from 'react';
import { Check, CheckSquare, Plus, Search, Trash2 } from 'lucide-react';
import { TodoItem, TodoPriority } from '../types/schedule';
import { formatLongDate } from '../utils/dates';

interface TodoPanelProps {
  selectedDate: string;
  todos: TodoItem[];
  showAllDates?: boolean;
  onAddTodo: (todo: Omit<TodoItem, 'id'>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const PRIORITY_ORDER: Record<TodoPriority, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

export function TodoPanel({
  selectedDate,
  todos,
  showAllDates = false,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoPanelProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('Medium');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTodo({
      title: trimmed,
      date: selectedDate,
      priority,
      completed: false,
      notes: '',
    });
    setTitle('');
    setPriority('Medium');
  };

  const scopedTodos = useMemo(() => {
    return todos.filter((t) => (showAllDates ? true : t.date === selectedDate));
  }, [todos, selectedDate, showAllDates]);

  const completedCount = scopedTodos.filter((t) => t.completed).length;

  const visibleTodos = useMemo(() => {
    return scopedTodos
      .filter((t) => {
        if (statusFilter === 'active') return !t.completed;
        if (statusFilter === 'completed') return t.completed;
        return true;
      })
      .filter((t) => {
        if (!searchQuery.trim()) return true;
        return t.title.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        }
        return a.date.localeCompare(b.date);
      });
  }, [scopedTodos, statusFilter, searchQuery]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {showAllDates ? 'All Daily To-Dos' : 'Daily To-Dos'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
            {completedCount} of {scopedTodos.length} completed
            {!showAllDates && ` · ${formatLongDate(selectedDate)}`}
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-add form */}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for this day..."
          aria-label="New task title"
          className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus:bg-white transition-colors"
        />

        <div className="flex items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            aria-label="Task priority"
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-slate-500"
          >
            <option value="High">High priority</option>
            <option value="Medium">Medium priority</option>
            <option value="Low">Low priority</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </form>

      {showAllDates && scopedTodos.length > 0 && (
        <div className="mt-3 relative max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>
      )}

      {/* Task list */}
      {visibleTodos.length === 0 ? (
        <div className="py-10 text-center">
          <CheckSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            {scopedTodos.length === 0 ? 'No tasks for this day' : 'No matching tasks'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {scopedTodos.length === 0
              ? 'Capture lesson prep, grading, or follow-ups above.'
              : 'Try switching filters or clearing your search.'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {visibleTodos.map((todo) => (
            <li
              key={todo.id}
              className="py-3 flex items-start justify-between gap-3 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
            >
              <button
                type="button"
                onClick={() => onToggleTodo(todo.id)}
                aria-label={todo.completed ? `Mark "${todo.title}" incomplete` : `Complete "${todo.title}"`}
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                  todo.completed
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-300 hover:border-slate-500'
                }`}
              >
                {todo.completed && <Check className="w-3.5 h-3.5" />}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-snug ${
                    todo.completed ? 'line-through text-slate-400' : 'text-slate-900 font-medium'
                  }`}
                >
                  {todo.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span
                    className={
                      todo.completed
                        ? 'text-slate-400'
                        : todo.priority === 'High'
                          ? 'text-red-700 font-medium'
                          : todo.priority === 'Medium'
                            ? 'text-amber-700 font-medium'
                            : 'text-slate-500'
                    }
                  >
                    {todo.priority} priority
                  </span>
                  {showAllDates && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{todo.date}</span>
                    </>
                  )}
                  {todo.notes && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{todo.notes}</span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteTodo(todo.id)}
                aria-label={`Delete "${todo.title}"`}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
