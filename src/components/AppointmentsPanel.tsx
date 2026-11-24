import { FormEvent, useMemo, useState } from 'react';
import { Calendar, Plus, Trash2, MapPin, Search, X } from 'lucide-react';
import { Appointment, AppointmentCategory } from '../types/schedule';
import { formatLongDate, formatTime12h } from '../utils/dates';

interface AppointmentsPanelProps {
  selectedDate: string;
  appointments: Appointment[];
  showAllDates?: boolean;
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onDeleteAppointment: (id: string) => void;
  onSelectDate?: (dateKey: string) => void;
}

const CATEGORIES: AppointmentCategory[] = ['Teaching', 'Meeting', 'Prep', 'Personal'];

export function AppointmentsPanel({
  selectedDate,
  appointments,
  showAllDates = false,
  isAddModalOpen = false,
  onCloseAddModal,
  onAddAppointment,
  onDeleteAppointment,
  onSelectDate,
}: AppointmentsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | AppointmentCategory>('All');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:50');
  const [category, setCategory] = useState<AppointmentCategory>('Teaching');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const showForm = formOpen || isAddModalOpen;

  const openForm = () => {
    setDate(selectedDate);
    setError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setError('');
    onCloseAddModal?.();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter an appointment title.');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.');
      return;
    }

    onAddAppointment({
      title: trimmed,
      date: date || selectedDate,
      startTime,
      endTime,
      category,
      location: location.trim(),
      notes: notes.trim(),
    });

    setTitle('');
    setLocation('');
    setNotes('');
    setError('');
    closeForm();
  };

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((item) => (showAllDates ? true : item.date === selectedDate))
      .filter((item) => (categoryFilter === 'All' ? true : item.category === categoryFilter))
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [appointments, selectedDate, showAllDates, categoryFilter, searchQuery]);

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {showAllDates ? 'All Scheduled Appointments' : 'Appointments'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {showAllDates ? `${filteredAppointments.length} scheduled` : formatLongDate(selectedDate)}
          </p>
        </div>

        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Appointment</span>
        </button>
      </div>

      {/* Filters (shown in full appointments view or when more than 2 items exist) */}
      {(showAllDates || appointments.length > 0) && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter appointments..."
              aria-label="Filter appointments"
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(['All', ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline Add Appointment Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">New Appointment</h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close appointment form"
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-title">
                Title
              </label>
              <input
                id="apt-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Biology Lab — Section C"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-date">
                Date
              </label>
              <input
                id="apt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-category">
                Category
              </label>
              <select
                id="apt-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AppointmentCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-start">
                Start Time
              </label>
              <input
                id="apt-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-end">
                End Time
              </label>
              <input
                id="apt-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-location">
                Location (optional)
              </label>
              <input
                id="apt-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room 204 or Zoom link"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1" htmlFor="apt-notes">
                Notes (optional)
              </label>
              <input
                id="apt-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key materials or agenda points"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Save Appointment
            </button>
          </div>
        </form>
      )}

      {/* Chronological list */}
      {filteredAppointments.length === 0 ? (
        <div className="py-10 text-center">
          <Calendar className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No appointments scheduled</p>
          <p className="text-xs text-slate-500 mt-1">
            Add classes, office hours, or meetings to keep your day structured.
          </p>
          {!showForm && (
            <button
              type="button"
              onClick={openForm}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Appointment</span>
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {filteredAppointments.map((apt) => (
            <li
              key={apt.id}
              className="py-3.5 flex items-start justify-between gap-4 group hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-5 min-w-0 flex-1">
                <div className="font-mono tabular-nums text-xs text-slate-600 shrink-0 sm:w-36">
                  {showAllDates && (
                    <button
                      type="button"
                      onClick={() => onSelectDate?.(apt.date)}
                      className="block text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline mb-0.5 text-left"
                    >
                      {apt.date}
                    </button>
                  )}
                  <span className="font-medium text-slate-900">
                    {formatTime12h(apt.startTime)}
                  </span>
                  <span className="text-slate-400"> – {formatTime12h(apt.endTime)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 leading-snug">{apt.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span
                      className={
                        apt.category === 'Teaching'
                          ? 'text-sky-700 font-medium'
                          : apt.category === 'Meeting'
                            ? 'text-amber-700 font-medium'
                            : 'text-slate-600 font-medium'
                      }
                    >
                      {apt.category}
                    </span>
                    {apt.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {apt.location}
                        </span>
                      </>
                    )}
                  </div>
                  {apt.notes && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{apt.notes}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeleteAppointment(apt.id)}
                aria-label={`Delete ${apt.title}`}
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
