import { Appointment, TodoItem } from '../types/schedule';

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateKey: string, offset: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}

export function getMondayOfWeek(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateKey(d);
}

export function getWeekDateKeys(anchorDateKey: string): string[] {
  const monday = getMondayOfWeek(anchorDateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatLongDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDay(dateKey: string): { weekday: string; dayNum: string; monthShort: string } {
  const d = parseDateKey(dateKey);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: String(d.getDate()),
    monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export function formatWeekRange(weekKeys: string[]): string {
  if (weekKeys.length < 7) return '';
  const start = parseDateKey(weekKeys[0]);
  const end = parseDateKey(weekKeys[6]);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function getInitialAppointments(todayKey: string): Appointment[] {
  const tomorrow = addDays(todayKey, 1);
  const dayAfter = addDays(todayKey, 2);
  return [
    {
      id: 'apt-1',
      title: 'Morning Seminar — Section A',
      date: todayKey,
      startTime: '09:00',
      endTime: '09:55',
      category: 'Teaching',
      location: 'Room 204',
      notes: 'Two 25-minute teaching blocks with a 5-minute break in between.',
    },
    {
      id: 'apt-2',
      title: 'Department Curriculum Sync',
      date: todayKey,
      startTime: '11:30',
      endTime: '12:15',
      category: 'Meeting',
      location: 'Conference Room B',
      notes: 'Finalize midterm rubric and pacing schedule.',
    },
    {
      id: 'apt-3',
      title: 'Student Office Hours',
      date: todayKey,
      startTime: '14:00',
      endTime: '15:00',
      category: 'Teaching',
      location: 'Faculty Office 112',
      notes: 'Open review for upcoming lab submissions.',
    },
    {
      id: 'apt-4',
      title: 'Workshop Lecture — Section B',
      date: tomorrow,
      startTime: '10:00',
      endTime: '11:00',
      category: 'Teaching',
      location: 'Hall 108',
      notes: 'Bring printed discussion prompts.',
    },
    {
      id: 'apt-5',
      title: 'Weekly Lesson Prep',
      date: dayAfter,
      startTime: '13:30',
      endTime: '15:00',
      category: 'Prep',
      location: 'Desk',
      notes: 'Outline next week slides and graded exercises.',
    },
  ];
}

export function getInitialTodos(todayKey: string): TodoItem[] {
  const tomorrow = addDays(todayKey, 1);
  return [
    {
      id: 'todo-1',
      title: 'Prepare warm-up questions for Block 1',
      date: todayKey,
      priority: 'High',
      completed: true,
      notes: 'Three concise prompts on slide 2.',
    },
    {
      id: 'todo-2',
      title: 'Grade Section A formative quizzes',
      date: todayKey,
      priority: 'High',
      completed: false,
      notes: 'Upload scores before 4:00 PM.',
    },
    {
      id: 'todo-3',
      title: 'Send reading list update to teaching assistant',
      date: todayKey,
      priority: 'Medium',
      completed: false,
      notes: '',
    },
    {
      id: 'todo-4',
      title: 'Confirm projector adapter for Hall 108',
      date: tomorrow,
      priority: 'Low',
      completed: false,
      notes: '',
    },
  ];
}
